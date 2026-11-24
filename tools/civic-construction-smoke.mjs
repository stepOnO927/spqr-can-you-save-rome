import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor();
 await page.locator('#roman-faction').selectOption('senate');
 await page.locator('#start-free').click();
 await page.locator('#save').click();
 await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem('spqr-save-1'));
  state.wars=[];
  for(const army of state.armies){army.move=null;army.siege=null}
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#inventions').click();
 for(const id of ['fortifications','training_fields','quarries','market_halls','archives','baths','civic_offices']){
  await page.locator(`[data-node="${id}"]`).click();
  assert.ok((await page.locator('.invention-detail').innerText()).includes('历史资料'));
 }
 await page.locator('[data-node="market_halls"]').click();
 assert.match(await page.locator('.invention-detail').innerText(),/市场库存上限/);
 await page.locator('#invention-research').click();
 await page.locator('#invention-close').click();
 for(let month=0;month<4;month++)await page.locator('#advance').click();
 await page.locator('[data-city="ROMA"]').click({force:true});
 await page.locator('#city-region').click();
 await page.locator('#construct-choice').selectOption('market_halls');
 await page.locator('#construct-start').click();
 assert.match(await page.locator('#construct-feedback').innerText(),/已开工/);
 await page.locator('#save').click();
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(state.regions.find(r=>r.id==='roma').construction.id,'market_halls');
 // Prevent a legitimate wartime capture from cancelling this focused construction check.
 await page.evaluate(()=>{
  const saved=JSON.parse(localStorage.getItem('spqr-save-1'));
  saved.wars=[];
  for(const army of saved.armies){army.move=null;army.siege=null}
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:saved}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 for(let month=0;month<3;month++)await page.locator('#advance').click();
 await page.locator('#save').click();
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.ok(state.regions.find(r=>r.id==='roma').buildings.includes('market_halls'));
 assert.deepEqual(errors,[]);
 console.log('Bilingual civic invention catalog, Senate market construction, and save/reload passed');
}finally{await browser.close()}
