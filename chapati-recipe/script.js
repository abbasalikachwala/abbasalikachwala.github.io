// ---------- Ratios & brand data ----------
const R = { FLOUR: 190, YOG: 90, MILK: 120, SUM: 400 };

const BRANDS = {
  yoghurt: {
    yoplait: { name: 'Yoplait Max Protein Plain',  kJ100: 330, protein100: 10.0, kcal100: 330/4.184 },
    gopala:  { name: 'Gopala Full Cream',          kJ100: 270, protein100: 3.2,  kcal100: 270/4.184 },
  },
  milk: {
    value:     { name: 'Value Trim Milk',     kJ100: 164, protein100: 3.8, kcal100: 164/4.184 },
    dairydale: { name: 'Dairy Dale Trim Milk',kJ100: 156, protein100: 4.0, kcal100: 156/4.184, approx: true },
  }
};

// Flour & oil labels
const P_FLOUR_PER_G = 4/30;    // g protein per g flour
const K_FLOUR_PER_G = 100/30;  // kcal per g flour
const K_OIL_PER_G   = 9;       // kcal per g oil

// Hydration assumptions (approx.)
const WATER_YOG  = 0.80; // yoghurt ≈ 80% water
const WATER_MILK = 0.90; // trim milk ≈ 90% water

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const nearest10 = (x) => Math.round(x/10)*10;
const roundHalf = (x) => Math.round(x*2)/2;
const fmtInt = (x) => Number.isFinite(x) ? `${Math.round(x)}` : '—';

// Pulse animation on number change
function pulse(id){
  const el = $('#'+id); if (!el) return;
  el.classList.remove('pulse'); // reset
  // force reflow
  void el.offsetWidth;
  el.classList.add('pulse');
}

let userTouchedOil = false;

// ---------- Core calc ----------
function computePlan({ n, dough, dust, oil, yogBrand, milkBrand }){
  if (!Number.isFinite(n) || !Number.isFinite(dough) || n<=0 || dough<=0) return null;

  const target = n * dough;

  // split by ratio
  let flourTotal = target * (R.FLOUR/R.SUM);
  let yogTotal   = target * (R.YOG/R.SUM);
  let milkTotal  = target * (R.MILK/R.SUM);

  // nearest 10 g/ml
  flourTotal = nearest10(flourTotal);
  yogTotal   = nearest10(yogTotal);
  milkTotal  = nearest10(milkTotal);

  // tangzhong
  const flourTZ   = Math.max(10, nearest10(flourTotal*0.05));
  const flourBowl = flourTotal - flourTZ;

  let milkTZ = 5 * flourTZ;
  if (milkTotal < milkTZ) milkTotal = milkTZ;
  const milkBowl = milkTotal - milkTZ;

  const salt = roundHalf(0.01 * n * dough);

  // oil default ≈ 5 g per 15 chapatis
  const autoOil = Math.round(n * (5/15));
  const oilBowl = (Number.isFinite(oil) && oil > 0) ? Math.round(oil) : autoOil;

  // nutrition (brand) + dust
  const Y = BRANDS.yoghurt[yogBrand];
  const M = BRANDS.milk[milkBrand];
  const dustG = Number.isFinite(dust) ? Math.max(0,dust) : 0;

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

  // hydration (pre-dust)
  const waterGrams = yogTotal * WATER_YOG + milkTotal * WATER_MILK;
  const hydration  = +((waterGrams / flourTotal) * 100).toFixed(1);

  return {
    n, target,
    flourTotal, yogTotal, milkTotal,
    flourBowl, flourTZ, milkBowl, milkTZ,
    salt, oilBowl,
    proteinPer: +(proteinBatch / n).toFixed(2),
    kcalPer:    +(kcalBatch / n).toFixed(0),
    approxMilk: !!M.approx,
    hydration
  };
}

// ---------- IO ----------
function read(){
  const n     = parseInt($('#n')?.value ?? '', 10);
  const dough = parseInt($('#dough')?.value ?? '', 10);
  const dust  = parseInt($('#dust')?.value ?? '', 10);
  const oilIn = parseInt($('#oil')?.value  ?? '', 10);
  const yogBrand  = $('#yogBrand')?.value || 'yoplait';
  const milkBrand = $('#milkBrand')?.value || 'value';
  const oil  = userTouchedOil ? oilIn : undefined;
  return { n, dough, dust, oil, yogBrand, milkBrand };
}

