#!/usr/bin/env node
/* 全站打印审计：每一页在 print 媒体下是否还有可读内容（防止误隐藏导致空白）、
   以及是否残留大块深色（耗墨）。
   用法: node print-all.cjs <baseUrl> <pagesFile>
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');
(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 900 });
  const blanks = [], darkish = []; let n = 0, failed = 0;
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await pg.emulateMediaType('print');
      await new Promise(r => setTimeout(r, 80));
      const r = await pg.evaluate(() => {
        const t = (document.body.innerText || '').trim();
        // 打印下仍可见的、且背景为深色的元素（耗墨）
        let darkArea = 0;
        document.querySelectorAll('body *').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const bg = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
          if (!bg) return;
          const a = bg[4] === undefined ? 1 : +bg[4];
          const lum = (0.2126 * +bg[1] + 0.7152 * +bg[2] + 0.0722 * +bg[3]) / 255;
          const rc = el.getBoundingClientRect();
          if (a > 0.5 && lum < 0.4 && rc.width * rc.height > 20000) darkArea += rc.width * rc.height;
        });
        return { len: t.length, darkArea: Math.round(darkArea), vh: innerHeight * innerWidth };
      });
      if (r.len < 20) blanks.push(`${p}  打印文本仅 ${r.len} 字`);
      if (r.darkArea > r.vh * 0.3) darkish.push(`${p}  深色面积 ${(r.darkArea / r.vh).toFixed(2)} 屏`);
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  全站打印审计 ${pages.length} 页（加载失败 ${failed}）`);
  // 显式退出码：发现问题必须返回非零，否则上层验收脚本会把它当 PASS。
  // （实测过：这些工具原先能打印 ✗ 却仍 exit 0，等于"永远绿"。）
  process.exit(blanks.length + darkish.length ? 1 : 0);
  console.log(blanks.length ? `  ✗ 打印内容过少 ${blanks.length} 页:` : '  ✓ 所有页打印时都有可读内容');
  blanks.slice(0, 8).forEach(x => console.log('      ' + x));
  console.log(darkish.length ? `  ✗ 打印时仍有大块深色 ${darkish.length} 页:` : '  ✓ 无大块深色（省墨）');
  darkish.slice(0, 8).forEach(x => console.log('      ' + x));
})();
