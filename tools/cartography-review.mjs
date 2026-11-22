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
const failedTiles=[];
const jumps=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/terrain/'))failedTiles.push({status:response.status(),url:response.url()})});
page.on('requestfailed',request=>{if(request.url().includes('/terrain/'))failedTiles.push({status:request.failure(),url:request.url()})});
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
 if(await page.locator('html').getAttribute('lang')!=='zh-CN')await page.locator('#language').click();
 await page.evaluate(async()=>{window.__reviewMap=(await import(document.querySelector('script[type="module"]').src)).map});
 await page.locator('#map-mode').selectOption('terrain');
 for(const [name,center] of [['ariminum',[12.6,44.1]],['alexandria',[29.91,31.2]]]){
  await page.evaluate(async()=>{
   const {map}=await import(document.querySelector('script[type="module"]').src);
   map.setPaintProperty('coastal-halo','line-width',['interpolate',['linear'],['zoom'],4,2,8,9,9,14]);
   map.setPaintProperty('coastal-halo','line-blur',['interpolate',['linear'],['zoom'],4,1,9,6]);
   map.setPaintProperty('coastal-halo','line-opacity',['interpolate',['linear'],['zoom'],4,.04,7,.13,9,.22]);
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
  jumps.push({name,ms:Date.now()-jumpStarted,readiness:await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {loaded:map.loaded(),tilesLoaded:map.areTilesLoaded(),unloadedSources:Object.keys(map.getStyle().sources).filter(id=>!map.isSourceLoaded(id))}})});
  try{await page.waitForFunction(()=>!window.__reviewMap.isMoving()&&window.__reviewMap.areTilesLoaded(),null,{timeout:20000})}catch(error){
   const status=await page.evaluate(()=>{const map=window.__reviewMap;return {center:map.getCenter().toArray(),zoom:map.getZoom(),moving:map.isMoving(),tiles:map.areTilesLoaded(),curtain:document.querySelector('#map-charting').hidden,unloaded:Object.keys(map.getStyle().sources).filter(id=>!map.isSourceLoaded(id))}});
   throw Error(`${name} did not settle: ${JSON.stringify(status)}; terrain requests ${JSON.stringify(failedTiles.slice(-20))}; ${error.message}`)
  }
  await page.waitForTimeout(3500);
  if(name==='ariminum'){
   const nearSea=page.locator('[data-physical-label="northern-adriatic"]');
   if(await nearSea.isHidden()||await nearSea.textContent()!=='北亚得里亚海')throw Error('Northern Adriatic must be named on the Chinese Italian close map');
   if(!(await page.locator('[data-physical-label="adriatic"]').isHidden()))throw Error('Broad Adriatic label must yield to its near-scale label');
  }
  if(name==='alexandria'&&await page.locator('[data-physical-label="mediterranean"]').isHidden())throw Error('Mediterranean label must remain visible at the Egyptian coast');
  await page.screenshot({path:resolve(output,`${name}-before.png`)});
  await page.evaluate(async()=>{
   const {map}=await import(document.querySelector('script[type="module"]').src);
   map.setPaintProperty('coastal-halo','line-width',['interpolate',['linear'],['zoom'],4,2,8,3,9,4]);
   map.setPaintProperty('coastal-halo','line-blur',['interpolate',['linear'],['zoom'],4,1,9,1]);
   map.setPaintProperty('coastal-halo','line-opacity',['interpolate',['linear'],['zoom'],4,.04,7,.1,9,.07]);
  });
  await page.waitForTimeout(900);
  await page.screenshot({path:resolve(output,`${name}-trial.png`)});
  if(name==='ariminum'){
   await page.locator('#language').click();
   if(await page.locator('[data-physical-label="northern-adriatic"]').textContent()!=='Northern Adriatic')throw Error('Northern Adriatic label must translate to English');
   await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.55,44.05],zoom:9.2})});
   await page.waitForFunction(()=>document.querySelector('#map-charting').hidden,null,{timeout:12000});
   for(const [id,name] of [['caesena','Caesena'],['pisaurum','Pisaurum']]){
    const marker=page.locator(`[data-ancient-place="${id}"]`);
    if(await marker.isHidden()||await marker.textContent()!==name)throw Error(`${name}: local ancient-place label missing in English: ${JSON.stringify(await marker.evaluate(el=>({hidden:el.hidden,text:el.textContent,display:getComputedStyle(el).display,box:el.getBoundingClientRect().toJSON()})))}`);
   }
   await page.screenshot({path:resolve(output,'ariminum-local-en.png')});
   const mountain=page.locator('[data-physical-label="apennines-north"]'),mountainBox=await mountain.boundingBox();
   if(await mountain.isHidden()||await mountain.textContent()!=='Apennines'||!mountainBox||mountainBox.x<380||mountainBox.y<110||mountainBox.x+mountainBox.width>1080||mountainBox.y+mountainBox.height>740)throw Error(`Apennine label is obscured or off-map: ${JSON.stringify(mountainBox)}`);
   await page.locator('#language').click();
   if(await mountain.textContent()!=='亚平宁山脉')throw Error('Apennine terrain label must translate to Chinese');
   await page.locator('#language').click();
   await page.locator('#language').click();
   if(await page.locator('[data-ancient-place="caesena"]').textContent()!=='凯塞纳')throw Error('Ancient-place label must translate to Chinese');
   await page.locator('#language').click();
  }
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
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[8.8,43.9],zoom:9.05})});
 await page.waitForFunction(()=>document.querySelector('#map-charting').hidden,null,{timeout:12000});
 if(await page.locator('[data-physical-label="ligurian"]').isHidden()||await page.locator('[data-physical-label="ligurian"]').textContent()!=='Ligurian Sea')throw Error('Ligurian Sea must be named on the English Italian close map');
 const ligurianBox=await page.locator('[data-physical-label="ligurian"]').boundingBox();
 if(!ligurianBox||ligurianBox.x<380||ligurianBox.y<110||ligurianBox.x+ligurianBox.width>1080||ligurianBox.y+ligurianBox.height>700)throw Error(`Ligurian Sea label is outside unobstructed water: ${JSON.stringify(ligurianBox)}`);
 await page.screenshot({path:resolve(output,'liguria-close.png')});
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[10.5,45.1],zoom:8.6})});
 await page.waitForTimeout(3500);
 try{await page.waitForFunction(()=>!window.__reviewMap.isMoving()&&window.__reviewMap.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99,null,{timeout:30000})}catch(error){
  const status=await page.evaluate(()=>{const map=window.__reviewMap;return {center:map.getCenter().toArray(),zoom:map.getZoom(),moving:map.isMoving(),tiles:map.areTilesLoaded(),loaded:map.loaded(),curtain:document.querySelector('#map-charting').hidden,opacity:getComputedStyle(document.querySelector('#map')).opacity,unloaded:Object.keys(map.getStyle().sources).filter(id=>!map.isSourceLoaded(id)),sourceTiles:Object.entries(map.style?.sourceCaches||{}).filter(([id])=>!map.isSourceLoaded(id)).map(([id,cache])=>({id,tiles:Object.entries(cache?._tiles||{}).map(([key,tile])=>({key,state:tile.state,error:String(tile.error||'')})).slice(0,12)})).slice(0,12)}});
  throw Error(`Po Plain did not settle: ${JSON.stringify(status)}; ${error.message}`)
 }
 const plain=page.locator('[data-physical-label="po-plain"]'),plainBox=await plain.boundingBox();
 if(await plain.isHidden()||await plain.textContent()!=='Po Plain'||!plainBox||plainBox.x<380||plainBox.y<110||plainBox.x+plainBox.width>1080||plainBox.y+plainBox.height>740)throw Error(`Po Plain label is obscured or off-map: ${JSON.stringify(plainBox)}`);
 const poLayer=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {close:map.getLayer('waterways-po-close')?.minzoom,overview:map.getLayer('waterways-po-overview')?.maxzoom,loaded:map.isSourceLoaded('po-river-detail')}});
 if(poLayer.close!==8.1||poLayer.overview!==8.1||!poLayer.loaded)throw Error(`Po detail did not replace the overview river at local zoom: ${JSON.stringify(poLayer)}`);
 await page.screenshot({path:resolve(output,'po-plain-close.png')});
 await page.locator('#language').click();
 if(await plain.textContent()!=='波河平原')throw Error('Po Plain terrain label must translate to Chinese');
 await page.locator('#language').click();
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.48,44.96],zoom:9.05})});
 await page.waitForTimeout(3500);
 try{await page.waitForFunction(()=>!window.__reviewMap.isMoving()&&window.__reviewMap.areTilesLoaded()&&document.querySelector('#map-charting').hidden,null,{timeout:30000})}catch(error){
  const status=await page.evaluate(()=>{const map=window.__reviewMap,cache=map.style?.sourceCaches?.['elevation-higher'];return {center:map.getCenter().toArray(),zoom:map.getZoom(),moving:map.isMoving(),tiles:map.areTilesLoaded(),loaded:map.loaded(),curtain:document.querySelector('#map-charting').hidden,opacity:getComputedStyle(document.querySelector('#map')).opacity,unloaded:Object.keys(map.getStyle().sources).filter(id=>!map.isSourceLoaded(id)),terrainTiles:Object.entries(cache?._tiles||{}).map(([key,tile])=>({key,state:tile.state,error:String(tile.error||'')})).slice(0,30)}});
  await page.screenshot({path:resolve(output,'po-delta-timeout.png')});
  throw Error(`Po delta did not settle: ${JSON.stringify(status)}; terrain requests ${JSON.stringify(failedTiles.slice(-20))}; ${error.message}`)
 }
 await page.screenshot({path:resolve(output,'po-delta-close.png')});
 const poHistory=await page.evaluate(()=>{const map=window.__reviewMap;return {source:map.isSourceLoaded('po-historic-coast'),shore:map.queryRenderedFeatures(undefined,{layers:['po-historic-shore']}).length,band:map.queryRenderedFeatures(undefined,{layers:['po-historic-band']}).length,bandType:map.getLayer('po-historic-band')?.type,features:map.getSource('po-historic-coast')?._data?.features?.length,visibility:map.getLayoutProperty('po-historic-shore','visibility')}});
 if(!poHistory.source||!poHistory.shore||!poHistory.band||poHistory.bandType!=='line'||poHistory.features!==1||poHistory.visibility!=='visible')throw Error(`Po historical comparison layer missing: ${JSON.stringify(poHistory)}`);
 if(!/Historic shore band \(schematic\)/.test(await page.locator('.legend').innerText())||!/modern coast still determines land and sea/.test(await page.locator('#map-mode-note').innerText()))throw Error('English Po historical caveat or legend is missing');
 await page.locator('#language').click();
 if(!/古海岸参考带（示意）/.test(await page.locator('.legend').innerText())||!/现代海岸仍决定海陆/.test(await page.locator('#map-mode-note').innerText()))throw Error('Chinese Po historical caveat or legend is missing');
 await page.screenshot({path:resolve(output,'po-historic-zh.png')});
 await page.locator('#map-mode').selectOption('political');
 if(await page.evaluate(()=>window.__reviewMap.getLayoutProperty('po-historic-shore','visibility'))!=='none')throw Error('Historical comparison must yield to political map mode');
 await page.locator('#map-mode').selectOption('terrain');
 if(await page.evaluate(()=>window.__reviewMap.getLayoutProperty('po-historic-shore','visibility'))!=='visible')throw Error('Historical comparison must return in terrain mode');
 await page.locator('#language').click();
 await page.evaluate(()=>window.__reviewMap.jumpTo({center:[10.7,45.72],zoom:8.25}));
 await page.waitForFunction(()=>{const map=window.__reviewMap;return !map.isMoving()&&map.areTilesLoaded()&&map.isSourceLoaded('garda-lake-detail')&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
 const gardaStyle=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {close:map.getLayer('garda-close')?.minzoom,overview:map.getLayer('garda-overview')?.maxzoom,loaded:map.isSourceLoaded('garda-lake-detail')}});
 if(gardaStyle.close!==8||gardaStyle.overview!==8||!gardaStyle.loaded)throw Error(`Garda detail did not replace the overview lake at local zoom: ${JSON.stringify(gardaStyle)}`);
 const lakeLabel=page.locator('[data-physical-label="benacus"]'),lakeBox=await lakeLabel.boundingBox();
 if(await lakeLabel.isHidden()||await lakeLabel.textContent()!=='Benacus'||!lakeBox||lakeBox.x<380||lakeBox.y<110||lakeBox.x+lakeBox.width>1080||lakeBox.y+lakeBox.height>740)throw Error(`Benacus label is obscured or off-map: ${JSON.stringify(lakeBox)}`);
 await page.waitForFunction(()=>{const map=window.__reviewMap;return map.queryRenderedFeatures(map.project([10.66,45.61]),{layers:['garda-close']}).length>0},null,{timeout:10000});
 const chartState=await page.evaluate(()=>({hidden:document.querySelector('#map-charting').hidden,opacity:getComputedStyle(document.querySelector('#map')).opacity}));
 if(!chartState.hidden||Number(chartState.opacity)<.99)throw Error(`Garda screenshot would capture the charting curtain: ${JSON.stringify(chartState)}`);
 await page.screenshot({path:resolve(output,'garda-close.png')});
 await page.locator('#language').click();
 if(await lakeLabel.textContent()!=='贝纳库斯湖')throw Error('Benacus label must translate to Chinese');
 await page.locator('#language').click();
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.4,43.2],zoom:5.45})});
 await page.waitForFunction(()=>document.querySelector('#map-charting').hidden,null,{timeout:12000});
 if(!(await page.locator('[data-physical-label="northern-adriatic"]').isHidden()))throw Error('Close-sea label must hide on the overview');
 await page.mouse.move(720,450);await page.mouse.down();await page.mouse.move(1250,450,{steps:12});
 if(!(await page.locator('#map-charting').isHidden()))throw Error('A player drag must not hide the map');
 await page.mouse.up();
 if(errors.length)throw Error(`Map page errors: ${errors.join(' | ')}`);
 console.log(`Saved matched close-map screenshots in ${output}`,JSON.stringify({samples,jumps},null,2));
}finally{await browser.close()}
