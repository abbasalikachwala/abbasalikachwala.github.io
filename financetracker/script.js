// Configurable password hash. To set, use SHA-256 hash of your password.
const PASSWORD_HASH = "b40f795cb9d5f6500662cd70fefac144f3abdd7e93306557953af1f246ce374b"; // Change as needed

// Preset categories and subcategories
const DEFAULT_CATEGORIES = [
  { name: "Needs", color: "var(--needs)" },
  { name: "Wants", color: "var(--wants)" },
  { name: "Savings", color: "var(--savings)" },
  { name: "Investments", color: "var(--investments)" }
];

const DEFAULT_SUBCATEGORIES = {
  "Housing":        { category: "Needs", emoji: "🏠" },
  "Utilities":      { category: "Needs", emoji: "💡" },
  "Insurance":      { category: "Needs", emoji: "🛡️" },
  "Debt Repayment": { category: "Wants", emoji: "💳" },
  "Entertainment":  { category: "Wants", emoji: "🎬" },
  "Dining Out":     { category: "Wants", emoji: "🍽️" },
  "Gambling":       { category: "Wants", emoji: "🎲" },
  "Investments":    { category: "Investments", emoji: "📈" },
  "Savings":        { category: "Savings", emoji: "💰" }
};

// Preset expenses
const PRESETS = [
  { description: "Rent", amount: 830, subcategory: "Housing" },
  { description: "2degrees", amount: 100.5, subcategory: "Utilities" },
  { description: "Car Insurance", amount: 41.75, subcategory: "Insurance" },
  { description: "ASB Credit Card", amount: 123.62, subcategory: "Debt Repayment" },
  { description: "Netflix", amount: 33.99, subcategory: "Entertainment" },
  { description: "ASB Spending", amount: 100, subcategory: "Dining Out" },
  { description: "Lotto Syndicate", amount: 4, subcategory: "Gambling" },
  { description: "Kernel Invest", amount: 200, subcategory: "Investments" },
  { description: "RaboBank Savings", amount: 50, subcategory: "Savings" },
  { description: "RaboBank Gold", amount: 100, subcategory: "Investments" }
];

// LocalStorage keys
const STORAGE_KEYS = {
  expenses: "financetracker_expenses",
  categories: "financetracker_categories",
  subcategories: "financetracker_subcategories"
};

