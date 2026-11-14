import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=frontier-response-1';
import {addReport,reportEvidence,queueMission,advanceOperations,reportedHealthSubjects} from '../character-system.js?v=portraits-hundred-days-1';
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
test('same-month independent reports expire together as evidence ages',()=>{
 const s=newGame('caesar'),t='egypt';for(const source of ['spy','envoy','travelers'])addReport(s,'caesar',t,{kind:'leaders',leaders:['ptolemy'],source,confidence:'unverified'});
 const current=s.knowledge.caesar.egypt.reports[0];assert.equal(current.confidence,'confirmed');s.year=-47;s.month=1;tick(s);
 assert.equal(leadershipIntelligence(s,'caesar',t).confidence,'outdated');assert.equal(reportEvidence(s,'caesar',t,current).unavailable,true);assert.equal(s.knowledge.senate.egypt.reports.length,0);
});
test('reports observed in different months form a timeline rather than a contradiction or corroboration',()=>{
 const s=newGame('caesar');s.month=1;const old=addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});s.month=2;const newer=addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});assert.equal(newer.confidence,'unverified');let e=reportEvidence(s,'caesar','egypt',newer);assert.deepEqual(e.conflict,[]);assert.deepEqual(e.differentTime.map(x=>x.family),['spy']);
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'travelers',confidence:'rumor'});assert.equal(newer.confidence,'credible');e=reportEvidence(s,'caesar','egypt',newer);assert.deepEqual(e.support.map(x=>x.family).sort(),['court','travelers']);assert.equal(old.confidence,'unverified');
});
test('loading an old save recalculates fresh confidence without deleting old reports',()=>{
 const s=newGame('caesar');for(const source of ['spy','envoy','travelers'])addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source,confidence:'unverified'});s.year=-47;s.month=2;
 const newer=addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});newer.confidence='confirmed';newer.verified=true;const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.knowledge.caesar.egypt.reports.length,4);assert.equal(restored.knowledge.caesar.egypt.reports[0].confidence,'unverified');assert.equal(restored.knowledge.caesar.egypt.reports[0].verified,false);
});

test('empty leader and claimant reports cannot corroborate absence or contradict named evidence',()=>{
 const s=newGame('caesar'),target='egypt';const known=addReport(s,'caesar',target,{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});
 for(const source of ['spy','envoy','travelers'])addReport(s,'caesar',target,{kind:'claimants',leaders:[],source,confidence:'confirmed'});
 assert.equal(known.confidence,'unverified');assert.equal(known.verified,false);assert.deepEqual(reportEvidence(s,'caesar',target,known).conflict,[]);
 for(const r of s.knowledge.caesar.egypt.reports.filter(r=>r.kind==='claimants'&&!r.leaders.length)){assert.equal(r.confidence,'unverified');assert.equal(r.verified,false);assert.equal(reportEvidence(s,'caesar',target,r).unavailable,true)}
});
test('a no-name leader report preserves the last named report and an older forwarded name is not masked by no-name results',()=>{
 const s=newGame('caesar'),target='egypt';s.month=3;addReport(s,'caesar',target,{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});s.month=7;addReport(s,'caesar',target,{kind:'leaders',leaders:[],source:'envoy',confidence:'unverified'});
 assert.deepEqual(s.knowledge.caesar.egypt.reportedLeaders,['ptolemy']);assert.equal(leadershipIntelligence(s,'caesar',target).confidence,'unverified');assert.deepEqual(leadershipIntelligence(s,'caesar',target).observed,{year:-49,month:3});
 const t=newGame('caesar');t.knowledge.caesar.egypt.reportedLeaders=[];t.month=7;addReport(t,'caesar',target,{kind:'leaders',leaders:[],source:'spy',confidence:'unverified'});addReport(t,'caesar',target,{kind:'leaders',leaders:['ptolemy'],source:'exchange',originSource:'court',observationYear:-49,observationMonth:3,confidence:'unverified'});assert.deepEqual(t.knowledge.caesar.egypt.reportedLeaders,['ptolemy']);
});
test('loading older saves removes false corroboration of unknown names and recovers only recorded names',()=>{
 const s=newGame('caesar'),target='egypt';addReport(s,'caesar',target,{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});for(const source of ['envoy','travelers','spy'])addReport(s,'caesar',target,{kind:'leaders',leaders:[],source,confidence:'unverified'});
 s.knowledge.caesar.egypt.reportedLeaders=[];for(const r of s.knowledge.caesar.egypt.reports.filter(r=>!r.leaders.length)){r.confidence='confirmed';r.verified=true}const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.knowledge.caesar.egypt.reportedLeaders,['ptolemy']);assert.ok(loaded.knowledge.caesar.egypt.reports.filter(r=>!r.leaders.length).every(r=>!r.verified&&r.confidence==='unverified'));assert.equal(leadershipIntelligence(loaded,'caesar',target).confidence,'unverified');
 const empty=newGame('caesar');empty.knowledge.caesar.egypt.reportedLeaders=[];addReport(empty,'caesar',target,{kind:'leaders',leaders:[],source:'spy',confidence:'unverified'});empty.world.leadership.egypt=['ptolemy'];const clean=upgradeSave(JSON.parse(JSON.stringify(empty)));assert.deepEqual(clean.knowledge.caesar.egypt.reportedLeaders,[]);assert.equal(leadershipIntelligence(clean,'caesar',target).confidence,'unknown');
});

