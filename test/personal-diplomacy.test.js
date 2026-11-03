import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js';
import {previewPersonTravel,startPersonTravel,requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js';

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
 const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.characters.cleopatra.health='ill';s.world.intelSeed=1000;assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');assert.equal(s.world.personalRelations['cicero:cleopatra'].meetings,1);assert.equal(s.knowledge.senate.egypt.reports[0].source,'meeting');assert.equal(s.knowledge.senate.egypt.reports[0].value,'unknown');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('personal audience may be refused or unanswered and records persist',()=>{
 for(const [seed,expected] of [[0,'declined'],[1972,'no_reply']]){const s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.intelSeed=seed;requestPersonalMeeting(s,'cicero','cleopatra');advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,expected);assert.deepEqual(s.world.personalRelations,{});assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).meetings[0].status,expected)}
});
test('ordinary campaign month advancement progresses personal requests',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='egypt';assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);tick(s);assert.equal(s.meetings[0].remaining,1);tick(s);assert.notEqual(s.meetings[0].status,'pending');
});
