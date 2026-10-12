#!/usr/bin/env node
/* 在**真实 Chrome**里跑 axe-core（而不是 jsdom）。
   动机：第 20 轮实测发现 jsdom 没有布局引擎 —— 植入 6×6 按钮后
   wcag22aa（目标尺寸）仍报 0 违规。凡是依赖布局的规则（target-size、
   scrollable-region-focusable、部分 color-contrast）在 jsdom 下都测不出来。

   做法：把 axe.min.js 注入到加载完成的真实页面里再执行。
   用法: node axe-live.cjs [baseUrl] [paths...]
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');

const AXE = fs.readFileSync('/tmp/a11y-browser/node_modules/axe-core/axe.min.js', 'utf8');
const BASE = process.argv[2] || 'https://xfengyin.github.io';
const PATHS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['/', '/posts/', '/posts/zen-framework/', '/categories/', '/tags/python/', '/404.html'];

const TAGS = process.env.AXE_TAGS
  ? process.env.AXE_TAGS.split(',')
  : ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa', 'wcag22a', 'wcag22aa', 'best-practice', 'ACT', 'section508'];

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const totals = {};
  let pagesWith = 0;
  for (const p of PATHS) {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); // 移动视口：target-size 等在窄屏才暴露
    await pg.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 45000 });
    await pg.evaluate(AXE);
    const res = await pg.evaluate(async (tags) => {
      return await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    }, TAGS);
    if (res.violations.length) pagesWith++;
    for (const v of res.violations) {
      const t = totals[v.id] = totals[v.id] || { n: 0, imp: v.impact, pages: new Set(), sample: v.nodes[0] ? v.nodes[0].html.slice(0, 90) : '' };
      t.n += v.nodes.length; t.pages.add(p);
    }
    console.log(`  ${res.violations.length ? '✗' : '✓'} ${p.padEnd(28)} 违规规则 ${res.violations.length}`);
    await pg.close();
  }
  await b.close();
  console.log(`\n  规则集: ${TAGS.join(',')}`);
  console.log(`  扫描 ${PATHS.length} 页（真实 Chrome，移动视口），有违规的 ${pagesWith}`);
  const rows = Object.entries(totals).sort((a, b) => b[1].n - a[1].n);
  if (!rows.length) console.log('  无违规');
  for (const [id, v] of rows) console.log(`    [${v.imp}] ${id} × ${v.n}  ${[...v.pages].join(',')}   样例: ${v.sample}`);
})();
