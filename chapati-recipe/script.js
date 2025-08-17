// ---- Fixed ratio from your 16-piece batch ----
const R = { FLOUR: 190, YOG: 90, MILK: 120, SUM: 400 };

// ---- Brand nutrition database (per 100 g or 100 ml) ----
const BRANDS = {
  yoghurt: {
    yoplait: { name: 'Yoplait Max Protein Plain',  kJ100: 330, protein100: 10.0, kcal100: 330/4.184 },
    gopala:  { name: 'Gopala Full Cream',          kJ100: 270, protein100: 3.2,  kcal100: 270/4.184 },
  },
  milk: {
    value:     { name: 'Value Trim Milk',      kJ100: 164, protein100: 3.8, kcal100: 164/4.184 },
    dairydale: { name: 'Dairy Dale Trim Milk', kJ100: 156, protein100: 4.0, kcal100: 156/4.184, approx: true },
  }
};

// ---- Label constants ----
const P_FLOUR_PER_G = 4/30;    // g protein per g flour
const K_FLOUR_PER_G = 100/30;  // kcal per g flour
const K_OIL_PER_G   = 9;       // kcal per g oil

// ---- Helpers ----
const $ = sel => document.querySelector(sel);
const nearest10 = x => Math.round(x/10)*10; // up or down to nearest 10
const roundHalf = x => Math.round(x*2)/2;
const fmtInt = x => Number.isFinite(x) ? `${Math.round(x)}` : '—';

let userTouchedOil = false; // don't overwrite manual oil edits

function computePlan({ n, dough, dust, oil, yogBrand, milkBrand }){
  // guard: need both N and dough
  if (!Number.isFinite(n) || !Number.isFinite(dough) || n <= 0 || dough <= 0) return null;

  // Target dough mass (before salt)
  const target = n * dough;

  // Split target by fixed ratio
  let flourTotal = target * (R.FLOUR / R.SUM);
  let yogTotal   = target * (R.YOG   / R.SUM);
  let milkTotal  = target * (R.MILK  / R.SUM);

  // Rounding policy: nearest 10 g/ml (salt & oil excluded)
  flourTotal = nearest10(flourTotal);
  yogTotal   = nearest10(yogTotal);
  milkTotal  = nearest10(milkTotal);

  // Tangzhong: 5% of total flour (rounded to nearest 10; minimum 10 g)
  let flourTZ = Math.max(10, nearest10(flourTotal * 0.05));
  let flourBowl = flourTotal - flourTZ;

  // Milk for TZ = 5 × flourTZ
  let milkTZ = 5 * flourTZ;
  if (milkTotal < milkTZ) milkTotal = milkTZ; // ensure enough milk for TZ
  let milkBowl = milkTotal - milkTZ;

  // Salt ≈ 1% of total dough (rounded to 0.5 g)
  const salt = roundHalf(0.01 * n * dough);

  // Oil in dough (auto ~0.33 g per chapati; ≈5 g per 15)
  const autoOil = Math.round(n * (5/15));
  const oilBowl = (Number.isFinite(oil) && oil > 0) ? Math.round(oil) : autoOil;

  // Nutrition with selected brands (+ optional dust flour)
  const Y = BRANDS.yoghurt[yogBrand];
  const M = BRANDS.milk[milkBrand];
  const dustG = Number.isFinite(dust) ? Math.max(0, dust) : 0;

  const proteinBatch =
      flourTotal * P_FLOUR_PER_G
    + yogTotal   * (Y.protein100/100)
    + milkTotal  * (M.protein100/100)
    + dustG      * P_FLOUR_PER_G;

  const kcalBatch =
      flourTotal * K_FLOUR_PER_G
    + yogTotal   * (Y.kcal100/100)
    + milkTotal  * (M.kcal100/100)
    + oilBowl    * K_OIL_PER_G
    + dustG      * K_FLOUR_PER_G;

  const proteinPer = +(proteinBatch / n).toFixed(2);
  const kcalPer    = +(kcalBatch / n).toFixed(0);

  return {
    target, flourTotal, yogTotal, milkTotal,
    flourBowl, flourTZ, milkBowl, milkTZ,
    salt, oilBowl, proteinPer, kcalPer
  };
}

function read(){
  const nRaw     = $('#n')?.value?.trim();
  const doughRaw = $('#dough')?.value?.trim();
  const dustRaw  = $('#dust')?.value?.trim();
  const oilRaw   = $('#oil')?.value?.trim();

  const n     = nRaw ? parseInt(nRaw, 10) : NaN;
  const dough = doughRaw ? parseInt(doughRaw, 10) : NaN;
  const dust  = dustRaw ? parseInt(dustRaw, 10) : 0;
  const oil   = oilRaw ? parseInt(oilRaw, 10) : undefined;

  const yogBrand  = $('#yogBrand')?.value || 'yoplait';
  const milkBrand = $('#milkBrand')?.value || 'value';

  return { n, dough, dust, oil, yogBrand, milkBrand };
}

