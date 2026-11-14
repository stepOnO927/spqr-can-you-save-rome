// Capture matched close-map views before and after an optional style trial.
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs','cartography-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
const jumps=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 for(const [name,center] of [['ariminum',[12.6,44.1]],['alexandria',[29.91,31.2]]]){
  await page.evaluate(async()=>{
   const {map}=await import(document.querySelector('script[type="module"]').src);
   map.setPaintProperty('coastal-halo','line-width',['interpolate',['linear'],['zoom'],4,2,8,9,9,14]);
   map.setPaintProperty('coastal-halo','line-blur',['interpolate',['linear'],['zoom'],4,1,9,6]);
   map.setPaintProperty('coastal-halo','line-opacity',['interpolate',['linear'],['zoom'],4,.04,7,.13,9,.22]);
   map.setPaintProperty('sea-cartographic-grain','fill-opacity',['interpolate',['linear'],['zoom'],7,0,8,.6,9,1]);
  });
  const jumpStarted=Date.now();
  const events=await page.evaluate(async center=>{const {map}=await import(document.querySelector('script[type="module"]').src),log=[];for(const type of ['movestart','move','moveend'])map.once(type,()=>log.push({type,center:map.getCenter().toArray(),zoom:map.getZoom()}));map.jumpTo({center,zoom:9.05});return log},center);
  if(await page.locator('#map-charting').isHidden())throw Error(`${name}: a distant jump must cover incomplete geography: ${JSON.stringify(events)}`);
  const language=await page.locator('html').getAttribute('lang'),notice=await page.locator('#map-charting').textContent();
  if(!(language==='zh-CN'?notice.includes('正在绘制'):notice.includes('CHARTING COAST')))throw Error(`${name}: charting notice is not localized for ${language}`);
  if(name==='ariminum')await page.locator('#capture').click();
  await page.waitForFunction(()=>document.querySelector('#map-charting').hidden||Number(getComputedStyle(document.querySelector('#map')).opacity)<.23,null,{timeout:1500});
  if(!(await page.locator('#map-charting').isHidden()))await page.screenshot({path:resolve(output,`${name}-charting.png`)});
  await page.waitForFunction(()=>document.querySelector('#map-charting').hidden,null,{timeout:12000});
  if(name==='ariminum'){
   await page.locator('#capture-result').waitFor({state:'attached',timeout:30000});
   if(!await page.evaluate(()=>document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99))throw Error('Screenshot completed before the map returned to full color');
  }
  jumps.push({name,ms:Date.now()-jumpStarted,loaded:await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.loaded()&&map.areTilesLoaded()})});
  await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()},null,{timeout:20000});
  await page.waitForTimeout(3500);
  await page.screenshot({path:resolve(output,`${name}-before.png`)});
  await page.evaluate(async()=>{
   const {map}=await import(document.querySelector('script[type="module"]').src);
   map.setPaintProperty('coastal-halo','line-width',['interpolate',['linear'],['zoom'],4,2,8,3,9,4]);
   map.setPaintProperty('coastal-halo','line-blur',['interpolate',['linear'],['zoom'],4,1,9,1]);
   map.setPaintProperty('coastal-halo','line-opacity',['interpolate',['linear'],['zoom'],4,.04,7,.1,9,.14]);
   map.setPaintProperty('sea-cartographic-grain','fill-opacity',['interpolate',['linear'],['zoom'],7,0,8,.25,9,.32]);
  });
  await page.waitForTimeout(900);
  await page.screenshot({path:resolve(output,`${name}-trial.png`)});
  if(name==='ariminum')await page.locator('#language').click();
 }
 const samples=await page.evaluate(async()=>{
  const read=async([longitude,latitude])=>{
   const z=9,n=2**z,fx=(longitude+180)/360*n,fy=(1-Math.asinh(Math.tan(latitude*Math.PI/180))/Math.PI)/2*n;
   const x=Math.floor(fx),y=Math.floor(fy),response=await fetch(`./terrain/${z}/${x}/${y}.png`);
   if(!response.ok)return null;
   const image=await createImageBitmap(await response.blob()),canvas=document.createElement('canvas');canvas.width=canvas.height=256;
   const context=canvas.getContext('2d');context.drawImage(image,0,0);
   const rgb=context.getImageData(Math.floor((fx-x)*256),Math.floor((fy-y)*256),1,1).data;
   return rgb[0]*256+rgb[1]+rgb[2]/256-32768;
  };
  return {egyptSea:await read([29.8,31.6]),egyptLand:await read([29.8,30.9]),italySea:await read([13,44.3]),italyLand:await read([12.4,43.8])};
 });
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.4,43.2],zoom:5.45})});
 await page.waitForFunction(()=>document.querySelector('#map-charting').hidden,null,{timeout:12000});
 await page.mouse.move(720,450);await page.mouse.down();await page.mouse.move(1250,450,{steps:12});
 if(!(await page.locator('#map-charting').isHidden()))throw Error('A player drag must not hide the map');
 await page.mouse.up();
 if(errors.length)throw Error(`Map page errors: ${errors.join(' | ')}`);
 console.log(`Saved matched close-map screenshots in ${output}`,{samples,jumps});
}finally{await browser.close()}
