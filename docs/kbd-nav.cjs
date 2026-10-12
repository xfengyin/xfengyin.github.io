#!/usr/bin/env node
/* 键盘可达性审计：用真实 Tab 键走一遍页面，记录
   ① 焦点顺序里有没有"消失"的焦点（焦点不可见 = 键盘用户迷路）
   ② 有没有可交互元素从未获得焦点（够不到）
   ③ 焦点环是否可见（outline 或 box-shadow 变化）
   ④ 焦点是否被跳到了视口外
   用法: node kbd-nav.cjs [baseUrl] [path]
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:8911';
const PATH = process.argv[3] || '/';

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const pg = await b.newPage();
  await pg.setCacheEnabled(false);
  await pg.setViewport({ width: 1280, height: 900 });
  await pg.goto(BASE + PATH, { waitUntil: 'networkidle2', timeout: 45000 });

  // 先把所有可交互元素的"标识"收集起来，便于最后比对哪些没被访问过
  const allInteractive = await pg.evaluate(() => {
    const list = [];
    document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').forEach((el, i) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      list.push({
        idx: i,
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22),
        href: el.getAttribute('href') || '',
        w: Math.round(r.width), h: Math.round(r.height),
      });
    });
    return list;
  });

  const focusPath = [];
  const N = Math.min(allInteractive.length + 6, 60);
  for (let i = 0; i < N; i++) {
    await pg.keyboard.press('Tab');
    const info = await pg.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { none: true };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // 判断焦点环：outline 有宽度，或 box-shadow 非 none
      const outlineW = parseFloat(cs.outlineWidth) || 0;
      const hasOutline = cs.outlineStyle !== 'none' && outlineW > 0;
      const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22),
        href: el.getAttribute('href') || '',
        inView: r.top >= -5 && r.bottom <= innerHeight + 5,
        ring: hasOutline || hasShadow,
        outline: cs.outlineStyle + ' ' + cs.outlineWidth,
      };
    });
    if (info.none) break;
    focusPath.push({ n: i + 1, ...info });
  }

  await b.close();

  console.log(`\n页面 ${PATH} —— 键盘焦点顺序（共 ${focusPath.length} 次 Tab）`);
  let noRing = 0, offscreen = 0;
  const visited = new Set();
  for (const f of focusPath) {
    visited.add(f.tag + '|' + f.text + '|' + f.href);
    const flag = f.ring ? ' ' : '✗无焦点环';
    if (!f.ring) noRing++;
    if (!f.inView) offscreen++;
    console.log(`  ${String(f.n).padStart(2)}. ${f.tag.padEnd(6)} "${f.text.padEnd(22)}" ${f.ring ? '✓环:' + f.outline : '✗无可见焦点环'}${f.inView ? '' : '  ⚠焦点在视口外'}`);
  }
  const unreached = allInteractive.filter(x => !visited.has(x.tag + '|' + x.text + '|' + x.href));
  console.log(`\n  无可见焦点环的: ${noRing}/${focusPath.length}`);
  console.log(`  焦点跑到视口外的: ${offscreen}`);
  console.log(`  从未获得焦点的可交互元素: ${unreached.length}`);
  unreached.slice(0, 10).forEach(x => console.log(`     ${x.tag} "${x.text}" ${x.href.slice(0, 34)} ${x.w}×${x.h}`));
})();
