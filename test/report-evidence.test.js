import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {addReport,reportEvidence} from '../character-system.js';

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
