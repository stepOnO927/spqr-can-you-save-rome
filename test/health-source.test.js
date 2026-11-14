import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=cursus-portraits-1';
import {queueMission,advanceOperations} from '../character-system.js?v=cursus-portraits-1';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function investigate(health,q,type='travelers',change=()=>{}){
 let s=newGame('caesar');s.world.characters.cleopatra.health=health;change(s);
 const mission=queueMission(s,'caesar','egypt',type,'health',null,'cleopatra');assert.equal(mission.ok,true);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(q,q+.01);for(let i=0;i<mission.duration;i++)advanceOperations(s);return s;
}
test('travelers report limited rumors instead of a precise private medical state',()=>{
 for(const health of ['ill','seriously_ill','dying']){const s=investigate(health,.9),r=s.knowledge.caesar.egypt.reports[0];assert.equal(r.value,'ill');assert.equal(r.confidence,'rumor');assert.equal(r.reliability,'low');assert.equal(r.verified,false);assert.equal(s.knowledge.senate.egypt.reports.length,0)}
 assert.equal(investigate('dying',.7).knowledge.caesar.egypt.reports[0].value,'unknown');
 assert.equal(investigate('dying',.9,'spy').knowledge.caesar.egypt.reports[0].value,'dying');
});
test('travelers may observe a wound locally, hear misleading propaganda, or have no information',()=>{
 assert.equal(investigate('wounded',.7).knowledge.caesar.egypt.reports[0].value,'wounded');
 assert.equal(investigate('wounded',.7,'travelers',s=>{s.world.characters.cleopatra.location='parthia'}).knowledge.caesar.egypt.reports[0].value,'unknown');
 assert.equal(investigate('dying',.4,'travelers',s=>{s.world.claimants.egypt=['ptolemy']}).knowledge.caesar.egypt.reports[0].value,'healthy');
 assert.equal(investigate('healthy',.5,'travelers',s=>{s.world.claimants.egypt=['ptolemy']}).knowledge.caesar.egypt.reports[0].value,'ill');
});

test('foreign health cannot be read remotely when the subject has left, is traveling, marching or missing',()=>{
 const cases=[s=>{s.world.characters.cleopatra.location='parthia'},s=>{s.world.characters.cleopatra.travel={destination:'parthia',legs:[],remaining:2}},s=>{s.armies.push({id:'royal-moving',owner:'egypt',region:'egypt',men:1000,characterId:'cleopatra',move:{to:'egyptUpper',remaining:2}})},s=>{s.world.characters.cleopatra.missing={origin:'egypt',remaining:2}}];
 for(const change of cases)for(const type of ['spy','travelers'])for(const health of ['healthy','dying'])for(const q of [.4,.9]){const s=investigate(health,q,type,change),report=s.knowledge.caesar.egypt.reports[0];assert.equal(report.value,'unknown',type+' '+health);assert.equal(report.verified,false);assert.equal(s.knowledge.senate.egypt.reports.length,0)}
});
test('a death at the court can be learned only through a delayed and fallible report',()=>{
 for(const type of ['spy','travelers','envoy']){
  let s=newGame('caesar');s.world.characters.cleopatra.alive=false;s.world.characters.cleopatra.health='deceased';const mission=queueMission(s,'caesar','egypt',type,'health',null,'cleopatra');assert.equal(mission.ok,true);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(.9,.91);
  for(let i=0;i<mission.duration-1;i++)advanceOperations(s);assert.equal(s.knowledge.caesar.egypt.reports.length,0);advanceOperations(s);const r=s.knowledge.caesar.egypt.reports[0];assert.equal(r.value,'deceased');assert.equal(r.character,'cleopatra');assert.equal(r.source,type);assert.equal(r.verified,false);assert.equal(s.knowledge.senate.egypt.reports.length,0);assert.deepEqual(s.knowledge.caesar.egypt.reportedLeaders,['cleopatra','ptolemy']);
 }
 assert.equal(investigate('deceased',.5,'spy',s=>{s.world.characters.cleopatra.alive=false}).knowledge.caesar.egypt.reports[0].value,'unknown');
});
test('an investigator cannot disclose a death at an unknown or inaccessible location',()=>{
 for(const change of [c=>{c.location='parthia'},c=>{c.location=null},c=>{c.missing={origin:'egypt',remaining:2}},c=>{c.travel={destination:'parthia',legs:[],remaining:2}}])for(const type of ['spy','travelers']){
  const s=investigate('deceased',.9,type,s=>{const c=s.world.characters.cleopatra;c.alive=false;change(c)});assert.equal(s.knowledge.caesar.egypt.reports[0].value,'unknown');assert.equal(s.knowledge.senate.egypt.reports.length,0);
 }
});
test('conflicting death and court propaganda reports remain inspectable',()=>{
 const s=newGame('caesar'),c=s.world.characters.cleopatra;c.alive=false;c.health='deceased';s.world.claimants.egypt=['ptolemy'];
 const spy=queueMission(s,'caesar','egypt','spy','health',null,'cleopatra');s.world.intelSeed=seedFor(.9,.91);for(let i=0;i<spy.duration;i++)advanceOperations(s);
 const travelers=queueMission(s,'caesar','egypt','travelers','health',null,'cleopatra');s.world.intelSeed=seedFor(.4,.41);for(let i=0;i<travelers.duration;i++)advanceOperations(s);
 const reports=s.knowledge.caesar.egypt.reports.filter(r=>r.kind==='health'&&r.character==='cleopatra');assert.deepEqual(reports.map(r=>r.value),['healthy','deceased']);assert.ok(reports.every(r=>r.confidence==='disputed'));assert.equal(s.knowledge.senate.egypt.reports.length,0);
});
test('a contested court can spread a false death rumor without revealing the subject’s real condition',()=>{
 const states=[()=>{},s=>{s.world.characters.cleopatra.health='dying'},s=>{const c=s.world.characters.cleopatra;c.health='deceased';c.alive=false},s=>{s.world.characters.cleopatra.location='parthia'},s=>{s.world.characters.cleopatra.missing={origin:'egypt',remaining:2}},s=>{s.world.characters.cleopatra.faction='parthia'}];
 for(const type of ['spy','travelers'])for(const change of states){
  const s=investigate('healthy',.35,type,s=>{s.world.claimants.egypt=['ptolemy'];change(s)}),r=s.knowledge.caesar.egypt.reports[0];
  assert.equal(r.value,'deceased');assert.equal(r.confidence,'rumor');assert.equal(r.reliability,'low');assert.equal(r.verified,false);assert.equal(r.originSource,'travelers');assert.equal(s.knowledge.senate.egypt.reports.length,0);
 }
 const noDispute=investigate('healthy',.35,'travelers',s=>{s.world.characters.cleopatra.location='parthia'});assert.equal(noDispute.knowledge.caesar.egypt.reports[0].value,'unknown');
});
test('a spy repeating the same death rumor does not independently corroborate travelers',()=>{
 const s=newGame('caesar');s.world.claimants.egypt=['ptolemy'];
 for(const type of ['spy','travelers']){const mission=queueMission(s,'caesar','egypt',type,'health',null,'cleopatra');assert.equal(mission.ok,true);s.world.intelSeed=seedFor(.35,.36);for(let i=0;i<mission.duration;i++)advanceOperations(s)}
 const reports=s.knowledge.caesar.egypt.reports.filter(r=>r.kind==='health'&&r.character==='cleopatra');
 assert.equal(reports.length,2);assert.ok(reports.every(r=>r.value==='deceased'&&r.confidence==='rumor'&&!r.verified));assert.equal(s.world.characters.cleopatra.alive,true);
});