test('overlapping age estimates are compatible but do not independently corroborate the exact range',()=>{
 const s=newGame('caesar'),t='egypt';const first=addReport(s,'caesar',t,{kind:'age',character:'ptolemy',value:[19,21],source:'meeting'});
 addReport(s,'caesar',t,{kind:'age',character:'ptolemy',value:[20,22],source:'envoy'});
 assert.equal(first.confidence,'unverified');assert.equal(first.verified,false);let e=reportEvidence(s,'caesar',t,first);assert.deepEqual(e.conflict,[]);assert.deepEqual(e.compatible.map(x=>x.family),['court']);assert.deepEqual(e.support.map(x=>x.family),['meeting']);
 addReport(s,'caesar',t,{kind:'age',character:'ptolemy',value:[19,21],source:'spy'});assert.equal(first.confidence,'credible');
 addReport(s,'caesar',t,{kind:'age',character:'ptolemy',value:[23,25],source:'travelers'});assert.equal(first.confidence,'disputed');e=reportEvidence(s,'caesar',t,first);assert.deepEqual(e.conflict.map(x=>x.family),['travelers']);
});


test('partial name lists can coexist, but an asserted complete list can conflict',()=>{
 const s=newGame('caesar'),t='egypt';const cleo=addReport(s,'caesar',t,{kind:'leaders',leaders:['cleopatra'],source:'travelers',confidence:'rumor'});const ptolemy=addReport(s,'caesar',t,{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});assert.equal(cleo.confidence,'rumor');assert.equal(ptolemy.confidence,'unverified');assert.deepEqual(reportEvidence(s,'caesar',t,cleo).conflict,[]);assert.deepEqual(reportEvidence(s,'caesar',t,cleo).compatible.map(x=>x.family),['spy']);
 const full=addReport(s,'caesar',t,{kind:'leaders',leaders:['cleopatra'],exhaustive:true,source:'envoy',confidence:'unverified'});assert.equal(full.confidence,'disputed');assert.equal(ptolemy.confidence,'disputed');assert.deepEqual(reportEvidence(s,'caesar',t,full).conflict.map(x=>x.family),['spy']);assert.ok(!full.verified);
});
test('a partial matching list cannot independently verify an asserted complete roster',()=>{
 const s=newGame('caesar'),t='egypt';const full=addReport(s,'caesar',t,{kind:'claimants',leaders:['ptolemy'],exhaustive:true,source:'envoy',confidence:'unverified'});addReport(s,'caesar',t,{kind:'claimants',leaders:['ptolemy'],source:'spy',confidence:'unverified'});assert.equal(full.confidence,'unverified');assert.deepEqual(reportEvidence(s,'caesar',t,full).compatible.map(x=>x.family),['spy']);
 const again=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(again.knowledge.caesar.egypt.reports.find(r=>r.exhaustive).confidence,'unverified');
});
test('allied forwarding retains a source claim of completeness without treating it as truth',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','numidia']);addReport(s,'numidia','egypt',{kind:'leaders',leaders:['ptolemy'],exhaustive:true,source:'envoy',confidence:'unverified'});assert.equal(queueMission(s,'caesar','egypt','exchange','leaders','numidia').ok,true);s.world.intelSeed=1972+5000;for(let i=0;i<3;i++)advanceOperations(s);const copied=s.knowledge.caesar.egypt.reports[0];assert.equal(copied.exhaustive,true);assert.equal(copied.originSource,'court');assert.equal(copied.verified,false);
});

