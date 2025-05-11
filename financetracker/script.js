// script.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("expense-form");
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");
  const expensesTable = document.getElementById("expenses-table");
  const totalsContainer = document.getElementById("totals");
  const ctx = document.getElementById("category-chart").getContext("2d");
  let chart;

  const expenses = [];

  function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).replace(/ /g, " ");
  }

  function updateTable() {
    expensesTable.innerHTML = "";
    expenses.forEach((exp, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${exp.amount.toFixed(2)}</td>
        <td>${exp.description}</td>
        <td>${exp.category}</td>
        <td>${formatDate(new Date(exp.date))}</td>
        <td><button onclick="deleteExpense(${index})">Delete</button></td>
      `;
      expensesTable.appendChild(row);
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
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40"
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const category = categoryInput.value.trim() || "Uncategorised";
    const date = new Date();

    if (!isNaN(amount) && description) {
      expenses.push({ amount, description, category, date });
      updateTable();
      updateChart();
      updateTotals();

      // Clear form
      amountInput.value = "";
      descriptionInput.value = "";
      categoryInput.value = "";
    }
  });

  window.deleteExpense = function(index) {
    expenses.splice(index, 1);
    updateTable();
    updateChart();
    updateTotals();
  };

  // Predefined buttons logic
  const predefinedExpenses = [
  { description: 'Rent', amount: 830, category: 'Housing', subcategory: 'Needs' },
  { description: '2degrees', amount: 100.5, category: 'Utilities', subcategory: 'Needs' },
  { description: 'Kernel', amount: 200, category: 'Investments', subcategory: 'Investments' },
  { description: 'RaboBank Gold', amount: 100, category: 'Investments', subcategory: 'Investments' },
  { description: 'RaboBank Savings', amount: 50, category: 'Savings', subcategory: 'Savings' },
  { description: 'ASB Credit Card', amount: 123.62, category: 'Debt Repayment', subcategory: 'Wants' },
  { description: 'ASB Spending', amount: 100, category: 'Entertainment', subcategory: 'Wants' },
  { description: 'Car Insurance', amount: 41.75, category: 'Insurance', subcategory: 'Needs' },
  { description: 'Lotto Syndicate', amount: 4, category: 'Gambling', subcategory: 'Wants' }
];

predefinedExpenses.forEach(exp => {
  const btn = document.createElement('button');
  btn.textContent = exp.description;
  btn.classList.add('predefined-button');
  btn.onclick = () => {
    document.getElementById('description').value = exp.description;
    document.getElementById('amount').value = exp.amount;

    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');

    // Add new category if not present
    if (![...categorySelect.options].some(o => o.value === exp.category)) {
      const newOpt = new Option(exp.category, exp.category);
      categorySelect.add(newOpt);
    }

    // Add new subcategory if not present
    if (![...subcategorySelect.options].some(o => o.value === exp.subcategory)) {
      const newOpt = new Option(exp.subcategory, exp.subcategory);
      subcategorySelect.add(newOpt);
    }

    categorySelect.value = exp.category;
    subcategorySelect.value = exp.subcategory;

    // Auto-submit the form
    document.getElementById('add-expense-btn').click();
  };
  document.getElementById('predefined-buttons').appendChild(btn);
});
