import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=multipolar-2';
import {addReport,reportedClaimants,supportClaimant,claimantRepresentatives,contestLeadership,advanceOperations,advanceDisputes} from '../character-system.js?v=multipolar-2';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=multipolar-2';

const report=s=>addReport(s,s.player,'egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});
test('offers require a reported claimant but do not expose whether that report is true',()=>{
 const s=newGame();assert.equal(supportClaimant(s,'caesar','egypt','cleopatra').reason,'unavailable');report(s);assert.deepEqual(reportedClaimants(s,'caesar','egypt'),['cleopatra']);assert.equal(supportClaimant(s,'caesar','egypt','cleopatra').ok,true);assert.equal(s.factions.caesar.treasury,80);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'no_reply');assert.equal(s.world.disputes.egypt,undefined);
});
test('accepted support changes the actual dispute after delay and survives a save',()=>{
 let s=newGame();contestLeadership(s,'egypt','cleopatra');report(s);const before=s.relations['caesar:egypt']||0;supportClaimant(s,'caesar','egypt','cleopatra');for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.world.disputes.egypt.support.cleopatra,15);assert.equal(s.relations['caesar:egypt'],before-10);
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>.13&&q<.2});s.world.disputes.egypt.months=5;s.world.intelSeed=seed;advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.deepEqual(s.world.claimants.egypt,['ptolemy']);assert.deepEqual(s.world.disputes.egypt.support,{});
});
test('offers can be refused or lost without changing support',()=>{
 for(const [seed,outcome] of [[0,'declined'],[1972,'no_reply']]){const s=newGame();contestLeadership(s,'egypt','cleopatra');report(s);supportClaimant(s,'caesar','egypt','cleopatra');s.world.intelSeed=seed;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,outcome);assert.equal(s.world.disputes.egypt.support,undefined)}
});
test('trust earned in an actual meeting can improve a later offer without guaranteeing a reply',()=>{
 const s=newGame('senate');contestLeadership(s,'egypt','cleopatra');s.world.characters.cicero.location='egypt';s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');
 addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});assert.deepEqual(claimantRepresentatives(s,'senate','cleopatra'),['cicero']);
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.44&&q<.45});
 function trial(representative,seedValue){const t=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(supportClaimant(t,'senate','egypt','cleopatra',representative).ok,true);for(let i=0;i<3;i++)advanceOperations(t);assert.equal(t.operations[0].status,'pending');t.world.intelSeed=seedValue;advanceOperations(t);return t}
 assert.equal(trial(null,seed).operations[0].status,'declined');const trusted=trial('cicero',seed);assert.equal(trusted.operations[0].status,'complete');assert.equal(trusted.world.disputes.egypt.support.cleopatra,15);assert.equal(trusted.knowledge.caesar.egypt.reports.length,0);assert.equal(trial('cicero',1972).operations[0].status,'no_reply');
});
test('representatives must be known friendly contacts and can lose their influence while a letter travels',()=>{
 const s=newGame('senate');contestLeadership(s,'egypt','cleopatra');addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});s.world.personalRelations['cicero:cleopatra']={trust:50,meetings:1};
 assert.equal(supportClaimant(s,'senate','egypt','cleopatra','caesar').reason,'representative');assert.equal(supportClaimant(s,'senate','egypt','cleopatra','cicero').ok,true);s.world.characters.cicero.faction='caesar';
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.34&&q<.36});s.world.intelSeed=seed;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'declined');assert.equal(s.world.disputes.egypt.support,undefined);
});

test('a reported claimant who is missing, incapacitated or traveling cannot reply and no cause is disclosed',()=>{
 for(const change of [c=>c.health='seriously_ill',c=>c.health='dying',c=>c.missing={year:-49,month:1},c=>c.travel={destination:'egypt',legs:[],remaining:1}]){const s=newGame();contestLeadership(s,'egypt','cleopatra');report(s);change(s.world.characters.cleopatra);assert.equal(supportClaimant(s,'caesar','egypt','cleopatra').ok,true);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'no_reply');assert.equal(s.world.disputes.egypt.support,undefined);assert.equal(s.knowledge.caesar.egypt.reports.length,1);assert.match(s.log[0].zh,/未收到回信/)}
});

test('military aid spends resources on dispatch and strengthens an accepted claimant after a delay',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');report(s);const f=s.factions.caesar,before={treasury:f.treasury,food:f.food,manpower:f.manpower},relations=s.relations['caesar:egypt']||0;
 assert.equal(supportClaimant(s,'caesar','egypt','cleopatra',null,'military').ok,true);assert.equal(f.treasury,before.treasury-14);assert.equal(f.food,before.food-5);assert.equal(f.manpower,before.manpower-1000);assert.equal(s.operations[0].aid,'military');
 for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.world.disputes.egypt.support.cleopatra,25);assert.equal(s.relations['caesar:egypt'],relations-15);assert.equal(s.knowledge.senate.egypt.reports.length,0);
});
test('military aid can fail without exposing a false claimant and checks resources before spending',()=>{
 let s=newGame('caesar');report(s);const before=s.factions.caesar.manpower;assert.equal(supportClaimant(s,'caesar','egypt','cleopatra',null,'military').ok,true);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'no_reply');assert.equal(s.world.disputes.egypt,undefined);assert.equal(s.factions.caesar.manpower,before-1000);
 for(const [field,value,reason] of [['treasury',13,'treasury'],['food',4,'food'],['manpower',999,'manpower']]){s=newGame('caesar');report(s);s.factions.caesar[field]=value;const snapshot=JSON.stringify(s.factions.caesar);assert.equal(supportClaimant(s,'caesar','egypt','cleopatra',null,'military').reason,reason);assert.equal(JSON.stringify(s.factions.caesar),snapshot);assert.equal(s.operations.length,0)}
});
test('accepted military backing can change a court struggle without guaranteeing victory',()=>{
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.4&&q<.41});
 function trial(aid){const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');report(s);supportClaimant(s,'caesar','egypt','cleopatra',null,aid);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.intelSeed=seed;advanceDisputes(s);return s}
 assert.deepEqual(trial('political').world.leadership.egypt,['ptolemy']);assert.deepEqual(trial('military').world.leadership.egypt,['cleopatra']);
});
