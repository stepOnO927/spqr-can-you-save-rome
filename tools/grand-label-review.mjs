import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs','grand-label-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:')return route.continue();
  if(url.hostname!=='spqr.test')return route.abort();
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-senate').click();
 await page.waitForURL('**/map-lab/');
 await page.locator('#return-campaign').click();
 await page.waitForURL('http://spqr.test/');
 await page.locator('.grand-region-label').first().waitFor();
 const label=page.locator('.grand-region-label').first();
 assert.equal(await label.evaluate(el=>getComputedStyle(el).strokeWidth),'1.5px');
 await page.screenshot({path:resolve(output,'english.png')});
 await page.locator('#lang').click();
 assert.ok((await label.textContent()).length>0);
 await page.screenshot({path:resolve(output,'chinese.png')});
 for(let i=0;i<4;i++)await page.locator('#zoom-in').click();
 const place=page.locator('.grand-place text').first();
 await place.waitFor();
 assert.equal(await place.evaluate(el=>getComputedStyle(el).strokeWidth),'1.2px');
 await page.screenshot({path:resolve(output,'chinese-local.png')});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(output,'mobile.png')});
 console.log(JSON.stringify({errors,output}));
 if(errors.length)process.exitCode=1;
}finally{await browser.close()}
