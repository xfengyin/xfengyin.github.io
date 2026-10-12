#!/usr/bin/env node
/* 全站对比度审计（真实 Chrome）：111 页全部跑，而不是抽几页。
 * 只判实色背景；渐变/图片/半透明背景的元素单独计数（需截图采样）。
 * 用法: node contrast-all.cjs <baseUrl> <pagesFile>
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');

function lum(c) { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 900 });
  const bad = {}; let skipped = 0, measured = 0, n = 0, failed = 0;
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const r = await pg.evaluate(() => {
        const items = [], skipped = [];
        const parse = s => { const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/); return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };
        const bgOf = el => {
          let x = el, sawFixed = false;
          while (x) {
            const cs = getComputedStyle(x);
            if (cs.position === 'fixed' || cs.position === 'absolute') sawFixed = true;
            if (cs.backgroundImage && cs.backgroundImage !== 'none') return { grad: true };
            const q = parse(cs.backgroundColor);
            if ((x.tagName === 'BODY' || x.tagName === 'HTML') && sawFixed) return { overlay: true };
            if (q && q.a > 0.9) return { c: q.c };
            if (q && q.a > 0) return { alpha: true };
            x = x.parentElement;
          }
          return {};
        };
        document.querySelectorAll('body *').forEach(el => {
          if (el.children.length) return;
          const t = (el.textContent || '').trim(); if (!t) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          const fg = parse(cs.color); if (!fg) return;
          const bg = bgOf(el);
          const rec = { cls: String(el.className || '').slice(0, 24), tag: el.tagName.toLowerCase(), size: parseFloat(cs.fontSize), weight: cs.fontWeight };
          if (bg.grad || bg.alpha || bg.overlay || !bg.c) { skipped.push(rec); return; }
          items.push({ ...rec, fg: fg.c, bg: bg.c });
        });
        return { items, skippedN: skipped.length };
      });
      measured += r.items.length; skipped += r.skippedN;
      for (const it of r.items) {
        const rr = ratio(it.fg, it.bg);
        const large = it.size >= 24 || (it.size >= 18.66 && +it.weight >= 700);
        const need = large ? 3 : 4.5;
        if (rr < need) {
          const k = it.tag + '.' + it.cls + '|' + it.fg.join(',') + '|' + it.bg.join(',') + '|' + it.size;
          (bad[k] = bad[k] || { r: rr, need, pages: new Set(), sample: '' }).pages.add(p);
          bad[k].sample = it.size + 'px';
        }
      }
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  全站 ${pages.length} 页对比度审计（真实 Chrome）  加载失败 ${failed}`);
  console.log(`  已测实底文本节点: ${measured}   因渐变/半透明未测: ${skipped}`);
  const ks = Object.keys(bad);
  if (!ks.length) console.log('  ✓ 所有实底文本均达 WCAG AA');
  else {
    console.log(`  ✗ 低于 AA 的样式 ${ks.length} 种：`);
    ks.forEach(k => console.log(`      ${bad[k].r.toFixed(2)}:1 (需 ${bad[k].need}) ${bad[k].sample} ${k.split('|')[0]}  出现在 ${bad[k].pages.size} 页`));
  }
})();
