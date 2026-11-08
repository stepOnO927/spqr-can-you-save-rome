import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,estimatedStrength,sendInquiry,upgradeSave} from '../engine.js?v=multipolar-2';
import {assessOpportunities} from '../multipolar.js?v=multipolar-2';
import {observeDiplomacy,reportedDiplomacy} from '../diplomatic-knowledge.js?v=multipolar-2';
import {observeAttackPattern} from '../strategic-planning.js?v=multipolar-2';
import {buildChessboard} from '../chessboard.js?v=multipolar-2';
import {renderChessboard} from '../chessboard-ui.js?v=multipolar-2';
import {addReport,supportClaimant,requestAgentRelease,advanceAgentRequests} from '../character-system.js?v=multipolar-2';
import {advanceAgreements,proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceGovernments} from '../governance.js?v=multipolar-2';
import {advanceMovements} from '../movements.js?v=multipolar-2';
import {newRevolutionScenario} from '../scenarios.js?v=multipolar-2';

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
