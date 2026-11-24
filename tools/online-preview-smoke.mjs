// Check the separately deployed branch against actual hosted static assets.
import {chromium} from 'playwright';

const base=process.env.SPQR_PREVIEW_URL||'http://localhost:5173';
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).host===new URL(base).host)missing.push(`${response.status()} ${response.url()}`)});
try{
 const response=await page.goto(new URL('/map-lab/',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 if(response.status()!==200)throw Error(`Atlas returned ${response.status()}`);
 if((await page.title()).includes('Login – Vercel'))throw Error('Preview requires Vercel login; public browser test cannot continue');
 console.log('Hosted atlas document loaded');
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor({timeout:30000});
 await page.evaluate(async()=>{window.__spqrSmokeMap=(await import(document.querySelector('script[type="module"]').src)).map});
 await page.waitForFunction(()=>window.__spqrSmokeMap.isStyleLoaded()&&window.__spqrSmokeMap.areTilesLoaded(),null,{timeout:30000});
 console.log('Hosted atlas sources loaded');
 const local=await page.evaluate(()=>{const map=window.__spqrSmokeMap;return {zoom:map.getZoom(),hasSea:!!map.getLayer('sea-final'),hasDetailedTerrain:!!map.getLayer('land-elevation-higher'),hasNaval:!!document.querySelector('#naval'),hasPaperGrain:map.hasImage('land-grain')||map.hasImage('sea-grain')}});
 if(!local.hasSea||!local.hasDetailedTerrain||!local.hasNaval||local.hasPaperGrain)throw Error(`Deployed branch is missing expected features or still drawing decorative grain: ${JSON.stringify(local)}`);
 const catalog=await page.evaluate(async()=>{const {IDEAS,MATERIALS,BUILDINGS}=await import('../development.js');const idea=IDEAS.find(item=>item.id==='maritime-cultural-exchange'),dam=MATERIALS.find(item=>item.id==='dam-engineering'),building=BUILDINGS.find(item=>item.id==='dam'),road=MATERIALS.find(item=>item.id==='roadmaking'),patronage=IDEAS.find(item=>item.id==='philosophical-patronage');return {english:idea?.context?.[0],chinese:idea?.context?.[1],damSource:dam?.source?.title,damEnglish:dam?.context?.[0],damChinese:dam?.context?.[1],buildingEnglish:building?.context?.[0],buildingChinese:building?.context?.[1],roadSource:road?.source?.url,patronageSource:patronage?.source?.url,reservoir:MATERIALS.find(item=>item.id==='reservoir-design')?.source?.title}});
 if(!catalog.english?.includes('Delos, Rhodes and Alexandria')||!catalog.chinese?.includes('提洛、罗得与亚历山大里亚')||!catalog.damSource?.includes('Alyzia Dam')||!catalog.damEnglish?.includes('mid-fourth to third century BCE')||!catalog.damChinese?.includes('前4世纪中叶至前3世纪')||!catalog.buildingEnglish?.includes('3 food to the monthly national budget')||!catalog.buildingChinese?.includes('每月为国家粮食收支增加3')||!catalog.roadSource?.includes('parcoarcheologicoappiaantica.it/il-parco/storia/lappia-ieri/regina-viarum')||!catalog.patronageSource?.includes('attalus.org/cicero/atticus4.html')||!catalog.reservoir?.includes('Auximum water collection system'))throw Error(`Hosted development catalog is stale: ${JSON.stringify(catalog)}`);
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(()=>window.__spqrSmokeMap.jumpTo({center:[12.6,44.1],zoom:9.05}));
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 const terrain=await (await page.waitForFunction(()=>{const map=window.__spqrSmokeMap;const result={zoom:map.getZoom(),center:map.getCenter().toArray(),detailLoaded:map.isSourceLoaded('elevation-higher'),seaLoaded:map.isSourceLoaded('ocean')};return map.areTilesLoaded()&&result.detailLoaded&&result.seaLoaded&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99?result:false},null,{timeout:30000})).jsonValue();
 if(!terrain.detailLoaded||!terrain.seaLoaded)throw Error(`Hosted atlas tiles did not settle: ${JSON.stringify({terrain,missing:missing.slice(0,20),errors})}`);
 console.log('Hosted Italian terrain loaded');
 await page.evaluate(()=>window.__spqrSmokeMap.jumpTo({center:[10.7,44.8],zoom:9.05}));
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 const poDrainage=await (await page.waitForFunction(()=>{const map=window.__spqrSmokeMap;return map.areTilesLoaded()&&map.isSourceLoaded('po-roman-drainage')?{visible:map.getLayoutProperty('po-roman-drainage-line','visibility'),rendered:map.queryRenderedFeatures({layers:['po-roman-drainage-line']}).length}:false},null,{timeout:30000})).jsonValue();
 if(poDrainage.visible!=='visible'||poDrainage.rendered<1)throw Error(`Hosted Roman-period Po layer did not render: ${JSON.stringify(poDrainage)}`);
 console.log('Hosted Roman-period Po layer rendered');
 if(await page.locator('html').getAttribute('lang')!=='zh-CN')await page.locator('#language').click();
 if(await page.locator('html').getAttribute('lang')!=='zh-CN')throw Error('Chinese language switch failed');
 await page.locator('#language').click();
 if(await page.locator('html').getAttribute('lang')!=='en')throw Error('English language switch failed');
 if(errors.length||missing.length)throw Error(`Hosted atlas errors: ${JSON.stringify({errors,missing})}`);
 console.log(JSON.stringify({base,local,catalogChecked:true,terrain,poDrainage,errors,missing},null,2));
}finally{await browser.close()}
