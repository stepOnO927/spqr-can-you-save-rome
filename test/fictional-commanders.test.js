import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,recruit} from '../engine.js?v=newborn-age-1';
import {CHARACTER_CATALOG,successorFor} from '../characters.js?v=newborn-age-1';
import {STARTING_COMMANDERS,NAME_POOLS,generateFictionalName} from '../fictional-names.js?v=faces-of-empire-1';
import {templatesFor,recruitFormation} from '../legion-designer.js?v=newborn-age-1';

test('opening officers have distinct saved identities without changing the opening random sequence',()=>{
 const s=newGame('caesar');assert.equal(s.world.dynasties.seed,786509145);
 const ids=[];
 for(const profile of STARTING_COMMANDERS){
  const army=s.armies.find(a=>a.id===profile.army),person=s.world.characters[army.characterId],record=s.world.dynasties.catalog[person.id];
  assert.equal(person.faction,profile.faction);assert.deepEqual(army.commander,profile.name);
  assert.deepEqual(record.name,profile.name);assert.deepEqual(record.culture,NAME_POOLS[profile.faction==='caesar'||profile.faction==='senate'?'roman':({egypt:'greek_egyptian',numidia:'numidian',mauretania:'mauretanian',armenia:'armenian',parthia:'parthian',galatia:'galatian',bosporus:'bosporan'})[profile.faction]].culture);
  assert.equal(record.fictional,true);assert.equal(person.militaryOnly,true);assert.ok(!successorFor(s,profile.faction).includes(person.id));ids.push(person.id);
 }
 assert.equal(new Set(ids).size,STARTING_COMMANDERS.length);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(const profile of STARTING_COMMANDERS){const army=loaded.armies.find(a=>a.id===profile.army);assert.deepEqual(loaded.world.dynasties.catalog[army.characterId].name,profile.name)}
});

test('a nearby opening officer is reported by a frontier observer without revealing him to distant courts',()=>{
 const s=newGame('senate'),viii=s.armies.find(a=>a.id==='viii');
 assert.equal(s.knowledge.senate.caesar.sightings.viii.commanderId,viii.characterId);
 assert.equal(s.knowledge.egypt.caesar.sightings.viii,undefined);
});

test('migration preserves an existing commander and never resurrects a destroyed opening army',()=>{
 const s=newGame('caesar');const egypt=s.armies.find(a=>a.id==='egyptguard');egypt.commander=['Existing officer','现有军官'];egypt.characterId=null;
 s.armies=s.armies.filter(a=>a.id!=='spain');delete s.world.openingCommandersSeeded;
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(loaded.armies.find(a=>a.id==='egyptguard').commander,['Existing officer','现有军官']);
 assert.equal(loaded.armies.some(a=>a.id==='spain'),false);
});

test('recruited armies and movement organizers receive unique cultural names that persist',()=>{
 const s=newGame('caesar');assert.equal(recruit(s,'cisalpine'),true);assert.equal(recruit(s,'cisalpine'),true);
 const levies=s.armies.filter(a=>a.id.startsWith('levy'));assert.equal(levies.length,2);
 for(const army of levies){assert.deepEqual(army.commander,CHARACTER_CATALOG[army.characterId].name);assert.equal(s.world.characters[army.characterId].militaryOnly,true)}
 assert.notEqual(levies[0].commander[0],levies[1].commander[0]);
 const egypt=generateFictionalName(s,{originFaction:'egypt',location:'egypt'}),unknown=generateFictionalName(s,{originFaction:'rebels'});
 assert.deepEqual(egypt.culture,NAME_POOLS.greek_egyptian.culture);assert.deepEqual(unknown.culture,NAME_POOLS.regional.culture);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(const army of levies)assert.deepEqual(loaded.world.dynasties.catalog[army.characterId].name,army.commander);
});

test('a custom formation has a named officer immediately on recruitment',()=>{
 const s=newGame('caesar');s.factions.caesar.treasury=500;s.factions.caesar.food=200;s.factions.caesar.manpower=50000;
 const template=templatesFor(s,'caesar').find(t=>t.name==='Standard Field Legion'),result=recruitFormation(s,'caesar','cisalpine',template.id);
 assert.equal(result.ok,true);const army=s.armies.find(a=>a.id===result.armyId);
 assert.ok(army.characterId);assert.deepEqual(army.commander,s.world.dynasties.catalog[army.characterId].name);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),after=restored.armies.find(a=>a.id===army.id);
 assert.equal(after.characterId,army.characterId);assert.deepEqual(after.commander,army.commander);
});
