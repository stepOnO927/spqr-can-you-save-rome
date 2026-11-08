import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=grand-chessboard-2';
import {addReport,queueMission,advanceOperations,observeArmies} from '../character-system.js?v=grand-chessboard-2';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=grand-chessboard-2';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function finish(s,actor,target,type,person,q){const task=queueMission(s,actor,target,type,'location',null,person);assert.equal(task.ok,true);s.world.intelSeed=seedFor(q,q+.01);for(let i=0;i<task.duration;i++)advanceOperations(s);return s.knowledge[actor][target].reports.find(r=>r.kind==='location')}
test('a delayed location report is a dated lead, not a live view of foreign movements',()=>{
 let s=newGame('senate');const r=finish(s,'senate','egypt','spy','cleopatra',.7);assert.equal(r.value,'egypt');assert.equal(r.character,'cleopatra');assert.equal(r.verified,false);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 s.world.characters.cleopatra.location='parthia';s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.knowledge.senate.egypt.reports.find(x=>x.kind==='location').value,'egypt');
 const next=finish(s,'senate','egypt','spy','cleopatra',.7);assert.equal(next.value,'unknown');assert.equal(s.knowledge.senate.egypt.reports[1].value,'egypt');
});
test('an old report can be repeated as misinformation and allies retain its observation date',()=>{
 const s=newGame('senate');s.wars.push(['senate','egypt']);s.world.characters.cleopatra.location='egypt';addReport(s,'senate','egypt',{kind:'location',character:'cleopatra',value:'parthia',source:'spy',observationYear:-50,observationMonth:2});
 const falseReport=finish(s,'senate','egypt','spy','cleopatra',.4);assert.equal(falseReport.value,'parthia');assert.equal(s.world.characters.cleopatra.location,'egypt');
 s.alliances.push(['caesar','senate']);const task=queueMission(s,'caesar','egypt','exchange','location','senate','cleopatra');assert.equal(task.ok,true);s.world.intelSeed=seedFor(.7,.71);for(let i=0;i<task.duration;i++)advanceOperations(s);const forwarded=s.knowledge.caesar.egypt.reports[0];assert.equal(forwarded.value,'parthia');assert.equal(forwarded.originSource,'spy');assert.equal(forwarded.observationYear,falseReport.year);assert.equal(forwarded.verified,false);
});
test('personal meetings and frontier commander sightings preserve theater at the time',()=>{
 let s=newGame('senate');s.world.characters.cicero.location='egypt';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);s.world.intelSeed=1000;advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');assert.equal(s.knowledge.senate.egypt.reports.find(r=>r.kind==='location').value,'egypt');
 observeArmies(s);const sight=s.knowledge.senate.caesar.commanderReports.find(r=>r.commanderId==='caesar');assert.ok(sight);const original=sight.region;s.world.characters.caesar.location='egypt';s.armies.find(a=>a.id==='xiii').region='egypt';s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.knowledge.senate.caesar.commanderReports.find(r=>r.commanderId==='caesar').region,original);
});
