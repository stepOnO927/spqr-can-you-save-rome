import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength} from '../engine.js';
import {addReport} from '../character-system.js';

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
