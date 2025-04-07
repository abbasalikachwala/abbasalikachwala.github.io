(() => {
  // -----------------------------
  // CONFIGURATION & TIME SETTINGS
  // -----------------------------
  
  // Target: June 18, 2025 18:50 NZT = June 18, 2025 06:50 UTC (NZT is UTC+12 in June)
  const targetDate = new Date(Date.UTC(2025, 5, 18, 6, 50, 0)); // Month is zero-indexed: 5 = June
  console.log("Target Date (UTC):", targetDate.toUTCString());

  // -----------------------------
  // DOM ELEMENTS
  // -----------------------------
  
  const countdownElements = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
    countdown: document.getElementById("countdown")
  };

  const calendarElements = {
    calendarBody: document.getElementById("calendar-body"),
    monthAndYear: document.getElementById("monthAndYear"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next")
  };

  const timeElements = {
    india: document.getElementById("india"),
    newzealand: document.getElementById("newzealand")
  };

  // -----------------------------
  // COUNTDOWN TIMER
  // -----------------------------
  
  const updateCountdown = () => {
    const now = new Date();
    const distance = targetDate - now;
    console.log("Current Time (UTC):", now.toUTCString(), "| Distance (ms):", distance);

    if (distance < 0) {
      clearInterval(countdownInterval);
      countdownElements.countdown.textContent = "EXPIRED";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Update DOM
    countdownElements.days.textContent = days;
    countdownElements.hours.textContent = hours;
    countdownElements.minutes.textContent = minutes;
    countdownElements.seconds.textContent = seconds;
  };

  const countdownInterval = setInterval(updateCountdown, 1000);
  updateCountdown();

  // -----------------------------
  // CALENDAR GENERATION
  // -----------------------------
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  const generateCalendar = (month, year) => {
    const { calendarBody, monthAndYear } = calendarElements;
    calendarBody.innerHTML = ""; // Clear previous calendar
    monthAndYear.textContent = `${months[month]} ${year}`;

    // Get the first day of the month (adjusted to start on Monday)
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1;

    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let date = 1;
    // Generate calendar rows (up to 6 weeks)
    for (let i = 0; i < 6; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < 7; j++) {
        const cell = document.createElement("td");
        if (i === 0 && j < firstDay) {
          // Empty cell before the first day of month
          cell.textContent = "";
        } else if (date > daysInMonth) {
          break;
        } else {
          const cellDiv = document.createElement("div");
          cellDiv.textContent = date;
          // Determine cell classes
          if (
            year === today.getFullYear() &&
            month === today.getMonth() &&
            date === today.getDate()
          ) {
            cell.classList.add("present");
          } else if (
            year < today.getFullYear() ||
            (year === today.getFullYear() && month < today.getMonth()) ||
            (year === today.getFullYear() && month === today.getMonth() && date < today.getDate())
          ) {
            cell.classList.add("past");
          } else {
            cell.classList.add("future");
          }
          cell.appendChild(cellDiv);
          date++;
        }
        row.appendChild(cell);
      }
      calendarBody.appendChild(row);
      if (date > daysInMonth) break;
    }
  };

  // Initialize calendar
  generateCalendar(currentMonth, currentYear);

  // Navigation event listeners
  calendarElements.prev.addEventListener("click", () => {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    generateCalendar(currentMonth, currentYear);
  });

  calendarElements.next.addEventListener("click", () => {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    generateCalendar(currentMonth, currentYear);
  });

  // -----------------------------
  // REAL-TIME CLOCKS
  // -----------------------------
  
  const updateTime = () => {
    const now = new Date();
    
    // Time in India (Asia/Kolkata)
    const indiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    timeElements.india.textContent = indiaTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    // Time in New Zealand (Pacific/Auckland)
    const nzTime = new Date(now.toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
    timeElements.newzealand.textContent = nzTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  setInterval(updateTime, 1000);
  updateTime();

})();

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

// On load, set the theme from saved preference
window.addEventListener('DOMContentLoaded', () => {
  const darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) document.body.classList.add("dark");

  updateProgress();
  updateMilestoneMessage();
});

function updateProgress() {
  const targetDate = new Date('2025-12-31'); // CHANGE THIS
  const now = new Date();
  const total = targetDate - new Date('2025-01-01'); // Start date
  const progress = now - new Date('2025-01-01');
  const percentage = Math.min(100, Math.max(0, (progress / total) * 100));

  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  if (progressBar && progressText) {
    progressBar.style.width = percentage + "%";
    progressText.innerText = `Progress: ${percentage.toFixed(2)}% complete`;
  }
}
