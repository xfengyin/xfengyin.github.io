#!/usr/bin/env node
/* 全站交互元素审计（真实 Chrome，390px 移动视口）
 * 检查两件事：
 *   ① WCAG 2.5.8 目标尺寸 ≥24×24 —— 必须量**实际可点区域**，不能只看盒子
 *   ② 交互元素是否有可访问名
 *
 * 三个踩过的坑（写在这里防止复发）：
 *   1. 用 getBoundingClientRect 量尺寸是错的：第 11 轮用绝对定位的 ::after
 *      把可点区撑到 ≥24，盒子尺寸没变。只看盒子会把已修好的重报为问题。
 *   2. elementFromPoint 在元素**不在视口内**时返回 null，会被算成 1x1：
 *      我曾把 358×300 的大卡片报成"1×1 可点"。所以不在视口内的元素跳过不判，
 *      并**单独计数**（offview），避免"静默当作通过"。
 *   3. 命中判定不能用 closest('.'+class) —— 对没有 class 的元素直接失效，
 *      会把所有 <a> 判成 1x1。正确做法是判断包含关系。
 *
 * 用法: node interactive-all.cjs <baseUrl> <pagesFile>
 */

/* ── 已知会出现在"盒子小但可点达标"名单里的元素（第 11 轮用 ::after 撑开过）──
   实测（390px 真实 Chrome，滚到视口中心后量 elementFromPoint）：
     #darkToggle      盒子 18×26  → 实际可点 41×41 ✓
     .toc ul li a     盒子 26×19  → 实际可点 41×38 ✓
     .section-head .more 盒子 56×23 → 实际可点 41×41 ✓
     .article-meta kbd 盒子 58×21 → 实际可点 41×26 ✓
   这些**不是问题**：盒子小是设计（视觉不变），可点区靠绝对定位的 ::after 撑到 ≥24。
   工具报"未判定且盒子<24"时，先对照这份清单再判断。
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');

const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');
const VP = { width: 390, height: 844, isMobile: true, hasTouch: true };

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport(VP);

  const small = {};   // 目标过小（按元素类型聚合）
  const noName = {};  // 无访问名
  let offview = 0, n = 0, failed = 0;
  const offWarn = {};

  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport(VP); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // 逐个元素处理：先 scrollIntoView 保证完整可见，再量。
      // 分步滚动 + 批量测量会在边界上漏元素、并因滚动相互干扰（试过三种写法都不可靠），
      // 逐元素虽然慢，但结果是确定的。
      const r = await pg.evaluate(async () => {
        const res = { small: [], noName: [], offview: 0, measured: 0 };
        const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,[onclick],[role=button]';
        const els = [...document.querySelectorAll(SEL)].filter(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
          if (el.disabled) return false;                    // 禁用控件不受 2.5.8 约束
          const rc = el.getBoundingClientRect();
          return rc.width > 0 && rc.height > 0;
        });
        const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const el of els) {
          el.scrollIntoView({ block: 'center' });
          await raf();
          // 页面底部的元素 scrollIntoView 到不了视口中心（文档到不了那么远），
          // 再补一次"滚到底"——这样页尾的链接也能被完整测到（否则会漏掉
          // 返回文章列表/回到首页/推荐阅读等一批元素）。
          let rc0 = el.getBoundingClientRect();
          if (rc0.bottom > innerHeight || rc0.top < 0) {
            window.scrollTo(0, document.documentElement.scrollHeight);
            await raf();
          }
          const rc = el.getBoundingClientRect();
          const cls = (el.className && typeof el.className === 'string')
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
          const key = el.tagName.toLowerCase() + cls;
          const nm = (el.textContent || '').trim() || el.getAttribute('aria-label')
            || el.getAttribute('title') || (el.querySelector && el.querySelector('.vh') ? 'vh' : '');
          if (!nm) res.noName.push(key);
          // 完整可见才可信；否则计入 offview（例如被 fixed 顶栏压住）
          if (rc.top < 0 || rc.bottom > innerHeight || rc.left < 0 || rc.right > innerWidth) {
            res.offview++; continue;
          }
          const px = rc.left + rc.width / 2, py = rc.top + rc.height / 2;
          const hit = (dx, dy) => {
            const e = document.elementFromPoint(px + dx, py + dy);
            return !!(e && (e === el || el.contains(e) || e.contains(el)));
          };
          let L = 0, R = 0, U = 0, D = 0;
          for (let d = 1; d <= 20; d++) { if (hit(-d, 0)) L = d; else break; }
          for (let d = 1; d <= 20; d++) { if (hit(d, 0)) R = d; else break; }
          for (let d = 1; d <= 20; d++) { if (hit(0, -d)) U = d; else break; }
          for (let d = 1; d <= 20; d++) { if (hit(0, d)) D = d; else break; }
          res.measured++;
          const hw = L + R + 1, hh = U + D + 1;
          if (hw < 24 || hh < 24) {
            res.small.push([key, Math.round(rc.width) + 'x' + Math.round(rc.height) + ' 盒子 / ' + hw + 'x' + hh + ' 可点']);
          }
        }
        // 未判定的元素也收集其**盒子尺寸**（盒子 <24 的才值得人工看；
        // 盒子本来就 ≥24 的，可点区不可能比盒子更小到违规）
        res.offSample = [];
        document.querySelectorAll(SEL).forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const rc = el.getBoundingClientRect();
          if (rc.width === 0 || rc.height === 0) return;
          if (rc.top >= 0 && rc.bottom <= innerHeight && rc.left >= 0 && rc.right <= innerWidth) return;
          if (rc.width >= 24 && rc.height >= 24) return;   // 盒子已达标，无需担心
          const cls = (el.className && typeof el.className === 'string') ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '';
          res.offSample.push(el.tagName.toLowerCase() + cls + ' ' + Math.round(rc.width) + 'x' + Math.round(rc.height));
        });
        window.scrollTo(0, 0);
        return res;
      });
      for (const [k, sz] of r.small) (small[k] = small[k] || new Set()).add(sz);
      for (const k of r.noName) noName[k] = (noName[k] || 0) + 1;
      offview += r.offview;
      for (const k of (r.offSample || [])) (offWarn[k] = offWarn[k] || 0) + 1;
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();

  console.log(`\n  全站 ${pages.length} 页（390px，真实 Chrome）  加载失败 ${failed}`);
  console.log(`  未能完整判定: ${offview} 个（页尾元素 scrollIntoView 到不了视口中心）`);
  const ow = Object.keys(offWarn);
  if (ow.length) { console.log(`  ⚠ 其中盒子本身就 <24×24 的 ${ow.length} 种（这些才需要人工看）:`); ow.slice(0, 10).forEach(k => console.log('      ' + k)); }
  else console.log('  ✓ 未判定元素的盒子尺寸均 ≥24×24（可点区不会比盒子更小）');

  const sk = Object.keys(small);
  if (!sk.length) console.log('  ✓ 所有可测交互元素目标 ≥24×24');
  else {
    console.log(`  ✗ 目标过小 ${sk.length} 种:`);
    sk.forEach(k => console.log(`      ${k}  ×${small[k].size} 例  ${[...small[k]].slice(0, 3).join(' | ')}`));
  }
  const nk = Object.keys(noName);
  if (!nk.length) console.log('  ✓ 所有交互元素都有可访问名');
  else { console.log(`  ✗ 无可访问名 ${nk.length} 种:`); nk.slice(0, 8).forEach(k => console.log('      ' + k)); }
  // 显式退出码：发现问题必须返回非零，否则上层验收会当 PASS
  // （原先这些工具能打印 ✗ 却仍 exit 0，等于「永远绿」；实测证实过。）
  process.exit((sk.length + nk.length) ? 1 : 0);
})();