function clearOutputs(){
  [
    'flourBowl','milkBowl','yogBowl','salt','oilBowl',
    'flourTZ','milkTZ','flourTotal','milkTotal','yogTotal',
    'targetDough','proteinPer','kcalPer'
  ].forEach(id => { const el = $('#'+id); if (el) el.textContent='—'; });
  if ($('#dustEcho')) $('#dustEcho').textContent = $('#dust')?.value || 0;
  if ($('#oilEcho'))  $('#oilEcho').textContent  = $('#oil')?.value  || 0;
}

function render(){
  const { n, dough, dust, oil, yogBrand, milkBrand } = read();

  // Show note if Dairy Dale is approximate
  const milk = BRANDS.milk[milkBrand];
  const note = milk?.approx
    ? 'Using typical NZ trim values for Dairy Dale until a label is provided (156 kJ & 4.0 g protein per 100 ml).'
    : '';
  if ($('#milkNote')) $('#milkNote').textContent = note;

  const p = computePlan({ n, dough, dust, oil, yogBrand, milkBrand });
  if (!p){
    clearOutputs();
    return;
  }

  // Bowl / TZ
  $('#flourBowl').textContent = fmtInt(p.flourBowl) + ' g';
  $('#milkBowl').textContent  = fmtInt(p.milkBowl)  + ' ml';
  $('#yogBowl').textContent   = fmtInt(p.yogTotal)  + ' g';
  $('#salt').textContent      = (p.salt % 1 ? p.salt.toFixed(1) : fmtInt(p.salt)) + ' g';
  $('#oilBowl').textContent   = fmtInt(p.oilBowl) + ' g';

  $('#flourTZ').textContent   = fmtInt(p.flourTZ) + ' g';
  $('#milkTZ').textContent    = fmtInt(p.milkTZ)  + ' ml';

  // Totals + KPIs
  $('#flourTotal').textContent = fmtInt(p.flourTotal) + ' g';
  $('#milkTotal').textContent  = fmtInt(p.milkTotal)  + ' ml';
  $('#yogTotal').textContent   = fmtInt(p.yogTotal)   + ' g';
  $('#targetDough').textContent= fmtInt(p.target)     + ' g';

  $('#proteinPer').textContent = p.proteinPer + ' g';
  $('#kcalPer').textContent    = p.kcalPer    + ' kcal';
  $('#dustEcho').textContent   = $('#dust')?.value || 0;
  $('#oilEcho').textContent    = fmtInt(p.oilBowl);

  // If user hasn't touched oil, auto-fill the field so they can see it
  if (!userTouchedOil && Number.isFinite(n) && Number.isFinite(dough)) {
    $('#oil').value = p.oilBowl;
  }
}

// ------- Timer (8:30) -------
let tHandle = null;
let remaining = 8*60 + 30;
function displayTimer(){
  const m = Math.floor(remaining/60).toString().padStart(2,'0');
  const s = Math.floor(remaining%60).toString().padStart(2,'0');
  const el = $('#timer'); if (el) el.textContent = `${m}:${s}`;
}
function startTimer(){ if(tHandle) return; tHandle = setInterval(()=>{ if(remaining>0){ remaining--; displayTimer(); } else { clearInterval(tHandle); tHandle=null; } }, 1000); }
function pauseTimer(){ if(tHandle){ clearInterval(tHandle); tHandle=null; } }
function resetTimer(){ pauseTimer(); remaining = 8*60 + 30; displayTimer(); }

// ------- Events -------
['n','dough','dust','yogBrand','milkBrand'].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', render);
});
const oilEl = document.getElementById('oil');
if (oilEl) oilEl.addEventListener('input', ()=>{ userTouchedOil = true; render(); });

// Number-of-chapatis presets
const presets = [
  ['preset8', 8], ['preset14',14], ['preset16',16], ['preset20',20]
];
presets.forEach(([id, val])=>{
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', ()=>{ const nEl = $('#n'); if (nEl){ nEl.value = val; render(); } });
});

// Dough presets (25/30/35/40) — buttons should have class "doughPreset" and data-dough="XX"
document.querySelectorAll('.doughPreset').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const grams = parseInt(btn.dataset.dough, 10);
    const dEl = $('#dough'); if (dEl){ dEl.value = grams; }
    // Optional: visual active state (if you add .active in CSS)
    document.querySelectorAll('.doughPreset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// Timer buttons
const startBtn = document.getElementById('startTimer');
const pauseBtn = document.getElementById('pauseTimer');
const resetBtn = document.getElementById('resetTimer');
if (startBtn) startBtn.addEventListener('click', startTimer);
if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
if (resetBtn) resetBtn.addEventListener('click', resetTimer);

// ------- Init -------
displayTimer();
render();
