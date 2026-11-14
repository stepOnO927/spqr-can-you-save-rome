import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=government-intel-courier-1';
import {initializeCursus,previewGovernmentInquiry,investigateGovernment,governmentReport,advanceCursus} from '../cursus-honorum.js?v=government-intel-courier-1';

function setup(stage=0){const s=newGame('caesar'),c=initializeCursus(s);s.month=3;s.factions.caesar.treasury=500;c.intel.caesar={parthia:{stage,reports:[]}};return {s,c}}
function step(s,seed=1000){s.world.intelSeed=seed;s.month++;advanceCursus(s)}

test('an inquiry preview shows actual cost and duration without spending',()=>{
 const {s}=setup();const funds=s.factions.caesar.treasury,plan=previewGovernmentInquiry(s,'parthia');assert.deepEqual(plan,{ok:true,cost:8,months:3,stage:1});assert.equal(s.factions.caesar.treasury,funds);assert.equal(governmentReport(s,'parthia').pending,undefined);
 assert.deepEqual(investigateGovernment(s,'parthia'),plan);assert.equal(s.factions.caesar.treasury,funds-plan.cost);assert.equal(previewGovernmentInquiry(s,'parthia').reason,'pending');
});

test('foreign office intelligence is sealed at observation and delivered later',()=>{
 let {s,c}=setup(2);const old=c.foreignPosts.parthia.administration,replacement=c.foreignPosts.parthia.scholar;
 const plan=investigateGovernment(s,'parthia');assert.equal(plan.months,5);const funds=s.factions.caesar.treasury;
 step(s);step(s);assert.equal(governmentReport(s,'parthia').reports.length,0);step(s);
 assert.equal(c.intel.caesar.parthia.pending.sealed.record.officeholders.administration,old);
 assert.equal(governmentReport(s,'parthia').pending.sealed,undefined);assert.equal(governmentReport(s,'parthia').reports.length,0);
 c.foreignPosts.parthia.administration=replacement;s=upgradeSave(JSON.parse(JSON.stringify(s)));c=s.world.cursus;assert.equal(s.factions.caesar.treasury,funds);
 assert.equal(governmentReport(s,'parthia').pending.sealed,undefined);step(s);step(s);
 const report=governmentReport(s,'parthia').reports.at(-1);assert.equal(report.officeholders.administration,old);assert.notEqual(report.officeholders.administration,replacement);
 assert.ok(report.observed.year*12+report.observed.month<report.delivered.year*12+report.delivered.month);assert.equal(c.intel.caesar.parthia.pending,undefined);
});
test('requests can be lost or refused and do not reveal a sealed response',()=>{
 for(const [observationSeed,returnSeed,wanted] of [[2000,1000,'no_reply'],[1,1000,'refused'],[1000,2000,'no_reply'],[1000,1000,'report']]){
  const {s}=setup();assert.ok(investigateGovernment(s,'parthia').ok);step(s);step(s,observationSeed);
  const mid=governmentReport(s,'parthia');assert.equal(mid.reports.length,0);assert.equal(mid.pending.sealed,undefined);assert.equal(mid.lastOutcome,undefined);
  step(s,returnSeed);const final=governmentReport(s,'parthia');assert.equal(final.lastOutcome.status,wanted);assert.equal(final.stage,wanted==='report'?1:0);assert.equal(final.reports.length,wanted==='report'?1:0);
  if(wanted!=='report')assert.ok(investigateGovernment(s,'parthia').ok);
 }
});
test('a legacy in-flight investigation can resolve without fabricating an earlier observation',()=>{
 let {s,c}=setup();assert.ok(investigateGovernment(s,'parthia').ok);c.intel.caesar.parthia.pending={remaining:1,cost:5,stage:1};
 s=upgradeSave(JSON.parse(JSON.stringify(s)));step(s);const result=governmentReport(s,'parthia');assert.equal(result.stage,1);assert.deepEqual(result.reports[0].observed,result.reports[0].delivered);
});
