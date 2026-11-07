import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
const external=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){external.push(url.hostname);await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('.maplibregl-canvas').waitFor();
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 assert.equal(await page.locator('.grand-site').count(),120);
 assert.equal(await page.locator('.maplibregl-canvas').isVisible(),true);
 assert.deepEqual(errors,[]);
 assert.ok(external.every(host=>host==='s3.amazonaws.com'||host.endsWith('googleapis.com')||host.endsWith('gstatic.com')),`Unexpected external dependency: ${external.join(', ')}`);
 if(process.env.SPQR_ATLAS_SCREENSHOT){await page.locator('#start-free').click();await page.screenshot({path:process.env.SPQR_ATLAS_SCREENSHOT})}
 console.log('Offline atlas loaded MapLibre, 120 settlement markers and campaign controls without CDN access.');
}finally{await browser.close()}
