// Exercise the player's download control, not Playwright's screenshot API.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,acceptDownloads:true});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});await page.locator('#start-free').click();
 await page.locator('[data-city="ROMA"]').waitFor();await page.waitForTimeout(8000);
 const library='**/html2canvas@1.4.1/**';await page.route(library,route=>route.abort());await page.locator('#capture').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('截图失败')&&!document.querySelector('#capture')?.disabled);
 await page.unroute(library);
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.locator('#capture').click()]);
 assert.equal(download.suggestedFilename(),'spqr-map-1920x1080.png');
 await download.saveAs('capture-control-1920x1080.png');
 const png=await readFile('capture-control-1920x1080.png');
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','download is a PNG');
 assert.equal(png.readUInt32BE(16),1920);assert.equal(png.readUInt32BE(20),1080);
 const colors=await page.evaluate(async()=>{const img=document.querySelector('#capture-result');await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(400,120,1100,760).data,seen=new Set();for(let i=0;i<pixels.length;i+=4*37)seen.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);return seen.size});
 assert.ok(colors>100,`map area needs geographic detail, got ${colors} colors`);
 assert.deepEqual(errors,[],'uncaught browser errors');console.log(`Screenshot download passed: 1920 × 1080; ${colors} sampled map colors.`);
}finally{await browser.close()}

