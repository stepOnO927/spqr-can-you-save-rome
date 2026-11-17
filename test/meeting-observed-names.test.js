import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=guardian-playability-1';
import {createFictionalPerson} from '../dynasties.js?v=guardian-playability-1';
import {addReport,reportedHealthSubjects} from '../character-system.js?v=guardian-playability-1';
import {identityKnowledge} from '../map-lab/identity-knowledge.js';
import {observedFictionalPortrait} from '../portrait-registry.js?v=born-portraits-eleven-1';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=guardian-playability-1';
import {reportedPersonName,visiblePersonName} from '../person-knowledge.js?v=mutual-audience-1';
test('an actual meeting observes a new name while preserving the earlier addressed name',()=>{
 let s=newGame('caesar');s.wars=[];s.world.characters['fictional:1'].location='egypt';const id=createFictionalPerson(s,{name:['Old report','旧报告姓名'],faction:'egypt',birthYear:-75,location:'egypt'});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});
 assert.ok(requestPersonalMeeting(s,'fictional:1',id,'egypt').ok);s.world.dynasties.catalog[id].name=['Name at meeting','会面时姓名'];assert.deepEqual(visiblePersonName(s,'caesar',id),['Old report','旧报告姓名']);
 s.world.intelSeed=1000;s.month=2;advancePersonalDiplomacy(s);s.month=3;advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');assert.deepEqual(s.meetings[0].reportedName,['Old report','旧报告姓名']);assert.deepEqual(s.meetings[0].observedName,['Name at meeting','会面时姓名']);
 s.world.dynasties.catalog[id].name=['Later secret','后来秘密姓名'];s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(visiblePersonName(s,'caesar',id),['Name at meeting','会面时姓名']);assert.deepEqual(reportedPersonName(s,'caesar','egypt',id).name,['Name at meeting','会面时姓名']);
 s.month=4;addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'exchange',peopleNames:{[id]:['Newer report','更新的报告姓名']},observationYear:s.year,observationMonth:s.month});assert.deepEqual(visiblePersonName(s,'caesar',id),['Newer report','更新的报告姓名']);
});
test('pending, future and legacy meeting names cannot replace a dated report',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Known','已知姓名'],faction:'egypt',birthYear:-75});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});
 s.meetings.push({actor:'caesar',targetFaction:'egypt',target:id,status:'pending',year:s.year,month:s.month,observedName:['Pending','未送达']},{actor:'caesar',targetFaction:'egypt',target:id,status:'met',year:s.year,month:s.month,resolvedYear:s.year+1,resolvedMonth:s.month,observedName:['Future','未来姓名']},{actor:'caesar',targetFaction:'egypt',target:id,status:'met',year:s.year,month:s.month,resolvedYear:s.year,resolvedMonth:s.month,reportedName:['Addressed','旧称呼']});
 assert.deepEqual(visiblePersonName(s,'caesar',id),['Known','已知姓名']);
});
test('a declined request does not discover the hidden current name',()=>{
 const s=newGame('caesar');s.wars=[];s.world.characters['fictional:1'].location='egypt';const id=createFictionalPerson(s,{name:['Reported','报告姓名'],faction:'egypt',birthYear:-75,location:'egypt'});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});requestPersonalMeeting(s,'fictional:1',id,'egypt');s.world.dynasties.catalog[id].name=['Hidden','秘密姓名'];s.world.intelSeed=0;s.month=2;advancePersonalDiplomacy(s);s.month=3;advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'declined');assert.equal(s.meetings[0].observedName,undefined);assert.deepEqual(visiblePersonName(s,'caesar',id),['Reported','报告姓名']);
});

test('the receiving faction records its own dated encounter with the visitor',()=>{
 let s=newGame('caesar');s.wars=[];s.world.characters['fictional:1'].location='italiaS';s.world.characters.cicero.location='italiaS';addReport(s,'caesar','senate',{kind:'leaders',leaders:['cicero'],source:'spy'});
 assert.ok(requestPersonalMeeting(s,'fictional:1','cicero','senate').ok);s.world.intelSeed=1000;s.month=2;advancePersonalDiplomacy(s);s.month=3;advancePersonalDiplomacy(s);const m=s.meetings[0];assert.equal(m.status,'met');assert.deepEqual(m.observedPersonName,['Publius Varenus','普布利乌斯·瓦雷努斯']);assert.equal(m.personPortraitKey,'fictional-varenus');
 assert.ok(reportedHealthSubjects(s,'senate','caesar').includes('fictional:1'));assert.ok(s.knowledge.senate.caesar.reports.some(r=>r.kind==='location'&&r.character==='fictional:1'&&r.value==='italiaS'));
 s.world.dynasties.catalog['fictional:1'].name=['Later secret','之后秘密姓名'];s.player='senate';s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(visiblePersonName(s,'senate','fictional:1'),m.observedPersonName);assert.deepEqual(reportedPersonName(s,'senate','caesar','fictional:1').name,m.observedPersonName);assert.equal(identityKnowledge(s,'fictional:1').kind,'met');assert.equal(observedFictionalPortrait(s,'fictional:1'),'fictional-varenus');
 s.player='egypt';assert.notDeepEqual(visiblePersonName(s,'egypt','fictional:1'),m.observedPersonName);assert.equal(observedFictionalPortrait(s,'fictional:1'),null);
});
test('receiving-side snapshots require a delivered meeting',()=>{
 const s=newGame('senate'),id='fictional:1';s.meetings.push({actor:'caesar',targetFaction:'senate',person:id,target:'cicero',status:'met',resolvedYear:s.year+1,resolvedMonth:s.month,observedPersonName:['Future','未来姓名'],personPortraitKey:'fictional-varenus'});
 assert.notDeepEqual(visiblePersonName(s,'senate',id),['Future','未来姓名']);assert.equal(observedFictionalPortrait(s,id),null);assert.notEqual(identityKnowledge(s,id).kind,'met');
});
