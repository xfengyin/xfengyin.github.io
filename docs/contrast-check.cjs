#!/usr/bin/env node
/* WCAG 对比度检查（真实 Chrome）
 *
 * 设计要点（都是从踩坑里来的）：
 *  1. 只测**实色背景**。计算样式看不到 CSS 渐变与背景图，
 *     直接往上找会拿到祖先的白色，把"深青渐变上的白字"误判成"白底白字 1.00:1"。
 *     因此背景含渐变/图片的元素**不计入失败**，而是单独列在"未能测量"里 ——
 *     关键是**不能静默丢弃**，否则报告会假装"全站都测过了"。
 *  2. 未能测量的情况要用**截图采样**补测（ROUND-NOTES 里对题词区的做法：
 *     白字在实际背景 rgb(42,94,102) 上是 7.26:1，远超标准）。
 *  3. 大字判定按 WCAG：>=24px 或 >=18.66px 且 bold，阈值 3:1；其余 4.5:1。
 *
 * 用法: node contrast-check.cjs [baseUrl] [path]
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');

const BASE = process.argv[2] || 'https://xfengyin.github.io';
const P = process.argv[3] || '/';

function lum(c) {
  const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const pg = await b.newPage();
  await pg.setCacheEnabled(false);
  await pg.setViewport({ width: 1280, height: 900 });
  await pg.goto(BASE + P, { waitUntil: 'networkidle2', timeout: 45000 });

  const res = await pg.evaluate(() => {
    const items = [], skipped = [];
    const parse = s => {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const bgOf = el => {
      let n = el, sawFixed = false;
      while (n) {
        const cs = getComputedStyle(n);
        if (cs.position === 'fixed' || cs.position === 'absolute') sawFixed = true;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return { grad: true, el: n };
        const p = parse(cs.backgroundColor);
        // 半透明要单独判（工具栏滚动后是 hsla(0,0%,100%,.7)，
        // 直接往上走会拿到 body 白，把"白字压半透明+深青渐变"误判成"白底白字"）。
        // 顺序很重要：**先判「是否只是走到了 body/html」再判实色**。
        // 未滚动时的顶栏：button 透明 → header 透明(fixed) → body 白。
        // 那个白是页面底色，不是顶栏真实的底 —— 顶栏浮在渐变题词区之上。
        // （原先先判实色，于是 body 的白被当成真实背景，误报"白底白字 1.00:1"。）
        if ((n.tagName === 'BODY' || n.tagName === 'HTML') && sawFixed) return { overlay: true, el: n };
        if (p && p.a > 0.9) return { c: p.c, el: n };
        if (p && p.a > 0) return { alpha: true, el: n, c: p.c, a: p.a };
        n = n.parentElement;
      }
      return { c: null, el: null };
    };
    document.querySelectorAll('body *').forEach(el => {
      if (el.children.length) return;
      const t = (el.textContent || '').trim();
      if (!t) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const fg = parse(cs.color);
      if (!fg) return;
      const bg = bgOf(el);
      const rec = {
        tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 22),
        text: t.slice(0, 18), size: parseFloat(cs.fontSize), weight: cs.fontWeight,
      };
      if (bg.grad || bg.alpha || bg.overlay || !bg.c) { skipped.push({ ...rec, reason: bg.grad ? '背景含渐变/图片' : (bg.alpha ? '背景半透明(需采样)' : (bg.overlay ? '悬浮在其它内容之上(需采样)' : '找不到实色背景')) }); return; }
      items.push({ ...rec, fg: fg.c, bg: bg.c });
    });
    return { items, skipped };
  });
  await b.close();

  const seen = new Map();
  for (const it of res.items) {
    const r = ratio(it.fg, it.bg);
    const large = it.size >= 24 || (it.size >= 18.66 && +it.weight >= 700);
    const need = large ? 3 : 4.5;
    if (r < need) {
      const k = it.cls + '|' + it.fg.join(',') + '|' + it.bg.join(',') + '|' + it.size;
      if (!seen.has(k)) seen.set(k, { ...it, r, need });
    }
  }
  console.log(`  已测实底文本: ${res.items.length} 个节点`);
  if (!seen.size) console.log('  ✓ 全部达到 WCAG AA');
  else {
    console.log(`  ✗ 低于 AA 的样式: ${seen.size} 种`);
    for (const v of seen.values())
      console.log(`    ${v.r.toFixed(2)}:1 (需 ${v.need}) ${v.size}px ${v.tag}.${v.cls} fg=rgb(${v.fg}) bg=rgb(${v.bg}) "${v.text}"`);
  }
  if (res.skipped.length) {
    const byReason = {};
    res.skipped.forEach(s => { (byReason[s.reason] = byReason[s.reason] || new Set()).add(s.cls || s.tag); });
    console.log(`  ⚠ 未能测量: ${res.skipped.length} 个（计算样式看不到渐变/图片/半透明背景）`);
    for (const [r, set] of Object.entries(byReason)) console.log(`      ${r}: ${[...set].slice(0, 6).join(', ')}`);
    console.log('      这些需要用截图采样补测，不能当作"已通过"');
  }

  /* ---- 已用截图采样人工核过的「未能测量」项，避免每次复报 ----
     做法：截取该区域 PNG → 直接解 PNG 扫描线取真实像素 → 用同一套 WCAG 公式算。
     （ImageMagick 读不了超 16KP 高的整页图，所以走 python 直接解。）
     2026-10-13 实测：
       题词区白字（hero-title / subtitle）：背景 rgb(42,94,102) → 7.26:1 ✓
       工具栏白字（dark-toggle / my-menu）：背景 rgb(27,60,71)~rgb(48,78,88) → 8.91~11.77:1 ✓
       首页搜索区文字：背景为渐变题词区，同题词区结论 ✓
     若今后这几处样式有改动，需要重新采样。 */
  const VERIFIED_BY_SAMPLING = {
    'hero-title': '7.26:1 (题词区渐变, 截图采样)',
    'subtitle': '7.26:1 (题词区渐变, 截图采样)',
    'dark-toggle': '8.91~11.77:1 (工具栏半透明白叠深青, 截图采样)',
    'my-menu': '8.91~11.77:1 (同上)',
    'seal': '题词区装饰, 非文字内容',
    'num': '题词区渐变, 同题词区结论',
    'label': '题词区渐变, 同题词区结论',
    'h1': '题词区渐变, 同题词区结论',
    'vh': '视觉隐藏(屏幕阅读器专用), 无需对比度',
  };
  const known = res.skipped.filter(s => VERIFIED_BY_SAMPLING[s.cls]);
  if (known.length) {
    const uniq = [...new Set(known.map(k => k.cls))];
    console.log(`  ℹ 其中 ${known.length} 个已用截图采样人工核实过（不算失败）:`);
    uniq.forEach(c => console.log(`      ${c}: ${VERIFIED_BY_SAMPLING[c]}`));
  }
})();
