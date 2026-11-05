import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,diplomacy} from '../engine.js';
import {previewPersonTravel,startPersonTravel,requestPersonalMeeting,advancePersonalDiplomacy,personalDiplomaticCredit} from '../personal-diplomacy.js';
import {addReport,contestLeadership} from '../character-system.js';

test('a claimant can be contacted only after a report, and the request does not reveal hidden court status',()=>{
 const s=newGame('senate');s.knowledge.senate.egypt.reportedLeaders=['ptolemy'];contestLeadership(s,'egypt','cleopatra');s.world.characters.cicero.location='egypt';
 assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').reason,'unavailable');
 addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'rumor'});
 assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);assert.equal(s.meetings[0].remaining,2);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 s.world.intelSeed=1000;advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');assert.equal(s.world.personalRelations['cicero:cleopatra'].meetings,1);
});
test('a stale claimant report permits the same request but may lead to no contact',()=>{
 const s=newGame('senate');s.knowledge.senate.egypt.reportedLeaders=['ptolemy'];addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'travelers',confidence:'rumor'});
 s.world.characters.cleopatra.faction='caesar';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');
});

test('meeting requests follow the reported court, not hidden allegiance or historical affiliation',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='italia';
 s.knowledge.senate.caesar.reportedLeaders=['antony'];s.world.characters.antony.faction='caesar';
 assert.equal(requestPersonalMeeting(s,'cicero','antony','caesar').ok,true);
 assert.equal(s.meetings[0].targetFaction,'caesar');
 const stale=newGame('senate');stale.knowledge.senate.caesar.reportedLeaders=['antony'];stale.world.characters.antony.faction='senate';
 assert.equal(requestPersonalMeeting(stale,'cicero','antony','caesar').ok,true);
 advancePersonalDiplomacy(stale);advancePersonalDiplomacy(stale);
 assert.equal(stale.meetings[0].status,'no_contact');
 const unknown=newGame('senate');assert.equal(requestPersonalMeeting(unknown,'cicero','antony','egypt').ok,false);
});

test('civilian journeys cost resources, take time, and survive a save',()=>{
 let s=newGame('senate');const p=previewPersonTravel(s,'cicero','epirus');assert.equal(p.ok,true);assert.ok(p.months>1);const treasury=s.factions.senate.treasury;assert.equal(startPersonTravel(s,'cicero','epirus').ok,true);assert.equal(s.factions.senate.treasury,treasury-p.cost);assert.equal(s.world.characters.cicero.location,'roma');s=upgradeSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<p.months-1;i++)advancePersonalDiplomacy(s);assert.notEqual(s.world.characters.cicero.location,'epirus');advancePersonalDiplomacy(s);assert.equal(s.world.characters.cicero.location,'epirus');assert.equal(s.world.characters.cicero.travel,undefined);
});
test('journeys stop when a route becomes hostile; commanders cannot abandon an army',()=>{
 const s=newGame('senate');assert.equal(previewPersonTravel(s,'pompey','italiaS').ok,false);assert.equal(startPersonTravel(s,'cicero','epirus').ok,true);s.regions.find(r=>r.id==='italiaS').owner='caesar';advancePersonalDiplomacy(s);assert.equal(s.world.characters.cicero.location,'roma');assert.equal(s.world.characters.cicero.travel,undefined);
});
test('requests do not reveal whether a reported foreign leader is actually present',()=>{
 const s=newGame('senate');s.world.characters.cleopatra.location='parthia';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);assert.equal(s.meetings[0].status,'pending');advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'pending');advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');assert.deepEqual(s.world.personalRelations,{});assert.equal(s.knowledge.senate.egypt.reports.length,0);
});
test('a meeting needs co-location and creates only the observer’s dated report and personal trust',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.characters.cleopatra.health='ill';s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');assert.equal(s.world.personalRelations['cicero:cleopatra'].meetings,1);assert.equal(s.knowledge.senate.egypt.reports[0].source,'meeting');assert.equal(s.knowledge.senate.egypt.reports[0].value,'unknown');const age=s.knowledge.senate.egypt.reports.find(r=>r.kind==='age');assert.deepEqual(age.value,[19,21]);assert.equal(age.source,'meeting');assert.equal(age.confidence,'unverified');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('personal audience may be refused or unanswered and records persist',()=>{
 for(const [seed,expected] of [[0,'declined'],[1972,'no_reply']]){const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.intelSeed=seed;requestPersonalMeeting(s,'cicero','cleopatra');advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,expected);assert.deepEqual(s.world.personalRelations,{});assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).meetings[0].status,expected)}
});
test('ordinary campaign month advancement progresses personal requests',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='egypt';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);tick(s);assert.equal(s.meetings[0].remaining,1);tick(s);assert.notEqual(s.meetings[0].status,'pending');
});
test('successful meetings improve bilateral relations and trust affects later acceptance',()=>{
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>.34&&q<.36});
 function trial(trust,relations){const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.personalRelations['cicero:cleopatra']={trust,meetings:trust?1:0};s.relations['egypt:senate']=relations;requestPersonalMeeting(s,'cicero','cleopatra');s.world.intelSeed=seed;advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);return s}
 const cold=trial(0,0),warm=trial(50,50);assert.equal(cold.meetings[0].status,'declined');assert.equal(cold.relations['egypt:senate'],0);assert.equal(warm.meetings[0].status,'met');assert.equal(warm.world.personalRelations['cicero:cleopatra'].trust,55);assert.equal(warm.relations['egypt:senate'],53);
});
test('an incapacitated or departed envoy cannot complete a pending personal meeting',()=>{
 for(const change of [c=>c.health='dying',c=>c.faction='caesar']){const s=newGame('senate');s.world.characters.cicero.location='egypt';requestPersonalMeeting(s,'cicero','cleopatra');change(s.world.characters.cicero);s.world.intelSeed=1000;advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');assert.deepEqual(s.world.personalRelations,{});assert.equal(s.relations['egypt:senate'],undefined)}
});

test('a meeting with Ptolemy can yield only a dated age range to the observer',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='egypt';assert.equal(s.knowledge.senate.egypt.reports.some(r=>r.kind==='age'&&r.character==='ptolemy'),false);s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','ptolemy').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');const report=s.knowledge.senate.egypt.reports.find(r=>r.kind==='age'&&r.character==='ptolemy');assert.deepEqual(report.value,[11,13]);assert.equal(report.confidence,'unverified');assert.equal(report.source,'meeting');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});

