// Check the separately deployed branch against actual hosted static assets.
import {chromium} from 'playwright';

const base=process.env.SPQR_PREVIEW_URL||'http://localhost:5173';
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).host===new URL(base).host)missing.push(`${response.status()} ${response.url()}`)});
try{
 const response=await page.goto(new URL('/map-lab/',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 if(response.status()!==200)throw Error(`Atlas returned ${response.status()}`);
 if((await page.title()).includes('Login – Vercel'))throw Error('Preview requires Vercel login; public browser test cannot continue');
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor({timeout:30000});
 await page.evaluate(async()=>{window.__spqrSmokeMap=(await import(document.querySelector('script[type="module"]').src)).map});
 await page.waitForFunction(()=>window.__spqrSmokeMap.isStyleLoaded()&&window.__spqrSmokeMap.areTilesLoaded(),null,{timeout:30000});
 const local=await page.evaluate(()=>{const map=window.__spqrSmokeMap;return {zoom:map.getZoom(),hasSea:!!map.getLayer('sea-final'),hasDetailedTerrain:!!map.getLayer('land-elevation-higher'),hasNaval:!!document.querySelector('#naval')}});
 if(!local.hasSea||!local.hasDetailedTerrain||!local.hasNaval)throw Error(`Deployed branch is missing expected features: ${JSON.stringify(local)}`);
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(()=>window.__spqrSmokeMap.jumpTo({center:[12.6,44.1],zoom:9.05}));
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 const terrain=await (await page.waitForFunction(()=>{const map=window.__spqrSmokeMap;const result={zoom:map.getZoom(),center:map.getCenter().toArray(),detailLoaded:map.isSourceLoaded('elevation-higher'),seaLoaded:map.isSourceLoaded('ocean')};return map.areTilesLoaded()&&result.detailLoaded&&result.seaLoaded&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99?result:false},null,{timeout:30000})).jsonValue();
 if(!terrain.detailLoaded||!terrain.seaLoaded)throw Error(`Hosted atlas tiles did not settle: ${JSON.stringify({terrain,missing:missing.slice(0,20),errors})}`);
 await page.locator('#language').click();
 if(await page.locator('html').getAttribute('lang')!=='en')throw Error('English language switch failed');
 if(errors.length||missing.length)throw Error(`Hosted atlas errors: ${JSON.stringify({errors,missing})}`);
 console.log(JSON.stringify({base,local,terrain,errors,missing},null,2));
}finally{await browser.close()}
