import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=archived-exchange-1';
import {addReport,advanceOperations,reportEvidence,refreshReportConfidence,reportedHealthSubjects,queueMission,visiblePersonName} from '../character-system.js?v=archived-exchange-1';
import {createFictionalPerson} from '../dynasties.js?v=archived-exchange-1';
import {isDeliveredReport} from '../person-knowledge.js?v=archived-exchange-1';
const successfulSeed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.65&&q<.7});

test('delivered intelligence is retained beyond the active window and survives save/load',()=>{
 let s=newGame('caesar');for(let i=0;i<45;i++)addReport(s,'caesar','egypt',{kind:'strength',value:1000+i,range:[1000+i,1200+i],source:'spy',marker:i});let k=s.knowledge.caesar.egypt;assert.equal(k.reports.length,30);assert.equal(k.reportArchive.length,15);assert.deepEqual(k.reportArchive.map(r=>r.marker),Array.from({length:15},(_,i)=>i));assert.equal(k.reports[0].marker,44);assert.equal(reportEvidence(s,'caesar','egypt',k.reportArchive[0]).unavailable,true);assert.equal(s.knowledge.senate.egypt.reportArchive,undefined);s=upgradeSave(JSON.parse(JSON.stringify(s)));refreshReportConfidence(s);k=s.knowledge.caesar.egypt;assert.equal(k.reportArchive.length,15);assert.equal(k.reportArchive[0].marker,0);assert.equal(k.reports.length,30);
});
test('undelivered reports remain in active knowledge until their recorded delivery',()=>{
 const s=newGame('caesar'),k=s.knowledge.caesar.egypt,future={kind:'strength',value:999999,source:'spy',year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month};k.reports.push(future);for(let i=0;i<35;i++)addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy',marker:i});assert.equal(k.reports.includes(future),true);assert.equal(k.reportArchive.includes(future),false);assert.equal(isDeliveredReport(s,future),false);s.year++;assert.equal(isDeliveredReport(s,future),true);addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy'});assert.ok(k.reports.includes(future)||k.reportArchive.includes(future));
});

test('archived observed identities remain usable leads without exposing hidden changes',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Observed name','记录姓名'],faction:'egypt',birthYear:-73}),future=createFictionalPerson(s,{name:['Future identity','未来人物'],faction:'egypt',birthYear:-72});s.knowledge.caesar.egypt.reportedLeaders=[];addReport(s,'caesar','egypt',{kind:'location',character:id,value:'egypt',source:'spy',identityObserved:true,peopleNames:{[id]:['Observed name','记录姓名']}});for(let i=0;i<35;i++)addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy'});const k=s.knowledge.caesar.egypt;assert.ok(k.reportArchive.some(r=>r.character===id));k.reportArchive.push({kind:'location',character:future,value:'egypt',source:'spy',identityObserved:true,peopleNames:{[future]:['Future identity','未来人物']},year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month});s.world.dynasties.catalog[id].name=['Hidden new name','秘密新姓名'];s.world.characters[id].faction='parthia';s.world.characters[id].alive=false;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.ok(!reportedHealthSubjects(s,'caesar','egypt').includes(future));assert.deepEqual(visiblePersonName(s,'caesar',id),['Observed name','记录姓名']);assert.deepEqual(visiblePersonName(s,'senate',id),['Unrecorded name','姓名未记录']);assert.equal(queueMission(s,'caesar','egypt','spy','location',null,id).ok,true);assert.deepEqual(s.operations[0].subjectName,['Observed name','记录姓名']);s.year++;assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes(future));
});

test('an ally can forward its archived report without exposing future records or refreshing its observation date',()=>{
 let s=newGame('caesar');s.alliances.push(['caesar','parthia']);
 addReport(s,'parthia','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',observationYear:s.year-2,observationMonth:s.month,peopleNames:{cleopatra:['Cleopatra VII','克娄巴特拉七世']}});
 for(let i=0;i<35;i++)addReport(s,'parthia','egypt',{kind:'stability',value:'stable',source:'spy'});
 const k=s.knowledge.parthia.egypt;assert.ok(k.reportArchive.some(r=>r.kind==='health'));k.reportArchive.push({kind:'health',character:'cleopatra',value:'dying',source:'spy',year:s.year+1,month:s.month});
 assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','cleopatra').ok);s.world.intelSeed=successfulSeed;
 advanceOperations(s);advanceOperations(s);assert.equal(s.operations[0].exchangeSealed.report.value,'ill');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 k.reportArchive.find(r=>r.kind==='health').value='healthy';s=upgradeSave(structuredClone(s));advanceOperations(s);
 const report=s.knowledge.caesar.egypt.reports.find(r=>r.kind==='health');assert.equal(report.value,'ill');assert.equal(report.source,'exchange');assert.equal(report.originSource,'spy');assert.equal(report.fromFaction,'parthia');assert.equal(report.observationYear,s.year-2);assert.deepEqual(report.peopleNames.cleopatra,['Cleopatra VII','克娄巴特拉七世']);assert.equal(s.knowledge.senate.egypt.reports.length,0);
});

test('a newer active report takes priority over archived evidence of the same kind',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','parthia']);addReport(s,'parthia','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',observationYear:s.year-2,observationMonth:s.month});for(let i=0;i<35;i++)addReport(s,'parthia','egypt',{kind:'stability',value:'stable',source:'spy'});
 addReport(s,'parthia','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',observationYear:s.year,observationMonth:s.month});assert.ok(queueMission(s,'caesar','egypt','exchange','health','parthia','cleopatra').ok);s.world.intelSeed=successfulSeed;for(let i=0;i<3;i++)advanceOperations(s);
 const report=s.knowledge.caesar.egypt.reports.find(r=>r.kind==='health');assert.equal(report.value,'healthy');assert.equal(report.originSource,'court');assert.equal(report.observationYear,s.year);
});
