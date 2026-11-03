import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
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
