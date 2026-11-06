import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const output=path.resolve(process.argv[2]||'outputs/live-atlas');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],tiles={ok:0,failed:0,cancelled:0},requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(/arcgisonline|elevation-tiles-prod/.test(r.url())){requests.push({url:r.url(),status:r.status()});if(r.ok())tiles.ok++;else tiles.failed++}});
page.on('requestfailed',r=>{if(/arcgisonline|elevation-tiles-prod/.test(r.url())){if(/ERR_ABORTED/.test(r.failure()?.errorText||''))tiles.cancelled++;else tiles.failed++}});
try{
 await page.goto('http://127.0.0.1:5174/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-senate').click();await page.locator('#open-atlas').click();
 await page.locator('.grand-site').first().waitFor({timeout:30000});assert.equal(await page.locator('.grand-site').count(),120);
 await page.locator('.maplibregl-canvas').waitFor({timeout:30000});await page.waitForTimeout(8000);
 const sample=await page.evaluate(()=>new Promise(resolve=>{let frames=0;const begin=performance.now();function frame(now){frames++;if(now-begin<3000)requestAnimationFrame(frame);else resolve({seconds:(now-begin)/1000,frames})}requestAnimationFrame(frame)}));
 await page.screenshot({path:path.join(output,'live-grand-atlas.png')});
 await page.locator('#map-mode').selectOption('terrain');await page.locator('#relief-toggle').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(output,'terrain-no-relief.png')});await page.locator('#relief-toggle').click();await page.locator('#map-mode').selectOption('political');
 const before=await page.locator('.grand-site').first().boundingBox();await page.mouse.move(790,430);await page.mouse.down();await page.mouse.move(930,480,{steps:12});await page.mouse.up();const after=await page.locator('.grand-site').first().boundingBox();
 await page.mouse.wheel(0,-400);await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'zoomed-coast.png')});await page.locator('#map-mode').selectOption('military');await page.locator('#map-mode').selectOption('supply');
 const report={sites:120,tiles,animationCallbacksPerSecond:Math.round(sample.frames/sample.seconds),panPixels:Math.round(Math.hypot(after.x-before.x,after.y-before.y)),pageErrors:errors,requests:requests.slice(0,12)};
 await writeFile(path.join(output,'live-grand-atlas.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(errors.length,0);assert.ok(tiles.ok>0,'live tiles must load');assert.ok(report.panPixels>20,'map must pan');
}finally{await browser.close()}
