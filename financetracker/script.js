let categoryMap = {}; // Memory for learned categories
let sessionExpenses = [];

const form = document.getElementById('expense-form');
const expensesList = document.getElementById('session-expenses');
const pieChartCanvas = document.getElementById('pieChart');
let pieChart;

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('amount').value);
  const description = document.getElementById('description').value.trim();
  const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];

  if (!amount || !description) return;

  let category = categoryMap[description];

  if (!category) {
    category = prompt(`What category does "${description}" belong to? (e.g., Needs > Groceries)`);
    if (!category) return;
    categoryMap[description] = category;
  }

  const expense = { amount, description, date, category };
  sessionExpenses.push(expense);
  updateUI();
});

function updateUI() {
  expensesList.innerHTML = '';
  const totals = {};

  sessionExpenses.forEach((expense, index) => {
    const div = document.createElement('div');
    div.className = 'expense-item';
    div.innerHTML = `
      <span>${expense.date} - $${expense.amount} - ${expense.description} [${expense.category}]</span>
      <button onclick="deleteExpense(${index})">🗑️</button>
    `;
    expensesList.appendChild(div);

    const mainCategory = expense.category.split('>')[0].trim();
    totals[mainCategory] = (totals[mainCategory] || 0) + expense.amount;
  });

  drawPieChart(totals);
}

function deleteExpense(index) {
  sessionExpenses.splice(index, 1);
  updateUI();
}

function drawPieChart(totals) {
  const data = {
    labels: Object.keys(totals),
    datasets: [{
      label: 'Expenses by Category',
      data: Object.values(totals),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#66bb6a', '#9575cd'],
    }]
  };

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(pieChartCanvas, {
    type: 'pie',
    data,
  });
}
