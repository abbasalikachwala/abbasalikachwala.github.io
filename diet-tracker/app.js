// ====================================================================
// Daily Macros Tracker — kcal-first, Dashboard UI
// Client-only (GH Pages safe). Data saved in localStorage.
// ====================================================================

// ---------- DOM helpers ----------
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const round = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

// ---------- Time/Date ----------
function todayStr(d = new Date()){
  const tzo = d.getTimezoneOffset() * 60000;
  return new Date(d - tzo).toISOString().slice(0,10);
}
function isoWeek(dStr){
  const d = new Date(dStr + "T12:00:00");
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const dayDiff = (date - firstThursday) / 86400000;
  const week = 1 + Math.round(dayDiff / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

// ---------- Storage ----------
const LS = { settings: 'dm_settings_v3_kcal', diary: 'dm_diary_v3', misc: 'dm_misc_v3' };
const saveJSON = (k, o) => localStorage.setItem(k, JSON.stringify(o));
const loadJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

// ---------- Defaults (kcal-first) ----------
const DEFAULTS = {
  proteinTarget: 130,
  milkDefaultML: 300,
  milkPer100ml: { p: 3.8, c: 5.0, f: 0.2, kcal: 39.5 },     // ~165 kJ
  yoghurtPer100g: { p: 9.0, c: 9.6, f: 2.3, kcal: 93.3 },   // per your brand
  proteinBar: { p: 10.0, c: 14.8, f: 9.9, kcal: 195 },
  proteinScoop: { p: 20.7, c: 0.6, f: 0.5, kcal: 96.6 },    // placeholder; edit in Settings
  banana: {
    edibleFrac: 0.70,
    per100g: { p: 1.09, c: 22.8, f: 0.33, kcal: 88.7 }
  },
  chapatiPerPiece: { p: 3.45, c: 12.0, f: 0.5, kcal: 70 },
  eggs: {
    perWhole: { p: 6.3, c: 0.36, f: 4.8, kcal: 72 },
    perWhite: { p: 3.6, c: 0.24, f: 0.06, kcal: 17 },
    defaultWhole: 1, defaultWhites: 1,
  },
  meatPer100g: { p: 0, c: 0, f: 0, kcal: 0 },   // set from your recipe later
  curryPer100g: { p: 0, c: 0, f: 0, kcal: 0 },  // set from your recipe later
};
let settings = loadJSON(LS.settings, DEFAULTS);
let diary    = loadJSON(LS.diary, {});
let miscByDay= loadJSON(LS.misc, {});

// ---------- Energy helpers ----------
function kcalFromMacros(p,c,f){ return (4*p) + (4*c) + (9*f); }
function energyFromUnit(u){
  const p = u.p || 0, c = u.c || 0, f = u.f || 0;
  let kcal = u.kcal || 0;
  if (!kcal) kcal = kcalFromMacros(p,c,f);
  return { kcal: round(kcal), p, c, f };
}
function scalePer100(per100, grams){
  const e = energyFromUnit(per100);
  const k = grams / 100;
  return { kcal: round(e.kcal*k), p: round((per100.p||0)*k), c: round((per100.c||0)*k), f: round((per100.f||0)*k) };
}
function scalePerPiece(perPiece, count){
  const e = energyFromUnit(perPiece);
  return { kcal: round(e.kcal*count), p: round((perPiece.p||0)*count), c: round((perPiece.c||0)*count), f: round((perPiece.f||0)*count) };
}
const scalePerItem = (x, q) => scalePerPiece(x, q);

// ---------- Day model ----------
const dayPicker = $('#dayPicker');
dayPicker.value = todayStr();

function newDaySeed(){
  return {
    // Breakfast
    breakfast: { bananaPeelOn: 0, yoghurtG: 180, shakeOn: false, shakeScoops: 1, shakeMilkML: 350 },
    // Morning Snack (eggs + milk)
    morning:   { eggsOn: false, eggsWhole: settings.eggs.defaultWhole, eggsWhites: settings.eggs.defaultWhites, milkOn: false },
    // Lunch / Dinner
    lunch:     { meatG: 0, curryG: 0, chapatis: 0, milkOn: false },
    dinner:    { meatG: 0, curryG: 0, chapatis: 0, milkOn: false },
    // Afternoon Snack (protein bar + milk)
    afternoon: { barOn: false, barQty: 1, milkOn: false },
    // Misc
    miscMilkML: 0,
  };
}
function getDay(){
  const date = dayPicker.value || todayStr();
  // migrate older shapes if present
  diary[date] = Object.assign(newDaySeed(), diary[date] || {});
  miscByDay[date] ||= [];
  return diary[date];
}
function save(){ saveJSON(LS.diary, diary); saveJSON(LS.misc, miscByDay); }

// ---------- UI: segmented controls ----------
function setSegActive(btn){
  const wrap = btn.closest('.seg');
  if (!wrap) return;
  wrap.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
}
function syncSegFromSelect(selectId){
  const sel = $('#'+selectId);
  if (!sel) return;
  const val = sel.value;
  $$(`.seg-btn[data-bind="${selectId}"]`).forEach(b => {
    if (b.dataset.val === val) b.classList.add('is-active'); else b.classList.remove('is-active');
  });
}
function syncBfShakeSeg(){
  const val = $('#bfShakeOn').value;
  $('#bfShakeYes').classList.toggle('is-active', val==='yes');
  $('#bfShakeNo').classList.toggle('is-active',  val==='no');
}

// Global segmented handler (header view switch + all data-bind segs + breakfast shake)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;

  // Header view switch
  if (btn.id === 'btnToday' || btn.id === 'btnWeekly'){
    $('.seg-btn#btnToday').classList.remove('is-active');
    $('.seg-btn#btnWeekly').classList.remove('is-active');
    setSegActive(btn);
    if (btn.id === 'btnWeekly'){
      $('#todayView').style.display = 'none';
      $('#weeklyView').style.display = '';
      renderWeek();
    } else {
      $('#weeklyView').style.display = 'none';
      $('#todayView').style.display = '';
    }
    return;
  }

  // Breakfast shake pair
  if (btn.id === 'bfShakeYes' || btn.id === 'bfShakeNo'){
    setSegActive(btn);
    const val = btn.dataset.val;
    $('#bfShakeOn').value = val;
    const d = getDay();
    d.breakfast.shakeOn = (val === 'yes');
    save(); renderAll();
    return;
  }

  // data-bind groups
  const bind = btn.dataset.bind;
  if (bind){
    setSegActive(btn);
    const val = btn.dataset.val;
    const sel = $('#'+bind);
    if (sel) sel.value = val;

    const d = getDay();
    if (bind === 'msEggsOn') d.morning.eggsOn = (val === 'yes');
    if (bind === 'msMilk')   d.morning.milkOn = (val === 'yes');

    if (bind === 'lMilk') d.lunch.milkOn = (val === 'yes');
    if (bind === 'dMilk') d.dinner.milkOn = (val === 'yes');

    if (bind === 'asBarOn') d.afternoon.barOn = (val === 'yes');
    if (bind === 'asMilk')  d.afternoon.milkOn = (val === 'yes');

    save(); renderAll();
  }
});

