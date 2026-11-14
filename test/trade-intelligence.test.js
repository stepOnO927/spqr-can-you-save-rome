import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=coalition-courier-1';
import {proposeAgreement,terminateAgreement} from '../agreements.js?v=grand-chessboard-2';
import {addReport,queueMission,advanceOperations,intelligencePartners,intelligencePartnerAccess} from '../character-system.js?v=portraits-hundred-days-1';

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

test('the trading court is more willing to share with a trusted partner without guaranteeing a reply',()=>{
 let friendly=0,hostile=0;for(let i=0;i<100;i++)for(const relation of [-50,80]){
  const s=setup(i*7727+201);s.relations['caesar:parthia']=relation;assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','ptolemy').ok);advance(s,3);
  if(s.operations[0].status==='complete'){if(relation>0)friendly++;else hostile++}
 }
 assert.ok(friendly>hostile,`${friendly} versus ${hostile}`);assert.ok(friendly<100,'success must not be automatic');
});
