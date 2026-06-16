// Timezone Scheduler — tab switching
// Foundation: switch the active tab and update the nav underline.
// Feature logic is added tab by tab in later commits.

(function () {
  'use strict';

  function activateTab(tabId) {
    var tabs = document.querySelectorAll('.nav__tab');
    var panels = document.querySelectorAll('.tab-content');

    tabs.forEach(function (tab) {
      var isActive = tab.dataset.tab === tabId;
      tab.classList.toggle('nav__tab--active', isActive);
    });

    panels.forEach(function (panel) {
      var isActive = panel.id === tabId;
      panel.classList.toggle('active', isActive);
    });
  }

  function init() {
    var tabs = document.querySelectorAll('.nav__tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateTab(tab.dataset.tab);
      });
    });

    // Setting tab is active on load.
    activateTab('tab-setting');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
