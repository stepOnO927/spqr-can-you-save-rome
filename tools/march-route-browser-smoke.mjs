import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext();
await context.route('http://spqr.test/**',async route=>{
 const url=new URL(route.request().url());
 const relative=url.pathname==='/'?'index.html':url.pathname.slice(1);
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){await route.abort();return}
 try{const body=await readFile(file);await route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream',body})}
 catch{await route.fulfill({status:404,body:'Not found'})}
});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 const loadRoute=async adjacent=>{
  await page.evaluate(async adjacent=>{
   const {newGrandGame,region}=await import('/engine.js');
   const {stageHandoff}=await import('/view-handoff.js');
   const state=newGrandGame('caesar');
   region(state,'t010').owner='caesar';
   if(!adjacent)region(state,'italiaN').owner='caesar';
   stageHandoff(sessionStorage,state,'campaign');
  },adjacent);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.entry-screen').count(),0);
  await page.locator('[data-tab="military"]').click();
  await page.locator('[data-select-army="xiii"]').click();
  await page.locator('#order').click();
  await page.evaluate(()=>{const select=document.querySelector('#region-choice');select.value='t010';select.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.locator('.march-review-overlay').waitFor();
 };
 await loadRoute(true);
 assert.match(await page.locator('.march-review').innerText(),/route to Pisae first crosses enemy-held Ariminum/i);
 assert.equal(await page.locator('[data-review="scouts"]').count(),1);
 await page.locator('[data-review="cancel"]').click();
 await page.locator('#lang').click();
 await page.evaluate(()=>{const select=document.querySelector('#region-choice');select.value='t010';select.dispatchEvent(new Event('change',{bubbles:true}))});
 assert.match(await page.locator('.march-review').innerText(),/路线先穿过敌方控制/);
 await page.locator('[data-review="cancel"]').click();
 await loadRoute(false);
 assert.match(await page.locator('.march-review').innerText(),/须先接近该敌区，才能派斥候/);
 assert.equal(await page.locator('[data-review="scouts"]').count(),0);
 assert.equal(await page.locator('[data-review="probe"]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('March route browser smoke passed');
}finally{await browser.close()}
