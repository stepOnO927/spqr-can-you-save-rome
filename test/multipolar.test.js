import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,tick,estimatedStrength,sendInquiry,upgradeSave,issueMilitaryOrder} from '../engine.js?v=faces-empire-2';
import {advanceStrategicWarnings,warningCandidates} from '../strategic-warnings.js?v=multipolar-2';
import {warningLedger} from '../warning-ledger.js?v=warning-privacy-1';
import {assessOpportunities} from '../multipolar.js?v=multipolar-2';
import {observeDiplomacy,reportedDiplomacy} from '../diplomatic-knowledge.js?v=multipolar-2';
import {observeAttackPattern} from '../strategic-planning.js?v=multipolar-2';
import {buildChessboard} from '../chessboard.js?v=faces-empire-2';
import {renderChessboard} from '../chessboard-ui.js?v=faces-empire-2';
import {addReport,supportClaimant,requestAgentRelease,advanceAgentRequests} from '../character-system.js?v=faces-empire-2';
import {advanceAgreements,proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceGovernments} from '../governance.js?v=faces-empire-2';
import {advanceMovements} from '../movements.js?v=faces-empire-2';
import {newRevolutionScenario} from '../scenarios.js?v=faces-empire-2';

test('opportunities use the observer’s reports, not hidden military or political state',()=>{
 const s=newGame('caesar'),other=JSON.parse(JSON.stringify(s));
 for(const army of other.armies.filter(a=>a.owner==='armenia')){army.men=999999;army.region='egypt'}
 other.factions.armenia.stability=0;other.factions.armenia.treasury=-100;other.wars.push(['armenia','egypt']);
 assert.deepEqual(assessOpportunities(s,'parthia',estimatedStrength),assessOpportunities(other,'parthia',estimatedStrength));
 const unknown=assessOpportunities(s,'parthia',estimatedStrength).find(x=>x.target==='armenia');assert.equal(unknown.instability,'unknown');assert.equal(unknown.knownWars,0);
});

test('a court weighs its own trade commitments without learning secret foreign agreements',()=>{
 const s=newGame('caesar');s.relations['armenia:parthia']=40;
 const before=assessOpportunities(s,'parthia',estimatedStrength).find(x=>x.target==='armenia');
 assert.ok(proposeAgreement(s,'parthia','armenia','trade').ok);
 const after=assessOpportunities(s,'parthia',estimatedStrength).find(x=>x.target==='armenia');assert.ok(after.commitments.includes('trade'));assert.ok(after.score<before.score);
 const copy=JSON.parse(JSON.stringify(s));copy.agreements.push({id:'hidden',type:'defensive',parties:['armenia','egypt'],secret:true,status:'active',expiresAt:s.year*12+s.month+24});
 assert.deepEqual(assessOpportunities(copy,'parthia',estimatedStrength),assessOpportunities(s,'parthia',estimatedStrength));
});

test('a documented diplomatic partner is reviewed even without a reported shared frontier',()=>{
 const s=newGame('caesar');s.relations['bosporus:egypt']=40;assert.ok(proposeAgreement(s,'egypt','bosporus','trade').ok);observeDiplomacy(s);
 const partner=assessOpportunities(s,'egypt',estimatedStrength).find(x=>x.target==='bosporus');assert.ok(partner);assert.equal(partner.border,false);assert.ok(partner.commitments.includes('trade'));
});

