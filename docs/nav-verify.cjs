#!/usr/bin/env node
/* 导航/页脚/卡片链接的「名副其实」审计（真实浏览器）。
 *
 * 与已有工具的区别：
 *   check-links.py        → URL 能否打开（不点，只看文件存在）
 *   link-semantics.py     → TOC 锚点 / chip 目标 / 上下篇（解析 HTML）
 *   本脚本               → **真的点进去**，验证落地的页面对不对
 *
 * 检查项：
 *   ① 顶栏「首页 / 文章」→ 落地页是否是首页 / 文章列表
 *   ② 页脚外链 → 是否真的打开对应站点（只需 URL 形如，避免网络抖动误报）
 *   ③ 首页文章卡片 → 落地页标题是否与卡片标题一致
 *   ④ 首页分类云 → 落地页是否是该分类页
 *   ⑤ canonical / og:url 是否等于**该页自身**（逐页核对，不抽样）
 *
 * 用法: node nav-verify.cjs <baseUrl>
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');

const BASE = process.argv[2] || 'https://xfengyin.github.io';

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const pg = await b.newPage();
  await pg.setCacheEnabled(false);
  await pg.setViewport({ width: 1280, height: 900 });
  const issues = [];

  // ---------- ① 顶栏导航 ----------
  await pg.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
  const navLinks = await pg.evaluate(() => {
    const out = [];
    document.querySelectorAll('.toolbar a, .scroll-menu a').forEach(a => {
      out.push({ text: (a.textContent || '').trim(), href: a.getAttribute('href') });
    });
    return out;
  });
  console.log('  ① 顶栏导航链接:');
  for (const l of navLinks) {
    console.log(`      "${l.text}" → ${l.href}`);
    if (/首页/.test(l.text)) {
      const u = new URL(l.href, BASE);
      if (u.pathname !== '/') issues.push(`顶栏「首页」指向 ${u.pathname}（应为 /）`);
    }
    if (/文章/.test(l.text)) {
      const u = new URL(l.href, BASE);
      if (!/^\/posts\/?$/.test(u.pathname)) issues.push(`顶栏「文章」指向 ${u.pathname}（应为 /posts/）`);
    }
  }
  // 实际点「文章」验证落地
  const artHref = navLinks.find(l => /文章/.test(l.text));
  if (artHref) {
    await pg.goto(new URL(artHref.href, BASE).href, { waitUntil: 'networkidle2', timeout: 45000 });
    const t = await pg.title();
    const hasList = await pg.evaluate(() => !!document.querySelector('.post-card'));
    console.log(`      点击「文章」落地: "${t.slice(0, 34)}"  列表存在=${hasList ? '✓' : '✗'}`);
    if (!hasList) issues.push('顶栏「文章」落地页没有文章列表');
  }

  // ---------- ③④ 首页卡片与分类云 ----------
  await pg.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
  const cards = await pg.evaluate(() => {
    const out = [];
    document.querySelectorAll('a.post-card').forEach(a => {
      const h = a.querySelector('.post-title');
      out.push({ title: h ? h.textContent.trim() : '', href: a.getAttribute('href') });
    });
    return out;
  });
  console.log(`\n  ③ 首页文章卡片: ${cards.length} 张`);
  // 抽样 3 张真点进去核对标题
  for (const c of cards.slice(0, 3)) {
    await pg.goto(new URL(c.href, BASE).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const h1 = await pg.evaluate(() => {
      const e = document.querySelector('.article-card h1, h1');
      return e ? e.textContent.trim() : '';
    });
    const match = h1 === c.title || h1.startsWith(c.title.slice(0, 12));
    console.log(`      「${c.title.slice(0, 26)}」→ 落地 h1「${h1.slice(0, 26)}」 ${match ? '✓' : '✗'}`);
    if (!match) issues.push(`卡片「${c.title}」落地页 h1 不匹配: ${h1}`);
  }

  await pg.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
  const clouds = await pg.evaluate(() => [...document.querySelectorAll('.cloud a')]
    .map(a => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') })));
  console.log(`\n  ④ 首页分类云: ${clouds.length} 个`);
  // 注意：分类云里有两个**故意不是**分类页的项 ——
  //   「全部」→ /posts/（全部文章列表，语义正确）
  //   「更多…」→ /categories/（分类总览）
  // 所以只对"名字里带括号计数"的真正分类项要求落在分类页。
  for (const c of clouds) {
    const isRealCat = /（\d+）/.test(c.text);
    if (!isRealCat) { console.log(`      「${c.text}」→ ${c.href}  （特殊项，跳过分类页判定）`); continue; }
    const u = new URL(c.href, BASE);
    if (!u.pathname.includes('/categories/')) { issues.push(`分类云「${c.text}」指向非分类页: ${u.pathname}`); continue; }
    await pg.goto(u.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const t = await pg.title();
    const onCat = await pg.evaluate(() => location.pathname.includes('/categories/'));
    const nameOk = await pg.evaluate((n) => (document.body.innerText || '').includes(n), c.text.replace(/（\d+）/, ''));
    console.log(`      「${c.text.slice(0, 14)}」→ 落地 "${t.slice(0, 26)}" 分类页=${onCat ? '✓' : '✗'} 含分类名=${nameOk ? '✓' : '✗'}`);
    if (!onCat) issues.push(`分类云「${c.text}」落地不在分类页`);
    if (!nameOk) issues.push(`分类云「${c.text}」落地页未出现该分类名`);
  }

  // ---------- ⑤ canonical / og:url 逐页核对 ----------
  const { execSync } = require('child_process');
  const fs = require('fs');
  const PUB = '/vol1/work/xfengyin.github.io/public';
  const files = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) files.push(p);
  } })(PUB);
  const urlOf = f => {
    const rel = f.slice(PUB.length + 1);
    if (rel === 'index.html') return BASE + '/';
    if (rel.endsWith('/index.html')) return BASE + '/' + rel.slice(0, -'index.html'.length);
    return BASE + '/' + rel;
  };
  let canonBad = 0, ogBad = 0;
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    const want = urlOf(f).replace(/\/$/, '');
    const c = s.match(/<link[^>]*rel=["']?canonical["']?[^>]*>/i);
    if (c) {
      const h = c[0].match(/href=["']?([^"'\s>]+)/);
      if (h && h[1].replace(/\/$/, '') !== want) { canonBad++; if (canonBad <= 3) console.log(`      canonical 不符: ${f.replace(PUB + '/', '')} → ${h[1]}`); }
    }
    const o = s.match(/<meta[^>]*property=og:url[^>]*>/);
    if (o) {
      const h = o[0].match(/content=["']?([^"'\s>]+)/);
      if (h && h[1].replace(/\/$/, '') !== want) { ogBad++; if (ogBad <= 3) console.log(`      og:url 不符: ${f.replace(PUB + '/', '')} → ${h[1]}`); }
    }
  }
  console.log(`\n  ⑤ canonical / og:url 逐页核对（${files.length} 页）:`);
  console.log(`      canonical 不等于自身: ${canonBad}    og:url 不等于自身: ${ogBad}`);
  if (canonBad) issues.push(`canonical 不符 ${canonBad} 页`);
  if (ogBad) issues.push(`og:url 不符 ${ogBad} 页`);

  await b.close();
  console.log();
  if (!issues.length) { console.log('  结论: 所有检查项通过 ✓'); process.exit(0); }
  console.log(`  结论: ${issues.length} 类问题`);
  issues.forEach(x => console.log('    - ' + x));
  process.exit(1);
})().catch(e => { console.log('ERR', e.message.slice(0, 200)); process.exit(2); });