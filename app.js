(function () {
  "use strict";

  // ====================================================================
  //  DATA
  // ====================================================================

  var ERAS = [
    { name: "令和", start: 2019, end: 9999 },
    { name: "平成", start: 1989, end: 2019 },
    { name: "昭和", start: 1926, end: 1989 },
    { name: "大正", start: 1912, end: 1926 },
    { name: "明治", start: 1868, end: 1912 },
  ];

  var JUNISHI = [
    { kanji: "子", reading: "ね", emoji: "🐭" },
    { kanji: "丑", reading: "うし", emoji: "🐮" },
    { kanji: "寅", reading: "とら", emoji: "🐯" },
    { kanji: "卯", reading: "う", emoji: "🐰" },
    { kanji: "辰", reading: "たつ", emoji: "🐲" },
    { kanji: "巳", reading: "み", emoji: "🐍" },
    { kanji: "午", reading: "うま", emoji: "🐴" },
    { kanji: "未", reading: "ひつじ", emoji: "🐏" },
    { kanji: "申", reading: "さる", emoji: "🐵" },
    { kanji: "酉", reading: "とり", emoji: "🐔" },
    { kanji: "戌", reading: "いぬ", emoji: "🐶" },
    { kanji: "亥", reading: "い", emoji: "🐗" },
  ];

  var ROKUYO = ["先勝", "友引", "先負", "仏滅", "大安", "赤口"];
  var DOW_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

  // ====================================================================
  //  ROKUYO CALCULATION (based on lunar calendar approximation)
  // ====================================================================

  // Simplified Rokuyo: uses a known lookup approach
  // Rokuyo cycles based on the lunar month+day: (lunarMonth + lunarDay - 2) % 6
  // We use a simplified conversion from solar to lunar.

  function getRokuyo(year, month, day) {
    // Approximate lunar date using a simplified algorithm
    // This is a well-known approximation for Japanese rokuyo
    var jd = gregorianToJD(year, month + 1, day);
    var lunar = jdToLunar(jd);
    var idx = (lunar.month + lunar.day - 2) % 6;
    if (idx < 0) idx += 6;
    return ROKUYO[idx];
  }

  // Julian Day Number from Gregorian date
  function gregorianToJD(y, m, d) {
    if (m <= 2) { y--; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // Simplified lunar date approximation (Metonic cycle based)
  function jdToLunar(jd) {
    // Reference: 2000-01-06 = lunar 1999/11/29
    var refJD = 2451550.5; // 2000-01-06
    var refLunarY = 1999, refLunarM = 11, refLunarD = 29;
    var SYNODIC = 29.53059;

    var diff = jd - refJD;
    // Approximate lunar day offset
    var lunarDaysSinceRef = diff;
    var monthsSinceRef = Math.floor(lunarDaysSinceRef / SYNODIC);
    var dayInMonth = Math.floor(lunarDaysSinceRef - monthsSinceRef * SYNODIC) + refLunarD;

    var lunarMonth = (refLunarM + monthsSinceRef) % 12;
    if (lunarMonth <= 0) lunarMonth += 12;

    // Normalize day within 1-30
    if (dayInMonth > 30) {
      dayInMonth -= 30;
      lunarMonth++;
      if (lunarMonth > 12) lunarMonth = 1;
    }
    if (dayInMonth < 1) dayInMonth = 1;

    return { month: lunarMonth, day: dayInMonth };
  }

  // ====================================================================
  //  JAPANESE HOLIDAYS (2000– future, rule-based)
  // ====================================================================

  function getHolidays(year) {
    var h = {};
    function add(m, d, name) {
      h[(m) + "-" + d] = name;
    }
    // Fixed holidays
    add(1, 1, "元日");
    if (year >= 2016) add(8, 11, "山の日");
    add(2, 11, "建国記念の日");
    if (year >= 2020) add(2, 23, "天皇誕生日");
    else if (year >= 1989 && year <= 2018) add(12, 23, "天皇誕生日");
    add(4, 29, "昭和の日");
    add(5, 3, "憲法記念日");
    add(5, 4, "みどりの日");
    add(5, 5, "こどもの日");
    add(11, 3, "文化の日");
    add(11, 23, "勤労感謝の日");

    // Happy Monday
    add(1, happyMonday(year, 1, 2), "成人の日");
    add(7, happyMonday(year, 7, 3), "海の日");
    add(9, happyMonday(year, 9, 3), "敬老の日");
    add(10, happyMonday(year, 10, 2), "スポーツの日");

    // Vernal equinox (approximate)
    var ve = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    add(3, ve, "春分の日");

    // Autumnal equinox (approximate)
    var ae = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    add(9, ae, "秋分の日");

    // Substitute holidays: if a holiday falls on Sunday, next Monday is a holiday
    var keys = Object.keys(h);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split("-");
      var mm = parseInt(parts[0], 10);
      var dd = parseInt(parts[1], 10);
      var dow = new Date(year, mm - 1, dd).getDay();
      if (dow === 0) {
        var subKey = mm + "-" + (dd + 1);
        if (!h[subKey]) {
          h[subKey] = "振替休日";
        }
      }
    }

    // Kokumin-no-kyujitsu: a day sandwiched between two holidays
    keys = Object.keys(h);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split("-");
      var mm = parseInt(parts[0], 10);
      var dd = parseInt(parts[1], 10);
      var nextKey = mm + "-" + (dd + 2);
      var midKey = mm + "-" + (dd + 1);
      if (h[nextKey] && !h[midKey]) {
        var midDow = new Date(year, mm - 1, dd + 1).getDay();
        if (midDow !== 0) {
          h[midKey] = "国民の休日";
        }
      }
    }

    return h;
  }

  function happyMonday(year, month, week) {
    // Returns the day of the nth Monday of the given month
    var first = new Date(year, month - 1, 1).getDay();
    var firstMon = first <= 1 ? (2 - first) : (9 - first);
    return firstMon + (week - 1) * 7;
  }

  function getHoliday(year, month, day) {
    var h = getHolidays(year);
    return h[(month + 1) + "-" + day] || null;
  }

  // ====================================================================
  //  WAREKI HELPERS
  // ====================================================================

  function getJunishiIndex(seireki) {
    return (seireki + 8) % 12;
  }

  function seirekiToWareki(seireki) {
    var results = [];
    for (var i = 0; i < ERAS.length; i++) {
      var era = ERAS[i];
      if (seireki >= era.start && seireki < era.end) {
        var y = seireki - era.start + 1;
        results.push(y === 1 ? era.name + "元年" : era.name + y + "年");
      }
    }
    if (results.length === 0) {
      return seireki < 1868 ? ["明治より前の年です"] : ["対応する和暦が見つかりません"];
    }
    return results;
  }

  function seirekiToWarekiSingle(seireki) {
    for (var i = 0; i < ERAS.length; i++) {
      var era = ERAS[i];
      if (seireki >= era.start && seireki < era.end) {
        var y = seireki - era.start + 1;
        return y === 1 ? era.name + "元年" : era.name + y + "年";
      }
    }
    return null;
  }

  function warekiToSeireki(eraName, warekiYear) {
    for (var i = 0; i < ERAS.length; i++) {
      if (ERAS[i].name === eraName) {
        var s = ERAS[i].start + warekiYear - 1;
        return s < ERAS[i].end ? s : null;
      }
    }
    return null;
  }

  // ====================================================================
  //  STATE
  // ====================================================================

  var now = new Date();
  var state = {
    year: now.getFullYear(),
    month: now.getMonth(),
    selectedDate: now,
    viewMode: "month", // "month" | "week" | "day"
  };

  // ====================================================================
  //  DOM REFERENCES
  // ====================================================================

  var calendarTitle = document.getElementById("calendar-title");
  var calendarGrid = document.getElementById("calendar-grid");
  var prevMonthBtn = document.getElementById("prev-month");
  var nextMonthBtn = document.getElementById("next-month");
  var todayBtn = document.getElementById("today-btn");
  var detailTitle = document.getElementById("detail-title");
  var detailInfo = document.getElementById("detail-info");

  // ====================================================================
  //  TAB NAVIGATION
  // ====================================================================

  var navTabs = document.querySelectorAll(".nav-tab");
  var tabContents = document.querySelectorAll(".tab-content");

  for (var i = 0; i < navTabs.length; i++) {
    navTabs[i].addEventListener("click", (function (tab) {
      return function () {
        var target = tab.getAttribute("data-tab");
        for (var j = 0; j < navTabs.length; j++) navTabs[j].classList.remove("active");
        for (var j = 0; j < tabContents.length; j++) tabContents[j].classList.remove("active");
        tab.classList.add("active");
        document.getElementById("tab-" + target).classList.add("active");
      };
    })(navTabs[i]));
  }

  // ====================================================================
  //  VIEW MODE TOGGLE
  // ====================================================================

  var viewBtns = document.querySelectorAll(".view-btn");
  for (var i = 0; i < viewBtns.length; i++) {
    viewBtns[i].addEventListener("click", (function (btn) {
      return function () {
        for (var j = 0; j < viewBtns.length; j++) viewBtns[j].classList.remove("active");
        btn.classList.add("active");
        state.viewMode = btn.getAttribute("data-view");
        renderCalendar();
      };
    })(viewBtns[i]));
  }

  // ====================================================================
  //  CALENDAR RENDER
  // ====================================================================

  function isToday(y, m, d) {
    var t = new Date();
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  }

  function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function renderCalendar() {
    if (state.viewMode === "month") renderMonth();
    else if (state.viewMode === "week") renderWeek();
    else renderDay();
  }

  // ----- Month View -----
  function renderMonth() {
    var y = state.year, m = state.month;
    calendarTitle.textContent = y + "年 " + (m + 1) + "月";
    calendarGrid.innerHTML = "";
    calendarGrid.className = "calendar-grid";

    var firstDow = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var daysInPrev = new Date(y, m, 0).getDate();
    var holidays = getHolidays(y);

    // Prev month padding
    for (var i = firstDow - 1; i >= 0; i--) {
      var d = daysInPrev - i;
      var pm = m - 1, py = y;
      if (pm < 0) { pm = 11; py--; }
      calendarGrid.appendChild(createDayCell(py, pm, d, true, getHolidays(py)));
    }

    // Current month
    for (var d = 1; d <= daysInMonth; d++) {
      calendarGrid.appendChild(createDayCell(y, m, d, false, holidays));
    }

    // Next month padding
    var total = calendarGrid.children.length;
    var rem = total % 7 === 0 ? 0 : 7 - (total % 7);
    var nm = m + 1, ny = y;
    if (nm > 11) { nm = 0; ny++; }
    var nhol = getHolidays(ny);
    for (var i = 1; i <= rem; i++) {
      calendarGrid.appendChild(createDayCell(ny, nm, i, true, nhol));
    }
  }

  function createDayCell(y, m, d, isOther, holidays) {
    var cell = document.createElement("div");
    cell.className = "day-cell";
    if (isOther) cell.classList.add("other-month");

    var dow = new Date(y, m, d).getDay();
    if (dow === 0) cell.classList.add("sunday");
    if (dow === 6) cell.classList.add("saturday");
    if (isToday(y, m, d)) cell.classList.add("today");

    var hkey = (m + 1) + "-" + d;
    var holidayName = holidays[hkey] || null;
    if (holidayName) cell.classList.add("holiday");

    if (isSameDate(new Date(y, m, d), state.selectedDate)) {
      cell.classList.add("selected");
    }

    // Day number
    var numEl = document.createElement("span");
    numEl.className = "day-num";
    numEl.textContent = d;
    cell.appendChild(numEl);

    // Rokuyo
    var rokuyo = getRokuyo(y, m, d);
    var rokuyoEl = document.createElement("span");
    rokuyoEl.className = "day-rokuyo";
    rokuyoEl.textContent = rokuyo;
    cell.appendChild(rokuyoEl);

    // Holiday name
    if (holidayName) {
      var holEl = document.createElement("span");
      holEl.className = "day-holiday";
      holEl.textContent = holidayName;
      cell.appendChild(holEl);
    }

    cell.addEventListener("click", function () {
      state.selectedDate = new Date(y, m, d);
      renderCalendar();
      renderDetail(y, m, d);
    });

    return cell;
  }

  // ----- Week View -----
  function renderWeek() {
    var sel = state.selectedDate;
    var startOfWeek = new Date(sel);
    startOfWeek.setDate(sel.getDate() - sel.getDay());

    calendarTitle.textContent = state.year + "年 " + (state.month + 1) + "月 (週表示)";
    calendarGrid.innerHTML = "";
    calendarGrid.className = "calendar-grid week-row";

    for (var i = 0; i < 7; i++) {
      var cur = new Date(startOfWeek);
      cur.setDate(startOfWeek.getDate() + i);
      var y = cur.getFullYear(), m = cur.getMonth(), d = cur.getDate();
      var holidays = getHolidays(y);

      var cell = document.createElement("div");
      cell.className = "week-cell";
      var dow = cur.getDay();
      if (dow === 0) cell.classList.add("sunday");
      if (dow === 6) cell.classList.add("saturday");
      if (isToday(y, m, d)) cell.classList.add("today");

      var hkey = (m + 1) + "-" + d;
      if (holidays[hkey]) cell.classList.add("holiday");
      if (isSameDate(cur, state.selectedDate)) cell.classList.add("selected");

      var numEl = document.createElement("span");
      numEl.className = "day-num";
      numEl.textContent = (m + 1) + "/" + d;
      cell.appendChild(numEl);

      var rokuyoEl = document.createElement("span");
      rokuyoEl.className = "day-rokuyo";
      rokuyoEl.textContent = getRokuyo(y, m, d);
      cell.appendChild(rokuyoEl);

      if (holidays[hkey]) {
        var holEl = document.createElement("span");
        holEl.className = "day-holiday";
        holEl.textContent = holidays[hkey];
        cell.appendChild(holEl);
      }

      cell.addEventListener("click", (function (yy, mm, dd) {
        return function () {
          state.selectedDate = new Date(yy, mm, dd);
          state.year = yy;
          state.month = mm;
          renderCalendar();
          renderDetail(yy, mm, dd);
        };
      })(y, m, d));

      calendarGrid.appendChild(cell);
    }
  }

  // ----- Day View -----
  function renderDay() {
    var sel = state.selectedDate;
    var y = sel.getFullYear(), m = sel.getMonth(), d = sel.getDate();
    calendarTitle.textContent = y + "年 " + (m + 1) + "月 " + d + "日";
    calendarGrid.innerHTML = "";
    calendarGrid.className = "calendar-grid";

    var dv = document.createElement("div");
    dv.className = "day-view";

    var dateEl = document.createElement("div");
    dateEl.className = "day-view-date";
    dateEl.textContent = d;
    dv.appendChild(dateEl);

    var subEl = document.createElement("div");
    subEl.className = "day-view-sub";
    subEl.textContent = y + "年" + (m + 1) + "月" + d + "日 (" + DOW_NAMES[sel.getDay()] + ")";
    dv.appendChild(subEl);

    var infoEl = document.createElement("div");
    infoEl.className = "day-view-info";

    var holiday = getHoliday(y, m, d);
    var rokuyo = getRokuyo(y, m, d);
    var wareki = seirekiToWarekiSingle(y);
    var j = JUNISHI[getJunishiIndex(y)];

    var lines = [];
    lines.push("六曜: " + rokuyo);
    if (holiday) lines.push("祝日: " + holiday);
    if (wareki) lines.push("和暦: " + wareki);
    lines.push("干支: " + j.kanji + "（" + j.reading + "）" + j.emoji);
    infoEl.innerHTML = lines.join("<br>");
    dv.appendChild(infoEl);

    calendarGrid.appendChild(dv);
  }

  // ====================================================================
  //  DETAIL PANEL
  // ====================================================================

  function renderDetail(y, m, d) {
    var date = new Date(y, m, d);
    var dow = DOW_NAMES[date.getDay()];
    var holiday = getHoliday(y, m, d);
    var rokuyo = getRokuyo(y, m, d);
    var wareki = seirekiToWarekiSingle(y);
    var j = JUNISHI[getJunishiIndex(y)];

    detailTitle.textContent = y + "年" + (m + 1) + "月" + d + "日 (" + dow + ")";

    var html = "";
    html += '<div class="detail-row"><span class="detail-label">六曜</span>';
    html += '<span class="detail-value' + (rokuyo === "大安" ? " rokuyo-taian" : "") + '">' + rokuyo + '</span></div>';

    if (holiday) {
      html += '<div class="detail-row"><span class="detail-label">祝日</span>';
      html += '<span class="detail-value holiday">' + holiday + '</span></div>';
    }

    if (wareki) {
      html += '<div class="detail-row"><span class="detail-label">和暦</span>';
      html += '<span class="detail-value">' + wareki + '</span></div>';
    }

    html += '<div class="detail-row"><span class="detail-label">干支</span>';
    html += '<span class="detail-value">' + j.kanji + '（' + j.reading + '）' + j.emoji + '</span></div>';

    detailInfo.innerHTML = html;
  }

  // ====================================================================
  //  CALENDAR NAVIGATION
  // ====================================================================

  prevMonthBtn.addEventListener("click", function () {
    if (state.viewMode === "day") {
      state.selectedDate.setDate(state.selectedDate.getDate() - 1);
      state.year = state.selectedDate.getFullYear();
      state.month = state.selectedDate.getMonth();
    } else if (state.viewMode === "week") {
      state.selectedDate.setDate(state.selectedDate.getDate() - 7);
      state.year = state.selectedDate.getFullYear();
      state.month = state.selectedDate.getMonth();
    } else {
      state.month--;
      if (state.month < 0) { state.month = 11; state.year--; }
    }
    renderCalendar();
    renderDetail(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), state.selectedDate.getDate());
  });

  nextMonthBtn.addEventListener("click", function () {
    if (state.viewMode === "day") {
      state.selectedDate.setDate(state.selectedDate.getDate() + 1);
      state.year = state.selectedDate.getFullYear();
      state.month = state.selectedDate.getMonth();
    } else if (state.viewMode === "week") {
      state.selectedDate.setDate(state.selectedDate.getDate() + 7);
      state.year = state.selectedDate.getFullYear();
      state.month = state.selectedDate.getMonth();
    } else {
      state.month++;
      if (state.month > 11) { state.month = 0; state.year++; }
    }
    renderCalendar();
    renderDetail(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), state.selectedDate.getDate());
  });

  todayBtn.addEventListener("click", function () {
    var t = new Date();
    state.year = t.getFullYear();
    state.month = t.getMonth();
    state.selectedDate = t;
    renderCalendar();
    renderDetail(t.getFullYear(), t.getMonth(), t.getDate());
  });

  // ====================================================================
  //  CONVERTER TAB
  // ====================================================================

  // 西暦 → 和暦
  var seirekiInput = document.getElementById("seireki-input");
  var seirekiBtn = document.getElementById("seireki-btn");
  var seirekiResult = document.getElementById("seireki-result");

  seirekiBtn.addEventListener("click", function () {
    var year = parseInt(seirekiInput.value, 10);
    if (!year || year <= 0) { seirekiResult.textContent = "正しい西暦を入力してください。"; return; }
    var wareki = seirekiToWareki(year);
    var j = JUNISHI[getJunishiIndex(year)];
    seirekiResult.innerHTML = wareki.join("<br>") + "<br>干支: " + j.kanji + "（" + j.reading + "）" + j.emoji;
  });
  seirekiInput.addEventListener("keydown", function (e) { if (e.key === "Enter") seirekiBtn.click(); });

  // 和暦 → 西暦
  var eraSelect = document.getElementById("era-select");
  var warekiInput = document.getElementById("wareki-input");
  var warekiBtn = document.getElementById("wareki-btn");
  var warekiResult = document.getElementById("wareki-result");

  warekiBtn.addEventListener("click", function () {
    var eraName = eraSelect.value;
    var year = parseInt(warekiInput.value, 10);
    if (!year || year <= 0) { warekiResult.textContent = "正しい年を入力してください。"; return; }
    var seireki = warekiToSeireki(eraName, year);
    if (seireki === null) {
      var lbl = year === 1 ? eraName + "元年" : eraName + year + "年";
      warekiResult.textContent = lbl + "は存在しません。";
      return;
    }
    var lbl = year === 1 ? eraName + "元年" : eraName + year + "年";
    var j = JUNISHI[getJunishiIndex(seireki)];
    warekiResult.innerHTML = lbl + " = 西暦" + seireki + "年<br>干支: " + j.kanji + "（" + j.reading + "）" + j.emoji;
  });
  warekiInput.addEventListener("keydown", function (e) { if (e.key === "Enter") warekiBtn.click(); });

  // 十二支
  var junishiInput = document.getElementById("junishi-input");
  var junishiBtn = document.getElementById("junishi-btn");
  var junishiResult = document.getElementById("junishi-result");

  junishiBtn.addEventListener("click", function () {
    var year = parseInt(junishiInput.value, 10);
    if (!year || year <= 0) { junishiResult.textContent = "正しい西暦を入力してください。"; return; }
    var j = JUNISHI[getJunishiIndex(year)];
    junishiResult.innerHTML = j.kanji + "（" + j.reading + "）" + '<span class="result-animal">' + j.emoji + "</span>";
  });
  junishiInput.addEventListener("keydown", function (e) { if (e.key === "Enter") junishiBtn.click(); });

  // Era table
  var eraTableEl = document.getElementById("era-table");
  var reversed = ERAS.slice().reverse();
  for (var i = 0; i < reversed.length; i++) {
    var era = reversed[i];
    var row = document.createElement("div");
    row.className = "era-row";
    var nameEl = document.createElement("span");
    nameEl.className = "era-name";
    nameEl.textContent = era.name;
    var rangeEl = document.createElement("span");
    rangeEl.textContent = era.end === 9999 ? era.start + "年 〜 現在" : era.start + "年 〜 " + (era.end - 1) + "年";
    row.appendChild(nameEl);
    row.appendChild(rangeEl);
    eraTableEl.appendChild(row);
  }

  // Junishi grid
  var junishiGridEl = document.getElementById("junishi-grid");
  for (var i = 0; i < JUNISHI.length; i++) {
    var j = JUNISHI[i];
    var card = document.createElement("div");
    card.className = "junishi-card";
    var emojiEl = document.createElement("span");
    emojiEl.className = "junishi-card-emoji";
    emojiEl.textContent = j.emoji;
    var nameEl = document.createElement("span");
    nameEl.className = "junishi-card-name";
    nameEl.textContent = j.kanji;
    var readingEl = document.createElement("span");
    readingEl.className = "junishi-card-reading";
    readingEl.textContent = j.reading;
    card.appendChild(emojiEl);
    card.appendChild(nameEl);
    card.appendChild(readingEl);
    junishiGridEl.appendChild(card);
  }

  // Pre-fill
  seirekiInput.value = now.getFullYear();
  junishiInput.value = now.getFullYear();

  // ====================================================================
  //  CALCULATOR TAB
  // ====================================================================

  // Days between dates
  var calcStart = document.getElementById("calc-start");
  var calcEnd = document.getElementById("calc-end");
  var calcDaysBtn = document.getElementById("calc-days-btn");
  var calcDaysResult = document.getElementById("calc-days-result");

  calcDaysBtn.addEventListener("click", function () {
    if (!calcStart.value || !calcEnd.value) {
      calcDaysResult.textContent = "両方の日付を入力してください。";
      return;
    }
    var d1 = new Date(calcStart.value);
    var d2 = new Date(calcEnd.value);
    var diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    var abs = Math.abs(diff);
    var years = Math.floor(abs / 365);
    var months = Math.floor((abs % 365) / 30);
    var days = abs % 30;
    var parts = [];
    if (years > 0) parts.push(years + "年");
    if (months > 0) parts.push(months + "ヶ月");
    parts.push(days + "日");
    calcDaysResult.innerHTML = "<strong>" + abs + "日間</strong><br>(約 " + parts.join(" ") + ")";
  });

  // Age calculator
  var birthDate = document.getElementById("birth-date");
  var calcAgeBtn = document.getElementById("calc-age-btn");
  var calcAgeResult = document.getElementById("calc-age-result");

  calcAgeBtn.addEventListener("click", function () {
    if (!birthDate.value) {
      calcAgeResult.textContent = "生年月日を入力してください。";
      return;
    }
    var bd = new Date(birthDate.value);
    var today = new Date();
    var age = today.getFullYear() - bd.getFullYear();
    var mDiff = today.getMonth() - bd.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < bd.getDate())) age--;

    // Days until next birthday
    var nextBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
    if (nextBd <= today) nextBd.setFullYear(nextBd.getFullYear() + 1);
    var daysUntil = Math.round((nextBd - today) / (1000 * 60 * 60 * 24));

    var wareki = seirekiToWarekiSingle(bd.getFullYear());
    var j = JUNISHI[getJunishiIndex(bd.getFullYear())];

    var html = "<strong>" + age + "歳</strong>";
    html += "<br>次の誕生日まで " + daysUntil + "日";
    if (wareki) html += "<br>生まれ: " + wareki;
    html += "<br>干支: " + j.kanji + "（" + j.reading + "）" + j.emoji;
    calcAgeResult.innerHTML = html;
  });

  // N days from base
  var baseDate = document.getElementById("base-date");
  var daysOffset = document.getElementById("days-offset");
  var calcOffsetBtn = document.getElementById("calc-offset-btn");
  var calcOffsetResult = document.getElementById("calc-offset-result");

  calcOffsetBtn.addEventListener("click", function () {
    if (!baseDate.value || !daysOffset.value) {
      calcOffsetResult.textContent = "基準日と日数を入力してください。";
      return;
    }
    var bd = new Date(baseDate.value);
    var offset = parseInt(daysOffset.value, 10);
    var result = new Date(bd);
    result.setDate(result.getDate() + offset);
    var ry = result.getFullYear(), rm = result.getMonth() + 1, rd = result.getDate();
    var dow = DOW_NAMES[result.getDay()];
    calcOffsetResult.innerHTML = "<strong>" + ry + "年" + rm + "月" + rd + "日 (" + dow + ")</strong>";
  });

  // Set default dates for calculator
  var todayStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  calcStart.value = todayStr;
  calcEnd.value = todayStr;
  baseDate.value = todayStr;

  // ====================================================================
  //  INIT
  // ====================================================================

  renderCalendar();
  renderDetail(now.getFullYear(), now.getMonth(), now.getDate());
})();