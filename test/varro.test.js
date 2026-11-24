import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {newGame,upgradeSave} from '../engine.js';
import {CHARACTER_CATALOG,HISTORICAL_BIO,characterAgeRange} from '../characters.js';
import {knownForeignSpecialists,inviteForeignSpecialist,specialistRoles} from '../civilization.js';
import {advanceCharacters} from '../character-system.js';

test('Varro is one documented 49 BCE Senate figure with a game reconstruction portrait',()=>{
 const s=newGame('senate'),person=s.world.characters.varro;
 assert.equal(person.faction,'senate');
 assert.equal(person.location,'hispaniaS');
 assert.deepEqual(characterAgeRange(s,'varro'),[65,68]);
 assert.deepEqual(specialistRoles(s,'varro'),['military','scholar']);
 assert.match(HISTORICAL_BIO.varro[0],/Further Spain in 49 BCE/);
 assert.match(CHARACTER_CATALOG.varro.source,/Caesar\/Civil_Wars/);
 for(const file of ['varro.jpg','varro-128.jpg','varro-64.jpg'])assert.ok(existsSync(new URL(`../assets/portraits/${file}`,import.meta.url)));
});

test('old saves gain Varro once without replacing existing people or reviving a later campaign',()=>{
 const old=newGame('senate');delete old.world.characters.varro;delete old.world.varroInitialized;
 const prior=old.world.characters.cicero;
 const restored=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.ok(restored.world.characters.varro);
 assert.deepEqual(restored.world.characters.cicero,prior);
 restored.world.characters.varro.alive=false;restored.world.characters.varro.health='deceased';
 const again=upgradeSave(JSON.parse(JSON.stringify(restored)));
 assert.equal(again.world.characters.varro.alive,false);
 const later=newGame('senate');later.year=-26;delete later.world.characters.varro;delete later.world.varroInitialized;
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(later))).world.characters.varro,undefined);
});

test('foreign courts need a received lead before inviting Varro',()=>{
 const s=newGame('egypt');s.wars=[];s.relations['egypt:senate']=80;
 s.factions.egypt.treasury=300;s.civilization.prestige.egypt=8;
 assert.equal(knownForeignSpecialists(s,'egypt').some(x=>x.id==='varro'),false);
 assert.equal(inviteForeignSpecialist(s,'egypt','varro').reason,'unknown');
 s.knowledge.egypt.senate.reports.push({kind:'location',character:'varro',year:s.year,month:s.month,peopleNames:{varro:CHARACTER_CATALOG.varro.name}});
 assert.equal(knownForeignSpecialists(s,'egypt').some(x=>x.id==='varro'),true);
 assert.equal(inviteForeignSpecialist(s,'egypt','varro').ok,true);
 assert.equal(s.world.characters.varro.faction,'senate');
 assert.equal(s.civilization.recruitment[0].status,'pending');
});

test('Varro health has a saved independent random stream and leaves older outcomes stable',()=>{
 const campaign=newGame('caesar'),legacy=JSON.parse(JSON.stringify(campaign));
 delete legacy.world.characters.varro;legacy.world.varroInitialized=true;
 campaign.month=2;legacy.month=2;
 advanceCharacters(campaign);advanceCharacters(legacy);
 assert.equal(campaign.world.intelSeed,legacy.world.intelSeed);
 assert.ok(Number.isInteger(campaign.world.characters.varro.healthSeed));
 const restored=upgradeSave(JSON.parse(JSON.stringify(campaign)));
 assert.equal(restored.world.characters.varro.healthSeed,campaign.world.characters.varro.healthSeed);
});
