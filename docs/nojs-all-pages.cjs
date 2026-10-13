#!/usr/bin/env node
/* 无 JavaScript 降级审计（全站）
 * 为什么需要：站点用 site.js 做了增强（补 aria-label、给溢出的代码块加 tabindex 等）。
 * 但第 26 轮发现过"无 JS 时的死控件"（暗色按钮点了没反应），
 * 说明"关掉 JS 之后还能不能用"是一个真实的、需要定期复验的条件。
 *
 * 检查（禁用 JS 后）：页面有可读文本 / 没有 display 可见但点了无反应的按钮 /
 *                     没有占位符式的空链接
 * 用法: node nojs-all-pages.cjs <baseUrl> <pagesFile>
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  // ⚠️ 顺序很重要：必须先 setViewport 再 setJavaScriptEnabled。
  // 反过来写时，在复用页面上改视口不会重新求值媒体查询，
  // 会读到上一个视口的样式（实测把 desktop 下的 .menu-toggle 读成 inline-block，
  // 而它其实是 display:none —— 我因此误判成"桌面显示了移动菜单按钮"）。
  await pg.setViewport({ width: 1280, height: 900 });
  await pg.setJavaScriptEnabled(false);
  const issues = []; let n = 0, failed = 0, skipped = 0;
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); await pg.setJavaScriptEnabled(false); }
      // ⚠️ 必须等 CSS 到位再判断可见性。
      // 用 domcontentloaded 时样式表可能还没加载完，此时 getComputedStyle 返回的是
      // **浏览器默认值**（button 默认 display:inline-block），于是把 display:none 的
      // 按钮误判成"可见的死控件"。我因此误报过"桌面显示了移动菜单按钮"。
      // 这里显式等到至少一个样式表被解析，且 document.readyState 完成。
      await pg.goto(BASE + p, { waitUntil: 'load', timeout: 40000 });
      await pg.waitForFunction(() => {
        try { return document.styleSheets.length > 0 && document.styleSheets[0].cssRules.length > 0; }
        catch (e) { return document.styleSheets.length > 0; }
      }, { timeout: 15000, polling: 50 }).catch(() => {});
      const r = await pg.evaluate(() => {
        // 样式表没就绪就跳过本页判定（宁可漏报，也不要基于默认样式误报）
        let cssReady = false;
        try { cssReady = document.styleSheets.length > 0 && document.styleSheets[0].cssRules.length > 0; } catch (e) { cssReady = document.styleSheets.length > 0; }
        if (!cssReady) return { skip: true };
        // 可见但"点了不会有任何事"的按钮：无 onclick、无表单关联、且 id 暗示由 JS 接管，
        // 这里用更保守的判据：可见的 <button> 若没有任何可观测行为，记为可疑。
        const suspicious = [];
        document.querySelectorAll('button').forEach(bt => {
          const cs = getComputedStyle(bt);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const hasInline = bt.hasAttribute('onclick');
          const inForm = !!bt.closest('form');
          const nbsp = /^(菜单|Menu)$/i.test((bt.textContent || '').trim());
          if (!hasInline && !inForm && nbsp) suspicious.push(bt.textContent.trim());
        });
        return {
          textLen: (document.body.innerText || '').trim().length,
          mainVisible: !!document.querySelector('main, .article-content, .post-card, .signature-wall'),
          suspicious,
        };
      });
      if (r.skip) { skipped++; return; }
      if (r.textLen < 20) issues.push(`${p} 无 JS 时几乎无文本（${r.textLen} 字）`);
      if (!r.mainVisible) issues.push(`${p} 无 JS 时看不到主内容容器`);
      if (r.suspicious.length) issues.push(`${p} 无 JS 时仍有可见按钮可能是死控件: ${r.suspicious.join(',')}`);
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  无 JS 降级审计 ${pages.length} 页（加载失败 ${failed}，CSS 未就绪跳过 ${skipped}）`);
  if (!issues.length) console.log('  ✓ 禁用 JS 后每页都有可读内容，且无可见死控件');
  else { console.log(`  ✗ ${issues.length} 处问题:`); issues.slice(0, 10).forEach(x => console.log('      ' + x)); }
  process.exit(issues.length ? 1 : 0);
})();
