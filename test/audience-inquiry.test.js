import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,sendInquiry,tick,upgradeSave} from '../engine.js?v=newborn-age-1';
import {queueMission,advanceOperations,previewMission} from '../character-system.js?v=newborn-age-1';
function prepared(available,wanted){
 const start=newGame('caesar');start.relations['caesar:egypt']=50;if(!available)start.world.characters.cleopatra.health='seriously_ill';assert.equal(sendInquiry(start,'caesar','egypt','availability').duration,4);tick(start);
 for(let i=1;i<500;i++){const s=upgradeSave(JSON.parse(JSON.stringify(start)));s.seed=(i*7000013)>>>0;tick(s);if(s.inquiries[0].sealed?.report?.value===wanted)return s}throw Error('No matching official response');
}
function deliver(start){for(let i=1;i<500;i++){const s=upgradeSave(JSON.parse(JSON.stringify(start)));s.seed=(i*7000013)>>>0;tick(s);tick(s);if(s.inquiries[0].status==='answered')return s}throw Error('No delivered answer')}
test('a court can invite a further audience request without promising a meeting, and information waits for delivery',()=>{
 const s=prepared(true,'open');assert.equal(s.inquiries[0].status,'pending');assert.equal(s.inquiries[0].claim,undefined);assert.equal(s.knowledge.caesar.egypt.reports.length,0);s.world.characters.cleopatra.health='dying';const a=deliver(s),letter=a.inquiries[0],report=a.knowledge.caesar.egypt.reports[0];assert.match(letter.claim[1],/不保证/);assert.equal(report.value,'open');assert.equal(report.source,'official');assert.equal(report.verified,false);assert.equal(report.observationMonth,letter.responseMonth);assert.equal(a.knowledge.senate.egypt.reports.length,0);
});
test('a court can defer, and a lost reply does not publish the sealed answer',()=>{
 const a=deliver(prepared(false,'deferred'));assert.match(a.inquiries[0].claim[1],/暂缓/);assert.equal(a.knowledge.caesar.egypt.reports[0].value,'deferred');
 const start=prepared(true,'open');start.inquiries[0].remaining=1;let lost;for(let i=1;i<500&&!lost;i++){const s=upgradeSave(JSON.parse(JSON.stringify(start)));s.seed=(i*7000013)>>>0;tick(s);if(s.inquiries[0].status==='no_reply')lost=s}assert.ok(lost);assert.equal(lost.inquiries[0].claim,undefined);assert.equal(lost.knowledge.caesar.egypt.reports.length,0);
});
test('an ally can forward a dated audience statement but a spy cannot obtain an exact court response',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','parthia']);s.knowledge.parthia.egypt.reports.unshift({kind:'availability',value:'deferred',source:'official',year:-49,month:1,confidence:'unverified'});assert.equal(previewMission(s,'caesar','egypt','spy','availability').reason,'subject');assert.equal(queueMission(s,'caesar','egypt','exchange','availability','parthia').ok,true);s.world.intelSeed=1000;for(let i=0;i<3;i++)advanceOperations(s);const r=s.knowledge.caesar.egypt.reports[0];assert.equal(r.value,'deferred');assert.equal(r.source,'exchange');assert.equal(r.originSource,'court');assert.equal(r.observationYear,-49);assert.equal(r.verified,false);
});