test('a recent personal meeting can help meet the alliance threshold without guaranteeing an alliance',()=>{
 const baseline=newGame('senate');baseline.relations['egypt:senate']=29;assert.equal(diplomacy(baseline,'senate','egypt','alliance'),false);
 let s=newGame('senate');s.relations['egypt:senate']=26;s.world.characters.cicero.location='egypt';s.world.intelSeed=1000;
 assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);
 assert.equal(s.meetings[0].status,'met');assert.equal(s.relations['egypt:senate'],29);assert.equal(personalDiplomaticCredit(s,'senate','egypt'),1);assert.equal(personalDiplomaticCredit(s,'caesar','egypt'),0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const conflict=upgradeSave(JSON.parse(JSON.stringify(s)));conflict.alliances.push(['caesar','egypt']);assert.equal(diplomacy(conflict,'senate','egypt','alliance'),false);
 assert.equal(diplomacy(s,'senate','egypt','alliance'),true);
});
test('contact credit uses only recorded meetings and expires without revealing hidden foreign state',()=>{
 const s=newGame('senate');s.world.personalRelations['cicero:cleopatra']={trust:100,meetings:1};assert.equal(personalDiplomaticCredit(s,'senate','egypt'),0);
 s.meetings.push({actor:'senate',targetFaction:'egypt',person:'cicero',target:'cleopatra',status:'met',year:s.year,month:s.month});assert.equal(personalDiplomaticCredit(s,'senate','egypt'),10);
 s.world.characters.cleopatra.faction='parthia';s.world.characters.cleopatra.health='dying';s.world.characters.cleopatra.location='parthia';assert.equal(personalDiplomaticCredit(s,'senate','egypt'),10);
 s.year+=3;assert.equal(personalDiplomaticCredit(s,'senate','egypt'),10);s.month++;assert.equal(personalDiplomaticCredit(s,'senate','egypt'),0);
});

test('missing participants cannot travel or complete a personal audience, even with a stale location',()=>{
 const missing=newGame('senate');missing.world.characters.cicero.missing={origin:'roma',remaining:2};
 assert.equal(previewPersonTravel(missing,'cicero','epirus').reason,'unavailable');
 assert.equal(requestPersonalMeeting(missing,'cicero','cleopatra','egypt').reason,'unavailable');
 for(const id of ['cicero','cleopatra']){
  let s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.intelSeed=1000;
  assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);
  s.world.characters[id].missing={origin:'egypt',remaining:2};
  s=upgradeSave(JSON.parse(JSON.stringify(s)));advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);
  assert.equal(s.meetings[0].status,'no_contact');assert.deepEqual(s.world.personalRelations,{});
  assert.equal(s.knowledge.senate.egypt.reports.length,0);
 }
});
