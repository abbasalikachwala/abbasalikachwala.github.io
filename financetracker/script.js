document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const form = document.getElementById("expense-form");
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  const dateInput = document.getElementById("date");
  const expensesTableBody = document.querySelector("#expenses-table tbody");
  const totalsList = document.getElementById("totals-list");
  const ctx = document.getElementById("category-chart").getContext("2d");
  const saveBtn = document.getElementById("save-to-sheets");
  const toast = document.getElementById("toast");

  // Google Sheets WebApp URL
  const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxbNt1VZwrvXZ3lycjMkL2PHSxqZXkgDFy2MlkpJaNuplrcx8-Uvv-OpEvQCGZlQ_mahg/exec"; // Replace with your Apps Script URL

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

  // Update Expenses Table
  function updateTable() {
    expensesTableBody.innerHTML = "";
    expenses.forEach((exp, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDateDisplay(exp.date)}</td>
        <td>${exp.description}</td>
        <td>${exp.category} <span style="color:#b6b6be;font-size:0.9em;">›</span> ${exp.subcategory}</td>
        <td>$${parseFloat(exp.amount).toFixed(2)}</td>
        <td>
          <button class="delete-btn" title="Delete" aria-label="Delete" tabindex="0">&#128465;</button>
        </td>
      `;
      // Delete handler
      row.querySelector(".delete-btn").onclick = () => {
        animateRow(row, "remove");
        expenses.splice(index, 1);
        setTimeout(() => {
          updateTable();
          updateChart();
          updateTotals();
        }, 210);
      };
      expensesTableBody.appendChild(row);
      animateRow(row, "add");
    });
  }

  // Update Pie Chart
  function updateChart() {
    const totals = {};
    expenses.forEach(({ category, amount }) => {
      if (!totals[category]) totals[category] = 0;
      totals[category] += parseFloat(amount);
    });
    const data = {
      labels: Object.keys(totals),
      datasets: [{
        label: "Spending by Category",
        data: Object.values(totals),
        backgroundColor: [
          "#007aff", "#34c759", "#ff9500", "#ff2d55", "#af52de", "#5ac8fa", "#ffd60a", "#d1d1d6"
        ],
        borderWidth: 1.5,
        borderColor: "#fff"
      }]
    };
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "pie",
      data: data,
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#222", font: { size: 15 } }
          }
        },
        animation: { animateRotate: true, animateScale: true }
      }
    });
  }

  // Update Totals List
  function updateTotals() {
    const totals = {};
    let grandTotal = 0;
    expenses.forEach(({ category, amount }) => {
      if (!totals[category]) totals[category] = 0;
      totals[category] += parseFloat(amount);
      grandTotal += parseFloat(amount);
    });
    totalsList.innerHTML = `
      <div><strong>Total:</strong> $${grandTotal.toFixed(2)}</div>
      <ul style="padding-left: 1em; margin-top: 9px;">
        ${Object.keys(totals).map(cat =>
          `<li>${cat}: $${totals[cat].toFixed(2)}</li>`
        ).join("")}
      </ul>
    `;
  }

  // Add Expense (with animation)
  function addExpense({ amount, description, category, subcategory, date }) {
    expenses.push({ amount, description, category, subcategory, date });
    updateTable();
    updateChart();
    updateTotals();
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

  // Form submission handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const category = categorySelect.value.trim() || "Uncategorised";
    const subcategory = subcategorySelect.value.trim() || "Uncategorised";
    const date = dateInput.value || new Date().toISOString().split("T")[0];
    if (!isNaN(amount) && description && category && subcategory) {
      addExpense({ amount, description, category, subcategory, date });
      showToast("Expense added!");
      // Clear form
      amountInput.value = "";
      descriptionInput.value = "";
      categorySelect.value = "";
      subcategorySelect.value = "";
      dateInput.value = "";
    } else {
      showToast("Please fill all required fields.");
    }
  });

  // Floating Save button handler
  saveBtn.addEventListener("click", sendToGoogleSheets);

  // Preset (predefined) buttons
  const predefinedContainer = document.querySelector(".predefined-buttons");
  predefinedExpenses.forEach(exp => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = exp.description;
    btn.className = "predefined-button";
    btn.onclick = () => {
      descriptionInput.value = exp.description;
      amountInput.value = exp.amount;
      // Add options if not present
      if (![...categorySelect.options].some(o => o.value === exp.category)) {
        categorySelect.appendChild(new Option(exp.category, exp.category));
      }
      if (![...subcategorySelect.options].some(o => o.value === exp.subcategory)) {
        subcategorySelect.appendChild(new Option(exp.subcategory, exp.subcategory));
      }
      categorySelect.value = exp.category;
      subcategorySelect.value = exp.subcategory;
      // Auto-submit
      document.getElementById("add-expense-btn").click();
    };
    predefinedContainer.appendChild(btn);
  });

  // Accessibility: allow Enter key on delete buttons
  expensesTableBody.addEventListener("keydown", (e) => {
    if (e.target.classList.contains("delete-btn") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.target.click();
    }
  });

  // Initial render
  updateTable();
  updateChart();
  updateTotals();
});
