import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame} from '../engine.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief','sea','landcover','province-outline']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}addImage(){}getLayer(id){return this.layers.has(id)}setFilter(){}getPaintProperty(){return null}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getContainer(){return document.querySelector('#map')}getZoom(){return 5.45}flyTo(){}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
try{
 for(const language of ['en','zh']){
  const state=newGrandGame('caesar');state.factions.caesar.food=80;
  for(const id of ['cisalpine','t002','t004','t005'])state.regions.find(r=>r.id===id).food=2;
  state.development.caesar.knownIdeas.push('grain-dues-commutation');
  state.development.caesar.slots.economy[0]='grain-dues-commutation';
  const context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[];
  await context.addInitScript(({state,language})=>{localStorage.setItem('spqr-lang',language);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}))},{state,language});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();if(url.hostname!=='spqr.test')return route.abort();
   if(url.pathname==='/map-lab/vendor/maplibre-gl.js')return route.fulfill({status:200,contentType:'text/javascript',body:mapMock});
   const filename=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,file=resolve(root,'.'+filename);
   if(!file.startsWith(root+sep))return route.abort();
   const type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
   try{await route.fulfill({status:200,contentType:type,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://spqr.test/map-lab/');
  await page.locator('#development').click();await page.locator('[data-dev-branch="idea"]').click();
  const card=await page.locator('#tech-grain-dues-commutation').innerText();
  assert.match(card,language==='zh'?/征粮折现协定/:/Requisition Grain Commutation/);
  assert.match(card,language==='zh'?/最多\+3国库/:/up to \+3 treasury/);
  await page.locator('#resources-help').click();
  const budget=await page.locator('.national-budget').last().innerText();
  assert.match(budget,language==='zh'?/征粮折现收入/:/Requisition grain commuted to cash/);
  assert.match(budget,language==='zh'?/征粮折现减少入库粮/:/Requisition grain withheld from stores/);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Grain commutation card and live budget render in the atlas in English and Chinese.');
}finally{await browser.close()}