test('a public war is learned only through contact and enters the player network as a dated report',()=>{
 const s=newGame('caesar');s.wars.push(['armenia','parthia']);observeDiplomacy(s);
 assert.ok(!reportedDiplomacy(s,'caesar').some(r=>r.kind==='war'&&r.parties.includes('armenia')));
 assert.ok(reportedDiplomacy(s,'armenia').some(r=>r.kind==='war'&&r.parties.includes('parthia')));
 s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);
 const war=reportedDiplomacy(s,'caesar').find(r=>r.kind==='war'&&r.parties.includes('armenia'));assert.ok(war);
 const board=buildChessboard(s,'caesar');assert.ok(board.links.some(x=>x.kind==='war'&&x.certainty==='reported'&&[x.from,x.to].includes('f:armenia')&&[x.from,x.to].includes('f:parthia')));
 assert.ok(s.log.some(x=>x.en.includes('Frontier reports a war')));
 s.regions.find(r=>r.id==='anatolia').owner='senate';s.wars=s.wars.filter(w=>!w.includes('armenia'));s.month++;observeDiplomacy(s);
 assert.equal(reportedDiplomacy(s,'caesar').find(r=>r.id===war.id).status,'active');
 assert.ok(!s.log.some(x=>x.en.includes('war between')&&x.en.includes('has ended')));
 s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);assert.equal(reportedDiplomacy(s,'caesar').find(r=>r.id===war.id).status,'ended');assert.ok(s.log.some(x=>x.en.includes('war between')&&x.en.includes('has ended')));
});

test('the power-network view exposes reported connections without private plans or actual troop counts',()=>{
 const s=newGame('caesar');s.world.multipolarPlans={parthia:{secret:'HIDDEN_AI_GOAL'}};s.knowledge.caesar.parthia.sightings={known:{id:'known',region:'parthia',year:s.year,month:s.month}};
 const before=renderChessboard(s,'zh','f:parthia','power');assert.match(before,/多国势力网络/);assert.match(before,/当前位置及兵力未知/);assert.doesNotMatch(before,/HIDDEN_AI_GOAL|data-board-node="p:/);
 for(const army of s.armies.filter(a=>a.owner==='parthia'))army.men=999999;assert.equal(renderChessboard(s,'zh','f:parthia','power'),before);
});

test('military adaptation remembers battles between AI factions without reading unseen battles',()=>{
 const s=newGame('caesar');s.battles=[{id:'x',year:s.year,month:s.month,region:'armenia',attacker:{owner:'parthia'},defender:{owner:'armenia'}},{id:'y',year:s.year,month:s.month,region:'armenia',attacker:{owner:'parthia'},defender:{owner:'armenia'}},{id:'hidden',year:s.year,month:s.month,region:'egypt',attacker:{owner:'parthia'},defender:{owner:'egypt'}}];
 assert.equal(observeAttackPattern(s,'armenia'),'armenia');assert.deepEqual(s.world.aiAdaptation.armenia.attacks.map(x=>x.opponent),['parthia','parthia']);
});

test('observed third-party wars create an opportunity without forcing an attack',()=>{
 function trial(seed){const s=newGame('caesar');s.difficulty='expert';s.seed=seed;s.relations['armenia:parthia']=-50;s.wars.push(['armenia','egypt'],['armenia','senate']);
  s.world.strategicPersonalities={parthia:{leader:'orodes',personality:'conqueror'}};s.factions.parthia.food=100;s.factions.parthia.treasury=100;s.factions.parthia.stability=80;
  for(const army of s.armies.filter(a=>a.owner==='parthia'))army.men=15000;observeDiplomacy(s);tick(s);return s}
 const outcomes=Array.from({length:30},(_,seed)=>trial(seed*100000+10));
 assert.ok(outcomes.some(s=>s.world.multipolarPlans.parthia.opportunities.some(x=>x.target==='armenia'&&x.knownWars>=2)));
 assert.ok(outcomes.some(s=>s.world.multipolarPlans.parthia.lastAction?.kind==='opportunistic_war'));
 assert.ok(outcomes.some(s=>!s.world.multipolarPlans.parthia.lastAction));
});

test('a prepared court may breach a treaty for a reported opportunity, with real reputation costs',()=>{
 function trial(seed){const s=newGame('caesar');s.difficulty='expert';s.seed=seed;s.relations['armenia:parthia']=40;
  assert.ok(proposeAgreement(s,'parthia','armenia','non_aggression').ok);s.relations['armenia:parthia']=-50;s.wars.push(['armenia','egypt'],['armenia','senate']);
  s.world.strategicPersonalities={parthia:{leader:'orodes',personality:'conqueror'}};s.factions.parthia.food=100;s.factions.parthia.treasury=100;s.factions.parthia.stability=80;
  for(const army of s.armies.filter(a=>a.owner==='parthia'))army.men=15000;observeDiplomacy(s);tick(s);return s}
 const outcomes=Array.from({length:40},(_,seed)=>trial(seed*100000+10)),breach=outcomes.find(s=>s.world.multipolarPlans.parthia.lastAction?.kind==='treaty_breach');
 assert.ok(breach);assert.ok(breach.agreements.some(a=>a.type==='non_aggression'&&a.status==='breached'));assert.ok(breach.diplomaticCredibility.parthia<100);
 assert.ok(outcomes.some(s=>s.agreements.some(a=>a.type==='non_aggression'&&a.status==='active')));
});

test('AI-only simulation reviews multiple states and preserves private plans on old-save migration',()=>{
 let s=newGame('caesar');s.difficulty='expert';delete s.world.multipolarPlans;
 for(let i=0;i<4;i++)tick(s,{autoplayPlayer:true});
 for(const actor of ['caesar','senate','egypt','parthia','armenia'])assert.ok(s.world.multipolarPlans[actor]);
 const plans=JSON.parse(JSON.stringify(s.world.multipolarPlans));s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.world.multipolarPlans,plans);
 assert.ok(Object.values(plans).every(p=>p.opportunities.length<=8));
});

