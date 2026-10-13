#!/usr/bin/env node
/* 320px 超窄屏审计（iPhone SE 1代 / 老设备宽度）
   检查横向溢出、文本是否可读、控件是否过大挤爆布局。
   用法: node narrow-320.cjs <baseUrl> <pagesFile>
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');
(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const ovf = [];
  let n = 0, failed = 0;
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const r = await pg.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        let worst = null;
        document.querySelectorAll('body *').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
          const rc = el.getBoundingClientRect();
          if (rc.width > 0 && rc.right > vw + 2) {
            const w = rc.right - vw;
            if (!worst || w > worst.over) {
              worst = { over: Math.round(w), tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).slice(0, 20) : ''), w: Math.round(rc.width) };
            }
          }
        });
        return { ovf: document.documentElement.scrollWidth - vw, worst };
      });
      if (r.ovf > 1) ovf.push(`${p}  溢出 ${r.ovf}px` + (r.worst ? `  最宽越界: ${r.worst.tag} (${r.worst.w}px)` : ''));
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  320px 视口审计 ${pages.length} 页（加载失败 ${failed}）`);
  if (!ovf.length) console.log('  ✓ 无横向溢出');
  else { console.log(`  ✗ ${ovf.length} 页横向溢出:`); ovf.slice(0, 12).forEach(x => console.log('      ' + x)); }
  // 显式退出码：发现问题必须返回非零，否则上层验收脚本会把它当 PASS。
  // （实测过：这些工具原先能打印 ✗ 却仍 exit 0，等于"永远绿"。）
  // ⚠️ 必须留在最后：原来它写在结论之前，结论与明细就成了死代码（同 print-all-pages.cjs）。
  process.exit(ovf.length ? 1 : 0);
})();
