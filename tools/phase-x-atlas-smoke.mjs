import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}addImage(){}getLayer(id){return this.layers.has(id)}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getZoom(){return 5.45}flyTo(options){window.__lastFlyTo=options}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
 await page.route('http://spqr.test/**',async route=>{const pathname=new URL(route.request().url()).pathname,file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root))return route.abort();const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(file)]||'application/octet-stream';try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
 await page.route('http://spqr.test/map-lab/vendor/maplibre-gl.js?v=5.9.0',route=>route.fulfill({status:200,contentType:'text/javascript',body:mapMock}));
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame,moveArmy,tick}=await import('/engine.js');const s=newGame();moveArmy(s,'xiii','italiaN');tick(s);tick(s);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(5000);
 if(errors.length)throw Error(errors.join('\n'));
 const free=page.locator('#start-free');if(await free.isVisible())await free.click();
 assert.ok(await page.locator('#notifications').count());
 assert.match(await page.locator('#objectives').innerText(),/Lost|失去/);
 await page.locator('#chronicle').click();assert.match(await page.locator('#selection-title').innerText(),/Chronicle|战役/);
 assert.ok(await page.locator('.report-card').filter({hasText:/Northern Italy|意大利北部/}).count()>=2);
 await page.locator('#notifications').click();assert.match(await page.locator('#selection-title').innerText(),/Notifications|通知/);
 await page.locator('.report-card.critical [data-report-region="italiaN"]').first().click();
 assert.deepEqual(await page.evaluate(()=>window.__lastFlyTo?.center),[12.5681,44.0678]);
 await page.screenshot({path:'tools/phase-x-atlas-ui.png'});
 console.log('Phase X atlas browser smoke passed.');
}finally{await browser.close()}