test('peace addressed to the automated side is answered by AI, while a human still decides',()=>{
 function trial(autoplayPlayer){const s=newGame('caesar');assert.ok(sendInquiry(s,'senate','caesar','peace').ok);s.seed=1000;tick(s,{autoplayPlayer});return s.inquiries.find(x=>x.actor==='senate'&&x.subject==='peace')}
 assert.equal(trial(false).status,'awaiting_decision');assert.notEqual(trial(true).status,'awaiting_decision');
});

test('an already delivered peace request does not stall an AI-only run',()=>{
 const s=newGame('caesar');s.inquiries=[{actor:'senate',target:'caesar',subject:'peace',status:'awaiting_decision',phase:'at_court',remaining:6,duration:2}];
 tick(s,{autoplayPlayer:true});assert.equal(s.inquiries[0].phase,'return');assert.equal(s.inquiries[0].status,'pending');assert.ok(s.inquiries[0].sealed);
});

test('automated Rome can handle succession and domestic unrest without overriding a human',()=>{
 const base=newRevolutionScenario('caesar');base.month=1;for(let i=0;i<3;i++){base.month++;advanceMovements(base)}
 const m=base.world.movements.find(x=>x.parent==='caesar');assert.ok(m);m.supporters=Math.ceil(base.regions.find(r=>r.id===m.region).population.total*.1);base.month=6;base.world.characters.caesar.health='frail';
 const human=upgradeSave(JSON.parse(JSON.stringify(base))),automated=upgradeSave(JSON.parse(JSON.stringify(base)));
 advanceMovements(human);advanceGovernments(human);advanceMovements(automated,{autoplayPlayer:true});advanceGovernments(automated,{autoplayPlayer:true});
 assert.notEqual(human.world.movements.find(x=>x.id===m.id).outcome,'reform');assert.equal(automated.world.movements.find(x=>x.id===m.id).outcome,'reform');
 assert.equal(human.world.successionPlans.caesar,undefined);assert.ok(automated.world.successionPlans.caesar);
});

test('non-Roman courts can offer support to reported claimants and exchange captive requests independently',()=>{
 const s=newGame('caesar');addReport(s,'armenia','parthia',{kind:'claimants',leaders:['pacorus'],source:'spy'});
 const before=s.factions.armenia.treasury;assert.ok(supportClaimant(s,'armenia','parthia','pacorus').ok);assert.equal(s.factions.armenia.treasury,before-10);
 s.world.captives.push({id:'ai-agent',owner:'armenia',holder:'egypt',state:'held'});const funds=s.factions.armenia.treasury;
 assert.ok(requestAgentRelease(s,'armenia','ai-agent').ok);assert.equal(s.factions.armenia.treasury,funds-8);
 for(let i=0;i<4;i++)advanceAgentRequests(s);assert.notEqual(s.releaseRequests[0].status,'awaiting_decision');
});

