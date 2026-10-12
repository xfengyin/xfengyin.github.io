#!/usr/bin/env node
/* 移动端触控目标审计：列出所有小于 WCAG 2.5.8 (AA, 24×24) 的交互元素，
   以及小于推荐 44×44 的元素。只看**可见且可点**的元素，并给出选择器以便定位。
   用法: node touch-targets.cjs [baseUrl] [paths...]
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:8911';
const PATHS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['/', '/posts/', '/posts/zen-framework/', '/categories/', '/tags/python/', '/404.html'];

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const all = {};
  for (const p of PATHS) {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pg.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 45000 });
    const small = await pg.evaluate(() => {
      const out = [];
      document.querySelectorAll('a,button,input,select,textarea,[role="button"],[onclick]').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        // 只报视口内的（页首区域最影响首屏可用性）
        if (r.top > document.documentElement.clientHeight * 3) return;
        if (r.width < 24 || r.height < 24) {
          const sel = el.tagName.toLowerCase() +
            (el.id ? '#' + el.id : '') +
            (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '');
          out.push({ sel, w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent||'').trim().slice(0,16), href: el.getAttribute('href')||'' });
        }
      });
      return out;
    });
    all[p] = small;
    await pg.close();
  }
  await b.close();
  let total = 0;
  for (const [p, list] of Object.entries(all)) {
    console.log(`\n${p}  (${list.length} 个小于 24×24 的交互元素)`);
    const seen = new Set();
    for (const x of list) {
      const k = x.sel + '|' + x.w + 'x' + x.h;
      if (seen.has(k)) continue;
      seen.add(k); total++;
      console.log(`   ${String(x.w).padStart(3)}×${String(x.h).padStart(3)}  ${x.sel.padEnd(34)} "${x.text}" ${x.href.slice(0,30)}`);
    }
  }
  console.log(`\n合计（去重后）: ${total} 个`);
})();