// Utility: SHA-256 (using SubtleCrypto)
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Helper functions for LocalStorage
function saveToStorage(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function loadFromStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

// State
let categories = loadFromStorage(STORAGE_KEYS.categories, DEFAULT_CATEGORIES.slice());
let subcategories = loadFromStorage(STORAGE_KEYS.subcategories, { ...DEFAULT_SUBCATEGORIES });
let expenses = loadFromStorage(STORAGE_KEYS.expenses, []);
let chart;

// DOM elements
const overlay = document.getElementById("password-overlay");
const header = document.querySelector(".tracker-header");
const main = document.querySelector("main");
const footer = document.querySelector("footer");
const pwInput = document.getElementById("site-password");
const pwBtn = document.getElementById("submit-password");
const pwErr = document.getElementById("password-error");
const form = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const categorySelect = document.getElementById("category");
const subcategorySelect = document.getElementById("subcategory");
const dateInput = document.getElementById("date");
const expensesList = document.getElementById("expenses-list");
const emptyTablePlaceholder = document.getElementById("empty-table-placeholder");
const ctx = document.getElementById("category-chart").getContext("2d");
const saveBtn = document.getElementById("save-to-local");
const toast = document.getElementById("toast");
const suggestionBar = document.getElementById("category-suggestion");
const suggestionText = document.getElementById("suggestion-text");
const applySuggestionBtn = document.getElementById("apply-suggestion-btn");
const addExpenseBtn = document.getElementById("add-expense-btn");
const summaryTotals = document.getElementById("summary-totals");
const modalOverlay = document.getElementById("modal-overlay");
const modal = document.querySelector(".modal");
const modalTitle = document.getElementById("modal-title");
const modalInput = document.getElementById("modal-input");
const modalCancel = document.getElementById("modal-cancel");
const modalOk = document.getElementById("modal-ok");
const modalCatSelector = document.getElementById("modal-category-selector");
const modalCatSelect = document.getElementById("modal-category-select");
const addCategoryBtn = document.getElementById("add-category-btn");
const addSubcategoryBtn = document.getElementById("add-subcategory-btn");
const presetGrid = document.querySelector(".preset-grid");

// --- Password Protection ---
pwBtn.onclick = tryPassword;
pwInput.onkeydown = e => { if (e.key === "Enter") tryPassword(); };
async function tryPassword() {
  const pass = pwInput.value;
  if (await sha256(pass) === PASSWORD_HASH) {
    pwErr.textContent = "";
    unlockSite();
  } else {
    pwErr.textContent = "Incorrect password. Try again.";
    pwInput.value = "";
    pwInput.focus();
  }
}

function unlockSite() {
  overlay.style.opacity = 0;
  setTimeout(() => {
    overlay.style.display = "none";
    header.style.display = "";
    main.style.display = "";
    footer.style.display = "";
    setDefaultDateToday();
    descriptionInput.focus();
    renderAll();
  }, 380);
}

// --- Category/Subcategory Management ---
function addCategory(name, color = null) {
  if (!categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    categories.push({ name, color: color || randomColor() });
    saveToStorage(STORAGE_KEYS.categories, categories);
  }
}
function addSubcategory(name, category, emoji = "🔖") {
  subcategories[name] = { category, emoji };
  saveToStorage(STORAGE_KEYS.subcategories, subcategories);
}
function getCategoryColor(name) {
  const c = categories.find(c => c.name === name);
  return c ? c.color : "#ccc";
}
function randomColor() {
  const colors = [
    "#0a84ff", "#bf5af2", "#32d74b", "#ff9f0a", "#ffd60a",
    "#ff375f", "#64d2ff", "#5e5ce6", "#ffb340"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
function getCatForSubcat(subcat) {
  return subcategories[subcat]?.category || categories[0].name;
}
function getEmojiForSubcat(subcat) {
  return subcategories[subcat]?.emoji || "🔖";
}

// --- Populate selects ---
function renderCategoryOptions(selected = "") {
  categorySelect.innerHTML = '<option value="" disabled selected>Select category</option>';
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    opt.style.color = c.color;
    if (selected && c.name === selected) opt.selected = true;
    categorySelect.appendChild(opt);
  });
}
function renderSubcategoryOptions(category, selected = "") {
  subcategorySelect.innerHTML = '<option value="" disabled selected>Select sub-category</option>';
  Object.entries(subcategories).forEach(([subcat, { category: cat, emoji }]) => {
    if (cat === category) {
      const opt = document.createElement("option");
      opt.value = subcat;
      opt.textContent = (emoji ? emoji + " " : "") + subcat;
      if (selected && subcat === selected) opt.selected = true;
      subcategorySelect.appendChild(opt);
    }
  });
}
function updateSelectsAfterAdd() {
  const cat = categorySelect.value || "";
  renderCategoryOptions(cat);
  renderSubcategoryOptions(cat, subcategorySelect.value);
}

// --- Modal logic for new cat/subcat ---
let modalResolve;
function openModal({ title, placeholder, requireCat = false }) {
  modalTitle.textContent = title;
  modalInput.value = "";
  modalInput.placeholder = placeholder || "";
  modalCatSelector.style.display = requireCat ? "" : "none";
  if (requireCat) {
    modalCatSelect.innerHTML = "";
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      modalCatSelect.appendChild(opt);
    });
  }
  modalOverlay.style.display = "";
  setTimeout(() => { modalInput.focus(); }, 50);
  return new Promise(resolve => { modalResolve = resolve; });
}
function closeModal() {
  modalOverlay.style.display = "none";
  modalResolve && modalResolve(null);
}
modalCancel.onclick = closeModal;
modalOverlay.onclick = e => { if (e.target === modalOverlay) closeModal(); };
modalOk.onclick = () => {
  const val = modalInput.value.trim();
  if (!val) {
    modalInput.focus();
    return;
  }
  let result = { value: val };
  if (modalCatSelector.style.display !== "none") {
    result.category = modalCatSelect.value;
  }
  closeModal();
  modalResolve && modalResolve(result);
};

// --- Add new category ---
addCategoryBtn.onclick = async () => {
  const r = await openModal({ title: "Add New Category", placeholder: "Eg. Education" });
  if (r && r.value) {
    addCategory(r.value);
    renderCategoryOptions("");
    renderSubcategoryOptions("", "");
    showToast("Category added!", "#0a84ff");
  }
};
// --- Add new sub-category ---
addSubcategoryBtn.onclick = async () => {
  const r = await openModal({ title: "Add New Sub-category", placeholder: "Eg. Tuition, Mobile Plan", requireCat: true });
  if (r && r.value && r.category) {
    addSubcategory(r.value, r.category);
    renderSubcategoryOptions(categorySelect.value, "");
    showToast("Sub-category added!", "#32d74b");
  }
};

