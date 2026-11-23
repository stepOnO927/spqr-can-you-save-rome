import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=office-intel-privacy-1';
import {createFictionalPerson} from '../dynasties.js?v=office-intel-privacy-1';
import {addReport,reportedHealthSubjects,previewMission,queueMission,visiblePersonName} from '../character-system.js?v=office-intel-privacy-1';
import {identityKnowledge} from '../map-lab/identity-knowledge.js?v=office-intel-privacy-1';

test('a delivered succession report creates an investigable identity lead without revealing true office',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Nikaia','尼凯娅'],faction:'egypt',birthYear:s.year-30});
 s.world.successionPlans.egypt=id;assert.ok(!reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.equal(identityKnowledge(s,id).kind,'unknown');
 const report=addReport(s,'caesar','egypt',{kind:'succession',value:id,source:'spy',confidence:'unverified',reliability:'moderate'});
 assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.equal(identityKnowledge(s,id).kind,'reported');assert.deepEqual(visiblePersonName(s,'caesar',id),['Nikaia','尼凯娅']);assert.equal(report.verified,false);
 assert.ok(!reportedHealthSubjects(s,'senate','egypt').includes(id));assert.ok(previewMission(s,'caesar','egypt','spy','health',null,id).ok);
 s.world.successionPlans.egypt=null;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.equal(identityKnowledge(s,id).kind,'reported');assert.ok(queueMission(s,'caesar','egypt','spy','health',null,id).ok);assert.equal(s.operations[0].subjectCharacter,id);
});
test('unknown or not-yet-delivered succession records do not create leads',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Hidden','隐藏'],faction:'egypt',birthYear:s.year-30});addReport(s,'caesar','egypt',{kind:'succession',value:'unknown',source:'spy'});s.knowledge.caesar.egypt.reports.unshift({kind:'succession',value:id,source:'spy',year:s.year+1,month:s.month});assert.ok(!reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.equal(identityKnowledge(s,id).kind,'unknown');
});
