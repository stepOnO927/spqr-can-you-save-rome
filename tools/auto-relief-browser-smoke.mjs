import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(root,'outputs','cartography-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[];
await context.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();if(url.hostname!=='spqr.test')return route.abort();
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));if(!file.startsWith(root+sep))return route.abort();
 const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
 try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const layer=()=>page.evaluate(async()=>{const app=await import(document.querySelector('script[type="module"]').src);return app.activeReliefLayer});
const jump=(center,zoom)=>page.evaluate(async({center,zoom})=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center,zoom})},{center,zoom});
const ready=()=>page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
async function settled(){for(let attempt=0;attempt<6;attempt++){await ready();await page.waitForTimeout(1000);const stable=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99});if(stable)return}throw Error('Close map did not settle after six observations')}
try{
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#start-free').click();
 assert.equal(await layer(),'');assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false');
 await jump([12.6,44.1],9.05);await page.locator('#map-charting').waitFor({state:'visible',timeout:3000});await ready();
 await page.waitForFunction(async()=>{const app=await import(document.querySelector('script[type="module"]').src);return app.activeReliefLayer==='relief-higher'},null,{timeout:15000});
 assert.equal(await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getPaintProperty('relief-higher','hillshade-exaggeration')[2]}),.14,'Italian close relief should use the reviewed moderate intensity');
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true');
 await page.locator('#atlas-focus').click();await settled();
 const visibleFrame=await page.evaluate(()=>({chartHidden:document.querySelector('#map-charting').hidden,opacity:Number(getComputedStyle(document.querySelector('#map')).opacity)}));
 assert.ok(visibleFrame.chartHidden&&visibleFrame.opacity>.99,`Map capture was still charting: ${JSON.stringify(visibleFrame)}`);
 await page.screenshot({path:resolve(output,'auto-relief-on.png')});
 await page.locator('#atlas-focus').click();
 await jump([12.4,43.2],5.45);await ready();await page.waitForTimeout(900);
 assert.equal(await layer(),'','Auto relief should leave the overview unshaded');
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false','Auto relief should leave the overview unshaded');
 await jump([12.6,44.1],9.05);await ready();await page.waitForFunction(async()=>{const app=await import(document.querySelector('script[type="module"]').src);return app.activeReliefLayer==='relief-higher'},null,{timeout:15000});
 await page.locator('#relief-toggle').click();assert.equal(await layer(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('spqr-relief-v2')),'off');
 await page.reload();if(await page.locator('#start-free').isVisible())await page.locator('#start-free').click();await jump([12.6,44.1],9.05);await ready();await page.waitForTimeout(500);
 assert.equal(await layer(),'','Manual off must survive reload at close zoom');
 await page.locator('#language').click();await page.locator('#settings').click();assert.match(await page.locator('.settings-card').first().innerText(),/近景停住地图时自动显示山体阴影/);
 await page.locator('#settings-relief').click();await ready();assert.equal(await page.evaluate(()=>localStorage.getItem('spqr-relief-v2')),'on');assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);console.log('Close-map relief auto enables after settling, pauses at overview, and respects saved EN/ZH manual settings.');
}finally{await browser.close()}
