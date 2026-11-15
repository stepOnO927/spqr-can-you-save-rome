import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('http://spqr.test/**',async route=>{
 const url=new URL(route.request().url()),file=path.resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+path.sep))return route.abort();
 try{await route.fulfill({status:200,contentType:{'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
});
try{
 for(const lang of ['en','zh']){
  const s=newGrandGame('senate'),mine=s.regions.find(r=>r.id==='t057');
  mine.buildings.push('mine');mine.population=4500;s.development.senate.knownMaterial.push('metal-extraction');s.development.senate.materials.metal=0;
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.evaluate(language=>localStorage.setItem('spqr-lang',language),lang);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#entry-file').setInputFiles({name:`mine-${lang}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
  await page.locator('[data-tab="map"]').click();
  await page.locator('#region-choice').selectOption('t057');
  const panel=page.locator('.dev-construction');
  assert.match(await panel.innerText(),lang==='zh'?/当前金属产量 1\/月/:/current metal output 1\/month/);
  assert.match(await panel.innerText(),lang==='zh'?/停产时仍需维护/:/Maintenance continues even if production stops/);
  assert.match(await panel.innerText(),lang==='zh'?/金属 \/ 月 \+1/:/Metal \/ month \+1/);
  await page.locator('#step').click();
  await page.locator('#region-choice').selectOption('t057');
  assert.match(await page.locator('.dev-construction .dev-meta').first().innerText(),lang==='zh'?/1 金属/:/1 metal/);
 }
 assert.deepEqual(errors,[]);
 console.log('Low-population mine output and upkeep explanation passed in English and Chinese.');
}finally{await browser.close()}
