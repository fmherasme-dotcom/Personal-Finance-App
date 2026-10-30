(function () {
  var k = 'reclaim-theme';
  function apply(t) { document.documentElement.setAttribute('data-theme', t); }
  apply(localStorage.getItem(k) || 'dark');
  window.reclaimTheme = function () { return document.documentElement.getAttribute('data-theme') || 'dark'; };
  window.reclaimSetTheme = function (t) { localStorage.setItem(k, t); apply(t); window.dispatchEvent(new Event('reclaim-theme')); };
  window.reclaimToggleTheme = function () { window.reclaimSetTheme(window.reclaimTheme() === 'light' ? 'dark' : 'light'); };
  window.addEventListener('storage', function (e) { if (e.key === k) { apply(e.newValue || 'dark'); window.dispatchEvent(new Event('reclaim-theme')); } });
})();
