(() => {
const TARGET = {
  date: new Date(2025, 5, 18, 18, 50, 0),
  label: "Countdown to",
  datetime: "<span class='countdown-date'>18th June 2025, 6:50 PM</span>"
};
document.getElementById("countdown-title").innerHTML = `${TARGET.label}<br>${TARGET.datetime}`;

  const targetDateUTC = new Date(Date.UTC(
    TARGET.date.getFullYear(),
    TARGET.date.getMonth(),
    TARGET.date.getDate(),
    TARGET.date.getHours(),
    TARGET.date.getMinutes(),
    TARGET.date.getSeconds()
  ));

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

  // --- COUNTDOWN TIMER ---
 // Get current time in New Zealand time zone
const nowNZ = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
const distance = targetDateUTC - nowNZ;
  
    if (distance < 0) {
      clearInterval(countdownInterval);
      countdownElements.countdown.textContent = "EXPIRED";
      return;
    }
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    countdownElements.days.textContent = days;
    countdownElements.hours.textContent = hours;
    countdownElements.minutes.textContent = minutes;
    countdownElements.seconds.textContent = seconds;
  };
  const countdownInterval = setInterval(updateCountdown, 1000);
  updateCountdown();

  // --- CALENDAR GENERATION ---
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  function createCell(content, classes = []) {
    const cell = document.createElement("td");
    if (content !== "") {
      const cellDiv = document.createElement("div");
      cellDiv.textContent = content;
      classes.forEach(cls => cell.classList.add(cls));
      cell.appendChild(cellDiv);
    }
    return cell;
  }

  const generateCalendar = (month, year) => {
    const { calendarBody, monthAndYear } = calendarElements;
    calendarBody.innerHTML = "";
    monthAndYear.textContent = `${months[month]} ${year}`;

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let date = 1;
    for (let i = 0; i < 6; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          row.appendChild(createCell(""));
        } else if (date > daysInMonth) {
          row.appendChild(createCell(""));
        } else {
          let classes = [];
          if (
            year === TARGET.date.getFullYear() &&
            month === TARGET.date.getMonth() &&
            date === TARGET.date.getDate()
          ) classes.push("target");
          if (
            year === today.getFullYear() &&
            month === today.getMonth() &&
            date === today.getDate()
          ) classes.push("present");
          else if (
            year < today.getFullYear() ||
            (year === today.getFullYear() && month < today.getMonth()) ||
            (year === today.getFullYear() && month === today.getMonth() && date < today.getDate())
          ) classes.push("past");
          else classes.push("future");
          row.appendChild(createCell(date, classes));
          date++;
        }
      }
      calendarBody.appendChild(row);
      if (date > daysInMonth) break;
    }
  };

  generateCalendar(currentMonth, currentYear);

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

  // --- REAL-TIME CLOCKS ---
  const updateTime = () => {
    const now = new Date();
    const indiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    timeElements.india.textContent = indiaTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
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