// ---------- Header buttons (non-duplicated IDs guarded below) ----------
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'btnExportWeek') exportCurrentWeekCSV();
});
$('#btnExportDay')?.addEventListener('click', exportDayJSON);
$('#btnClearDay')?.addEventListener('click', onClearDay);
$('#btnSubmit')?.addEventListener('click', onSubmitDay);
$('#btnSettings')?.addEventListener('click', openSettings);
dayPicker.addEventListener('change', renderAll);

// ---------- Clear day ----------
function onClearDay(){
  if (!confirm('Clear this day?')) return;
  diary[dayPicker.value] = newDaySeed();
  miscByDay[dayPicker.value] = [];
  save(); renderAll();
}

// ---------- Settings (kcal) ----------
const dlg = $('#dlgSettings');
$('#closeSettings')?.addEventListener('click', () => dlg.close());
$('#saveSettings')?.addEventListener('click', saveSettings);
$('#exportPresets')?.addEventListener('click', exportPresets);
$('#importPresets')?.addEventListener('change', importPresets);

function openSettings(){
  $('#setProteinTarget').value = settings.proteinTarget || 0;

  // Milk per 100 ml
  $('#milkP100').value = settings.milkPer100ml.p || 0;
  $('#milkC100').value = settings.milkPer100ml.c || 0;
  $('#milkF100').value = settings.milkPer100ml.f || 0;
  $('#milkKcal100').value = settings.milkPer100ml.kcal || 0;
  $('#setMilkDefault').value = settings.milkDefaultML || 300;

  // Yoghurt per 100 g
  $('#yogP100').value = settings.yoghurtPer100g.p || 0;
  $('#yogC100').value = settings.yoghurtPer100g.c || 0;
  $('#yogF100').value = settings.yoghurtPer100g.f || 0;
  $('#yogKcal100').value = settings.yoghurtPer100g.kcal || 0;

  // Protein bar (per bar)
  $('#barP').value = settings.proteinBar.p || 0;
  $('#barC').value = settings.proteinBar.c || 0;
  $('#barF').value = settings.proteinBar.f || 0;
  $('#barKcal').value = settings.proteinBar.kcal || 0;

  // Scoop (per scoop)
  $('#scoopP').value = settings.proteinScoop.p || 0;
  $('#scoopC').value = settings.proteinScoop.c || 0;
  $('#scoopF').value = settings.proteinScoop.f || 0;
  $('#scoopKcal').value = settings.proteinScoop.kcal || 0;

  // Banana
  $('#bananaFrac').value = settings.banana.edibleFrac || 0.7;
  $('#bananaP100').value = settings.banana.per100g.p || 0;
  $('#bananaC100').value = settings.banana.per100g.c || 0;
  $('#bananaF100').value = settings.banana.per100g.f || 0;
  $('#bananaKcal100').value = settings.banana.per100g.kcal || 0;

  // Chapati
  $('#chapatiP').value = settings.chapatiPerPiece.p || 0;
  $('#chapatiC').value = settings.chapatiPerPiece.c || 0;
  $('#chapatiF').value = settings.chapatiPerPiece.f || 0;
  $('#chapatiKcal').value = settings.chapatiPerPiece.kcal || 0;

  // Meat/Curry per 100 g
  $('#meatP100').value = settings.meatPer100g.p || 0;
  $('#meatC100').value = settings.meatPer100g.c || 0;
  $('#meatF100').value = settings.meatPer100g.f || 0;
  $('#meatKcal100').value = settings.meatPer100g.kcal || 0;

  $('#curryP100').value = settings.curryPer100g.p || 0;
  $('#curryC100').value = settings.curryPer100g.c || 0;
  $('#curryF100').value = settings.curryPer100g.f || 0;
  $('#curryKcal100').value = settings.curryPer100g.kcal || 0;

  dlg.showModal();
}
function saveSettings(){
  const n = (v)=>{ const x=Number(v); return isFinite(x)?x:0; };

  settings.proteinTarget = n($('#setProteinTarget').value);
  settings.milkDefaultML = n($('#setMilkDefault').value);

  settings.milkPer100ml = { p:n($('#milkP100').value), c:n($('#milkC100').value), f:n($('#milkF100').value), kcal:n($('#milkKcal100').value) };
  settings.yoghurtPer100g = { p:n($('#yogP100').value), c:n($('#yogC100').value), f:n($('#yogF100').value), kcal:n($('#yogKcal100').value) };
  settings.proteinBar = { p:n($('#barP').value), c:n($('#barC').value), f:n($('#barF').value), kcal:n($('#barKcal').value) };
  settings.proteinScoop = { p:n($('#scoopP').value), c:n($('#scoopC').value), f:n($('#scoopF').value), kcal:n($('#scoopKcal').value) };
  settings.banana = {
    edibleFrac: n($('#bananaFrac').value)||0.7,
    per100g: { p:n($('#bananaP100').value), c:n($('#bananaC100').value), f:n($('#bananaF100').value), kcal:n($('#bananaKcal100').value) }
  };
  settings.chapatiPerPiece = { p:n($('#chapatiP').value), c:n($('#chapatiC').value), f:n($('#chapatiF').value), kcal:n($('#chapatiKcal').value) };
  settings.meatPer100g = { p:n($('#meatP100').value), c:n($('#meatC100').value), f:n($('#meatF100').value), kcal:n($('#meatKcal100').value) };
  settings.curryPer100g= { p:n($('#curryP100').value), c:n($('#curryC100').value), f:n($('#curryF100').value), kcal:n($('#curryKcal100').value) };

  saveJSON(LS.settings, settings);
  dlg.close();
  renderAll();
}
function exportPresets(){
  const blob = new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'presets_kcal.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importPresets(ev){
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      settings = Object.assign({}, settings, obj);
      saveJSON(LS.settings, settings);
      alert('Presets imported.');
      renderAll();
    } catch(e){ alert('Import failed: ' + e.message); }
    ev.target.value = '';
  };
  reader.readAsText(file);
}

