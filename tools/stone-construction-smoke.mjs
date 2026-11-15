import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function selectNarbo(){
 const marker=page.locator('[data-city="NARBO"]');
 for(let attempt=0;attempt<4;attempt++){
  await marker.waitFor({state:'attached'});
  try{
   if(await marker.isVisible())await marker.click({timeout:5000});
   else await marker.dispatchEvent('click');
   await page.locator('#city-region').waitFor({state:'attached',timeout:2500});
   await page.locator('#city-region').click();return;
  }catch(error){if(attempt===3)throw error}
 }
}
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=exchange-undated-1');
  const s=newGame('caesar');s.wars=[];for(const army of s.armies){army.move=null;army.siege=null}
  s.inventions.caesar.knownMaterial.push('water');
  Object.assign(s.markets.regions.narbo.goods.stone,{stock:0,production:0,consumption:0});
  Object.assign(s.markets.regions.cisalpine.goods.stone,{stock:5,production:0,consumption:0});
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#inventions').click();
 await page.locator('[data-node="bridges"]').click();assert.match(await page.locator('.invention-detail').innerText(),/2批石材、2批木材/);
 await page.locator('[data-node="metalworking"]').click();assert.match(await page.locator('.invention-detail').innerText(),/1批铁料/);
 await page.locator('[data-node="water"]').click();
 assert.match(await page.locator('.invention-detail').innerText(),/1批石材/);
 await page.locator('#invention-close').click();
 await selectNarbo();
 await page.locator('#construct-choice').selectOption('water');await page.locator('#construct-start').click();
 assert.match(await page.locator('#construct-feedback').innerText(),/当地建筑石材不足/);
 await page.locator('#markets').click();
 await page.locator('#market-origin').selectOption('cisalpine');
 await page.locator('#market-destination').selectOption('narbo');
 await page.locator('#market-commodity').selectOption('stone');
 await page.locator('#market-quantity').fill('1');
 assert.match(await page.locator('#market-quote').innerText(),/预计\s*1\s*个月/);
 await page.locator('#market-order').click();
 await page.locator('#advance').click();
 await selectNarbo();
 await page.locator('#construct-choice').selectOption('water');await page.locator('#construct-start').click();
 assert.match(await page.locator('#construct-feedback').innerText(),/工程已开工/);
 await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.regions.narbo.goods.stone.stock,0);
 assert.equal(saved.markets.regions.narbo.goods.stone.usedForConstruction,1);
 assert.equal(saved.regions.find(r=>r.id==='narbo').construction.materials.stone,1);
 assert.equal(saved.markets.transactions.filter(x=>x.commodity==='stone'&&x.destination==='narbo').length,1);
 await page.locator('#language').click();await page.locator('#inventions').click();
 await page.locator('[data-node="bridges"]').click();assert.match(await page.locator('.invention-detail').innerText(),/2 batches of building stone, 2 batches of timber/);
 await page.locator('[data-node="metalworking"]').click();assert.match(await page.locator('.invention-detail').innerText(),/1 batch of iron/);
 await page.locator('[data-node="water"]').click();
 assert.match(await page.locator('.invention-detail').innerText(),/1 batch of building stone/);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1'));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#save').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.regions.narbo.goods.stone.stock,0);
 assert.equal(saved.markets.regions.narbo.goods.stone.usedForConstruction,1);
 assert.deepEqual(errors,[]);
 console.log('Paid stone shipment supplied one construction batch; bilingual costs and save ledger survived reload.');
}finally{await browser.close()}
