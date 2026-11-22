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
   const {newGame}=await import('/engine.js?v=faces-commander-snapshot-1');
   const {createFictionalPerson}=await import('/dynasties.js?v=faces-commander-snapshot-1');
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
 assert.match(await page.locator('[data-gene-meeting-history]').innerText(),/没有答复/);
 state=await save();
 assert.equal(state.meetings[0].status,'no_contact');

 // A delivered fictional name remains the one used in an audience request.
 actorId=await page.evaluate(async()=>{
  const {newGame,upgradeSave}=await import('/engine.js?v=faces-commander-snapshot-1');
  const {createFictionalPerson}=await import('/dynasties.js?v=faces-commander-snapshot-1');
  const {addReport}=await import('/character-system.js?v=faces-commander-snapshot-1');
  let s=newGame('caesar');
  const actor=createFictionalPerson(s,{name:['Test traveler','测试旅人'],faction:'caesar',birthYear:-80,location:'cisalpine'});
  const target=createFictionalPerson(s,{name:['Reported Person','报告中的人物'],faction:'egypt',birthYear:-75,location:'egypt'});
  addReport(s,'caesar','egypt',{kind:'leaders',leaders:[target],source:'spy'});
  s.world.dynasties.catalog[target].name=['Secret rename','秘密改名'];
  s=upgradeSave(structuredClone(s));
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
  return actor;
 });
 await open();
 const reported=page.locator('[data-gene-meeting-target] option').filter({hasText:'报告中的人物'});
 assert.equal(await reported.count(),1);
 assert.doesNotMatch(await page.locator('[data-gene-meeting-target]').innerText(),/秘密改名/);
 await page.locator('[data-gene-meeting-target]').selectOption(await reported.getAttribute('value'));
 await page.locator('[data-gene-meeting]').click();
 await page.locator('[data-gene-meeting-feedback] button').click();
 assert.match(await page.locator('[data-gene-meeting-history]').innerText(),/报告中的人物/);
 state=await save();
 assert.deepEqual(state.meetings[0].reportedName,['Reported Person','报告中的人物']);
 // An undated forwarded name stays usable as a lead without revealing the hidden name.
 actorId=await page.evaluate(async()=>{
  const {newGame,upgradeSave}=await import('/engine.js?v=faces-commander-snapshot-1');
  const {createFictionalPerson}=await import('/dynasties.js?v=faces-commander-snapshot-1');
  const {addReport}=await import('/character-system.js?v=faces-commander-snapshot-1');
  let s=newGame('caesar');
  const actor=createFictionalPerson(s,{name:['Test traveler','测试旅人'],faction:'caesar',birthYear:-80,location:'cisalpine'});
  const target=createFictionalPerson(s,{name:['Hidden','秘密姓名'],faction:'egypt',birthYear:-75,location:'egypt'});
  addReport(s,'caesar','egypt',{kind:'leaders',leaders:[target],source:'exchange',observationUndated:true,peopleNames:{[target]:['Undated name','旧报告姓名']}});
  s=upgradeSave(structuredClone(s));
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
  return actor;
 });
 await open();
 const undated=page.locator('[data-gene-meeting-target] option').filter({hasText:'旧报告姓名'});
 assert.equal(await undated.count(),1);
 assert.match(await undated.innerText(),/报告日期未知/);
 assert.doesNotMatch(await page.locator('[data-gene-meeting-target]').innerText(),/秘密姓名|NaN|undefined/);
 await page.locator('[data-gene-meeting-target]').selectOption(await undated.getAttribute('value'));
 await page.locator('[data-gene-meeting]').click();
 await page.locator('[data-gene-meeting-feedback] button').click();
 state=await save();
 assert.deepEqual(state.meetings[0].reportedName,['Undated name','旧报告姓名']);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-slot="load"]').click();
 await page.locator('[data-tab="government"]').click();
 await page.locator(`[data-gene-person="${actorId}"]`).click();
 assert.match(await page.locator('[data-gene-meeting-history]').innerText(),/旧报告姓名/);
 assert.deepEqual(errors,[]);
 console.log('Personal travel and delayed audiences work from the family tree with saved reported names and no hidden-name leak.');
}finally{await browser.close()}
