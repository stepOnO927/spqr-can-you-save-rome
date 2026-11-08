import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission} from '../engine.js?v=grand-chessboard-2';
import {addReport,advanceOperations,reportedHealthSubjects,reportEvidence} from '../character-system.js?v=grand-chessboard-2';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function complete(s,mission,seed){s.world.intelSeed=seedFor(...seed);for(let i=0;i<mission.duration;i++)advanceOperations(s)}

test('a successful investigation can report a regent without exposing private state to other factions',()=>{
 let s=newGame('caesar');s.world.characters.orodes.health='seriously_ill';assert.equal(reportedHealthSubjects(s,'caesar','parthia').includes('pacorus'),false);
 const m=queueMission(s,'caesar','parthia','spy','authority');assert.equal(m.ok,true);assert.equal(s.knowledge.caesar.parthia.reports.length,0);complete(s,m,[.7,.8]);
 const r=s.knowledge.caesar.parthia.reports[0];assert.deepEqual(r.value,{kind:'regency',actors:['pacorus']});assert.equal(r.confidence,'unverified');assert.equal(reportedHealthSubjects(s,'caesar','parthia').includes('pacorus'),true);assert.equal(reportedHealthSubjects(s,'senate','parthia').includes('pacorus'),false);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.orodes.health='healthy';assert.deepEqual(s.knowledge.caesar.parthia.reports[0].value,{kind:'regency',actors:['pacorus']});
});

test('a hostile court can conceal a regency, and independent contradictory evidence is disputed',()=>{
 const s=newGame('caesar');s.world.characters.orodes.health='seriously_ill';s.wars.push(['caesar','parthia']);const m=queueMission(s,'caesar','parthia','spy','authority');complete(s,m,[.4,.44]);
 const cover=s.knowledge.caesar.parthia.reports[0];assert.deepEqual(cover.value,{kind:'normal',actors:['orodes']});addReport(s,'caesar','parthia',{kind:'authority',value:{kind:'regency',actors:['pacorus']},source:'travelers',confidence:'rumor'});assert.equal(cover.confidence,'disputed');assert.deepEqual(reportEvidence(s,'caesar','parthia',cover).conflict.map(x=>x.family),['travelers']);
});

test('allied authority reports preserve provenance and unknown observations reveal nothing',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','egypt']);const original=addReport(s,'egypt','parthia',{kind:'authority',value:{kind:'regency',actors:['pacorus']},source:'spy',confidence:'unverified',observationYear:-50,observationMonth:5});
 const m=queueMission(s,'caesar','parthia','exchange','authority','egypt');complete(s,m,[.7,.8]);const r=s.knowledge.caesar.parthia.reports[0];assert.deepEqual(r.value,original.value);assert.notEqual(r.value,original.value);assert.notEqual(r.value.actors,original.value.actors);assert.equal(r.originSource,'spy');assert.equal(r.observationYear,-50);assert.equal(r.verified,false);
 const t=newGame('caesar');t.world.characters.orodes.health='seriously_ill';const rumor=queueMission(t,'caesar','parthia','travelers','authority');complete(t,rumor,[.5,.55]);assert.equal(t.knowledge.caesar.parthia.reports[0].value,'unknown');assert.equal(reportedHealthSubjects(t,'caesar','parthia').includes('pacorus'),false);
});
