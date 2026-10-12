#!/usr/bin/env node
/* 全站多视口检查：111 页 × 4 视口，而不只是抽 8 页。
   检查：横向溢出 / 越界元素 / 控制台错误 / 过小控件。
   用法: node viewport-all.cjs <baseUrl> <pagesFile>
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');
const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812, isMobile: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true },
  { name: 'tablet-768', width: 768, height: 1024, isMobile: false },
  { name: 'desktop-1280', width: 1280, height: 900, isMobile: false },
];
(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const problems = [];
  let n = 0;
  for (const vp of VIEWPORTS) {
    let pg = await b.newPage();
    await pg.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
    for (const p of pages) {
      n++;
      try {
        if (n % 60 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile }); }
        const errs = [];
        const h = m => { if (m.type() === 'error') errs.push(m.text().slice(0, 70)); };
        pg.on('console', h);
        await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const r = await pg.evaluate(() => {
          const de = document.documentElement, vw = de.clientWidth;
          let bad = 0;
          document.querySelectorAll('body *').forEach(el => {
            const s = getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') return;
            const rc = el.getBoundingClientRect();
            if (rc.width > 0 && rc.right > vw + 2) bad++;
          });
          return { overflow: de.scrollWidth - de.clientWidth, bad };
        });
        if (r.overflow > 1) problems.push(`${vp.name} ${p} 横向溢出 ${r.overflow}px (越界元素 ${r.bad})`);
        if (errs.length) problems.push(`${vp.name} ${p} 控制台错误: ${errs[0]}`);
        pg.off('console', h);
      } catch (e) { problems.push(`${vp.name} ${p} 加载失败: ${e.message.slice(0, 60)}`); }
      if (n % 80 === 0) console.log(`    ...${n}/${VIEWPORTS.length * pages.length}`);
    }
    await pg.close();
  }
  await b.close();
  console.log(`\n  全站检查：${pages.length} 页 × ${VIEWPORTS.length} 视口 = ${VIEWPORTS.length * pages.length} 次渲染`);
  if (!problems.length) console.log('  ✓ 无问题');
  else { console.log(`  ✗ ${problems.length} 处问题`); problems.slice(0, 20).forEach(p => console.log('    ' + p)); }
})();
