#!/usr/bin/env node
/* 视觉回归截图：每种页面类型 × 浅色/深色 × 桌面/移动，各出一张整页图。
 *
 * 为什么需要：docs/ 里已有 16 项机器可判定的检查（对比度、目标尺寸、CLS…），
 * 但**视觉本身**一直只能靠人眼。改样式时没有 before/after 就没法自证「变好了」，
 * 也没法发现「卡片封面被 object-fit 裁掉半句话」这类能通过全部 16 项检查、
 * 却一眼看得出坏掉的问题。
 *
 * 用法:
 *   node shot-pages.cjs <baseUrl> <outDir>
 *   node shot-pages.cjs http://127.0.0.1:8801 /tmp/before
 *
 * 依赖（与其余检查脚本一致，见 docs/ENVIRONMENT.md）：
 *   puppeteer  -> /tmp/pptr/node_modules/puppeteer
 *   Chrome     -> PUPPETEER_CACHE_DIR=${HOME}/.cache/puppeteer
 *   中文字体 + Noto Color Emoji 需已装进系统，否则截图里 emoji 会是空框。
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:8801';
const OUT = process.argv[3] || '/tmp/shots';
// 每一种「页面类型」各取一个代表页；改模板时这几张能覆盖全部布局形态
const PAGES = [
  ['home', '/'],
  ['posts', '/posts/'],
  ['article', '/posts/zen-framework/'],
  ['guide', '/posts/blog-guide-index/'],
  ['categories', '/categories/'],   // taxonomy_list.html
  ['tags', '/tags/'],
  ['tag-single', '/tags/python/'],   // taxonomy_single.html —— 89 个页面用这一个模板
  ['404', '/404.html'],
];
const VIEWPORTS = [['desktop', 1440, 900], ['mobile', 390, 844]];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0;
  for (const [name, url] of PAGES) {
    for (const [vp, w, h] of VIEWPORTS) {
      for (const dark of [false, true]) {
        // 每个组合一个独立上下文：否则 localStorage 里的主题会串到后面的截图
        const ctx = await browser.createBrowserContext();
        const page = await ctx.newPage();
        await page.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
        if (dark) {
          await page.evaluateOnNewDocument(() => {
            try { localStorage.setItem('xfengyin-dark', '1'); } catch (e) {}
          });
        }
        await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 45000 });
        // 滚一遍触发懒加载，再回顶部，避免截图里的图片是空的
        await page.evaluate(async () => {
          const step = Math.round(innerHeight * 0.9);
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
        });
        await new Promise(r => setTimeout(r, 400));
        const file = `${OUT}/${name}-${vp}${dark ? '-dark' : ''}.png`;
        await page.screenshot({ path: file, fullPage: true });
        n++;
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(`截图 ${n} 张 -> ${OUT}`);
})().catch(e => { console.error('截图失败:', e.message); process.exit(1); });
