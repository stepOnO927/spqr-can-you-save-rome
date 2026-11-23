import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-continue').click();
 await page.locator('[data-tab="development"]').click();
 await page.locator('[data-dev-branch="idea"]').click();
 await page.locator('[data-research="legion-training"]').evaluate(button=>button.click());
 for(let month=0;month<3;month++){
  const start=performance.now();
  await page.locator('#step').click({timeout:15000});
  console.log(`research month ${month+1}: ${Math.round(performance.now()-start)} ms`);
 }
 await page.locator('[data-tab="ideas"]').click();
 await page.locator('[data-select-idea="legion-training"]').click();
 await page.locator('[data-adopt-idea="legion-training"]').first().click();
 for(let month=0;month<2;month++){
  const start=performance.now();
  await page.locator('#step').click({timeout:15000});
  console.log(`adoption month ${month+1}: ${Math.round(performance.now()-start)} ms`);
 }
 assert.match(await page.locator('.dev-slot').first().innerText(),/Legion Field Training/);
 assert.deepEqual(errors,[]);
 console.log('Research and adoption months advanced in the full browser interface.');
}finally{await browser.close()}
