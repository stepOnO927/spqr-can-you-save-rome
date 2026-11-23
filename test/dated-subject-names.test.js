import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission} from '../engine.js?v=peace-sender-1';
import {addReport,advanceOperations} from '../character-system.js?v=peace-sender-1';
import {createFictionalPerson} from '../dynasties.js?v=peace-sender-1';

test('targeted investigations retain the name known at dispatch, including after save/load',()=>{
 let initial=newGame('caesar');const id=createFictionalPerson(initial,{name:['Known then','当时姓名'],faction:'egypt',birthYear:-75,location:'egypt'});
 addReport(initial,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});
 assert.equal(queueMission(initial,'caesar','egypt','spy','health',null,id).ok,true);
 assert.deepEqual(initial.operations[0].subjectName,['Known then','当时姓名']);
 initial.world.dynasties.catalog[id].name=['Hidden later','后来秘密姓名'];initial=upgradeSave(JSON.parse(JSON.stringify(initial)));
 let checked=false;
 for(let seed=1;seed<=100&&!checked;seed++){
  const s=upgradeSave(JSON.parse(JSON.stringify(initial))),legacy=upgradeSave(JSON.parse(JSON.stringify(initial)));delete legacy.operations[0].subjectName;s.world.intelSeed=legacy.world.intelSeed=seed*100000+17;
  for(let i=0;i<4;i++){advanceOperations(s);advanceOperations(legacy)}
  const report=s.knowledge.caesar.egypt.reports.find(r=>r.kind==='health'&&r.character===id);
  if(report){const oldReport=legacy.knowledge.caesar.egypt.reports.find(r=>r.kind==='health'&&r.character===id);assert.deepEqual(report.peopleNames[id],['Known then','当时姓名']);assert.ok(oldReport);assert.equal(oldReport.peopleNames[id],undefined);checked=true}
 }
 assert.ok(checked,'at least one investigation should deliver a report');
});
