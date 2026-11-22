import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import rivers from '../central-italy-rivers.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs','central-italy-rivers-review');
const atlasUrl=process.env.SPQR_ATLAS_URL||'http://spqr.test/map-lab/';
await mkdir(output,{recursive:true});
if(rivers.features.length<400||new Set(rivers.features.map(feature=>feature.properties.id)).size!==rivers.features.length||!['tiber','arno'].every(river=>rivers.features.some(feature=>feature.properties.river===river)))throw Error('Bundled central Italian river coverage is missing or duplicated');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 if(!process.env.SPQR_ATLAS_URL)await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto(atlasUrl,{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 for(const [name,center] of [['rome',[12.48,41.93]],['florence',[11.25,43.77]]]){
  await page.evaluate(async center=>{const {map}=await import(document.querySelector('script[type="module"]').src);window.__spqrRiverStable=0;map.jumpTo({center,zoom:9.05})},center);
  await page.locator('#map-charting').waitFor({state:'visible',timeout:3000}).catch(()=>{});
  await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
  await page.waitForTimeout(2800);
  await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);const ready=!map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&getComputedStyle(document.querySelector('#map-charting')).display==='none'&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99;if(!ready){window.__spqrRiverStable=0;return false}if(!window.__spqrRiverStable)window.__spqrRiverStable=performance.now();return performance.now()-window.__spqrRiverStable>1500},null,{timeout:30000,polling:100});
  const state=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {zoom:map.getZoom(),source:!!map.getSource('central-italy-rivers'),layer:!!map.getLayer('waterways-central-italy'),charted:document.querySelector('#map-charting').hidden,note:document.querySelector('#map-mode-note').textContent}});
  if(!state.source||!state.layer||!state.charted||!state.note.includes('现代河网'))throw Error(`${name}: ${JSON.stringify(state)}`);
  await page.screenshot({path:resolve(output,`${name}-new.png`)});
  await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.setLayoutProperty('waterways-central-italy','visibility','none')});
  await page.waitForTimeout(300);
  await page.screenshot({path:resolve(output,`${name}-without.png`)});
  await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.setLayoutProperty('waterways-central-italy','visibility','visible')});
  console.log(name,JSON.stringify(state));
 }
 await page.locator('#language').click();
 const en=await page.locator('#map-mode-note').textContent();
 if(!en.includes('2006–2012 modern river network'))throw Error('English modern-river caveat missing');
 if(errors.length)throw Error(`page errors: ${JSON.stringify(errors)}`);
 console.log(JSON.stringify({errors,output}));
}finally{await browser.close()}
