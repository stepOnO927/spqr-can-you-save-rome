import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const origin = 'http://127.0.0.1:5173';
const results = [];
for (const [path, width, height] of [['/', 640, 360], ['/', 836, 470], ['/han/', 640, 360], ['/map-lab/', 640, 360]]) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [], external = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) external.add(request.url().split('?')[0]); });
  try {
    await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(path === '/map-lab/' ? 6000 : 1200);
    const layout = await page.evaluate(() => {
      const rect = selector => { const node = document.querySelector(selector); if (!node) return null; const b = node.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height), visible: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth }; };
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: innerHeight,
        setup: rect('#start-campaign') || rect('#start-game') || rect('#setup button'),
        map: rect('#map-svg') || rect('#map'),
        inspector: rect('.inspector') || rect('.selection') || rect('#inspector'),
        nextMonth: rect('#step') || rect('#advance'),
        firstRenderMs: Math.round(performance.now()),
        domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
        sameOriginBytes: resources.filter(x => x.name.startsWith(location.origin)).reduce((n,x) => n + (x.transferSize || 0), 0),
        resourceCount: resources.length,
        setupTextLength: document.querySelector('.setup-panel, .start-dialog, #setup')?.textContent?.length || 0
      };
    });
    await page.screenshot({ path: `poki-audit-${path === '/' ? 'rome' : path.replace(/[^a-z]/g,'')}-${width}x${height}.png`, fullPage: false });
    results.push({ path, width, height, layout, errors, external: [...external] });
  } catch (error) {
    results.push({ path, width, height, fatal: error.message, errors, external: [...external] });
  }
  await context.close();
}
for (const path of ['/', '/han/', '/map-lab/']) {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true });
  await context.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { configurable: true, get() { throw new DOMException('Storage denied', 'SecurityError'); } });
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1000);
    results.push({ path, storageDenied: true, errors, playable: await page.locator('#start-campaign, #start-game, #setup button').count() > 0 });
  } catch (error) {
    results.push({ path, storageDenied: true, fatal: error.message, errors });
  }
  await context.close();
}
await browser.close();
await fs.writeFile('poki-audit.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
