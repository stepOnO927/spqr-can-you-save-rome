import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,diplomacy,isWar,moveArmy,sendStrategicOffer,advanceStrategicOffers,answerStrategicOffer} from '../engine.js?v=dossier-archive-1';
import {proposeAgreement,terminateAgreement,advanceAgreements,activeAgreement,neutralityBlocksWar,neutralityBlocksAid} from '../agreements.js?v=dossier-archive-1';
import {sendAgreementProposal,advanceAgreementProposals,answerAgreementProposal} from '../agreement-negotiations.js?v=dossier-archive-1';
import {syncAgreementLetters,receivedMail,replyToLetter} from '../epistulae.js?v=dossier-archive-1';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=dossier-archive-1';

const date=s=>s.year*12+s.month;
function fixture(seed=1000003){const s=newGame('caesar');s.seed=seed;s.alliances=[];s.relations['caesar:egypt']=60;for(const id of ['caesar','egypt'])Object.assign(s.factions[id],{treasury:300,food:300});return s}
function step(s,{mail=false,autoplayPlayer=false}={}){if(++s.month>12){s.month=1;s.year++}advanceAgreementProposals(s,{autoplayPlayer});if(mail)syncAgreementLetters(s)}
function pact(s){const r=proposeAgreement(s,'caesar','egypt','neutrality',{enemy:'senate'});assert.ok(r.ok,r.reason);return r.agreement}

test('a named-war neutrality proposal has real courier and treaty costs, delayed effects and a twelve-month term',()=>{
 let s=fixture(),cash=s.factions.caesar.treasury,forces=structuredClone(s.armies);
 const r=sendAgreementProposal(s,'caesar','egypt','neutrality',{enemy:'senate'});assert.ok(r.ok);assert.equal(s.factions.caesar.treasury,cash-2);
 assert.equal(neutralityBlocksWar(s,'egypt','senate'),false);step(s);step(s);assert.equal(s.world.agreementLetters[0].sealed.outcome,'accepted');assert.equal(s.agreements.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));step(s);assert.equal(s.agreements.length,0);step(s);
 const t=activeAgreement(s,'caesar','egypt','neutrality');assert.ok(t);assert.equal(t.duration,12);assert.equal(t.expiresAt,date(s)+12);assert.equal(s.factions.caesar.treasury,cash-8);assert.equal(s.factions.egypt.treasury,300);
 assert.deepEqual(t.terms,{requester:'caesar',neutral:'egypt',warParties:['caesar','senate'],selfDefense:true});assert.deepEqual(s.armies,forces);
});

test('the neutral party cannot open either named front, signatories cannot attack each other, and other fronts and self-defense remain possible',()=>{
 const s=fixture();pact(s);
 for(const [a,b] of [['egypt','caesar'],['egypt','senate'],['caesar','egypt']])assert.equal(diplomacy(s,a,b,'war'),false);
 assert.equal(diplomacy(s,'egypt','armenia','war'),true);assert.equal(diplomacy(s,'senate','egypt','war'),true);
 assert.equal(isWar(s,'egypt','senate'),true);assert.ok(moveArmy(s,'egyptguard','syria').ok,'independent defense/counterattack uses ordinary military rules');
});

test('trade survives neutrality and the fixed term does not secretly expire when the original war ends',()=>{
 const s=fixture(),t=pact(s),trade=proposeAgreement(s,'egypt','caesar','trade');assert.ok(trade.ok);
 const a=s.factions.caesar.treasury,b=s.factions.egypt.treasury;advanceAgreements(s);assert.equal(s.factions.caesar.treasury,a);assert.equal(s.factions.egypt.treasury,b);assert.ok(s.tradeCargo.some(cargo=>cargo.status==='transit'));
 assert.equal(trade.agreement.status,'active');
 s.wars=s.wars.filter(w=>!(w.includes('caesar')&&w.includes('senate')));assert.equal(neutralityBlocksWar(s,'egypt','senate'),true);
 while(date(s)<t.expiresAt){if(++s.month>12){s.month=1;s.year++}}advanceAgreements(s);assert.equal(t.status,'expired');assert.equal(neutralityBlocksWar(s,'egypt','senate'),false);
});

test('explicit unilateral breach restores new actions and has the existing real credibility and relation cost',()=>{
 const s=fixture(),t=pact(s),rel=s.relations['caesar:egypt'];assert.ok(terminateAgreement(s,t.id,'egypt').ok);
 assert.equal(s.diplomaticCredibility.egypt,80);assert.equal(s.relations['caesar:egypt'],rel-20);assert.equal(neutralityBlocksAid(s,'egypt','caesar'),false);assert.equal(diplomacy(s,'egypt','senate','war'),true);
});