// --- Change subcats when category changed ---
categorySelect.onchange = () => {
  renderSubcategoryOptions(categorySelect.value, "");
  validateForm();
};

// --- Initial render of select options ---
function renderAll() {
  renderCategoryOptions();
  renderSubcategoryOptions();
  renderPresets();
  updateTable();
  updateChart();
  updateSummary();
}

// --- Presets: one-click to add expense ---
function renderPresets() {
  presetGrid.innerHTML = "";
  PRESETS.forEach(exp => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.innerHTML = `<span>${getEmojiForSubcat(exp.subcategory)} ${exp.description} <span style="color:#a4b1c7;font-size:0.93em;">$${exp.amount}</span></span>`;
    btn.onclick = (e) => {
      e.preventDefault();
      const cat = getCatForSubcat(exp.subcategory);
      addCategory(cat);
      addSubcategory(exp.subcategory, cat, getEmojiForSubcat(exp.subcategory));
      const today = new Date().toISOString().split("T")[0];
      addExpense({
        amount: exp.amount,
        description: exp.description,
        category: cat,
        subcategory: exp.subcategory,
        date: today
      });
      showToast("Expense added!", "#0a84ff");
    };
    presetGrid.appendChild(btn);
  });
}

// --- Form validation ---
function validateForm() {
  const valid =
    amountInput.value.trim() !== "" &&
    parseFloat(amountInput.value) > 0 &&
    descriptionInput.value.trim() !== "" &&
    categorySelect.value !== "" &&
    subcategorySelect.value !== "";
  addExpenseBtn.disabled = !valid;
}

// --- Toast notifications ---
function showToast(message, color = null) {
  toast.textContent = message;
  toast.className = "toast show";
  if (color) toast.style.background = color;
  else toast.style.background = "";
  setTimeout(() => { toast.className = "toast"; toast.style.background = ""; }, 2100);
}

// --- Date formatting ---
function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const options = { day: "numeric", month: "short", year: "numeric" };
  return date.toLocaleDateString("en-GB", options);
}

// --- Expenses Table ---
function animateCard(card, type) {
  if (type === "add") {
    card.style.opacity = 0;
    card.style.transform = "translateY(30px)";
    requestAnimationFrame(() => {
      card.style.transition = "all 0.33s cubic-bezier(.4,0,.2,1)";
      card.style.opacity = 1;
      card.style.transform = "translateY(0)";
    });
  } else if (type === "remove") {
    card.style.transition = "all 0.22s";
    card.style.opacity = 0;
    card.style.transform = "translateX(30px)";
    setTimeout(() => card.remove(), 200);
  }
}
function updateTable() {
  expensesList.innerHTML = "";
  if (expenses.length === 0) {
    emptyTablePlaceholder.style.display = "flex";
  } else {
    emptyTablePlaceholder.style.display = "none";
  }
  expenses.forEach((exp, index) => {
    const card = document.createElement("div");
    card.className = "expense-card";
    card.innerHTML = `
      <span class="expense-amount">$${parseFloat(exp.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      <div class="expense-info">
        <div class="expense-title">${exp.description}
          <span class="expense-category-badge" style="background:${getCategoryColor(exp.category)}22;color:${getCategoryColor(exp.category)};">${exp.category}</span>
        </div>
        <div class="expense-date">${formatDateDisplay(exp.date)} &middot; ${getEmojiForSubcat(exp.subcategory)} ${exp.subcategory}</div>
      </div>
      <button class="expense-delete-btn" title="Delete" aria-label="Delete">&#128465;</button>
    `;
    card.querySelector(".expense-delete-btn").onclick = () => {
      animateCard(card, "remove");
      expenses.splice(index, 1);
      saveToStorage(STORAGE_KEYS.expenses, expenses);
      setTimeout(() => {
        updateTable();
        updateChart();
        updateSummary();
      }, 210);
    };
    expensesList.appendChild(card);
    animateCard(card, "add");
  });
}

