// ====== CONFIGURATION ======
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQgRdOL5znMA0GFN-bKDf9YpQh7wpi7A4kASDIvN6qi1FqznKHTTTHiF3K1OrVWXy0/exec";
const SECRET_TOKEN = "qewzaq-6Hyrda-xejtys";
const PASSWORD_HASH = "b40f795cb9d5f6500662cd70fefac144f3abdd7e93306557953af1f246ce374b";
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  // --- Password Protection ---
  const overlay = document.getElementById("password-overlay");
  const header = document.querySelector(".tracker-header");
  const main = document.querySelector("main");
  const footer = document.querySelector("footer");
  const pwInput = document.getElementById("site-password");
  const pwBtn = document.getElementById("submit-password");
  const pwErr = document.getElementById("password-error");

  function unlockSite() {
    overlay.style.opacity = 0;
    setTimeout(() => {
      overlay.style.display = "none";
      header.style.display = "";
      main.style.display = "";
      footer.style.display = "";
      setDefaultDateToday();
      document.getElementById("description").focus();
    }, 380);
  }
  pwBtn.onclick = tryPassword;
  pwInput.onkeydown = e => { if (e.key === "Enter") tryPassword(); };
  function tryPassword() {
    if (sha256(pwInput.value) === PASSWORD_HASH) {
      pwErr.textContent = "";
      unlockSite();
    } else {
      pwErr.textContent = "Incorrect password. Try again.";
      pwInput.value = "";
      pwInput.focus();
    }
  }
  // --- End Password Protection ---

  // --- DOM Elements ---
  const form = document.getElementById("expense-form");
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  const dateInput = document.getElementById("date");
  const expensesTableBody = document.querySelector("#expenses-table tbody");
  const emptyTablePlaceholder = document.getElementById("empty-table-placeholder");
  const ctx = document.getElementById("category-chart").getContext("2d");
  const saveBtn = document.getElementById("save-to-sheets");
  const toast = document.getElementById("toast");
  const suggestionBar = document.getElementById("category-suggestion");
  const suggestionText = document.getElementById("suggestion-text");
  const applySuggestionBtn = document.getElementById("apply-suggestion-btn");
  const addExpenseBtn = document.getElementById("add-expense-btn");
  const summaryTotals = document.getElementById("summary-totals");
  // Modal
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

  let chart;
  let expenses = [];
  let sentEntries = new Set();

  // --- Data Structures ---
  // Default categories and sub-categories with mapping
  let categories = [
    { name: "Needs", color: "var(--needs)" },
    { name: "Wants", color: "var(--wants)" },
    { name: "Savings", color: "var(--savings)" },
    { name: "Investments", color: "var(--investments)" },
  ];
  // key: subcat, value: {category, emoji}
  let subcategories = {
    "Housing":        { category: "Needs", emoji: "🏠" },
    "Utilities":      { category: "Needs", emoji: "💡" },
    "Groceries":      { category: "Needs", emoji: "🛒" },
    "Transportation": { category: "Needs", emoji: "🚌" },
    "Insurance":      { category: "Needs", emoji: "🛡️" },
    "Healthcare":     { category: "Needs", emoji: "🩺" },
    "Debt Repayment": { category: "Wants", emoji: "💳" },
    "Entertainment":  { category: "Wants", emoji: "🎬" },
    "Dining Out":     { category: "Wants", emoji: "🍽️" },
    "Shopping":       { category: "Wants", emoji: "🛍️" },
    "Travel":         { category: "Wants", emoji: "✈️" },
    "Gambling":       { category: "Wants", emoji: "🎲" },
    "Savings":        { category: "Savings", emoji: "💰" },
    "Emergency Fund": { category: "Savings", emoji: "🚨" },
    "Investments":    { category: "Investments", emoji: "📈" },
    "Retirement":     { category: "Investments", emoji: "🏖️" },
  };

  // --- Utility: Save new cat/subcat in-memory ---
  function addCategory(name, color = null) {
    if (!categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      categories.push({ name, color: color || randomColor() });
    }
  }
  function addSubcategory(name, category, emoji = "🔖") {
    subcategories[name] = { category, emoji };
  }
  function getCategoryColor(name) {
    const c = categories.find(c => c.name === name);
    return c ? c.color : "#ccc";
  }
  function randomColor() {
    // pick a pastel color
    const colors = [
      "#0a84ff", "#bf5af2", "#32d74b", "#ff9f0a", "#ffd60a", "#ff375f", "#64d2ff", "#5e5ce6", "#ffb340"
    ];
    return colors[Math.floor(Math.random()*colors.length)];
  }

  // --- Populate selects ---
  function renderCategoryOptions(selected = "") {
    categorySelect.innerHTML = "";
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      opt.style.color = c.color;
      if (c.name === selected) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }
  function renderSubcategoryOptions(category, selected = "") {
    subcategorySelect.innerHTML = "";
    // filter subcats by category
    Object.entries(subcategories).forEach(([subcat, {category: cat, emoji}]) => {
      if (cat === category) {
        const opt = document.createElement("option");
        opt.value = subcat;
        opt.textContent = (emoji ? emoji + " " : "") + subcat;
        if (subcat === selected) opt.selected = true;
        subcategorySelect.appendChild(opt);
      }
    });
    // If none, placeholder
    if (!subcategorySelect.children.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "(No sub-categories yet)";
      opt.disabled = true;
      subcategorySelect.appendChild(opt);
    }
  }
  function updateSelectsAfterAdd() {
    // keep current values when possible
    const cat = categorySelect.value || categories[0].name;
    renderCategoryOptions(cat);
    renderSubcategoryOptions(cat, subcategorySelect.value);
  }

  // --- Modal logic for new cat/subcat ---
  let modalResolve;
  function openModal({title, placeholder, requireCat = false}) {
    modalTitle.textContent = title;
    modalInput.value = "";
    modalInput.placeholder = placeholder || "";
    modalCatSelector.style.display = requireCat ? "" : "none";
    // populate selector
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
    const r = await openModal({title: "Add New Category", placeholder: "Eg. Education"});
    if (r && r.value) {
      addCategory(r.value);
      renderCategoryOptions(r.value);
      renderSubcategoryOptions(r.value, "");
      showToast("Category added!", "#0a84ff");
    }
  };
  // --- Add new sub-category ---
  addSubcategoryBtn.onclick = async () => {
    const r = await openModal({title: "Add New Sub-category", placeholder: "Eg. Tuition, Mobile Plan", requireCat: true});
    if (r && r.value && r.category) {
      addSubcategory(r.value, r.category);
      renderSubcategoryOptions(categorySelect.value, r.value);
      showToast("Sub-category added!", "#32d74b");
    }
  };

  // --- Change subcats when category changed ---
  categorySelect.onchange = () => {
    renderSubcategoryOptions(categorySelect.value, "");
    validateForm();
  };

  // --- Initial render ---
  renderCategoryOptions(categories[0].name);
  renderSubcategoryOptions(categories[0].name, "");

  // --- Presets ---
  const presetGrid = document.querySelector(".preset-grid");
  const presets = [
    { description: "Rent", amount: 830, subcategory: "Housing" },
    { description: "Utilities", amount: 100.5, subcategory: "Utilities" },
    { description: "Groceries", amount: 400, subcategory: "Groceries" },
    { description: "Healthcare", amount: 120, subcategory: "Healthcare" },
    { description: "Car Insurance", amount: 41.75, subcategory: "Insurance" },
    { description: "Credit Card", amount: 123.62, subcategory: "Debt Repayment" },
    { description: "Netflix", amount: 20, subcategory: "Entertainment" },
    { description: "Dining Out", amount: 50, subcategory: "Dining Out" },
    { description: "ASB Spending", amount: 100, subcategory: "Entertainment" },
    { description: "Lotto Syndicate", amount: 4, subcategory: "Gambling" },
    { description: "Stocks", amount: 200, subcategory: "Investments" },
    { description: "Retirement", amount: 50, subcategory: "Retirement" },
    { description: "Emergency Fund", amount: 20, subcategory: "Emergency Fund" },
    { description: "Savings", amount: 100, subcategory: "Savings" }
  ];
  function getCatForSubcat(subcat) {
    return subcategories[subcat]?.category || categories[0].name;
  }
  function getEmojiForSubcat(subcat) {
    return subcategories[subcat]?.emoji || "🔖";
  }
  presets.forEach(exp => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.innerHTML = `<span>${getEmojiForSubcat(exp.subcategory)} ${exp.description} <span style="color:#c1c1d1;font-size:0.93em;">₹${exp.amount}</span></span>`;
    btn.onclick = () => {
      const cat = getCatForSubcat(exp.subcategory);
      addCategory(cat); // ensure category exists
      addSubcategory(exp.subcategory, cat, getEmojiForSubcat(exp.subcategory));
      renderCategoryOptions(cat);
      renderSubcategoryOptions(cat, exp.subcategory);
      categorySelect.value = cat;
      subcategorySelect.value = exp.subcategory;
      amountInput.value = exp.amount;
      descriptionInput.value = exp.description;
      validateForm();
    };
    presetGrid.appendChild(btn);
  });

  // --- Form validation and suggestion ---
  function validateForm() {
    const valid =
      amountInput.value.trim() !== "" &&
      parseFloat(amountInput.value) > 0 &&
      descriptionInput.value.trim() !== "" &&
      categorySelect.value !== "" &&
      subcategorySelect.value !== "";
    addExpenseBtn.disabled = !valid;
  }

  function showToast(message, color = null) {
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

  function animateRow(row, type) {
    if (type === "add") {
      row.style.opacity = 0;
      row.style.transform = "translateY(30px)";
      requestAnimationFrame(() => {
        row.style.transition = "all 0.33s cubic-bezier(.4,0,.2,1)";
        row.style.opacity = 1;
        row.style.transform = "translateY(0)";
      });
    } else if (type === "remove") {
      row.style.transition = "all 0.22s";
      row.style.opacity = 0;
      row.style.transform = "translateX(30px)";
      setTimeout(() => row.remove(), 200);
    }
  }

  // --- Table and chart logic ---
  function updateTable() {
    expensesTableBody.innerHTML = "";
    if (expenses.length === 0) {
      emptyTablePlaceholder.style.display = "flex";
    } else {
      emptyTablePlaceholder.style.display = "none";
    }
    expenses.forEach((exp, index) => {
      const row = document.createElement("tr");
      const catCell = document.createElement("td");
      catCell.className = "editable-cell";
      catCell.tabIndex = 0;
      catCell.innerText = exp.category;
      catCell.style.color = getCategoryColor(exp.category);
      catCell.onclick = () => editCellDropdown(catCell, "category", index, exp.category);
      catCell.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") catCell.click(); };

      const subcatCell = document.createElement("td");
      subcatCell.className = "editable-cell";
      subcatCell.tabIndex = 0;
      subcatCell.innerText = getEmojiForSubcat(exp.subcategory) + " " + exp.subcategory;
      subcatCell.onclick = () => editCellDropdown(subcatCell, "subcategory", index, exp.subcategory, exp.category);
      subcatCell.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") subcatCell.click(); };

      row.innerHTML = `
        <td>${formatDateDisplay(exp.date)}</td>
        <td>${exp.description}</td>
        <td>₹${parseFloat(exp.amount).toLocaleString("en-IN", {minimumFractionDigits: 2})}</td>
        <td></td>
        <td></td>
        <td>
          <button class="delete-btn" title="Delete" aria-label="Delete" tabindex="0">&#128465;</button>
        </td>
      `;
      row.children[3].replaceWith(catCell);
      row.children[4].replaceWith(subcatCell);

      row.querySelector(".delete-btn").onclick = () => {
        animateRow(row, "remove");
        expenses.splice(index, 1);
        setTimeout(() => {
          updateTable();
          updateChart();
          updateSummary();
        }, 210);
      };
      expensesTableBody.appendChild(row);
      animateRow(row, "add");
    });
  }

  function editCellDropdown(cell, type, idx, currentValue, catLimit) {
    if (cell.querySelector("select")) return;
    const select = document.createElement("select");
    select.className = "editable-select";
    let options;
    if (type === "category") {
      options = categories.map(c => c.name);
    } else {
      options = Object.entries(subcategories)
        .filter(([_, v]) => v.category === catLimit)
        .map(([k]) => k);
    }
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = type === "category" ? opt : (getEmojiForSubcat(opt) + " " + opt);
      select.appendChild(option);
    });
    select.value = currentValue;
    select.onchange = () => {
      cell.textContent = type === "category" ? select.value : (getEmojiForSubcat(select.value) + " " + select.value);
      expenses[idx][type] = select.value;
      if (type === "category") {
        // If category is changed, set subcategory to first available in that category
        const subcats = Object.entries(subcategories).filter(([_, v]) => v.category === select.value);
        if (subcats.length) {
          expenses[idx].subcategory = subcats[0][0];
        }
      }
      updateTable();
      updateChart();
      updateSummary();
      showToast(`${type.charAt(0).toUpperCase()+type.slice(1)} updated`, "#32d74b");
    };
    select.onblur = () => cell.textContent = type === "category" ? select.value : (getEmojiForSubcat(select.value) + " " + select.value);
    cell.textContent = "";
    cell.appendChild(select);
    select.focus();
  }

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
              label: function(context) {
                return ` ₹${context.raw.toLocaleString("en-IN", {minimumFractionDigits:2})}`;
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
    // Show grand total and per-category breakdown
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const perCat = {};
    expenses.forEach(e => {
      if (!perCat[e.category]) perCat[e.category] = 0;
      perCat[e.category] += Number(e.amount);
    });
    let html = `<div style="font-weight:700;font-size:1.19em;margin-bottom:9px;">
      Total Spent: <span style="color:var(--apple-blue)">₹${total.toLocaleString("en-IN", {minimumFractionDigits:2})}</span>
    </div>
    <ul style="padding-left:1.2em;margin:0 0 0 0;">`;
    Object.entries(perCat).forEach(([cat, amt]) => {
      html += `<li><span style="color:${getCategoryColor(cat)};font-weight:600;">${cat}</span>: ₹${amt.toLocaleString("en-IN", {minimumFractionDigits:2})}</li>`;
    });
    html += "</ul>";
    summaryTotals.innerHTML = html;
  }

  // --- Add expense ---
  function addExpense({ amount, description, category, subcategory, date }) {
    expenses.push({ amount, description, category, subcategory, date });
    updateTable();
    updateChart();
    updateSummary();
  }

  // --- Google Sheets integration ---
  function sendToGoogleSheets() {
    if (!expenses.length) {
      showToast("No expenses to save!", "#ff375f");
      return;
    }
    let unsent = expenses.filter(e => !sentEntries.has(JSON.stringify(e)));
    if (!unsent.length) {
      showToast("Nothing new to save.", "#f99f0a");
      return;
    }
    Promise.all(unsent.map(entry =>
      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ ...entry, secret: SECRET_TOKEN }),
        headers: { "Content-Type": "application/json" }
      })
      .then(resp => {
        if (!resp.ok) throw new Error("Network/Server error");
        sentEntries.add(JSON.stringify(entry));
      })
    ))
    .then(() => showToast("Saved to Google Sheets!", "#32d74b"))
    .catch(() => showToast("Error saving to Google Sheets.", "#ff375f"));
  }

  // --- Description suggestion ---
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
        `Suggestion: <strong>${suggestion.category}</strong> › <strong>${suggestion.subcategory}</strong> <span style="color:#888;">(used ${suggestion.count} time${suggestion.count > 1 ? "s" : ""})</span>`;
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

  [amountInput, descriptionInput, categorySelect, subcategorySelect].forEach(input => {
    input.addEventListener("input", validateForm);
    input.addEventListener("change", validateForm);
  });

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
      renderCategoryOptions(categories[0].name);
      renderSubcategoryOptions(categories[0].name, "");
      dateInput.value = "";
      suggestionBar.style.display = "none";
      validateForm();
    } else {
      showToast("Please fill all required fields.", "#ff375f");
    }
  });

  saveBtn.addEventListener("click", sendToGoogleSheets);

  expensesTableBody.addEventListener("keydown", (e) => {
    if (e.target.classList.contains("delete-btn") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.target.click();
    }
  });

  function setDefaultDateToday() {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
});
