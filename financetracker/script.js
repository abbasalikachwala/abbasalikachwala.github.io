document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("expense-form");
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  const dateInput = document.getElementById("date");
  const expensesTableBody = document.querySelector("#expenses-table tbody");
  const totalsContainer = document.getElementById("totals");
  const ctx = document.getElementById("category-chart").getContext("2d");

  const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxbNt1VZwrvXZ3lycjMkL2PHSxqZXkgDFy2MlkpJaNuplrcx8-Uvv-OpEvQCGZlQ_mahg/exec"; // <-- Replace with your Apps Script URL

  let chart;
  const expenses = [];

  function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const options = { day: "numeric", month: "long", year: "numeric" };
    return date.toLocaleDateString("en-GB", options);
  }

  function updateTable() {
    expensesTableBody.innerHTML = "";
    expenses.forEach((exp, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDateDisplay(exp.date)}</td>
        <td>${exp.description}</td>
        <td>${exp.category} > ${exp.subcategory}</td>
        <td>$${exp.amount.toFixed(2)}</td>
        <td><button onclick="deleteExpense(${index})">Delete</button></td>
      `;
      expensesTableBody.appendChild(row);
    });
  }

  function updateChart() {
    const totals = {};
    expenses.forEach(({ category, amount }) => {
      totals[category] = (totals[category] || 0) + amount;
    });

    const data = {
      labels: Object.keys(totals),
      datasets: [{
        label: "Spending by Category",
        data: Object.values(totals),
        backgroundColor: [
          "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"
        ]
      }]
    };

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "pie",
      data: data
    });
  }

  function updateTotals() {
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    totalsContainer.innerHTML = `<h3>Total: $${totalAmount.toFixed(2)}</h3>`;
  }

  function addExpense({ amount, description, category, subcategory, date }) {
    const entry = { amount, description, category, subcategory, date };
    expenses.push(entry);
    updateTable();
    updateChart();
    updateTotals();
  }

  function sendToGoogleSheets(entry) {
    fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(entry),
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log("Sent to Google Sheets:", data);
    })
    .catch(err => {
      console.error("Google Sheets error:", err);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const category = categorySelect.value.trim() || "Uncategorised";
    const subcategory = subcategorySelect.value.trim() || "Uncategorised";
    const date = dateInput.value || new Date().toISOString().split("T")[0];

    if (!isNaN(amount) && description) {
      const entry = { amount, description, category, subcategory, date };
      addExpense(entry);
      sendToGoogleSheets(entry);

      // Clear form
      amountInput.value = "";
      descriptionInput.value = "";
      categorySelect.value = "";
      subcategorySelect.value = "";
      dateInput.value = "";
    }
  });

  window.deleteExpense = function(index) {
    expenses.splice(index, 1);
    updateTable();
    updateChart();
    updateTotals();
  };

  // Predefined Expenses
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

  const predefinedContainer = document.querySelector(".predefined-buttons");

  predefinedExpenses.forEach(exp => {
    const btn = document.createElement("button");
    btn.textContent = exp.description;
    btn.classList.add("predefined-button");
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
});
