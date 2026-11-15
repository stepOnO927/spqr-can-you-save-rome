import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
let actorId;

try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const inject=async hidden=>{
  actorId=await page.evaluate(async hidden=>{
   const {newGame}=await import('/engine.js?v=faces-main-20261115-1');
   const {createFictionalPerson}=await import('/dynasties.js?v=faces-main-20261115-1');
   const state=newGame('caesar');
   const id=createFictionalPerson(state,{name:['Test traveler','测试旅人'],faction:'caesar',birthYear:-80,location:'cisalpine'});
   if(hidden){state.world.characters.cleopatra.alive=false;state.world.characters.cleopatra.location='parthia'}
   sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state}));
   return id;
  },hidden);
 };
 const open=async()=>{
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-tab="government"]').click();
  await page.locator(`[data-gene-person="${actorId}"]`).click();
 };
 const save=async()=>{
  await page.evaluate(()=>document.querySelector('#save').click());
  return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 };

 await inject(false);await open();
 const actions=page.locator('.gene-personal-actions');
 assert.match(await actions.innerText(),/人物旅行与个人会面/);
 await page.locator('[data-gene-destination]').selectOption('gaul');
 await page.locator('[data-gene-preview]').click();
 assert.match(await page.locator('[data-gene-travel-feedback]').innerText(),/预计 3 个月；费用 3/);
 await page.locator('[data-gene-travel-feedback] button').click();
 assert.equal(await actions.evaluate(el=>{const r=el.getBoundingClientRect(),v=el.closest('.inspector').getBoundingClientRect();return r.bottom>v.top&&r.top<v.bottom}),true,'Travel result remains visible after confirmation');
 assert.match(await actions.innerText(),/正在旅行/);
 await page.locator('[data-gene-halt]').click();
 assert.match(await actions.innerText(),/已下令抵达下一战区后停下/);
 let state=await save();
 assert.equal(state.factions.caesar.treasury,87);
 assert.equal(state.world.characters[actorId].travel.destination,'gaul');
 assert.equal(state.world.characters[actorId].travel.haltAfterLeg,true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-slot="load"]').click();
 await page.locator('[data-tab="government"]').click();
 await page.locator(`[data-gene-person="${actorId}"]`).click();
 assert.match(await actions.innerText(),/已下令抵达下一战区后停下/);
 await page.locator('#step').click();await page.locator('#step').click();
 state=await save();
 assert.equal(state.world.characters[actorId].location,'narbo');
 assert.equal(state.world.characters[actorId].travel,undefined);

 await inject(true);await open();
 const select=page.locator('[data-gene-meeting-target]');
 const option=select.locator('option').filter({hasText:'克娄巴特拉七世'}).first();
 await select.selectOption(await option.getAttribute('value'));
 await page.locator('[data-gene-meeting]').click();
 assert.match(await page.locator('[data-gene-meeting-feedback]').innerText(),/3国库，约两个月；可能无答复/);
 await page.locator('[data-gene-meeting-feedback] button').click();
 assert.match(await page.locator('[data-gene-meeting-history]').innerText(),/等待答复/);
 state=await save();
 assert.equal(state.meetings[0].status,'pending');
 assert.equal(state.factions.caesar.treasury,87);
 assert.equal(state.meetings[0].remaining,2);
 await page.locator('#step').click();await page.locator('#step').click();
 await page.locator('[data-tab="government"]').click();
 await page.locator(`[data-gene-person="${actorId}"]`).click();
 assert.match(await page.locator('[data-gene-meeting-history]').innerText(),/未能见面/);
 state=await save();
 assert.equal(state.meetings[0].status,'no_contact');
 assert.deepEqual(errors,[]);
 console.log('Personal travel and delayed audience work from the family tree, including saving, stopping and stale information.');
}finally{await browser.close()}
