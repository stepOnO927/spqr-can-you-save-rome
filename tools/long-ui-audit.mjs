import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const pages=[];
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});pages.push(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://spqr.test/**',async route=>{const pathname=new URL(route.request().url()).pathname,file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root))return route.abort();const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(file)]||'application/octet-stream';try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.locator('#entry-continue').click();
  let played=0,ended=false;
  for(let month=0;month<36;month++){
   await page.locator('#step').click();
   played++;ended=await page.locator('.campaign-ending').isVisible().catch(()=>false);if(ended)break;
   if(month%3===0){await page.locator('[data-tab="chronicle"]').click();assert.ok(await page.locator('.monthly-briefing').count());await page.locator('[data-report-filter="type"]').selectOption('military');await page.locator('[data-report-filter="type"]').selectOption('');}
   if(month%5===0){await page.locator('#open-notifications').click();assert.ok(await page.locator('#pause-critical').count());}
   if(month%7===0){await page.locator('#lang').click();}
  }
  assert.deepEqual(errors,[]);
  const scroll=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  console.log(viewport.width,'months',played,'terminal',ended,'page errors',errors.length,'scroll width',scroll.width);
 }
}finally{await browser.close()}
