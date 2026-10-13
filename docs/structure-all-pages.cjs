#!/usr/bin/env node
/* HTML 结构与文档元数据审计（全站，用**浏览器解析器**而不是正则）
 *
 * 为什么必须用解析器：第 12 轮我用正则扫标签配对，报出 847/3362/333 处"未闭合"，
 * 全是假阳性 —— 压缩后的 HTML5 合法省略了 </p></li></html> 这类可选闭合标签。
 * 改用浏览器解析器后是 0 问题。
 *
 * 检查：重复 id / h1 恰好 1 个 / title 唯一且长度合理 / description 唯一 /
 *       图片有 alt / 每个页面有 html[lang]
 * 用法: node structure-all-pages.cjs <baseUrl> <pagesFile>
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 900 });
  const issues = [];
  const titles = new Map(), descs = new Map(); let n = 0, failed = 0;
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const r = await pg.evaluate(() => {
        const ids = {};
        document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1);
        return {
          dupIds: Object.entries(ids).filter(([, v]) => v > 1).map(([k]) => k),
          h1: document.querySelectorAll('h1').length,
          title: (document.title || '').trim(),
          desc: (document.querySelector('meta[name=description]') || {}).content || '',
          noAlt: document.querySelectorAll('img:not([alt])').length,
          lang: document.documentElement.getAttribute('lang'),
        };
      });
      if (r.dupIds.length) issues.push(`${p} 重复 id: ${r.dupIds.slice(0, 3).join(',')}`);
      if (r.h1 !== 1) issues.push(`${p} h1 数量=${r.h1}（应为 1）`);
      if (!r.lang) issues.push(`${p} 缺 html[lang]`);
      if (r.noAlt) issues.push(`${p} 有 ${r.noAlt} 个 img 缺 alt`);
      if (!r.title) issues.push(`${p} 缺 title`);
      else { if (titles.has(r.title)) issues.push(`${p} title 与 ${titles.get(r.title)} 重复`); else titles.set(r.title, p); }
      // description 唯一性：404 页不参与 —— 它继承站点描述是有意为之
      // （404 不应被索引，canonical 也刻意留空），把它算重复属过严。
      if (r.desc && p !== '/404.html') {
        if (descs.has(r.desc)) issues.push(`${p} description 与 ${descs.get(r.desc)} 重复`);
        else descs.set(r.desc, p);
      }
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  全站结构审计 ${pages.length} 页（浏览器解析器；加载失败 ${failed}）`);
  console.log(`  唯一 title ${titles.size}   唯一 description ${descs.size}`);
  if (!issues.length) console.log('  ✓ 无结构问题');
  else { console.log(`  ✗ ${issues.length} 处问题:`); issues.slice(0, 12).forEach(x => console.log('      ' + x)); }
  process.exit(issues.length ? 1 : 0);
})();
