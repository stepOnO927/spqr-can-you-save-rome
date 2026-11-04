import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {addReport,reportEvidence} from '../character-system.js';
import {leadershipIntelligence} from '../map-lab/intelligence-summary.js';

test('evidence identifies independent support and conflicts without counting forwarded duplicates',()=>{
 const s=newGame('caesar'),target='egypt';const initial=addReport(s,'caesar',target,{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 addReport(s,'caesar',target,{kind:'health',character:'cleopatra',value:'ill',source:'exchange',originSource:'spy',confidence:'unverified'});
 addReport(s,'caesar',target,{kind:'health',character:'cleopatra',value:'ill',source:'envoy',confidence:'unverified'});
 addReport(s,'caesar',target,{kind:'health',character:'cleopatra',value:'healthy',source:'travelers',confidence:'rumor'});
 const e=reportEvidence(s,'caesar',target,initial);assert.deepEqual(e.support.map(x=>x.family).sort(),['court','spy']);assert.deepEqual(e.conflict.map(x=>x.family),['travelers']);assert.equal(initial.confidence,'disputed');assert.equal(e.inheritedDispute,false);
 assert.equal(reportEvidence(s,'senate',target,initial).unavailable,true);
});
test('unknown and outdated information cannot serve as current corroboration',()=>{
 const s=newGame('caesar'),t='egypt',unknown=addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'unknown',source:'envoy',confidence:'unverified'});
 assert.equal(reportEvidence(s,'caesar',t,unknown).unavailable,true);const old=addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});s.year+=3;
 const fresh=addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'ill',source:'travelers',confidence:'rumor'});assert.equal(reportEvidence(s,'caesar',t,old).unavailable,true);assert.deepEqual(reportEvidence(s,'caesar',t,fresh).support.map(x=>x.family),['travelers']);
});
test('trimming old evidence removes corroboration that can no longer be inspected',()=>{
 const s=newGame('caesar'),t='egypt';for(const source of ['spy','envoy','travelers'])addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'ill',source,confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].verified,true);for(let i=0;i<29;i++)addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports.length,30);assert.equal(s.knowledge.caesar.egypt.reports[0].verified,false);assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'credible');
 addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'unverified');
});
test('a forwarded report can preserve an inherited dispute even without its original conflicting evidence',()=>{
 const s=newGame('caesar'),r=addReport(s,'caesar','egypt',{kind:'strength',value:9000,source:'exchange',originSource:'spy',confidence:'disputed'});const e=reportEvidence(s,'caesar','egypt',r);
 assert.equal(e.inheritedDispute,true);assert.deepEqual(e.conflict,[]);assert.equal(r.confidence,'disputed');
});
test('a forwarded report with missing provenance does not count as an independent source',()=>{
 const s=newGame('caesar'),t='egypt';for(const source of ['spy','envoy','exchange'])addReport(s,'caesar',t,{kind:'health',character:'cleopatra',value:'ill',source,confidence:'unverified'});
 const latest=s.knowledge.caesar.egypt.reports[0],e=reportEvidence(s,'caesar',t,latest);assert.equal(latest.confidence,'credible');assert.equal(latest.verified,false);assert.equal(e.support.length,2);assert.equal(e.unattributed,1);
});
test('a single report cannot promote itself to confirmed without independent evidence',()=>{
 const s=newGame('caesar'),r=addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'envoy',confidence:'confirmed'});assert.equal(r.confidence,'unverified');assert.equal(r.verified,false);assert.equal(reportEvidence(s,'caesar','egypt',r).support.length,1);
});
test('monthly time expires a supporting source and updates the visible leadership confidence',()=>{
 const s=newGame('caesar'),t='egypt';for(const [month,source] of [[1,'spy'],[8,'envoy'],[12,'travelers']]){s.month=month;addReport(s,'caesar',t,{kind:'leaders',leaders:['ptolemy'],source,confidence:'unverified'})}
 const current=s.knowledge.caesar.egypt.reports[0];assert.equal(current.confidence,'confirmed');s.year=-47;s.month=1;tick(s);
 assert.equal(current.confidence,'credible');assert.equal(current.verified,false);assert.deepEqual(reportEvidence(s,'caesar',t,current).support.map(x=>x.family).sort(),['court','travelers']);assert.equal(leadershipIntelligence(s,'caesar',t).confidence,'credible');assert.equal(s.knowledge.senate.egypt.reports.length,0);
});
test('a conflict can expire on a normal turn without a new mission',()=>{
 const s=newGame('caesar');s.month=1;addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});s.month=2;const newer=addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});assert.equal(newer.confidence,'disputed');
 s.year=-47;s.month=1;tick(s);assert.equal(newer.confidence,'unverified');assert.deepEqual(reportEvidence(s,'caesar','egypt',newer).conflict,[]);
});
test('loading an old save recalculates fresh confidence without deleting old reports',()=>{
 const s=newGame('caesar');for(const source of ['spy','envoy','travelers'])addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source,confidence:'unverified'});s.year=-47;s.month=2;
 const newer=addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});newer.confidence='confirmed';newer.verified=true;const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.knowledge.caesar.egypt.reports.length,4);assert.equal(restored.knowledge.caesar.egypt.reports[0].confidence,'unverified');assert.equal(restored.knowledge.caesar.egypt.reports[0].verified,false);
});
