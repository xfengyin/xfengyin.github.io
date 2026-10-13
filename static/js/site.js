/* xfengyin 主页交互：顶栏状态 + 移动菜单 + 页脚年份 + 阅读进度 + 深浅色切换 + 搜索
   全部按元素存在性守卫，各模板页共用。 */
(function () {
  // 标记 JS 可用 —— 某些控件（如暗色按钮）只在有 JS 时才有意义，
  // 由 CSS 的 html.js 规则控制显示，避免给禁用 JS 的用户显示死控件。
  document.documentElement.classList.add('js');

  'use strict';

  // ---------- 顶栏滚动态 + 阅读进度条（只依赖滚动位置，共用一个监听 + rAF 节流）----------
  var toolbar = document.getElementById('toolbar');
  var progressBar = document.getElementById('progressBar');
  var ticking = false;

  function onScrollFrame() {
    ticking = false;
    if (toolbar) toolbar.classList.toggle('enter', window.scrollY > 30);
    if (progressBar) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0) + '%';
    }
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }
  if (toolbar || progressBar) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- 移动端菜单 ----------
  var menuToggle = document.getElementById('menuToggle');
  var scrollMenu = document.getElementById('scrollMenu');
  if (menuToggle && scrollMenu) {
    var setMenuOpen = function (open) {
      scrollMenu.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    setMenuOpen(false);
    menuToggle.addEventListener('click', function () {
      setMenuOpen(!scrollMenu.classList.contains('open'));
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) setMenuOpen(false);
    }, { passive: true });
    // ---------- 菜单的关闭方式，与搜索框保持一致 ----------
    // 实测（390px 真实浏览器）：此前**只有"再点一次按钮"能关** ——
    //   Escape 无反应、点外部无反应，而同样场景下搜索框两者都支持。
    // 键盘用户尤其吃亏：Escape 是对话框/菜单的通用关闭键。
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrollMenu.classList.contains('open')) {
        setMenuOpen(false);
        // 关闭后把焦点还给按钮，否则焦点留在已隐藏的元素上
        if (menuToggle.focus) menuToggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!scrollMenu.classList.contains('open')) return;
      if (scrollMenu.contains(e.target) || e.target === menuToggle) return;
      setMenuOpen(false);
    });
  }

  // ---------- 页脚年份 ----------
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- 深色模式 ----------
  var darkToggle = document.getElementById('darkToggle');
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function storedDark() {
    try { return localStorage.getItem('xfengyin-dark'); } catch (e) { return null; }
  }
  function applyDark(on, persist) {
    // 类同时挂在 <html> 和 <body> 上：
    //  - head 里的引导脚本在首屏绘制前就把 dark 挂到 documentElement 上（防闪白），
    //    CSS 因此以 html.dark 为准；
    //  - body 上也保留一份，兼容任何按 body.dark 写的外部样式/用户自定义。
    document.documentElement.classList.toggle('dark', on);
    document.body.classList.toggle('dark', on);
    if (darkToggle) {
      darkToggle.textContent = on ? '☀️' : '🌙';
      darkToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (persist) {
      try { localStorage.setItem('xfengyin-dark', on ? '1' : '0'); } catch (e) {}
    }
  }
  if (darkToggle) {
    darkToggle.addEventListener('click', function () {
      applyDark(!document.documentElement.classList.contains('dark'), true);
    });
  }
  // 只同步初始状态到图标/aria-pressed，不写 localStorage（否则会把"未选择"固化成
  // 一个选择，用户之后改系统主题就不再生效）。首屏的 html.dark 由 head 引导脚本负责。
  applyDark(document.documentElement.classList.contains('dark'), false);

  // 用户从未手动选择过时，跟随系统主题实时变化
  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function (e) {
      if (!storedDark()) applyDark(e.matches, false);
    });
  }

  // ---------- 搜索 ----------
  var input = document.getElementById('searchInput');
  var box = document.getElementById('searchResults');
  if (input && box && window.POSTS) {
    // 条目是 <a href>（保留新标签页打开/右键复制）；标题域给显式类名 .search-text。
    // 待补：方向键导航需 role=listbox/aria-activedescendant，属模板改动。
    var render = function (q) {
      q = q.trim().toLowerCase();
      if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
      var hits = window.POSTS.filter(function (p) {
        return p.title.toLowerCase().indexOf(q) >= 0 || p.cat.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 8);
      if (!hits.length) {
        box.innerHTML = '<div class="search-empty">无匹配文章</div>';
      } else {
        box.innerHTML = hits.map(function (p) {
          return '<a class="search-item" href="' + p.url + '"><span class="search-text">' + p.title + '</span><em>' + p.cat + '</em></a>';
        }).join('');
      }
      box.style.display = 'block';
    };
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.style.display === 'block') {
        box.style.display = 'none';
        box.innerHTML = '';
      }
    });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.style.display = 'none';
    });
  }

  // ---------- 文章正文里的 Markdown 任务清单 ----------
  // Zola 把 "- [ ] 条目" 渲染成 <li><input disabled type=checkbox> 条目 —— 复选框没有
  // 可访问名，屏幕阅读器只会读出「复选框 不可用」，读不到它是哪一条（axe: label 规则，
  // 实测全站 65 处）。这里用同一条 <li> 的文本补一个 aria-label，语义就完整了。
  // 纯增强：没有这块，页面其余功能不受影响。
  // ---------- 可横向滚动的代码块 ----------
  // <pre> 默认 tabIndex 为 -1，键盘用户无法聚焦、也就无法用方向键滚动它。
  // 实测：移动端 390px 下 12 个代码块有 10 个横向溢出 —— 键盘用户会读不到超出的代码。
  // WCAG 2.1.1 要求可滚动区域可键盘访问，这里在**确实溢出**时才加 tabindex="0"（不溢出就不必进 Tab 顺序）。
  var pres = document.querySelectorAll('.article-content pre');
  Array.prototype.forEach.call(pres, function (pre) {
    if (pre.scrollWidth > pre.clientWidth + 1 && !pre.hasAttribute('tabindex')) {
      pre.setAttribute('tabindex', '0');
      // ⚠️ 不要加 role="region" + 相同 aria-label：
      // 那会让 10 个代码块变成 10 个同名 landmark，反而触发 axe 的
      // landmark-unique（landmark 名称必须唯一）。可聚焦 + 可见焦点态就够满足
      // WCAG 2.1.1 了，这里只留 tabindex。
    }
  });

  // ---------- 推荐阅读去重 ----------
  // 问题：模板分两轮独立产出推荐（先同分类、再同标签），**轮次之间没有共享状态**，
  // 于是「既同分类又同标签」的文章会被推多次。
  // 实测：/posts/blog-optimization-notes/ 与 /posts/cyberpunk-ui-design/ 互相
  // 共享 1 个分类 + 2 个标签 → 对方被推 **3 次**；CSS 只显示前 4 条
  // （.related-grid > .related-item:nth-child(n+5){display:none}），
  // 于是这页实际只给用户看了 **2 篇不同的文章**，另外 2 个位置是同一篇的重复。
  // 为什么放在 JS 里做：模板侧做不到 —— Zola 0.23 的 Tera 没有 set_global、
  // 没有集合运算，`{% set %}` 也无法跨嵌套循环带出值（实测确认过）。
  // 纯增强：没有这块，推荐列表照常显示（只是有重复），其余功能不受影响。
  var grid = document.querySelector('.related-grid');
  if (grid) {
    var seenHref = {};
    // ⚠️ 必须先**快照**再删：HTMLCollection（grid.children）是**活的**，
    // 边遍历边 removeChild 会导致下标错位、漏删后面的元素。
    // （我第一版就是这么写的，实测 hardware-test-battery 页有一条重复没删掉。）
    var items = Array.prototype.slice.call(grid.children);
    items.forEach(function (item) {
      var href = (item.getAttribute('href') || '').replace(/\/$/, '');
      if (!href) return;
      if (seenHref[href]) {
        if (item.parentNode) item.parentNode.removeChild(item);
      } else {
        seenHref[href] = true;
      }
    });
  }

  var taskBoxes = document.querySelectorAll('.article-content input[type="checkbox"]');
  Array.prototype.forEach.call(taskBoxes, function (cb) {
    var li = cb.closest('li');
    var text = li ? (li.textContent || '').trim() : '';
    if (!cb.getAttribute('aria-label')) {
      cb.setAttribute('aria-label', (cb.checked ? '已完成：' : '未完成：') + (text || '清单项'));
    }
  });
})();
