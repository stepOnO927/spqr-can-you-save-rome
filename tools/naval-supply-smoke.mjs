import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief','sea','landcover','province-outline']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}getLayer(id){return this.layers.has(id)}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getZoom(){return 5.45}flyTo(){}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
 await context.route('https://**/*',route=>route.abort());
 await context.route('http://spqr.test/**',async route=>{const url=new URL(route.request().url());if(url.hostname==='spqr.test'&&url.pathname==='/map-lab/vendor/maplibre-gl.js'){await route.fulfill({status:200,contentType:'text/javascript',body:mapMock});return}const relative=url.pathname==='/'?'index.html':url.pathname==='/map-lab/'?'map-lab/index.html':url.pathname.slice(1),target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)){await route.abort();return}try{const body=await readFile(target),ext=path.extname(target),contentType={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream';await route.fulfill({status:200,contentType,body})}catch{await route.fulfill({status:404,body:'Not found'})}});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-senate').click();await page.waitForURL('**/map-lab/');await page.locator('.grand-site').first().waitFor();
 await page.locator('#naval').click();
 assert.match(await page.locator('.naval-content').innerText(),/MARITIME ARMY SUPPLY/);
 assert.match(await page.locator('.naval-content').innerText(),/three friendly land links/);
 assert.match(await page.locator('.naval-content').innerText(),/Army supply capacity 6 food/);
 await page.locator('[data-order-kind="senate-adriatic"]').selectOption('supply');
 await page.locator('[data-order-target="senate-adriatic"]').selectOption('t016');
 await page.locator('[data-order="senate-adriatic"]').click();
 assert.match(await page.locator('.naval-content').innerText(),/food in transit/);
 await page.locator('#language').click();
 assert.match(await page.locator('.naval-content').innerText(),/海运陆军补给/);
 assert.match(await page.locator('.naval-content').innerText(),/三段己方陆路/);
 assert.match(await page.locator('.naval-content').innerText(),/份粮在途/);
 assert.match(await page.locator('.naval-content').innerText(),/军需载量 6粮/);
 const reports=await page.evaluate(async()=>{
  const {newGrandGame}=await import('../engine.js?v=141');
  const {renderNavalPanel}=await import('./naval-ui.js?v=36');
  const state=newGrandGame('senate');state.naval.reports.unshift({id:'supply-test',kind:'supply-delivery',owner:'senate',port:'t016',cargo:6,year:-49,month:4});
  const root=document.createElement('div');
  const render=lang=>{renderNavalPanel({state,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});return root.textContent};
  return {en:render('en'),zh:render('zh')};
 });
 assert.match(reports.en,/Army supplies delivered/);assert.match(reports.en,/Food 6/);
 assert.match(reports.zh,/陆军补给抵港/);assert.match(reports.zh,/粮食 6/);
 assert.deepEqual(errors,[]);
 console.log('Naval supply browser smoke passed in English and Chinese');
}finally{await browser.close()}
