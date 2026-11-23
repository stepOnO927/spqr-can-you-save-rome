import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=archived-exchange-1';
import {createFictionalPerson} from '../dynasties.js?v=archived-exchange-1';
import {addReport} from '../character-system.js?v=archived-exchange-1';
import {reportedPersonName,visiblePersonName,hasReportedNameConflict} from '../person-knowledge.js?v=archived-exchange-1';
import {identityKnowledge} from '../map-lab/identity-knowledge.js?v=archived-exchange-1';

test('simultaneous conflicting name reports remain visibly uncertain until a newer observation',()=>{
 let s=newGame('caesar'),id=createFictionalPerson(s,{name:['Hidden actual','隐藏姓名'],faction:'egypt',birthYear:s.year-30});s.month=2;
 const report=(source,name,month=2)=>addReport(s,'caesar','egypt',{kind:'succession',value:id,source,peopleNames:{[id]:name},observationYear:s.year,observationMonth:month});
 report('spy',['First report','第一份姓名']);report('envoy',['Second report','第二份姓名']);report('travelers',['Second report','第二份姓名']);
 assert.equal(hasReportedNameConflict(s,'caesar',id),true);assert.equal(reportedPersonName(s,'caesar','egypt',id),null);assert.deepEqual(visiblePersonName(s,'caesar',id),['Name reports differ','姓名报告不一致']);assert.notEqual(identityKnowledge(s,id).kind,'corroborated');assert.equal(hasReportedNameConflict(s,'senate',id),false);
 s=upgradeSave(structuredClone(s));assert.deepEqual(visiblePersonName(s,'caesar',id),['Name reports differ','姓名报告不一致']);assert.equal(s.knowledge.caesar.egypt.reports.filter(r=>r.value===id).length,3);
 s.month=3;addReport(s,'caesar','egypt',{kind:'succession',value:id,source:'spy',peopleNames:{[id]:['Later report','后续报告姓名']}});assert.equal(hasReportedNameConflict(s,'caesar',id),false);assert.deepEqual(visiblePersonName(s,'caesar',id),['Later report','后续报告姓名']);
});
