import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief','sea','landcover','province-outline']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}getLayer(id){return this.layers.has(id)}setFilter(){}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getZoom(){return 5.45}flyTo(){}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[];
 await context.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await context.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url());if(url.pathname==='/map-lab/vendor/maplibre-gl.js'){await route.fulfill({status:200,contentType:'text/javascript',body:mapMock});return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  try{await route.fulfill({status:200,contentType:{'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream',body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await context.route('https://**/*',route=>route.abort());
 const atlas=await context.newPage();atlas.on('pageerror',error=>errors.push(error.message));
 await atlas.goto('http://spqr.test/map-lab/');await atlas.locator('#start-free').click();await atlas.locator('#resources-help').click();
 assert.equal(await atlas.locator('#war-contribution').isEnabled(),true);
 assert.equal(await atlas.locator('#emergency-provisions').isEnabled(),true);
 assert.match(await atlas.locator('.national-budget').last().innerText(),/WARTIME MUNICIPAL CONTRIBUTIONS/);
 assert.match(await atlas.locator('.national-budget').last().innerText(),/EMERGENCY PROVISIONS/);
 await atlas.locator('#emergency-provisions').click();assert.equal(await atlas.locator('#emergency-provisions').isDisabled(),true);
 await atlas.locator('#war-contribution').click();assert.equal(await atlas.locator('#war-contribution').isDisabled(),true);
 await atlas.locator('#language').click();assert.match(await atlas.locator('.national-budget').last().innerText(),/战时城镇筹款[\s\S]*紧急征集粮食/);
 await atlas.locator('#save').click();await atlas.reload();if(await atlas.locator('#start-free').isVisible())await atlas.locator('#start-free').click();await atlas.locator('#load').click();await atlas.locator('#resources-help').click();
 assert.equal(await atlas.locator('#war-contribution').isDisabled(),true,'Reloading the saved campaign must retain the contribution cooldown');
 assert.equal(await atlas.locator('#emergency-provisions').isDisabled(),true,'Reloading the saved campaign must retain the provisions cooldown');
 const campaign=await context.newPage();campaign.on('pageerror',error=>errors.push(error.message));
 await campaign.goto('http://spqr.test/');await campaign.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state})),newGrandGame('senate'));await campaign.reload();
 await campaign.locator('[data-tab="government"]').click();assert.equal(await campaign.locator('#war-contribution').isEnabled(),true);
 assert.equal(await campaign.locator('#emergency-provisions').isEnabled(),true);
 await campaign.locator('#emergency-provisions').click();assert.equal(await campaign.locator('#emergency-provisions').isDisabled(),true);
 await campaign.locator('#war-contribution').click();assert.equal(await campaign.locator('#war-contribution').isDisabled(),true);
 await campaign.locator('#lang').click();assert.match(await campaign.locator('.national-budget').last().innerText(),/WARTIME MUNICIPAL CONTRIBUTIONS|战时城镇筹款/);
 assert.match(await campaign.locator('.national-budget').last().innerText(),/EMERGENCY PROVISIONS|紧急征集粮食/);
 assert.deepEqual(errors,[]);
 console.log('Wartime contributions and emergency provisions work in both campaign views, both languages and saved campaigns.');
}finally{await browser.close()}
