import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,aiClaimantChoice,tick,upgradeSave} from '../engine.js?v=multipolar-autoplay-1';
import {addReport} from '../character-system.js?v=succession-ui-recovery-1';
// These tests pin pre-IMPERIUM subsystem behaviour with engineered random seeds;
// they run with the expansion's AI layer switched off (world.imperium.enabled=false).
const legacyIsolated=g=>{g.world.imperium={enabled:false};return g};

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
test('AI weighs contradictory contemporary sources without counting forwarded copies twice',()=>{
 const s=newGame('caesar');s.knowledge.senate.caesar.sightings={};
 addReport(s,'senate','caesar',{kind:'strength',value:10000,source:'spy'});
 addReport(s,'senate','caesar',{kind:'strength',value:30000,source:'envoy'});
 assert.equal(estimatedStrength(s,'senate','caesar'),20000);
 addReport(s,'senate','caesar',{kind:'strength',value:30000,source:'exchange',originSource:'envoy'});
 assert.equal(estimatedStrength(s,'senate','caesar'),20000);
 for(const army of s.armies.filter(a=>a.owner==='caesar'))army.men=999999;
 assert.equal(estimatedStrength(s,'senate','caesar'),20000);
 s.year+=3;assert.equal(estimatedStrength(s,'senate','caesar'),12000);
});

test('AI compares recent claimant reports from independent sources rather than hidden court state or repeated copies',()=>{
 const s=legacyIsolated(newGame('caesar'));s.month=11;s.factions.senate.treasury=100;
 addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy'});addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'travelers'});addReport(s,'senate','egypt',{kind:'claimants',leaders:['ptolemy'],source:'envoy'});
 for(let i=0;i<8;i++)addReport(s,'senate','egypt',{kind:'claimants',leaders:['ptolemy'],source:'exchange',originSource:'court'});
 assert.equal(aiClaimantChoice(s,'senate','egypt'),'cleopatra');s.world.claimants.egypt=['ptolemy'];s.world.characters.cleopatra.alive=false;s.world.characters.ptolemy.health='healthy';assert.equal(aiClaimantChoice(s,'senate','egypt'),'cleopatra');assert.equal(aiClaimantChoice(s,'caesar','egypt'),null);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));tick(loaded);const offer=loaded.operations.find(o=>o.type==='support'&&o.actor==='senate'&&o.target==='egypt');assert.ok(offer);assert.equal(offer.claimant,'cleopatra');assert.equal(offer.status,'pending');assert.equal(loaded.knowledge.caesar.egypt.reports.length,0);
});
test('old or unnamed claimant reports do not direct new AI support, and newer same-source claims supersede earlier ones',()=>{
 const s=newGame('caesar');s.month=1;addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy'});s.month=2;addReport(s,'senate','egypt',{kind:'claimants',leaders:['ptolemy'],source:'spy'});addReport(s,'senate','egypt',{kind:'claimants',leaders:[],source:'travelers'});assert.equal(aiClaimantChoice(s,'senate','egypt'),'ptolemy');s.year+=3;assert.equal(aiClaimantChoice(s,'senate','egypt'),null);
});
