import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
async function contactChainFixture(){
 const e=await import('/engine.js?v=faces-name-disagreement-1'),a=await import('/agreement-negotiations.js?v=focus-agreement-consent-1'),c=await import('/coalition-negotiations.js?v=faces-name-disagreement-1');
 for(let n=1;n<=60;n++){
  const s=e.newGame('caesar');s.difficulty='beginner';s.seed=n*1000003;
  for(const id of ['caesar','egypt','numidia'])Object.assign(s.factions[id],{treasury:300,food:300,stability:80});
  s.relations['caesar:egypt']=60;s.relations['caesar:numidia']=60;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
  const copy=structuredClone(s);if(!a.sendAgreementProposal(copy,'caesar','egypt','non_aggression').ok||!a.sendAgreementProposal(copy,'caesar','numidia','non_aggression').ok)continue;
  for(let i=0;i<4;i++)e.tick(copy);if(!copy.world.agreementLetters.every(x=>x.status==='accepted'))continue;
  if(!c.sendCoalitionInvitation(copy,'caesar',['egypt','numidia'],'senate').ok)continue;for(let i=0;i<4;i++)e.tick(copy);
  if(copy.world.coalitionInvitations[0].status!=='accepted')continue;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return {seed:s.seed};
 }
 throw Error('No complete, unforced contact-to-coalition fixture');
}
async function stage(mode){
 const initial=await page.evaluate(async(mode)=>{const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 s.world.diplomaticKnowledge.caesar={egypt:{id:'egypt',kind:'agreement',status:'active',parties:['caesar','egypt'],year:s.year,month:s.month},numidia:{id:'numidia',kind:'agreement',status:'active',parties:['caesar','numidia'],year:s.year,month:s.month}};
 if(mode==='poor')s.factions.caesar.treasury=7;if(mode==='isolated'){s.world.diplomaticKnowledge.caesar={};for(const r of s.regions)if(r.owner!=='caesar')s.controlKnowledge.caesar[r.id]={owner:'unknown',year:s.year,month:s.month}}if(mode==='hidden'){s.factions.egypt.treasury=0;s.factions.egypt.stability=0;s.relations['egypt:numidia']=-100}
 sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return {treasury:s.factions.caesar.treasury};},mode);await page.reload();await page.locator('[data-tab="government"]').click();return initial;
}
async function save(){await page.locator('#new').click();await page.locator('[data-slot="save"]').click();return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')))}
async function selection(){return Promise.all(['first','second','threat'].map(id=>page.locator('#coalition-'+id).inputValue()))}
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto((process.env.SPQR_TEST_URL||'http://127.0.0.1:5173')+'/',{waitUntil:'domcontentloaded'});
 const initial=await stage('normal');const defaults=await selection();assert.deepEqual(defaults,['egypt','numidia','senate']);assert.equal(await page.locator('#coalition-propose').isEnabled(),true);assert.match(await page.locator('#coalition-guide').innerText(),/独立评估/);
 // A changed member refreshes alternatives rather than leaving duplicate states.
 assert.equal(await page.locator('#coalition-second option[value="egypt"]').count(),0);
 assert.equal(new Set(await selection()).size,3);
 await page.locator('#coalition-first').selectOption('numidia');assert.deepEqual(await selection(),['numidia','egypt','senate']);
 await page.locator('#coalition-first').selectOption('egypt');assert.deepEqual(await selection(),defaults);
 await page.locator('#coalition-propose').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'coalition-preparation-1920x1080.png'});
 assert.match(await page.locator('#coalition-propose').locator('..').innerText(),/花费3国库.*4个月/);await page.locator('#coalition-propose').click();assert.match(await page.locator('#coalition-propose').locator('..').innerText(),/等待回信/);
 let saved=await save();assert.equal(saved.world.coalitionInvitations[0].status,'pending');assert.equal(saved.factions.caesar.treasury,initial.treasury-3);assert.deepEqual(saved.world.coalitionInvitations[0].members,['egypt','numidia']);assert.equal((saved.coalitions||[]).length,0);
 await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('#coalition-propose').isDisabled(),true);assert.match(await page.locator('#coalition-guide').innerText(),/等待回信/);
 await stage('hidden');assert.deepEqual(await selection(),defaults);assert.equal(await page.locator('#coalition-propose').isEnabled(),true);
 await stage('poor');assert.equal(await page.locator('#coalition-propose').isDisabled(),true);assert.match(await page.locator('#coalition-guide').innerText(),/至少需要8国库/);saved=await save();assert.equal(saved.factions.caesar.treasury,7);assert.equal((saved.world.coalitionInvitations||[]).length,0);
 await stage('isolated');assert.equal(await page.locator('#coalition-propose').isDisabled(),true);assert.match(await page.locator('#coalition-guide').innerText(),/至少两个已联络/);
 await page.locator('#lang').click();await page.locator('[data-tab="government"]').click();assert.match(await page.locator('#coalition-guide').innerText(),/At least two contacted/);
 // The same government action remains reachable from the actual terrain map.
 await page.locator('#open-atlas').click();await page.locator('[data-city="ROMA"]').waitFor();await page.locator('#campaign-government').click();await page.locator('#coalition-guide').waitFor();assert.equal(await page.locator('#coalition-propose').isDisabled(),true);
 // A delivered invitation never consumes the player's answer when their own new war prevents acceptance.
 await page.evaluate(async()=>{const e=await import('/engine.js?v=faces-name-disagreement-1'),c=await import('/coalition-negotiations.js?v=faces-name-disagreement-1'),m=await import('/epistulae.js?v=faces-name-disagreement-1'),s=e.newGame('caesar');s.relations['egypt:numidia']=40;s.relations['caesar:egypt']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;s.world.diplomaticKnowledge.egypt={caesar:{id:'caesar',status:'active',parties:['egypt','caesar']},numidia:{id:'numidia',status:'active',parties:['egypt','numidia']}};if(!c.sendCoalitionInvitation(s,'egypt',['caesar','numidia'],'senate').ok)throw Error('incoming dispatch');for(let i=0;i<2;i++){s.month++;c.advanceCoalitionInvitations(s,e.estimatedStrength,()=>.5);m.syncCoalitionLetters(s)}s.wars.push(['caesar','numidia']);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));localStorage.setItem('spqr-lang','zh')});
 await page.reload();await page.locator('#mail-open').click();const accept=page.locator('[data-mail-reply="accept_coalition"]');await accept.click();await accept.click();assert.match(await page.locator('body').innerText(),/无法接受联盟/);await page.locator('#mail-close').click();saved=await save();const offer=saved.world.coalitionInvitations[0];assert.equal(offer.phase,'awaiting_player');assert.equal(saved.mail.messages.find(m=>m.context?.kind==='coalition_offer').responses.length,0);
 // Establish contact through actual player correspondence, then conclude the coalition through real turns.
 const chain=await page.evaluate(contactChainFixture);await page.reload();await page.locator('[data-tab="government"]').click();
 const prior=await save();assert.equal((prior.agreements||[]).filter(t=>t.parties.includes('caesar')).length,0);
 for(const partner of ['egypt','numidia']){await page.locator('#agreement-target').selectOption(partner);await page.locator('#agreement-type').selectOption('non_aggression');await page.locator('#agreement-propose').click()}
 for(let i=0;i<4;i++)await page.locator('#step').click();saved=await save();for(const partner of ['egypt','numidia'])assert.ok(saved.agreements.some(t=>t.status==='active'&&t.type==='non_aggression'&&t.parties.includes('caesar')&&t.parties.includes(partner)));
 await page.locator('[data-tab="government"]').click();assert.deepEqual(await selection(),['egypt','numidia','senate']);assert.equal(await page.locator('#coalition-propose').isEnabled(),true);const dispatchCash=saved.factions.caesar.treasury;
 await page.locator('#coalition-propose').click();saved=await save();assert.equal(saved.factions.caesar.treasury,dispatchCash-3);assert.equal((saved.coalitions||[]).length,0);
 for(let i=0;i<4;i++)await page.locator('#step').click();saved=await save();assert.equal(saved.world.coalitionInvitations[0].status,'accepted');assert.ok(saved.coalitions.some(c=>c.status==='active'&&c.target==='senate'&&['caesar','egypt','numidia'].every(id=>c.parties.includes(id))));
 await page.locator('[data-tab="government"]').click();await page.locator('[data-leave-coalition]').scrollIntoViewIfNeeded();await page.screenshot({path:'coalition-preparation-contact-chain-1920x1080.png'});console.log('COALITION_CONTACT_CHAIN: real outbound treaties, four months for replies/contact, paid coalition invitation and four more months to actual coalition formation passed; seed '+chain.seed);
 assert.deepEqual(errors,[]);console.log('COALITION_PREPARATION_UI: distinct valid defaults, member changes, actual paid dispatch, pending save/load, own-funds/contact explanations, hidden-state invariance, bilingual text and atlas entry passed');
}catch(error){await page.screenshot({path:'coalition-preparation-failure-1920x1080.png'}).catch(()=>{});throw error}finally{await browser.close()}