function clearOutputs(){
  [
    'flourBowl','milkBowl','yogBowl','salt','oilBowl',
    'flourTZ','milkTZ','flourTotal','milkTotal','yogTotal',
    'targetDough','proteinPer','kcalPer','hydration'
  ].forEach(id => { const el = $('#'+id); if (el) el.textContent='—'; });
  $('#dustEcho')?.textContent = $('#dust')?.value || 0;
  $('#oilEcho') ?.textContent = $('#oil') ?.value || 0;
  $('#milkNote').textContent = '';
}

function render(){
  const { n, dough, dust, oil, yogBrand, milkBrand } = read();

  // milk note
  $('#milkNote').textContent = BRANDS.milk[milkBrand]?.approx
    ? 'Approx. values until label confirmed.'
    : '';

  const p = computePlan({ n, dough, dust, oil, yogBrand, milkBrand });
  if (!p){ clearOutputs(); return; }

  const set = (id, val) => { $('#'+id).textContent = val; pulse(id); };

  // bowl & tz
  set('flourBowl', fmtInt(p.flourBowl) + ' g');
  set('milkBowl',  fmtInt(p.milkBowl)  + ' ml');
  set('yogBowl',   fmtInt(p.yogTotal)  + ' g');
  set('salt',      (p.salt % 1 ? p.salt.toFixed(1) : fmtInt(p.salt)) + ' g');
  set('oilBowl',   fmtInt(p.oilBowl) + ' g');

  set('flourTZ',   fmtInt(p.flourTZ) + ' g');
  set('milkTZ',    fmtInt(p.milkTZ)  + ' ml');

  // totals & KPIs
  set('flourTotal', fmtInt(p.flourTotal) + ' g');
  set('milkTotal',  fmtInt(p.milkTotal)  + ' ml');
  set('yogTotal',   fmtInt(p.yogTotal)   + ' g');
  set('targetDough',fmtInt(p.target)     + ' g');

  set('proteinPer', p.proteinPer + ' g');
  set('kcalPer',    p.kcalPer    + ' kcal');
  set('hydration',  p.hydration  + '%');
  $('#dustEcho').textContent = $('#dust')?.value || 0;
  $('#oilEcho').textContent  = fmtInt(p.oilBowl);

  if (!userTouchedOil && Number.isFinite(n) && Number.isFinite(dough)) {
    $('#oil').value = p.oilBowl;
  }
}

// ---------- Timer (8:30) ----------
let tHandle = null;
let remaining = 8*60 + 30;
function displayTimer(){
  const m = Math.floor(remaining/60).toString().padStart(2,'0');
  const s = Math.floor(remaining%60).toString().padStart(2,'0');
  $('#timer').textContent = `${m}:${s}`;
}
function startTimer(){ if(tHandle) return; tHandle = setInterval(()=>{ if(remaining>0){ remaining--; displayTimer(); } else { clearInterval(tHandle); tHandle=null; } }, 1000); }
function pauseTimer(){ if(tHandle){ clearInterval(tHandle); tHandle=null; } }
function resetTimer(){ pauseTimer(); remaining = 8*60 + 30; displayTimer(); }

// ---------- Events ----------
['n','dough','dust','yogBrand','milkBrand'].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', render);
});
const oilEl = document.getElementById('oil');
if (oilEl) oilEl.addEventListener('input', ()=>{ userTouchedOil = true; render(); });

// piece presets
[['preset8',8],['preset14',14],['preset16',16],['preset20',20]].forEach(([id,val])=>{
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', ()=>{
    $('#n').value = val;
    document.querySelectorAll('#preset8,#preset14,#preset16,#preset20').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// dough presets
document.querySelectorAll('.doughPreset').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const grams = parseInt(btn.dataset.dough,10);
    $('#dough').value = grams;
    document.querySelectorAll('.doughPreset').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// Timer buttons
$('#startTimer').addEventListener('click', startTimer);
$('#pauseTimer').addEventListener('click', pauseTimer);
$('#resetTimer').addEventListener('click', resetTimer);

// Init
displayTimer();
render();

/* --- number pulse animation (tiny) --- */
const style = document.createElement('style');
style.textContent = `
  .pulse{ animation: numPulse .35s ease }
  @keyframes numPulse{ from{background:rgba(10,132,255,.08)} to{background:transparent} }
`;
document.head.appendChild(style);
