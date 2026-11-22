import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {newGrandGame,moveArmy} from '../engine.js';
import {advanceNaval} from '../naval.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const language of ['en','zh'])for(const departed of [false,true]){
  const state=newGrandGame('senate'),unit=state.armies.find(a=>a.id==='italy');
  unit.region='italiaS';state.naval.fleets=state.naval.fleets.filter(f=>f.owner==='senate');
  assert.equal(moveArmy(state,unit.id,'t075').ok,true);
  if(departed)advanceNaval(state);
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();if(url.hostname!=='spqr.test')return route.abort();
   const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,file=resolve(root,'.'+pathname);
   if(!file.startsWith(root+sep))return route.abort();
   const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
   try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
  });
  await page.addInitScript(({state,language})=>{localStorage.setItem('spqr-lang',language);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}))},{state,language});
  await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-army="italy"]').waitFor({state:'attached',timeout:30000});
  await page.locator('[data-army="italy"]').evaluate(element=>element.click());
  const cancel=page.locator('#lab-orders button').first();
  assert.match(await cancel.innerText(),language==='zh'?/取消行军/:/CANCEL MARCH/);
  await cancel.click();
  if(departed){
   assert.match(await page.locator('#lab-orders [role="status"]').innerText(),language==='zh'?/已经启航/:/has sailed/);
   assert.equal(await cancel.isVisible(),true);
  }else{
   assert.ok(await page.locator('#lab-orders select').count(),'cancelled army should be ready for a new order');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Transport cancellation passed before and after departure in English and Chinese.');
}finally{await browser.close()}
