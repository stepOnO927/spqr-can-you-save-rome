import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=strategic-offers-1';
import {friendlyPersonnelInTheater} from '../map-lab/personnel.js';

test('city personnel projection contains only living friendly people stationary in that theater',()=>{
 const s=newGame('senate');
 s.world.characters.cleopatra.location='roma';
 assert.ok(friendlyPersonnelInTheater(s,'roma').includes('cicero'));
 assert.ok(friendlyPersonnelInTheater(s,'roma').includes('pompey'));
 assert.ok(!friendlyPersonnelInTheater(s,'roma').includes('cleopatra'));
 s.world.characters.cicero.travel={destination:'epirus'};
 s.armies.find(a=>a.characterId==='pompey').move={to:'italiaS',remaining:1};
 s.world.characters.cato.alive=false;
 const result=friendlyPersonnelInTheater(s,'roma');
 assert.ok(!result.includes('cicero'));assert.ok(!result.includes('pompey'));assert.ok(!result.includes('cato'));
 assert.ok(!friendlyPersonnelInTheater(s,'egypt').includes('cleopatra'));
});

test('a missing person with a stale saved theater is not shown as present',()=>{
 const s=newGame('senate');s.world.characters.cicero.location='roma';s.world.characters.cicero.missing={origin:'roma',remaining:2};assert.equal(friendlyPersonnelInTheater(s,'roma').includes('cicero'),false);
});
