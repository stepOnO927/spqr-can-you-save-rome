import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,sendInquiry,tick,upgradeSave} from '../engine.js?v=player-aid-letter-1';

function prepared(relation,withClashes,wanted){
 const start=newGame('caesar');start.relations['caesar:egypt']=relation;
 if(withClashes)start.world.disputeHistory.unshift({faction:'egypt',outcome:'clashes',year:start.year,month:start.month});
 assert.equal(sendInquiry(start,'caesar','egypt','clashes').duration,4);tick(start);
 for(let i=1;i<500;i++){const s=upgradeSave(JSON.parse(JSON.stringify(start)));s.seed=(i*7000013)>>>0;tick(s);if(s.inquiries[0].sealed?.report?.value===wanted)return s}
 throw Error('No matching response found');
}
function deliver(start){
 for(let i=1;i<500;i++){const s=upgradeSave(JSON.parse(JSON.stringify(start)));s.world.disputeHistory=[];s.seed=(i*7000013)>>>0;tick(s);tick(s);if(s.inquiries[0].status==='answered')return s}
 throw Error('No delivered response found');
}
test('clash inquiries are delayed and a cooperative admission reflects composition time',()=>{
 const s=prepared(50,true,'reported');assert.equal(s.inquiries[0].status,'pending');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 const answered=deliver(s),letter=answered.inquiries[0],report=answered.knowledge.caesar.egypt.reports[0];
 assert.equal(letter.status,'answered');assert.match(letter.claim[1],/承认/);assert.equal(report.kind,'clashes');assert.equal(report.value,'reported');assert.equal(report.source,'official');assert.equal(report.verified,false);assert.equal(report.observationMonth,letter.responseMonth);assert.equal(answered.knowledge.senate.egypt.reports.length,0);
});
test('a hostile court may deny real clashes; an unanswered or lost letter reveals nothing',()=>{
 const denied=deliver(prepared(-30,true,'denied'));assert.match(denied.inquiries[0].claim[1],/否认/);assert.equal(denied.knowledge.caesar.egypt.reports[0].value,'denied');
 const s=newGame('caesar');assert.equal(sendInquiry(s,'caesar','numidia','clashes').reason,'subject');sendInquiry(s,'caesar','egypt','clashes');s.inquiries[0].remaining=1;s.inquiries[0].sealed={status:'answered',year:s.year,month:s.month,claim:['Secret','秘密'],report:{kind:'clashes',value:'reported'}};
 let lost;for(let i=1;i<500&&!lost;i++){const trial=upgradeSave(JSON.parse(JSON.stringify(s)));trial.seed=(i*7000013)>>>0;tick(trial);if(trial.inquiries[0].status==='no_reply')lost=trial}
 assert.ok(lost);assert.equal(lost.inquiries[0].claim,undefined);assert.equal(lost.knowledge.caesar.egypt.reports.length,0);
});
