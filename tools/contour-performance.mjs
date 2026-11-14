// Compare the same close Italy drag with contour layers hidden and visible.
// Callback cadence is a diagnostic, not a device frame-rate guarantee.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();
  if(url.hostname!=='spqr.test')return route.abort();
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 const results=[];
 for(const visible of [false,true,true,false]){
  await page.evaluate(async visible=>{const {map}=await import(document.querySelector('script[type="module"]').src);for(const id of ['italy-contours-minor','italy-contours-major'])map.setLayoutProperty(id,'visibility',visible?'visible':'none');map.jumpTo({center:[12.6,44.1],zoom:9.05})},visible);
  await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
  await page.waitForTimeout(450);
  const sample=page.evaluate(()=>new Promise(resolve=>{let previous=null,frames=0,long=0;const start=performance.now();function next(now){if(previous!==null){frames++;if(now-previous>50)long++}previous=now;if(now-start<4000)requestAnimationFrame(next);else resolve({elapsed:now-start,frames,long})}requestAnimationFrame(next)}));
  for(const end=Date.now()+3300;Date.now()<end;){await page.mouse.move(1150,470);await page.mouse.down();await page.mouse.move(1195,470,{steps:8});await page.mouse.up();await page.waitForTimeout(120)}
  const measured=await sample;results.push({contours:visible,callbackFps:Math.round(measured.frames*100000/measured.elapsed)/100,over50ms:measured.long});
 }
 if(errors.length)throw Error(errors.join(' | '));
 console.log(JSON.stringify({note:'Four same-camera drags on one software renderer; callbacks are not presented frames.',results},null,2));
}finally{await browser.close()}
