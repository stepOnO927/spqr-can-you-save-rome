import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-empire-2');
  const {proposeAgreement}=await import('/agreements.js?v=grand-chessboard-2');
  const s=newGame('caesar');s.wars=[];s.relations['caesar:senate']=70;
  if(!proposeAgreement(s,'caesar','senate','trade').ok)throw Error('Trade access unavailable');
  s.factions.caesar.treasury=200;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 await page.locator('#market-origin').selectOption('italiaN');
 await page.locator('#market-destination').selectOption('cisalpine');
 await page.locator('#market-commodity').selectOption('grain');
 await page.locator('#market-quantity').fill('2');
 await page.locator('#market-quantity').dispatchEvent('change');
 const create=page.locator('#market-contract-create');assert.equal(await create.isEnabled(),true);
 await create.click();assert.match(await page.locator('#market-contract-feedback').innerText(),/first caravan is prepaid/);
 await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 const contract=saved.markets.supplyContracts[0],first=saved.markets.shipments.find(x=>x.contractId===contract.id);
 assert.equal(contract.dispatched,1);assert.equal(first.quantity,2);assert.ok(first.escrow>0);
 assert.equal(saved.factions.caesar.treasury,200-first.escrow-2);
 await page.locator('#load').click();await page.locator('#markets').click();
 for(let i=0;i<3;i++)await page.locator('#advance').click();
 await page.locator('#save').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.supplyContracts[0].dispatched,2);
 assert.equal(saved.markets.shipments.filter(x=>x.contractId===contract.id).length,2);
 assert.equal(saved.markets.shipments[0].status,'delivered');
 await page.locator('#markets').click();await page.locator('#language').click();
 assert.match(await page.locator('#command-detail').innerText(),/定期供货约定/);
 await page.locator('[data-market-cancel-contract]').click();
 await page.locator('#market-contract-feedback button').click();
 await page.locator('#save').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.supplyContracts[0].status,'withdrawn');
 assert.equal(saved.markets.shipments.length>=2,true);
 assert.deepEqual(errors,[]);
 console.log('Recurring supply dispatch, save/load, physical delivery, bilingual UI, and withdrawal work.');
}finally{await browser.close()}
