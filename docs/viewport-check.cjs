#!/usr/bin/env node
/* 多视口渲染检查：在真实 Chrome 里以多个视口加载页面，检测
   ① 横向溢出（scrollWidth > clientWidth）
   ② 元素溢出视口右边界
   ③ 控制台报错
   ④ 可点击元素是否过小（<24px，移动端可用性）
   用法: node viewport-check.cjs [baseUrl] [paths...]
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const BASE = process.argv[2] || 'https://xfengyin.github.io';
const PATHS = process.argv.slice(3);

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812, isMobile: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true },
  { name: 'tablet-768', width: 768, height: 1024, isMobile: false },
  { name: 'desktop-1280', width: 1280, height: 900, isMobile: false },
];
const DEFAULT_PATHS = ['/', '/posts/', '/categories/', '/tags/', '/posts/zen-framework/',
  '/posts/blog-guide-index/', '/categories/dian-lu-she-ji/', '/tags/python/', '/404.html'];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const problems = [];
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, deviceScaleFactor: 1 });
    for (const pth of (PATHS.length ? PATHS : DEFAULT_PATHS)) {
      const errs = [];
      const onErr = m => { if (m.type() === 'error') errs.push(m.text().slice(0, 100)); };
      page.on('console', onErr);
      page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).slice(0, 100)));
      try {
        await page.goto(BASE + pth, { waitUntil: 'networkidle2', timeout: 45000 });
        const r = await page.evaluate(() => {
          const de = document.documentElement;
          const overflow = de.scrollWidth - de.clientWidth;
          // 找出超出视口右边界的元素（忽略固定定位与隐藏元素）
          const bad = [];
          const vw = de.clientWidth;
          document.querySelectorAll('body *').forEach(el => {
            const s = getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') return;
            const rc = el.getBoundingClientRect();
            if (rc.width > 0 && rc.right > vw + 2) {
              bad.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40), right: Math.round(rc.right) });
            }
          });
          const small = [];
          document.querySelectorAll('a,button').forEach(el => {
            const rc = el.getBoundingClientRect();
            if (rc.width > 0 && rc.height > 0 && (rc.height < 24 || rc.width < 24)) {
              small.push({ t: (el.textContent || '').trim().slice(0, 18), w: Math.round(rc.width), h: Math.round(rc.height) });
            }
          });
          return { overflow, bad: bad.slice(0, 5), badCount: bad.length, smallCount: small.length, small: small.slice(0, 3), vw };
        });
        if (r.overflow > 1) problems.push(`${vp.name} ${pth} 横向溢出 ${r.overflow}px（视口 ${r.vw}），越界元素 ${r.badCount}`);
        if (errs.length) problems.push(`${vp.name} ${pth} 控制台错误: ${errs[0]}`);
        const flag = (r.overflow > 1 || errs.length) ? '✗' : '✓';
        console.log(`${flag} ${vp.name.padEnd(13)} ${pth.padEnd(30)} overflow=${r.overflow} 越界=${r.badCount} 小控件=${r.smallCount}`);
      } catch (e) {
        problems.push(`${vp.name} ${pth} 加载失败: ${e.message.slice(0, 80)}`);
        console.log(`✗ ${vp.name.padEnd(13)} ${pth.padEnd(30)} 加载失败`);
      }
    }
    await page.close();
  }
  await browser.close();
  console.log('\n================ 汇总 ================');
  if (!problems.length) console.log('无问题');
  else problems.forEach(p => console.log('  ' + p));
  process.exit(problems.length ? 1 : 0);
})();
