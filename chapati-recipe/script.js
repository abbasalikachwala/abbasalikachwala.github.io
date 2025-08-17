// ---- Proportions & labels ----
// Keep the flour:yoghurt:milk ratio from your 16-piece batch
const R_FLOUR = 190;
const R_YOG   = 90;
const R_MILK  = 120;
const R_SUM   = R_FLOUR + R_YOG + R_MILK; // 400

// Protein labels (user-provided)
const P_FLOUR_PER_G = 4 / 30;   // g protein per g flour
const P_YOG_PER_G   = 0.10;     // g/g
const P_MILK_PER_ML = 0.038;    // g/ml

// Calories (user-provided packs)
// Flour: 100 kcal per 30 g => 3.333... kcal/g
// Yoghurt: 143 kcal per 180 g => 0.7944 kcal/g
// Trim milk: 164 kJ / 100 ml => 39.2 kcal/100 ml => 0.392 kcal/ml
// Oil: 9 kcal / g
const K_FLOUR_PER_G = 100 / 30;
const K_YOG_PER_G   = 143 / 180;
const K_MILK_PER_ML = 39.2 / 100;
const K_OIL_PER_G   = 9;

// Helpers
const q = sel => document.querySelector(sel);
const roundUp10 = x => Math.ceil(x / 10) * 10;
const roundHalf = x => Math.round(x * 2) / 2;
const fmtInt = x => `${Math.round(x)}`;

function computePlan({
  nChapatis,
  doughPerChapati,      // g
  dustGrams,            // g, nutrition only
  oilInDough,           // g, goes in BOWL
  roundingMode          // 'up10' | 'exact'
}){
  // Target dough mass (before salt), enforce this so counts match reality
  const target = nChapatis * doughPerChapati;

  // Split target by ratio (190:90:120)
  let flourTotal = target * (R_FLOUR / R_SUM);
  let yogTotal   = target * (R_YOG   / R_SUM);
  let milkTotal  = target * (R_MILK  / R_SUM);

  // Rounding policy
  if (roundingMode === 'up10'){
    flourTotal = roundUp10(flourTotal);
    yogTotal   = roundUp10(yogTotal);
    milkTotal  = roundUp10(milkTotal);
  } else {
    flourTotal = Math.round(flourTotal);
    yogTotal   = Math.round(yogTotal);
    milkTotal  = Math.round(milkTotal);
  }

  // Tangzhong: 5% of total flour to TZ
  let flourTZ = (roundingMode === 'up10') ? Math.max(10, roundUp10(flourTotal * 0.05))
                                          : Math.round(flourTotal * 0.05);
  let flourBowl = flourTotal - flourTZ;

  // Milk for TZ = 5 × flourTZ
  let milkTZ = 5 * flourTZ;
  if (milkTotal < milkTZ) milkTotal = milkTZ; // guarantee enough for TZ
  let milkBowl = milkTotal - milkTZ;

  // Salt ≈ 1% of total dough mass, rounded to 0.5 g
  const salt = roundHalf(0.01 * nChapatis * doughPerChapati);

  // Oil goes in bowl (for display) and counts in calories
  const oilBowl = Math.max(0, Math.round(oilInDough));

  // Nutrition (batch)
  const proteinBatch =
      flourTotal * P_FLOUR_PER_G
    + yogTotal   * P_YOG_PER_G
    + milkTotal  * P_MILK_PER_ML
    + dustGrams  * P_FLOUR_PER_G;

  const kcalBatch =
      flourTotal * K_FLOUR_PER_G
    + yogTotal   * K_YOG_PER_G
    + milkTotal  * K_MILK_PER_ML
    + oilBowl    * K_OIL_PER_G
    + dustGrams  * K_FLOUR_PER_G;

  const proteinPer = +(proteinBatch / nChapatis).toFixed(2);
  const kcalPer    = +(kcalBatch / nChapatis).toFixed(0);

  return {
    // bowl / tz splits
    flourBowl, flourTZ,
    milkBowl,  milkTZ,
    yogTotal,
    oilBowl,
    salt,

    // totals
    flourTotal, milkTotal, target,

    // KPIs
    proteinPer, kcalPer
  };
}

