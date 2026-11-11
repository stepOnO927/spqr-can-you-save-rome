import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief','sea','landcover','province-outline']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}getLayer(id){return this.layers.has(id)}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getZoom(){return 5.45}flyTo(){}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
await context.route('https://**/*',route=>route.abort());
await context.route('http://spqr.test/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/map-lab/vendor/maplibre-gl.js'){await route.fulfill({status:200,contentType:'text/javascript',body:mapMock});return}const relative=url.pathname==='/'?'index.html':url.pathname==='/map-lab/'?'map-lab/index.html':url.pathname.slice(1),target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)){await route.abort();return}try{const body=await readFile(target),ext=path.extname(target);await route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[ext]||'application/octet-stream',body})}catch{await route.fulfill({status:404,body:'Not found'})}});
try{
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://spqr.test/map-lab/');await page.locator('.grand-site').first().waitFor();
 const s=newGrandGame('senate');s.victory=true;s.campaignOutcome={kind:'settlement',winner:'senate',loser:'caesar',year:s.year,month:s.month};s.expenseLedger={year:s.year,month:s.month,owners:{senate:{construction:23,research:17}}};
 await page.locator('#upload-save-file').setInputFiles({name:'victory.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
 await page.locator('#victory-continue').waitFor();assert.equal(await page.locator('.ending-achievements').count(),0);
 await page.locator('#victory-continue').click();assert.equal(await page.locator('.campaign-ending').count(),0);
 await page.locator('#resources-help').click();assert.match(await page.locator('.national-budget').innerText(),/MONTHLY NATIONAL BUDGET|每月国家预算/);
 assert.match(await page.locator('.national-budget').innerText(),/本月已付建造费\s+-23|Construction paid this month\s+-23/);
 assert.match(await page.locator('.national-budget').innerText(),/本月已付研究费\s+-17|Research paid this month\s+-17/);
 const firstBudget=await page.locator('.national-budget').innerText();await page.locator('#language').click();const translatedBudget=await page.locator('.national-budget').innerText();
 assert.notEqual(firstBudget,translatedBudget);assert.match(translatedBudget,/本月已付建造费\s+-23|Construction paid this month\s+-23/);assert.match(translatedBudget,/本月已付研究费\s+-17|Research paid this month\s+-17/);
 await page.locator('#end-campaign').click();const beforeLanguage=await page.locator('.ending-summary').innerText();assert.match(beforeLanguage,/Negotiated settlement|政治和议/);
 await page.locator('#ending-language').click();const afterLanguage=await page.locator('.ending-summary').innerText();assert.match(afterLanguage,/Negotiated settlement|政治和议/);assert.notEqual(afterLanguage,beforeLanguage);
 assert.deepEqual(errors,[]);
 console.log('Phase XII browser smoke passed');
}finally{await browser.close()}
