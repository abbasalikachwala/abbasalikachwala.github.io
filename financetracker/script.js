// ---- CONFIG ----
const CLIENT_ID = '709689604347-qdvrj86sa0gouuli9vllm6q7hg30u3ui.apps.googleusercontent.com'; // <-- Replace with your OAuth client ID
const SCOPES = 'openid email https://www.googleapis.com/auth/spreadsheets';
const SHEET_ID = '1yGfJxjPrVh8fa-4-mDkvNwiH2bF9Txf5xNeVREvOGTw'; // <-- Replace with your Google Sheet ID
const SHEET_RANGE = 'FinanceTracker!A:F'; // Make sure your sheet's name matches

// ---- Static Data for Categories/Subcategories/Presets ----
const categories = [
  { name: "Needs", color: "#0a84ff" },
  { name: "Wants", color: "#bf5af2" },
  { name: "Savings", color: "#32d74b" },
  { name: "Investments", color: "#ff9f0a" },
];
const subcategories = {
  "Housing":        { category: "Needs", emoji: "🏠" },
  "Groceries":      { category: "Needs", emoji: "🛒" },
  "Utilities":      { category: "Needs", emoji: "💡" },
  "Insurance":      { category: "Needs", emoji: "🛡️" },
  "Debt Repayment": { category: "Wants", emoji: "💳" },
  "Entertainment":  { category: "Wants", emoji: "🎬" },
  "Dining Out":     { category: "Wants", emoji: "🍽️" },
  "Gambling":       { category: "Wants", emoji: "🎲" },
  "Investments":    { category: "Investments", emoji: "📈" },
  "Savings":        { category: "Savings", emoji: "💰" }
};
const presets = [
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

// ---- OAuth / Google Sheets API State ----
let tokenClient;
let accessToken = null;
let chart;
let expenses = [];

// ---- Utility Functions ----
function getCategoryColor(name) {
  const c = categories.find(c => c.name === name);
  return c ? c.color : "#ccc";
}
function getCatForSubcat(subcat) {
  return subcategories[subcat]?.category || categories[0].name;
}
function getEmojiForSubcat(subcat) {
  return subcategories[subcat]?.emoji || "🔖";
}
function showToast(message, color = null) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show";
  if (color) toast.style.background = color;
  else toast.style.background = "";
  setTimeout(() => { toast.className = "toast"; toast.style.background = ""; }, 2100);
}
function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const options = { day: "numeric", month: "short", year: "numeric" };
  return date.toLocaleDateString("en-GB", options);
}
function setDefaultDateToday() {
  const dateInput = document.getElementById("date");
  dateInput.value = new Date().toISOString().split("T")[0];
}
function showLoading(show) {
  document.getElementById("loading-spinner").style.display = show ? "block" : "none";
}

function renderCategoryOptions(selected = "") {
  const categorySelect = document.getElementById("category");
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
  const subcategorySelect = document.getElementById("subcategory");
  subcategorySelect.innerHTML = '<option value="" disabled selected>Select sub-category</option>';
  Object.entries(subcategories).forEach(([subcat, {category: cat, emoji}]) => {
    if (cat === category) {
      const opt = document.createElement("option");
      opt.value = subcat;
      opt.textContent = (emoji ? emoji + " " : "") + subcat;
      if (selected && subcat === selected) opt.selected = true;
      subcategorySelect.appendChild(opt);
    }
  });
}

function renderPresets() {
  const presetGrid = document.querySelector(".preset-grid");
  presetGrid.innerHTML = "";
  presets.forEach(exp => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.innerHTML = `
      <div class="preset-title">${getEmojiForSubcat(exp.subcategory)} ${exp.description}</div>
      <div class="preset-amount">$${parseFloat(exp.amount).toLocaleString("en-US", {minimumFractionDigits:2})}</div>
    `;
    btn.onclick = () => {
      const cat = getCatForSubcat(exp.subcategory);
      const today = new Date().toISOString().split("T")[0];
      addExpense({
        amount: exp.amount,
        description: exp.description,
        category: cat,
        subcategory: exp.subcategory,
        date: today
      });
    };
    presetGrid.appendChild(btn);
  });
}

