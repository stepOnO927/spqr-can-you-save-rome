import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=player-aid-letter-1';
import {previewMission,queueMission,advanceOperations,reportedHealthSubjects} from '../character-system.js?v=portraits-hundred-days-1';
const highSeed=Array.from({length:100000},(_,i)=>i).find(i=>((Math.imul(i,1664525)+1013904223)>>>0)/4294967296>.96);
function setup(){const s=newGame('caesar'),k=s.knowledge.caesar.egypt;k.reportedLeaders=[];k.reports=[];k.sightings={};k.commanderReports=[];s.factions.caesar.treasury=100;return s}
function resolve(s){const op=s.operations[0];while(op.remaining>1){s.month++;advanceOperations(s)}s.world.intelSeed=highSeed;s.month++;advanceOperations(s);return op}
test('a general investigation can discover a local public person only after it resolves',()=>{
 for(const [type,subject] of [['spy','location'],['envoy','health'],['travelers','location']]){
  let s=setup();assert.deepEqual(reportedHealthSubjects(s,'caesar','egypt'),[]);assert.equal(previewMission(s,'caesar','egypt',type,subject).ok,true);assert.equal(queueMission(s,'caesar','egypt',type,subject).ok,true);
  assert.equal(s.operations[0].subjectCharacter,null);assert.deepEqual(reportedHealthSubjects(s,'caesar','egypt'),[]);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));const op=resolve(s);assert.equal(op.status,'complete');const report=s.knowledge.caesar.egypt.reports[0];assert.equal(report.character,'cleopatra');assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes('cleopatra'));assert.equal(report.observationYear??report.year,s.year);
  if(subject==='location')assert.equal(report.value,'egypt');
 }
});
test('no accessible public figure produces no name, and a named stale request never switches targets',()=>{
 const hidden=setup();hidden.world.characters.cleopatra.travel={destination:'parthia',legs:[{to:'parthia',months:1}],remaining:1};hidden.world.characters.ptolemy.missing=true;
 assert.equal(queueMission(hidden,'caesar','egypt','spy','location').ok,true);resolve(hidden);const empty=hidden.knowledge.caesar.egypt.reports[0];assert.equal(empty.character,null);assert.equal(empty.value,'unknown');
 const stale=setup();stale.knowledge.caesar.egypt.reportedLeaders=['cleopatra'];assert.equal(queueMission(stale,'caesar','egypt','spy','health',null,'cleopatra').ok,true);stale.world.characters.cleopatra.faction='parthia';stale.world.leadership.egypt=['ptolemy'];resolve(stale);const report=stale.knowledge.caesar.egypt.reports[0];assert.equal(report.character,'cleopatra');assert.equal(report.value,'unknown');assert.ok(!reportedHealthSubjects(stale,'caesar','egypt').includes('ptolemy'));
});
test('a general investigation can return no name despite a local figure',()=>{
 const s=setup();assert.equal(queueMission(s,'caesar','egypt','spy','location').ok,true);const op=s.operations[0];
 while(op.remaining>1){s.month++;advanceOperations(s)}
 s.world.intelSeed=Array.from({length:100000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>.48&&q<.52});s.month++;advanceOperations(s);
 assert.equal(op.status,'complete');assert.equal(s.knowledge.caesar.egypt.reports[0].character,null);assert.equal(s.knowledge.caesar.egypt.reports[0].value,'unknown');
});
test('mission availability does not reveal an unobserved court or its leader',()=>{
 const first=setup(),second=setup();second.world.leadership.egypt=[];second.world.characters.cleopatra.location='parthia';
 assert.deepEqual(previewMission(first,'caesar','egypt','spy','location'),previewMission(second,'caesar','egypt','spy','location'));
 assert.deepEqual(queueMission(first,'caesar','egypt','spy','location'),queueMission(second,'caesar','egypt','spy','location'));
 assert.deepEqual(first.operations,second.operations);assert.deepEqual(first.knowledge.caesar.egypt,second.knowledge.caesar.egypt);
});
test('a player may explicitly investigate without a named target even when other people are known',()=>{
 const s=setup();s.knowledge.caesar.egypt.reportedLeaders=['ptolemy'];
 assert.equal(queueMission(s,'caesar','egypt','spy','location',null,'').ok,true);assert.equal(s.operations[0].subjectCharacter,null);
 resolve(s);assert.equal(s.knowledge.caesar.egypt.reports[0].character,'cleopatra');
 const legacy=setup();legacy.knowledge.caesar.egypt.reportedLeaders=['ptolemy'];
 assert.equal(queueMission(legacy,'caesar','egypt','spy','location').ok,true);assert.equal(legacy.operations[0].subjectCharacter,'ptolemy');
});