// ---------- Inputs -> model wiring ----------
function n(val){ const x = Number(val); return isFinite(x) ? x : 0; }

// Breakfast
$('#bananaPeelOn')?.addEventListener('input', e => { const d=getDay(); d.breakfast.bananaPeelOn = n(e.target.value); save(); renderAll(); });
$('#bfYoghurtG')?.addEventListener('input', e => { const d=getDay(); d.breakfast.yoghurtG = n(e.target.value); save(); renderAll(); });
$('#bfShakeOn')?.addEventListener('change', e => { const d=getDay(); d.breakfast.shakeOn = (e.target.value==='yes'); save(); renderAll(); });
$('#bfShakeScoops')?.addEventListener('input', e => { const d=getDay(); d.breakfast.shakeScoops = n(e.target.value); save(); renderAll(); });
$('#bfShakeMilkML')?.addEventListener('input', e => { const d=getDay(); d.breakfast.shakeMilkML = n(e.target.value); save(); renderAll(); });

// Morning Snack
$('#msEggsOn')?.addEventListener('change', e => { const d=getDay(); d.morning.eggsOn = (e.target.value==='yes'); save(); renderAll(); });
$('#msEggsWhole')?.addEventListener('input', e => { const d=getDay(); d.morning.eggsWhole = n(e.target.value); save(); renderAll(); });
$('#msEggsWhites')?.addEventListener('input', e => { const d=getDay(); d.morning.eggsWhites = n(e.target.value); save(); renderAll(); });
$('#msMilk')?.addEventListener('change', e => { const d=getDay(); d.morning.milkOn = (e.target.value==='yes'); save(); renderAll(); });

