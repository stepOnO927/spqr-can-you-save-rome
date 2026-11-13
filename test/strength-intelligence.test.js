import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,estimatedStrength} from '../engine.js?v=regional-mail-merge-1';
import {queueMission,advanceOperations,addReport,reportEvidence} from '../character-system.js?v=regional-mail-merge-1';
function makeReport(type,seed){const s=newGame('senate');for(const a of s.armies.filter(a=>a.owner==='egypt'))a.men=0;s.armies.find(a=>a.owner==='egypt').men=50000;assert.equal(queueMission(s,'senate','egypt',type,'strength').ok,true);s.operations[0].remaining=1;s.world.intelSeed=seed;advanceOperations(s);return s}
test('strength intelligence is a source-dependent uncertain estimate, not exact hidden strength',()=>{
 const values=new Set();let spy,travelers;for(let i=1;i<300;i++){const seed=(i*7000013)>>>0,s=makeReport('spy',seed),r=s.knowledge.senate.egypt.reports[0];if(r){values.add(r.value);if(!spy)spy=r}const t=makeReport('travelers',seed),tr=t.knowledge.senate.egypt.reports[0];if(tr&&!travelers)travelers=tr}
 assert.ok(values.size>1);assert.ok([...values].some(v=>v!==50000));assert.ok(spy.range[0]<=spy.value&&spy.value<=spy.range[1]);assert.ok(travelers.range[1]>travelers.range[0]);assert.equal(travelers.reliability,'low');assert.equal(travelers.confidence,'rumor');
});
test('overlapping strength estimates are compatible, disjoint estimates conflict, and old numeric saves still work',()=>{
 let s=newGame('senate');const a=addReport(s,'senate','egypt',{kind:'strength',value:10000,range:[8000,12000],source:'spy'});addReport(s,'senate','egypt',{kind:'strength',value:12000,range:[10000,14000],source:'envoy'});assert.equal(a.confidence,'unverified');assert.equal(reportEvidence(s,'senate','egypt',a).compatible.length,1);addReport(s,'senate','egypt',{kind:'strength',value:25000,range:[22000,28000],source:'travelers'});assert.equal(a.confidence,'disputed');s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.knowledge.senate.egypt.reports.length,3);
 const legacy=addReport(s,'senate','parthia',{kind:'strength',value:18000,source:'spy'});assert.equal(estimatedStrength(s,'senate','parthia'),18000);addReport(s,'senate','parthia',{kind:'strength',value:19000,range:[17000,21000],source:'envoy'});assert.equal(legacy.confidence,'unverified');assert.equal(reportEvidence(s,'senate','parthia',legacy).compatible.length,1);
});
test('allies forward the original strength interval and observation date, not hidden troops',()=>{
 const s=newGame('senate');s.alliances.push(['senate','parthia']);addReport(s,'parthia','egypt',{kind:'strength',value:12000,range:[9000,15000],source:'spy',observationYear:-50,observationMonth:8});assert.equal(queueMission(s,'senate','egypt','exchange','strength','parthia').ok,true);s.operations[0].remaining=1;s.world.intelSeed=1000;advanceOperations(s);const original=s.knowledge.parthia.egypt.reports[0],forwarded=s.knowledge.senate.egypt.reports[0];assert.deepEqual(forwarded.range,[9000,15000]);assert.notEqual(forwarded.range,original.range);assert.equal(forwarded.observationYear,-50);assert.equal(forwarded.originSource,'spy');assert.equal(forwarded.verified,false);
});

test('misleading wartime strength estimates can exclude the true strength',()=>{
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.4&&q<.44});const s=newGame('senate');s.wars.push(['senate','egypt']);for(const a of s.armies.filter(a=>a.owner==='egypt'))a.men=0;s.armies.find(a=>a.owner==='egypt').men=50000;queueMission(s,'senate','egypt','spy','strength');s.operations[0].remaining=1;s.world.intelSeed=seed;advanceOperations(s);const r=s.knowledge.senate.egypt.reports[0];assert.ok(r.range[1]<50000);assert.equal(r.verified,false);
});
