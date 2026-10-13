#!/usr/bin/env node
/* 全站 CLS（累积布局偏移）审计
 * 为什么需要：CLS 是我历轮声称修过并保持"0"的核心指标，
 * 但此前只在个别页面、个别视口上量过（甚至只测过 10 次采样）。
 * 这里对**每一页 × 移动视口**测量，并**滚动整页**触发懒加载后的偏移。
 * 用法: node cls-all.cjs <baseUrl> <pagesFile>
 *
 * ⚠️ 2026-10-13 修掉一个**会把结果放大 k 倍**的工具缺陷（详见 freshPage 的注释）。
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');

// 观测器脚本：只声明一次，且**每个 Page 只注册一次**
const OBSERVER = () => {
  window.__cls = 0; window.__shifts = []; window.__dropped = 0;
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) { window.__dropped += e.value; }  // 盲区量化：被过滤掉的那部分
      if (!e.hadRecentInput) {
        window.__cls += e.value;
        if (e.value > 0.001) window.__shifts.push({
          v: +e.value.toFixed(4),
          src: (e.sources || []).map(s => (s.node ? (s.node.tagName || '?') + '.' + String(s.node.className || '').slice(0, 20) : '?')).slice(0, 2).join(','),
        });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  // ⚠️ **不要用 isMobile: true**：实测（2026-10-13）它会让 Chrome 把**加载期**的 layout-shift
  //    条目标成 hadRecentInput=true，而下面的过滤器只收 hadRecentInput=false 的条目
  //    ⇒ 每一次加载期偏移都被静默丢弃，本脚本于是永远报 0.0000（一个「从不报警」的检测器）。
  //    对照实测（同一页、同一处注入的无尺寸图片，真值 0.1307）：
  //      isMobile:true  -> 计入 0.0000 / 被丢弃 0.1307   （瞎）
  //      不带 isMobile  -> 计入 0.1307 / 被丢弃 0.0000   （对）
  //    390px 的移动布局由宽度决定，不依赖 isMobile，所以去掉它不影响断点覆盖。
  const VP = { width: 390, height: 844, hasTouch: true };

  // ⚠️ puppeteer 的 evaluateOnNewDocument 是**累加**的：对同一个 Page 对象反复调用，
  //    每个新文档里就会跑**多份**脚本。原实现把它写在循环里 ⇒ 同一批里第 k 页注册了 k 份
  //    observer，于是**每一次 layout-shift 被 k 个 observer 各累加一次**，window.__cls 被放大 k 倍。
  //    这个缺陷长期没暴露，是因为真值恒为 0（0 乘 k 还是 0）；线上真值有千分之几的微小偏移时，
  //    就被放大成了 1.4123 这种"红"——2026-10-13 全站验收在线上报出 6 页 CLS>0.01，
  //    紧接着用同一脚本、同一 URL 只重测那 6 页，全部 0.0000，就是这么来的。
  //    修法：只在**新建页面时**注册一次。
  const freshPage = async () => {
    const page = await b.newPage();
    await page.setViewport(VP);
    await page.evaluateOnNewDocument(OBSERVER);
    return page;
  };

  const measure = async (page, p) => {
    await page.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 45000 });
    // 滚一遍触发正文图片懒加载
    await page.evaluate(async () => {
      const step = Math.round(innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 400));
    return await page.evaluate(() => ({ cls: window.__cls, dropped: window.__dropped, shifts: window.__shifts.slice(0, 3) }));
  };

  let pg = await freshPage();
  const bad = []; let n = 0, failed = 0, maxCls = 0, maxPage = '', maxDropped = 0, droppedPage = '';
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await freshPage(); }
      // 这里**故意不做重测**。曾按「瞬时抖动不判死」加过一次重测，随即被自己的对照实验推翻：
      // 重测用的是同一个浏览器（共享 HTTP 缓存）⇒ 第二次读的是**热缓存**，而真实用户第一次
      // 访问是**冷缓存**。实测：干净页与注入页在第一次读数都 >0.01，重测一律回到 0.0000 ——
      // 等于把「只有首次访问才出现的偏移」系统性洗掉。所以只取第一次读数；
      // 「重试」应当用在**同一前提下的重复**，而不是换一个更容易通过的前提。
      const r = await measure(pg, p);
      const v = +r.cls.toFixed(4);
      if (v > maxCls) { maxCls = v; maxPage = p; }
      if ((r.dropped || 0) > maxDropped) { maxDropped = r.dropped; droppedPage = p; }
      // Google 的「良好」阈值是 0.1；超过 0.01 就值得看一眼
      if (v > 0.01) bad.push({ p, cls: v, shifts: r.shifts });
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  全站 CLS 审计 ${pages.length} 页（390px，滚动整页触发懒加载；加载失败 ${failed}）`);
  console.log(`  最大 CLS: ${maxCls.toFixed(4)}  (${maxPage})`);
  console.log('  被 hadRecentInput 丢弃的偏移: 最大 ' + maxDropped.toFixed(4) + '  (' + (droppedPage || '-') + ')');
  if (!bad.length) console.log('  ✓ 所有页面 CLS ≤ 0.01（远优于 Google 良好线 0.1）');
  else {
    console.log(`  ✗ ${bad.length} 页 CLS > 0.01:`);
    bad.sort((a, b) => b.cls - a.cls).slice(0, 10).forEach(x =>
      console.log(`      ${x.cls.toFixed(4)}  ${x.p}  ${x.shifts.map(s => s.src + '(' + s.v + ')').join(' ')}`));
  }
  process.exit(bad.length ? 1 : 0);
})();
