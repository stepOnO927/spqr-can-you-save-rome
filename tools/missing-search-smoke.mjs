import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const opening=await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),state=newGame('senate'),person=state.world.characters.pompey,army=state.armies.find(unit=>unit.characterId==='pompey');
  if(army){army.characterId=null;army.commander=['Unnamed officer','未具名军官']}
  person.location=null;person.missing={origin:'roma',remaining:3,year:state.year,month:state.month};
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
  return state.factions.senate.treasury;
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();
 await page.locator('#command-detail [data-character="pompey"]').first().click();
 const panel=page.locator('#command-detail');
 await panel.locator('[data-fund-missing-search]').click();
 await panel.locator('[data-confirm-missing-search]').click();
 assert.match(await panel.innerText(),/已投入额外资源|本次已投入/);
 await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.factions.senate.treasury,opening-5);
 assert.equal(saved.world.characters.pompey.missing.searchFunded,true);
 assert.equal(saved.world.characters.pompey.missing.remaining,2);
 await page.locator('#load').click();
 await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();
 await page.locator('#command-detail [data-character="pompey"]').first().click();
 assert.match(await page.locator('#command-detail').innerText(),/已投入额外资源|本次已投入/);
 assert.deepEqual(errors,[]);
 console.log('Missing-person search funding changes treasury and timing, and persists through save and load.');
}finally{await browser.close()}