// Lunch/Dinner
$('#lMeatG')?.addEventListener('input', e => { const d=getDay(); d.lunch.meatG = n(e.target.value); save(); renderAll(); });
$('#lCurryG')?.addEventListener('input', e => { const d=getDay(); d.lunch.curryG = n(e.target.value); save(); renderAll(); });
$('#lChapati')?.addEventListener('input', e => { const d=getDay(); d.lunch.chapatis = n(e.target.value); save(); renderAll(); });
$('#lMilk')?.addEventListener('change', e => { const d=getDay(); d.lunch.milkOn = (e.target.value==='yes'); save(); renderAll(); });

$('#dMeatG')?.addEventListener('input', e => { const d=getDay(); d.dinner.meatG = n(e.target.value); save(); renderAll(); });
$('#dCurryG')?.addEventListener('input', e => { const d=getDay(); d.dinner.curryG = n(e.target.value); save(); renderAll(); });
$('#dChapati')?.addEventListener('input', e => { const d=getDay(); d.dinner.chapatis = n(e.target.value); save(); renderAll(); });
$('#dMilk')?.addEventListener('change', e => { const d=getDay(); d.dinner.milkOn = (e.target.value==='yes'); save(); renderAll(); });

// Afternoon Snack
$('#asBarOn')?.addEventListener('change', e => { const d=getDay(); d.afternoon.barOn = (e.target.value==='yes'); save(); renderAll(); });
$('#asBarQty')?.addEventListener('input', e => { const d=getDay(); d.afternoon.barQty = n(e.target.value); save(); renderAll(); });
$('#asMilk')?.addEventListener('change', e => { const d=getDay(); d.afternoon.milkOn = (e.target.value==='yes'); save(); renderAll(); });

