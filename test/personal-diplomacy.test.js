import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,diplomacy} from '../engine.js?v=born-portraits-1';
import {previewPersonTravel,startPersonTravel,setJourneyHalt,requestPersonalMeeting,advancePersonalDiplomacy,personalDiplomaticCredit} from '../personal-diplomacy.js?v=born-portraits-1';
import {addReport,contestLeadership} from '../character-system.js?v=born-portraits-1';

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
test('a traveler can be ordered to stop at the next theater without teleporting or a refund',()=>{
 let s=newGame('senate');const plan=startPersonTravel(s,'cicero','epirus');assert.equal(plan.ok,true);assert.ok(plan.legs.length>1);
 const origin=s.world.characters.cicero.location,treasury=s.factions.senate.treasury;
 assert.equal(setJourneyHalt(s,'cicero',true).ok,true);assert.equal(s.world.characters.cicero.location,origin);assert.equal(s.factions.senate.treasury,treasury);
 assert.equal(setJourneyHalt(s,'cicero',true).reason,'unchanged');assert.equal(setJourneyHalt(s,'cicero',false).ok,true);assert.equal(setJourneyHalt(s,'cicero',true).ok,true);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<plan.legs[0].months-1;i++)advancePersonalDiplomacy(s);
 assert.equal(s.world.characters.cicero.location,origin);assert.equal(s.world.characters.cicero.travel.haltAfterLeg,true);
 advancePersonalDiplomacy(s);assert.equal(s.world.characters.cicero.location,plan.legs[0].to);assert.equal(s.world.characters.cicero.travel,undefined);assert.equal(s.factions.senate.treasury,treasury);assert.match(s.log[0].zh,/按命令.*停下/);
 assert.equal(setJourneyHalt(s,'cicero',true).reason,'unavailable');
});
test('a stop order cannot reveal or bypass hostile control at the next theater',()=>{
 const s=newGame('senate'),plan=startPersonTravel(s,'cicero','epirus');assert.equal(setJourneyHalt(s,'cicero',true).ok,true);s.regions.find(r=>r.id===plan.legs[0].to).owner='caesar';
 for(let i=0;i<plan.legs[0].months;i++)advancePersonalDiplomacy(s);
 assert.equal(s.world.characters.cicero.location,'roma');assert.equal(s.world.characters.cicero.travel,undefined);assert.match(s.log[0].zh,/无法安全进入/);
 const other=newGame('senate');other.world.characters.cleopatra.travel={legs:[{to:'syria',months:2},{to:'media',months:1}],remaining:2};assert.equal(setJourneyHalt(other,'cleopatra',true).reason,'unavailable');
});
test('journeys stop when a route becomes hostile; commanders cannot abandon an army',()=>{
 const s=newGame('senate');assert.equal(previewPersonTravel(s,'pompey','italiaS').ok,false);assert.equal(startPersonTravel(s,'cicero','epirus').ok,true);s.regions.find(r=>r.id==='italiaS').owner='caesar';advancePersonalDiplomacy(s);assert.equal(s.world.characters.cicero.location,'roma');assert.ok(s.world.characters.cicero.travel);advancePersonalDiplomacy(s);assert.equal(s.world.characters.cicero.location,'roma');assert.equal(s.world.characters.cicero.travel,undefined);
});
test('illness, disappearance and death interrupt an own journey with a private explanation',()=>{
 for(const [change,expected] of [[c=>c.health='seriously_ill',/因重病中止行程.*不代表其确切位置/],[c=>c.missing={origin:'roma',remaining:2},/失联.*目前位置不明/],[c=>{c.alive=false;c.health='deceased'},/模拟中去世.*行程已结束/]]){
  let s=newGame('senate');assert.equal(startPersonTravel(s,'cicero','epirus').ok,true);change(s.world.characters.cicero);s.log=[];
  s=upgradeSave(JSON.parse(JSON.stringify(s)));advancePersonalDiplomacy(s);
  assert.equal(s.world.characters.cicero.travel,undefined);assert.match(s.log[0].zh,expected);assert.equal(s.log.length,1);
  advancePersonalDiplomacy(s);assert.equal(s.log.length,1);
 }
 const s=newGame('senate');s.world.characters.cleopatra.travel={destination:'syria',legs:[{to:'syria',months:2}],remaining:2};s.world.characters.cleopatra.health='dying';s.log=[];
 advancePersonalDiplomacy(s);assert.equal(s.world.characters.cleopatra.travel,undefined);assert.equal(s.log.length,0);
});
test('requests do not reveal whether a reported foreign leader is actually present',()=>{
 const s=newGame('senate');s.world.characters.cleopatra.location='parthia';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);assert.equal(s.meetings[0].status,'pending');advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'pending');advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');assert.deepEqual(s.world.personalRelations,{});assert.equal(s.knowledge.senate.egypt.reports.length,0);
});
test('a meeting needs co-location and creates only the observer’s dated report and personal trust',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.characters.cleopatra.health='ill';s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');assert.equal(s.world.personalRelations['cicero:cleopatra'].meetings,1);assert.equal(s.knowledge.senate.egypt.reports[0].source,'meeting');assert.equal(s.knowledge.senate.egypt.reports[0].value,'unknown');const age=s.knowledge.senate.egypt.reports.find(r=>r.kind==='age');assert.deepEqual(age.value,[10,30]);assert.equal(age.source,'meeting');assert.equal(age.confidence,'unverified');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
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
 const s=newGame('senate');s.world.characters.cicero.location='egypt';assert.equal(s.knowledge.senate.egypt.reports.some(r=>r.kind==='age'&&r.character==='ptolemy'),false);s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','ptolemy').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');const report=s.knowledge.senate.egypt.reports.find(r=>r.kind==='age'&&r.character==='ptolemy');assert.deepEqual(report.value,[5,20]);assert.equal(report.confidence,'unverified');assert.equal(report.source,'meeting');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
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