test('new direct aid to either belligerent is blocked without preventing an unrelated aid agreement',()=>{
 const s=fixture();pact(s);assert.equal(neutralityBlocksAid(s,'egypt','caesar'),true);assert.equal(neutralityBlocksAid(s,'egypt','senate'),true);
 assert.equal(proposeAgreement(s,'egypt','caesar','military_support').reason,'neutrality');
 assert.equal(proposeAgreement(s,'egypt','caesar','offensive').reason,'neutrality');assert.equal(proposeAgreement(s,'caesar','egypt','military_access').reason,'neutrality');
 s.relations['armenia:egypt']=60;assert.ok(proposeAgreement(s,'egypt','armenia','military_support').ok);
 s.wars.push(['armenia','parthia']);s.month=3;const cash=s.factions.armenia.treasury;advanceAgreements(s);assert.equal(s.factions.armenia.treasury,cash+2);
 // Imported/inconsistent ledgers still cannot make new direct aid payments.
 const source=fixture(),savedAid=proposeAgreement(source,'egypt','caesar','military_support').agreement;
 const raced=fixture();pact(raced);raced.agreements.push({...structuredClone(savedAid),id:'imported-aid'});
 raced.month=3;const treasury=raced.factions.caesar.treasury;advanceAgreements(raced);assert.equal(raced.factions.caesar.treasury,treasury);
});

test('a human neutral can refuse a received aid request, or explicitly end the pledge before dispatching aid',()=>{
 const s=fixture();s.player='egypt';const t=pact(s);s.world.strategicOffers=[{id:1,actor:'caesar',recipient:'egypt',target:'senate',kind:'request_aid',status:'awaiting_decision',phase:'at_court',remaining:6}];
 const cash=s.factions.egypt.treasury,food=s.factions.egypt.food;
 assert.deepEqual(answerStrategicOffer(s,1,'send_war_aid'),{ok:false,reason:'neutrality'});assert.equal(s.factions.egypt.treasury,cash);assert.equal(s.factions.egypt.food,food);
 assert.ok(terminateAgreement(s,t.id,'egypt').ok);assert.ok(answerStrategicOffer(s,1,'send_war_aid').ok);assert.equal(s.factions.egypt.treasury,cash-12);assert.equal(s.factions.egypt.food,food-8);
});

test('military obligations and current belligerency can prevent accepting neutrality, but a sender does not inspect hidden receiver commitments',()=>{
 for(const change of [s=>s.alliances.push(['egypt','senate']),s=>s.wars.push(['egypt','senate']),s=>{s.relations['egypt:senate']=60;assert.ok(proposeAgreement(s,'egypt','senate','guarantee').ok)}]){
  const s=fixture();change(s);assert.ok(sendAgreementProposal(s,'caesar','egypt','neutrality',{enemy:'senate'}).ok);step(s);step(s);assert.notEqual(s.world.agreementLetters[0].sealed.outcome,'accepted');assert.equal(s.agreements.filter(t=>t.type==='neutrality').length,0);
 }
 const invalid=fixture();assert.equal(sendAgreementProposal(invalid,'caesar','egypt','neutrality').ok,false);assert.equal(invalid.factions.caesar.treasury,300);
});

test('lost, refused, unanswered and obsolete proposals cannot impose neutrality or its treaty cost',()=>{
 const outcomes=new Set();
 for(let n=1;n<=80;n++){const s=fixture(n*1000003);sendAgreementProposal(s,'caesar','egypt','neutrality',{enemy:'senate'});for(let i=0;i<4;i++)step(s);outcomes.add(s.world.agreementLetters[0].status);if(s.world.agreementLetters[0].status!=='accepted'){assert.equal(s.agreements.length,0);assert.equal(s.factions.caesar.treasury,298)}}
 assert.ok(outcomes.has('accepted')&&outcomes.has('refused')&&outcomes.has('no_reply'));
 for(const change of [s=>{s.wars=[]},s=>{s.world.warGenerations||={};s.world.warGenerations['caesar:senate']=1}]){
  const s=fixture();sendAgreementProposal(s,'caesar','egypt','neutrality',{enemy:'senate'});step(s);step(s);change(s);step(s);step(s);assert.equal(s.world.agreementLetters[0].status,'lapsed');assert.equal(s.agreements.length,0);assert.equal(s.factions.caesar.treasury,298);
 }
});

test('incoming neutrality is an explicit human choice with a real confirmation, named terms and save compatibility',()=>{
 let success=false,loss=false;
 for(let n=1;n<=100&&(!success||!loss);n++){
  let s=fixture(n*1000003);s.player='egypt';sendAgreementProposal(s,'caesar','egypt','neutrality',{enemy:'senate'});step(s,{mail:true});step(s,{mail:true});
  const x=s.world.agreementLetters[0];if(x.phase!=='awaiting_player')continue;
  const letter=receivedMail(s).find(m=>m.context?.proposalId===x.id);assert.ok(letter);assert.match(letter.body[1],/12个月/);assert.match(letter.body[1],/元老院/);assert.equal(s.agreements.length,0);
  assert.ok(replyToLetter(s,letter.id,'accept_agreement',{answerAgreementProposal}).ok);s=upgradeSave(JSON.parse(JSON.stringify(s)));step(s,{mail:true});step(s,{mail:true});assert.equal(s.agreements.length,0);
  step(s,{mail:true});step(s,{mail:true});const saved=s.world.agreementLetters[0];if(saved.status==='accepted'){success=true;assert.equal(activeAgreement(s,'caesar','egypt','neutrality').terms.neutral,'egypt')}else{loss=true;assert.equal(s.agreements.length,0)}
 }
 assert.ok(success&&loss,'both successful and lost confirmations remain possible');
 const old=fixture();delete old.world.agreementLetters;const restored=upgradeSave(JSON.parse(JSON.stringify(old)));assert.equal(restored.agreements.filter(t=>t.type==='neutrality').length,0);
});