// Misc items
$('#addMisc')?.addEventListener('click', () => {
  const name = $('#miscName').value.trim();
  const kcal = n($('#miscKcal').value);
  const p = n($('#miscP').value);
  const c = n($('#miscC').value);
  const f = n($('#miscF').value);
  if (!name) return alert('Name required');
  const date = dayPicker.value;
  const arr = miscByDay[date] || [];
  arr.push({ name, kcal, p, c, f });
  miscByDay[date] = arr; save();
  ['miscName','miscKcal','miscP','miscC','miscF'].forEach(id => $('#'+id).value = '');
  renderAll();
});
$('#clearMisc')?.addEventListener('click', () => { miscByDay[dayPicker.value] = []; save(); renderAll(); });
$('#miscMilkML')?.addEventListener('input', e => { const d=getDay(); d.miscMilkML = n(e.target.value); save(); renderAll(); });

// ---------- Tables ----------
function fillMealTable(tbodyId, kcalId, pId, cId, fId, rows){
  const tbody = $('#'+tbodyId);
  tbody.innerHTML = '';
  const tot = { kcal:0, p:0, c:0, f:0 };
  rows.forEach(([label, v]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td class="r">${v.kcal}</td><td class="r">${v.p}</td><td class="r">${v.c}</td><td class="r">${v.f}</td>`;
    tbody.appendChild(tr);
    tot.kcal += v.kcal; tot.p += v.p; tot.c += v.c; tot.f += v.f;
  });
  $('#'+kcalId).textContent = round(tot.kcal);
  $('#'+pId).textContent = round(tot.p);
  $('#'+cId).textContent = round(tot.c);
  $('#'+fId).textContent = round(tot.f);
}

function renderTables(){
  const d = getDay();

  // Breakfast
  const rowsB = [];
  if ((d.breakfast.bananaPeelOn||0) > 0){
    const edible = round(d.breakfast.bananaPeelOn * (settings.banana.edibleFrac || 0.7));
    const bn = scalePer100(settings.banana.per100g, edible);
    rowsB.push([`Banana (edible ${edible} g)`, bn]);
  }
  if ((d.breakfast.yoghurtG||0) > 0){
    rowsB.push([`Greek yoghurt (${d.breakfast.yoghurtG} g)`, scalePer100(settings.yoghurtPer100g, d.breakfast.yoghurtG)]);
  }
  if (d.breakfast.shakeOn){
    const scoops = d.breakfast.shakeScoops || 1;
    rowsB.push([`Protein powder (${scoops} scoop)`, scalePerPiece(settings.proteinScoop, scoops)]);
    if ((d.breakfast.shakeMilkML||0) > 0){
      rowsB.push([`Milk for shake (${d.breakfast.shakeMilkML} ml)`, scalePer100(settings.milkPer100ml, d.breakfast.shakeMilkML)]);
    }
  }
  fillMealTable('tblBreakfast','kcalBreakfast','pBreakfast','cBreakfast','fBreakfast', rowsB);

  // Morning Snack (eggs + milk)
  const rowsMS = [];
  if (d.morning.eggsOn){
    if ((d.morning.eggsWhole||0) > 0) rowsMS.push([`Eggs (whole ×${d.morning.eggsWhole})`, scalePerPiece(settings.eggs.perWhole, d.morning.eggsWhole||0)]);
    if ((d.morning.eggsWhites||0) > 0) rowsMS.push([`Egg whites ×${d.morning.eggsWhites}`, scalePerPiece(settings.eggs.perWhite, d.morning.eggsWhites||0)]);
  }
  if (d.morning.milkOn){
    rowsMS.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  }
  fillMealTable('tblMorning','kcalMorning','pMorning','cMorning','fMorning', rowsMS);

  // Lunch
  const rowsL = [];
  if ((d.lunch.meatG||0) > 0)  rowsL.push([`Meat (${d.lunch.meatG} g)`, scalePer100(settings.meatPer100g, d.lunch.meatG)]);
  if ((d.lunch.curryG||0) > 0) rowsL.push([`Curry (${d.lunch.curryG} g)`, scalePer100(settings.curryPer100g, d.lunch.curryG)]);
  if ((d.lunch.chapatis||0) > 0) rowsL.push([`Chapati ×${d.lunch.chapatis}`, scalePerPiece(settings.chapatiPerPiece, d.lunch.chapatis)]);
  if (d.lunch.milkOn) rowsL.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  fillMealTable('tblLunch','kcalLunch','pLunch','cLunch','fLunch', rowsL);

  // Afternoon (protein bar + milk)
  const rowsAS = [];
  if (d.afternoon.barOn && (d.afternoon.barQty||0) > 0){
    rowsAS.push([`Protein bar ×${d.afternoon.barQty}`, scalePerItem(settings.proteinBar, d.afternoon.barQty)]);
  }
  if (d.afternoon.milkOn){
    rowsAS.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  }
  fillMealTable('tblAfternoon','kcalAfternoon','pAfternoon','cAfternoon','fAfternoon', rowsAS);

  // Dinner
  const rowsD = [];
  if ((d.dinner.meatG||0) > 0)  rowsD.push([`Meat (${d.dinner.meatG} g)`, scalePer100(settings.meatPer100g, d.dinner.meatG)]);
  if ((d.dinner.curryG||0) > 0) rowsD.push([`Curry (${d.dinner.curryG} g)`, scalePer100(settings.curryPer100g, d.dinner.curryG)]);
  if ((d.dinner.chapatis||0) > 0) rowsD.push([`Chapati ×${d.dinner.chapatis}`, scalePerPiece(settings.chapatiPerPiece, d.dinner.chapatis)]);
  if (d.dinner.milkOn) rowsD.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  fillMealTable('tblDinner','kcalDinner','pDinner','cDinner','fDinner', rowsD);

  // Misc (separate)
  const rowsM = [];
  const miscArr = miscByDay[dayPicker.value] || [];
  miscArr.forEach(m => {
    const kcal = round(m.kcal || kcalFromMacros(m.p||0,m.c||0,m.f||0));
    rowsM.push([m.name, { kcal, p: m.p||0, c: m.c||0, f: m.f||0 }]);
  });
  if ((d.miscMilkML||0) > 0){
    rowsM.push([`Extra milk (${d.miscMilkML} ml)`, scalePer100(settings.milkPer100ml, d.miscMilkML)]);
  }
  fillMealTable('tblMisc','kcalMisc','pMisc','cMisc','fMisc', rowsM);
}

// ---------- Day totals (include ALL sections, incl. Misc) ----------
function renderTotals(){
  const ids = {
    Breakfast: { kcal:'kcalBreakfast', p:'pBreakfast', c:'cBreakfast', f:'fBreakfast' },
    Morning:   { kcal:'kcalMorning',   p:'pMorning',   c:'cMorning',   f:'fMorning'   },
    Lunch:     { kcal:'kcalLunch',     p:'pLunch',     c:'cLunch',     f:'fLunch'     },
    Afternoon: { kcal:'kcalAfternoon', p:'pAfternoon', c:'cAfternoon', f:'fAfternoon' },
    Dinner:    { kcal:'kcalDinner',    p:'pDinner',    c:'cDinner',    f:'fDinner'    },
    Misc:      { kcal:'kcalMisc',      p:'pMisc',      c:'cMisc',      f:'fMisc'      },
  };
  const tot = { kcal:0, p:0, c:0, f:0 };
  Object.values(ids).forEach(s => {
    tot.kcal += Number($('#'+s.kcal).textContent)||0;
    tot.p    += Number($('#'+s.p).textContent)||0;
    tot.c    += Number($('#'+s.c).textContent)||0;
    tot.f    += Number($('#'+s.f).textContent)||0;
  });
  $('#dayKcal').textContent = round(tot.kcal);
  $('#dayP').textContent = round(tot.p);
  $('#dayC').textContent = round(tot.c);
  $('#dayF').textContent = round(tot.f);

  const pt = settings.proteinTarget || 0;
  $('#proteinProgress').value = pt ? Math.min(100, (tot.p/pt)*100) : 0;
  $('#proteinTargetText').textContent = pt ? `Target ${pt} g` : '';
}

// ---------- Daily groups (table) ----------
function collectRowsFromTable(tbodyId){
  return $$('#'+tbodyId+' tr').map(tr => {
    const t = tr.querySelectorAll('td');
    if (t.length !== 5) return null;
    return {
      name: t[0].textContent,
      kcal: Number(t[1].textContent)||0,
      p: Number(t[2].textContent)||0,
      c: Number(t[3].textContent)||0,
      f: Number(t[4].textContent)||0
    };
  }).filter(Boolean);
}
function renderGroups(){
  const groups = {
    Protein: { kcal:0,p:0,c:0,f:0 },
    Dairy:   { kcal:0,p:0,c:0,f:0 },
    Grains:  { kcal:0,p:0,c:0,f:0 },
    Curries: { kcal:0,p:0,c:0,f:0 },
    Other:   { kcal:0,p:0,c:0,f:0 },
  };
  const all = [
    ...collectRowsFromTable('tblBreakfast'),
    ...collectRowsFromTable('tblMorning'),
    ...collectRowsFromTable('tblLunch'),
    ...collectRowsFromTable('tblAfternoon'),
    ...collectRowsFromTable('tblDinner'),
    ...collectRowsFromTable('tblMisc'),
  ];
  function classify(nm){
    const n = nm.toLowerCase();
    if (n.includes('meat (') || n.includes('protein powder') || n.includes('protein bar') || n.startsWith('eggs') || n.startsWith('egg whites')) return 'Protein';
    if (n.includes('milk') || n.includes('yoghurt')) return 'Dairy';
    if (n.includes('chapati')) return 'Grains';
    if (n.startsWith('curry')) return 'Curries';
    return 'Other';
  }
  all.forEach(r => { const g = classify(r.name); const b = groups[g]; b.kcal+=r.kcal; b.p+=r.p; b.c+=r.c; b.f+=r.f; });

  const tbody = $('#tblGroups'); tbody.innerHTML = '';
  const sum = { kcal:0,p:0,c:0,f:0 };
  Object.entries(groups).forEach(([k,v]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${k}</td><td class="r">${round(v.kcal)}</td><td class="r">${round(v.p)} g</td><td class="r">${round(v.c)} g</td><td class="r">${round(v.f)} g</td>`;
    tbody.appendChild(tr);
    sum.kcal+=v.kcal; sum.p+=v.p; sum.c+=v.c; sum.f+=v.f;
  });
  $('#grpKcal').textContent = round(sum.kcal);
  $('#grpP').textContent    = round(sum.p);
  $('#grpC').textContent    = round(sum.c);
  $('#grpF').textContent    = round(sum.f);
}

