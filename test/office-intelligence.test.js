import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=succession-feedback-1';
import {appointOffice,advanceOffices,localGovernor} from '../office-system.js?v=safe-save-1';
import {addReport,advanceOperations,previewMission,queueMission,reportedHealthSubjects,reportedOfficeTheaters} from '../character-system.js?v=succession-feedback-1';
import {identityKnowledge} from '../map-lab/identity-knowledge.js';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function resolve(s){for(let i=0;i<4;i++)advanceOperations(s)}

test('a spy can discover a simulated enemy office without revealing current location or other offices',()=>{
 let s=newGame('caesar');assert.equal(appointOffice(s,'finance','cicero','senate').ok,true);
 assert.equal(reportedHealthSubjects(s,'caesar','senate').includes('cicero'),false);
 assert.equal(previewMission(s,'caesar','senate','envoy','office_finance').reason,'subject');assert.equal(previewMission(s,'caesar','egypt','spy','office_finance').reason,'subject');
 assert.equal(queueMission(s,'caesar','senate','spy','office_finance').ok,true);s.world.intelSeed=seedFor(.65,.7);for(let i=0;i<3;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.senate.reports.length,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceOperations(s);
 const report=s.knowledge.caesar.senate.reports[0];assert.equal(report.kind,'office_finance');assert.equal(report.value,'cicero');assert.equal(report.verified,false);assert.equal(report.source,'spy');assert.equal(report.character,undefined);assert.equal(s.knowledge.egypt.senate.reports.length,0);
 assert.ok(reportedHealthSubjects(s,'caesar','senate').includes('cicero'));assert.equal(identityKnowledge(s,'cicero').kind,'reported');
 s.world.offices.senate.finance='cato';s.world.characters.cicero.location='syria';assert.equal(report.value,'cicero');assert.equal(report.location,undefined);
});
test('no named officer is no evidence of a vacancy; wartime misdirection may reuse an old report',()=>{
 let s=newGame('caesar');assert.equal(queueMission(s,'caesar','senate','spy','office_supply').ok,true);s.world.intelSeed=seedFor(.65,.7);resolve(s);assert.equal(s.knowledge.caesar.senate.reports[0].value,'unknown');
 s=newGame('caesar');assert.equal(appointOffice(s,'finance','cato','senate').ok,true);addReport(s,'caesar','senate',{kind:'office_finance',value:'cicero',source:'travelers'});assert.equal(queueMission(s,'caesar','senate','spy','office_finance').ok,true);s.world.intelSeed=seedFor(.4,.44);resolve(s);assert.equal(s.knowledge.caesar.senate.reports[0].value,'cicero');assert.equal(s.world.offices.senate.finance,'cato');
});
test('an ally can forward an office report without inventing its own knowledge',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','egypt']);addReport(s,'egypt','senate',{kind:'office_finance',value:'cicero',source:'spy',observationYear:-50,observationMonth:6});assert.equal(queueMission(s,'caesar','senate','exchange','office_finance','egypt').ok,true);s.world.intelSeed=seedFor(.65,.7);for(let i=0;i<3;i++)advanceOperations(s);
 const r=s.knowledge.caesar.senate.reports[0];assert.equal(r.value,'cicero');assert.equal(r.observationYear,-50);assert.equal(r.observationMonth,6);assert.equal(r.originSource,'spy');assert.equal(r.fromFaction,'egypt');assert.equal(r.verified,false);
});

test('a theater assignment can be investigated without disclosing hidden control or current location',()=>{
 let s=newGame('caesar');s.world.localGovernors={roma:{faction:'senate',person:'cicero'}};
 const options=reportedOfficeTheaters(s,'caesar','senate');assert.ok(options.includes('roma'));assert.equal(previewMission(s,'caesar','senate','envoy','office_theater:roma').reason,'subject');assert.equal(previewMission(s,'caesar','egypt','spy','office_theater:roma').reason,'subject');assert.equal(previewMission(s,'caesar','senate','spy','office_theater:cisalpine').reason,'subject');
 assert.equal(queueMission(s,'caesar','senate','spy','office_theater:roma').ok,true);s.world.intelSeed=seedFor(.65,.7);for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.knowledge.caesar.senate.reports.length,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceOperations(s);const r=s.knowledge.caesar.senate.reports[0];assert.equal(r.value,'cicero');assert.equal(r.kind,'office_theater:roma');assert.equal(r.location,undefined);assert.equal(s.knowledge.egypt.senate.reports.length,0);
 s.world.characters.cicero.location='syria';s.regions.find(x=>x.id==='roma').owner='caesar';assert.equal(r.value,'cicero');assert.deepEqual(reportedOfficeTheaters(s,'caesar','senate'),options);
});
test('allied theater reports preserve their original source and unknown does not imply a vacancy',()=>{
 let s=newGame('caesar');s.alliances.push(['caesar','egypt']);addReport(s,'egypt','senate',{kind:'office_theater:roma',value:'cicero',source:'spy',observationYear:-50,observationMonth:6});assert.equal(queueMission(s,'caesar','senate','exchange','office_theater:roma','egypt').ok,true);s.world.intelSeed=seedFor(.65,.7);for(let i=0;i<3;i++)advanceOperations(s);let r=s.knowledge.caesar.senate.reports[0];assert.equal(r.value,'cicero');assert.equal(r.originSource,'spy');assert.equal(r.observationYear,-50);
 s=newGame('caesar');assert.equal(queueMission(s,'caesar','senate','spy','office_theater:roma').ok,true);s.world.intelSeed=seedFor(.65,.7);resolve(s);r=s.knowledge.caesar.senate.reports[0];assert.equal(r.value,'unknown');assert.equal(r.verified,false);
});

test('a real AI appointment can be uncovered by a delayed spy without automatic disclosure',()=>{
 let s=newGame('caesar');s.month=1;advanceOffices(s);s.month=7;advanceOffices(s);const nominee=localGovernor(s,'roma');assert.ok(nominee);assert.equal(s.knowledge.caesar.senate.reports.length,0);assert.equal(queueMission(s,'caesar','senate','spy','office_theater:roma').ok,true);s.world.intelSeed=seedFor(.65,.7);for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.knowledge.caesar.senate.reports.length,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceOperations(s);assert.equal(s.knowledge.caesar.senate.reports[0].value,nominee);assert.equal(s.knowledge.egypt.senate.reports.length,0);
});
