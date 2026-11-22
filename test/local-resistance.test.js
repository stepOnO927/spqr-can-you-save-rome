import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {transferTerritory} from '../territory.js';
import {localEntity, localEntityRevenue} from '../local-polities.js';
import {localSecurity, advanceLocalResistance} from '../local-resistance.js';
import {advanceFootholds} from '../foothold.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

function occupiedTown() {
  const state = newGame('caesar'), town = localEntity(state, 'ariminum');
  transferTerritory(state, 'italiaN', 'caesar');
  town.controller = 'caesar'; town.militaryOccupier = 'caesar'; town.administrativeStatus = 'occupied'; town.resistance = 30;
  return {state, town};
}

test('connected local security lowers resistance without changing legal title', () => {
  const {state, town} = occupiedTown();
  state.armies.find(army => army.id === 'xiii').region = 'italiaN';
  assert.deepEqual(localSecurity(state, town), {garrison: true, connected: true});
  assert.deepEqual(advanceLocalResistance(state), []);
  assert.equal(town.resistance, 26);
  assert.equal(town.controller, 'caesar');
  assert.equal(town.legalSovereign, 'senate');
});

test('a high-resistance town can return to its legal authority after garrison loss', () => {
  const {state, town} = occupiedTown();
  town.resistance = 98;
  town.foothold = {owner: 'caesar', level: 1, stockFood: 2, project: null};
  const outcome = advanceLocalResistance(state);
  assert.equal(outcome[0].id, town.id);
  assert.equal(town.controller, 'senate');
  assert.equal(town.legalSovereign, 'senate');
  assert.equal(state.regions.find(region => region.id === 'italiaN').owner, 'caesar');
  advanceFootholds(state);
  assert.equal(town.foothold, null);
  assert.equal(town.lastFootholdLoss.owner, 'caesar');
  assert.equal(startupDiagnostics(state).fatal.length, 0);
});

test('a real garrison prevents automatic local reversion even at peak resistance', () => {
  const {state, town} = occupiedTown();
  town.resistance = 100;
  state.armies.find(army => army.id === 'xiii').region = 'italiaN';
  assert.deepEqual(advanceLocalResistance(state), []);
  assert.equal(town.controller, 'caesar');
});

test('hostile and unrestful towns affect the owner’s local tax income', () => {
  const state = newGame('caesar'), town = localEntity(state, 'ariminum');
  transferTerritory(state, 'italiaN', 'caesar');
  assert.equal(localEntityRevenue(state, 'caesar'), -1);
  town.controller = 'caesar'; town.resistance = 20;
  assert.equal(localEntityRevenue(state, 'caesar'), 1);
  town.resistance = 80;
  assert.equal(localEntityRevenue(state, 'caesar'), 0);
});
