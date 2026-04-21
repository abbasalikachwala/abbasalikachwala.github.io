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

const $ = (sel) => document.querySelector(sel);
const fmtInt = (x) => Number.isFinite(x) ? `${Math.round(x)}` : "—";
const fmt1 = (x) => Number.isFinite(x) ? `${x.toFixed(1)}` : "—";
const roundTo5 = (x) => Math.round(x / 5) * 5;

function pulse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

function perGram(valuePer100) {
  return valuePer100 / 100;
}

function hydrationFor(flourTotal, yogTotal, milkTotal) {
  return ((yogTotal * WATER_YOG) + (milkTotal * WATER_MILK)) / flourTotal * 100;
}

function chooseRoundedIngredients(target) {
  const rawFlour = target * (R.FLOUR / R.SUM);
  const rawYog = target * (R.YOG / R.SUM);
  const rawMilk = target * (R.MILK / R.SUM);

  let best = null;

  for (let flour = roundTo5(rawFlour) - 30; flour <= roundTo5(rawFlour) + 30; flour += 5) {
    if (flour <= 0) continue;

    for (let yog = roundTo5(rawYog) - 30; yog <= roundTo5(rawYog) + 30; yog += 5) {
      if (yog < 0) continue;

      const milk = target - flour - yog;
      if (milk < 0 || milk % 5 !== 0) continue;

      const hydration = hydrationFor(flour, yog, milk);
      const score =
        Math.abs(hydration - 90) * 100 +
        Math.abs(flour - rawFlour) +
        Math.abs(yog - rawYog) +
        Math.abs(milk - rawMilk);

      if (!best || score < best.score) {
        best = { flourTotal: flour, yogTotal: yog, milkTotal: milk, hydration, score };
      }
    }
  }

  return best || {
    flourTotal: roundTo5(rawFlour),
    yogTotal: roundTo5(rawYog),
    milkTotal: roundTo5(target - roundTo5(rawFlour) - roundTo5(rawYog)),
    hydration: hydrationFor(
      roundTo5(rawFlour),
      roundTo5(rawYog),
      roundTo5(target - roundTo5(rawFlour) - roundTo5(rawYog))
    )
  };
}

function syncPresetState(n) {
  document.querySelectorAll(".chapatiPreset").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.count, 10) === n);
  });
}

function read() {
  const n = parseInt($("#n")?.value, 10);
  return { n };
}

function computePlan({ n }) {
  if (!Number.isFinite(n) || n <= 0) return null;

  const target = n * CHAPATI_DOUGH_G;
  const rounded = chooseRoundedIngredients(target);
  const { flourTotal, yogTotal, milkTotal } = rounded;

  const salt = Math.floor(0.01 * target);
  const oilTotal = Math.max(1, Math.round(n * AUTO_OIL_BASE_PER_CHAPATI_G * OIL_INCREASE_FACTOR));

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

function clearOutputs() {
  [
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
  ].forEach((id) => {
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

  setText("flourTotal", `${fmtInt(plan.flourTotal)} g`);
  setText("milkTotal", `${fmtInt(plan.milkTotal)} ml`);
  setText("yogTotal", `${fmtInt(plan.yogTotal)} g`);
  setText("saltTotal", `${fmtInt(plan.salt)} g`);
  setText("oilTotal", `${fmtInt(plan.oilTotal)} g`);
  setText("targetDough", `${fmtInt(plan.target)} g`);
  setText("hydration", `${fmt1(plan.hydration)}%`);
  setText("proteinPer", `${fmt1(plan.proteinPer)} g`);
  setText("kcalPer", `${fmtInt(plan.kcalPer)} kcal`);
  setText("carbsPer", `${fmt1(plan.carbsPer)} g`);
  setText("fatPer", `${fmt1(plan.fatPer)} g`);

  const mealN = parseInt(document.getElementById("mealCount")?.value, 10);
  const haveMeal = Number.isFinite(mealN) && mealN > 0;
  setText("mealProtein", haveMeal ? `${fmt1(plan.proteinPer * mealN)} g` : "—");
  setText("mealKcal", haveMeal ? `${fmtInt(plan.kcalPer * mealN)} kcal` : "—");
  setText("mealCarbs", haveMeal ? `${fmt1(plan.carbsPer * mealN)} g` : "—");
  setText("mealFat", haveMeal ? `${fmt1(plan.fatPer * mealN)} g` : "—");
}

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

const nInput = document.getElementById("n");
if (nInput) {
  nInput.addEventListener("input", render);
}

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

document.querySelectorAll(".chapatiPreset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const count = parseInt(btn.dataset.count, 10);
    if (nInput) nInput.value = String(count);
    render();
  });
});

document.getElementById("startTimer")?.addEventListener("click", startTimer);
document.getElementById("pauseTimer")?.addEventListener("click", pauseTimer);
document.getElementById("resetTimer")?.addEventListener("click", resetTimer);

if (nInput && !nInput.value) nInput.value = "25";
displayTimer();
render();
