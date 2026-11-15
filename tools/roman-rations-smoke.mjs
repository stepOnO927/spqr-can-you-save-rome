import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-reported-names-1'),s=newGame('caesar');
  s.wars=[];s.factions.caesar.food=-100;s.markets.regions.cisalpine.goods.provisions.stock=2;s.markets.regions.cisalpine.goods.provisions.production=0;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();await page.locator('[data-army="xiii"]').first().click();
 assert.match(await page.locator('#load-roman-rations').innerText(),/装载一批行军口粮/);
 await page.locator('#load-roman-rations').click();await page.locator('#load-roman-rations').click();
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.regions.cisalpine.goods.provisions.stock,0);assert.equal(saved.armies.find(a=>a.id==='xiii').fieldRations,12000);
 await page.locator('#step').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.armies.find(a=>a.id==='xiii').fieldRations,4800);
 assert.equal(saved.armies.find(a=>a.id==='xiii').provisionsUsed,7200);

 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-reported-names-1'),s=newGame('caesar');
  s.markets.regions.cisalpine.goods.provisions.stock=1;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-army="xiii"]').first().click();
 assert.match(await page.locator('#load-roman-rations').innerText(),/装载一批行军口粮/);
 await page.locator('#load-roman-rations').click();await page.locator('#save').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.regions.cisalpine.goods.provisions.stock,0);
 assert.equal(saved.armies.find(a=>a.id==='xiii').fieldRations,6000);
 await page.locator('#language').click();await page.locator('[data-army="xiii"]').first().click();
 assert.match(await page.locator('#command-detail').innerText(),/FIELD RATIONS/);
 await page.locator('#load').click();await page.locator('[data-army="xiii"]').first().click();
 assert.match(await page.locator('#command-detail').innerText(),/6,000 soldier-months/);
 assert.deepEqual(errors,[]);
 console.log('Roman rations load from finite stock, reduce famine losses, and persist in both campaign views.');
}finally{await browser.close()}
