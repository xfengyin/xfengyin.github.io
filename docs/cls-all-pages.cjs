#!/usr/bin/env node
/* 全站 CLS（累积布局偏移）审计
 * 为什么需要：CLS 是我历轮声称修过并保持"0"的核心指标，
 * 但此前只在个别页面、个别视口上量过（甚至只测过 10 次采样）。
 * 这里对**每一页 × 移动视口**测量，并**滚动整页**触发懒加载后的偏移。
 * 用法: node cls-all.cjs <baseUrl> <pagesFile>
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  const VP = { width: 390, height: 844, isMobile: true };
  await pg.setViewport(VP);
  const bad = []; let n = 0, failed = 0, maxCls = 0, maxPage = '';
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport(VP); }
      await pg.evaluateOnNewDocument(() => {
        window.__cls = 0; window.__shifts = [];
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (!e.hadRecentInput) {
              window.__cls += e.value;
              if (e.value > 0.001) window.__shifts.push({
                v: +e.value.toFixed(4),
                src: (e.sources || []).map(s => (s.node ? (s.node.tagName || '?') + '.' + String(s.node.className || '').slice(0, 20) : '?')).slice(0, 2).join(','),
              });
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await pg.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 45000 });
      // 滚一遍触发正文图片懒加载
      await pg.evaluate(async () => {
        const step = Math.round(innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        }
        window.scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 400));
      const r = await pg.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts.slice(0, 3) }));
      const v = +r.cls.toFixed(4);
      if (v > maxCls) { maxCls = v; maxPage = p; }
      // Google 的「良好」阈值是 0.1；超过 0.01 就值得看一眼
      if (v > 0.01) bad.push({ p, cls: v, shifts: r.shifts });
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  全站 CLS 审计 ${pages.length} 页（390px，滚动整页触发懒加载；加载失败 ${failed}）`);
  console.log(`  最大 CLS: ${maxCls.toFixed(4)}  (${maxPage})`);
  if (!bad.length) console.log('  ✓ 所有页面 CLS ≤ 0.01（远优于 Google 良好线 0.1）');
  else {
    console.log(`  ✗ ${bad.length} 页 CLS > 0.01:`);
    bad.sort((a, b) => b.cls - a.cls).slice(0, 10).forEach(x =>
      console.log(`      ${x.cls.toFixed(4)}  ${x.p}  ${x.shifts.map(s => s.src + '(' + s.v + ')').join(' ')}`));
  }
  process.exit(bad.length ? 1 : 0);
})();