test('names in older partial reports remain investigable leads, without becoming current leaders',()=>{
 let s=newGame('caesar');s.month=2;addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra'],source:'travelers'});
 s.month=3;addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy'});
 assert.deepEqual(s.knowledge.caesar.egypt.reportedLeaders,['ptolemy']);
 assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes('cleopatra'));
 assert.equal(queueMission(s,'caesar','egypt','spy','health',null,'cleopatra').ok,true);
 assert.ok(!reportedHealthSubjects(s,'senate','egypt').includes('antony'));
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(s.knowledge.caesar.egypt.reportedLeaders,['ptolemy']);
 assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes('cleopatra'));
});

test('lead eligibility comes from the observer’s records, not the simulated court',()=>{
 const s=newGame('caesar');s.knowledge.caesar.egypt.reportedLeaders=[];s.knowledge.senate.egypt.reportedLeaders=[];
 s.world.leadership.egypt=['cleopatra'];s.world.claimants.egypt=['ptolemy'];
 assert.deepEqual(reportedHealthSubjects(s,'caesar','egypt'),[]);
 addReport(s,'senate','egypt',{kind:'claimants',leaders:['ptolemy'],source:'travelers'});
 assert.deepEqual(reportedHealthSubjects(s,'caesar','egypt'),[]);
 assert.deepEqual(reportedHealthSubjects(s,'senate','egypt'),['ptolemy']);
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'unknown',source:'spy'});
 assert.deepEqual(reportedHealthSubjects(s,'caesar','egypt'),['cleopatra']);
});

test('a health mission does not expose a reported person who left the investigated court or is missing',()=>{
 for(const change of [c=>{c.faction='parthia';c.health='dying'},c=>{c.missing={origin:'egypt',remaining:2};c.health='dying'}]){
  let s=newGame('caesar');s.knowledge.caesar.egypt.reportedLeaders=['cleopatra'];
  change(s.world.characters.cleopatra);const mission=queueMission(s,'caesar','egypt','spy','health',null,'cleopatra');
  assert.equal(mission.ok,true);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;
  for(let i=0;i<mission.duration;i++)advanceOperations(s);
  const result=s.knowledge.caesar.egypt.reports.find(r=>r.kind==='health');
  assert.equal(s.operations[0].status,'complete');assert.equal(result.character,'cleopatra');assert.equal(result.value,'unknown');
  assert.equal(s.knowledge.senate.egypt.reports.length,0);
 }
 const s=newGame('caesar');s.world.characters.cleopatra.health='dying';
 const mission=queueMission(s,'caesar','egypt','spy','health',null,'cleopatra');s.world.intelSeed=1000;
 for(let i=0;i<mission.duration;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.egypt.reports[0].value,'dying');
});
