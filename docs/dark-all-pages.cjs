#!/usr/bin/env node
/* 深色模式全站审计（真实 Chrome）
 * 此前只在几页抽查过深色；这里对每一页切到 dark 后检查：
 *   ① 文本对比度（WCAG AA，深色底）
 *   ② 是否有「深色下不可见」的元素（前景≈背景，差值极小）
 *   ③ 横向溢出（深色不应改变布局）
 * 用法: node dark-all.cjs <baseUrl> <pagesFile>
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
  const low = {}, invisible = {}; let measured = 0, skipped = 0, overflow = [], n = 0, failed = 0;

  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // 切深色（与站点自身切换逻辑一致）
      // ⚠️ 切深色后必须等**过渡结束**再测量！
      // 站点有 `transition: all .3s ease-in-out`，只等 120ms 会读到
      // **过渡中间态**的混合色，实测把正确颜色读成 rgb(117,118,124)，
      // 于是报出一堆"深色对比度不足"的假阳性（我第一版就是这样）。
      // 这里直接**禁用过渡**再切，从根本上去掉时序依赖。
      await pg.addStyleTag({ content: '*,*::before,*::after{transition:none !important;animation:none !important;}' });
      await pg.evaluate(() => { document.documentElement.classList.add('dark'); document.body && document.body.classList.add('dark'); });
      await new Promise(r => setTimeout(r, 250));
      const r = await pg.evaluate(() => {
        const items = []; let skippedN = 0, inv = 0, invSample = '';
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
          if (bg.grad || bg.alpha || bg.overlay || !bg.c) { skippedN++; return; }
          // 深色下不可见：前景与背景几乎同色
          const d = Math.max(Math.abs(fg.c[0] - bg.c[0]), Math.abs(fg.c[1] - bg.c[1]), Math.abs(fg.c[2] - bg.c[2]));
          if (d <= 8) { inv++; if (!invSample) invSample = el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 18) + ' "' + t.slice(0, 14) + '" fg=' + fg.c + ' bg=' + bg.c; }
          const size = parseFloat(cs.fontSize);
          items.push({ cls: String(el.className || '').slice(0, 22), tag: el.tagName.toLowerCase(), fg: fg.c, bg: bg.c, size, weight: cs.fontWeight });
        });
        return { items, skippedN, inv, invSample, ovf: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      measured += r.items.length; skipped += r.skippedN;
      if (r.ovf > 1) overflow.push(p + ' ' + r.ovf + 'px');
      if (r.inv) (invisible[p] = invisible[p] || []).push(r.invSample);
      for (const it of r.items) {
        const rr = ratio(it.fg, it.bg);
        const large = it.size >= 24 || (it.size >= 18.66 && +it.weight >= 700);
        const need = large ? 3 : 4.5;
        if (rr < need) {
          const k = it.tag + '.' + it.cls + '|' + it.fg.join(',') + '|' + it.bg.join(',') + '|' + it.size;
          if (!low[k]) low[k] = { r: rr, need, cnt: 0, fg: it.fg.join(','), bg: it.bg.join(','), page: p };
          low[k].cnt++;
        }
      }
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  深色模式全站审计 ${pages.length} 页（真实 Chrome）  加载失败 ${failed}`);
  console.log(`  已测实底文本 ${measured}   未测(渐变/半透明) ${skipped}`);
  console.log(`  深色下横向溢出: ${overflow.length ? overflow.join('; ') : '无 ✓'}`);
  const ik = Object.keys(invisible);
  console.log(`  前景≈背景（不可见）: ${ik.length ? ik.length + ' 页 ✗' : '无 ✓'}`);
  ik.slice(0, 6).forEach(p => console.log('      ' + p + '  ' + invisible[p][0]));
  const lk = Object.keys(low);
  if (!lk.length) console.log('  ✓ 深色下所有实底文本均达 AA');
  else { console.log(`  ✗ 深色下低于 AA 的样式 ${lk.length} 种：`); lk.sort((a,b)=>low[a].r-low[b].r).forEach(k => console.log(`      ${low[k].r.toFixed(2)}:1 ×${String(low[k].cnt).padStart(4)}  fg=rgb(${low[k].fg}) bg=rgb(${low[k].bg})  ${k.split('|')[0]}   例:${low[k].page}`)); }
  // 显式退出码：发现问题必须返回非零，否则上层验收会当 PASS
  // （原先这些工具能打印 ✗ 却仍 exit 0，等于「永远绿」；实测证实过。）
  process.exit((lk.length + ik.length + overflow.length) ? 1 : 0);
})();
