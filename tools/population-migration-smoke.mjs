import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=dossier-archive-1');
  const {advanceReligion}=await import('/religion.js?v=dossier-archive-1');
  const state=newGame('caesar');
  for(const region of state.regions)region.population.satisfaction=65;
  state.regions.find(region=>region.id==='gaul').population.satisfaction=10;
  state.regions.find(region=>region.id==='narbo').population.satisfaction=90;
  state.factions.caesar.food=100;state.month=12;
  advanceReligion(state);
  if(!state.world.populationMigrations?.some(record=>record.from==='gaul'&&record.to==='narbo'))throw Error('No migration');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-city="NARBO"]').dispatchEvent('click');
 await page.locator('#city-region').click();
 assert.match(await page.locator('#command-detail').innerText(),/最近迁徙[\s\S]*来自远高卢/);
 await page.locator('#lang').click();
 assert.match(await page.locator('#command-detail').innerText(),/Recent migration[\s\S]*arrived from Further Gaul/);
 await page.locator('#save').click();
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('spqr-save-1'));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}))});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-city="NARBO"]').dispatchEvent('click');
 await page.locator('#city-region').click();
 assert.match(await page.locator('#command-detail').innerText(),/Recent migration[\s\S]*arrived from Further Gaul/);
 assert.deepEqual(errors,[]);
 console.log('Real population migration appears in both languages and survives a saved atlas reload.');
}finally{await browser.close()}
