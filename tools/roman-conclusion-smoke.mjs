import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=dossier-archive-1'),{proposeAgreement}=await import('/agreements.js?v=dossier-archive-1'),s=newGame('caesar');s.seed=1000003;s.difficulty='beginner';
  for(const r of s.regions)if(r.owner==='senate'&&!['italiaN','roma'].includes(r.id))r.owner='caesar';
  const attacker=s.armies.find(a=>a.id==='xiii'),defender=s.armies.find(a=>a.owner==='senate');
  s.armies=[attacker,defender];Object.assign(attacker,{region:'cisalpine',men:18000,morale:90,move:null,siege:null});Object.assign(defender,{region:'italiaN',men:300,morale:30,move:null,siege:null});
  s.regions.find(r=>r.id==='italiaN').fort=0;s.regions.find(r=>r.id==='roma').fort=3;
  Object.assign(s.factions.caesar,{treasury:1000,food:1000,stability:90});Object.assign(s.factions.senate,{treasury:0,manpower:0,food:20,stability:90});
  s.relations['caesar:egypt']=60;if(!proposeAgreement(s,'caesar','egypt','trade').ok)throw Error('No archival treaty fixture');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();
 async function save(){await page.locator('#new').click();await page.locator('[data-slot="save"]').click();return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')))}
 async function load(){await page.locator('#new').click();await page.locator('[data-slot="load"]').click()}
 async function march(destination){await page.locator('[data-tab="map"]').click();await page.locator('[data-army="xiii"]').first().click();await page.locator('#order').click();await page.locator('#march-destination').selectOption(destination)}
 await page.locator('[data-tab="legacy"]').click();assert.equal(await page.locator('#finalize-campaign').count(),0);assert.doesNotMatch(await page.locator('body').innerText(),/外交谈判桌/);
 await march('italiaN');await page.locator('#step').click();let s=await save();assert.ok(s.battles.some(b=>b.region==='italiaN'&&b.attackerWins));assert.equal(s.regions.find(r=>r.id==='italiaN').owner,'caesar');assert.equal(s.victory,false);await load();
 await march('roma');for(let i=0;i<3;i++){await page.locator('#step').click();s=await save();if(s.armies.find(a=>a.id==='xiii').siege?.remaining>0)break;await load()}
 assert.ok(s.armies.find(a=>a.id==='xiii').siege?.remaining>0,'the army should begin its siege after completing the route');assert.equal(s.regions.find(r=>r.id==='roma').owner,'senate');assert.equal(s.victory,false);await load();
 for(let i=0;i<8&&s.regions.find(r=>r.id==='roma').owner==='senate';i++){await page.locator('#step').click();s=await save()}
 assert.equal(s.regions.find(r=>r.id==='roma').owner,'caesar');assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice.remaining,3);await load();
 for(let i=0;i<2;i++)await page.locator('#step').click();s=await save();assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice.remaining,1);
 await page.locator('#step').click();s=await save();assert.equal(s.victory,true);assert.equal(s.victor,'caesar');
 await page.locator('[data-tab="chronicle"]').click();assert.match(await page.locator('#chronicle-root').innerText(),/信使报告敌对罗马指挥方已瓦解/);
 await page.locator('[data-tab="legacy"]').click();assert.doesNotMatch(await page.locator('body').innerText(),/外交谈判桌/);await page.locator('#finalize-campaign').click();
 await page.locator('.legacy-entry details').first().evaluate(el=>el.open=true);assert.match(await page.locator('.legacy-entry').first().innerText(),/外交谈判桌/);s=await save();assert.ok(s.world.dynasties.finalized.victory);assert.ok(s.world.dynasties.finalized.chronicle.some(e=>e.kind==='battle'));await load();
 await page.locator('[data-tab="legacy"]').click();assert.equal(await page.locator('#finalize-campaign').count(),0);assert.equal(await page.locator('.legacy-entry').count(),1);
 await page.locator('#new').click();await page.locator('.setup-advanced').evaluate(el=>el.open=true);await page.locator('#campaign-guide').uncheck();await page.locator('#start-campaign').click();await page.locator('[data-tab="legacy"]').click();await page.locator('.legacy-entry details').first().evaluate(el=>el.open=true);
 assert.match(await page.locator('.legacy-entry').first().innerText(),/外交谈判桌/);assert.equal(await page.locator('#finalize-campaign').count(),0);s=await save();assert.ok(!s.world.dynasties.finalized);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-archive')).length),1);
 await page.locator('#lang').click();await page.locator('[data-tab="legacy"]').click();await page.locator('.legacy-entry details').first().evaluate(el=>el.open=true);assert.match(await page.locator('.legacy-entry').first().innerText(),/Earned distinctions.*At the Diplomatic Table/);
 assert.deepEqual(errors,[]);console.log('Real battle, saved siege, delayed Roman victory, finalization and prior-campaign distinctions verified through player controls.');
}finally{await browser.close()}
