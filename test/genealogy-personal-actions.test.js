import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission,sendInquiry,tick} from '../engine.js?v=dossier-delivery-1';
import {createFictionalPerson} from '../dynasties.js?v=dossier-delivery-1';
import {genealogyMeetingContacts} from '../genealogy-personal-actions.js?v=dossier-delivery-1';
import {addReport,reportedPersonName,advanceOperations} from '../character-system.js?v=dossier-delivery-1';
import {requestPersonalMeeting} from '../personal-diplomacy.js?v=dossier-delivery-1';

test('meeting recipients come from reports rather than a foreign court’s hidden state',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Hidden Person','秘密人物'],faction:'egypt',birthYear:-75,location:'egypt'});
 s.knowledge.caesar.egypt.reports.push({kind:'leaders',leaders:[id],year:s.year,month:s.month});const before=genealogyMeetingContacts(s,true);assert.ok(before.some(c=>c.id==='cleopatra'));const fictional=before.find(c=>c.id===id);assert.match(fictional.label,/未核实人物/);assert.doesNotMatch(fictional.label,/秘密人物/);
 s.world.characters[id].alive=false;s.world.characters[id].location='parthia';s.world.dynasties.catalog[id].name=['Changed Secret','秘密改名'];s=upgradeSave(structuredClone(s));assert.deepEqual(genealogyMeetingContacts(s,true),before);
});
test('unreported foreign people are never offered as personal meeting recipients',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Unreported','未报告'],faction:'egypt',birthYear:-75});assert.ok(!genealogyMeetingContacts(s,true).some(c=>c.id===id));
});
test('delivered names are dated snapshots, including after an audience request and reload',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Reported Person','报告中的人物'],faction:'egypt',birthYear:-75,location:'egypt'});
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});
 const before=genealogyMeetingContacts(s,true).find(c=>c.id===id);assert.match(before.label,/报告中的人物/);assert.match(before.label,/报告于/);
 const person=Object.values(s.world.characters).find(c=>c.faction==='caesar'&&c.alive&&c.location&&!c.travel&&!s.armies.some(a=>a.characterId===c.id&&a.move));
 assert.ok(requestPersonalMeeting(s,person.id,id,'egypt').ok);assert.deepEqual(s.meetings[0].reportedName,['Reported Person','报告中的人物']);
 s.world.dynasties.catalog[id].name=['Secret rename','秘密改名'];s=upgradeSave(structuredClone(s));
 assert.equal(genealogyMeetingContacts(s,true).find(c=>c.id===id).label,before.label);assert.deepEqual(s.meetings[0].reportedName,['Reported Person','报告中的人物']);
});
test('forwarded or unrelated records cannot acquire names from secret current state',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Secret Person','秘密人物'],faction:'egypt',birthYear:-75});
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'exchange',observationYear:s.year,observationMonth:s.month});
 assert.equal(reportedPersonName(s,'caesar','egypt',id),null);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'exchange',peopleNames:{[id]:['Old Report','旧报告姓名']},observationYear:s.year,observationMonth:s.month});
 assert.deepEqual(reportedPersonName(s,'caesar','egypt',id).name,['Old Report','旧报告姓名']);
 const id2=createFictionalPerson(s,{name:['Another secret','另一秘密'],faction:'egypt',birthYear:-75});
 addReport(s,'caesar','egypt',{kind:'health',character:id2,value:'unknown',source:'spy'});assert.equal(reportedPersonName(s,'caesar','egypt',id2),null);
});
test('an actual allied exchange delivers its sealed old name and preserves its origin',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Original','原来的名字'],faction:'egypt',birthYear:-75});
 s.alliances.push(['caesar','parthia']);addReport(s,'parthia','egypt',{kind:'leaders',leaders:[id],source:'spy'});
 assert.ok(queueMission(s,'caesar','egypt','exchange','leaders','parthia').ok);s.world.intelSeed=1000;
 advanceOperations(s);advanceOperations(s);assert.equal(reportedPersonName(s,'caesar','egypt',id),null);
 s.world.dynasties.catalog[id].name=['Secret change','秘密变化'];s=upgradeSave(structuredClone(s));s.world.intelSeed=1000;advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');const report=s.knowledge.caesar.egypt.reports[0];assert.equal(report.source,'exchange');assert.equal(report.originSource,'spy');assert.deepEqual(reportedPersonName(s,'caesar','egypt',id).name,['Original','原来的名字']);
});
test('a court letter seals its named response before delivery or loss',()=>{
 const start=newGame('caesar'),id=createFictionalPerson(start,{name:['Court name','宫廷原名'],faction:'egypt',birthYear:-75,location:'egypt'});start.relations['caesar:egypt']=50;
 assert.ok(sendInquiry(start,'caesar','egypt','leaders').ok);tick(start);let prepared;
 for(let i=1;i<100&&!prepared;i++){const candidate=upgradeSave(structuredClone(start));candidate.world.leadership.egypt=[id];candidate.seed=(i*7000013)>>>0;tick(candidate);if(candidate.inquiries[0].sealed?.report?.peopleNames?.[id])prepared=candidate}
 assert.ok(prepared);assert.equal(reportedPersonName(prepared,'caesar','egypt',id),null);
 prepared.world.dynasties.catalog[id].name=['Secret rename','秘密改名'];let delivered,lost;
 for(let i=1;i<100&&(!delivered||!lost);i++){const candidate=upgradeSave(structuredClone(prepared));candidate.inquiries[0].remaining=1;candidate.seed=(i*7000013)>>>0;tick(candidate);if(candidate.inquiries[0].status==='answered')delivered=candidate;if(candidate.inquiries[0].status==='no_reply')lost=candidate}
 assert.ok(delivered);assert.ok(lost);assert.deepEqual(reportedPersonName(delivered,'caesar','egypt',id).name,['Court name','宫廷原名']);assert.equal(reportedPersonName(lost,'caesar','egypt',id),null);
});
