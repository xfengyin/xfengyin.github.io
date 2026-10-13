#!/usr/bin/env node
/* 交互行为实测（真实浏览器，移动视口）
 *
 * 前几轮验证过暗色切换、搜索输入、上下篇点击。
 * 本脚本补上**从未真正操作过**的四项：
 *   ① 移动端菜单：点「菜单」是否展开？再点是否收起？
 *   ② 移动端菜单里的链接能否跳到正确页面？
 *   ③ 搜索结果的**点击**能否落到正确文章？（此前只验证了结果能出现）
 *   ④ 滚动时顶栏是否加上 .enter 类（粘性样式切换）
 *
 * 注意：不能只看元素存在或类名，要**真的点、真的滚动、看真的变化**。
 * 用法: node interaction-verify.cjs <baseUrl>
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');

const BASE = process.argv[2] || 'https://xfengyin.github.io';

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const issues = [];

  // ============ 移动端：菜单 ============
  {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pg.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });

    const before = await pg.evaluate(() => {
      const m = document.getElementById('scrollMenu');
      const t = document.getElementById('menuToggle');
      return {
        menuDisplay: m ? getComputedStyle(m).display : '(无)',
        menuOpen: m ? m.classList.contains('open') : false,
        toggleDisplay: t ? getComputedStyle(t).display : '(无)',
      };
    });
    console.log('  ① 移动端菜单（390px）');
    console.log(`      初始: 菜单 display=${before.menuDisplay} open=${before.menuOpen} 按钮 display=${before.toggleDisplay}`);

    // 真的点击「菜单」
    await pg.click('#menuToggle');
    await new Promise(r => setTimeout(r, 400));
    const opened = await pg.evaluate(() => {
      const m = document.getElementById('scrollMenu');
      const t = document.getElementById('menuToggle');
      return {
        display: getComputedStyle(m).display,
        open: m.classList.contains('open'),
        expanded: t.getAttribute('aria-expanded'),
      };
    });
    console.log(`      点击后: display=${opened.display} open=${opened.open} aria-expanded=${opened.expanded}`);
    if (!opened.open || opened.display === 'none') issues.push('点「菜单」后菜单没有展开');

    // 再点一次应收起
    await pg.click('#menuToggle');
    await new Promise(r => setTimeout(r, 400));
    const closed = await pg.evaluate(() => {
      const m = document.getElementById('scrollMenu');
      return { display: getComputedStyle(m).display, open: m.classList.contains('open') };
    });
    console.log(`      再点后: display=${closed.display} open=${closed.open}`);
    if (closed.open) issues.push('再点「菜单」没有收起');

    // ② 菜单里的链接
    await pg.click('#menuToggle');
    await new Promise(r => setTimeout(r, 400));
    const menuLinks = await pg.evaluate(() => {
      const m = document.getElementById('scrollMenu');
      return [...m.querySelectorAll('a')].map(a => ({ t: (a.textContent || '').trim(), href: a.getAttribute('href') }));
    });
    console.log('  ② 菜单内链接:');
    menuLinks.forEach(l => console.log(`      ${l.t.padEnd(14)} → ${l.href}`));
    // 点「文章」
    const art = menuLinks.find(l => /文章/.test(l.t));
    if (art) {
      await pg.click('#scrollMenu a[href="/posts/"]').catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
      const url = pg.url();
      const hasList = await pg.evaluate(() => !!document.querySelector('.post-card'));
      console.log(`      点击「文章」→ ${url.replace(BASE, '')}  列表=${hasList ? '✓' : '✗'}`);
      if (!url.includes('/posts')) issues.push('菜单「文章」未跳到 /posts/');
      if (!hasList) issues.push('菜单「文章」落地页无文章列表');
    }
    await pg.close();
  }

  // ============ ③ 搜索结果的点击 ============
  {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 1280, height: 900 });
    await pg.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
    // 用一篇真实文章的标题片段搜
    await pg.evaluate(() => {
      const i = document.getElementById('searchInput');
      i.focus(); i.value = '示波器'; i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 400));
    const res = await pg.evaluate(() => {
      const items = [...document.querySelectorAll('.search-item')];
      return items.map(a => ({ title: (a.textContent || '').trim().slice(0, 24), href: a.getAttribute('href') }));
    });
    console.log(`\n  ③ 搜索「示波器」→ ${res.length} 条`);
    res.slice(0, 2).forEach(r => console.log(`      ${r.title}  → ${r.href}`));
    if (res.length) {
      const expectTitle = res[0].title;
      await pg.click('.search-item');
      await new Promise(r => setTimeout(r, 1500));
      const landed = await pg.evaluate(() => {
        const h = document.querySelector('h1, .article-card h1');
        return { url: location.pathname, h1: h ? h.textContent.trim() : '' };
      });
      const ok = landed.h1 && (landed.h1.includes(expectTitle.slice(0, 8)) || expectTitle.includes(landed.h1.slice(0, 8)));
      console.log(`      点击首条 → ${landed.url}  h1「${landed.h1.slice(0, 26)}」 ${ok ? '✓' : '✗'}`);
      if (!landed.url.startsWith('/posts/')) issues.push('搜索结果点击后不在文章页');
      if (!ok) issues.push(`搜索结果点击后 h1 与条目不符: ${landed.h1}`);
    } else {
      issues.push('搜索「示波器」没有结果');
    }
    await pg.close();
  }

  // ============ ④ 滚动时顶栏样式 ============
  {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 1280, height: 900 });
    await pg.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
    const top = await pg.evaluate(() => {
      const t = document.getElementById('toolbar');
      return { enter: t.classList.contains('enter'), bg: getComputedStyle(t).backgroundColor };
    });
    await pg.evaluate(() => window.scrollTo(0, 900));
    await new Promise(r => setTimeout(r, 700));
    const scrolled = await pg.evaluate(() => {
      const t = document.getElementById('toolbar');
      return { enter: t.classList.contains('enter'), bg: getComputedStyle(t).backgroundColor };
    });
    console.log('\n  ④ 顶栏滚动样式');
    console.log(`      顶部: enter=${top.enter} bg=${top.bg}`);
    console.log(`      滚动后: enter=${scrolled.enter} bg=${scrolled.bg}`);
    if (!scrolled.enter) issues.push('滚动后顶栏未加 .enter（粘性样式未生效）');
    await pg.close();
  }

  await b.close();
  console.log();
  if (!issues.length) { console.log('  结论: 四项交互均按预期工作 ✓'); process.exit(0); }
  console.log(`  结论: ${issues.length} 处问题`);
  issues.forEach(x => console.log('    - ' + x));
  process.exit(1);
})().catch(e => { console.log('ERR', e.message.slice(0, 200)); process.exit(2); });