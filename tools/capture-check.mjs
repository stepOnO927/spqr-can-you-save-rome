// Exercise the player's download control, not Playwright's screenshot API.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,acceptDownloads:true});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('https://**/*',route=>route.abort());
 await page.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),relative=url.pathname==='/map-lab/'?'map-lab/index.html':url.pathname.slice(1),target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep)){await route.abort();return}
  try{const body=await readFile(target),ext=path.extname(target),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'}[ext]||'application/octet-stream';await route.fulfill({status:200,contentType:type,body})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});await page.locator('#start-free').click();
 await page.locator('.grand-site').first().waitFor({state:'attached'});await page.waitForTimeout(1500);
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.locator('#capture').click()]);
 assert.equal(download.suggestedFilename(),'spqr-map-1920x1080.png');
 // This managed Chrome cancels even a trivial Blob download. Check the browser's
 // download event and inspect the generated PNG Blob before that policy applies.
 const {colors,width,height,signature}=await page.evaluate(async()=>{const img=document.querySelector('#capture-result');await img.decode();const blob=await fetch(img.src).then(r=>r.blob());const bytes=new Uint8Array(await blob.slice(0,8).arrayBuffer());const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(400,120,1100,760).data,seen=new Set();for(let i=0;i<pixels.length;i+=4*37)seen.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);return {colors:seen.size,width:img.naturalWidth,height:img.naturalHeight,signature:Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('')}});
 assert.equal(signature,'89504e470d0a1a0a','export is a PNG');assert.equal(width,1920);assert.equal(height,1080);
 assert.ok(colors>100,`map area needs geographic detail, got ${colors} colors`);
 assert.deepEqual(errors,[],'uncaught browser errors');console.log(`Offline screenshot PNG and download action passed: 1920 × 1080; ${colors} sampled map colors.`);
}finally{await browser.close()}