test('AI courts can negotiate real aid based on a reported third-party war',()=>{
 const s=newGame('caesar');s.difficulty='expert';s.month=3;s.relations['armenia:parthia']=40;s.wars.push(['armenia','senate']);
 s.factions.parthia.food=100;s.factions.parthia.treasury=100;observeDiplomacy(s);tick(s);
 const aid=s.agreements.find(x=>x.type==='military_support'&&x.parties.includes('parthia')&&x.parties.includes('armenia'));
 assert.ok(aid);assert.equal(aid.terms.provider,'parthia');assert.equal(aid.terms.recipient,'armenia');
 const before=s.factions.armenia.food;s.month=6;advanceAgreements(s);assert.equal(s.factions.armenia.food,before+2);
});

// Scout-based allied warnings. Setup: the Senate is at war with Caesar and is
// friendly with Numidia; the Senate's own scouts report a Caesarian force in
// Africa, next to Numidia. Letter delivery reuses the existing courier times.
function warningSetup(seed=4242){
 const s=newGame('caesar');s.seed=seed;s.relations['numidia:senate']=40;assert.ok(proposeAgreement(s,'senate','numidia','defensive').ok);
 s.knowledge.senate.caesar.sightings={xiii:{id:'xiii',name:['Legio XIII','第十三军团'],owner:'caesar',region:'africa',year:s.year,month:s.month,commanderId:null,strengthBand:[5000,10000]}};
 return s;
}
const warnOptions=(extra={})=>({letterMonths:{numidia:3,senate:2,caesar:2,egypt:4},issueOrder:issueMilitaryOrder,log:()=>{},...extra});
function sendFirst(seedFrom=1){for(let seed=seedFrom;seed<seedFrom+400;seed++){const s=warningSetup(seed);advanceStrategicWarnings(s,warnOptions());if(s.warningLetters.length)return s}throw Error('no warning sent')}

test('a warning is composed only from the sender’s own fresh sighting, never from hidden foreign state',()=>{
 const s=warningSetup(),copy=JSON.parse(JSON.stringify(s));
 for(const a of copy.armies.filter(x=>x.owner==='caesar')){a.men=999999;a.region='numidia'}
 copy.factions.caesar.treasury=-500;copy.world.multipolarPlans={caesar:{secret:'HIDDEN_AI_GOAL'}};copy.world.strategicPlans={caesar:{goal:'HIDDEN'}};
 assert.deepEqual(warningCandidates(copy,'senate'),warningCandidates(s,'senate'));
 const c=warningCandidates(s,'senate')[0];assert.equal(c.partner,'numidia');assert.equal(c.threat,'caesar');assert.equal(c.near,'numidia');assert.equal(c.sighting.region,'africa');assert.deepEqual(c.sighting.strengthBand,[5000,10000]);
 assert.doesNotMatch(JSON.stringify(warningCandidates(copy,'senate')),/HIDDEN|999999/);
});

test('no scout report means no warning and no inferred empty garrison',()=>{
 const s=warningSetup();s.knowledge.senate.caesar.sightings={};const before=JSON.parse(JSON.stringify(s.knowledge.numidia));
 for(let i=0;i<6;i++){advanceStrategicWarnings(s,warnOptions());s.month++}
 assert.equal(s.warningLetters.length,0);assert.deepEqual(s.knowledge.numidia,before);
 const stale=warningSetup();stale.knowledge.senate.caesar.sightings.xiii.month-=3;assert.equal(warningCandidates(stale,'senate').length,0);
});

