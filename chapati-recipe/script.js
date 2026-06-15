"use strict";

// ======================================================
// Configuration
// ======================================================

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

  // Used only for converting calculated milk mass to
  // an approximate volume for display.
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

// All recipe masses are calculated internally in 0.1 g units.
// Integer arithmetic prevents floating-point mass-balance errors.
const MASS_SCALE = 10;


// ======================================================
// Configuration validation
// ======================================================

function validateConfiguration() {
  const {
    doughPerChapatiG,
    targetHydrationPct,
    saltPctOfFlour,
    oilGPer15Chapatis,
    oilMultiplier,
    yoghurtWaterFraction,
    milkWaterFraction,
    liquidRatio,
    milkDensityGPerMl,
    timerSeconds,
    limits
  } = CONFIG;

  if (!Number.isFinite(doughPerChapatiG) || doughPerChapatiG <= 0) {
    throw new Error(
      "CONFIG.doughPerChapatiG must be greater than zero."
    );
  }

  if (
    !Number.isFinite(targetHydrationPct) ||
    targetHydrationPct <= 0
  ) {
    throw new Error(
      "CONFIG.targetHydrationPct must be greater than zero."
    );
  }

  if (
    !Number.isFinite(saltPctOfFlour) ||
    saltPctOfFlour < 0
  ) {
    throw new Error(
      "CONFIG.saltPctOfFlour cannot be negative."
    );
  }

  if (
    !Number.isFinite(oilGPer15Chapatis) ||
    oilGPer15Chapatis < 0 ||
    !Number.isFinite(oilMultiplier) ||
    oilMultiplier < 0
  ) {
    throw new Error(
      "Configured oil values cannot be negative."
    );
  }

  for (const [name, fraction] of Object.entries({
    yoghurtWaterFraction,
    milkWaterFraction
  })) {
    if (
      !Number.isFinite(fraction) ||
      fraction < 0 ||
      fraction > 1
    ) {
      throw new Error(
        `CONFIG.${name} must be between 0 and 1.`
      );
    }
  }

  if (
    !Number.isFinite(liquidRatio.yoghurt) ||
    !Number.isFinite(liquidRatio.milk) ||
    liquidRatio.yoghurt < 0 ||
    liquidRatio.milk < 0 ||
    liquidRatio.yoghurt + liquidRatio.milk <= 0
  ) {
    throw new Error(
      "CONFIG.liquidRatio must have a positive total."
    );
  }

  if (
    !Number.isFinite(milkDensityGPerMl) ||
    milkDensityGPerMl <= 0
  ) {
    throw new Error(
      "CONFIG.milkDensityGPerMl must be greater than zero."
    );
  }

  if (
    !Number.isInteger(timerSeconds) ||
    timerSeconds <= 0
  ) {
    throw new Error(
      "CONFIG.timerSeconds must be a positive integer."
    );
  }

  if (
    !Number.isInteger(limits.minChapatis) ||
    !Number.isInteger(limits.maxChapatis) ||
    limits.minChapatis <= 0 ||
    limits.maxChapatis < limits.minChapatis
  ) {
    throw new Error(
      "Chapati count limits are invalid."
    );
  }

  if (
    !Number.isInteger(limits.minMealCount) ||
    !Number.isInteger(limits.maxMealCount) ||
    limits.minMealCount <= 0 ||
    limits.maxMealCount < limits.minMealCount
  ) {
    throw new Error(
      "Meal count limits are invalid."
    );
  }
}

function validateNutritionData() {
  const requiredFields = [
    "protein100",
    "kcal100",
    "carbs100",
    "fat100"
  ];

  for (const [ingredient, values] of Object.entries(NUTRITION)) {
    for (const field of requiredFields) {
      const value = values[field];

      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `Invalid nutrition value: ${ingredient}.${field}`
        );
      }
    }
  }
}


// ======================================================
// Precomputed recipe model
// ======================================================

