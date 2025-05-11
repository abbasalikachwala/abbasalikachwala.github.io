document.addEventListener("DOMContentLoaded", () => {
  // --- Password Protection ---
  const PASSWORD = "admin@1212";
  const overlay = document.getElementById("password-overlay");
  const header = document.querySelector(".tracker-header");
  const main = document.querySelector("main");
  const footer = document.querySelector("footer");
  const pwInput = document.getElementById("site-password");
  const pwBtn = document.getElementById("submit-password");
  const pwErr = document.getElementById("password-error");

  function unlockSite() {
    overlay.style.display = "none";
    header.style.display = "";
    main.style.display = "";
    footer.style.display = "";
    setDefaultDateToday();
    descriptionInput.focus();
  }

  pwBtn.onclick = tryPassword;
  pwInput.onkeydown = e => {
    if (e.key === "Enter") tryPassword();
  };

  function tryPassword() {
    if (pwInput.value === PASSWORD) {
      unlockSite();
    } else {
      pwErr.textContent = "Incorrect password. Try again.";
      pwInput.value = "";
      pwInput.focus();
    }
  }
  // --- End Password Protection ---

  // Elements
  const form = document.getElementById("expense-form");
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  const dateInput = document.getElementById("date");
  const expensesTableBody = document.querySelector("#expenses-table tbody");
  const ctx = document.getElementById("category-chart").getContext("2d");
  const saveBtn = document.getElementById("save-to-sheets");
  const toast = document.getElementById("toast");

  // Suggestion elements
  const suggestionBar = document.getElementById("category-suggestion");
  const suggestionText = document.getElementById("suggestion-text");
  const applySuggestionBtn = document.getElementById("apply-suggestion-btn");
  const addExpenseBtn = document.getElementById("add-expense-btn");

  // Google Sheets WebApp URL
  const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxbNt1VZwrvXZ3lycjMkL2PHSxqZXkgDFy2MlkpJaNuplrcx8-Uvv-OpEvQCGZlQ_mahg/exec";

  let chart;
  let expenses = [];

  // Predefined Expenses (Presets)
  const predefinedExpenses = [
    { description: "Rent", amount: 830, category: "Housing", subcategory: "Needs" },
    { description: "2degrees", amount: 100.5, category: "Utilities", subcategory: "Needs" },
    { description: "Kernel", amount: 200, category: "Investments", subcategory: "Investments" },
    { description: "RaboBank Gold", amount: 100, category: "Investments", subcategory: "Investments" },
    { description: "RaboBank Savings", amount: 50, category: "Savings", subcategory: "Savings" },
    { description: "ASB Credit Card", amount: 123.62, category: "Debt Repayment", subcategory: "Wants" },
    { description: "ASB Spending", amount: 100, category: "Entertainment", subcategory: "Wants" },
    { description: "Car Insurance", amount: 41.75, category: "Insurance", subcategory: "Needs" },
    { description: "Lotto Syndicate", amount: 4, category: "Gambling", subcategory: "Wants" }
  ];

  // Toast notification
  function showToast(message) {
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(() => { toast.className = "toast"; }, 2100);
  }

  // Format date for display
  function formatDateDisplay(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options = { day: "numeric", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options);
  }

  // Animate row addition/removal
  function animateRow(row, type) {
    if (type === "add") {
      row.style.opacity = 0;
      row.style.transform = "translateY(15px)";
      requestAnimationFrame(() => {
        row.style.transition = "all 0.28s cubic-bezier(.4,0,.2,1)";
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

  function getCategoryOptions() {
    return Array.from(categorySelect.options)
      .map(opt => opt.value)
      .filter(val => val && val !== "");
  }
  function getSubcategoryOptions() {
    return Array.from(subcategorySelect.options)
      .map(opt => opt.value)
      .filter(val => val && val !== "");
  }

  // Update Expenses Table (with editable cells)
  function updateTable() {
    expensesTableBody.innerHTML = "";
    expenses.forEach((exp, index) => {
      const row = document.createElement("tr");
      // Editable category cell
      const catCell = document.createElement("td");
      catCell.className = "editable-cell";
      catCell.tabIndex = 0;
      catCell.innerText = exp.category;
      catCell.onclick = () => editCellDropdown(catCell, "category", index, exp.category);
      catCell.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") catCell.click(); };

      // Editable subcategory cell
      const subcatCell = document.createElement("td");
      subcatCell.className = "editable-cell";
      subcatCell.tabIndex = 0;
      subcatCell.innerText = exp.subcategory;
      subcatCell.onclick = () => editCellDropdown(subcatCell, "subcategory", index, exp.subcategory);
      subcatCell.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") subcatCell.click(); };

      row.innerHTML = `
        <td>${formatDateDisplay(exp.date)}</td>
        <td>${exp.description}</td>
        <td></td>
        <td></td>
        <td>
          <button class="delete-btn" title="Delete" aria-label="Delete" tabindex="0">&#128465;</button>
        </td>
      `;
      row.children[2].replaceWith(catCell);
      row.children[3].replaceWith(subcatCell);

      // Delete handler
      row.querySelector(".delete-btn").onclick = () => {
        animateRow(row, "remove");
        expenses.splice(index, 1);
        setTimeout(() => {
          updateTable();
          updateChart();
        }, 210);
      };
      expensesTableBody.appendChild(row);
      animateRow(row, "add");
    });
  }

  // Inline editing for category/subcategory cells
  function editCellDropdown(cell, type, idx, currentValue) {
    if (cell.querySelector("select")) return;
    const select = document.createElement("select");
    select.className = "editable-select";
    let options = type === "category" ? getCategoryOptions() : getSubcategoryOptions();
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
    select.value = currentValue;
    select.onchange = () => {
      cell.textContent = select.value;
      expenses[idx][type] = select.value;
      updateChart();
      showToast(`${type.charAt(0).toUpperCase()+type.slice(1)} updated`);
    };
    select.onblur = () => cell.textContent = select.value;
    cell.textContent = "";
    cell.appendChild(select);
    select.focus();
  }

  // Update Bar Chart (category counts, not amounts)
  function updateChart() {
    const counts = {};
    expenses.forEach(({ category }) => {
      counts[category] = (counts[category] || 0) + 1;
    });
    const data = {
      labels: Object.keys(counts),
      datasets: [{
        label: "Number of Expenses",
        data: Object.values(counts),
        backgroundColor: [
          "#007aff", "#34c759", "#ff9500", "#ff2d55", "#af52de", "#5ac8fa", "#ffd60a", "#d1d1d6"
        ],
        borderRadius: 12,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
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
                return ` ${context.dataset.label}: ${context.raw}`;
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

  // Add Expense (with animation)
  function addExpense({ amount, description, category, subcategory, date }) {
    expenses.push({ amount, description, category, subcategory, date });
    updateTable();
    updateChart();
  }

  // Send entry to Google Sheets
  function sendToGoogleSheets() {
    if (!expenses.length) {
      showToast("No expenses to save!");
      return;
    }
    fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(expenses),
      headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
      showToast("Saved to Google Sheets!");
    })
    .catch(err => {
      showToast("Error saving to Google Sheets.");
      console.error("Google Sheets error:", err);
    });
  }

  // Form validation logic
  function validateForm() {
    const valid =
      amountInput.value.trim() !== "" &&
      parseFloat(amountInput.value) > 0 &&
      descriptionInput.value.trim() !== "" &&
      categorySelect.value !== "" &&
      subcategorySelect.value !== "";
    addExpenseBtn.disabled = !valid;
  }

  // Smart suggestion logic
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
        subcategorySelect.value = suggestion.subcategory;
        suggestionBar.style.display = "none";
        validateForm();
      };
    } else {
      suggestionBar.style.display = "none";
    }
    validateForm();
  });

  // Validate on all input/select changes
  [amountInput, descriptionInput, categorySelect, subcategorySelect].forEach(input => {
    input.addEventListener("input", validateForm);
    input.addEventListener("change", validateForm);
  });

  // Form submission handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const category = categorySelect.value.trim();
    const subcategory = subcategorySelect.value.trim();
    const date = dateInput.value || new Date().toISOString().split("T")[0];
    if (!isNaN(amount) && description && category && subcategory) {
      addExpense({ amount, description, category, subcategory, date });
      showToast("Expense added!");
      amountInput.value = "";
      descriptionInput.value = "";
      categorySelect.value = "";
      subcategorySelect.value = "";
      dateInput.value = "";
      suggestionBar.style.display = "none";
      validateForm();
    } else {
      showToast("Please fill all required fields.");
    }
  });

  // Save button handler
  saveBtn.addEventListener("click", sendToGoogleSheets);

  // Preset (predefined) cards grid
  const presetGrid = document.querySelector(".preset-grid");
  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }
  predefinedExpenses.forEach(exp => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.innerHTML = `<span>${exp.description}</span>`;
    btn.onclick = () => {
      // Immediately add expense (one-click)
      const entry = {
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        subcategory: exp.subcategory,
        date: todayStr()
      };
      addExpense(entry);
      showToast("Preset added!");
      sendToGoogleSheets();
    };
    presetGrid.appendChild(btn);
  });

  // Accessibility: allow Enter key on delete buttons
  expensesTableBody.addEventListener("keydown", (e) => {
    if (e.target.classList.contains("delete-btn") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.target.click();
    }
  });

  function setDefaultDateToday() {
    dateInput.value = todayStr();
  }

  // Initial render (site is locked until password entered)
});