test('warning letters travel with the existing one-way courier delay and may be delayed, lost or expire',()=>{
 const s=sendFirst(),l=s.warningLetters[0];assert.equal(l.duration,2);assert.equal(l.status,'sent');assert.equal(l.from,'senate');assert.equal(l.to,'numidia');
 const statuses=new Set();
 for(let seed=1;seed<=300;seed++){const t=warningSetup(seed);advanceStrategicWarnings(t,warnOptions());if(!t.warningLetters.length)continue;for(let m=0;m<4;m++){t.month++;t.seed=(t.seed+seed*977)>>>0;advanceStrategicWarnings(t,warnOptions())}for(const h of t.warningLetters[0].history)statuses.add(h.status)}
 for(const x of ['sent','delayed','lost','responded','unresponded'])assert.ok(statuses.has(x),`missing ${x}`);
 const war=sendFirst(7);war.wars.push(['numidia','senate']);war.month++;advanceStrategicWarnings(war,warnOptions());assert.equal(war.warningLetters[0].status,'expired');
 const old=sendFirst(9);old.warningLetters[0].sighting.year-=1;old.warningLetters[0].remaining=1;old.warningLetters[0].wasDelayed=true;old.month++;
 for(let i=0;i<3&&['sent','delayed'].includes(old.warningLetters[0].status);i++)advanceStrategicWarnings(old,warnOptions());
 if(old.warningLetters[0].status!=='lost')assert.equal(old.warningLetters[0].history.at(-1).reason,'stale');
});

test('the recipient decides independently; a warning never declares war or forces an agreement',()=>{
 const decisions=new Set();
 for(let seed=1;seed<=300;seed++){
  const s=warningSetup(seed);advanceStrategicWarnings(s,warnOptions());if(!s.warningLetters.length)continue;
  const wars=JSON.stringify(s.wars),agreements=s.agreements.length,alliances=JSON.stringify(s.alliances);
  for(let m=0;m<4;m++){s.month++;advanceStrategicWarnings(s,warnOptions())}
  assert.equal(JSON.stringify(s.wars),wars);assert.equal(s.agreements.length,agreements);assert.equal(JSON.stringify(s.alliances),alliances);
  if(s.warningLetters[0].decision)decisions.add(s.warningLetters[0].decision.kind);
 }
 assert.ok(decisions.has('heeded'));assert.ok(decisions.has('noted'));
 const s=sendFirst();s.relations['numidia:senate']=-60;s.warningLetters[0].remaining=1;s.warningLetters[0].wasDelayed=true;s.month++;
 for(let seed=0;seed<50&&!s.warningLetters[0].decision;seed++){const t=JSON.parse(JSON.stringify(s));t.seed=seed;advanceStrategicWarnings(t,warnOptions());if(t.warningLetters[0].decision){assert.equal(t.warningLetters[0].decision.kind,'dismissed');break}}
});

test('a delivered warning is second-hand dated evidence and never replaces a newer first-hand sighting',()=>{
 for(let seed=1;seed<=200;seed++){const s=warningSetup(seed);advanceStrategicWarnings(s,warnOptions());if(!s.warningLetters.length)continue;
  for(let m=0;m<4&&['sent','delayed'].includes(s.warningLetters[0].status);m++){s.month++;advanceStrategicWarnings(s,warnOptions())}
  if(!['responded','unresponded'].includes(s.warningLetters[0].status))continue;
  const x=s.knowledge.numidia.caesar.sightings.xiii;assert.equal(x.source,'ally_warning');assert.equal(x.via,'senate');assert.deepEqual(x.strengthBand,[5000,10000]);
  const fresh=warningSetup(seed);advanceStrategicWarnings(fresh,warnOptions());fresh.knowledge.numidia.caesar.sightings={xiii:{id:'xiii',owner:'caesar',region:'numidia',year:fresh.year,month:fresh.month+3,strengthBand:[3000,6000]}};
  for(let m=0;m<4;m++){fresh.month++;advanceStrategicWarnings(fresh,warnOptions())}
  assert.equal(fresh.knowledge.numidia.caesar.sightings.xiii.region,'numidia');return;
 }
 assert.fail('no delivered warning in sample');
});

