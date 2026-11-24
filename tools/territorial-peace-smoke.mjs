import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
try{
 for(const view of ['campaign','atlas'])for(const expected of ['answered','refused','no_reply']){
  const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async view=>{const {newGame}=await import('/engine.js?v=dossier-archive-1'),s=newGame('caesar');s.difficulty='beginner';s.factions.caesar.treasury=300;s.factions.senate.treasury=0;s.factions.senate.manpower=0;for(const a of s.armies.filter(a=>a.owner!=='caesar')){a.men=500;a.move=null;a.siege=null}sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:view,state:s}))},view);
  if(view==='atlas'){await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();await page.locator('[data-page="diplomacy"]').click()}else{await page.reload();await page.locator('[data-tab="government"]').click()}
  const form=page.locator('[data-peace-proposal]');await form.locator('[data-peace-region]').selectOption('narbo');assert.match(await form.locator('[data-peace-quote]').innerText(),/2个月|2 months/);const button=form.locator('[data-peace-send]');await button.click();assert.match(await button.innerText(),/确认.*3国库/);await button.click();assert.match(await form.innerText(),/等待回信/);
  async function save(){if(view==='atlas')await page.locator('#save').click();else{await page.locator('#new').click();await page.locator('[data-slot="save"]').click()}return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')))}
  let s=await save(),l=s.inquiries.find(x=>x.actor==='caesar'&&x.subject==='peace');assert.equal(s.factions.caesar.treasury,297);assert.equal(l.peaceTerms.region,'narbo');assert.equal(s.regions.find(r=>r.id==='narbo').owner,'caesar');assert.equal(l.status,'pending');
  // Select a reproducible random stream from the actual player-created pending state.
  await page.evaluate(async({expected,view})=>{const {upgradeSave,tick}=await import('/engine.js?v=dossier-archive-1'),base=JSON.parse(localStorage.getItem('spqr-save-1'));for(let i=1;i<=120;i++){const s=upgradeSave(structuredClone(base));s.seed=i*100003;tick(s);tick(s);const l=s.inquiries.find(x=>x.actor==='caesar'&&x.subject==='peace');if(l.status===expected){base.seed=i*100003;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:view,state:base}));return}}throw Error('No seeded outcome: '+expected)},{expected,view});
  await page.reload();const advance=view==='atlas'?'#advance':'#step';await page.locator(advance).click();s=await save();assert.equal(s.regions.find(r=>r.id==='narbo').owner,'caesar');assert.ok(s.wars.some(w=>w.includes('caesar')&&w.includes('senate')));
  if(view==='atlas')await page.locator('#load').click();else{await page.locator('#new').click();await page.locator('[data-slot="load"]').click()}
  await page.locator(advance).click();s=await save();l=s.inquiries.find(x=>x.actor==='caesar'&&x.subject==='peace');assert.equal(l.status,expected);assert.equal(s.regions.find(r=>r.id==='narbo').owner,expected==='answered'?'senate':'caesar');assert.equal(s.wars.some(w=>w.includes('caesar')&&w.includes('senate')),expected!=='answered');assert.equal(s.armies.find(a=>a.id==='viii').owner,'caesar');
  const reply=s.mail.messages.find(m=>m.context?.kind==='inquiry_result'&&m.context.subject==='peace');
  if(expected==='no_reply')assert.equal(reply,undefined);else{assert.ok(reply);await page.locator(view==='atlas'?'#atlas-mail':'#mail-open').click();await page.locator(`[data-mail-select="${reply.id}"]`).click();assert.match(await page.locator('.mail-letter').innerText(),/纳博讷高卢/);assert.match(await page.locator('.mail-letter').innerText(),expected==='answered'?/和平协议已.*生效/:/拒绝议和/)}
  console.log(`TERRITORIAL_PEACE ${view} ${expected}: confirmed offer, fee, delay, save/load and actual control verified`);await page.close();
 }
 const incoming=await browser.newPage({viewport:{width:1600,height:1000}});incoming.on('pageerror',e=>errors.push(e.message));await incoming.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await incoming.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await incoming.evaluate(async()=>{
  const {newGame,sendInquiry,tick}=await import('/engine.js?v=dossier-archive-1');
  function start(seed){const s=newGame('caesar');s.seed=seed;s.difficulty='beginner';for(const a of s.armies.filter(a=>a.owner!=='caesar'))a.men=500;s.factions.senate.treasury=30;s.factions.senate.manpower=0;if(!sendInquiry(s,'senate','caesar','peace',{offerRegion:'hispaniaN'}).ok)throw Error('Incoming offer unavailable');return s}
  for(let i=1;i<=100;i++){const s=start(i*100003);tick(s);if(s.inquiries.find(l=>l.actor==='senate').status==='awaiting_decision'){sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:start(i*100003)}));return}}throw Error('No incoming arrival');
 });
 await incoming.reload();await incoming.locator('#step').click();await incoming.locator('[data-tab="government"]').click();const accept=incoming.locator('[data-answer-peace="senate"][data-decision="accept"]');assert.match(await accept.locator('..').innerText(),/近西班牙.*有效回信送达前/);await accept.click();
 await incoming.locator('#new').click();await incoming.locator('[data-slot="save"]').click();let pending=await incoming.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(pending.regions.find(r=>r.id==='hispaniaN').owner,'senate');assert.ok(pending.wars.some(w=>w.includes('caesar')&&w.includes('senate')));
 await incoming.evaluate(async()=>{const {upgradeSave,tick}=await import('/engine.js?v=dossier-archive-1'),base=JSON.parse(localStorage.getItem('spqr-save-1'));for(let i=1;i<=80;i++){const s=upgradeSave(structuredClone(base));s.seed=i*100003;tick(s);if(s.inquiries.find(l=>l.actor==='senate').peaceSettlement==='concluded'){base.seed=i*100003;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:base}));return}}throw Error('No delivered acceptance')});
 await incoming.reload();await incoming.locator('#step').click();await incoming.locator('#new').click();await incoming.locator('[data-slot="save"]').click();pending=await incoming.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(pending.regions.find(r=>r.id==='hispaniaN').owner,'caesar');assert.equal(pending.inquiries.find(l=>l.actor==='senate').peaceSettlement,'concluded');await incoming.close();
 const titlePage=await browser.newPage({viewport:{width:1600,height:1000}});titlePage.on('pageerror',e=>errors.push(e.message));await titlePage.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await titlePage.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const titleMailId=await titlePage.evaluate(async()=>{
  const {newGame,sendInquiry}=await import('/engine.js?v=dossier-archive-1'),{syncPeaceLetters}=await import('/epistulae.js?v=dossier-archive-1'),s=newGame('caesar');
  s.factions.senate.treasury=30;s.regions.find(r=>r.id==='italiaN').legalSovereign='caesar';
  if(!sendInquiry(s,'senate','caesar','peace',{titleAsset:{kind:'theater',id:'italiaN'}}).ok)throw Error('Title offer unavailable');
  const letter=s.inquiries[0];letter.status='awaiting_decision';letter.remaining=6;syncPeaceLetters(s);
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return letter.mailId;
 });
 await titlePage.reload();await titlePage.locator('[data-tab="government"]').click();assert.match(await titlePage.locator('[data-answer-peace="senate"][data-decision="accept"]').locator('..').innerText(),/意大利北部.*法理归属/);
 await titlePage.locator('#mail-open').click();await titlePage.locator(`[data-mail-select="${titleMailId}"]`).click();assert.match(await titlePage.locator('.mail-letter').innerText(),/意大利北部.*法理归属/);await titlePage.close();
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
