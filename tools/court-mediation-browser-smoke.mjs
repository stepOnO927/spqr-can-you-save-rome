import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';
import {contestLeadership} from '../character-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief','sea','landcover','province-outline']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}addImage(){}getLayer(id){return this.layers.has(id)}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getContainer(){return document.querySelector('#map')}getZoom(){return 5.45}flyTo(){}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
await context.route('https://**/*',route=>route.abort());
await context.route('http://spqr.test/**',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/map-lab/vendor/maplibre-gl.js'){await route.fulfill({status:200,contentType:'text/javascript',body:mapMock});return}
 const relative=url.pathname==='/'?'index.html':url.pathname==='/map-lab/'?'map-lab/index.html':url.pathname.slice(1),target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep)){await route.abort();return}
 try{const body=await readFile(target),ext=path.extname(target);await route.fulfill({status:200,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream',body})}
 catch{await route.fulfill({status:404,body:'Not found'})}
});
try{
 const errors=[],state=newGrandGame('egypt');assert.equal(contestLeadership(state,'egypt','cleopatra'),true);
 const main=await context.newPage();main.on('pageerror',e=>errors.push(e.message));
 await main.goto('http://spqr.test/');
 await main.evaluate(s=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s})),state);
 await main.reload();await main.locator('[data-tab="government"]').click();
 assert.match(await main.locator('.court-mediation').innerText(),/Court succession dispute|宫廷继承争议/);
 await main.locator('.court-mediation').screenshot({path:path.join(root,'outputs','court-mediation-main.png')});
 const mainBefore=await main.locator('.court-mediation').innerText();
 await main.locator('[data-mediate-court]').click();
 assert.equal(await main.locator('[data-mediate-court]').isDisabled(),true);
 assert.match(await main.locator('.court-mediation-reason').innerText(),/pending|等待/);
 await main.locator('#lang').click();
 assert.notEqual(await main.locator('.court-mediation').innerText(),mainBefore);
 await main.close();

 const atlas=await context.newPage();atlas.on('pageerror',e=>errors.push(e.stack));
 await atlas.goto('http://spqr.test/map-lab/');
 await atlas.locator('.grand-site').first().waitFor();
 if(await atlas.locator('#start-free').isVisible())await atlas.locator('#start-free').click();
 await atlas.locator('#upload-save-file').setInputFiles({name:'egypt-dispute.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await atlas.locator('#factions').click();await atlas.locator('.faction-directory [data-faction="egypt"]').click();
 assert.match(await atlas.locator('.court-mediation').innerText(),/Court succession dispute|宫廷继承争议/);
 await atlas.locator('.court-mediation').screenshot({path:path.join(root,'outputs','court-mediation-atlas.png')});
 await atlas.locator('[data-mediate-court]').click();
 assert.equal(await atlas.locator('[data-mediate-court]').isDisabled(),true);
 assert.match(await atlas.locator('.court-mediation-reason').innerText(),/pending|等待/);
 const atlasBefore=await atlas.locator('.court-mediation').innerText();await atlas.locator('#language').click();
 assert.notEqual(await atlas.locator('.court-mediation').innerText(),atlasBefore);
 assert.deepEqual(errors,[]);
 console.log('Court mediation browser smoke passed');
}finally{await browser.close()}
