// Timezone Scheduler — app logic
// Tab switching + Tab 1 (Setting): home city, date, duration, availability zone editor.

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  var MINUTES_DAY = 1440;
  var BLOCK_PX = 48;              // pixel height of one duration block
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
  var duration = 60;             // default meeting duration
  var zones = cloneZones(DEFAULT_ZONES);
  var startMin = 0;              // bar top = current time rounded down to a block
  var nowTimer = null;

  // Zones are stored as a cyclic list of { start, color }, sorted by start.
  // A zone runs from its start to the next zone's start (the last zone wraps
  // past midnight back to the first), so midnight is just another boundary.
  function cloneZones(z) {
    return z.map(function (s) { return { start: s.start, color: s.color }; });
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
    duration = duration >= 120 ? 30 : duration + 30;
    computeStartMin();
    renderDuration();
    renderTimeLabels();
    renderZones();
    positionNowMarker();
  }

  // ---------------------------------------------------------------
  // Availability zone editor
  // ---------------------------------------------------------------
  // Geometry — height scales with the selected duration (24px per block).
  function pxPerMin() { return BLOCK_PX / duration; }
  function totalHeight() { return (MINUTES_DAY / duration) * BLOCK_PX; }

  // Pixel offset (from the bar top) of an absolute minute-of-day, accounting
  // for the bar starting at startMin and wrapping past midnight.
  function offsetMinutes(absMin) {
    return ((absMin - startMin) % MINUTES_DAY + MINUTES_DAY) % MINUTES_DAY;
  }
  // Convert a pointer offset (px from bar top) back to an absolute minute-of-day.
  function pixelToAbsMin(y) {
    return ((startMin + y / pxPerMin()) % MINUTES_DAY + MINUTES_DAY) % MINUTES_DAY;
  }

  // Start the bar at the current home-city time, rounded DOWN to a full block.
  function computeStartMin() {
    var t = getTimeInTz(homeCity.timezone);
    var cur = t.h * 60 + t.m;
    startMin = Math.floor(cur / duration) * duration;
  }

  // Clock-minute where the zone after index `i` begins (cyclic).
  function nextStart(i) {
    return zones[(i + 1) % zones.length].start;
  }

  // Minutes from `from` forward to `to`, wrapping past midnight (0 -> full day).
  function forwardSpan(from, to) {
    var d = ((to - from) % MINUTES_DAY + MINUTES_DAY) % MINUTES_DAY;
    return d === 0 ? MINUTES_DAY : d;
  }

  function zoneIndexAt(absMin) {
    var n = zones.length;
    for (var i = 0; i < n; i++) {
      var s = zones[i].start, e = nextStart(i);
      if (s < e) { if (absMin >= s && absMin < e) return i; }
      else { if (absMin >= s || absMin < e) return i; } // zone wraps past midnight
    }
    return n - 1;
  }

  // Walk 24h forward from startMin, producing the visible (possibly wrapped)
  // segments. The zone containing startMin is split across the top/bottom seam.
  function buildVisualSegments() {
    var segs = [];
    var cursor = ((startMin % MINUTES_DAY) + MINUTES_DAY) % MINUTES_DAY;
    var remaining = MINUTES_DAY;
    var guard = 0;
    while (remaining > 0 && guard++ < 1000) {
      var idx = zoneIndexAt(cursor);
      var avail = forwardSpan(cursor, nextStart(idx));
      var len = Math.min(avail, remaining);
      segs.push({ color: zones[idx].color, lenMin: len, zoneIndex: idx, endsAtZoneBoundary: (len === avail) });
      cursor = (cursor + len) % MINUTES_DAY;
      remaining -= len;
    }
    return segs;
  }

  var pendingClick = null;

  function renderZones() {
    var bar = document.getElementById('timeline-bar');
    bar.innerHTML = '';
    bar.style.height = totalHeight() + 'px';

    var segs = buildVisualSegments();
    var cumMin = 0;
    var boundaries = [];

    segs.forEach(function (vs, k) {
      var topPx = Math.round(cumMin * pxPerMin());
      cumMin += vs.lenMin;
      var botPx = Math.round(cumMin * pxPerMin());

      var seg = document.createElement('div');
      seg.className = 'timeline__segment timeline__segment--' + vs.color;
      seg.style.height = (botPx - topPx) + 'px';
      seg.style.cursor = 'pointer';

      (function (zoneIndex) {
        // Single click: split zone at click position. Double click: cycle color.
        seg.addEventListener('click', function (e) {
          if (pendingClick) { return; }
          var y = e.clientY - bar.getBoundingClientRect().top;
          pendingClick = setTimeout(function () {
            pendingClick = null;
            splitZone(zoneIndex, y);
          }, 220);
        });
        seg.addEventListener('dblclick', function () {
          if (pendingClick) { clearTimeout(pendingClick); pendingClick = null; }
          cycleZoneColor(zoneIndex);
        });
      })(vs.zoneIndex);

      bar.appendChild(seg);

      // A draggable boundary sits at the bottom of this segment when it ends on
      // a real zone boundary and isn't the bottom seam. Midnight is no longer a
      // special case — it is just the boundary owned by the next zone's start.
      if (k < segs.length - 1 && vs.endsAtZoneBoundary) {
        boundaries.push({ zoneIndex: (vs.zoneIndex + 1) % zones.length, pxTop: botPx });
      }
    });

    boundaries.forEach(function (b) {
      bar.appendChild(makeBoundaryHandle(b.zoneIndex, b.pxTop));
    });

    // Grid lines overlay the bar; re-added here so they persist across
    // zone re-renders (drag, split, color cycle, reset).
    renderGridlines(bar);

    // Now marker lives inside the bar so it spans the bar width only; re-attach
    // it after the bar is rebuilt, then restore its position.
    var nm = getNowMarker();
    if (nm) { bar.appendChild(nm); positionNowMarker(); }
  }

  function makeBoundaryHandle(index, pxTop) {
    var handle = document.createElement('div');
    handle.style.cssText = 'position:absolute; left:0; width:100%; height:8px; top:' +
      (pxTop - 4) + 'px; cursor:ns-resize; z-index:5;';

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
    // Hold the zone object so we can follow it even after the array is re-sorted
    // (a boundary may wrap past midnight, changing array order).
    var movingZone = zones[index];

    function move(ev) {
      ev.preventDefault();
      var H = totalHeight();
      var y = eventClientY(ev) - bar.getBoundingClientRect().top;
      // Clamp to the bar edges (0 and total height).
      if (y < 0) y = 0;
      if (y > H) y = H;

      var n = zones.length;
      var j = zones.indexOf(movingZone);
      if (j < 0) return;
      var prev = zones[(j - 1 + n) % n];  // boundary above (start of the zone before)
      var next = zones[(j + 1) % n];      // boundary below (start of the zone after)

      // Signed position straight from the pointer (no abs) so the boundary
      // tracks the cursor both up and down.
      var raw = Math.round(pixelToAbsMin(y) / SNAP) * SNAP;

      // Clamp within the neighbouring boundaries (cyclically), keeping each
      // adjacent zone at least one duration block. Works uniformly for every
      // boundary, including midnight.
      var span = forwardSpan(prev.start, next.start);
      var off = ((raw - prev.start) % MINUTES_DAY + MINUTES_DAY) % MINUTES_DAY;
      if (off < duration) off = duration;
      if (off > span - duration) off = span - duration;

      movingZone.start = (prev.start + off) % MINUTES_DAY;
      zones.sort(function (a, b) { return a.start - b.start; });
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
    var minutes = Math.round(pixelToAbsMin(y) / SNAP) * SNAP;
    // need room for a zone on each side of the new boundary (cyclic-aware)
    var toStart = forwardSpan(zone.start, minutes);
    var toEnd = forwardSpan(minutes, nextStart(index));
    if (toStart < SNAP || toEnd < SNAP) return;
    zones.push({ start: minutes, color: zone.color });
    zones.sort(function (a, b) { return a.start - b.start; });
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
  function formatHM(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  // One label per duration block, starting at startMin and wrapping past midnight.
  function renderTimeLabels() {
    var labels = document.getElementById('timeline-labels');
    var h = totalHeight();
    labels.innerHTML = '';
    labels.style.height = h + 'px';

    var blocks = MINUTES_DAY / duration;
    for (var k = 0; k <= blocks; k++) {
      var absMin = (startMin + k * duration) % MINUTES_DAY;
      var lab = document.createElement('div');
      lab.className = 'timeline__time-label';
      lab.textContent = formatHM(absMin);
      lab.style.cssText = 'position:absolute; right:0; top:' + (k * BLOCK_PX) + 'px; height:auto; transform:translateY(-50%);';
      labels.appendChild(lab);
    }
  }

  // One horizontal grid line per full hour (independent of the duration / labels).
  function renderGridlines(bar) {
    bar.querySelectorAll('.timeline__gridline').forEach(function (g) { g.remove(); });
    for (var h = 0; h < 24; h++) {
      var gl = document.createElement('div');
      gl.className = 'timeline__gridline';
      gl.style.top = Math.round(offsetMinutes(h * 60) * pxPerMin()) + 'px';
      bar.appendChild(gl);
    }
  }

  // Cached so it survives bar.innerHTML clears in renderZones. The marker lives
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
    marker.style.top = Math.round(offsetMinutes(cur) * pxPerMin()) + 'px';
  }

  // Recompute the bar start each tick; re-render the timeline only when the
  // current time crosses into a new block. Always reposition the Now marker.
  function renderNow() {
    var t = getTimeInTz(homeCity.timezone);
    var cur = t.h * 60 + t.m;
    var newStart = Math.floor(cur / duration) * duration;
    if (newStart !== startMin) {
      startMin = newStart;
      renderTimeLabels();
      renderZones();
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
    computeStartMin();
    renderTimeLabels();
    renderDuration();
    renderZones();
    positionNowMarker();

    loadCities().then(function () {
      detectHomeCity();
      renderHomeCityField();
      selectedDate = todayInTz(homeCity.timezone);
      renderDate();
      computeStartMin();
      renderTimeLabels();
      renderZones();
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
