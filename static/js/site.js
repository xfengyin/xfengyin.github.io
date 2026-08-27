/* xfengyin 主页交互：搜索 + 深浅色切换 */
(function () {
  'use strict';

  // ---------- 深色模式 ----------
  var darkToggle = document.getElementById('darkToggle');
  function applyDark(on) {
    document.body.classList.toggle('dark', on);
    if (darkToggle) darkToggle.textContent = on ? '☀️' : '🌙';
    try { localStorage.setItem('xfengyin-dark', on ? '1' : '0'); } catch (e) {}
  }
  if (darkToggle) {
    darkToggle.addEventListener('click', function () {
      applyDark(!document.body.classList.contains('dark'));
    });
  }
  try {
    if (localStorage.getItem('xfengyin-dark') === '1') applyDark(true);
  } catch (e) {}

  // ---------- 搜索 ----------
  var input = document.getElementById('searchInput');
  var box = document.getElementById('searchResults');
  if (input && box && window.POSTS) {
    function render(q) {
      q = q.trim().toLowerCase();
      if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
      var hits = window.POSTS.filter(function (p) {
        return p.title.toLowerCase().indexOf(q) >= 0 || p.cat.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 8);
      if (!hits.length) {
        box.innerHTML = '<div class="search-empty">无匹配文章</div>';
      } else {
        box.innerHTML = hits.map(function (p) {
          return '<a class="search-item" href="' + p.url + '"><span>' + p.title + '</span><em>' + p.cat + '</em></a>';
        }).join('');
      }
      box.style.display = 'block';
    }
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(input.value); });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.style.display = 'none';
    });
  }
})();
