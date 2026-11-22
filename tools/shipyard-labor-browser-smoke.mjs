import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame,queueShip} from '../engine.js';
import {advanceNaval} from '../naval.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const language of ['en','zh']){
  const state=newGrandGame('senate');
  assert.equal(queueShip(state,'senate','italiaS','merchant').ok,true);
  state.regions.find(r=>r.id==='italiaS').population=100;
  advanceNaval(state);
  const context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[];
  await context.addInitScript(({state,language})=>{localStorage.setItem('spqr-lang',language);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}))},{state,language});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();if(url.hostname!=='spqr.test')return route.abort();
   const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,file=resolve(root,'.'+path);
   if(!file.startsWith(root+sep))return route.abort();
   const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
   try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',null,{timeout:60000});
  await page.locator('#naval').click();await page.locator('[data-naval-tab="yards"]').click();
  const panel=page.locator('.naval-content');
  assert.match(await panel.innerText(),language==='zh'?/劳动力不足，建造暂停/:/Paused: too few workers/);
  assert.match(await panel.innerText(),language==='zh'?/当地居民 100 \/ 600/:/Local residents 100 \/ 600/);
  assert.equal(await page.locator('[data-build-ship="italiaS"]').isDisabled(),true);
  await page.locator('[data-cancel-build="italiaS"]').click();
  assert.match(await panel.innerText(),language==='zh'?/船台空闲/:/Berth available/);
  assert.equal(await page.locator('[data-cancel-build="italiaS"]').count(),0);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Shipyard labor pause and cancellation work in the real atlas in English and Chinese.');
}finally{await browser.close()}
