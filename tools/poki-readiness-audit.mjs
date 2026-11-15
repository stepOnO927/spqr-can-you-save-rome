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
        sampledAtMs: Math.round(performance.now()),
        domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
        sameOriginBytes: resources.filter(x => x.name.startsWith(location.origin)).reduce((n,x) => n + (x.transferSize || 0), 0),
        resourceCount: resources.length,
        setupTextLength: document.querySelector('.setup-panel, .start-dialog, #setup')?.textContent?.length || 0
      };
    });
    await page.screenshot({ path: `poki-audit-${path === '/' ? 'rome' : path.replace(/[^a-z]/g,'')}-${width}x${height}.png`, fullPage: false });
    const touch = {};
    try {
      if (path === '/') {
        await page.locator('#start-campaign').tap({ timeout: 5000 });
        touch.started = await page.locator('.setup-backdrop').count() === 0;
        const army = page.locator('#map-svg [data-army]').first();
        touch.armyMarkers = await page.locator('#map-svg [data-army]').count();
        if (touch.armyMarkers) {
          await army.tap({ timeout: 5000 });
          touch.inspectorOpen = await page.locator('.inspector:not(.closed)').count() > 0;
        }
        touch.advanceInViewport = await page.locator('#step').evaluate(el => { const b = el.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
      } else if (path === '/han/') {
        await page.locator('#begin').tap({ timeout: 5000 });
        touch.started = await page.locator('#map [data-region]').count() > 0;
        if (touch.started) {
          await page.locator('#map [data-region]').first().tap({ timeout: 5000 });
          touch.inspectorPopulated = (await page.locator('#inspector').textContent()).trim().length > 0;
        }
      } else {
        await page.locator('#start-game').tap({ timeout: 5000 });
        touch.started = await page.locator('#start-overlay:not([hidden])').count() === 0;
        touch.markers = await page.locator('.maplibregl-marker').count();
        if (touch.markers) {
          await page.locator('.maplibregl-marker').first().tap({ timeout: 5000 });
          touch.selectionOpen = await page.locator('.selection:not(.collapsed)').count() > 0;
        }
      }
    } catch (error) {
      touch.error = error.message;
    }
    results.push({ path, width, height, layout, touch, errors, external: [...external] });
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
    results.push({ path, storageDenied: true, errors, playable: errors.length === 0 && await page.locator('#start-campaign, #start-game, #setup button').count() > 0 });
  } catch (error) {
    results.push({ path, storageDenied: true, fatal: error.message, errors });
  }
  await context.close();
}
await browser.close();
await fs.writeFile('poki-audit.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
