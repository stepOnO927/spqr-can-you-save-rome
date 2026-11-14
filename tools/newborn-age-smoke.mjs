import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const id=await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=cursus-portraits-1');
  const {createFictionalPerson}=await import('/dynasties.js?v=cursus-portraits-1');
  const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Newborn','新生儿'],faction:'caesar',birthYear:s.year});
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return id;
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 const inspect=async()=>{await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();await page.locator(`[data-character="${id}"]`).click();const text=await page.locator('#command-detail').innerText();assert.match(text,/年龄\s*约0/);assert.doesNotMatch(text,/约-1/)};
 await inspect();await page.locator('#save').click();await page.locator('#load').click();await inspect();
 assert.deepEqual(errors,[]);console.log('Newborn age is zero in the character dossier before and after save/load.');
}finally{await browser.close()}