function buildRecipeModel() {
  const ratioTotal =
    CONFIG.liquidRatio.yoghurt +
    CONFIG.liquidRatio.milk;

  const yoghurtShare =
    CONFIG.liquidRatio.yoghurt / ratioTotal;

  const milkShare =
    CONFIG.liquidRatio.milk / ratioTotal;

  const averageLiquidWaterFraction =
    yoghurtShare * CONFIG.yoghurtWaterFraction +
    milkShare * CONFIG.milkWaterFraction;

  const hydrationFraction =
    CONFIG.targetHydrationPct / 100;

  const saltFraction =
    CONFIG.saltPctOfFlour / 100;

  /*
   * Hydration:
   *
   * water / flour = hydration fraction
   *
   * water:
   * total liquid × average water fraction
   *
   * Therefore:
   * total liquid / flour
   * = hydration fraction / average water fraction
   */
  const liquidPerGramFlour =
    hydrationFraction / averageLiquidWaterFraction;

  return Object.freeze({
    yoghurtShare,
    milkShare,
    averageLiquidWaterFraction,
    hydrationFraction,
    saltFraction,
    liquidPerGramFlour
  });
}

validateConfiguration();
validateNutritionData();

const RECIPE_MODEL = buildRecipeModel();


// ======================================================
// DOM utilities
// ======================================================

const $ = (selector) => document.querySelector(selector);

function getElement(id) {
  return document.getElementById(id);
}

function pulse(element) {
  element.classList.remove("pulse");

  // Restart the CSS animation.
  void element.offsetWidth;

  element.classList.add("pulse");
}

function setText(id, value, shouldPulse = true) {
  const element = getElement(id);

  if (!element || element.textContent === value) {
    return;
  }

  element.textContent = value;

  if (shouldPulse) {
    pulse(element);
  }
}


// ======================================================
// Numeric and formatting utilities
// ======================================================

function gramsToUnits(grams) {
  return Math.round(grams * MASS_SCALE);
}

function unitsToGrams(units) {
  return units / MASS_SCALE;
}

