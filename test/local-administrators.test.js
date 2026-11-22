import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-regional-density-1';
import {localEntity} from '../local-polities.js';
import {advanceLocalResistance} from '../local-resistance.js';
import {advanceOffices,appointLocalAdministrator,dismissLocalAdministrator,localAdministrator,localAdministratorCandidates,officeOf,officeCandidates} from '../office-system.js?v=world-kings-regional-density-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-regional-density-1';

function occupiedTown(){
 const state=newGame('senate'),town=localEntity(state,'capua');
 town.controller='senate';town.legalSovereign='caesar';town.administrativeStatus='occupied';town.resistance=30;
 state.world.characters.cicero.location=town.theater;
 return {state,town};
}

test('a paid settlement appointment survives saves and reduces real local resistance',()=>{
 const {state,town}=occupiedTown(),before=state.factions.senate.treasury;
 assert.ok(localAdministratorCandidates(state,town.id).includes('cicero'));
 const control=structuredClone(state);
 assert.deepEqual(appointLocalAdministrator(state,town.id,'cicero'),{ok:true,cost:5});
 assert.equal(state.factions.senate.treasury,before-5);
 assert.equal(localAdministrator(state,town.id),'cicero');
 assert.equal(officeOf(state,'senate','cicero'),'settlement:capua');
 assert.ok(!officeCandidates(state,'senate','finance').includes('cicero'));
 assert.ok(!localAdministratorCandidates(state,'brundisium').includes('cicero'));
 advanceLocalResistance(state);advanceLocalResistance(control);
 assert.equal(localEntity(state,town.id).resistance,localEntity(control,town.id).resistance-2);
 const loaded=upgradeSave(structuredClone(state));
 assert.equal(localAdministrator(loaded,town.id),'cicero');
 assert.equal(inspectState(loaded).filter(f=>f.code==='invalid-local-administrator').length,0);
 assert.equal(dismissLocalAdministrator(loaded,town.id).ok,true);
 assert.equal(officeOf(loaded,'senate','cicero'),null);
});

test('local office ends when the officer leaves or the city is lost',()=>{
 const {state,town}=occupiedTown();appointLocalAdministrator(state,town.id,'cicero');
 state.world.characters.cicero.location='roma';
 assert.equal(localAdministrator(state,town.id),null);
 advanceOffices(state);assert.equal(state.world.localAdministrators[town.id],undefined);
 state.world.characters.cicero.location=town.theater;appointLocalAdministrator(state,town.id,'cicero');
 town.controller='caesar';advanceOffices(state);
 assert.equal(state.world.localAdministrators[town.id],undefined);
 assert.equal(localAdministratorCandidates(state,town.id).length,0);
});

test('inspector flags forged local administrator records',()=>{
 const {state,town}=occupiedTown();state.world.localAdministrators={capua:{faction:'caesar',person:'cicero'}};
 assert.ok(inspectState(state).some(f=>f.code==='invalid-local-administrator'));
});

test('AI spends its own treasury to staff a distressed city without revealing the post abroad',()=>{
 const state=newGame('caesar'),town=localEntity(state,'capua');
 town.controller='senate';town.legalSovereign='caesar';town.administrativeStatus='occupied';town.resistance=65;
 state.world.characters.cicero.location=town.theater;state.month=7;
 const cash=state.factions.senate.treasury,reports=structuredClone(state.knowledge.caesar.senate.reports);
 advanceOffices(state);
 assert.equal(localAdministrator(state,town.id),'cicero');
 assert.equal(state.factions.senate.treasury,cash-5);
 assert.deepEqual(state.knowledge.caesar.senate.reports,reports);
});
