import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=grand-chessboard-1';
import {appointOffice,dismissOffice,officeCandidates,officeEffects,advanceOffices} from '../office-system.js?v=grand-chessboard-1';
import {availableCommanders} from '../command-appointments.js';
import {previewPersonTravel} from '../personal-diplomacy.js';

test('appointments cost treasury and affect the actual monthly economy',()=>{
 const s=newGame('senate');assert.equal(appointOffice(s,'finance','cicero').ok,true);assert.equal(appointOffice(s,'supply','cato').ok,true);
 assert.equal(s.factions.senate.treasury,125);assert.equal(appointOffice(s,'administration','cato').reason,'unavailable');
 const control=upgradeSave(JSON.parse(JSON.stringify(s)));control.world.offices.senate={};tick(s);tick(control);
 assert.equal(s.factions.senate.treasury-control.factions.senate.treasury,2);assert.equal(s.factions.senate.food-control.factions.senate.food,2);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.world.offices.senate.finance,'cicero');
});
test('officeholders cannot simultaneously travel or command an army',()=>{
 const s=newGame('senate');assert.equal(appointOffice(s,'finance','cato').ok,true);
 assert.equal(previewPersonTravel(s,'cato','epirus').reason,'unavailable');assert.ok(!availableCommanders(s,'pompey').includes('cato'));
 assert.equal(dismissOffice(s,'finance').ok,true);assert.ok(availableCommanders(s,'pompey').includes('cato'));assert.equal(previewPersonTravel(s,'cato','epirus').ok,true);
});
test('incapacity, loyalty loss or faction loss ends an appointment before benefits',()=>{
 for(const change of [s=>s.world.characters.cicero.health='seriously_ill',s=>s.world.characters.cicero.loyalty=39,s=>s.world.characters.cicero.faction='caesar',s=>s.world.characters.cicero.alive=false]){
  const s=newGame('senate');appointOffice(s,'finance','cicero');change(s);assert.equal(officeEffects(s,'senate').treasury,0);advanceOffices(s);assert.equal(s.world.offices.senate.finance,undefined);assert.ok(s.log.some(x=>x.zh.includes('无法继续履行')));
 }
});
test('administration improves stability quarterly and old saves acquire empty assignments',()=>{
 const s=newGame('senate');delete s.world.offices;const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(officeCandidates(loaded,'senate','administration').includes('cicero'));assert.equal(appointOffice(loaded,'administration','cicero').ok,true);
 loaded.month=2;assert.equal(officeEffects(loaded,'senate').stability,0);loaded.month=3;assert.equal(officeEffects(loaded,'senate').stability,1);
});
test('AI fills an available assignment with its own personnel without publishing it',()=>{
 const s=newGame('caesar');s.month=7;const before=s.factions.senate.treasury;advanceOffices(s);
 assert.ok(s.world.offices.senate.finance);assert.equal(s.factions.senate.treasury,before-5);assert.equal(s.world.characters[s.world.offices.senate.finance].faction,'senate');assert.ok(!s.log.some(x=>x.en.includes('administrative assignment')));
});

