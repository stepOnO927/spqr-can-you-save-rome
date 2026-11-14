import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission} from '../engine.js?v=government-intel-courier-1';
import {observeArmies,reportedArmies,reportedHealthSubjects} from '../character-system.js?v=portraits-hundred-days-1';
import {requestPersonalMeeting} from '../personal-diplomacy.js?v=portraits-hundred-days-1';

test('frontier observations record a dated commander without tracking unseen changes',()=>{
 let s=newGame('senate'),unit=s.armies.find(a=>a.id==='xiii');let sighting=reportedArmies(s,'senate').find(a=>a.id==='xiii');assert.equal(sighting.commanderId,'caesar');
 unit.region='gaul';unit.characterId='antony';s.month=2;observeArmies(s);sighting=reportedArmies(s,'senate').find(a=>a.id==='xiii');assert.equal(sighting,undefined);assert.equal(s.knowledge.senate.caesar.sightingHistory[0].commanderId,'caesar');assert.ok(!reportedHealthSubjects(s,'senate','caesar').includes('antony'));
 unit.region='cisalpine';s.month=3;observeArmies(s);sighting=reportedArmies(s,'senate').find(a=>a.id==='xiii');assert.equal(sighting.commanderId,'antony');assert.equal(sighting.month,3);assert.ok(reportedHealthSubjects(s,'senate','caesar').includes('antony'));
 s=upgradeSave(JSON.parse(JSON.stringify(s)));unit=s.armies.find(a=>a.id==='xiii');unit.region='gaul';unit.characterId=null;observeArmies(s);assert.equal(reportedArmies(s,'senate').find(a=>a.id==='xiii'),undefined);assert.equal(s.knowledge.senate.caesar.commanderReports[0].commanderId,'antony');
 assert.equal(queueMission(s,'senate','caesar','spy','health',null,'antony').ok,true);assert.equal(requestPersonalMeeting(s,'cicero','antony','caesar').ok,true);
});
test('only local observers learn a commander and a later unnamed command clears the report',()=>{
 const s=newGame('senate'),unit=s.armies.find(a=>a.id==='xiii');unit.characterId='antony';observeArmies(s);
 assert.equal(s.knowledge.senate.caesar.sightings.xiii.commanderId,'antony');assert.equal(s.knowledge.egypt.caesar.sightings.xiii,undefined);
 unit.characterId=null;observeArmies(s);assert.equal(s.knowledge.senate.caesar.sightings.xiii.commanderId,null);assert.ok(reportedHealthSubjects(s,'senate','caesar').includes('antony'));assert.equal(s.knowledge.senate.caesar.commanderReports.find(x=>x.commanderId==='antony').month,1);
});
