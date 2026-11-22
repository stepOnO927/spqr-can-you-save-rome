// Check the rendered coast on both sides of the campaign/local style switch.
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],imageFailures=[];
try{
 await mkdir(resolve(root,'outputs','overview-coast'),{recursive:true});
 for(const language of ['zh','en']){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('/overview-coast/')&&!response.ok())imageFailures.push(`${response.status()} ${response.url()}`)});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();
   if(url.hostname!=='spqr.test')return route.abort();
   const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
   if(!file.startsWith(root+sep))return route.abort();
   const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
   try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
  });
  await page.addInitScript(language=>localStorage.setItem('spqr-lang',language),language);
  await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
  await page.locator('#start-overlay:not([hidden])').waitFor();await page.locator('#start-free').click();
  const namedByZoom=new Map();
  for(const zoom of [5.78,5.92,6.48,6.52,6.89,6.91,5.78]){
   await page.evaluate(async zoom=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[8.2,44.2],zoom})},zoom);
   await page.waitForFunction(()=>document.querySelector('#map-charting')?.hidden!==false&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99,null,{timeout:15000});
   await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.loaded()&&!map.isMoving()},null,{timeout:30000});
   const name=`${language}-${zoom}`;
   const png=await page.screenshot({path:resolve(root,'outputs','overview-coast',`${name}.png`)});
   const sample=await page.evaluate(async png=>{
    const {map}=await import(document.querySelector('script[type="module"]').src);
    const image=new Image();image.src=`data:image/png;base64,${png}`;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const box=map.getContainer().getBoundingClientRect();
    const at=coordinate=>{const p=map.project(coordinate);return [...ctx.getImageData(Math.round(box.left+p.x),Math.round(box.top+p.y),1,1).data]};
    const visibleSite=element=>{const rect=element.getBoundingClientRect();return getComputedStyle(element).display!=='none'&&rect.right>box.left&&rect.left<box.right&&rect.bottom>box.top&&rect.top<box.bottom};
    const compact=[...document.querySelectorAll('.grand-site:not(.major):not(.landmark)')].filter(visibleSite);
    const landmarks=[...document.querySelectorAll('.grand-site.landmark')].filter(visibleSite);
    const named=[...document.querySelectorAll('.grand-site')].filter(visibleSite).map(element=>element.getBoundingClientRect()).filter(rect=>rect.width>18);
    const labelClashes=named.flatMap((a,i)=>named.slice(i+1).filter(b=>a.left<b.right+4&&a.right+4>b.left&&a.top<b.bottom+4&&a.bottom+4>b.top)).length;
    return {land:at([8.2,44.8]),sea:at([8.2,43.6]),raster:map.getLayer('overview-land-raster-0-1')?.maxzoom,vector:map.getLayer('land-base')?.minzoom,compactSites:compact.length,compactWidths:compact.map(element=>Math.round(element.getBoundingClientRect().width)),landmarks:landmarks.length,namedSites:named.length,labelClashes};
   },png.toString('base64'));
   assert.ok(sample.land[0]>sample.sea[0]+55&&sample.sea[0]<100,`${name}: ${JSON.stringify(sample)}`);
   assert.equal(sample.raster,6.5);assert.equal(sample.vector,5.85);
   if(zoom>=6.48&&zoom<=6.91){assert.ok(sample.landmarks>=1,`${name}: a regional city should retain its name`);assert.equal(sample.labelClashes,0,`${name}: displayed settlement names should not overlap`);namedByZoom.set(zoom,sample.namedSites)}
   if(zoom===6.48||zoom===6.52)assert.ok(sample.compactWidths.filter(width=>width===10).length>=5,`${name}: crowded sites should remain discoverable as compact markers`);
   if(zoom===6.52)assert.ok(Math.abs(sample.namedSites-namedByZoom.get(6.48))<=2,`${name}: names should not appear in a batch at the old zoom threshold`);
   if(zoom===6.91)assert.ok(Math.abs(sample.namedSites-namedByZoom.get(6.89))<=2,`${name}: names should not appear in a batch at the new zoom threshold`);
   console.log(name,JSON.stringify(sample));
  }
  await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[8.2,44.2],zoom:6.48})});
  await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.loaded()&&!map.isMoving()});
  const controlHit=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);for(let y=180;y<610;y+=35)for(let x=420;x<1070;x+=35){if(document.elementFromPoint(x,y)!==map.getCanvas())continue;const feature=map.queryRenderedFeatures([x,y],{layers:['grand-control']})[0];if(feature)return {x,y,id:feature.properties.id}}return null});
  assert.ok(controlHit,`${language}: a transparent political catchment must remain selectable`);
  const beforeControl=await page.locator('#selection-title').textContent();
  await page.mouse.click(controlHit.x,controlHit.y);
  assert.notEqual(await page.locator('#selection-title').textContent(),beforeControl,`${language}: map-cell selection must open a place`);
  const compactSite=await page.evaluate(()=>[...document.querySelectorAll('.grand-site.near-site')].find(element=>{const box=element.getBoundingClientRect();return box.left>400&&box.right<1050&&box.top>160&&box.bottom<600})?.dataset.site);
  assert.ok(compactSite,`${language}: a compact regional site should be reachable in open map space`);
  const site=page.locator(`.grand-site[data-site="${compactSite}"]`),place=await site.textContent();
  await site.hover();assert.ok((await site.boundingBox()).width>18,`${language}: hover should reveal the compact site's name`);
  await site.click();assert.equal(await page.locator('#selection-title').textContent(),place);
  await page.close();
 }
 assert.deepEqual(imageFailures,[]);assert.deepEqual(errors,[]);
}finally{await browser.close()}
