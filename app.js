// Timezone Scheduler — app logic
// Tab switching + Tab 1 (Setting): home city, date, duration, availability zone editor.

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  var MINUTES_DAY = 1440;
  var BLOCK_MINUTES = 30;        // each timeline block is 30 minutes (fixed)
  var BLOCK_PX = 48;             // pixel height of one block (fixed)
  var BLOCKS = MINUTES_DAY / BLOCK_MINUTES;  // 48 blocks always
  var TOTAL_HEIGHT = BLOCKS * BLOCK_PX;      // 2304px always
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
  var duration = 60;             // default meeting duration (affects slots, not the editor)
  var blocks = defaultBlocks();  // 48 block colors, indexed by clock (block i = [i*30, i*30+30))
  var barStart = 0;              // bar-top clock-minute (current time rounded down to a block)
  var lastClickedBlock = null;   // visual index of the first click in a rotate -> fill pair
  var lastClickedColor = null;
  var nowTimer = null;

  // Expand the default zones into a flat array of 48 block colors.
  function defaultBlocks() {
    var b = new Array(BLOCKS);
    DEFAULT_ZONES.forEach(function (z) {
      for (var m = z.start; m < z.end; m += BLOCK_MINUTES) b[m / BLOCK_MINUTES] = z.color;
    });
    return b;
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

    var inTz = cities.filter(function (c) { return c.timezone === tz; });
    // Prefer the canonical city for this timezone; otherwise fall back to the
    // first alphabetical match.
    var match = inTz.filter(function (c) { return c.preferred === true; })[0] || inTz[0];
    if (match) {
      homeCity = match;
    } else {
      homeCity = { iata: 'UTC', city: 'Universal Time', timezone: 'UTC' };
    }
  }

  function cityLabel(c) {
    return c.country ? c.city + ', ' + c.country : c.city;
  }

  function renderHomeCityField() {
    document.getElementById('home-city-iata').textContent = homeCity.iata;
    document.getElementById('home-city-name').textContent = cityLabel(homeCity);
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
             c.city.toLowerCase().indexOf(q) !== -1 ||
             (c.country && c.country.toLowerCase().indexOf(q) !== -1);
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
      name.textContent = cityLabel(c);
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
    // Duration only affects meeting-slot increments elsewhere — not the editor.
    duration = duration >= 120 ? 30 : duration + 30;
    renderDuration();
  }

  // ---------------------------------------------------------------
  // Availability zone editor
  // ---------------------------------------------------------------
  // Pixel offset (from the bar top) of an absolute minute-of-day, accounting for
  // the bar starting at barStart and wrapping past midnight.
  function offsetMinutes(absMin) {
    return ((absMin - barStart) % MINUTES_DAY + MINUTES_DAY) % MINUTES_DAY;
  }

  // Start the bar at the current home-city time, rounded DOWN to a full block.
  function computeBarStart() {
    var t = getTimeInTz(homeCity.timezone);
    var cur = t.h * 60 + t.m;
    barStart = Math.floor(cur / BLOCK_MINUTES) * BLOCK_MINUTES;
  }

  function barStartBlock() { return barStart / BLOCK_MINUTES; }
  // Map a visual block index (0 = bar top) to its clock block index.
  function visualToClock(v) { return (barStartBlock() + v) % BLOCKS; }
  function nextColor(c) { return COLORS[(COLORS.indexOf(c) + 1) % COLORS.length]; }

  // Render the 48 fixed blocks (each 30 min / 48px) from the bar top. Contiguous
  // same-colour blocks read as one zone since blocks have no borders.
  function renderBlocks() {
    var bar = document.getElementById('timeline-bar');
    bar.innerHTML = '';
    bar.style.height = TOTAL_HEIGHT + 'px';

    for (var v = 0; v < BLOCKS; v++) {
      var seg = document.createElement('div');
      seg.className = 'timeline__segment timeline__segment--' + blocks[visualToClock(v)];
      bar.appendChild(seg);
    }

    // Grid lines overlay the bar; re-added on every render so they persist.
    renderGridlines(bar);

    // Now marker lives inside the bar; re-attach it after the rebuild.
    var nm = getNowMarker();
    if (nm) { bar.appendChild(nm); positionNowMarker(); }
  }

  function clampBlock(v) { return Math.max(0, Math.min(BLOCKS - 1, v)); }
  function blockFromY(y) { return clampBlock(Math.floor(y / BLOCK_PX)); }
  function borderFromY(y) { return Math.max(0, Math.min(BLOCKS, Math.round(y / BLOCK_PX))); }

  // Single pointer handler for the whole bar: a tap rotates/fills a block, a
  // drag that starts on a colour border reassigns the blocks it sweeps across.
  function onBarPointerDown(e) {
    var bar = document.getElementById('timeline-bar');
    var rect = bar.getBoundingClientRect();
    var y0 = eventClientY(e) - rect.top;
    var startBlock = blockFromY(y0);

    // The border the pointer is nearest, and whether it separates two colours.
    var borderV = borderFromY(y0);
    var aboveColor = borderV > 0 ? blocks[visualToClock(borderV - 1)] : null;
    var belowColor = borderV < BLOCKS ? blocks[visualToClock(borderV)] : null;
    var isBoundary = borderV > 0 && borderV < BLOCKS && aboveColor !== belowColor;

    var snapshot = blocks.slice();
    var moved = false, dragged = false;
    if (e.type === 'mousedown') e.preventDefault();

    function move(ev) {
      var y = eventClientY(ev) - rect.top;
      if (y < 0) y = 0;
      if (y > TOTAL_HEIGHT) y = TOTAL_HEIGHT;
      if (Math.abs(y - y0) >= 5) moved = true;
      if (!isBoundary || !moved) return;
      ev.preventDefault();
      dragged = true;
      var bN = borderFromY(y);
      blocks = snapshot.slice();
      var i;
      if (bN > borderV) { for (i = borderV; i < bN; i++) blocks[visualToClock(i)] = aboveColor; }
      else if (bN < borderV) { for (i = bN; i < borderV; i++) blocks[visualToClock(i)] = belowColor; }
      renderBlocks();
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
      if (!moved && !dragged) handleBlockClick(startBlock);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  }

  // Click: first click rotates a block's colour; the next click fills the range
  // between the two clicked blocks with that colour, then resets.
  function handleBlockClick(v) {
    if (lastClickedBlock === null) {
      var c = visualToClock(v);
      blocks[c] = nextColor(blocks[c]);
      lastClickedColor = blocks[c];
      lastClickedBlock = v;
    } else {
      var m = Math.min(lastClickedBlock, v), n = Math.max(lastClickedBlock, v);
      for (var i = m; i <= n; i++) blocks[visualToClock(i)] = lastClickedColor;
      lastClickedBlock = null;
      lastClickedColor = null;
    }
    renderBlocks();
  }

  function eventClientY(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientY;
    return e.clientY;
  }

  function resetZones() {
    blocks = defaultBlocks();
    lastClickedBlock = null;
    lastClickedColor = null;
    renderBlocks();
  }

  // ---------------------------------------------------------------
  // Time labels + Now marker
  // ---------------------------------------------------------------
  function formatHM(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  // One label per full hour (every 2 blocks / 60 min), anchored to clock hours.
  function renderTimeLabels() {
    var labels = document.getElementById('timeline-labels');
    labels.innerHTML = '';
    labels.style.height = TOTAL_HEIGHT + 'px';
    for (var h = 0; h < 24; h++) {
      var absMin = h * 60;
      var lab = document.createElement('div');
      lab.className = 'timeline__time-label';
      lab.textContent = formatHM(absMin);
      lab.style.cssText = 'position:absolute; right:0; top:' +
        Math.round(offsetMinutes(absMin) / BLOCK_MINUTES * BLOCK_PX) + 'px; height:auto; transform:translateY(-50%);';
      labels.appendChild(lab);
    }
  }

  // One horizontal grid line per full hour (independent of the duration / labels).
  function renderGridlines(bar) {
    bar.querySelectorAll('.timeline__gridline').forEach(function (g) { g.remove(); });
    for (var h = 0; h < 24; h++) {
      var gl = document.createElement('div');
      gl.className = 'timeline__gridline';
      gl.style.top = Math.round(offsetMinutes(h * 60) / BLOCK_MINUTES * BLOCK_PX) + 'px';
      bar.appendChild(gl);
    }
  }

  // Cached so it survives bar.innerHTML clears in renderBlocks. The marker lives
  // inside the color bar so it spans the bar width only; the "Now" label sits
  // just outside the bar to the right.
  var nowMarkerEl = null;
  function getNowMarker() {
    if (!nowMarkerEl) nowMarkerEl = document.getElementById('now-marker');
    if (nowMarkerEl && !nowMarkerEl.querySelector('.now-marker__label')) {
      nowMarkerEl.innerHTML = '<div class="now-marker__label">Now</div>';
    }
    return nowMarkerEl;
  }

  function positionNowMarker(cur) {
    var marker = getNowMarker();
    if (!marker) return;
    if (cur == null) { var t = getTimeInTz(homeCity.timezone); cur = t.h * 60 + t.m; }
    marker.style.top = Math.round(offsetMinutes(cur) / BLOCK_MINUTES * BLOCK_PX) + 'px';
  }

  // Recompute the bar start each tick; re-render the timeline only when the
  // current time crosses into a new block. Always reposition the Now marker.
  function renderNow() {
    var t = getTimeInTz(homeCity.timezone);
    var cur = t.h * 60 + t.m;
    var newStart = Math.floor(cur / BLOCK_MINUTES) * BLOCK_MINUTES;
    if (newStart !== barStart) {
      barStart = newStart;
      renderTimeLabels();
      renderBlocks();
    }
    positionNowMarker(cur);
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

    // Single pointer handler on the bar drives both tap (rotate/fill) and drag.
    var bar = document.getElementById('timeline-bar');
    bar.addEventListener('mousedown', onBarPointerDown);
    bar.addEventListener('touchstart', onBarPointerDown, { passive: false });
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
    computeBarStart();
    renderTimeLabels();
    renderDuration();
    renderBlocks();
    positionNowMarker();

    loadCities().then(function () {
      detectHomeCity();
      renderHomeCityField();
      selectedDate = todayInTz(homeCity.timezone);
      renderDate();
      computeBarStart();
      renderTimeLabels();
      renderBlocks();
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
