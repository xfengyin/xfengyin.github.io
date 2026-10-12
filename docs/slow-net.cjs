#!/usr/bin/env node
/* 慢网/断网行为审计
 * 用 CDP 网络节流模拟 3G / 慢 4G，测量：
 *   ① 首屏多久出现可读内容（不是"加载完成"，而是"用户能开始读"）
 *   ② 关键资源阻塞情况
 *   ③ 断网时（离线）页面是否仍能显示已缓存内容
 * 用法: node slow-net.cjs <baseUrl> [path]
 */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer');
const BASE = process.argv[2];
const PATH = process.argv[3] || '/posts/zen-framework/';

const PROFILES = {
  '慢 4G (400kbps/400ms)': { downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 400 },
  '3G (160kbps/300ms)': { downloadThroughput: 160 * 1024 / 8, uploadThroughput: 160 * 1024 / 8, latency: 300 },
  '慢 3G (50kbps/1s)': { downloadThroughput: 50 * 1024 / 8, uploadThroughput: 50 * 1024 / 8, latency: 1000 },
};

(async () => {
  const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [name, prof] of Object.entries(PROFILES)) {
    const pg = await b.newPage();
    await pg.setCacheEnabled(false);
    await pg.setViewport({ width: 390, height: 844, isMobile: true });
    const cdp = await pg.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...prof });

    const t0 = Date.now();
    let firstText = null, firstPaint = null, bytes = 0, reqs = 0;
    pg.on('response', async r => {
      reqs++;
      try { const h = r.headers()['content-length']; if (h) bytes += +h; } catch (e) {}
    });
    await pg.goto(BASE + PATH, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const domTime = Date.now() - t0;
    // 等首段可读文本出现
    try {
      await pg.waitForFunction(() => {
        const c = document.querySelector('.article-content');
        return c && (c.innerText || '').trim().length > 200;
      }, { timeout: 120000, polling: 100 });
      firstText = Date.now() - t0;
    } catch (e) { firstText = null; }
    const perf = await pg.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return { fcp: fcp ? Math.round(fcp.startTime) : null, transfer: nav.transferSize || 0,
               domContentLoaded: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : null };
    });
    console.log(`  ${name.padEnd(24)} DOMContentLoaded ${String(domTime).padStart(6)}ms  首段可读文本 ${firstText ? String(firstText).padStart(6) + 'ms' : '  超时'}  FCP ${String(perf.fcp).padStart(5)}ms  请求 ${reqs} 个`);
    await pg.close();
  }

  // 离线重访
  const pg = await b.newPage();
  await pg.setViewport({ width: 390, height: 844, isMobile: true });
  await pg.goto(BASE + PATH, { waitUntil: 'networkidle2', timeout: 60000 });
  const cdp = await pg.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 });
  let ok = true;
  try { await pg.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { ok = false; }
  const r = await pg.evaluate(() => ({ text: (document.body.innerText || '').trim().length, hasContent: !!document.querySelector('.article-content') })).catch(() => ({ text: 0, hasContent: false }));
  console.log(`  离线重访: ${ok ? '可加载' : '加载失败'}  页面文本 ${r.text} 字  正文容器 ${r.hasContent ? '在' : '不在'}`);
  await pg.close();
  await b.close();
})().catch(e => console.log('ERR', e.message.slice(0, 200)));
