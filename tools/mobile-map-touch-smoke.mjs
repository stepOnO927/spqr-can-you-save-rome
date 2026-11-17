import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const browser = await chromium.launch({ headless: true, executablePath: process.env.SPQR_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'blob:') return route.continue();
    if (url.hostname !== 'spqr.test') return route.abort();
    const file = resolve(root, '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if (!file.startsWith(root + sep)) return route.abort();
    const type = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' }[extname(file)] || 'application/octet-stream';
    try { await route.fulfill({ status: 200, contentType: type, body: await readFile(file) }); }
    catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await page.goto('http://spqr.test/map-lab/', { waitUntil: 'domcontentloaded' });
  await page.locator('#start-free').tap();
  await page.waitForFunction(async () => {
    const { map } = await import(document.querySelector('script[type="module"]').src);
    return map.isStyleLoaded() && map.areTilesLoaded();
  }, {}, { timeout: 30000 });

  const header = await page.locator('.mast').boundingBox();
  const menu = await page.locator('#mobile-menu').boundingBox();
  assert(header && menu && header.x >= 0 && header.x + header.width <= 390 && menu.x + menu.width <= 390, 'header and menu fit viewport');
  await page.locator('[data-army="xiii"]').tap();
  assert.match(await page.locator('#selection-title').textContent(), /第十三军团/);
  await page.locator('[data-site="italiaN"]').tap();
  assert.match(await page.locator('.preview-detail').textContent(), /阿里米努姆|北意大利/);
  await page.locator('[data-site="cisalpine"]').tap();
  assert.match(await page.locator('#selection-title').textContent(), /拉文纳/);
  assert.match(await page.locator('.detail-grid').textContent(), /0\.74/);

  await page.locator('#mobile-menu').tap();
  assert.equal(await page.locator('#mobile-menu').getAttribute('aria-expanded'), 'true');
  await page.locator('#help').tap();
  assert.equal(await page.locator('#mobile-menu').getAttribute('aria-expanded'), 'false');
  assert.match(await page.locator('#selection-title').textContent(), /帮助/);
  await page.locator('#language').tap();
  assert.match(await page.locator('#selection-title').textContent(), /HELP/);
  await page.locator('#brief-toggle').tap();
  await page.locator('#map-mode').selectOption('military');
  assert.equal(await page.locator('#map-mode').inputValue(), 'military');
  await page.locator('#brief-toggle').tap();
  await page.locator('[data-army="xiii"]').tap();
  assert.match(await page.locator('#selection-title').textContent(), /Legio XIII|Thirteenth|XIII/);
  await page.locator('#mobile-menu').tap();
  await page.locator('#save').tap();
  assert.equal(await page.locator('#mobile-menu').getAttribute('aria-expanded'), 'false');
  assert(await page.evaluate(() => localStorage.getItem('spqr-save-1')), 'save persisted to slot 1');
  await page.locator('#mobile-menu').tap();
  await page.locator('#load').tap();
  assert.match(await page.locator('#selection-title').textContent(), /Campaign loaded/);
  assert.deepEqual(errors, []);
  console.log('Mobile touch, bilingual selection, map mode, menu, save, and load: PASS');
} finally {
  await browser.close();
}
