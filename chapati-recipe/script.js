const CHAPATI_DOUGH_G = 30;

const R = {
  FLOUR: 190,
  YOG: 95,
  MILK: 115,
  SUM: 400
};

const NUTRITION = {
  flour: {
    protein100: 12.0,
    kcal100: 311,
    carbs100: 62.0,
    fat100: 1.7
  },
  yoghurt: {
    protein100: 5.1,
    kcal100: 103,
    carbs100: 7.0,
    fat100: 6.0
  },
  milk: {
    protein100: 3.1,
    kcal100: 60,
    carbs100: 4.7,
    fat100: 3.3
  }
};

const WATER_YOG = 0.80;
const WATER_MILK = 0.87;
const K_OIL_PER_G = 9;
const F_OIL_PER_G = 1;
const AUTO_OIL_BASE_PER_CHAPATI_G = 5 / 15;
const OIL_INCREASE_FACTOR = 1.15;
const TARGET_HYDRATION = 85; // Changed from 90 to 85

// ===== DOM Utilities =====
const $ = (sel) => document.querySelector(sel);
const fmtInt = (x) => Number.isFinite(x) ? `${Math.round(x)}` : "—";
const fmt1 = (x) => Number.isFinite(x) ? `${x.toFixed(1)}` : "—";
const roundTo5 = (x) => Math.round(x / 5) * 5;

// ===== Pulse Animation =====
function pulse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth; // Trigger reflow
  el.classList.add("pulse");
}

// ===== Nutrition Helpers =====
function perGram(valuePer100) {
  return valuePer100 / 100;
}

function hydrationFor(flourTotal, yogTotal, milkTotal) {
  const water = (yogTotal * WATER_YOG) + (milkTotal * WATER_MILK);
  return (water / flourTotal) * 100;
}

// ===== Ingredient Rounding =====
/**
 * Choose rounded ingredients that sum to exactly the target dough weight.
 * Prioritizes hitting the target hydration (85%), then minimizes deviation
 * from the ideal ratios.
 */
function chooseRoundedIngredients(target) {
  // Start with ideal proportions
  const idealFlour = target * (R.FLOUR / R.SUM);
  const idealYog = target * (R.YOG / R.SUM);
  const idealMilk = target * (R.MILK / R.SUM);

  let best = null;

  // Try flour values around the ideal, in steps of 5g
  for (let flour = roundTo5(idealFlour) - 30; flour <= roundTo5(idealFlour) + 30; flour += 5) {
    if (flour <= 0) continue;

    // Try yogurt values around the ideal, in steps of 5g
    for (let yog = roundTo5(idealYog) - 30; yog <= roundTo5(idealYog) + 30; yog += 5) {
      if (yog < 0) continue;

      // Milk is calculated as the remainder to ensure exact sum
      const milk = target - flour - yog;
      if (milk < 0 || milk % 5 !== 0) continue;

      // Calculate how close we are to target hydration
      const hydration = hydrationFor(flour, yog, milk);
      const hydrationError = Math.abs(hydration - TARGET_HYDRATION);

      // Scoring: prioritize hydration, then ingredient ratio accuracy
      const score =
        hydrationError * 100 +
        Math.abs(flour - idealFlour) +
        Math.abs(yog - idealYog) +
        Math.abs(milk - idealMilk);

      if (!best || score < best.score) {
        best = {
          flourTotal: flour,
          yogTotal: yog,
          milkTotal: milk,
          hydration,
          score
        };
      }
    }
  }

  // Fallback (should rarely be needed with proper search range)
  if (!best) {
    const flour = roundTo5(idealFlour);
    const yog = roundTo5(idealYog);
    const milk = target - flour - yog;

    best = {
      flourTotal: flour,
      yogTotal: yog,
      milkTotal: Math.max(0, milk),
      hydration: hydrationFor(flour, yog, Math.max(0, milk))
    };
  }

  return best;
}

// ===== UI State =====
function syncPresetState(n) {
  document.querySelectorAll(".chapatiPreset").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.count, 10) === n);
  });
}

function read() {
  const n = parseInt($("#n")?.value, 10);
  return { n };
}

// ===== Computation =====
function computePlan({ n }) {
  if (!Number.isFinite(n) || n <= 0) return null;

  const target = n * CHAPATI_DOUGH_G;
  const rounded = chooseRoundedIngredients(target);
  const { flourTotal, yogTotal, milkTotal } = rounded;

  const salt = Math.floor(0.01 * target);
  const oilTotal = Math.max(1, Math.round(n * AUTO_OIL_BASE_PER_CHAPATI_G * OIL_INCREASE_FACTOR));

  // Calculate nutrition per batch
  const proteinBatch =
    flourTotal * perGram(NUTRITION.flour.protein100) +
    yogTotal * perGram(NUTRITION.yoghurt.protein100) +
    milkTotal * perGram(NUTRITION.milk.protein100);

  const carbsBatch =
    flourTotal * perGram(NUTRITION.flour.carbs100) +
    yogTotal * perGram(NUTRITION.yoghurt.carbs100) +
    milkTotal * perGram(NUTRITION.milk.carbs100);

  const fatBatch =
    flourTotal * perGram(NUTRITION.flour.fat100) +
    yogTotal * perGram(NUTRITION.yoghurt.fat100) +
    milkTotal * perGram(NUTRITION.milk.fat100) +
    oilTotal * F_OIL_PER_G;

  const kcalBatch =
    flourTotal * perGram(NUTRITION.flour.kcal100) +
    yogTotal * perGram(NUTRITION.yoghurt.kcal100) +
    milkTotal * perGram(NUTRITION.milk.kcal100) +
    oilTotal * K_OIL_PER_G;

  const hydration = +(rounded.hydration).toFixed(1);

  return {
    n,
    target,
    flourTotal,
    yogTotal,
    milkTotal,
    salt,
    oilTotal,
    hydration,
    proteinPer: +(proteinBatch / n).toFixed(1),
    carbsPer: +(carbsBatch / n).toFixed(1),
    fatPer: +(fatBatch / n).toFixed(1),
    kcalPer: +(kcalBatch / n).toFixed(0)
  };
}