function perGram(valuePer100G) {
  return valuePer100G / 100;
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function formatMass(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const rounded = roundToOneDecimal(value);

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

function formatOneDecimal(value) {
  return Number.isFinite(value)
    ? value.toFixed(1)
    : "—";
}

function formatInteger(value) {
  return Number.isFinite(value)
    ? String(Math.round(value))
    : "—";
}

function parseIntegerInRange(value, min, max) {
  const text = String(value ?? "").trim();

  if (text === "") {
    return null;
  }

  const number = Number(text);

  return (
    Number.isSafeInteger(number) &&
    number >= min &&
    number <= max
  )
    ? number
    : null;
}


// ======================================================
// Recipe calculations
// ======================================================

function calculateOilG(chapatiCount) {
  return (
    chapatiCount /
    15 *
    CONFIG.oilGPer15Chapatis *
    CONFIG.oilMultiplier
  );
}

function calculateHydrationPct(flourG, yoghurtG, milkG) {
  if (!Number.isFinite(flourG) || flourG <= 0) {
    throw new Error(
      "Flour mass must be greater than zero."
    );
  }

  const waterG =
    yoghurtG * CONFIG.yoghurtWaterFraction +
    milkG * CONFIG.milkWaterFraction;

  return (waterG / flourG) * 100;
}

/**
 * Calculates the ideal continuous formula before practical
 * 0.1 g rounding is applied.
 */
function calculateIdealFormula(targetG, oilG) {
  const remainingAfterOilG = targetG - oilG;

  if (remainingAfterOilG <= 0) {
    throw new Error(
      "Oil exceeds or equals the target dough mass."
    );
  }

  /*
   * Final dough:
   *
   * target
   * = flour
   * + liquid
   * + salt
   * + oil
   *
   * liquid = flour × liquidPerGramFlour
   * salt   = flour × saltFraction
   */
  const flourG =
    remainingAfterOilG /
    (
      1 +
      RECIPE_MODEL.liquidPerGramFlour +
      RECIPE_MODEL.saltFraction
    );

  const totalLiquidG =
    flourG * RECIPE_MODEL.liquidPerGramFlour;

  return {
    flourG,

    yoghurtG:
      totalLiquidG * RECIPE_MODEL.yoghurtShare,

    milkG:
      totalLiquidG * RECIPE_MODEL.milkShare,

    saltG:
      flourG * RECIPE_MODEL.saltFraction,

    oilG
  };
}

/**
 * Converts the ideal recipe into a practical 0.1 g recipe.
 *
 * The final dough mass remains exact because milk receives the
 * final rounding remainder.
 */
function calculateFormula(targetG, oilG) {
  const targetUnits = gramsToUnits(targetG);
  const oilUnits = gramsToUnits(oilG);

  const ideal = calculateIdealFormula(
    targetG,
    unitsToGrams(oilUnits)
  );

  const flourUnits = gramsToUnits(ideal.flourG);

  // Because flourUnits and saltUnits use the same mass scale,
  // the salt percentage can be applied directly.
  const saltUnits = Math.round(
    flourUnits * RECIPE_MODEL.saltFraction
  );

  const liquidUnits =
    targetUnits -
    oilUnits -
    flourUnits -
    saltUnits;

  if (liquidUnits < 0) {
    throw new Error(
      "The target dough mass is too small for this recipe."
    );
  }

  const yoghurtUnits = Math.round(
    liquidUnits * RECIPE_MODEL.yoghurtShare
  );

  // Milk absorbs the final 0.1 g rounding remainder.
  const milkUnits =
    liquidUnits - yoghurtUnits;

  if (yoghurtUnits < 0 || milkUnits < 0) {
    throw new Error(
      "Calculated liquid masses cannot be negative."
    );
  }

  const formula = {
    flourG: unitsToGrams(flourUnits),
    yoghurtG: unitsToGrams(yoghurtUnits),
    milkG: unitsToGrams(milkUnits),
    saltG: unitsToGrams(saltUnits),
    oilG: unitsToGrams(oilUnits)
  };

  const actualDoughUnits =
    flourUnits +
    yoghurtUnits +
    milkUnits +
    saltUnits +
    oilUnits;

  if (actualDoughUnits !== targetUnits) {
    throw new Error(
      `Dough mass mismatch: expected ${targetG} g, ` +
      `calculated ${unitsToGrams(actualDoughUnits)} g.`
    );
  }

  return {
    ...formula,

    targetG: unitsToGrams(targetUnits),
    actualDoughG: unitsToGrams(actualDoughUnits),

    hydrationPct: calculateHydrationPct(
      formula.flourG,
      formula.yoghurtG,
      formula.milkG
    )
  };
}


// ======================================================
// Nutrition calculations
// ======================================================

function calculateNutrition(ingredients) {
  const ingredientMasses = {
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

  for (
    const [ingredientName, massG]
    of Object.entries(ingredientMasses)
  ) {
    const nutrition = NUTRITION[ingredientName];

    if (!nutrition) {
      throw new Error(
        `Missing nutrition data for ${ingredientName}.`
      );
    }

    totals.proteinG +=
      massG * perGram(nutrition.protein100);

    totals.carbsG +=
      massG * perGram(nutrition.carbs100);

    totals.fatG +=
      massG * perGram(nutrition.fat100);

    totals.kcal +=
      massG * perGram(nutrition.kcal100);
  }

  return totals;
}

function divideNutrition(nutrition, divisor) {
  if (!Number.isFinite(divisor) || divisor <= 0) {
    throw new Error(
      "Nutrition divisor must be greater than zero."
    );
  }

  return {
    proteinG: nutrition.proteinG / divisor,
    carbsG: nutrition.carbsG / divisor,
    fatG: nutrition.fatG / divisor,
    kcal: nutrition.kcal / divisor
  };
}

function multiplyNutrition(nutrition, multiplier) {
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error(
      "Nutrition multiplier cannot be negative."
    );
  }

  return {
    proteinG: nutrition.proteinG * multiplier,
    carbsG: nutrition.carbsG * multiplier,
    fatG: nutrition.fatG * multiplier,
    kcal: nutrition.kcal * multiplier
  };
}


// ======================================================
// Complete plan calculation
// ======================================================

function calculatePlan(chapatiCount) {
  const {
    minChapatis,
    maxChapatis
  } = CONFIG.limits;

  if (
    !Number.isSafeInteger(chapatiCount) ||
    chapatiCount < minChapatis ||
    chapatiCount > maxChapatis
  ) {
    throw new Error(
      `Chapati count must be between ` +
      `${minChapatis} and ${maxChapatis}.`
    );
  }

  const targetG =
    chapatiCount * CONFIG.doughPerChapatiG;

  const oilG =
    calculateOilG(chapatiCount);

  const formula =
    calculateFormula(targetG, oilG);

  const batchNutrition =
    calculateNutrition(formula);

  const perChapatiNutrition =
    divideNutrition(
      batchNutrition,
      chapatiCount
    );

  return {
    chapatiCount,

    dough: {
      targetG: formula.targetG,
      actualG: formula.actualDoughG,
      perChapatiG:
        formula.actualDoughG / chapatiCount
    },

    ingredients: {
      flourG: formula.flourG,
      yoghurtG: formula.yoghurtG,
      milkG: formula.milkG,
      saltG: formula.saltG,
      oilG: formula.oilG
    },

    hydrationPct:
      formula.hydrationPct,

    nutrition: {
      batch: batchNutrition,
      perChapati: perChapatiNutrition
    }
  };
}


// ======================================================
// UI state
// ======================================================

function readChapatiCount() {
  return parseIntegerInRange(
    $("#n")?.value,
    CONFIG.limits.minChapatis,
    CONFIG.limits.maxChapatis
  );
}

function readMealCount() {
  return parseIntegerInRange(
    $("#mealCount")?.value,
    CONFIG.limits.minMealCount,
    CONFIG.limits.maxMealCount
  );
}

function syncPresetState(chapatiCount) {
  document
    .querySelectorAll(".chapatiPreset")
    .forEach((button) => {
      const presetCount =
        Number(button.dataset.count);

      button.classList.toggle(
        "active",
        presetCount === chapatiCount
      );
    });
}


// ======================================================
// Error handling
// ======================================================

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


// ======================================================
// Rendering
// ======================================================

const OUTPUT_IDS = Object.freeze([
  "flourTotal",
  "milkTotal",
  "yogTotal",
  "saltTotal",
  "oilTotal",
  "targetDough",
  "actualDough",
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
    setText(id, "—", false);
  }
}

function renderPlan(plan) {
  const {
    ingredients,
    nutrition,
    dough
  } = plan;

  const milkMl =
    ingredients.milkG /
    CONFIG.milkDensityGPerMl;

  setText(
    "flourTotal",
    `${formatMass(ingredients.flourG)} g`
  );

  setText(
    "yogTotal",
    `${formatMass(ingredients.yoghurtG)} g`
  );

  setText(
    "milkTotal",
    `${formatMass(milkMl)} ml ` +
    `(${formatMass(ingredients.milkG)} g)`
  );

  setText(
    "saltTotal",
    `${formatMass(ingredients.saltG)} g`
  );

  setText(
    "oilTotal",
    `${formatMass(ingredients.oilG)} g`
  );

  setText(
    "targetDough",
    `${formatMass(dough.targetG)} g`
  );

  // Optional output. Safe if the element is absent.
  setText(
    "actualDough",
    `${formatMass(dough.actualG)} g`
  );

  setText(
    "hydration",
    `${formatOneDecimal(plan.hydrationPct)}%`
  );

  setText(
    "proteinPer",
    `${formatOneDecimal(
      nutrition.perChapati.proteinG
    )} g`
  );

  setText(
    "kcalPer",
    `${formatInteger(
      nutrition.perChapati.kcal
    )} kcal`
  );

  setText(
    "carbsPer",
    `${formatOneDecimal(
      nutrition.perChapati.carbsG
    )} g`
  );

  setText(
    "fatPer",
    `${formatOneDecimal(
      nutrition.perChapati.fatG
    )} g`
  );

  const mealCount = readMealCount();

  if (!mealCount) {
    setText("mealProtein", "—");
    setText("mealKcal", "—");
    setText("mealCarbs", "—");
    setText("mealFat", "—");
    return;
  }

  const mealNutrition =
    multiplyNutrition(
      nutrition.perChapati,
      mealCount
    );

  setText(
    "mealProtein",
    `${formatOneDecimal(mealNutrition.proteinG)} g`
  );

  setText(
    "mealKcal",
    `${formatInteger(mealNutrition.kcal)} kcal`
  );

  setText(
    "mealCarbs",
    `${formatOneDecimal(mealNutrition.carbsG)} g`
  );

  setText(
    "mealFat",
    `${formatOneDecimal(mealNutrition.fatG)} g`
  );
}

function render() {
  const chapatiCount =
    readChapatiCount();

  syncPresetState(chapatiCount);

  if (!chapatiCount) {
    clearError();
    clearOutputs();
    return;
  }

  try {
    const plan =
      calculatePlan(chapatiCount);

    clearError();
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


// ======================================================
// Meal count controls
// ======================================================

function changeMealCount(delta) {
  const input = $("#mealCount");

  if (!input) {
    return;
  }

  const current =
    readMealCount() ??
    CONFIG.limits.minMealCount;

  const next = Math.min(
    CONFIG.limits.maxMealCount,
    Math.max(
      CONFIG.limits.minMealCount,
      current + delta
    )
  );

  input.value = String(next);

  render();
}


// ======================================================
// Drift-resistant timer
// ======================================================

const timerState = {
  remainingSeconds:
    CONFIG.timerSeconds,

  deadlineMs: null,
  intervalId: null
};

function displayTimer() {
  const minutes = Math.floor(
    timerState.remainingSeconds / 60
  )
    .toString()
    .padStart(2, "0");

  const seconds = (
    timerState.remainingSeconds % 60
  )
    .toString()
    .padStart(2, "0");

  setText(
    "timer",
    `${minutes}:${seconds}`,
    false
  );
}

function clearTimerInterval() {
  if (timerState.intervalId !== null) {
    window.clearInterval(
      timerState.intervalId
    );
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
    Math.ceil(
      (
        timerState.deadlineMs -
        Date.now()
      ) / 1000
    )
  );
}

function updateTimer() {
  if (timerState.deadlineMs === null) {
    return;
  }

  timerState.remainingSeconds =
    calculateRemainingTimerSeconds();

  displayTimer();

  if (timerState.remainingSeconds === 0) {
    clearTimerInterval();
  }
}

function startTimer() {
  if (
    timerState.intervalId !== null ||
    timerState.remainingSeconds <= 0
  ) {
    return;
  }

  timerState.deadlineMs =
    Date.now() +
    timerState.remainingSeconds * 1000;

  timerState.intervalId =
    window.setInterval(
      updateTimer,
      250
    );

  updateTimer();
}

function pauseTimer() {
  if (timerState.intervalId === null) {
    return;
  }

  timerState.remainingSeconds =
    calculateRemainingTimerSeconds();

  clearTimerInterval();
  displayTimer();
}

function resetTimer() {
  clearTimerInterval();

  timerState.remainingSeconds =
    CONFIG.timerSeconds;

  displayTimer();
}


// ======================================================
// Event listeners
// ======================================================

const chapatiCountInput = $("#n");
const mealCountInput = $("#mealCount");

chapatiCountInput?.addEventListener(
  "input",
  render
);

mealCountInput?.addEventListener(
  "input",
  render
);

$("#mealMinus")?.addEventListener(
  "click",
  () => changeMealCount(-1)
);

$("#mealPlus")?.addEventListener(
  "click",
  () => changeMealCount(1)
);

document
  .querySelectorAll(".chapatiPreset")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const count =
          parseIntegerInRange(
            button.dataset.count,
            CONFIG.limits.minChapatis,
            CONFIG.limits.maxChapatis
          );

        if (
          count === null ||
          !chapatiCountInput
        ) {
          return;
        }

        chapatiCountInput.value =
          String(count);

        render();
      }
    );
  });

$("#startTimer")?.addEventListener(
  "click",
  startTimer
);

$("#pauseTimer")?.addEventListener(
  "click",
  pauseTimer
);

$("#resetTimer")?.addEventListener(
  "click",
  resetTimer
);

// Immediately reconcile the timer after returning to
// a browser tab that was suspended in the background.
document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState === "visible" &&
      timerState.intervalId !== null
    ) {
      updateTimer();
    }
  }
);


// ======================================================
// Initialisation
// ======================================================

if (
  chapatiCountInput &&
  !chapatiCountInput.value
) {
  chapatiCountInput.value = "25";
}

if (
  mealCountInput &&
  !mealCountInput.value
) {
  mealCountInput.value = "1";
}

displayTimer();
render();
