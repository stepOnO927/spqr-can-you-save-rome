import {chromium} from 'playwright';
import assert from 'node:assert/strict';
async function installEndingFixture({kind,outcome}){
 const e=await import('/engine.js?v=dossier-archive-1'),a=await import('/agreements.js?v=dossier-archive-1');
 for(let n=1;n<=80;n++){
  const s=e.newGame('caesar');s.difficulty='beginner';s.seed=n*1000003;s.relations['caesar:egypt']=60;
  for(const id of ['caesar','egypt'])Object.assign(s.factions[id],{treasury:300,food:300,stability:80});for(const unit of s.armies.filter(x=>x.owner==='caesar'))unit.men=12000;
  if(kind==='alliance'){if(!e.diplomacy(s,'egypt','caesar','alliance'))throw Error('starting alliance');if(!e.diplomacy(s,'egypt','caesar','break'))throw Error('remote renunciation')}else{const t=a.proposeAgreement(s,'egypt','caesar','non_aggression');if(!t.ok)throw Error(t.reason);if(!a.terminateAgreement(s,t.agreement.id,'egypt').ok)throw Error('ending')}
  const copy=structuredClone(s);let steps=0;for(;steps<18;){const before=copy.year*12+copy.month;e.tick(copy);steps++;if(copy.year*12+copy.month===before)break;const m=copy.mail.messages.find(m=>m.context?.kind==='treaty_notice');if(m&&['received','lost'].includes(m.delivery))break}
  const notice=copy.mail.messages.find(m=>m.context?.kind==='treaty_notice');if(notice?.delivery!==outcome||copy.defeat)continue;
  localStorage.setItem('spqr-lang','zh');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return {steps,noticeKey:notice.context.noticeId,kind,outcome};
 }throw Error('No reproducible real notice outcome');
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];let page;
try{
 page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 async function save(){await page.locator('#new').click();await page.locator('[data-slot="save"]').click();return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')))}
 let f=await page.evaluate(installEndingFixture,{kind:'non_aggression',outcome:'received'});await page.reload();await page.locator('[data-tab="government"]').click();
 assert.equal(await page.locator('[data-breach]').count(),1);assert.equal(await page.locator('[data-dip="egypt"][data-act="war"]').isDisabled(),true);
 let s=await save();assert.equal(s.agreements[0].status,'breached');assert.equal(s.world.diplomaticKnowledge.caesar[s.agreements[0].id].status,'active');
 for(let i=0;i<f.steps-1;i++)await page.locator('#step').click();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-breach]').count(),1);
 await page.locator('#step').click();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-breach]').count(),0);assert.equal(await page.locator('[data-dip="egypt"][data-act="war"]').isEnabled(),true);
 s=await save();const notice=s.mail.messages.find(m=>m.context?.noticeId===f.noticeKey);assert.equal(notice.delivery,'received');assert.equal(s.world.diplomaticKnowledge.caesar[s.agreements[0].id].status,'breached');
 await page.locator('#mail-open').click();await page.locator('[data-mail-select="'+notice.id+'"]').click();assert.match(await page.locator('.mail-letter').innerText(),/放弃.*互不侵犯/);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'treaty-observation-received-1920x1080.png'});await page.locator('#mail-close').click();
 await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-breach]').count(),0);
 f=await page.evaluate(installEndingFixture,{kind:'alliance',outcome:'lost'});await page.reload();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-dip="egypt"][data-act="war"]').isDisabled(),true);
 for(let i=0;i<f.steps;i++)await page.locator('#step').click();s=await save();assert.equal(s.alliances.length,0);assert.equal(s.mail.messages.find(m=>m.context?.noticeId===f.noticeKey).delivery,'lost');assert.ok(Object.values(s.world.diplomaticKnowledge.caesar).some(t=>t.kind==='alliance'&&t.status==='active'));
 await page.locator('#open-atlas').click();await page.locator('[data-city="ROMA"]').waitFor();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="diplomacy"]').click();assert.equal(await page.locator('[data-diplomacy="war"]').isDisabled(),true);
 await page.waitForTimeout(6000);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'treaty-observation-stale-alliance-1920x1080.png'});await page.locator('#return-campaign').click();await page.locator('[data-tab="government"]').click();
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-dip="egypt"][data-act="war"]').isDisabled(),true);
 await page.locator('[data-dip="egypt"][data-act="break"]').click();s=await save();assert.equal(s.diplomaticCredibility.caesar,80);await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-dip="egypt"][data-act="war"]').isEnabled(),true);
 assert.deepEqual(errors,[]);console.log('TREATY_OBSERVATION_UI: real delayed notice changes the copy only on receipt; a real lost notice preserves stale belief in both maps/save-load; explicit local renunciation works without a remote oracle');
}catch(error){if(page)await page.screenshot({path:'treaty-observation-failure-1920x1080.png'}).catch(()=>{});throw error}finally{await browser.close()}
