import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=archived-leads-1';
import {createFictionalPerson,requestFamilyResources} from '../dynasties.js?v=archived-leads-1';

function setup(){const s=newGame('caesar'),absent=createFictionalPerson(s,{name:['Missing','失联家主'],faction:'caesar',birthYear:-85,wealth:900}),familyId=s.world.characters[absent].familyId,present=createFictionalPerson(s,{name:['Available','可联系人'],faction:'caesar',birthYear:-65,wealth:4,familyId});const family=s.world.dynasties.families[familyId];family.wealth=0;family.leader=absent;s.world.characters[absent].loyalty=0;s.world.characters[absent].missing={origin:'roma',remaining:2,year:s.year,month:s.month};s.world.characters[present].loyalty=70;return {s,absent,present,familyId}}

test('family funding does not use a missing person’s wealth or private loyalty',()=>{
 const {s,absent,present,familyId}=setup(),before=s.factions.caesar.treasury;const result=requestFamilyResources(s,familyId,'loan');assert.deepEqual(result,{ok:true,amount:4});assert.equal(s.factions.caesar.treasury,before+4);assert.equal(s.world.characters[absent].wealth,900);assert.equal(s.world.characters[present].wealth,0);assert.equal(s.world.dynasties.familyLoans.at(-1).remaining,6);
});
test('hidden condition of a missing family member cannot change funding outcomes across save/load',()=>{
 const {s,absent,familyId}=setup(),a=upgradeSave(structuredClone(s)),b=upgradeSave(structuredClone(s));b.world.characters[absent].wealth=2;b.world.characters[absent].loyalty=99;b.world.characters[absent].alive=false;const first=requestFamilyResources(a,familyId,'levy'),second=requestFamilyResources(b,familyId,'levy');assert.deepEqual(first,second);assert.equal(first.amount,4);assert.equal(a.factions.caesar.treasury,b.factions.caesar.treasury);assert.equal(a.world.characters[absent].wealth,900);assert.equal(b.world.characters[absent].wealth,2);
});
test('a family with only missing members has no available representative',()=>{const {s,absent,present,familyId}=setup();s.world.characters[present].missing={year:s.year,month:s.month,remaining:2};const before=s.factions.caesar.treasury;assert.equal(requestFamilyResources(s,familyId,'loan').reason,'unavailable');s.world.characters[absent].alive=false;assert.equal(requestFamilyResources(s,familyId,'loan').reason,'unavailable');assert.equal(s.factions.caesar.treasury,before)});
