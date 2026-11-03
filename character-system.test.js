import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,queueMission,diplomacy,sendInquiry} from './engine.js';
import {assignSuccession,knownLeaders,ageRange} from './characters.js';
import {addReport,commandFactor,advanceCharacters,contestLeadership} from './character-system.js';

test('foreign intelligence is independent from actual leadership and other observers',()=>{
 const s=newGame(),opening=knownLeaders(s,'caesar','egypt');
 s.world.characters.cleopatra.alive=false;assignSuccession(s,'egypt');
 assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.deepEqual(opening,['cleopatra','ptolemy']);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});
 assert.deepEqual(knownLeaders(s,'caesar','egypt'),['ptolemy']);assert.deepEqual(knownLeaders(s,'senate','egypt'),['cleopatra','ptolemy']);
});
test('only independently sourced matching reports improve confidence and conflicts remain visible',()=>{
 const s=newGame();addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'unverified');
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'envoy',confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'credible');
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'travelers',confidence:'rumor'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'confirmed');assert.equal(s.knowledge.caesar.egypt.reports[0].verified,true);
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'travelers',confidence:'rumor'});
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='disputed'));
});
test('spies cost resources and resolve by month with isolated records',()=>{
 const s=newGame(),cash=s.factions.caesar.treasury;assert.equal(queueMission(s,'caesar','egypt','spy','health').ok,true);assert.equal(s.factions.caesar.treasury,cash-12);
 assert.equal(queueMission(s,'caesar','egypt','spy','health').reason,'pending');for(let i=0;i<3;i++)tick(s);
 assert.equal(s.operations[0].status,'pending');const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));tick(loaded);
 assert.notEqual(loaded.operations[0].status,'pending');assert.equal(loaded.knowledge.senate.egypt.reports.length,0);
});
test('health has gameplay impact and deceased commanders are succeeded without revealing foreign changes',()=>{
 const s=newGame(),a=s.armies.find(x=>x.id==='xiii');s.world.characters.caesar.health='seriously_ill';assert.ok(commandFactor(s,a)<1);
 let died=false;for(let seed=1;seed<500&&!died;seed++){const trial=newGame();trial.world.characters.orodes.health='dying';trial.world.intelSeed=(seed*900001)>>>0;trial.month=1;advanceCharacters(trial);if(!trial.world.characters.orodes.alive){died=true;assert.deepEqual(trial.world.leadership.parthia,['pacorus']);assert.deepEqual(knownLeaders(trial,'caesar','parthia'),['orodes'])}}assert.equal(died,true);
 assert.deepEqual(ageRange('caesar',-49),[51,51]);assert.equal(ageRange('ptolemy',-49),null);
});
test('old version 3 saves are migrated without resetting their campaign data',()=>{
 const s=newGame();s.month=7;s.factions.caesar.treasury=42;delete s.world;delete s.knowledge;delete s.operations;
 const loaded=upgradeSave(s);assert.equal(loaded.month,7);assert.equal(loaded.factions.caesar.treasury,42);assert.ok(loaded.world.characters.caesar);
});


test('a contested joint rule leaves foreign reports stale and hostile courts may conceal the dispute',()=>{
 let found=false;for(let seed=1;seed<100&&!found;seed++){const s=newGame();assert.equal(contestLeadership(s,'egypt','cleopatra'),true);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(diplomacy(s,'caesar','egypt','war'),true);s.seed=(seed*7000013)>>>0;assert.equal(sendInquiry(s,'caesar','egypt').ok,true);s.inquiries[0].remaining=1;tick(s);if(s.inquiries[0].status==='answered'){found=true;assert.match(s.inquiries[0].claim[0],/Cleopatra/);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.equal(s.inquiries[0].confidence,'unverified')}}assert.equal(found,true);
});


test('different inquiry questions persist and do not overwrite leadership knowledge',()=>{
 const s=newGame();assert.equal(sendInquiry(s,'caesar','egypt','successor').ok,true);assert.equal(s.inquiries[0].subject,'successor');s.inquiries[0].remaining=1;
 for(let i=0;i<20;i++){const probe=JSON.parse(JSON.stringify(s));probe.seed=(i*7000013)>>>0;tick(probe);if(probe.inquiries[0].status==='answered'){assert.match(probe.inquiries[0].claim[0],/successor/i);assert.equal(probe.knowledge.caesar.egypt.reports.length,0);return}}assert.fail('No answered inquiry in test seeds');
});

test('surviving joint ruler remains in office when a co-ruler dies',()=>{
 const s=newGame();s.world.characters.cleopatra.alive=false;assert.deepEqual(assignSuccession(s,'egypt'),['ptolemy']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
});
