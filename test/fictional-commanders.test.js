import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,recruit} from '../engine.js?v=civic-portraits-1';
import {CHARACTER_CATALOG,successorFor} from '../characters.js?v=safe-save-1';
import {STARTING_COMMANDERS,NAME_POOLS,generateFictionalName} from '../fictional-names.js?v=faces-of-empire-1';

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
