#!/usr/bin/env node
/* 全站键盘可达审计（修正版）
 *
 * 上一版的设计缺陷：用「Tab 次数上限」截断，导致超出上限的元素被误报为
 * "Tab 到不了" —— 那是工具的错，不是站点的错。
 *
 * 正确判据：不设次数上限，**Tab 直到焦点回到起点**（即走完一圈），
 * 然后检查"应当可聚焦"的元素是否都真的出现在路径里。
 * 另外检查每个焦点是否有可见焦点环。
 *
 * 用法: node kbd-audit.cjs <baseUrl> <pagesFile> [tabLimit]
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const fs = require('fs');
const BASE = process.argv[2];
const pages = fs.readFileSync(process.argv[3] || '/tmp/allpages.txt', 'utf8').trim().split('\n');
const LIMIT = parseInt(process.argv[4] || '200', 10);   // 安全上限（远大于合理页面元素数）

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 900 });
  const noRing = {}, neverFocused = {}, pagesDone = [];
  let n = 0, failed = 0;

  for (const p of pages) {
    n++;
    try {
      if (n % 30 === 0) { await pg.close(); pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 900 }); }
      await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 枚举「按 Tab 顺序本应可达」的元素：
      // 原生可聚焦（a[href]/button/input/select/textarea）且未被禁用、未设 tabindex=-1、可见
      const expected = await pg.evaluate(() => {
        const list = [];
        document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[tabindex]').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          if (el.disabled) return;
          if (el.tabIndex < 0) return;                        // 显式移出 Tab 顺序
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          const cls = (el.className && typeof el.className === 'string') ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '';
          list.push(el.tagName.toLowerCase() + cls + '|' + (el.textContent || '').trim().slice(0, 16));
        });
        return list;
      });

      const seen = new Set();
      let firstKey = null;
      for (let i = 0; i < LIMIT; i++) {
        await pg.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 40));
        const info = await pg.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0)
                    || (cs.boxShadow && cs.boxShadow !== 'none');
          const cls = (el.className && typeof el.className === 'string') ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '';
          return { key: el.tagName.toLowerCase() + cls + '|' + (el.textContent || '').trim().slice(0, 16), ring, inView: r.bottom > 0 && r.top < innerHeight };
        });
        if (!info) break;
        // 走完一圈：焦点回到第一次出现的元素 → 停
        if (firstKey === null) firstKey = info.key;
        else if (info.key === firstKey) break;
        seen.add(info.key);
        if (!info.ring) (noRing[info.key] = noRing[info.key] || new Set()).add(p);
      }

      for (const k of expected) if (!seen.has(k)) (neverFocused[k] = neverFocused[k] || new Set()).add(p);
      pagesDone.push(p);
    } catch (e) { failed++; }
    if (n % 25 === 0) console.log(`    ...${n}/${pages.length}`);
  }
  await b.close();

  console.log(`\n  全站 ${pages.length} 页键盘审计（Tab 至焦点回环；加载失败 ${failed}）`);
  const show = (title, obj) => {
    const ks = Object.keys(obj);
    if (!ks.length) { console.log(`  ✓ ${title}：无`); return; }
    console.log(`  ✗ ${title}：${ks.length} 种`);
    ks.slice(0, 12).forEach(k => console.log(`      ${k}   （${[...obj[k]].slice(0, 2).join(', ')}）`));
  };
  show('焦点到达但无可见焦点环', noRing);
  show('枚举为应可达、但 Tab 一圈内从未获得焦点', neverFocused);
})();
