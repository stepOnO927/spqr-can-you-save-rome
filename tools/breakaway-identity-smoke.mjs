import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const force=await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-name-disagreement-1');
  const {advanceMovements}=await import('/movements.js?v=faces-name-disagreement-1');
  const {observeControl}=await import('/control-intelligence.js?v=control-delivery-1');
  const state=newGame('caesar'),gaul=state.regions.find(r=>r.id==='gaul'),court=state.factions.caesar;
  gaul.loyalty=5;gaul.population.satisfaction=10;court.stability=20;court.legitimacy=25;court.tax='high';
  for(let i=0;i<83&&!state.world.movements.some(m=>m.stage==='armed');i++){
   state.month++;if(state.month>12){state.month=1;state.year++}advanceMovements(state);
  }
  const movement=state.world.movements.find(m=>m.stage==='armed');if(!movement)throw Error('The crisis did not create an armed breakaway');
  observeControl(state);
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
  return movement.force;
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 const inspect=async()=>{
  await page.locator('#factions').click();
  const entry=page.locator('[data-faction]').filter({hasText:'运动军'}).first();
  assert.equal(await entry.getAttribute('data-faction'),force);
  await entry.click();await page.locator('.identity-encyclopedia summary').click();
  assert.match(await page.locator('.identity-encyclopedia').innerText(),/从原政治势力分立/);
  assert.match(await page.locator('.identity-encyclopedia').innerText(),/原创游戏重建图案/);
  return page.locator('.identity-encyclopedia .faction-banner').getAttribute('style');
 };
 const before=await inspect();await page.locator('#save').click();await page.locator('#load').click();
 const after=await inspect();assert.equal(after,before);assert.deepEqual(errors,[]);
 console.log('A simulated breakaway appears in the faction directory with its inherited emblem and survives save/load.');
}finally{await browser.close()}
