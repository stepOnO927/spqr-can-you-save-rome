import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=estate-records-1';
import {createFictionalPerson} from '../dynasties.js?v=estate-records-1';
import {addReport} from '../character-system.js?v=estate-records-1';
import {reportedPersonName,storedCorrespondentName} from '../person-knowledge.js?v=estate-records-1';
test('a conspiracy accusation records the observed name and does not use a later hidden name',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['First name','最初姓名'],faction:'caesar',birthYear:-80});
 const report=addReport(s,'caesar','caesar',{kind:'conspiracy',character:id,value:'suspected',source:'counter'});
 assert.deepEqual(report.peopleNames[id],['First name','最初姓名']);s.world.characters[id].faction='egypt';s.world.dynasties.catalog[id].name=['Hidden rename','秘密改名'];
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reportedPersonName(s,'caesar','caesar',id).name,['First name','最初姓名']);
 const saved=s.knowledge.caesar.caesar.reports.find(x=>x.kind==='conspiracy');assert.deepEqual(storedCorrespondentName(id,saved.peopleNames[id]),['First name','最初姓名']);delete saved.peopleNames;assert.deepEqual(storedCorrespondentName(id,saved.peopleNames?.[id]),['Unrecorded name','姓名未记录']);
});
test('an uninformative report does not turn its subject into a discovered name',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Secret','秘密'],faction:'egypt',birthYear:-80});const report=addReport(s,'caesar','egypt',{kind:'conspiracy',character:id,value:'unknown',source:'spy'});assert.deepEqual(report.peopleNames,{});assert.equal(reportedPersonName(s,'caesar','egypt',id),null);
});