// --- Chart ---
function updateChart() {
  // Chart shows SUM of amounts per main category
  const sums = {};
  expenses.forEach(({ category, amount }) => {
    if (!category) return;
    sums[category] = (sums[category] || 0) + Number(amount);
  });
  const categoriesArr = Object.keys(sums);
  const colors = categoriesArr.map(getCategoryColor);
  const data = {
    labels: categoriesArr,
    datasets: [{
      label: "Total Spent",
      data: Object.values(sums),
      backgroundColor: colors,
      borderRadius: 12,
      barPercentage: 0.68,
      categoryPercentage: 0.7,
    }]
  };
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` $${context.raw.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: "#222" },
          grid: { color: "#e4e9f2" }
        },
        y: {
          ticks: { color: "#222" },
          grid: { display: false }
        }
      }
    }
  });
}

// --- Summary ---
function updateSummary() {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const perCat = {};
  expenses.forEach(e => {
    if (!perCat[e.category]) perCat[e.category] = 0;
    perCat[e.category] += Number(e.amount);
  });
  let html = `<div style="font-weight:700;font-size:1.19em;margin-bottom:9px;">
    Total Spent: <span style="color:var(--apple-blue)">$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
  </div>
  <ul style="padding-left:1.2em;margin:0 0 0 0;">`;
  Object.entries(perCat).forEach(([cat, amt]) => {
    html += `<li><span style="color:${getCategoryColor(cat)};font-weight:600;">${cat}</span>: $${amt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</li>`;
  });
  html += "</ul>";
  summaryTotals.innerHTML = html;
}

// --- Add Expense ---
function addExpense({ amount, description, category, subcategory, date }) {
  expenses.push({ amount, description, category, subcategory, date });
  saveToStorage(STORAGE_KEYS.expenses, expenses);
  updateTable();
  updateChart();
  updateSummary();
}

// --- Save (redundant, but for footer button parity) ---
saveBtn.addEventListener("click", () => {
  saveToStorage(STORAGE_KEYS.expenses, expenses);
  showToast("Expenses saved locally!", "#32d74b");
});

// --- Suggestion Logic ---
function getSuggestion(desc) {
  if (!desc) return null;
  const matches = expenses.filter(e =>
    e.description.trim().toLowerCase() === desc.trim().toLowerCase()
  );
  if (matches.length) {
    const freq = {};
    matches.forEach(e => {
      const key = `${e.category}|${e.subcategory}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    const best = Object.entries(freq).reduce((a, b) => (a[1] > b[1] ? a : b));
    const [category, subcategory] = best[0].split("|");
    return { category, subcategory, count: best[1] };
  }
  return null;
}
descriptionInput.addEventListener("input", () => {
  const desc = descriptionInput.value.trim();
  const suggestion = getSuggestion(desc);
  if (suggestion) {
    suggestionBar.style.display = "";
    suggestionText.innerHTML =
      `Suggestion: <strong>${suggestion.category}</strong> &rsaquo; <strong>${suggestion.subcategory}</strong> <span style="color:#888;">(used ${suggestion.count} time${suggestion.count > 1 ? "s" : ""})</span>`;
    applySuggestionBtn.onclick = () => {
      categorySelect.value = suggestion.category;
      renderSubcategoryOptions(suggestion.category, suggestion.subcategory);
      subcategorySelect.value = suggestion.subcategory;
      suggestionBar.style.display = "none";
      validateForm();
    };
  } else {
    suggestionBar.style.display = "none";
  }
  validateForm();
});

// --- Unified Form Inputs Validation ---
[amountInput, descriptionInput, categorySelect, subcategorySelect].forEach(input => {
  input.addEventListener("input", validateForm);
  input.addEventListener("change", validateForm);
});

// --- Form Submission ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  const description = descriptionInput.value.trim();
  const category = categorySelect.value.trim();
  const subcategory = subcategorySelect.value.trim();
  const date = dateInput.value || new Date().toISOString().split("T")[0];
  if (!isNaN(amount) && description && category && subcategory) {
    const entry = { amount, description, category, subcategory, date };
    addExpense(entry);
    showToast("Expense added!", "#0a84ff");
    amountInput.value = "";
    descriptionInput.value = "";
    renderCategoryOptions("");
    renderSubcategoryOptions("", "");
    dateInput.value = "";
    suggestionBar.style.display = "none";
    validateForm();
  } else {
    showToast("Please fill all required fields.", "#ff375f");
  }
});

// --- Set today's date as default ---
function setDefaultDateToday() {
  dateInput.value = new Date().toISOString().split("T")[0];
}

// --- On page load, show password overlay, hide main content ---
window.addEventListener("DOMContentLoaded", () => {
  overlay.style.display = "";
  overlay.style.opacity = 1;
  header.style.display = "none";
  main.style.display = "none";
  footer.style.display = "none";
});
