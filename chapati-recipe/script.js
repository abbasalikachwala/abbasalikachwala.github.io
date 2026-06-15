"use strict";

// =====================================================
// Configuration
// =====================================================

const CONFIG = Object.freeze({
  doughPerChapatiG: 30,
  targetHydrationPct: 85,
  saltPctOfFlour: 1,

  oilGPer15Chapatis: 5,
  oilMultiplier: 1.15,

  yoghurtWaterFraction: 0.80,
  milkWaterFraction: 0.87,

  liquidRatio: Object.freeze({
    yoghurt: 95,
    milk: 115
  }),

  // Used only to display an approximate volume. All recipe
  // calculations use milk mass in grams.
  milkDensityGPerMl: 1.03,

  timerSeconds: 8 * 60 + 30,

  limits: Object.freeze({
    minChapatis: 1,
    maxChapatis: 500,
    minMealCount: 1,
    maxMealCount: 100
  })
});

const NUTRITION = Object.freeze({
  flour: Object.freeze({
    protein100: 12.0,
    kcal100: 311,
    carbs100: 62.0,
    fat100: 1.7
  }),

  yoghurt: Object.freeze({
    protein100: 5.1,
    kcal100: 103,
    carbs100: 7.0,
    fat100: 6.0
  }),

  milk: Object.freeze({
    protein100: 3.1,
    kcal100: 60,
    carbs100: 4.7,
    fat100: 3.3
  }),

  oil: Object.freeze({
    protein100: 0,
    kcal100: 900,
    carbs100: 0,
    fat100: 100
  })
});

// Integer decigrams are used internally: 1 unit = 0.1 g.
// This prevents floating-point drift in the mass-balance check.
const MASS_SCALE = 10;


// =====================================================
// Validation and recipe model
// =====================================================

function validateConfiguration() {
  const positiveValues = {
    doughPerChapatiG: CONFIG.doughPerChapatiG,
    targetHydrationPct: CONFIG.targetHydrationPct,
    milkDensityGPerMl: CONFIG.milkDensityGPerMl,
    timerSeconds: CONFIG.timerSeconds
  };

  for (const [name, value] of Object.entries(positiveValues)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`CONFIG.${name} must be greater than zero.`);
    }
  }

  const nonNegativeValues = {
    saltPctOfFlour: CONFIG.saltPctOfFlour,
    oilGPer15Chapatis: CONFIG.oilGPer15Chapatis,
    oilMultiplier: CONFIG.oilMultiplier
  };

  for (const [name, value] of Object.entries(nonNegativeValues)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`CONFIG.${name} cannot be negative.`);
    }
  }

  const waterFractions = {
    yoghurtWaterFraction: CONFIG.yoghurtWaterFraction,
    milkWaterFraction: CONFIG.milkWaterFraction
  };

  for (const [name, value] of Object.entries(waterFractions)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`CONFIG.${name} must be between 0 and 1.`);
    }
  }

  const liquidRatioTotal =
    CONFIG.liquidRatio.yoghurt + CONFIG.liquidRatio.milk;

  if (
    !Number.isFinite(CONFIG.liquidRatio.yoghurt) ||
    !Number.isFinite(CONFIG.liquidRatio.milk) ||
    CONFIG.liquidRatio.yoghurt < 0 ||
    CONFIG.liquidRatio.milk < 0 ||
    liquidRatioTotal <= 0
  ) {
    throw new Error("CONFIG.liquidRatio must have a positive total.");
  }

  const { limits } = CONFIG;

  if (
    !Number.isSafeInteger(limits.minChapatis) ||
    !Number.isSafeInteger(limits.maxChapatis) ||
    limits.minChapatis <= 0 ||
    limits.maxChapatis < limits.minChapatis
  ) {
    throw new Error("Chapati limits are invalid.");
  }

  if (
    !Number.isSafeInteger(limits.minMealCount) ||
    !Number.isSafeInteger(limits.maxMealCount) ||
    limits.minMealCount <= 0 ||
    limits.maxMealCount < limits.minMealCount
  ) {
    throw new Error("Meal-count limits are invalid.");
  }
}

