// ===== Ratios & brand data =====
const R = {
   FLOUR: 190,
   YOG: 90,
   MILK: 120,
   SUM: 400
};

const BRANDS = {
   yoghurt: {
      yoplait: {
         kJ100: 330,
         protein100: 10.0,
         kcal100: 330 / 4.184
      },
      gopala: {
         kJ100: 270,
         protein100: 3.2,
         kcal100: 270 / 4.184
      },
   },
   milk: {
      value: {
         kJ100: 164,
         protein100: 3.8,
         kcal100: 164 / 4.184
      },
      dairydale: {
         kJ100: 156,
         protein100: 4.0,
         kcal100: 156 / 4.184,
         approx: true
      },
   },
};

// Flour & oil labels
const P_FLOUR_PER_G = 4 / 30; // g protein per g flour
const K_FLOUR_PER_G = 100 / 30; // kcal per g flour
const K_OIL_PER_G = 9; // kcal per g oil

// Hydration assumptions
const WATER_YOG = 0.80; // yoghurt ≈ 80% water
const WATER_MILK = 0.90; // trim milk ≈ 90% water

// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
const nearest10 = (x) => Math.round(x / 10) * 10;
const roundHalf = (x) => Math.round(x * 2) / 2;
const fmtInt = (x) => Number.isFinite(x) ? `${Math.round(x)}` : "—";

function pulse(id) {
   const el = document.getElementById(id);
   if (!el) return;
   el.classList.remove("pulse");
   void el.offsetWidth;
   el.classList.add("pulse");
}

let userTouchedOil = false;

// ===== Core calc =====
function computePlan({
   n,
   dough,
   dust,
   oil,
   yogBrand,
   milkBrand
}) {
   if (!Number.isFinite(n) || !Number.isFinite(dough) || n <= 0 || dough <= 0) return null;

   const target = n * dough;

   let flourTotal = target * (R.FLOUR / R.SUM);
   let yogTotal = target * (R.YOG / R.SUM);
   let milkTotal = target * (R.MILK / R.SUM);

   flourTotal = nearest10(flourTotal);
   yogTotal = nearest10(yogTotal);
   milkTotal = nearest10(milkTotal);

   const flourTZ = Math.max(10, nearest10(flourTotal * 0.05));
   const flourBowl = flourTotal - flourTZ;

   let milkTZ = 5 * flourTZ;
   if (milkTotal < milkTZ) milkTotal = milkTZ;
   const milkBowl = milkTotal - milkTZ;

   const salt = roundHalf(0.01 * n * dough);

   const autoOil = Math.round(n * (5 / 15));
   const oilBowl = (Number.isFinite(oil) && oil > 0) ? Math.round(oil) : autoOil;

   const Y = BRANDS.yoghurt[yogBrand];
   const M = BRANDS.milk[milkBrand];
   const dustG = Number.isFinite(dust) ? Math.max(0, dust) : 0;

   const proteinBatch =
      flourTotal * P_FLOUR_PER_G +
      yogTotal * (Y.protein100 / 100) +
      milkTotal * (M.protein100 / 100) +
      dustG * P_FLOUR_PER_G;

   const kcalBatch =
      flourTotal * K_FLOUR_PER_G +
      yogTotal * (Y.kcal100 / 100) +
      milkTotal * (M.kcal100 / 100) +
      oilBowl * K_OIL_PER_G +
      dustG * K_FLOUR_PER_G;

   const waterGrams = yogTotal * WATER_YOG + milkTotal * WATER_MILK;
   const hydration = +((waterGrams / flourTotal) * 100).toFixed(1);

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
      proteinPer: +(proteinBatch / n).toFixed(2),
      kcalPer: +(kcalBatch / n).toFixed(0),
      approxMilk: !!M.approx,
      hydration,
   };
}

// ===== IO =====
function read() {
   const n = parseInt($("#n")?.value, 10);
   const dough = parseInt($("#dough")?.value, 10);
   const dust = parseInt($("#dust")?.value, 10) || 0;
   const oilEl = $("#oil");
   const oil = (oilEl && userTouchedOil) ? parseInt(oilEl.value, 10) : undefined;

   const yogBrand = $("#yogBrand")?.value || "yoplait";
   const milkBrand = $("#milkBrand")?.value || "value";
   return {
      n,
      dough,
      dust,
      oil,
      yogBrand,
      milkBrand
   };
}

function clearOutputs() {
   const ids = [
      "flourBowl", "milkBowl", "yogBowl", "salt", "oilBowl",
      "flourTZ", "milkTZ", "flourTotal", "milkTotal", "yogTotal",
      "targetDough", "proteinPer", "kcalPer", "hydration",
      "mealProtein", "mealKcal"
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
   const {
      n,
      dough,
      dust,
      oil,
      yogBrand,
      milkBrand
   } = read();

   const milkNote = document.getElementById("milkNote");
   if (milkNote) milkNote.textContent = BRANDS.milk[milkBrand]?.approx ? "Approx. values until label confirmed." : "";

   const p = computePlan({
      n,
      dough,
      dust,
      oil,
      yogBrand,
      milkBrand
   });
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
   set("hydration", p.hydration + "%");

   // Meal totals
   const mealN = parseInt(document.getElementById("mealCount")?.value, 10);
   const mealProtein = (mealN && mealN > 0) ? +(p.proteinPer * mealN).toFixed(1) : null;
   const mealKcal = (mealN && mealN > 0) ? Math.round(p.kcalPer * mealN) : null;
   set("mealProtein", mealProtein !== null ? mealProtein + " g" : "—");
   set("mealKcal", mealKcal !== null ? mealKcal + " kcal" : "—");

   // Auto-fill oil initially
   if (!userTouchedOil && Number.isFinite(n) && Number.isFinite(dough)) {
      const oilEl = document.getElementById("oil");
      if (oilEl) oilEl.value = p.oilBowl;
   }
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
["n", "dough", "dust", "yogBrand", "milkBrand"].forEach(id => {
   const el = document.getElementById(id);
   if (el) el.addEventListener("input", render);
});
const oilEl = document.getElementById("oil");
if (oilEl) oilEl.addEventListener("input", () => {
   userTouchedOil = true;
   render();
});

// Meal input + direct stepper listeners
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

// Preset buttons
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

// Timer buttons
document.getElementById("startTimer")?.addEventListener("click", startTimer);
document.getElementById("pauseTimer")?.addEventListener("click", pauseTimer);
document.getElementById("resetTimer")?.addEventListener("click", resetTimer);

// Init
displayTimer();
render();