// ===== Rendering =====
function clearOutputs() {
  const outputIds = [
    "flourTotal", "milkTotal", "yogTotal", "saltTotal", "oilTotal",
    "targetDough", "hydration", "proteinPer", "kcalPer", "carbsPer",
    "fatPer", "mealProtein", "mealKcal", "mealCarbs", "mealFat"
  ];

  outputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  pulse(id);
}

function render() {
  const { n } = read();
  syncPresetState(n);

  const plan = computePlan({ n });
  if (!plan) {
    clearOutputs();
    return;
  }

  // Update ingredient totals
  setText("flourTotal", `${fmtInt(plan.flourTotal)} g`);
  setText("milkTotal", `${fmtInt(plan.milkTotal)} ml`);
  setText("yogTotal", `${fmtInt(plan.yogTotal)} g`);
  setText("saltTotal", `${fmtInt(plan.salt)} g`);
  setText("oilTotal", `${fmtInt(plan.oilTotal)} g`);
  setText("targetDough", `${fmtInt(plan.target)} g`);
  setText("hydration", `${fmt1(plan.hydration)}%`);

  // Update per-chapati nutrition
  setText("proteinPer", `${fmt1(plan.proteinPer)} g`);
  setText("kcalPer", `${fmtInt(plan.kcalPer)} kcal`);
  setText("carbsPer", `${fmt1(plan.carbsPer)} g`);
  setText("fatPer", `${fmt1(plan.fatPer)} g`);

  // Update meal totals if meal count is specified
  const mealN = parseInt(document.getElementById("mealCount")?.value, 10);
  const haveMeal = Number.isFinite(mealN) && mealN > 0;

  setText("mealProtein", haveMeal ? `${fmt1(plan.proteinPer * mealN)} g` : "—");
  setText("mealKcal", haveMeal ? `${fmtInt(plan.kcalPer * mealN)} kcal` : "—");
  setText("mealCarbs", haveMeal ? `${fmt1(plan.carbsPer * mealN)} g` : "—");
  setText("mealFat", haveMeal ? `${fmt1(plan.fatPer * mealN)} g` : "—");
}

// ===== Timer =====
let tHandle = null;
let remaining = 8 * 60 + 30;

function displayTimer() {
  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = Math.floor(remaining % 60).toString().padStart(2, "0");
  const t = $("#timer");
  if (t) t.textContent = `${m}:${s}`;
}

function startTimer() {
  if (tHandle) return;
  tHandle = setInterval(() => {
    if (remaining > 0) {
      remaining -= 1;
      displayTimer();
    } else {
      clearInterval(tHandle);
      tHandle = null;
    }
  }, 1000);
}

function pauseTimer() {
  if (!tHandle) return;
  clearInterval(tHandle);
  tHandle = null;
}

function resetTimer() {
  pauseTimer();
  remaining = 8 * 60 + 30;
  displayTimer();
}

// ===== Event Listeners =====

// Chapati count input
const nInput = document.getElementById("n");
if (nInput) {
  nInput.addEventListener("input", render);
}

// Meal count controls
const mealBox = document.getElementById("mealCount");
const mealMinus = document.getElementById("mealMinus");
const mealPlus = document.getElementById("mealPlus");

if (mealBox) mealBox.addEventListener("input", render);

function stepMeal(delta) {
  if (!mealBox) return;
  let value = parseInt(mealBox.value, 10);
  if (!Number.isFinite(value)) value = 0;
  value += delta;
  if (value < 1) value = 1;
  mealBox.value = String(value);
  render();
}

if (mealMinus) mealMinus.addEventListener("click", () => stepMeal(-1));
if (mealPlus) mealPlus.addEventListener("click", () => stepMeal(1));

// Preset buttons
document.querySelectorAll(".chapatiPreset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const count = parseInt(btn.dataset.count, 10);
    if (nInput) nInput.value = String(count);
    render();
  });
});

// Timer controls
document.getElementById("startTimer")?.addEventListener("click", startTimer);
document.getElementById("pauseTimer")?.addEventListener("click", pauseTimer);
document.getElementById("resetTimer")?.addEventListener("click", resetTimer);

// ===== Initialization =====
if (nInput && !nInput.value) nInput.value = "25";
displayTimer();
render();