function updateTable() {
  const expensesList = document.getElementById("expenses-list");
  const emptyTablePlaceholder = document.getElementById("empty-table-placeholder");
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
      <span class="expense-amount">$${parseFloat(exp.amount).toLocaleString("en-US", {minimumFractionDigits: 2})}</span>
      <div class="expense-info">
        <div class="expense-title">${exp.description}
          <span class="expense-category-badge" style="background:${getCategoryColor(exp.category)}22;color:${getCategoryColor(exp.category)};">${exp.category}</span>
        </div>
        <div class="expense-date">${formatDateDisplay(exp.date)} &middot; ${getEmojiForSubcat(exp.subcategory)} ${exp.subcategory}</div>
      </div>
      <button class="expense-delete-btn" title="Delete" aria-label="Delete">&#128465;</button>
    `;
    card.querySelector(".expense-delete-btn").onclick = () => deleteExpense(index);
    expensesList.appendChild(card);
  });
}

function updateChart() {
  const ctx = document.getElementById("category-chart").getContext("2d");
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
            label: function(context) {
              return ` $${context.raw.toLocaleString("en-US", {minimumFractionDigits:2})}`;
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

function updateSummary() {
  const summaryTotals = document.getElementById("summary-totals");
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const perCat = {};
  expenses.forEach(e => {
    if (!perCat[e.category]) perCat[e.category] = 0;
    perCat[e.category] += Number(e.amount);
  });
  let html = `<div style="font-weight:700;font-size:1.19em;margin-bottom:9px;">
    Total Spent: <span style="color:#0a84ff">$${total.toLocaleString("en-US", {minimumFractionDigits:2})}</span>
  </div>
  <ul style="padding-left:1.2em;margin:0 0 0 0;">`;
  Object.entries(perCat).forEach(([cat, amt]) => {
    html += `<li><span style="color:${getCategoryColor(cat)};font-weight:600;">${cat}</span>: $${amt.toLocaleString("en-US", {minimumFractionDigits:2})}</li>`;
  });
  html += "</ul>";
  summaryTotals.innerHTML = html;
}

function clearForm() {
  document.getElementById("amount").value = "";
  document.getElementById("description").value = "";
  renderCategoryOptions("");
  renderSubcategoryOptions("", "");
  document.getElementById("date").value = "";
  validateForm();
}

function validateForm() {
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  const addExpenseBtn = document.getElementById("add-expense-btn");
  const valid =
    amountInput.value.trim() !== "" &&
    parseFloat(amountInput.value) > 0 &&
    descriptionInput.value.trim() !== "" &&
    categorySelect.value !== "" &&
    subcategorySelect.value !== "";
  addExpenseBtn.disabled = !valid;
}

// ---- Google OAuth2 & Sheets API ----

function ensureSignedIn() {
  // Show/hide auth buttons
  document.getElementById('authorize_button').style.display = accessToken ? 'none' : '';
  document.getElementById('signout_button').style.display = accessToken ? '' : 'none';
  document.getElementById('user_email').style.display = accessToken ? '' : 'none';

  // Show/hide main UI (Apple Vision Pro effect: fade in)
  const mainUI = document.getElementById('main-ui');
  if (accessToken) {
    mainUI.style.display = '';
    mainUI.classList.add('active');
  } else {
    mainUI.style.display = 'none';
    mainUI.classList.remove('active');
    // Reset state
    expenses = [];
    updateTable();
    updateChart();
    updateSummary();
    showLoading(false);
  }
}

// Fetch all rows from the Google Sheet
function fetchExpenses() {
  if (!accessToken) return;
  showLoading(true);
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  .then(r => r.json())
  .then(data => {
    let rows = (data.values || []).slice(1); // skip header
    expenses = rows.map(row => ({
      timestamp: row[0],
      amount: row[1],
      description: row[2],
      category: row[3],
      subcategory: row[4],
      date: row[5]
    }));
    updateTable();
    updateChart();
    updateSummary();
  })
  .catch(() => showToast("Could not load expenses.", "#ff375f"))
  .finally(() => showLoading(false));
}

// Add a new row to the Google Sheet
function addExpense(expense) {
  if (!accessToken) return;
  showLoading(true);
  const values = [[
    new Date().toISOString(),
    expense.amount,
    expense.description,
    expense.category,
    expense.subcategory,
    expense.date
  ]];
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  })
  .then(r => r.json())
  .then(() => {
    showToast("Expense added!");
    fetchExpenses();
    clearForm();
  })
  .catch(() => showToast("Error saving.", "#ff375f"))
  .finally(() => showLoading(false));
}

// Delete a row from the sheet (by index in the local array)
function deleteExpense(idx) {
  if (!accessToken) return;
  if (!confirm("Delete this expense?")) return;

  // For Google Sheets API, deleting a row requires batchUpdate.
  // Row number = idx+2 (because header is row 1, array is zero-based)
  const rowNumber = idx + 2;
  showLoading(true);
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        { deleteDimension: {
            range: {
              sheetId: 0, // assuming first sheet
              dimension: 'ROWS',
              startIndex: rowNumber-1,
              endIndex: rowNumber
            }
        }}
      ]
    })
  })
  .then(r => r.json())
  .then(() => {
    showToast("Expense deleted.");
    fetchExpenses();
  })
  .catch(() => showToast("Error deleting.", "#ff375f"))
  .finally(() => showLoading(false));
}

// ---- Google OAuth2 Setup ----

window.onload = () => {
  // Setup Google Identity Services
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        showToast("Auth error: " + tokenResponse.error, "#ff375f");
        return;
      }
      accessToken = tokenResponse.access_token;
      // Get user email
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(r => r.json())
      .then(u => {
        document.getElementById('user_email').textContent = u.email ? `Signed in as: ${u.email}` : '';
      })
      .catch(() => {});
      ensureSignedIn();
      fetchExpenses();
    }
  });

  document.getElementById('authorize_button').onclick = () => tokenClient.requestAccessToken();
  document.getElementById('signout_button').onclick = () => {
    accessToken = null;
    ensureSignedIn();
  };

  ensureSignedIn();

  renderCategoryOptions("");
  renderSubcategoryOptions("", "");
  renderPresets();
  setDefaultDateToday();

  document.getElementById("category").onchange = function() {
    renderSubcategoryOptions(this.value, "");
    validateForm();
  };

  ["amount", "description", "category", "subcategory"].forEach(id => {
    document.getElementById(id).addEventListener("input", validateForm);
    document.getElementById(id).addEventListener("change", validateForm);
  });

  document.getElementById("expense-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const categorySelect = document.getElementById("category");
    const subcategorySelect = document.getElementById("subcategory");
    const dateInput = document.getElementById("date");
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const category = categorySelect.value.trim();
    const subcategory = subcategorySelect.value.trim();
    const date = dateInput.value || new Date().toISOString().split("T")[0];
    if (!isNaN(amount) && description && category && subcategory) {
      const entry = { amount, description, category, subcategory, date };
      addExpense(entry);
    } else {
      showToast("Please fill all required fields.", "#ff375f");
    }
  });

  document.getElementById("refresh-sheet").addEventListener("click", fetchExpenses);

  // Hide form and refresh button if not signed in
  ensureSignedIn();
};
