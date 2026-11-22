import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame} from '../engine.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const base=process.env.SPQR_PREVIEW_URL||'http://spqr.test/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1366,height:768}});
page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
if(!process.env.SPQR_PREVIEW_URL)await page.route('http://spqr.test/**',async route=>{
 const pathname=new URL(route.request().url()).pathname;
 const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root))return route.abort();
 const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
 try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
});
const openPanel=async(state,view,language)=>{
 await page.goto(new URL('/',base).href,{waitUntil:'domcontentloaded'});
 await page.evaluate(value=>localStorage.setItem('spqr-lang',value),language);
 await page.reload({waitUntil:'domcontentloaded'});
 if(view==='atlas'){
  await page.evaluate(campaign=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:campaign})),state);
  await page.goto(new URL('/map-lab/',base).href,{waitUntil:'domcontentloaded'});
  await page.locator('#development').click();
  return '#command-detail';
 }
 await page.locator('#entry-file').setInputFiles({name:'knowledge-route.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('[data-tab="development"]').click();
 return '.inspector';
};
try{
 const open=newGrandGame('caesar');open.wars=[];open.relations['caesar:egypt']=50;
 open.factions.caesar.treasury=500;open.factions.egypt.treasury=500;
 const closed=structuredClone(open);
 for(const region of closed.regions)region.owner='rebels';
 closed.regions.find(region=>region.id==='cisalpine').owner='caesar';
 closed.regions.find(region=>region.id==='egypt').owner='egypt';
 for(const view of ['main','atlas'])for(const language of ['en','zh']){
  const selector=await openPanel(closed,view,language);
  assert.match(await page.locator(selector).innerText(),language==='en'?/No civilian route/:/民间通道中断/);
  for(const button of ['[data-trade-seller="egypt"][data-trade-id="water-control"]',"[data-exchange-partner='egypt'][data-exchange-id='water-control']",'[data-sell-buyer="egypt"][data-sell-id="roadmaking"]'])
   assert.equal(await page.locator(button).isDisabled(),true,`${view} ${language}: ${button}`);
  const restoredSelector=await openPanel(open,view,language);
  assert.doesNotMatch(await page.locator(restoredSelector).innerText(),language==='en'?/No civilian route/:/民间通道中断/);
  for(const button of ['[data-trade-seller="egypt"][data-trade-id="water-control"]',"[data-exchange-partner='egypt'][data-exchange-id='water-control']",'[data-sell-buyer="egypt"][data-sell-id="roadmaking"]'])
   assert.equal(await page.locator(button).isDisabled(),false,`${view} ${language}: ${button}`);
 }
 assert.deepEqual(errors,[]);
 console.log('Knowledge route browser smoke passed in both views and languages.');
}finally{await browser.close()}
