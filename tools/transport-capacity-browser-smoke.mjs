import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGrandGame}=await import('/engine.js?v=258');
  const {stageHandoff}=await import('/view-handoff.js');
  const state=newGrandGame('senate'),pompey=state.armies.find(a=>a.id==='pompey'),fleet=state.naval.fleets.find(f=>f.id==='senate-adriatic');
  pompey.region='epirus';pompey.men=11800;
  fleet.port='epirus';fleet.ships.transport=3;fleet.sailors=570;
  stageHandoff(sessionStorage,state,'campaign');
 });
 await page.reload({waitUntil:'domcontentloaded'});
 for(const [language,expected] of [['en',/11,800 soldiers[\s\S]*9,000/],['zh',/11,800人[\s\S]*9,000人/]]){
  if(language==='zh')await page.locator('#lang').click();
  await page.locator('[data-tab="military"]').click();
  await page.locator('[data-select-army="pompey"]').click();
  if(!/cancel|取消/i.test(await page.locator('#order').innerText()))await page.locator('#order').click();
  const feedback=await page.evaluate(()=>{const select=document.querySelector('#region-choice');select.value='italiaS';select.dispatchEvent(new Event('change',{bubbles:true}));return {toast:document.querySelector('.toast')?.textContent||'',order:document.querySelector('#order')?.textContent||''}});
  assert.match(feedback.toast,expected,JSON.stringify(feedback));
 }
 const panels=await page.evaluate(async()=>{
  const {newGrandGame}=await import('/engine.js?v=258');
  const {renderNavalPanel}=await import('/map-lab/naval-ui.js?v=102');
  const state=newGrandGame('senate'),pompey=state.armies.find(a=>a.id==='pompey'),fleet=state.naval.fleets.find(f=>f.id==='senate-adriatic');
  pompey.region='epirus';pompey.men=11800;fleet.port='epirus';fleet.ships.transport=3;fleet.sailors=570;
  const root=document.createElement('div');document.body.append(root);
  const show=lang=>{renderNavalPanel({state,lang,root,section:'fleets',onAction:()=>({ok:true})});return root.textContent};
  const result={en:show('en'),zh:show('zh')};root.remove();return result;
 });
 assert.match(panels.en,/Army 11,800; the largest ready fleet here carries 9,000/);
 assert.match(panels.zh,/军队 11,800 人；本港最大可用运输舰队仅能搭载 9,000 人/);
 assert.deepEqual(errors,[]);
 console.log('Transport capacity browser smoke passed: 11,800 soldiers versus 9,000 lift explained in both interfaces and languages');
}finally{await browser.close()}
