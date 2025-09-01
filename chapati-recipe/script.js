// ===== Ratios & brand data =====
const R = {
  FLOUR: 190,
  YOG: 95,
  MILK: 115,
  SUM: 400
};

// Nutrition data (per 100g or 100ml as labelled)
const BRANDS = {
  yoghurt: {
    // Values for carbs/fat are best-available approximations;
    // adjust here easily if your label differs.
    yoplait: {
      kJ100: 330,
      protein100: 10.0,
      carbs100: 4.1,
      fat100: 2.5,
      kcal100: 330 / 4.184
    },
    gopala: {
      kJ100: 270,
      protein100: 3.2,
      carbs100: 4.7,
      fat100: 3.8,
      kcal100: 270 / 4.184,
      approx: true
    },
  },
  milk: {
    value: {
      kJ100: 164,
      protein100: 3.8,
      carbs100: 5.0,
      fat100: 0.1,
      kcal100: 164 / 4.184
    },
    dairydale: {
      kJ100: 157,
      protein100: 3.7,
      carbs100: 4.9,
      fat100: 0.3,
      kcal100: 157 / 4.184,
      approx: true
    },
  },
};

// Flour & oil labels (kept consistent with existing calculator)
const P_FLOUR_PER_G = 4 / 30;   // g protein per g flour  (≈13.3 g/100g)
const K_FLOUR_PER_G = 100 / 30; // kcal per g flour       (≈333 kcal/100g)

// Derive carbs & fat for flour so macros line up with ~100 kcal per 30 g
//  - Protein 4g -> 16 kcal
//  - Assume fat small (~2 g / 100 g), carbs make up the rest
const F_FLOUR_PER_G = 2 / 100;  // g fat per g flour (≈2 g/100g)
const C_FLOUR_PER_G = 0.7;      // g carbs per g flour (≈70 g/100g), matches remaining kcal

const K_OIL_PER_G = 9;          // kcal per g oil/ghee
const P_OIL_PER_G = 0;
const C_OIL_PER_G = 0;
const F_OIL_PER_G = 1;

// Hydration assumptions
const WATER_YOG = 0.80; // yoghurt ≈ 80% water
const WATER_MILK = 0.90; // trim milk ≈ 90% water

// Fixed add-ons per chapati
const DUST_FLOUR_PER_CHAPATI_G = 2; // raw flour for dusting
const GHEE_PER_CHAPATI_G = 1;       // ghee brushed after cooking

// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
const nearest10 = (x) => Math.round(x / 10) * 10;
const roundHalf = (x) => Math.round(x * 2) / 2;
const fmtInt = (x) => Number.isFinite(x) ? `${Math.round(x)}` : "—";
const fmt1 = (x) => Number.isFinite(x) ? `${(+x).toFixed(1)}` : "—";
const note = (b) => b?.approx ? "Approx. values until label confirmed." : "";

// Small pulse animation
function pulse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

let userTouchedOil = false;