// ---------- Week view & export ----------
function calcTotalsForDate(date){
  const orig = dayPicker.value;
  dayPicker.value = date;
  renderTables(); renderTotals();
  const totals = {
    kcal: Number($('#dayKcal').textContent)||0,
    p: Number($('#dayP').textContent)||0,
    c: Number($('#dayC').textContent)||0,
    f: Number($('#dayF').textContent)||0,
  };
  dayPicker.value = orig;
  renderTables(); renderTotals();
  return totals;
}
function gatherWeekData(weekKey){
  const rows = [];
  Object.keys(diary).forEach(date => { if (isoWeek(date) === weekKey){ rows.push({ date, ...calcTotalsForDate(date) }); } });
  rows.sort((a,b) => a.date.localeCompare(b.date));
  const sum = rows.reduce((acc,r) => { acc.kcal+=r.kcal; acc.p+=r.p; acc.c+=r.c; acc.f+=r.f; return acc; }, {kcal:0,p:0,c:0,f:0});
  return { rows, sum };
}
function renderWeek(){
  const wk = isoWeek(dayPicker.value);
  $('#weeklyLabel').textContent = `Week ${wk}`;
  const { rows, sum } = gatherWeekData(wk);
  const tbody = $('#tblWeek'); tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.date}</td><td class="r">${round(r.kcal)}</td><td class="r">${round(r.p)}</td><td class="r">${round(r.c)}</td><td class="r">${round(r.f)}</td>`;
    tbody.appendChild(tr);
  });
  $('#wkKcal').textContent = round(sum.kcal);
  $('#wkP').textContent = round(sum.p);
  $('#wkC').textContent = round(sum.c);
  $('#wkF').textContent = round(sum.f);
}
function exportCurrentWeekCSV(){
  const wk = isoWeek(dayPicker.value);
  const { rows, sum } = gatherWeekData(wk);
  let csv = 'date,kcal,protein_g,carbs_g,fat_g\n';
  rows.forEach(r => { csv += `${r.date},${round(r.kcal)},${round(r.p)},${round(r.c)},${round(r.f)}\n`; });
  csv += `WEEK_TOTAL,${round(sum.kcal)},${round(sum.p)},${round(sum.c)},${round(sum.f)}\n`;
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `week_${wk}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportDayJSON(){
  const date = dayPicker.value || todayStr();
  const data = { date, day: getDay(), misc: miscByDay[date] || [] };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `day_${date}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Submit ----------
function onSubmitDay(){
  save();
  alert('Day saved. Weekly totals updated.');
  // Jump to Week view for a quick check
  $('#btnWeekly').click();
}

// ---------- Render all ----------
function renderAll(){
  const d = getDay();

  // Breakfast
  $('#bananaPeelOn').value = d.breakfast.bananaPeelOn;
  $('#bfYoghurtG').value = d.breakfast.yoghurtG;
  $('#bfShakeOn').value = d.breakfast.shakeOn ? 'yes' : 'no';
  $('#bfShakeScoops').value = d.breakfast.shakeScoops;
  $('#bfShakeMilkML').value = d.breakfast.shakeMilkML;
  syncBfShakeSeg();

  // Morning
  $('#msEggsOn').value = d.morning.eggsOn ? 'yes' : 'no';
  $('#msEggsWhole').value = d.morning.eggsWhole;
  $('#msEggsWhites').value = d.morning.eggsWhites;
  $('#msMilk').value = d.morning.milkOn ? 'yes' : 'no';
  ['msEggsOn','msMilk'].forEach(syncSegFromSelect);

  // Lunch
  $('#lMeatG').value = d.lunch.meatG;
  $('#lCurryG').value = d.lunch.curryG;
  $('#lChapati').value = d.lunch.chapatis;
  $('#lMilk').value = d.lunch.milkOn ? 'yes' : 'no';
  syncSegFromSelect('lMilk');

  // Afternoon
  $('#asBarOn').value = d.afternoon.barOn ? 'yes' : 'no';
  $('#asBarQty').value = d.afternoon.barQty;
  $('#asMilk').value = d.afternoon.milkOn ? 'yes' : 'no';
  ['asBarOn','asMilk'].forEach(syncSegFromSelect);

  // Dinner
  $('#dMeatG').value = d.dinner.meatG;
  $('#dCurryG').value = d.dinner.curryG;
  $('#dChapati').value = d.dinner.chapatis;
  $('#dMilk').value = d.dinner.milkOn ? 'yes' : 'no';
  syncSegFromSelect('dMilk');

  // Misc
  $('#miscMilkML').value = d.miscMilkML;

  // Tables + totals + groups
  renderTables();
  renderTotals();
  renderGroups();
}

// ---------- Boot ----------
$('#btnToday')?.classList.add('is-active');
$('#weeklyView').style.display = 'none';
renderAll();
