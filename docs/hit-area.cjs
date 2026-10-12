#!/usr/bin/env node
/* 用 elementFromPoint 量**实际可点区域**（而不是盒子尺寸）——
   触控目标的真正判据是可点范围，::after 撑开的区域不会体现在 getBoundingClientRect 里。
   注意：必须先真滚到元素所在位置，否则 elementFromPoint 返回 null，
   会被误读成"只有 1px"（这个坑我踩过）。 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:8911';
const TARGETS = [
  ['/#darkToggle', '#darkToggle', '深色切换按钮'],
  ['/posts/zen-framework/', '.toc ul li a', '文章目录链接'],
  ['/posts/zen-framework/', '.footer a', '页脚链接'],
  ['/posts/zen-framework/', '.article-meta kbd', '分类/标签 chip'],
  ['/posts/', '.section-head .more', 'MORE 链接'],
  ['/404.html', '.signature-back .back-home', '404 回首页'],
];
(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [path, sel, name] of TARGETS) {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pg.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
    await pg.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
    await new Promise(r => setTimeout(r, 600));
    const r = await pg.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const rc = el.getBoundingClientRect();
      const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      if (cy < 1 || cy > innerHeight - 1) return { offscreen: true };
      const hits = (dx, dy) => { const e = document.elementFromPoint(cx + dx, cy + dy); return !!(e && (e === el || el.contains(e) || e.closest(s))); };
      let L = 0, R = 0, U = 0, D = 0;
      for (let d = 1; d <= 20; d++) { if (hits(-d, 0)) L = d; else break; }
      for (let d = 1; d <= 20; d++) { if (hits(d, 0)) R = d; else break; }
      for (let d = 1; d <= 20; d++) { if (hits(0, -d)) U = d; else break; }
      for (let d = 1; d <= 20; d++) { if (hits(0, d)) D = d; else break; }
      return { w: L + R + 1, h: U + D + 1, boxW: Math.round(rc.width), boxH: Math.round(rc.height) };
    }, sel);
    if (!r) console.log(`  ${name.padEnd(14)} 元素不存在 (${sel})`);
    else if (r.offscreen) console.log(`  ${name.padEnd(14)} 不在视口内，跳过`);
    else {
      const ok = r.w >= 24 && r.h >= 24;
      console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(14)} 盒子 ${r.boxW}×${r.boxH}   实际可点 ${r.w}×${r.h}`);
    }
    await pg.close();
  }
  await b.close();
})();
