// Timezone Scheduler — app logic
// Tab switching + Tab 1 (Setting): home city, date, duration, availability zone editor.

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  var TIMELINE_PX = 480;          // total timeline height (24h)
  var MINUTES_DAY = 1440;
  var PX_PER_MIN = TIMELINE_PX / MINUTES_DAY; // = 1/3 px per minute (20px/hour)
  var SNAP = 30;                  // zone boundary snap, in minutes
  var COLORS = ['red', 'yellow', 'lgreen', 'dgreen'];

  var DEFAULT_ZONES = [
    { start: 0,    end: 390,  color: 'red' },    // 00:00–06:30
    { start: 390,  end: 480,  color: 'yellow' }, // 06:30–08:00
    { start: 480,  end: 570,  color: 'lgreen' }, // 08:00–09:30
    { start: 570,  end: 720,  color: 'dgreen' }, // 09:30–12:00
    { start: 720,  end: 780,  color: 'yellow' }, // 12:00–13:00
    { start: 780,  end: 990,  color: 'dgreen' }, // 13:00–16:30
    { start: 990,  end: 1170, color: 'lgreen' }, // 16:30–19:30
    { start: 1170, end: 1290, color: 'yellow' }, // 19:30–21:30
    { start: 1290, end: 1440, color: 'red' }     // 21:30–24:00
  ];

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  var cities = [];
  var homeCity = { iata: 'UTC', city: 'Universal Time', timezone: 'UTC' };
  var selectedDate = null;        // 'yyyy-mm-dd'
  var dateManuallySet = false;
  var duration = 30;
  var zones = cloneZones(DEFAULT_ZONES);
  var nowTimer = null;

  function cloneZones(z) {
    return z.map(function (s) { return { start: s.start, end: s.end, color: s.color }; });
  }

  // ---------------------------------------------------------------
  // Tab switching
  // ---------------------------------------------------------------
  function activateTab(tabId) {
    document.querySelectorAll('.nav__tab').forEach(function (tab) {
      tab.classList.toggle('nav__tab--active', tab.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === tabId);
    });
  }

  // ---------------------------------------------------------------
  // Time helpers (timezone-aware via Intl)
  // ---------------------------------------------------------------
  function getTimeInTz(tz) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') m = parseInt(p.value, 10);
    });
    return { h: h, m: m };
  }

  function todayInTz(tz) {
    // en-CA yields yyyy-mm-dd
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  }

  function formatDateLabel(ymd) {
    var parts = ymd.split('-');
    var dt = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12, 0, 0));
    var s = new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    }).format(dt);
    return s.replace(/,/g, '');
  }

  // ---------------------------------------------------------------
  // Home city
  // ---------------------------------------------------------------
  function detectHomeCity() {
    var tz = 'UTC';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) { /* keep UTC */ }

    var match = cities.filter(function (c) { return c.timezone === tz; })[0];
    if (match) {
      homeCity = match;
    } else {
      homeCity = { iata: 'UTC', city: 'Universal Time', timezone: 'UTC' };
    }
  }

  function renderHomeCityField() {
    document.getElementById('home-city-iata').textContent = homeCity.iata;
    document.getElementById('home-city-name').textContent = homeCity.city;
  }

  function setHomeCity(city) {
    homeCity = city;
    renderHomeCityField();
    if (!dateManuallySet) {
      selectedDate = todayInTz(homeCity.timezone);
      renderDate();
    }
    renderNow();
  }

  // ---------------------------------------------------------------
  // City picker dropdown
  // ---------------------------------------------------------------
  function openCityDropdown() {
    var dd = document.getElementById('city-dropdown');
    dd.style.display = 'block';
    var search = document.getElementById('city-search');
    search.value = '';
    renderCityResults('');
    search.focus();
  }

  function closeCityDropdown() {
    document.getElementById('city-dropdown').style.display = 'none';
  }

  function renderCityResults(query) {
    var q = query.trim().toLowerCase();
    var results = document.getElementById('city-results');
    results.innerHTML = '';

    var matches = cities.filter(function (c) {
      if (!q) return true;
      return c.iata.toLowerCase().indexOf(q) === 0 ||
             c.city.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);

    if (!matches.length) {
      var none = document.createElement('div');
      none.textContent = 'No matches';
      none.style.cssText = 'padding:6px 10px; font-size:11px; color:var(--grey-mid);';
      results.appendChild(none);
      return;
    }

    matches.forEach(function (c) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:6px 10px; cursor:pointer; display:flex; gap:6px; align-items:baseline;';
      var code = document.createElement('span');
      code.className = 'field__iata';
      code.textContent = c.iata;
      var name = document.createElement('span');
      name.className = 'field__city-name';
      name.textContent = c.city;
      row.appendChild(code);
      row.appendChild(name);
      row.addEventListener('mouseenter', function () { row.style.background = 'var(--tag-bg)'; });
      row.addEventListener('mouseleave', function () { row.style.background = ''; });
      row.addEventListener('mousedown', function (e) {
        e.preventDefault(); // keep focus handling predictable
        setHomeCity(c);
        closeCityDropdown();
      });
      results.appendChild(row);
    });
  }

  // ---------------------------------------------------------------
  // Date
  // ---------------------------------------------------------------
  function renderDate() {
    document.getElementById('date-display').textContent = formatDateLabel(selectedDate);
    document.getElementById('date-input').value = selectedDate;
  }

  // ---------------------------------------------------------------
  // Duration
  // ---------------------------------------------------------------
  function renderDuration() {
    document.getElementById('duration-display').textContent = duration + ' Min';
  }

  function cycleDuration() {
    duration = duration >= 120 ? 30 : duration + 30;
    renderDuration();
  }

  // ---------------------------------------------------------------
  // Availability zone editor
  // ---------------------------------------------------------------
  function px(minutes) { return Math.round(minutes * PX_PER_MIN); }

  var pendingClick = null;

  function renderZones() {
    var bar = document.getElementById('timeline-bar');
    bar.innerHTML = '';

    zones.forEach(function (zone, i) {
      var seg = document.createElement('div');
      seg.className = 'timeline__segment timeline__segment--' + zone.color;
      seg.style.height = (px(zone.end) - px(zone.start)) + 'px';
      seg.style.cursor = 'pointer';

      // Single click: split zone at click position. Double click: cycle color.
      seg.addEventListener('click', function (e) {
        if (pendingClick) { return; }
        var y = e.clientY - bar.getBoundingClientRect().top;
        pendingClick = setTimeout(function () {
          pendingClick = null;
          splitZone(i, y);
        }, 220);
      });
      seg.addEventListener('dblclick', function () {
        if (pendingClick) { clearTimeout(pendingClick); pendingClick = null; }
        cycleZoneColor(i);
      });

      bar.appendChild(seg);
    });

    // Boundary drag handles (internal boundaries only)
    for (var i = 0; i < zones.length - 1; i++) {
      bar.appendChild(makeBoundaryHandle(i));
    }
  }

  function makeBoundaryHandle(index) {
    var handle = document.createElement('div');
    var y = px(zones[index].end);
    handle.style.cssText = 'position:absolute; left:0; width:100%; height:8px; top:' +
      (y - 4) + 'px; cursor:ns-resize; z-index:5;';

    // Grab line: hidden by default so zone blocks read as clean borderless
    // color blocks; revealed on hover as a drag affordance.
    var line = document.createElement('div');
    line.style.cssText = 'position:absolute; left:0; right:0; top:3px; height:1px; background:rgba(0,0,0,0.35); opacity:0; transition:opacity 0.12s ease;';
    handle.appendChild(line);

    handle.addEventListener('mouseenter', function () { line.style.opacity = '1'; });
    handle.addEventListener('mouseleave', function () { line.style.opacity = '0'; });
    handle.addEventListener('mousedown', function (e) { startBoundaryDrag(e, index); });
    handle.addEventListener('touchstart', function (e) { startBoundaryDrag(e, index); }, { passive: false });
    // prevent split-click when interacting with a boundary
    handle.addEventListener('click', function (e) { e.stopPropagation(); });
    return handle;
  }

  function eventClientY(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientY;
    return e.clientY;
  }

  function startBoundaryDrag(e, index) {
    e.preventDefault();
    e.stopPropagation();
    var bar = document.getElementById('timeline-bar');

    function move(ev) {
      ev.preventDefault();
      var y = eventClientY(ev) - bar.getBoundingClientRect().top;
      var minutes = Math.round((y / PX_PER_MIN) / SNAP) * SNAP;
      var min = zones[index].start + SNAP;
      var max = zones[index + 1].end - SNAP;
      if (minutes < min) minutes = min;
      if (minutes > max) minutes = max;
      zones[index].end = minutes;
      zones[index + 1].start = minutes;
      renderZones();
    }

    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  }

  function splitZone(index, y) {
    var zone = zones[index];
    var minutes = Math.round((y / PX_PER_MIN) / SNAP) * SNAP;
    // need room for a zone on each side
    if (minutes < zone.start + SNAP || minutes > zone.end - SNAP) return;
    zones.splice(index, 1,
      { start: zone.start, end: minutes, color: zone.color },
      { start: minutes, end: zone.end, color: zone.color });
    renderZones();
  }

  function cycleZoneColor(index) {
    var next = (COLORS.indexOf(zones[index].color) + 1) % COLORS.length;
    zones[index].color = COLORS[next];
    renderZones();
  }

  function resetZones() {
    zones = cloneZones(DEFAULT_ZONES);
    renderZones();
  }

  // ---------------------------------------------------------------
  // Time labels + Now marker
  // ---------------------------------------------------------------
  function renderTimeLabels() {
    var labels = document.getElementById('timeline-labels');
    labels.innerHTML = '';
    for (var h = 0; h <= 24; h += 2) {
      var lab = document.createElement('div');
      lab.className = 'timeline__time-label';
      lab.textContent = (h < 10 ? '0' + h : h) + ':00';
      lab.style.cssText = 'position:absolute; right:0; top:' + (h * 20) + 'px; height:auto; transform:translateY(-50%);';
      labels.appendChild(lab);
    }
  }

  function renderNow() {
    var t = getTimeInTz(homeCity.timezone);
    var minutes = t.h * 60 + t.m;
    var marker = document.getElementById('now-marker');
    if (marker) marker.style.top = px(minutes) + 'px';
  }

  // ---------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------
  function wireSettingTab() {
    document.getElementById('home-city-field').addEventListener('click', openCityDropdown);
    document.getElementById('city-search').addEventListener('input', function (e) {
      renderCityResults(e.target.value);
    });
    document.addEventListener('click', function (e) {
      var dd = document.getElementById('city-dropdown');
      var field = document.getElementById('home-city-field');
      if (dd && dd.style.display === 'block' &&
          !dd.contains(e.target) && !field.contains(e.target)) {
        closeCityDropdown();
      }
    });

    var dateField = document.getElementById('date-field');
    var dateInput = document.getElementById('date-input');
    dateField.addEventListener('click', function () {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.focus();
        dateInput.click();
      }
    });
    dateInput.addEventListener('change', function () {
      if (dateInput.value) {
        selectedDate = dateInput.value;
        dateManuallySet = true;
        renderDate();
      }
    });

    document.getElementById('duration-field').addEventListener('click', cycleDuration);
    document.getElementById('reset-zones-btn').addEventListener('click', resetZones);
    document.getElementById('next-cities-btn').addEventListener('click', function () {
      activateTab('tab-cities');
    });
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  function loadCities() {
    return fetch('cities.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { cities = data; })
      .catch(function () { cities = []; });
  }

  function init() {
    document.querySelectorAll('.nav__tab').forEach(function (tab) {
      tab.addEventListener('click', function () { activateTab(tab.dataset.tab); });
    });
    activateTab('tab-setting');

    wireSettingTab();
    renderTimeLabels();
    renderDuration();
    renderZones();

    loadCities().then(function () {
      detectHomeCity();
      renderHomeCityField();
      selectedDate = todayInTz(homeCity.timezone);
      renderDate();
      renderNow();
    });

    nowTimer = setInterval(renderNow, 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
