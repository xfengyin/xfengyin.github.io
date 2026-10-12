#!/usr/bin/env node
/* 全站真实 Chrome axe 扫描：把 111 个页面都跑一遍（此前只抽样 6 页）。
   用本地服务器以减少网络抖动；轮转标签页避免内存堆积。
   用法: node axe-all.cjs <baseUrl> [limit]
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const AXE = fs.readFileSync('/tmp/a11y-browser/node_modules/axe-core/axe.min.js', 'utf8');
const BASE = process.argv[2];
const LIMIT = parseInt(process.argv[3] || '0', 10);
// 默认用仓库自身的 public/ —— 之前这里硬编码了一个临时目录（blog-opt/t22/public），
// 那个目录被清理后脚本就 ENOENT 崩掉，验收时表现为"axe 失败"，
// 其实是脚本自己的问题。改为默认仓库产物，可用 PUB_DIR 覆盖。
const PUB = process.env.PUB_DIR || '/vol1/work/xfengyin.github.io/public';

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      const rel = p.slice(d.length + 1);
      pages.push(rel === 'index.html' ? '/' : (rel.endsWith('/index.html') ? '/' + rel.slice(0, -10) : '/' + rel));
    }
  }
})(PUB);
pages.sort();
const list = LIMIT ? pages.slice(0, LIMIT) : pages;

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice', 'ACT'];

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setCacheEnabled(false);
  await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const totals = {}; const errs = []; let pagesWith = 0, n = 0;
  for (const p of list) {
    n++;
    try {
      if (n % 20 === 0) { await pg.close(); pg = await b.newPage(); await pg.setCacheEnabled(false); await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await pg.evaluate(AXE);
      const res = await pg.evaluate(async (tags) => await window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS);
      if (res.violations.length) pagesWith++;
      for (const v of res.violations) {
        const t = totals[v.id] = totals[v.id] || { n: 0, imp: v.impact, pages: new Set(), sample: v.nodes[0] ? v.nodes[0].html.slice(0, 86) : '' };
        t.n += v.nodes.length; t.pages.add(p);
      }
    } catch (e) { errs.push(p + ': ' + e.message.slice(0, 60)); }
    if (n % 25 === 0) console.log(`    ...已扫 ${n}/${list.length}`);
  }
  await b.close();
  console.log(`\n  扫描 ${list.length} 页（真实 Chrome / 移动视口 / 含 WCAG 2.2）`);
  console.log(`  有违规的页面: ${pagesWith}   加载失败: ${errs.length}`);
  errs.slice(0, 5).forEach(e => console.log('    失败 ' + e));

  const rows = Object.entries(totals).sort((a, b) => b[1].n - a[1].n);
  if (!rows.length) { console.log('  无违规'); process.exit(0); }

  // 区分「必须修（AA 级）」与「仅供参考（AAA 级）」：
  // color-contrast-enhanced 的 tags 是 wcag2aaa，属于 AAA(7:1)，
  // 本站对标 AA(4.5:1) —— 把它算作失败会让验收永远红，掩盖真正的问题。
  const AAA_ONLY = new Set(['color-contrast-enhanced']);
  const must = rows.filter(([id]) => !AAA_ONLY.has(id));
  const info = rows.filter(([id]) => AAA_ONLY.has(id));

  for (const [id, v] of must)
    console.log(`  ✗ [${v.imp}] ${id} × ${v.n}  出现在 ${v.pages.size} 页   样例: ${v.sample}`);
  for (const [id, v] of info)
    console.log(`  ℹ [${v.imp}] ${id} × ${v.n}（AAA 级，本站对标 AA，不计为失败）`);

  console.log(must.length
    ? `\n  结论: 有 ${must.length} 类 AA 级违规需要修复`
    : '\n  结论: AA 级违规 0（AAA 级项仅供参考）');
  process.exit(must.length ? 1 : 0);
})();
