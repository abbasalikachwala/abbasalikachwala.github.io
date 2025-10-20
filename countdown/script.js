(() => {
  // --- TARGET DATE SETUP (NZ TIME) ---
  const TARGET = {
    year: 2025,
    monthIndex: 11, // December
    day: 23,
    hour: 23,
    minute: 50,
    second: 0,
    label: "Countdown to",
    datetime: "<span class='countdown-date'>23rd December 2025, 11:50 PM</span>"
  };
  document.getElementById("countdown-title").innerHTML = `${TARGET.label}<br>${TARGET.datetime}`;

  // --- HELPERS ---
  // Get ms since epoch for now in NZ timezone
  function getNowInNZMillis() {
    const now = new Date();
    const nzString = now.toLocaleString("en-US", { timeZone: "Pacific/Auckland" });
    return new Date(nzString).getTime();
  }
  // Get ms since epoch for TARGET in NZ timezone (interpreted as local NZ time)
  function getNZTargetMillis(year, monthIndex, day, hour, minute, second) {
    // Format as YYYY-MM-DDTHH:mm:ss
    const t = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    // Parse as if in NZ
    return Date.parse(new Date(t).toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
  }
  const targetNZMillis = getNZTargetMillis(TARGET.year, TARGET.monthIndex, TARGET.day, TARGET.hour, TARGET.minute, TARGET.second);

  // --- COUNTDOWN TIMER ---
  const countdownElements = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
    countdown: document.getElementById("countdown")
  };

  function updateCountdown() {
    const nowNZMillis = getNowInNZMillis();
    const distance = targetNZMillis - nowNZMillis;

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
  }
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

  const calendarElements = {
    calendarBody: document.getElementById("calendar-body"),
    monthAndYear: document.getElementById("monthAndYear"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next")
  };

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

  function generateCalendar(month, year) {
    const { calendarBody, monthAndYear } = calendarElements;
    calendarBody.innerHTML = "";
    monthAndYear.textContent = `${months[month]} ${year}`;

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1; // Make Monday = 0
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
            year === TARGET.year &&
            month === TARGET.monthIndex &&
            date === TARGET.day
          ) classes.push("target");
          const todayLocal = new Date();
          if (
            year === todayLocal.getFullYear() &&
            month === todayLocal.getMonth() &&
            date === todayLocal.getDate()
          ) {
            classes.push("present");
          }
          else if (
            year < todayLocal.getFullYear() ||
            (year === todayLocal.getFullYear() && month < todayLocal.getMonth()) ||
            (year === todayLocal.getFullYear() && month === todayLocal.getMonth() && date < todayLocal.getDate())
          ) {
            classes.push("past");
          } else {
            classes.push("future");
          }
          row.appendChild(createCell(date, classes));
          date++;
        }
      }
      calendarBody.appendChild(row);
      if (date > daysInMonth) break;
    }
  }

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
  const timeElements = {
    india: document.getElementById("india"),
    newzealand: document.getElementById("newzealand")
  };

  function updateTime() {
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
  }
  setInterval(updateTime, 1000);
  updateTime();
})();

