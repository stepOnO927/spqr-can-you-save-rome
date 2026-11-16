import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {normalizeProfile} from '../legacy/legacy-core.js';
import {settleRace} from '../legacy/race.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage();
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='spqr.test')return route.abort();
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))return route.abort();
  try{await route.fulfill({status:200,contentType:{'.js':'text/javascript','.html':'text/html','.css':'text/css'}[extname(file)]||'application/octet-stream',body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>{
  localStorage.setItem('spqr-lang','zh');
  localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({buildings:['temple','circus']}));
 });
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 const raced=await page.evaluate(async()=>{
  // Advance the animation clock in 50 ms steps to exercise an off-track crash
  // without waiting through a real-time race or changing the game simulation.
  let nextId=0,virtual=performance.now();const pending=new Map();
  window.requestAnimationFrame=callback=>{const id=++nextId;pending.set(id,setTimeout(()=>{if(!pending.has(id))return;pending.delete(id);virtual+=50;callback(virtual)},0));return id};
  window.cancelAnimationFrame=id=>{clearTimeout(pending.get(id));pending.delete(id)};
  const {startRace}=await import('/legacy/race.js');
  const canvas=document.createElement('canvas');canvas.width=760;canvas.height=430;
  const hud=document.createElement('div');
  return new Promise(resolve=>{
   const racer=startRace(canvas,hud,'Aurelia',result=>resolve({result,snapshot:racer.snapshot(),hud:hud.textContent}));
   racer.control('ArrowUp',true);
  });
 });
 assert.equal(raced.result.retired,true);
 assert.equal(raced.result.place,5);
 assert.equal(raced.result.lastDriver,'Aurelia');
 assert.equal(raced.result.durability,0);
 assert.ok(raced.result.elapsed<75,'wheel failure should end the race without waiting for the time limit');
 const profile=normalizeProfile({buildings:['temple','circus']});
 const balance=profile.coins,settled=settleRace(profile,raced.result);
 assert.equal(settled.payout,0);
 assert.equal(profile.coins,balance);
 assert.equal(profile.race.runs,1);
 assert.equal(settleRace(profile,raced.result).ok,false,'a saved result must not pay twice');
 assert.equal(settleRace(profile,{id:'invalid',place:Number.NaN}).ok,false,'invalid place must not corrupt the profile');
 assert.ok(Number.isFinite(profile.coins));
 await page.locator('#nav-race').click();
 await page.locator('#race-start').click();
 await page.keyboard.down('ArrowUp');
 await page.waitForFunction(()=>document.querySelector('#race-result')?.textContent.includes('车轮毁坏'));
 await page.keyboard.up('ArrowUp');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(saved.race.runs,1);
 assert.equal(saved.coins,150);
 console.log(`Wheel failure retired a chariot after ${raced.result.elapsed}s; no payout or duplicate reward.`);
}finally{await browser.close()}
