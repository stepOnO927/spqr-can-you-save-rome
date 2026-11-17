import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=born-portraits-eleven-1'),s=newGame('caesar');s.fortKnowledge||={};s.fortKnowledge.caesar||={};s.fortKnowledge.caesar.italiaN={band:[1,2],year:s.year,month:s.month,source:'frontier'};sessionStorage.setItem('attack-fixture',JSON.stringify(s))});
 async function preview(fort,supply,mode='fresh'){
  await page.evaluate(({fort,supply,mode})=>{const s=JSON.parse(sessionStorage.getItem('attack-fixture')),r=s.regions.find(x=>x.id==='italiaN');r.fort=fort;r.supply=supply;if(mode==='missing')delete s.fortKnowledge.caesar.italiaN;if(mode==='stale')s.fortKnowledge.caesar.italiaN.year=s.year-3;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))},{fort,supply,mode});
  await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('[data-army="xiii"]').click();await page.locator('#lab-orders select').selectOption('italiaN');return page.locator('.preview-detail').innerText();
 }
 const low=await preview(0,1),high=await preview(5,999);assert.equal(high,low);assert.match(low,/补给上限未知/);assert.match(low,/工事报告：1–2/);assert.match(low,/已报告兵力约/);
 const missing=await preview(5,999,'missing'),stale=await preview(0,1,'stale');assert.match(missing,/工事未知或报告已过期；按0–5范围估计/);assert.equal(stale,missing);
 await page.locator('#lab-orders button').click();await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.armies.find(a=>a.id==='xiii').move.to,'italiaN');assert.deepEqual(errors,[]);
 console.log('Attack previews use reported fort bands, hide foreign supply, and still issue real orders.');
}finally{await browser.close()}