test('a human recipient is informed bilingually and keeps the decision; automated Rome decides for itself',()=>{
 function run(autoplayPlayer){
  for(let seed=1;seed<=300;seed++){const s=newGame('caesar');s.seed=seed;s.relations['caesar:mauretania']=40;s.wars.push(['mauretania','senate']);
   s.knowledge.mauretania.senate.sightings={x:{id:'x',owner:'senate',region:'italiaN',year:s.year,month:s.month,strengthBand:[6000,12000]}};
   s.regions.find(r=>r.id==='narbo').owner='caesar';const logs=[];
   advanceStrategicWarnings(s,{letterMonths:{caesar:2},issueOrder:issueMilitaryOrder,log:(_,en,zh)=>logs.push([en,zh]),autoplayPlayer});
   const l=s.warningLetters.find(x=>x.to==='caesar');if(!l)continue;
   for(let m=0;m<3&&['sent','delayed'].includes(l.status);m++){s.month++;advanceStrategicWarnings(s,{letterMonths:{caesar:2},issueOrder:issueMilitaryOrder,log:(_,en,zh)=>logs.push([en,zh]),autoplayPlayer})}
   if(['responded','unresponded'].includes(l.status))return {l,logs};
  }
  assert.fail('no delivered warning to Rome');
 }
 const human=run(false);assert.equal(human.l.decision.kind,'player_discretion');assert.equal(human.l.status,'unresponded');
 const [en,zh]=human.logs.at(-1);assert.match(en,/forwarded report; it says nothing about other frontiers/);assert.match(zh,/预警/);assert.match(zh,/不说明其他边境/);
 const auto=run(true);assert.notEqual(auto.l.decision.kind,'player_discretion');
});

test('warnings remain private until delivery and transport outcomes stay private from the sender',()=>{
 const s=sendFirst(),letter=s.warningLetters[0];assert.equal(warningLedger(s,'caesar').length,0);
 const initial=warningLedger(s,'senate');assert.equal(initial.length,1);assert.ok(!('decision' in initial[0]));
 assert.deepEqual(warningLedger(s,'numidia'),[]);
 s.player='numidia';assert.doesNotMatch(renderChessboard(s,'zh',null,'power'),/5000–10000/);
 for(const status of ['delayed','lost','expired']){
  letter.status=status;letter.history.push({status,year:s.year,month:s.month+1});
  assert.deepEqual(warningLedger(s,'numidia'),[]);assert.deepEqual(warningLedger(s,'senate'),initial);
 }
 letter.status='responded';letter.deliveredYear=s.year;letter.deliveredMonth=s.month+2;letter.decision={kind:'heeded'};
 letter.history.push({status:'responded',year:letter.deliveredYear,month:letter.deliveredMonth});
 assert.deepEqual(warningLedger(s,'senate'),initial);
 const received=warningLedger(s,'numidia');assert.equal(received.length,1);assert.equal(received[0].decision,'heeded');assert.deepEqual(received[0].history,[letter.history.at(-1)]);
 const zh=renderChessboard(s,'zh',null,'power'),en=renderChessboard(s,'en',null,'power');
 assert.match(zh,/收到的盟友预警/);assert.match(zh,/5000–10000/);assert.match(en,/Forwarded scout report/);
 assert.equal(warningLedger(s,'caesar').length,0);
 assert.doesNotMatch(renderChessboard(s,'zh','f:senate','power'),/warning:/);
});

test('old saves without a warning queue keep working and do not duplicate existing multipolar decisions',()=>{
 const s=newGame('caesar');s.difficulty='expert';delete s.warningLetters;const save=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(save.warningLetters,undefined);
 for(let i=0;i<3;i++)tick(save,{autoplayPlayer:true});assert.ok(Array.isArray(save.warningLetters));
 // The warning layer reuses courier, report and memory helpers; it does not call
 // the existing war, breach, aid or claimant-support decision paths.
 const source=fs.readFileSync(new URL('../strategic-warnings.js?v=fort-intel-1',import.meta.url),'utf8');
 assert.doesNotMatch(source,/diplomacy\(|proposeAgreement|terminateAgreement|supportClaimant|wars\.push|alliances\.push|opportunistic_war|treaty_breach/);
});
