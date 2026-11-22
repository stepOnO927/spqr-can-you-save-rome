import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame} from '../engine.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const language of ['en','zh']){
  const state=newGrandGame('senate');
  state.world.characters.varro.location='roma';
  state.greatFigures.assignments.senate.scholar='varro';
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
  await page.locator('#development').click();
  const adviser=language==='zh'?/瓦罗在此领域提供指导/:/Varro advises this subject/;
  assert.match(await page.locator('#tech-grain-processing').innerText(),adviser);
  assert.doesNotMatch(await page.locator('#tech-roadmaking').innerText(),adviser);
  assert.equal(await page.locator('#tech-grain-processing [data-research]').isEnabled(),true);
  await page.locator('[data-dev-branch="idea"]').click();
  assert.match(await page.locator('#tech-estate-organization').innerText(),adviser);
  assert.doesNotMatch(await page.locator('#tech-naval-engineering-education').innerText(),adviser);
  await page.locator('[data-dev-branch="material"]').click();
  await page.locator('#tech-grain-processing [data-research]').click();
  assert.match(await page.locator('#command-detail .dev-status').first().innerText(),language==='zh'?/研究中.*谷物加工/:/Researching.*Grain Processing/);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Varro expertise and actual research order work in the atlas in English and Chinese.');
}finally{await browser.close()}
