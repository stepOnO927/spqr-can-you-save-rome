// Hosted browser check against the actual Cloudflare Pages deployment.
// The browser context is disposable and never reads a player's real saves.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const source = process.env.SPQR_SOURCE_URL;
const target = process.env.SPQR_TARGET_URL;
if (!source || !target || new URL(source).origin === new URL(target).origin) {
 throw Error('Two different HTTPS Pages origins are required');
}
const sourceUrl = new URL(source), targetUrl = new URL(target);
if (sourceUrl.protocol !== 'https:' || targetUrl.protocol !== 'https:' || !targetUrl.hostname.endsWith('.pages.dev')) throw Error('Expected HTTPS source and Cloudflare Pages target');
if (sourceUrl.hostname === 'stepono927.github.io') {
 if (sourceUrl.pathname !== '/spqr-can-you-save-rome/') throw Error('Unexpected GitHub Pages source path');
} else if (!sourceUrl.hostname.endsWith('.pages.dev')) throw Error('Unexpected save source hostname');
const route = (base, path = '') => new URL(path.replace(/^\//, ''), base).href;

const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const context = await browser.newContext({acceptDownloads:true});
const failures = [];
async function open(address) {
 const page = await context.newPage();
 page.on('pageerror', error => failures.push(`${address}: ${error.message}`));
 page.on('response', response => {
  if (response.status() >= 400 && new URL(response.url()).origin === new URL(address).origin && !response.url().endsWith('/favicon.ico')) failures.push(`${response.status()} ${response.url()}`);
 });
 const response = await page.goto(address, {waitUntil:'domcontentloaded'});
 assert.equal(response.status(), 200, address);
 await page.locator('#save-transfer-open').waitFor();
 assert.ok(await page.locator('script[src*="cloudflareinsights.com/beacon.min.js"]').count() <= 1, 'at most one Cloudflare beacon');
 return page;
}

try {
 const roman = await open(route(source));
 await roman.locator('#start-campaign').click();
 await roman.locator('#step').click();
 await roman.locator('#save').evaluate(button => button.click());
 const romanSave = await roman.evaluate(() => localStorage.getItem('spqr-save-1'));
 assert.ok(romanSave?.includes('"regions"'), 'Roman save was created on the current Pages domain');

 const han = await open(route(source, 'han/'));
 await han.locator('#begin').click();
 await han.locator('#save').click();
 const hanSave = await han.evaluate(() => localStorage.getItem('spqr-han-save-browser'));
 assert.ok(hanSave?.includes('"mandate-of-heaven"'), 'Han save was created on the current Pages domain');
 await han.close();

 await roman.locator('#save-transfer-open').click();
 const downloadPromise = roman.waitForEvent('download');
 await roman.locator('#save-transfer-export').click();
 const bundle = JSON.parse(await fs.readFile(await (await downloadPromise).path(), 'utf8'));
 assert.equal(bundle.saves['spqr-save-1'], romanSave);
 assert.equal(bundle.saves['spqr-han-save-browser'], hanSave);
 await roman.close();

 const migrated = await open(route(target));
 assert.equal(await migrated.locator('script[src*="cloudflareinsights.com/beacon.min.js"]').count(), 1, 'preview has one beacon');
 await migrated.locator('#save-transfer-open').click();
 const transferFile = {name:'spqr-saves.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))};
 await migrated.locator('#save-transfer-file').setInputFiles(transferFile);
 await migrated.locator('#save-transfer-status').filter({hasText:/Imported [2-9]/}).waitFor();
 assert.equal(await migrated.evaluate(() => localStorage.getItem('spqr-save-1')), romanSave);
 assert.equal(await migrated.evaluate(() => localStorage.getItem('spqr-han-save-browser')), hanSave);
 await migrated.locator('#save-transfer-file').setInputFiles(transferFile);
 await migrated.locator('#save-transfer-status').filter({hasText:/Imported 0; already present/}).waitFor();
 assert.equal(await migrated.evaluate(() => localStorage.getItem('spqr-save-1')), romanSave, 'repeat import did not overwrite the Roman slot');
 const bad = {format:'spqr-save-transfer',version:1,saves:{'evil-key':'value'}};
 await migrated.locator('#save-transfer-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
 await migrated.locator('#save-transfer-status').filter({hasText:/Imported 0/}).waitFor();
 assert.equal(await migrated.evaluate(() => localStorage.getItem('evil-key')), null, 'unknown key rejected');
 await migrated.locator('.transfer-close').click();
 await migrated.locator('#load').evaluate(button => button.click());
 await migrated.getByRole('heading', {name:/Feb 49 BCE|49年 2月/}).waitFor();
 await migrated.close();

 const atlas = await open(route(target, 'map-lab/'));
 await atlas.locator('#start-load').waitFor();
 await atlas.locator('#start-load').click();
 await atlas.locator('#start-overlay').waitFor({state:'hidden',timeout:30000});
 assert.equal(await atlas.evaluate(() => localStorage.getItem('spqr-save-1')), romanSave);
 await atlas.close();

 const eastern = await open(route(target, 'han/'));
 await eastern.locator('#load').click();
 await eastern.locator('#campaignTitle').filter({hasText:/Western Han Empire|西汉/}).waitFor();
 assert.doesNotMatch(await eastern.locator('#chronicle').innerText(), /%NAME%/);
 await eastern.close();

 assert.deepEqual(failures, []);
 console.log(`PASS: ${sourceUrl.hostname} to ${targetUrl.hostname}; three routes, Roman and Han save import, repeat-import protection, unknown key rejection, and single beacon`);
} finally {
 await browser.close();
}
