import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-name-disagreement-1';
import {authorityForTheater} from '../map-lab/authority-view.js?v=faces-name-disagreement-1';
import {addReport} from '../character-system.js?v=faces-name-disagreement-1';

test('foreign authority uses only the viewer’s most recent observed report',()=>{
 let s=newGame('senate');s.year=-48;s.month=7;
 const reports=s.knowledge.senate.egypt.reports;
 reports.unshift({kind:'authority',value:{kind:'co_ruler_acting',actors:['ptolemy']},source:'spy',year:-48,month:6,confidence:'unverified'});
 reports.unshift({kind:'authority',value:{kind:'regency',actors:['cleopatra']},source:'exchange',year:-48,month:7,observationYear:-49,observationMonth:3});
 s.world.characters.ptolemy.health='dying';s.world.leadership.egypt=['cleopatra'];
 let report=authorityForTheater(s,'egypt');assert.equal(report.kind,'co_ruler_acting');assert.deepEqual(report.actors,['ptolemy']);assert.equal(report.month,6);assert.equal(report.source,'spy');assert.equal(report.own,undefined);
 s.world.characters.ptolemy.alive=false;s.world.leadership.egypt=[];s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(authorityForTheater(s,'egypt'),report);
 assert.equal(authorityForTheater(s,'egyptUpper').kind,'co_ruler_acting');assert.equal(authorityForTheater(s,'parthia').kind,'unknown');
});
test('new unknown or old authority reports do not disclose unseen circumstances',()=>{
 const s=newGame('senate');s.year=-46;s.month=7;s.knowledge.senate.egypt.reports.unshift({kind:'authority',value:{kind:'regency',actors:['ptolemy']},source:'spy',year:-49,month:1});
 let report=authorityForTheater(s,'egypt');assert.equal(report.outdated,true);assert.deepEqual(report.actors,['ptolemy']);
 s.knowledge.senate.egypt.reports.unshift({kind:'authority',value:'unknown',source:'travelers',year:-46,month:6});report=authorityForTheater(s,'egypt');assert.equal(report.kind,'unknown');assert.deepEqual(report.actors,[]);assert.equal(report.month,6);
});
test('own government reflects acting command without inventing a local governor',()=>{
 const s=newGame('caesar');s.world.characters.caesar.health='dying';const report=authorityForTheater(s,'cisalpine');assert.equal(report.own,true);assert.equal(report.kind,'acting_command');assert.ok(report.actors.includes('antony'));assert.equal(report.city,undefined);
});

test('same-month conflicting government reports remain visible with their original provenance',()=>{
 let s=newGame('senate');s.year=-48;s.month=7;s.knowledge.senate.egypt.reports.unshift({kind:'authority',value:{kind:'co_ruler_acting',actors:['ptolemy']},source:'spy',year:-48,month:6,confidence:'disputed'},{kind:'authority',value:{kind:'regency',actors:['cleopatra']},source:'exchange',originSource:'travelers',fromFaction:'parthia',year:-48,month:7,observationYear:-48,observationMonth:6,confidence:'disputed'},{kind:'authority',value:'unknown',source:'envoy',year:-48,month:6,confidence:'unverified'},{kind:'authority',value:{kind:'normal',actors:['cleopatra']},source:'spy',year:-49,month:1});
 const expected=authorityForTheater(s,'egypt');assert.equal(expected.kind,'co_ruler_acting');assert.equal(expected.confidence,'disputed');assert.equal(expected.alternatives.length,2);assert.equal(expected.alternatives[0].kind,'regency');assert.equal(expected.alternatives[0].originSource,'travelers');assert.equal(expected.alternatives[0].fromFaction,'parthia');assert.equal(expected.alternatives[1].kind,'unknown');s.world.leadership.egypt=[];assert.deepEqual(authorityForTheater(s,'egypt'),expected);
});

test('each conflicting authority claim retains its own observed name and ignores future reports',()=>{
 const s=newGame('caesar'),id='fictional:800';s.world.characters[id]={id,faction:'egypt',alive:true};s.world.dynasties.catalog[id]={id,name:['Secret name','秘密姓名'],faction:'egypt',fictional:true};
 const reports=s.knowledge.caesar.egypt.reports;
 reports.unshift({kind:'authority',value:{kind:'regency',actors:[id]},source:'spy',year:s.year,month:s.month,peopleNames:{[id]:['First name','首份姓名']}},{kind:'authority',value:{kind:'acting_command',actors:[id]},source:'envoy',year:s.year,month:s.month,peopleNames:{[id]:['Second name','第二份姓名']}},{kind:'authority',value:{kind:'normal',actors:[id]},source:'spy',year:s.year+1,month:s.month,peopleNames:{[id]:['Future name','未来姓名']}});
 const claim=authorityForTheater(s,'egypt');assert.deepEqual(claim.peopleNames[id],['First name','首份姓名']);assert.deepEqual(claim.alternatives[0].peopleNames[id],['Second name','第二份姓名']);assert.equal(claim.alternatives.length,1);
 delete reports[0].peopleNames;assert.deepEqual(authorityForTheater(s,'egypt').peopleNames[id],['Unrecorded name','姓名未记录']);
});

test('new reports snapshot names from this campaign when an identity changes',()=>{
 const s=newGame('caesar'),id='fictional:801';
 s.world.dynasties.catalog[id]={id,name:['First name','首份姓名'],faction:'senate',fictional:true};
 const first=addReport(s,'caesar','senate',{kind:'authority',value:{kind:'regency',actors:[id]},source:'spy'});
 s.world.dynasties.catalog[id].name=['Second name','第二份姓名'];
 const second=addReport(s,'caesar','senate',{kind:'authority',value:{kind:'acting_command',actors:[id]},source:'envoy'});
 assert.deepEqual(first.peopleNames[id],['First name','首份姓名']);
 assert.deepEqual(second.peopleNames[id],['Second name','第二份姓名']);
 s.world.dynasties.catalog[id].name=['Secret name','秘密姓名'];
 assert.deepEqual(upgradeSave(structuredClone(s)).knowledge.caesar.senate.reports.map(r=>r.peopleNames[id]),[['Second name','第二份姓名'],['First name','首份姓名']]);
});
