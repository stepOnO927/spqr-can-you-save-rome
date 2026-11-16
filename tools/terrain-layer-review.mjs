// Compare the actual close-map rendering with a single native DEM layer.
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs','terrain-layer-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const trial=process.env.SPQR_PO_SMOOTH_TRIAL==='1'&&['/mediterranean-land.js','/mediterranean-ocean.js'].includes(pathname);
  const file=trial?resolve(root,'outputs','po-smoothing',pathname.slice(1)):resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 for(const [name,center,detail] of [['ariminum',[12.6,44.1],'land-elevation-higher'],['po-delta',[12.5,44.8],'land-elevation-higher'],['alexandria',[29.91,31.2],'land-elevation-egypt-higher']]){
  await page.evaluate(async center=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center,zoom:9.05})},center);
  // A local jump can finish before the temporary charting curtain appears.
  await page.locator('#map-charting').waitFor({state:'visible',timeout:3000}).catch(()=>{});
  await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
  await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
  await page.waitForTimeout(1000);
  const frame=await page.evaluate(()=>({hidden:document.querySelector('#map-charting').hidden,display:getComputedStyle(document.querySelector('#map-charting')).display,opacity:Number(getComputedStyle(document.querySelector('#map')).opacity)}));
  if(!frame.hidden||frame.display!=='none'||frame.opacity<.99)throw Error(`${name}: captured map is not fully visible: ${JSON.stringify(frame)}`);
  await page.screenshot({path:resolve(output,`${name}-current.png`)});
  await page.evaluate(async detail=>{
   const {map}=await import(document.querySelector('script[type="module"]').src);
   for(const layer of map.getStyle().layers.filter(layer=>layer.type==='color-relief'))map.setLayoutProperty(layer.id,'visibility',layer.id===detail?'visible':'none');
  },detail);
  await page.waitForTimeout(700);
  await page.screenshot({path:resolve(output,`${name}-native-only.png`)});
  await page.evaluate(async()=>{
   const {map}=await import(document.querySelector('script[type="module"]').src);
   for(const layer of map.getStyle().layers.filter(layer=>layer.type==='color-relief'))map.setLayoutProperty(layer.id,'visibility','visible');
   for(const id of ['italy-contours-minor','italy-contours-major','egypt-contours-minor','egypt-contours-major']){
    map.setPaintProperty(id,'line-opacity',id.endsWith('major')?.65:.55);
    map.setPaintProperty(id,'line-width',id.endsWith('major')?1.05:.8);
   }
  });
  await page.waitForTimeout(700);
  await page.screenshot({path:resolve(output,`${name}-contours-trial.png`)});
  if(name==='alexandria'){
   await page.evaluate(async()=>{
    const {map}=await import(document.querySelector('script[type="module"]').src);
    map.setPaintProperty('egypt-contours-minor','line-opacity',.38);
    map.setPaintProperty('egypt-contours-major','line-opacity',.46);
    map.setPaintProperty('nile-delta-alluvium','fill-opacity',['interpolate',['linear'],['zoom'],4,.16,7,.26,8.2,.22,9,.22]);
   });
   await page.waitForTimeout(700);
   await page.screenshot({path:resolve(output,`${name}-alluvium-trial.png`)});
  }
 }
 console.log(JSON.stringify({errors,output},null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close()}
