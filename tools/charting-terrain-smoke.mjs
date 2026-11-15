// A long jump must not reveal low-resolution relief before native DEM tiles arrive.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];let delayedTerrain=0;
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  if(/\/terrain\/9\/\d+\/\d+\.png$/.test(url.pathname)){delayedTerrain++;await new Promise(resolve=>setTimeout(resolve,3600))}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.6,44.1],zoom:9.05})});
 await page.locator('#map-charting').waitFor({state:'visible',timeout:3000});
 await page.waitForTimeout(2500);
 if(await page.locator('#map-charting').isHidden())throw Error('Charting curtain cleared before delayed native terrain arrived');
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:20000});
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#map')).opacity)>.99,null,{timeout:3000});
 const result=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {detailLoaded:map.isSourceLoaded('elevation-higher'),opacity:Number(getComputedStyle(document.querySelector('#map')).opacity)}});
 if(!delayedTerrain||!result.detailLoaded||result.opacity<.99||errors.length)throw Error(JSON.stringify({delayedTerrain,result,errors}));
 console.log(JSON.stringify({delayedTerrain,result,errors}));
}finally{await browser.close()}