// ===== Core calc =====
function computePlan({ n, dough, oil, yogBrand, milkBrand }) {
  if (!Number.isFinite(n) || !Number.isFinite(dough) || n <= 0 || dough <= 0) return null;

  const target = n * dough;

  // Base ingredient masses
  let flourTotal = target * (R.FLOUR / R.SUM);
  let yogTotal = target * (R.YOG / R.SUM);
  let milkTotal = target * (R.MILK / R.SUM);

  flourTotal = nearest10(flourTotal);
  yogTotal = nearest10(yogTotal);
  milkTotal = nearest10(milkTotal);

  // Tangzhong split
  const flourTZ = Math.max(10, nearest10(flourTotal * 0.05));
  const flourBowl = flourTotal - flourTZ;

  let milkTZ = 5 * flourTZ;
  if (milkTotal < milkTZ) milkTotal = milkTZ;
  const milkBowl = milkTotal - milkTZ;

  // Salt & oil
  const salt = roundHalf(0.01 * n * dough);

  const autoOil = Math.round(n * (5 / 15));
  const oilBowl = (Number.isFinite(oil) && oil > 0) ? Math.round(oil) : autoOil;

  // Brand selections
  const Y = BRANDS.yoghurt[yogBrand];
  const M = BRANDS.milk[milkBrand];

  // Automatic dusting flour (raw) & ghee per chapati
  const dustTotalG = n * DUST_FLOUR_PER_CHAPATI_G;
  const gheeTotalG = n * GHEE_PER_CHAPATI_G;

  // Batch macros
  const proteinBatch =
    flourTotal * P_FLOUR_PER_G +
    dustTotalG * P_FLOUR_PER_G +
    yogTotal * (Y.protein100 / 100) +
    milkTotal * (M.protein100 / 100);

  const carbsBatch =
    flourTotal * C_FLOUR_PER_G +
    dustTotalG * C_FLOUR_PER_G +
    yogTotal * (Y.carbs100 / 100) +
    milkTotal * (M.carbs100 / 100);

  const fatBatch =
    flourTotal * F_FLOUR_PER_G +
    dustTotalG * F_FLOUR_PER_G +
    yogTotal * (Y.fat100 / 100) +
    milkTotal * (M.fat100 / 100) +
    oilBowl * F_OIL_PER_G +          // oil in dough
    gheeTotalG * F_OIL_PER_G;        // ghee after cooking

  const kcalBatch =
    flourTotal * K_FLOUR_PER_G +
    dustTotalG * K_FLOUR_PER_G +
    yogTotal * (Y.kcal100 / 100) +
    milkTotal * (M.kcal100 / 100) +
    (oilBowl + gheeTotalG) * K_OIL_PER_G;

  const waterGrams = yogTotal * WATER_YOG + milkTotal * WATER_MILK;
  const hydration = +((waterGrams / flourTotal) * 100).toFixed(1);

  // Per-chapati
  const proteinPer = +(proteinBatch / n).toFixed(2);
  const carbsPer   = +(carbsBatch   / n).toFixed(1);
  const fatPer     = +(fatBatch     / n).toFixed(1);
  const kcalPer    = +(kcalBatch    / n).toFixed(0);

  return {
    n,
    target,
    flourTotal,
    yogTotal,
    milkTotal,
    flourBowl,
    flourTZ,
    milkBowl,
    milkTZ,
    salt,
    oilBowl,
    approxMilk: !!M.approx,
    approxYog: !!Y.approx,
    hydration,
    proteinPer, carbsPer, fatPer, kcalPer,
  };
}

// ===== IO =====
function read() {
  const n = parseInt($("#n")?.value, 10);
  const dough = parseInt($("#dough")?.value, 10);
  const oilEl = $("#oil");
  const oil = (oilEl && userTouchedOil) ? parseInt(oilEl.value, 10) : undefined;

  const yogBrand = $("#yogBrand")?.value || "yoplait";
  const milkBrand = $("#milkBrand")?.value || "value";

  return { n, dough, oil, yogBrand, milkBrand };
}

function clearOutputs() {
  const ids = [
    "flourBowl", "milkBowl", "yogBowl", "salt", "oilBowl",
    "flourTZ", "milkTZ", "flourTotal", "milkTotal", "yogTotal",
    "targetDough", "proteinPer", "kcalPer", "carbsPer", "fatPer", "hydration",
    "mealProtein", "mealKcal", "mealCarbs", "mealFat"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });
  const milkNote = document.getElementById("milkNote");
  if (milkNote) milkNote.textContent = "";
}