test('a commander on the march cannot send or complete a personal audience from the origin theater',()=>{
 const initial=newGame('senate'),army=initial.armies.find(a=>a.owner==='senate');army.characterId='cicero';army.move={to:'italiaS',remaining:2};initial.world.characters.cicero.location=army.region;
 assert.equal(requestPersonalMeeting(initial,'cicero','cleopatra','egypt').reason,'unavailable');assert.equal(initial.meetings.length,0);
 for(const person of ['cicero','cleopatra']){let s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.characters.cleopatra.location='egypt';s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','cleopatra','egypt').ok,true);
 const unit=s.armies.find(a=>a.owner===(person==='cicero'?'senate':'egypt'));unit.characterId=person;unit.region='egypt';unit.move={to:'syria',remaining:2};s=upgradeSave(JSON.parse(JSON.stringify(s)));advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');assert.deepEqual(s.world.personalRelations,{});assert.equal(s.knowledge.senate.egypt.reports.length,0);
 }
});

test('journey planning uses reported control and only discovers a hidden enemy on arrival',()=>{
 let safe=newGame('senate');safe.regions.find(r=>r.id==='epirus').owner='egypt';safe.controlKnowledge.senate.epirus={owner:'egypt',year:-49,month:1};let hostile=upgradeSave(JSON.parse(JSON.stringify(safe)));hostile.regions.find(r=>r.id==='epirus').owner='caesar';
 const a=previewPersonTravel(safe,'cicero','epirus'),b=previewPersonTravel(hostile,'cicero','epirus');assert.equal(a.ok,true);assert.deepEqual(b,a);assert.equal(startPersonTravel(hostile,'cicero','epirus').ok,true);const first=a.legs[0].months;for(let i=0;i<first;i++)advancePersonalDiplomacy(hostile);assert.equal(hostile.world.characters.cicero.location,'italiaS');hostile=upgradeSave(JSON.parse(JSON.stringify(hostile)));for(let i=0;i<a.legs[1].months-1;i++)advancePersonalDiplomacy(hostile);assert.ok(hostile.world.characters.cicero.travel);assert.equal(hostile.controlKnowledge.senate.epirus.owner,'egypt');advancePersonalDiplomacy(hostile);assert.equal(hostile.world.characters.cicero.location,'italiaS');assert.equal(hostile.world.characters.cicero.travel,undefined);assert.equal(hostile.controlKnowledge.senate.epirus.owner,'caesar');assert.match(hostile.log[0].zh,/中止行程/);assert.equal(hostile.knowledge.caesar.egypt.reports.length,0);
});
test('a stale reported court remains addressable after the real faction ceases to exist',()=>{
 const s=newGame('senate');s.knowledge.senate.egypt_claimant={reportedLeaders:['ptolemy'],reports:[],sightings:{}};assert.equal(s.factions.egypt_claimant,undefined);assert.equal(requestPersonalMeeting(s,'cicero','ptolemy','egypt_claimant').ok,true);assert.equal(s.meetings[0].status,'pending');advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'no_contact');
});