// Read inputs
function read(){
  const n      = Math.max(1, parseInt(q('#n').value || '1', 10));
  const dough  = Math.max(20, parseInt(q('#dough').value || '35', 10));
  const dust   = Math.max(0, parseInt(q('#dust').value  || '0', 10));
  const oil    = Math.max(0, parseInt(q('#oil').value   || '0', 10));
  const mode   = q('#rounding').value;
  return { n, dough, dust, oil, mode };
}

// Render
function render(){
  const { n, dough, dust, oil, mode } = read();
  const p = computePlan({
    nChapatis: n,
    doughPerChapati: dough,
    dustGrams: dust,
    oilInDough: oil,
    roundingMode: mode
  });

  q('#flourBowl').textContent = fmtInt(p.flourBowl) + ' g';
  q('#milkBowl').textContent  = fmtInt(p.milkBowl)  + ' ml';
  q('#yogBowl').textContent   = fmtInt(p.yogTotal)  + ' g';
  q('#salt').textContent      = (p.salt % 1 ? p.salt.toFixed(1) : fmtInt(p.salt)) + ' g';
  q('#oilBowl').textContent   = fmtInt(p.oilBowl) + ' g';

  q('#flourTZ').textContent   = fmtInt(p.flourTZ) + ' g';
  q('#milkTZ').textContent    = fmtInt(p.milkTZ)  + ' ml';

  q('#flourTotal').textContent = fmtInt(p.flourTotal) + ' g';
  q('#milkTotal').textContent  = fmtInt(p.milkTotal)  + ' ml';
  q('#yogTotal').textContent   = fmtInt(p.yogTotal)   + ' g';
  q('#targetDough').textContent= fmtInt(p.target)     + ' g';

  q('#proteinPer').textContent = p.proteinPer + ' g';
  q('#kcalPer').textContent    = p.kcalPer    + ' kcal';
  q('#dustEcho').textContent   = dust;
  q('#oilEcho').textContent    = oil;
}

// URL helpers
function updateURL(){
  const { n, dough, dust, oil, mode } = read();
  const params = new URLSearchParams({ n, dough, dust, oil, mode });
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}
function initFromURL(){
  const p = new URLSearchParams(location.search);
  if (p.has('n'))      q('#n').value = p.get('n');
  if (p.has('dough'))  q('#dough').value = p.get('dough');
  if (p.has('dust'))   q('#dust').value = p.get('dust');
  if (p.has('oil'))    q('#oil').value = p.get('oil');
  if (p.has('mode'))   q('#rounding').value = p.get('mode');
}

// Buttons & inputs
['n','dough','dust','oil','rounding'].forEach(id=>{
  q('#'+id).addEventListener('input', ()=>{ render(); updateURL(); });
});
q('#minus').addEventListener('click', ()=>{ q('#n').value = Math.max(1, parseInt(q('#n').value,10)-1); render(); updateURL(); });
q('#plus').addEventListener('click', ()=>{ q('#n').value = parseInt(q('#n').value,10)+1; render(); updateURL(); });

q('#printBtn').addEventListener('click', ()=> window.print());
q('#copyBtn').addEventListener('click', ()=>{
  const { n } = read();
  const t = [
    `Tangzhong Chapati Plan (x${n})`,
    `BOWL: Flour ${q('#flourBowl').textContent}, Milk ${q('#milkBowl').textContent}, Yoghurt ${q('#yogBowl').textContent}, Salt ${q('#salt').textContent}, Oil ${q('#oilBowl').textContent}`,
    `TZ: Flour ${q('#flourTZ').textContent}, Milk ${q('#milkTZ').textContent}`,
    `TOTALS: Flour ${q('#flourTotal').textContent}, Milk ${q('#milkTotal').textContent}, Yoghurt ${q('#yogTotal').textContent}, Target dough ${q('#targetDough').textContent}`,
    `Protein / chapati: ${q('#proteinPer').textContent} • Calories / chapati: ${q('#kcalPer').textContent}`
  ].join('\n');
  navigator.clipboard?.writeText(t);
});
q('#shareBtn').addEventListener('click', ()=>{ updateURL(); navigator.clipboard?.writeText(location.href); });
q('#resetBtn').addEventListener('click', ()=>{
  q('#n').value = 20;
  q('#dough').value = 35;
  q('#dust').value = 0;
  q('#oil').value = 0;
  q('#rounding').value = 'up10';
  render(); updateURL();
});

// Init
initFromURL();
render();