test('AI courts initiate named-war neutrality without a human decision, with different outcomes across seeds and with a passive Roman player',()=>{
 const evidence=[];
 for(const autoplayPlayer of [true,false]){
  let sent=0,formed=0;const outcomes=new Set();
  for(let n=1;n<=24;n++){
   const s=newGame('caesar');s.difficulty='expert';s.seed=(Math.imul(n,2654435761)^19049)>>>0;s.relations['egypt:senate']=n%2?15:60;s.wars.push(['egypt','parthia']);
   for(const id of ['caesar','senate','egypt','parthia','armenia'])Object.assign(s.factions[id],{treasury:600,food:800,stability:80});
   for(const a of s.armies.filter(a=>['caesar','senate'].includes(a.owner)))a.men=12000;
   observeDiplomacy(s);for(let m=0;m<24;m++)tick(s,{autoplayPlayer});
   const letters=(s.world.agreementLetters||[]).filter(x=>x.type==='neutrality'&&x.actor!==s.player&&x.target!==s.player);sent+=letters.length;
   formed+=s.agreements.filter(t=>t.type==='neutrality'&&!t.parties.includes(s.player)).length;outcomes.add(JSON.stringify(letters.map(x=>[x.actor,x.target,x.status])));
  }
  assert.ok(sent>0,'AI-to-AI proposals start without player input');assert.ok(formed>0,'some AI-to-AI proposals actually form treaties');assert.ok(outcomes.size>1);
  evidence.push({mode:autoplayPlayer?'all_ai':'passive_rome',sent,formed,outcomes:outcomes.size});
 }
 console.log('NEUTRALITY_AI_EVIDENCE '+JSON.stringify(evidence));
});

test('neutrality prevents automatic entry into a named front through a later guarantee',()=>{
 const s=fixture();pact(s);s.relations['armenia:egypt']=60;assert.ok(proposeAgreement(s,'egypt','armenia','guarantee').ok);
 assert.ok(diplomacy(s,'senate','armenia','war'));assert.equal(isWar(s,'egypt','senate'),false);
});

test('AI donors refuse new direct aid while the requester learns only after the return journey',()=>{
 let refusals=0;
 for(let n=1;n<=24;n++){
  const s=fixture(n*1000003);pact(s);observeDiplomacy(s);const cash=s.factions.egypt.treasury,food=s.factions.egypt.food;
  assert.ok(sendStrategicOffer(s,'caesar','egypt','senate',{kind:'request_aid'}).ok);
  for(let i=0;i<2;i++){if(++s.month>12){s.month=1;s.year++}advanceStrategicOffers(s)}
  const offer=s.world.strategicOffers[0];assert.equal(offer.status,'pending');assert.equal(s.factions.egypt.treasury,cash);assert.equal(s.factions.egypt.food,food);
  if(offer.sealed)assert.equal(offer.sealed.decision,'refused');
  for(let i=0;i<2;i++){if(++s.month>12){s.month=1;s.year++}advanceStrategicOffers(s)}
  assert.ok(['refused','no_reply'].includes(offer.status));if(offer.status==='refused')refusals++;
 }
 assert.ok(refusals>0);
});

test('a newly formed pledge does not erase supplies already paid for and dispatched before it',()=>{
 let delivered=false;
 for(let n=1;n<=80&&!delivered;n++){
  const s=fixture(n*1000003);assert.ok(proposeAgreement(s,'caesar','egypt','trade').ok);observeDiplomacy(s);
  assert.ok(sendStrategicOffer(s,'caesar','egypt','senate',{kind:'request_aid'}).ok);
  for(let i=0;i<2;i++){if(++s.month>12){s.month=1;s.year++}advanceStrategicOffers(s)}
  if(s.world.strategicOffers[0].sealed?.decision!=='accepted')continue;
  pact(s);const before=s.factions.caesar.treasury;
  for(let i=0;i<2;i++){if(++s.month>12){s.month=1;s.year++}advanceStrategicOffers(s)}
  if(s.world.strategicOffers[0].status==='accepted'){delivered=true;assert.equal(s.factions.caesar.treasury,before+12)}
 }
 assert.ok(delivered);
});
