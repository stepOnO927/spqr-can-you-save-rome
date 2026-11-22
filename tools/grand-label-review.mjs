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
const collisions=async()=>page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
 const overlap=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
 const labels=[...document.querySelectorAll('.grand-region-label')].map(el=>({name:el.textContent,box:rect(el)}));
 const units=[...document.querySelectorAll('#map-svg .unit')].map(el=>({name:el.getAttribute('data-army'),box:rect(el)}));
 return labels.flatMap(label=>units.filter(unit=>overlap(label.box,unit.box)).map(unit=>[label.name,unit.name]));
});
const waterLabels=async()=>page.evaluate(()=>{
 const coast=document.querySelector('#landclip path');
 return [...document.querySelectorAll('.grand-region-label')].filter(el=>!coast.isPointInFill(new DOMPoint(Number(el.getAttribute('x')),Number(el.getAttribute('y'))-4))).map(el=>el.textContent);
});
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
 const englishCollisions=await collisions();
 const englishWater=await waterLabels();
 assert.deepEqual(englishCollisions,[]);
 assert.deepEqual(englishWater,[]);
 await page.screenshot({path:resolve(output,'english.png')});
 await page.locator('#lang').click();
 assert.ok((await label.textContent()).length>0);
 const chineseCollisions=await collisions();
 const chineseWater=await waterLabels();
 assert.deepEqual(chineseCollisions,[]);
 assert.deepEqual(chineseWater,[]);
 await page.screenshot({path:resolve(output,'chinese.png')});
 await page.locator('#terrain-map').click();
 assert.deepEqual(await collisions(),[]);
 assert.deepEqual(await waterLabels(),[]);
 await page.locator('#political').click();
 for(let i=0;i<4;i++)await page.locator('#zoom-in').click();
 const place=page.locator('.grand-place text').first();
 await place.waitFor();
 assert.equal(await place.evaluate(el=>getComputedStyle(el).strokeWidth),'1.2px');
 await page.screenshot({path:resolve(output,'chinese-local.png')});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(output,'mobile.png')});
 await page.setViewportSize({width:1440,height:900});
 for(let i=0;i<4;i++)await page.locator('#zoom-out').click();
 for(let month=0;month<6;month++){
  await page.locator('#step').click();
  assert.deepEqual(await collisions(),[],`month ${month+1}: a regional name covers an army`);
  assert.deepEqual(await waterLabels(),[],`month ${month+1}: a regional name moved into the sea`);
 }
 if(await page.locator('[data-dismiss-alert]').count())await page.locator('[data-dismiss-alert]').click();
 await page.screenshot({path:resolve(output,'chinese-six-months.png')});
 const layoutTimings=await page.evaluate(async()=>{const {avoidGrandLabelCollisions}=await import('/map-label-layout.js?v=3'),svg=document.querySelector('#map-svg'),times=[];for(let i=0;i<5;i++){const start=performance.now();avoidGrandLabelCollisions(svg);times.push(Math.round((performance.now()-start)*10)/10)}return times});
 console.log(JSON.stringify({errors,output,englishCollisions,chineseCollisions,englishWater,chineseWater,layoutTimings}));
 if(errors.length)process.exitCode=1;
}finally{await browser.close()}
