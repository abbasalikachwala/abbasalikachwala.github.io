// ====================================================================
// Daily Macros Tracker — kcal-first, Apple-style UI
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
const LS = { settings: 'dm_settings_v2_kcal', diary: 'dm_diary_v2', misc: 'dm_misc_v2' };
const saveJSON = (k, o) => localStorage.setItem(k, JSON.stringify(o));
const loadJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

// ---------- Defaults (kcal-first) ----------
const DEFAULTS = {
  proteinTarget: 130,
  milkDefaultML: 300,
  milkPer100ml: { p: 3.8, c: 5.0, f: 0.2, kcal: 39.5 },     // ~165 kJ
  yoghurtPer100g: { p: 9.0, c: 9.6, f: 2.3, kcal: 93.3 },   // ~390 kJ (brand you gave)
  proteinBar: { p: 10.0, c: 14.8, f: 9.9, kcal: 195 },      // label energy wins
  proteinScoop: { p: 20.7, c: 0.6, f: 0.5, kcal: 96.6 },    // placeholder; edit in Settings
  banana: {
    edibleFrac: 0.70,
    per100g: { p: 1.09, c: 22.8, f: 0.33, kcal: 88.7 }      // typical ripe banana
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

// ---------- Energy helpers (kcal only for display) ----------
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
function getDay(){
  const date = dayPicker.value || todayStr();
  diary[date] ||= {
    breakfast: { bananaPeelOn: 0, yoghurtG: 180, shakeOn: false, shakeScoops: 1, shakeMilkML: 350 },
    lunch:     { meatG: 0, curryG: 0, chapatis: 0, milkOn: false },
    dinner:    { meatG: 0, curryG: 0, chapatis: 0, milkOn: false },
    snacks:    { eggsOn: false, eggsWhole: settings.eggs.defaultWhole, eggsWhites: settings.eggs.defaultWhites, barOn: false, barQty: 1, milkOn: false, milkExtraML: 0 },
  };
  miscByDay[date] ||= [];
  return diary[date];
}
function save(){ saveJSON(LS.diary, diary); saveJSON(LS.misc, miscByDay); }

// ---------- UI State sync (segmented controls) ----------
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

// Global segmented handler (data-bind groups + breakfast shake + top Today/Week)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;

  // Header Today/Week
  if (btn.id === 'btnToday' || btn.id === 'btnWeekly'){
    setSegActive(btn);
    if (btn.id === 'btnWeekly'){ $('#weeklyPanel').style.display='block'; renderWeek(); }
    if (btn.id === 'btnToday'){ $('#weeklyPanel').style.display='none'; }
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

  // data-bind groups (e.g., lMilk/dMilk/sEggsOn/sMilk/sBarOn)
  const bind = btn.dataset.bind;
  if (bind){
    setSegActive(btn);
    const val = btn.dataset.val;
    const sel = $('#'+bind);
    if (sel) sel.value = val;

    // Update model according to bind target
    const d = getDay();
    if (bind === 'lMilk') d.lunch.milkOn = (val === 'yes');
    if (bind === 'dMilk') d.dinner.milkOn = (val === 'yes');
    if (bind === 'sEggsOn') d.snacks.eggsOn = (val === 'yes');
    if (bind === 'sMilk') d.snacks.milkOn = (val === 'yes');
    if (bind === 'sBarOn') d.snacks.barOn = (val === 'yes');

    save(); renderAll();
  }
});

// ---------- Top nav / basic buttons ----------
$('#btnToday').classList.add('is-active');
$('#btnToday').addEventListener('click', () => { $('#weeklyPanel').style.display='none'; });
$('#btnWeekly').addEventListener('click', () => { $('#weeklyPanel').style.display='block'; renderWeek(); });
$('#btnExportWeek').addEventListener('click', exportCurrentWeekCSV);
$('#btnExportDay').addEventListener('click', exportDayJSON);
$('#btnClearDay').addEventListener('click', () => {
  if (confirm('Clear this day?')) {
    diary[dayPicker.value] = { breakfast:{ bananaPeelOn:0, yoghurtG:180, shakeOn:false, shakeScoops:1, shakeMilkML:350 },
                               lunch:{ meatG:0, curryG:0, chapatis:0, milkOn:false },
                               dinner:{ meatG:0, curryG:0, chapatis:0, milkOn:false },
                               snacks:{ eggsOn:false, eggsWhole:settings.eggs.defaultWhole, eggsWhites:settings.eggs.defaultWhites, barOn:false, barQty:1, milkOn:false, milkExtraML:0 } };
    miscByDay[dayPicker.value] = [];
    save(); renderAll();
  }
});
$('#btnSubmit').addEventListener('click', onSubmitDay);
$('#btnSettings').addEventListener('click', openSettings);
dayPicker.addEventListener('change', renderAll);

// ---------- Preset defaults on first load ----------
function applyPresetDefaults(){
  $('#yoghurtGrams').value = 180;
  $('#proteinBarQty').value = 1;
  $('#eggsWhole').value = settings.eggs.defaultWhole;
  $('#eggsWhites').value = settings.eggs.defaultWhites;
  $('#shakeScoops').value = 1;
  $('#shakeMilkML').value = 350;
  $('#bfShakeScoops').value = 1;
  $('#bfShakeMilkML').value = 350;
  $('#bfYoghurtG').value = 180;
  $('#bananaPeelOn').value = 0;
  $('#sEggsWhole').value = settings.eggs.defaultWhole;
  $('#sEggsWhites').value = settings.eggs.defaultWhites;
  $('#sBarQty').value = 1;
}
applyPresetDefaults();

// ---------- Inputs -> model wiring ----------
function n(val){ const x = Number(val); return isFinite(x) ? x : 0; }

// Quick toggles mirror real fields
$('#togYoghurt').addEventListener('change', e => { const d=getDay(); d.breakfast.yoghurtG = e.target.checked ? n($('#yoghurtGrams').value||180) : 0; save(); renderAll(); });
$('#yoghurtGrams').addEventListener('input', e => { const d=getDay(); if ($('#togYoghurt').checked){ d.breakfast.yoghurtG = n(e.target.value); save(); renderAll(); } });

$('#togProteinBar').addEventListener('change', e => { const d=getDay(); d.snacks.barOn = e.target.checked; save(); renderAll(); });
$('#proteinBarQty').addEventListener('input', e => { const d=getDay(); d.snacks.barQty = n(e.target.value); save(); renderAll(); });

$('#togEggs').addEventListener('change', e => { const d=getDay(); d.snacks.eggsOn = e.target.checked; save(); renderAll(); });
$('#eggsWhole').addEventListener('input', e => { const d=getDay(); d.snacks.eggsWhole = n(e.target.value); save(); renderAll(); });
$('#eggsWhites').addEventListener('input', e => { const d=getDay(); d.snacks.eggsWhites = n(e.target.value); save(); renderAll(); });

$('#togProteinShake').addEventListener('change', e => { const d=getDay(); d.breakfast.shakeOn = e.target.checked; save(); renderAll(); });
$('#shakeScoops').addEventListener('input', e => { const d=getDay(); d.breakfast.shakeScoops = n(e.target.value); save(); renderAll(); });
$('#shakeMilkML').addEventListener('input', e => { const d=getDay(); d.breakfast.shakeMilkML = n(e.target.value); save(); renderAll(); });

// Breakfast section
$('#bananaPeelOn').addEventListener('input', e => { const d=getDay(); d.breakfast.bananaPeelOn = n(e.target.value); save(); renderAll(); });
$('#bfYoghurtG').addEventListener('input', e => { const d=getDay(); d.breakfast.yoghurtG = n(e.target.value); save(); renderAll(); });
$('#bfShakeOn').addEventListener('change', e => { const d=getDay(); d.breakfast.shakeOn = (e.target.value==='yes'); save(); renderAll(); });
$('#bfShakeScoops').addEventListener('input', e => { const d=getDay(); d.breakfast.shakeScoops = n(e.target.value); save(); renderAll(); });
$('#bfShakeMilkML').addEventListener('input', e => { const d=getDay(); d.breakfast.shakeMilkML = n(e.target.value); save(); renderAll(); });

// Lunch/Dinner
$('#lMeatG').addEventListener('input', e => { const d=getDay(); d.lunch.meatG = n(e.target.value); save(); renderAll(); });
$('#lCurryG').addEventListener('input', e => { const d=getDay(); d.lunch.curryG = n(e.target.value); save(); renderAll(); });
$('#lChapati').addEventListener('input', e => { const d=getDay(); d.lunch.chapatis = n(e.target.value); save(); renderAll(); });
$('#lMilk').addEventListener('change', e => { const d=getDay(); d.lunch.milkOn = (e.target.value==='yes'); save(); renderAll(); });

$('#dMeatG').addEventListener('input', e => { const d=getDay(); d.dinner.meatG = n(e.target.value); save(); renderAll(); });
$('#dCurryG').addEventListener('input', e => { const d=getDay(); d.dinner.curryG = n(e.target.value); save(); renderAll(); });
$('#dChapati').addEventListener('input', e => { const d=getDay(); d.dinner.chapatis = n(e.target.value); save(); renderAll(); });
$('#dMilk').addEventListener('change', e => { const d=getDay(); d.dinner.milkOn = (e.target.value==='yes'); save(); renderAll(); });

// Snacks
$('#sEggsOn').addEventListener('change', e => { const d=getDay(); d.snacks.eggsOn = (e.target.value==='yes'); save(); renderAll(); });
$('#sEggsWhole').addEventListener('input', e => { const d=getDay(); d.snacks.eggsWhole = n(e.target.value); save(); renderAll(); });
$('#sEggsWhites').addEventListener('input', e => { const d=getDay(); d.snacks.eggsWhites = n(e.target.value); save(); renderAll(); });
$('#sMilk').addEventListener('change', e => { const d=getDay(); d.snacks.milkOn = (e.target.value==='yes'); save(); renderAll(); });
$('#sBarOn').addEventListener('change', e => { const d=getDay(); d.snacks.barOn = (e.target.value==='yes'); save(); renderAll(); });
$('#sBarQty').addEventListener('input', e => { const d=getDay(); d.snacks.barQty = n(e.target.value); save(); renderAll(); });
$('#sMilkExtra').addEventListener('input', e => { const d=getDay(); d.snacks.milkExtraML = n(e.target.value); save(); renderAll(); });

// Misc items
$('#addMisc').addEventListener('click', () => {
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
$('#clearMisc').addEventListener('click', () => { miscByDay[dayPicker.value] = []; save(); renderAll(); });

// ---------- Settings (kcal) ----------
const dlg = $('#dlgSettings');
$('#closeSettings').addEventListener('click', () => dlg.close());
$('#saveSettings').addEventListener('click', saveSettings);
$('#exportPresets').addEventListener('click', exportPresets);
$('#importPresets').addEventListener('change', importPresets);

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

// ---------- Tables ----------
function renderTables(){
  const d = getDay();

  // Breakfast
  const rowsB = [];
  if (d.breakfast.bananaPeelOn > 0){
    const edible = round(d.breakfast.bananaPeelOn * (settings.banana.edibleFrac || 0.7));
    const bn = scalePer100(settings.banana.per100g, edible);
    rowsB.push([`Banana (edible ${edible} g)`, bn]);
  }
  if (d.breakfast.yoghurtG > 0){
    rowsB.push([`Greek yoghurt (${d.breakfast.yoghurtG} g)`, scalePer100(settings.yoghurtPer100g, d.breakfast.yoghurtG)]);
  }
  if (d.breakfast.shakeOn){
    const scoops = d.breakfast.shakeScoops || 1;
    rowsB.push([`Protein powder (${scoops} scoop)`, scalePerPiece(settings.proteinScoop, scoops)]);
    if (d.breakfast.shakeMilkML > 0){
      rowsB.push([`Milk for shake (${d.breakfast.shakeMilkML} ml)`, scalePer100(settings.milkPer100ml, d.breakfast.shakeMilkML)]);
    }
  }
  fillMealTable('tblBreakfast','kcalBreakfast','pBreakfast','cBreakfast','fBreakfast', rowsB);

  // Lunch
  const rowsL = [];
  if (d.lunch.meatG > 0)  rowsL.push([`Meat (${d.lunch.meatG} g)`, scalePer100(settings.meatPer100g, d.lunch.meatG)]);
  if (d.lunch.curryG > 0) rowsL.push([`Curry (${d.lunch.curryG} g)`, scalePer100(settings.curryPer100g, d.lunch.curryG)]);
  if (d.lunch.chapatis > 0) rowsL.push([`Chapati ×${d.lunch.chapatis}`, scalePerPiece(settings.chapatiPerPiece, d.lunch.chapatis)]);
  if (d.lunch.milkOn) rowsL.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  fillMealTable('tblLunch','kcalLunch','pLunch','cLunch','fLunch', rowsL);

  // Dinner
  const rowsD = [];
  if (d.dinner.meatG > 0)  rowsD.push([`Meat (${d.dinner.meatG} g)`, scalePer100(settings.meatPer100g, d.dinner.meatG)]);
  if (d.dinner.curryG > 0) rowsD.push([`Curry (${d.dinner.curryG} g)`, scalePer100(settings.curryPer100g, d.dinner.curryG)]);
  if (d.dinner.chapatis > 0) rowsD.push([`Chapati ×${d.dinner.chapatis}`, scalePerPiece(settings.chapatiPerPiece, d.dinner.chapatis)]);
  if (d.dinner.milkOn) rowsD.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  fillMealTable('tblDinner','kcalDinner','pDinner','cDinner','fDinner', rowsD);

  // Snacks
  const rowsS = [];
  if (d.snacks.eggsOn){
    if ((d.snacks.eggsWhole||0) > 0) rowsS.push([`Eggs (whole ×${d.snacks.eggsWhole})`, scalePerPiece(settings.eggs.perWhole, d.snacks.eggsWhole||0)]);
    if ((d.snacks.eggsWhites||0) > 0) rowsS.push([`Egg whites ×${d.snacks.eggsWhites}`, scalePerPiece(settings.eggs.perWhite, d.snacks.eggsWhites||0)]);
  }
  if (d.snacks.barOn && (d.snacks.barQty||0) > 0){
    rowsS.push([`Protein bar ×${d.snacks.barQty}`, scalePerItem(settings.proteinBar, d.snacks.barQty)]);
  }
  if (d.snacks.milkOn){
    rowsS.push([`Milk (${settings.milkDefaultML} ml)`, scalePer100(settings.milkPer100ml, settings.milkDefaultML)]);
  }
  if ((d.snacks.milkExtraML||0) > 0){
    rowsS.push([`Extra milk (${d.snacks.milkExtraML} ml)`, scalePer100(settings.milkPer100ml, d.snacks.milkExtraML)]);
  }
  (miscByDay[dayPicker.value] || []).forEach(m => {
    const kcal = round(m.kcal || kcalFromMacros(m.p||0,m.c||0,m.f||0));
    rowsS.push([m.name, { kcal, p: m.p||0, c: m.c||0, f: m.f||0 }]);
  });
  fillMealTable('tblSnacks','kcalSnacks','pSnacks','cSnacks','fSnacks', rowsS);
}
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

// ---------- Day totals (kcal display) ----------
function renderTotals(){
  const segs = ['Breakfast','Lunch','Dinner','Snacks'];
  const ids = {
    Breakfast: { kcal:'kcalBreakfast', p:'pBreakfast', c:'cBreakfast', f:'fBreakfast' },
    Lunch: { kcal:'kcalLunch', p:'pLunch', c:'cLunch', f:'fLunch' },
    Dinner: { kcal:'kcalDinner', p:'pDinner', c:'cDinner', f:'fDinner' },
    Snacks: { kcal:'kcalSnacks', p:'pSnacks', c:'cSnacks', f:'fSnacks' },
  };
  const tot = { kcal:0, p:0, c:0, f:0 };
  segs.forEach(s => {
    tot.kcal += Number($('#'+ids[s].kcal).textContent)||0;
    tot.p    += Number($('#'+ids[s].p).textContent)||0;
    tot.c    += Number($('#'+ids[s].c).textContent)||0;
    tot.f    += Number($('#'+ids[s].f).textContent)||0;
  });
  $('#dayKcal').textContent = round(tot.kcal);
  $('#dayP').textContent = round(tot.p);
  $('#dayC').textContent = round(tot.c);
  $('#dayF').textContent = round(tot.f);

  const pt = settings.proteinTarget || 0;
  $('#proteinProgress').value = pt ? Math.min(100, (tot.p/pt)*100) : 0;
  $('#proteinTargetText').textContent = pt ? `Target ${pt} g` : '';
}

// ---------- Groups ----------
function renderGroups(){
  const groups = {
    Protein: { kcal:0,p:0,c:0,f:0, items:[] },
    Dairy:   { kcal:0,p:0,c:0,f:0, items:[] },
    Grains:  { kcal:0,p:0,c:0,f:0, items:[] },
    Curries: { kcal:0,p:0,c:0,f:0, items:[] },
    Snacks:  { kcal:0,p:0,c:0,f:0, items:[] },
  };
  function collectRows(tbodyId){
    return $$('#'+tbodyId+' tr').map(tr => {
      const t = tr.querySelectorAll('td');
      if (t.length !== 5) return null;
      return { name: t[0].textContent, kcal: Number(t[1].textContent)||0, p: Number(t[2].textContent)||0, c: Number(t[3].textContent)||0, f: Number(t[4].textContent)||0 };
    }).filter(Boolean);
  }
  const all = [ ...collectRows('tblBreakfast'), ...collectRows('tblLunch'), ...collectRows('tblDinner'), ...collectRows('tblSnacks') ];
  function classify(name){
    const n = name.toLowerCase();
    if (n.includes('meat (') || n.includes('protein powder') || n.includes('protein bar') || n.startsWith('eggs') || n.startsWith('egg whites')) return 'Protein';
    if (n.includes('milk') || n.includes('yoghurt')) return 'Dairy';
    if (n.includes('chapati')) return 'Grains';
    if (n.startsWith('curry')) return 'Curries';
    return 'Snacks';
  }
  all.forEach(r => { const g = classify(r.name); const b = groups[g]; b.kcal+=r.kcal; b.p+=r.p; b.c+=r.c; b.f+=r.f; b.items.push(r.name); });

  const host = $('#groupTotals'); host.innerHTML = '';
  Object.entries(groups).forEach(([k,v]) => {
    const div = document.createElement('div');
    div.className = 'subcard';
    div.innerHTML = `<h3>${k}</h3>
      <div class="grid-4">
        <div><span class="muted">kcal</span><div><strong>${round(v.kcal)}</strong></div></div>
        <div><span class="muted">Protein</span><div><strong>${round(v.p)} g</strong></div></div>
        <div><span class="muted">Carbs</span><div><strong>${round(v.c)} g</strong></div></div>
        <div><span class="muted">Fat</span><div><strong>${round(v.f)} g</strong></div></div>
      </div>
      <div class="muted mt8">${v.items.join(' • ')}</div>`;
    host.appendChild(div);
  });
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
  renderWeek();
  // Switch header segmented to Week view for quick check
  $('#btnWeekly').click();
}

// ---------- Render all ----------
function renderAll(){
  const d = getDay();

  // Quick toggles <-> day
  $('#togYoghurt').checked = (d.breakfast.yoghurtG > 0);
  $('#yoghurtGrams').value = d.breakfast.yoghurtG;
  $('#togProteinBar').checked = d.snacks.barOn;
  $('#proteinBarQty').value = d.snacks.barQty;
  $('#togEggs').checked = d.snacks.eggsOn;
  $('#eggsWhole').value = d.snacks.eggsWhole;
  $('#eggsWhites').value = d.snacks.eggsWhites;
  $('#togProteinShake').checked = d.breakfast.shakeOn;
  $('#shakeScoops').value = d.breakfast.shakeScoops;
  $('#shakeMilkML').value = d.breakfast.shakeMilkML;

  // Breakfast specific
  $('#bananaPeelOn').value = d.breakfast.bananaPeelOn;
  $('#bfYoghurtG').value = d.breakfast.yoghurtG;
  $('#bfShakeOn').value = d.breakfast.shakeOn ? 'yes' : 'no';
  $('#bfShakeScoops').value = d.breakfast.shakeScoops;
  $('#bfShakeMilkML').value = d.breakfast.shakeMilkML;
  syncBfShakeSeg();

  // Lunch/Dinner selects to segs
  $('#lMeatG').value = d.lunch.meatG;
  $('#lCurryG').value = d.lunch.curryG;
  $('#lChapati').value = d.lunch.chapatis;
  $('#lMilk').value = d.lunch.milkOn ? 'yes' : 'no';
  syncSegFromSelect('lMilk');

  $('#dMeatG').value = d.dinner.meatG;
  $('#dCurryG').value = d.dinner.curryG;
  $('#dChapati').value = d.dinner.chapatis;
  $('#dMilk').value = d.dinner.milkOn ? 'yes' : 'no';
  syncSegFromSelect('dMilk');

  // Snacks selects to segs
  $('#sEggsOn').value = d.snacks.eggsOn ? 'yes' : 'no';
  $('#sEggsWhole').value = d.snacks.eggsWhole;
  $('#sEggsWhites').value = d.snacks.eggsWhites;
  $('#sMilk').value = d.snacks.milkOn ? 'yes' : 'no';
  $('#sBarOn').value = d.snacks.barOn ? 'yes' : 'no';
  $('#sBarQty').value = d.snacks.barQty;
  $('#sMilkExtra').value = d.snacks.milkExtraML;
  ['sEggsOn','sMilk','sBarOn'].forEach(syncSegFromSelect);

  renderTables();
  renderTotals();
  renderGroups();
  // Keep whatever panel state user is on (do not force-close weekly)
}

// ---------- Boot ----------
renderAll();
