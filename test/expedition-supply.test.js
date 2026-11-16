import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave} from '../engine.js';
import {armyExpeditionSupply, advanceExpeditionSupply} from '../expedition-supply.js';
import {localEntity} from '../local-polities.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

test('a hostile border army buys limited local supply, while deeper isolation causes losses', () => {
  const state = newGame('caesar'), army = state.armies.find(unit => unit.id === 'xiii');
  assert.equal(armyExpeditionSupply(state, army).status, 'full');
  army.region = 'italiaN';
  assert.equal(armyExpeditionSupply(state, army).status, 'local_purchase');
  const treasury = state.factions.caesar.treasury;
  advanceExpeditionSupply(state);
  assert.equal(state.factions.caesar.treasury, treasury - 3);
  assert.equal(army.men, 7200);
  army.region = 'roma';
  assert.equal(armyExpeditionSupply(state, army).status, 'cut_off');
  advanceExpeditionSupply(state);
  const men = army.men, morale = army.morale;
  advanceExpeditionSupply(state);
  assert.ok(army.men < men);
  assert.ok(army.morale < morale);
  assert.equal(army.expeditionSupply.strainMonths, 2);
  assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).armies.find(unit => unit.id === 'xiii').expeditionSupply.status, 'cut_off');
  assert.equal(startupDiagnostics(state).warnings.length, 0);
});

test('a connected forward depot spends finite food on an oversized field army', () => {
  const state = newGame('caesar'), army = state.armies.find(unit => unit.id === 'xiii'), town = localEntity(state, 'bibracte');
  state.regions.find(region => region.id === 'gaul').administrativeStatus = 'occupied';
  state.regions.find(region => region.id === 'narbo').administrativeStatus = 'occupied';
  army.region = 'gaul'; army.men = 12000;
  town.access.caesar = state.year * 12 + state.month + 12;
  assert.equal(armyExpeditionSupply(state, army).status, 'partial');
  town.foothold = {owner: 'caesar', level: 1, stockFood: 3, project: null};
  assert.equal(armyExpeditionSupply(state, army).status, 'depot');
  advanceExpeditionSupply(state);
  assert.equal(town.foothold.stockFood, 0);
  assert.equal(army.expeditionSupply.status, 'depot');
  assert.equal(armyExpeditionSupply(state, army).status, 'partial');
  state.regions.find(region => region.id === 'narbo').owner = 'senate';
  assert.equal(armyExpeditionSupply(state, army).status, 'cut_off');
});