// ===== Render =====
function render() {
  const { n, dough, oil, yogBrand, milkBrand } = read();

  const milkNote = document.getElementById("milkNote");
  if (milkNote) {
    const noteText = [note(BRANDS.milk[milkBrand]), note(BRANDS.yoghurt[yogBrand])]
      .filter(Boolean).join(" ");
    milkNote.textContent = noteText;
  }

  const p = computePlan({ n, dough, oil, yogBrand, milkBrand });
  if (!p) {
    clearOutputs();
    return;
  }

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val;
      pulse(id);
    }
  };

  // Bowl & TZ
  set("flourBowl", fmtInt(p.flourBowl) + " g");
  set("milkBowl", fmtInt(p.milkBowl) + " ml");
  set("yogBowl", fmtInt(p.yogTotal) + " g");
  set("salt", (p.salt % 1 ? p.salt.toFixed(1) : fmtInt(p.salt)) + " g");
  set("oilBowl", fmtInt(p.oilBowl) + " g");

  set("flourTZ", fmtInt(p.flourTZ) + " g");
  set("milkTZ", fmtInt(p.milkTZ) + " ml");

  // Totals & per-chapati KPIs
  set("flourTotal", fmtInt(p.flourTotal) + " g");
  set("milkTotal", fmtInt(p.milkTotal) + " ml");
  set("yogTotal", fmtInt(p.yogTotal) + " g");
  set("targetDough", fmtInt(p.target) + " g");

  set("proteinPer", p.proteinPer + " g");
  set("kcalPer", p.kcalPer + " kcal");
  set("carbsPer", fmt1(p.carbsPer) + " g");
  set("fatPer", fmt1(p.fatPer) + " g");
  set("hydration", p.hydration + "%");

  // Meal totals
  const mealN = parseInt(document.getElementById("mealCount")?.value, 10);
  const haveMeal = (mealN && mealN > 0);
  set("mealProtein", haveMeal ? fmt1(p.proteinPer * mealN) + " g" : "—");
  set("mealKcal",    haveMeal ? Math.round(p.kcalPer * mealN) + " kcal" : "—");
  set("mealCarbs",   haveMeal ? fmt1(p.carbsPer * mealN) + " g" : "—");
  set("mealFat",     haveMeal ? fmt1(p.fatPer   * mealN) + " g" : "—");

  // Auto-fill oil initially
  if (!userTouchedOil && Number.isFinite(n) && Number.isFinite(dough)) {
    const oilEl = document.getElementById("oil");
    if (oilEl) oilEl.value = p.oilBowl;
  }
}

/* ===== Duo mobile subtitle pills =====
   Attach labels to each kv block (used by CSS ::before) */
function setupDuoTitles() {
  document.querySelectorAll("#panel-duo .duo-grid .kv").forEach((el, i) => {
    el.setAttribute("data-title", i === 0 ? "Stand mixer" : "Tangzhong");
  });
}

// ===== Timer (8:30) =====
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
      remaining--;
      displayTimer();
    } else {
      clearInterval(tHandle);
      tHandle = null;
    }
  }, 1000);
}

function pauseTimer() {
  if (tHandle) {
    clearInterval(tHandle);
    tHandle = null;
  }
}

function resetTimer() {
  pauseTimer();
  remaining = 8 * 60 + 30;
  displayTimer();
}

// ===== Events =====
["n", "dough", "yogBrand", "milkBrand"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", render);
});
const oilEl = document.getElementById("oil");
if (oilEl) oilEl.addEventListener("input", () => {
  userTouchedOil = true;
  render();
});

// Meal stepper
const mealBox = document.getElementById("mealCount");
const mealMinus = document.getElementById("mealMinus");
const mealPlus = document.getElementById("mealPlus");
if (mealBox) mealBox.addEventListener("input", render);

function stepMeal(delta) {
  if (!mealBox) return;
  let v = parseInt(mealBox.value, 10);
  if (!Number.isFinite(v)) v = 0;
  v += delta;
  if (v < 1) v = 1;
  mealBox.value = v;
  render();
}
if (mealMinus) mealMinus.addEventListener("click", () => stepMeal(-1));
if (mealPlus) mealPlus.addEventListener("click", () => stepMeal(+1));

// Presets
[
  ["preset8", 8],
  ["preset14", 14],
  ["preset16", 16],
  ["preset20", 20]
].forEach(([id, val]) => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener("click", () => {
    const nEl = document.getElementById("n");
    if (nEl) nEl.value = val;
    document.querySelectorAll("#preset8,#preset14,#preset16,#preset20").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
});

// Dough presets
document.querySelectorAll(".doughPreset").forEach(btn => {
  btn.addEventListener("click", () => {
    const grams = parseInt(btn.dataset.dough, 10);
    const dEl = document.getElementById("dough");
    if (dEl) dEl.value = grams;
    document.querySelectorAll(".doughPreset").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
});

// Timer controls
document.getElementById("startTimer")?.addEventListener("click", startTimer);
document.getElementById("pauseTimer")?.addEventListener("click", pauseTimer);
document.getElementById("resetTimer")?.addEventListener("click", resetTimer);

// Init
setupDuoTitles();
displayTimer();
render();
