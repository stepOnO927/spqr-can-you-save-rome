import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=commander-name-snapshot-1';
import {proposeAgreement,terminateAgreement} from '../agreements.js?v=agreement-courier-1';
import {addReport,queueMission,advanceOperations,intelligencePartners,intelligencePartnerAccess,reportEvidence,refreshReportConfidence} from '../character-system.js?v=commander-name-snapshot-1';

function setup(seed){const s=newGame('caesar');s.world.intelSeed=seed;s.relations['caesar:parthia']=40;assert.ok(proposeAgreement(s,'caesar','parthia','trade').ok);addReport(s,'parthia','egypt',{kind:'health',character:'ptolemy',value:'ill',source:'spy',confidence:'unverified'});return s}
function advance(s,n){for(let i=0;i<n;i++){s.month++;advanceOperations(s)}}

test('active trade opens a request, while expiry, war or termination removes the option',()=>{
 const s=setup(1000);assert.equal(intelligencePartnerAccess(s,'caesar','parthia'),'trade');assert.ok(intelligencePartners(s,'caesar','egypt').includes('parthia'));assert.ok(!intelligencePartners(s,'caesar','parthia').includes('parthia'));
 const t=s.agreements.find(x=>x.type==='trade');assert.ok(terminateAgreement(s,t.id,'caesar',{mutual:true}).ok);assert.equal(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').reason,'alliance');
 const expired=setup(1000);expired.month+=37;assert.equal(intelligencePartnerAccess(expired,'caesar','parthia'),null);
 const war=setup(1000);war.wars.push(['caesar','parthia']);assert.equal(intelligencePartnerAccess(war,'caesar','parthia'),null);
});

test('trade exchanges have delayed and independently chosen outcomes, and save safely in transit',()=>{
 const outcomes=new Set();for(let i=0;i<100;i++){
  let s=setup(i*99991+3);const cost=s.factions.caesar.treasury;assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').ok);assert.equal(s.factions.caesar.treasury,cost-6);
  advance(s,2);let op=s.operations[0];assert.equal(op.status,'pending');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));advance(s,1);op=s.operations[0];outcomes.add(op.status);
  if(op.status==='complete'){const r=s.knowledge.caesar.egypt.reports[0];assert.equal(r.value,'ill');assert.equal(r.originSource,'spy');assert.equal(r.fromFaction,'parthia');assert.equal(r.observationMonth,1)}
  else assert.equal(s.knowledge.caesar.egypt.reports.length,0);
  if(op.status==='declined')assert.match(s.log[0].zh,/拒绝了情报请求/);
 }
 for(const outcome of ['complete','failed','declined'])assert.ok(outcomes.has(outcome),`missing ${outcome}`);
});

test('a trading court cannot forward information it never possessed',()=>{
 const s=setup(1000);s.knowledge.parthia.egypt.reports=[];assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').ok);advance(s,3);assert.ok(['failed','declined'].includes(s.operations[0].status));assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});

test('a partner forwards its freshest delivered observation, sealed when the request arrives',()=>{
 let completed=0;
 for(let i=0;i<40;i++){
  let s=setup(i*99991+31);s.alliances.push(['caesar','parthia']);s.month=4;
  addReport(s,'parthia','egypt',{kind:'health',character:'ptolemy',value:'recovering',source:'spy',confidence:'unverified'});
  s.month=5;
  addReport(s,'parthia','egypt',{kind:'health',character:'ptolemy',value:'healthy',source:'exchange',originSource:'court',observationYear:-49,observationMonth:2,confidence:'unverified'});
  // Neither a different subject nor an undelivered future report is eligible.
  s.knowledge.parthia.egypt.reports.unshift({kind:'health',character:'cleopatra',value:'ill',source:'spy',year:-49,month:5},{kind:'health',character:'ptolemy',value:'dying',source:'spy',year:-49,month:9});
  assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').ok);
  advance(s,2);assert.equal(s.operations[0].status,'pending');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
  // A report acquired after the reply was sealed cannot alter the letter in transit.
  addReport(s,'parthia','egypt',{kind:'health',character:'ptolemy',value:'ill',source:'spy',confidence:'unverified'});
  s=upgradeSave(JSON.parse(JSON.stringify(s)));advance(s,1);
  if(s.operations[0].status==='complete'){
   completed++;const r=s.knowledge.caesar.egypt.reports[0];
   assert.equal(r.value,'recovering');assert.equal(r.observationMonth,4);assert.equal(r.originSource,'spy');
  }else assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 }
 assert.ok(completed>0,'a seeded response must arrive');
});

test('forwarding an undated legacy record never fabricates its observation date',()=>{
 let completed=0;
 for(let i=0;i<40;i++){
  let s=setup(i*99991+53);s.alliances.push(['caesar','parthia']);
  s.knowledge.parthia.egypt.reports=[{kind:'health',character:'ptolemy',value:'ill',source:'spy',confidence:'confirmed',verified:true}];
  assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').ok);advance(s,2);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));advance(s,1);
  if(s.operations[0].status!=='complete')continue;
  completed++;let r=s.knowledge.caesar.egypt.reports[0];
  assert.equal(r.value,'ill');assert.equal(r.observationUndated,true);
  assert.equal(r.year,undefined);assert.equal(r.month,undefined);
  assert.equal(r.observationYear,undefined);assert.equal(r.observationMonth,undefined);
  assert.equal(r.receivedYear,-49);assert.equal(r.receivedMonth,4);
  assert.equal(r.confidence,'unverified');assert.equal(r.verified,false);
  assert.equal(reportEvidence(s,'caesar','egypt',r).unavailable,true);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));refreshReportConfidence(s);r=s.knowledge.caesar.egypt.reports[0];
  assert.equal(r.year,undefined);assert.equal(r.receivedMonth,4);assert.equal(r.verified,false);
 }
 assert.ok(completed>0,'a seeded response must arrive');
});

test('an undated roster is a lead rather than a current or independently verified ruler',()=>{
 const s=newGame('caesar');s.knowledge.caesar.egypt.reportedLeaders=[];
 const r=addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra'],source:'exchange',originSource:'spy',observationUndated:true,confidence:'unverified'});
 refreshReportConfidence(s);
 assert.deepEqual(s.knowledge.caesar.egypt.reportedLeaders,[]);
 assert.equal(r.verified,false);assert.equal(reportEvidence(s,'caesar','egypt',r).unavailable,true);
});

test('the trading court is more willing to share with a trusted partner without guaranteeing a reply',()=>{
 let friendly=0,hostile=0;for(let i=0;i<100;i++)for(const relation of [-50,80]){
  const s=setup(i*7727+201);s.relations['caesar:parthia']=relation;assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').ok);advance(s,3);
  if(s.operations[0].status==='complete'){if(relation>0)friendly++;else hostile++}
 }
 assert.ok(friendly>hostile,`${friendly} versus ${hostile}`);assert.ok(friendly<100,'success must not be automatic');
});
