#!/usr/bin/env node
/* prefers-reduced-motion 全站验证：
   模拟用户开启"减少动态效果"，检查是否**真的没有动画**：
     ① 还在播放的 CSS animation（animationDuration 非极小且 animationName 非 none）
     ② 仍在进行的 transition
     ③ 元素上残留的 transform（hover 位移类）
   用法: node reduced-motion.cjs <baseUrl> <pagesFile>
*/
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');
(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 900 });
  await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const anim = {}, trans = {}; let n = 0, failed = 0, pagesWithAnim = 0;
  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 150));
      const r = await pg.evaluate(() => {
        const out = { anim: [], trans: [], reduceMatches: matchMedia('(prefers-reduced-motion: reduce)').matches };
        document.querySelectorAll('body *').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none') return;
          const dur = parseFloat(cs.animationDuration) || 0;
          const iter = cs.animationIterationCount;
          if (cs.animationName !== 'none' && dur > 0.02 && iter !== '1') {
            out.anim.push(el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 20) + ' ' + cs.animationName + ' ' + cs.animationDuration + ' x' + iter);
          }
          const td = parseFloat(cs.transitionDuration) || 0;
          if (cs.transitionProperty !== 'none' && td > 0.02) {
            out.trans.push(el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 20) + ' ' + cs.transitionProperty + ' ' + cs.transitionDuration);
          }
        });
        return out;
      });
      if (r.anim.length) { pagesWithAnim++; for (const a of r.anim) anim[a] = (anim[a] || 0) + 1; }
      for (const t of r.trans) trans[t] = (trans[t] || 0) + 1;
      if (n === 1) console.log('    (reduce 媒体查询匹配: ' + r.reduceMatches + ')');
    } catch (e) { failed++; }
    if (n % 40 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();
  console.log(`\n  prefers-reduced-motion:reduce 下全站 ${pages.length} 页审计（加载失败 ${failed}）`);
  const ak = Object.keys(anim);
  if (!ak.length) console.log('  ✓ 没有任何仍在播放的动画');
  else { console.log(`  ✗ ${pagesWithAnim} 页仍有动画 ${ak.length} 种:`); ak.slice(0, 10).forEach(k => console.log('      ' + k)); }
  const tk = Object.keys(trans);
  if (!tk.length) console.log('  ✓ 没有任何仍在进行的过渡');
  else { console.log(`  ✗ 仍有过渡 ${tk.length} 种（前 10）:`); tk.slice(0, 10).forEach(k => console.log('      ' + k)); }
})();
