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
  const predefined = [
    { name: "Rent", amount: 1000, category: "Needs" },
    { name: "Netflix", amount: 15, category: "Wants" },
    { name: "Credit Card", amount: 300, category: "Debt" },
  ];

  const buttonContainer = document.getElementById("predefined-buttons");
  predefined.forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = item.name;
    btn.addEventListener("click", () => {
      expenses.push({
        amount: item.amount,
        description: item.name,
        category: item.category,
        date: new Date()
      });
      updateTable();
      updateChart();
      updateTotals();
    });
    buttonContainer.appendChild(btn);
  });
});
