import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=coalition-courier-1';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=portraits-hundred-days-1';
import {queueMission,advanceOperations,addReport} from '../character-system.js?v=portraits-hundred-days-1';
const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});

test('a personal meeting records a dated expressed attitude, not hidden plans or another faction’s knowledge',()=>{
 let s=newGame('senate');s.world.characters.cicero.location='egypt';s.relations['egypt:senate']=40;s.world.successionPlans.egypt='ptolemy';s.world.characters.cleopatra.health='seriously_ill';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);s.world.characters.cleopatra.health='healthy';s.world.intelSeed=seedFor(.7,.8);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);const r=s.knowledge.senate.egypt.reports.find(x=>x.kind==='stance');assert.equal(r.value,'receptive');assert.equal(r.character,'cleopatra');assert.equal(r.source,'meeting');assert.equal(r.confidence,'unverified');assert.equal(r.verified,false);assert.equal(s.knowledge.caesar.egypt.reports.length,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.knowledge.senate.egypt.reports.find(x=>x.kind==='stance').value,'receptive');
});
test('a failed personal meeting does not create a statement about the absent person',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.characters.cleopatra.location='parthia';requestPersonalMeeting(s,'cicero','cleopatra','egypt');s.world.intelSeed=seedFor(.7,.8);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');assert.equal(s.knowledge.senate.egypt.reports.some(x=>x.kind==='stance'),false);
});
test('an envoy can obtain a public statement and allies can forward it with its original date',()=>{
 const s=newGame('senate');s.relations['egypt:senate']=-10;assert.equal(queueMission(s,'senate','egypt','spy','stance').reason,'subject');assert.equal(queueMission(s,'senate','egypt','envoy','stance').ok,true);const op=s.operations[0],duration=op.remaining;for(let i=0;i<duration-1;i++)advanceOperations(s);assert.equal(s.knowledge.senate.egypt.reports.length,0);s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);const r=s.knowledge.senate.egypt.reports[0];assert.equal(r.value,'guarded');assert.equal(r.source,'envoy');assert.equal(r.confidence,'unverified');assert.equal(r.verified,false);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 const t=newGame('senate');t.alliances.push(['senate','parthia']);addReport(t,'parthia','egypt',{kind:'stance',value:'receptive',source:'envoy',observationYear:-50,observationMonth:3});assert.equal(queueMission(t,'senate','egypt','exchange','stance','parthia').ok,true);t.operations[0].remaining=1;t.world.intelSeed=seedFor(.7,.8);advanceOperations(t);const f=t.knowledge.senate.egypt.reports[0];assert.equal(f.value,'receptive');assert.equal(f.observationYear,-50);assert.equal(f.observationMonth,3);assert.equal(f.originSource,'court');assert.equal(f.verified,false);
});
