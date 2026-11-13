import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const mapMock=`window.maplibregl={Map:class{constructor(){this.sources={};this.layers=new Set(['control','relief']);this.canvas=document.createElement('canvas')}on(name,layer,callback){if(name==='load')setTimeout(typeof layer==='function'?layer:callback,0);return this}addSource(id,data){this.sources[id]={...data,setData(x){this.data=x}}}getSource(id){return this.sources[id]}addLayer(layer){this.layers.add(layer.id)}addImage(){}getLayer(id){return this.layers.has(id)}setPaintProperty(){}setLayoutProperty(){}getCanvas(){return this.canvas}getZoom(){return 5.45}flyTo(){}zoomIn(){}zoomOut(){}queryRenderedFeatures(){return []}},Marker:class{constructor({element}){this.element=element}setLngLat(){return this}addTo(){document.querySelector('#map').append(this.element);return this}remove(){this.element.remove()}}}`;
try{
 for(const language of ['en','zh']){
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://spqr.test/**',async route=>{
   const pathname=new URL(route.request().url()).pathname,file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
   if(!file.startsWith(root))return route.abort();
   const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
   try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
  });
  await page.route('http://spqr.test/map-lab/vendor/maplibre-gl.js?v=5.9.0',route=>route.fulfill({status:200,contentType:'text/javascript',body:mapMock}));
  await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
  await page.evaluate(value=>localStorage.setItem('spqr-lang',value),language);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#start-overlay').waitFor({state:'visible'});
  await page.locator('#roman-faction').selectOption('senate');
  await page.locator('#start-free').click();
  await page.locator('#development').click();
  await page.locator('[data-dev-page="ideas"]').click();
  assert.match(await page.locator('.religion-panel').innerText(),language==='zh'?/王廷结盟/:/alliances with neighboring courts/);
  await page.locator('#factions').click();
  await page.locator('.faction-directory [data-faction="numidia"]').click();
  assert.equal(await page.locator('[data-diplomacy="alliance"]').isDisabled(),true,language);
  await page.locator('#save').click();
  const baseline=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  for(const [policy,credit,enabled] of [['civic-patronage',-5,false],['local-rites',5,true]]){
   const state=structuredClone(baseline);state.religion.senate={policy,transition:null};
   await page.evaluate(value=>localStorage.setItem('spqr-save-1',JSON.stringify(value)),state);
   await page.locator('#load').click();
   await page.locator('#factions').click();
   await page.locator('.faction-directory [data-faction="numidia"]').click();
   const detail=await page.locator('#command-detail').innerText();
   assert.match(detail,language==='zh'?/边境祭仪外交加成：/:/Border rites diplomatic credit:/);
   assert.match(detail,new RegExp((language==='zh'?'边境祭仪外交加成：':'Border rites diplomatic credit: ')+credit));
   assert.equal(await page.locator('[data-diplomacy="alliance"]').isEnabled(),enabled,`${language} ${policy}`);
  }
  await page.locator('[data-diplomacy="alliance"]').click();
  assert.equal(await page.locator('[data-diplomacy="break"]').count(),1,language);
  assert.deepEqual(errors,[],language);
  await page.close();
 }
 console.log('Phase XIV border-rites diplomacy EN/ZH browser smoke passed');
}finally{await browser.close()}
