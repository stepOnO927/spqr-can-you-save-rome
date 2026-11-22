import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=mission-history-1';
import {advanceMissingCommanders} from '../character-system.js?v=mission-history-1';
import {deriveGovernment,advanceGovernments,planSuccession,supportSuccessor} from '../governance.js?v=mission-history-1';
import {assignSuccession} from '../characters.js?v=mission-history-1';

function fixture(){const s=newGame('senate'),c=s.world.characters.pompey,unit=s.armies.find(a=>a.characterId==='pompey');if(unit){unit.characterId=null;unit.commander=['Unnamed officer','未具名军官']}c.location=null;c.missing={origin:'roma',remaining:3,year:s.year,month:s.month};return s}
function month(s){if(++s.month>12){s.month=1;s.year++}}

test('a missing leader produces the same government and options regardless of unreported death',()=>{
 const original=fixture(),alive=upgradeSave(structuredClone(original)),dead=upgradeSave(structuredClone(original));dead.world.characters.pompey.alive=false;dead.world.characters.pompey.health='deceased';dead.world.characters.pompey.deathYear=dead.year;
 assert.deepEqual(deriveGovernment(alive,'senate'),deriveGovernment(dead,'senate'));assert.equal(deriveGovernment(dead,'senate').kind,'acting_command');
 assert.deepEqual(planSuccession(alive,'cato'),planSuccession(dead,'cato'));assert.deepEqual(supportSuccessor(alive,'cato'),supportSuccessor(dead,'cato'));assert.deepEqual(alive.world.personalRelations,dead.world.personalRelations);
 for(let i=0;i<2;i++){month(alive);month(dead);advanceMissingCommanders(alive);advanceMissingCommanders(dead);advanceGovernments(alive);advanceGovernments(dead);assert.deepEqual(deriveGovernment(alive,'senate'),deriveGovernment(dead,'senate'));assert.ok(dead.world.characters.pompey.missing);assert.deepEqual(dead.world.leadership.senate,['pompey'])}
 assert.ok(!dead.log.some(x=>x.zh.includes('确认在游戏中去世')));
});

test('a failed search keeps death unconfirmed; a later successful search confirms succession',()=>{
 let s=fixture(),c=s.world.characters.pompey;c.alive=false;c.health='deceased';c.deathYear=s.year;c.missing.remaining=1;c.missing.searchSeed=1000;month(s);advanceMissingCommanders(s);assert.ok(c.missing);assert.equal(c.missing.remaining,3);assert.equal(deriveGovernment(s,'senate').kind,'acting_command');assert.deepEqual(s.world.leadership.senate,['pompey']);assert.ok(!s.log.some(x=>x.zh.includes('确认在游戏中去世')));
 s=upgradeSave(structuredClone(s));for(let i=0;i<3;i++){month(s);if(i===2)s.world.characters.pompey.missing.searchSeed=0;advanceMissingCommanders(s)}assert.equal(s.world.characters.pompey.missing,undefined);assert.ok(s.log.some(x=>x.zh.includes('确认在游戏中去世')));assert.ok(!s.world.leadership.senate.includes('pompey'));assert.notEqual(deriveGovernment(s,'senate').kind,'acting_command');
});

test('separate Mauretanian seats retain a missing ruler until their fate is confirmed',()=>{
 const alive=newGame('caesar'),p=alive.world.characters.bocchus;p.missing={origin:'mauretania',remaining:2,year:alive.year,month:alive.month};const dead=upgradeSave(structuredClone(alive));dead.world.characters.bocchus.alive=false;dead.world.characters.bocchus.health='deceased';
 assert.deepEqual(assignSuccession(alive,'mauretania'),assignSuccession(dead,'mauretania'));assert.deepEqual(deriveGovernment(alive,'mauretania'),deriveGovernment(dead,'mauretania'));assert.equal(deriveGovernment(dead,'mauretania').kind,'constituent_unavailable');
});


test('a failed search conveys the same uncertainty whether the missing leader is alive or dead',()=>{
 const start=fixture();start.world.characters.pompey.missing.remaining=1;start.world.characters.pompey.missing.searchSeed=1000;const alive=upgradeSave(structuredClone(start)),dead=upgradeSave(structuredClone(start));dead.world.characters.pompey.alive=false;dead.world.characters.pompey.health='deceased';dead.world.characters.pompey.deathYear=dead.year;month(alive);month(dead);const seed=alive.world.intelSeed;advanceMissingCommanders(alive);advanceMissingCommanders(dead);assert.equal(alive.world.characters.pompey.missing.remaining,3);assert.equal(dead.world.characters.pompey.missing.remaining,3);assert.deepEqual(deriveGovernment(alive,'senate'),deriveGovernment(dead,'senate'));assert.equal(alive.log[0].zh,dead.log[0].zh);assert.match(alive.log[0].zh,/搜寻暂无线索/);assert.equal(alive.world.intelSeed,seed);assert.equal(dead.world.intelSeed,seed);
 for(let i=0;i<3;i++){month(alive);month(dead);if(i===2){alive.world.characters.pompey.missing.searchSeed=0;dead.world.characters.pompey.missing.searchSeed=0}advanceMissingCommanders(alive);advanceMissingCommanders(dead)}assert.equal(alive.world.characters.pompey.missing,undefined);assert.equal(dead.world.characters.pompey.missing,undefined);assert.match(alive.log[0].zh,/重新取得联系/);assert.match(dead.log[0].zh,/确认在游戏中去世/);
});


test('a legacy missing record without a countdown begins a recoverable search',()=>{let s=fixture();delete s.world.characters.pompey.missing.remaining;delete s.world.characters.pompey.missing.searchSeed;month(s);advanceMissingCommanders(s);assert.equal(s.world.characters.pompey.missing.remaining,2);s=upgradeSave(structuredClone(s));month(s);advanceMissingCommanders(s);assert.equal(s.world.characters.pompey.missing.remaining,1)});