function validateNutritionData() {
  const fields = ["protein100", "kcal100", "carbs100", "fat100"];

  for (const [ingredient, values] of Object.entries(NUTRITION)) {
    for (const field of fields) {
      const value = values[field];

      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid nutrition value: ${ingredient}.${field}`);
      }
    }
  }
}

function buildRecipeModel() {
  const ratioTotal =
    CONFIG.liquidRatio.yoghurt + CONFIG.liquidRatio.milk;

  const yoghurtShare = CONFIG.liquidRatio.yoghurt / ratioTotal;
  const milkShare = CONFIG.liquidRatio.milk / ratioTotal;

  const averageLiquidWaterFraction =
    yoghurtShare * CONFIG.yoghurtWaterFraction +
    milkShare * CONFIG.milkWaterFraction;

  const hydrationFraction = CONFIG.targetHydrationPct / 100;
  const saltFraction = CONFIG.saltPctOfFlour / 100;

  return Object.freeze({
    yoghurtShare,
    milkShare,
    averageLiquidWaterFraction,
    hydrationFraction,
    saltFraction,
    liquidPerGramFlour:
      hydrationFraction / averageLiquidWaterFraction
  });
}

validateConfiguration();
validateNutritionData();

const RECIPE_MODEL = buildRecipeModel();


// =====================================================
// DOM utilities
// =====================================================

const $ = (selector) => document.querySelector(selector);

function setText(id, value, { animate = true } = {}) {
  const element = document.getElementById(id);

  if (!element || element.textContent === value) {
    return;
  }

  element.textContent = value;

  if (animate) {
    pulse(element);
  }
}

function pulse(element) {
  const reduceMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) {
    return;
  }

  element.classList.remove("pulse");
  void element.offsetWidth;
  element.classList.add("pulse");
}

function showError(message) {
  const element = $("#calculationError");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.hidden = false;
}

function clearError() {
  const element = $("#calculationError");

  if (!element) {
    return;
  }

  element.textContent = "";
  element.hidden = true;
}


// =====================================================
// Numeric and formatting utilities
// =====================================================

function gramsToUnits(grams) {
  return Math.round(grams * MASS_SCALE);
}

function unitsToGrams(units) {
  return units / MASS_SCALE;
}

function perGram(valuePer100G) {
  return valuePer100G / 100;
}

function formatMass(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatOneDecimal(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function formatInteger(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : "—";
}

function parseIntegerInRange(value, min, max) {
  const text = String(value ?? "").trim();

  if (text === "") {
    return null;
  }

  const number = Number(text);

  return Number.isSafeInteger(number) && number >= min && number <= max
    ? number
    : null;
}

function isBlank(value) {
  return String(value ?? "").trim() === "";
}


// =====================================================
// Recipe calculations
// =====================================================

function calculateOilG(chapatiCount) {
  return (
    (chapatiCount / 15) *
    CONFIG.oilGPer15Chapatis *
    CONFIG.oilMultiplier
  );
}

function calculateHydrationPct(flourG, yoghurtG, milkG) {
  if (!Number.isFinite(flourG) || flourG <= 0) {
    throw new Error("Flour mass must be greater than zero.");
  }

  const waterG =
    yoghurtG * CONFIG.yoghurtWaterFraction +
    milkG * CONFIG.milkWaterFraction;

  return (waterG / flourG) * 100;
}

function calculateIdealFormula(targetG, oilG) {
  const remainingAfterOilG = targetG - oilG;

  if (remainingAfterOilG <= 0) {
    throw new Error("Oil exceeds or equals the target dough mass.");
  }

  const flourG =
    remainingAfterOilG /
    (
      1 +
      RECIPE_MODEL.liquidPerGramFlour +
      RECIPE_MODEL.saltFraction
    );

  const totalLiquidG = flourG * RECIPE_MODEL.liquidPerGramFlour;

  return {
    flourG,
    yoghurtG: totalLiquidG * RECIPE_MODEL.yoghurtShare,
    milkG: totalLiquidG * RECIPE_MODEL.milkShare,
    saltG: flourG * RECIPE_MODEL.saltFraction,
    oilG
  };
}

/**
 * Converts the ideal continuous formula into a practical 0.1 g recipe.
 * Milk absorbs the final rounding remainder, ensuring that all ingredient
 * masses add up to exactly the requested final dough mass.
 */
function calculateFormula(targetG, oilG) {
  const targetUnits = gramsToUnits(targetG);
  const oilUnits = gramsToUnits(oilG);
  const roundedOilG = unitsToGrams(oilUnits);

  const ideal = calculateIdealFormula(targetG, roundedOilG);

  const flourUnits = gramsToUnits(ideal.flourG);
  const saltUnits = Math.round(flourUnits * RECIPE_MODEL.saltFraction);

  const liquidUnits =
    targetUnits - oilUnits - flourUnits - saltUnits;

  if (liquidUnits <= 0) {
    throw new Error("The target dough mass is too small for this recipe.");
  }

  const yoghurtUnits = Math.round(
    liquidUnits * RECIPE_MODEL.yoghurtShare
  );

  const milkUnits = liquidUnits - yoghurtUnits;

  if (yoghurtUnits < 0 || milkUnits < 0) {
    throw new Error("Calculated liquid masses cannot be negative.");
  }

  const ingredients = {
    flourG: unitsToGrams(flourUnits),
    yoghurtG: unitsToGrams(yoghurtUnits),
    milkG: unitsToGrams(milkUnits),
    saltG: unitsToGrams(saltUnits),
    oilG: roundedOilG
  };

  const actualDoughUnits =
    flourUnits + yoghurtUnits + milkUnits + saltUnits + oilUnits;

  if (actualDoughUnits !== targetUnits) {
    throw new Error(
      `Dough mass mismatch: expected ${targetG} g, calculated ` +
      `${unitsToGrams(actualDoughUnits)} g.`
    );
  }

  return {
    ...ingredients,
    targetG: unitsToGrams(targetUnits),
    actualDoughG: unitsToGrams(actualDoughUnits),
    hydrationPct: calculateHydrationPct(
      ingredients.flourG,
      ingredients.yoghurtG,
      ingredients.milkG
    )
  };
}


// =====================================================
// Nutrition calculations
// =====================================================

function calculateNutrition(ingredients) {
  const masses = {
    flour: ingredients.flourG,
    yoghurt: ingredients.yoghurtG,
    milk: ingredients.milkG,
    oil: ingredients.oilG
  };

  const totals = {
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    kcal: 0
  };

  for (const [ingredientName, massG] of Object.entries(masses)) {
    const nutrition = NUTRITION[ingredientName];

    totals.proteinG += massG * perGram(nutrition.protein100);
    totals.carbsG += massG * perGram(nutrition.carbs100);
    totals.fatG += massG * perGram(nutrition.fat100);
    totals.kcal += massG * perGram(nutrition.kcal100);
  }

  return totals;
}

function scaleNutrition(nutrition, factor) {
  if (!Number.isFinite(factor) || factor < 0) {
    throw new Error("Nutrition scale factor cannot be negative.");
  }

  return {
    proteinG: nutrition.proteinG * factor,
    carbsG: nutrition.carbsG * factor,
    fatG: nutrition.fatG * factor,
    kcal: nutrition.kcal * factor
  };
}


// =====================================================
// Complete plan calculation
// =====================================================

function calculatePlan(chapatiCount) {
  const { minChapatis, maxChapatis } = CONFIG.limits;

  if (
    !Number.isSafeInteger(chapatiCount) ||
    chapatiCount < minChapatis ||
    chapatiCount > maxChapatis
  ) {
    throw new Error(
      `Chapati count must be between ${minChapatis} and ${maxChapatis}.`
    );
  }

  const targetG = chapatiCount * CONFIG.doughPerChapatiG;
  const formula = calculateFormula(targetG, calculateOilG(chapatiCount));
  const batchNutrition = calculateNutrition(formula);
  const perChapatiNutrition = scaleNutrition(
    batchNutrition,
    1 / chapatiCount
  );

  return {
    chapatiCount,

    dough: {
      targetG: formula.targetG,
      actualG: formula.actualDoughG,
      perChapatiG: formula.actualDoughG / chapatiCount
    },

    ingredients: {
      flourG: formula.flourG,
      yoghurtG: formula.yoghurtG,
      milkG: formula.milkG,
      saltG: formula.saltG,
      oilG: formula.oilG
    },

    hydrationPct: formula.hydrationPct,

    nutrition: {
      batch: batchNutrition,
      perChapati: perChapatiNutrition
    }
  };
}


// =====================================================
// Input and UI state
// =====================================================

const chapatiCountInput = $("#n");
const mealCountInput = $("#mealCount");

function readChapatiCount() {
  return parseIntegerInRange(
    chapatiCountInput?.value,
    CONFIG.limits.minChapatis,
    CONFIG.limits.maxChapatis
  );
}

function readMealCount() {
  return parseIntegerInRange(
    mealCountInput?.value,
    CONFIG.limits.minMealCount,
    CONFIG.limits.maxMealCount
  );
}

function syncPresetState(chapatiCount) {
  document.querySelectorAll(".chapatiPreset").forEach((button) => {
    const presetCount = Number(button.dataset.count);
    const isActive = presetCount === chapatiCount;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getChapatiInputError() {
  if (!chapatiCountInput || isBlank(chapatiCountInput.value)) {
    return "";
  }

  return (
    `Enter a whole chapati count between ` +
    `${CONFIG.limits.minChapatis} and ${CONFIG.limits.maxChapatis}.`
  );
}

function getMealInputError() {
  if (!mealCountInput || isBlank(mealCountInput.value)) {
    return "";
  }

  return (
    `Meal count must be a whole number between ` +
    `${CONFIG.limits.minMealCount} and ${CONFIG.limits.maxMealCount}.`
  );
}


// =====================================================
// Rendering
// =====================================================

const OUTPUT_IDS = Object.freeze([
  "flourTotal",
  "milkTotal",
  "yogTotal",
  "saltTotal",
  "oilTotal",
  "targetDough",
  "hydration",
  "proteinPer",
  "kcalPer",
  "carbsPer",
  "fatPer",
  "mealProtein",
  "mealKcal",
  "mealCarbs",
  "mealFat"
]);

function clearOutputs() {
  for (const id of OUTPUT_IDS) {
    setText(id, "—", { animate: false });
  }
}

function clearMealOutputs() {
  for (const id of ["mealProtein", "mealKcal", "mealCarbs", "mealFat"]) {
    setText(id, "—", { animate: false });
  }
}

function renderPlan(plan) {
  const { ingredients, nutrition, dough } = plan;
  const milkMl = ingredients.milkG / CONFIG.milkDensityGPerMl;

  setText("flourTotal", `${formatMass(ingredients.flourG)} g`);
  setText(
    "milkTotal",
    `${formatMass(milkMl)} ml (${formatMass(ingredients.milkG)} g)`
  );
  setText("yogTotal", `${formatMass(ingredients.yoghurtG)} g`);
  setText("saltTotal", `${formatMass(ingredients.saltG)} g`);
  setText("oilTotal", `${formatMass(ingredients.oilG)} g`);
  setText("targetDough", `${formatMass(dough.actualG)} g`);
  setText("hydration", `${formatOneDecimal(plan.hydrationPct)}%`);

  setText(
    "proteinPer",
    `${formatOneDecimal(nutrition.perChapati.proteinG)} g`
  );
  setText(
    "kcalPer",
    `${formatInteger(nutrition.perChapati.kcal)} kcal`
  );
  setText(
    "carbsPer",
    `${formatOneDecimal(nutrition.perChapati.carbsG)} g`
  );
  setText(
    "fatPer",
    `${formatOneDecimal(nutrition.perChapati.fatG)} g`
  );

  const mealCount = readMealCount();

  if (mealCount === null) {
    clearMealOutputs();
    return;
  }

  const mealNutrition = scaleNutrition(
    nutrition.perChapati,
    mealCount
  );

  setText("mealProtein", `${formatOneDecimal(mealNutrition.proteinG)} g`);
  setText("mealKcal", `${formatInteger(mealNutrition.kcal)} kcal`);
  setText("mealCarbs", `${formatOneDecimal(mealNutrition.carbsG)} g`);
  setText("mealFat", `${formatOneDecimal(mealNutrition.fatG)} g`);
}

function render() {
  const chapatiCount = readChapatiCount();
  syncPresetState(chapatiCount);

  if (chapatiCount === null) {
    clearOutputs();

    const error = getChapatiInputError();
    error ? showError(error) : clearError();
    return;
  }

  try {
    const plan = calculatePlan(chapatiCount);
    const mealError = getMealInputError();

    mealError ? showError(mealError) : clearError();
    renderPlan(plan);
  } catch (error) {
    console.error(error);
    clearOutputs();
    showError(
      error instanceof Error
        ? error.message
        : "Unable to calculate the dough recipe."
    );
  }
}


// =====================================================
// Meal controls
// =====================================================

function changeMealCount(delta) {
  if (!mealCountInput) {
    return;
  }

  const current = readMealCount() ?? CONFIG.limits.minMealCount;
  const next = Math.min(
    CONFIG.limits.maxMealCount,
    Math.max(CONFIG.limits.minMealCount, current + delta)
  );

  mealCountInput.value = String(next);
  render();
}


// =====================================================
// Drift-resistant timer
// =====================================================

const timerState = {
  remainingSeconds: CONFIG.timerSeconds,
  deadlineMs: null,
  intervalId: null
};

function isTimerRunning() {
  return timerState.intervalId !== null;
}

function syncTimerControls() {
  const startButton = $("#startTimer");
  const pauseButton = $("#pauseTimer");
  const resetButton = $("#resetTimer");
  const running = isTimerRunning();
  const completed = timerState.remainingSeconds === 0;
  const untouched = timerState.remainingSeconds === CONFIG.timerSeconds;

  if (startButton) {
    startButton.disabled = running || completed;
    startButton.setAttribute("aria-disabled", String(running || completed));
  }

  if (pauseButton) {
    pauseButton.disabled = !running;
    pauseButton.setAttribute("aria-disabled", String(!running));
  }

  if (resetButton) {
    resetButton.disabled = untouched && !running;
    resetButton.setAttribute("aria-disabled", String(untouched && !running));
  }
}

function displayTimer() {
  const minutes = Math.floor(timerState.remainingSeconds / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (timerState.remainingSeconds % 60)
    .toString()
    .padStart(2, "0");

  setText("timer", `${minutes}:${seconds}`, { animate: false });
  syncTimerControls();
}

function clearTimerInterval() {
  if (timerState.intervalId !== null) {
    window.clearInterval(timerState.intervalId);
  }

  timerState.intervalId = null;
  timerState.deadlineMs = null;
}

function calculateRemainingTimerSeconds() {
  if (timerState.deadlineMs === null) {
    return timerState.remainingSeconds;
  }

  return Math.max(
    0,
    Math.ceil((timerState.deadlineMs - Date.now()) / 1000)
  );
}

function updateTimer() {
  if (timerState.deadlineMs === null) {
    return;
  }

  timerState.remainingSeconds = calculateRemainingTimerSeconds();

  if (timerState.remainingSeconds === 0) {
    clearTimerInterval();
  }

  displayTimer();
}

function startTimer() {
  if (isTimerRunning() || timerState.remainingSeconds <= 0) {
    return;
  }

  timerState.deadlineMs =
    Date.now() + timerState.remainingSeconds * 1000;

  timerState.intervalId = window.setInterval(updateTimer, 250);
  displayTimer();
}

function pauseTimer() {
  if (!isTimerRunning()) {
    return;
  }

  timerState.remainingSeconds = calculateRemainingTimerSeconds();
  clearTimerInterval();
  displayTimer();
}

function resetTimer() {
  clearTimerInterval();
  timerState.remainingSeconds = CONFIG.timerSeconds;
  displayTimer();
}


// =====================================================
// Event listeners
// =====================================================

chapatiCountInput?.addEventListener("input", render);
mealCountInput?.addEventListener("input", render);

$("#mealMinus")?.addEventListener("click", () => changeMealCount(-1));
$("#mealPlus")?.addEventListener("click", () => changeMealCount(1));

for (const button of document.querySelectorAll(".chapatiPreset")) {
  button.addEventListener("click", () => {
    const count = parseIntegerInRange(
      button.dataset.count,
      CONFIG.limits.minChapatis,
      CONFIG.limits.maxChapatis
    );

    if (count === null || !chapatiCountInput) {
      return;
    }

    chapatiCountInput.value = String(count);
    render();
  });
}

$("#startTimer")?.addEventListener("click", startTimer);
$("#pauseTimer")?.addEventListener("click", pauseTimer);
$("#resetTimer")?.addEventListener("click", resetTimer);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isTimerRunning()) {
    updateTimer();
  }
});


// =====================================================
// Initialisation
// =====================================================

function initialise() {
  if (chapatiCountInput && isBlank(chapatiCountInput.value)) {
    chapatiCountInput.value = "25";
  }

  if (mealCountInput && isBlank(mealCountInput.value)) {
    mealCountInput.value = "1";
  }

  displayTimer();
  render();
}

initialise();
