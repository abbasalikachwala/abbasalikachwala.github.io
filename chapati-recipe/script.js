// --- constants from your proportions (per chapati, derived from 16-piece batch) ---
const PER_CAP_FLOUR = 190 / 16; // g
const PER_CAP_YOG   =  90 / 16; // g
const PER_CAP_MILK  = 120 / 16; // ml

// protein labels
const PROTEIN_FLOUR_PER_G = 4 / 30;  // g per gram flour
const PROTEIN_YOG_PER_G   = 0.10;    // g per gram yoghurt
const PROTEIN_MILK_PER_ML = 0.038;   // g per ml milk

// helpers
const roundUp10  = x => Math.ceil(x / 10) * 10;
const roundHalf  = x => Math.round(x * 2) / 2;
const fmtInt     = x => `${Math.round(x)}`;
const q = sel => document.querySelector(sel);

// compute plan
function computePlan(nChapatis, dustGrams, doughPerChapati, roundingMode){
  // raw totals
  let flourTotal = PER_CAP_FLOUR * nChapatis;
  let milkTotal  = PER_CAP_MILK  * nChapatis;
  let yogTotal   = PER_CAP_YOG   * nChapatis;

  if (roundingMode === 'up10'){
    flourTotal = roundUp10(flourTotal);
    milkTotal  = roundUp10(milkTotal);
    yogTotal   = roundUp10(yogTotal);
  } else {
    // exact: round to 1 g/ml for display sanity
    flourTotal = Math.round(flourTotal);
    milkTotal  = Math.round(milkTotal);
    yogTotal   = Math.round(yogTotal);
  }

  // tangzhong split
  let flourTZ = (roundingMode === 'up10')
    ? roundUp10(flourTotal * 0.05)
    : Math.round(flourTotal * 0.05); // exact mode
  let flourBowl = flourTotal - flourTZ;

  // milk for TZ = 5 × flourTZ (ml)
  let milkTZ = 5 * flourTZ;
  let milkTotalAdjusted = Math.max(milkTotal, milkTZ); // ensure enough for TZ
  let milkBowl = milkTotalAdjusted - milkTZ;
  if (milkBowl < 0) milkBowl = 0; // guard

  // salt ≈ 1% of total dough mass, rounded to 0.5 g
  const salt = roundHalf(0.01 * nChapatis * doughPerChapati);

  // protein (dust only affects protein math)
  const proteinBatch =
      flourTotal * PROTEIN_FLOUR_PER_G
    + yogTotal   * PROTEIN_YOG_PER_G
    + milkTotalAdjusted * PROTEIN_MILK_PER_ML
    + dustGrams  * PROTEIN_FLOUR_PER_G;
  const proteinPer = +(proteinBatch / nChapatis).toFixed(2);

  return {
    flourBowl, flourTZ, milkBowl, milkTZ, yogTotal,
    flourTotal, milkTotal: milkTotalAdjusted, salt, proteinPer
  };
}

// UI bindings
function readInputs(){
  const n = Math.max(1, parseInt(q('#n').value || '1', 10));
  const dust = Math.max(0, parseInt(q('#dust').value || '0', 10));
  const dough = Math.max(1, parseInt(q('#dough').value || '35', 10));
  const mode = q('#rounding').value;
  return { n, dust, dough, mode };
}

function render(){
  const { n, dust, dough, mode } = readInputs();
  const plan = computePlan(n, dust, dough, mode);

  q('#flourBowl').textContent = fmtInt(plan.flourBowl) + ' g';
  q('#milkBowl').textContent  = fmtInt(plan.milkBowl)  + ' ml';
  q('#yogBowl').textContent   = fmtInt(plan.yogTotal)  + ' g';
  q('#salt').textContent      = (plan.salt % 1 ? plan.salt.toFixed(1) : fmtInt(plan.salt)) + ' g';

  q('#flourTZ').textContent   = fmtInt(plan.flourTZ) + ' g';
  q('#milkTZ').textContent    = fmtInt(plan.milkTZ)  + ' ml';

  q('#flourTotal').textContent = fmtInt(plan.flourTotal) + ' g';
  q('#milkTotal').textContent  = fmtInt(plan.milkTotal)  + ' ml';
  q('#yogTotal').textContent   = fmtInt(plan.yogTotal)   + ' g';

  q('#proteinPer').textContent = plan.proteinPer + ' g';
  q('#dustEcho').textContent   = dust;
}

// share via URL
function updateURL(){
  const { n, dust, dough, mode } = readInputs();
  const params = new URLSearchParams({ n, dust, dough, mode });
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function initFromURL(){
  const p = new URLSearchParams(location.search);
  if (p.has('n'))     q('#n').value = p.get('n');
  if (p.has('dust'))  q('#dust').value = p.get('dust');
  if (p.has('dough')) q('#dough').value = p.get('dough');
  if (p.has('mode'))  q('#rounding').value = p.get('mode');
}

// events
['n','dust','dough','rounding'].forEach(id=>{
  q('#'+id).addEventListener('input', ()=>{ render(); updateURL(); });
});

q('#printBtn').addEventListener('click', ()=> window.print());
q('#copyBtn').addEventListener('click', ()=>{
  const { n } = readInputs();
  const t = [
    `Tangzhong Chapati Plan (x${n})`,
    `BOWL: Flour ${q('#flourBowl').textContent}, Milk ${q('#milkBowl').textContent}, Yoghurt ${q('#yogBowl').textContent}, Salt ${q('#salt').textContent}`,
    `TZ: Flour ${q('#flourTZ').textContent}, Milk ${q('#milkTZ').textContent}`,
    `TOTALS: Flour ${q('#flourTotal').textContent}, Milk ${q('#milkTotal').textContent}, Yoghurt ${q('#yogTotal').textContent}`,
    `Protein per chapati: ${q('#proteinPer').textContent} (includes dust: ${q('#dustEcho').textContent} g)`
  ].join('\n');
  navigator.clipboard?.writeText(t);
});
q('#shareBtn').addEventListener('click', ()=>{
  updateURL();
  navigator.clipboard?.writeText(location.href);
});
q('#resetBtn').addEventListener('click', ()=>{
  q('#n').value = 10;
  q('#dust').value = 0;
  q('#dough').value = 35;
  q('#rounding').value = 'up10';
  render(); updateURL();
});

// init
initFromURL();
render();