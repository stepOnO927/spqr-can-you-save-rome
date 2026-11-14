import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,aiTurn,estimatedStrength} from '../engine.js';
import {addReport} from '../character-system.js';
import {nationalBudget} from '../national-budget.js';

test('AI without numerical reports estimates from its own sightings rather than real enemy forces',()=>{
 const s=newGame('caesar');s.knowledge.senate.caesar.sightings={};const before=estimatedStrength(s,'senate','caesar');assert.equal(before,4000);
 for(const a of s.armies.filter(a=>a.owner==='caesar')){a.men=999999;a.region='egypt'}s.armies.push({id:'secret',owner:'caesar',men:999999,region:'egypt'});
 assert.equal(estimatedStrength(s,'senate','caesar'),before);s.knowledge.senate.caesar.sightings.known={id:'known',year:s.year,month:s.month};assert.equal(estimatedStrength(s,'senate','caesar'),5000);
 assert.equal(estimatedStrength(s,'egypt','caesar'),4000);
});
test('AI retains a fresh report but gradually discounts it after it becomes stale',()=>{
 const s=newGame('caesar');s.knowledge.senate.caesar.sightings={};addReport(s,'senate','caesar',{kind:'strength',value:30000,source:'spy',confidence:'unverified'});
 assert.equal(estimatedStrength(s,'senate','caesar'),30000);s.year+=2;assert.equal(estimatedStrength(s,'senate','caesar'),30000);
 s.year++;assert.equal(estimatedStrength(s,'senate','caesar'),17000);s.year++;assert.equal(estimatedStrength(s,'senate','caesar'),4000);
});
test('an older forwarded report does not supersede a more recent observation',()=>{
 const s=newGame('caesar');s.knowledge.senate.caesar.sightings={};s.month=6;addReport(s,'senate','caesar',{kind:'strength',value:18000,source:'spy',confidence:'unverified'});
 s.month=7;addReport(s,'senate','caesar',{kind:'strength',value:1000,source:'exchange',originSource:'court',observationYear:-49,observationMonth:1,confidence:'unverified'});
 assert.equal(estimatedStrength(s,'senate','caesar'),18000);
});
test('routine wartime recruitment responds to reported strength rather than hidden enemy troops or spare cash alone',()=>{
 const base=newGrandGame('egypt');base.month=4;base.factions.senate.treasury=200;
 for(const unit of base.armies.filter(a=>a.owner==='senate'))unit.region='achaia';
 const before=base.armies.length,quiet=structuredClone(base),warned=structuredClone(base);
 aiTurn(quiet,'senate');
 assert.equal(quiet.armies.length,before);
 addReport(warned,'senate','caesar',{kind:'strength',value:30000,source:'spy',confidence:'unverified'});
 aiTurn(warned,'senate');
 assert.ok(warned.armies.length>before);
});
test('a solvent command with territorial parity can replace a serious reported field deficit below the peacetime cash threshold',()=>{
 const base=newGrandGame('egypt');base.month=4;base.factions.caesar.treasury=55;base.factions.caesar.food=100;
 for(const territory of base.regions.filter(r=>r.owner==='senate'&&r.id!=='roma').slice(0,25))territory.owner='caesar';
 assert.ok(base.regions.filter(r=>r.owner==='caesar').length>base.regions.filter(r=>r.owner==='senate').length);
 const quiet=structuredClone(base),warned=structuredClone(base),deficit=structuredClone(base),rumor=structuredClone(base),stale=structuredClone(base),contaminated=structuredClone(base),before=base.armies.length;
 aiTurn(quiet,'caesar');assert.equal(quiet.armies.length,before);
 for(const state of [warned,deficit])addReport(state,'caesar','senate',{kind:'strength',value:30000,source:'spy',confidence:'unverified'});
 assert.ok(nationalBudget(warned,'caesar').projectedNet>=0);aiTurn(warned,'caesar');assert.equal(warned.armies.length,before+1);assert.ok(warned.factions.caesar.treasury<base.factions.caesar.treasury-24);
 for(const territory of deficit.regions.filter(r=>r.owner==='caesar'))territory.tax=0;
 assert.ok(nationalBudget(deficit,'caesar').projectedNet<0);aiTurn(deficit,'caesar');assert.equal(deficit.armies.length,before);
 addReport(rumor,'caesar','senate',{kind:'strength',value:30000,source:'spy',confidence:'rumor'});
 aiTurn(rumor,'caesar');assert.equal(rumor.armies.length,before);
 addReport(stale,'caesar','senate',{kind:'strength',value:30000,source:'spy',confidence:'unverified',observationYear:stale.year-3,observationMonth:stale.month});
 aiTurn(stale,'caesar');assert.equal(stale.armies.length,before);
 addReport(contaminated,'caesar','senate',{kind:'strength',value:30000,source:'spy',confidence:'unverified',observationYear:contaminated.year,observationMonth:contaminated.month-1});
 addReport(contaminated,'caesar','senate',{kind:'strength',value:35000,source:'spy',confidence:'rumor'});
 aiTurn(contaminated,'caesar');assert.equal(contaminated.armies.length,before);
});
