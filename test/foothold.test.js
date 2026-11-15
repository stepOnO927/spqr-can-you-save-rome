import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, upgradeSave, region} from '../engine.js';
import {localEntity, offerLocalContact, advanceLocalEntities, besiegeLocalEntity} from '../local-polities.js';
import {footholdConnected, footholdQuote, footholdShipmentQuote, startFoothold, stockFoothold, resupplyAtFoothold, advanceFootholds} from '../foothold.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

function negotiatedPort() {
  const state = newGame('caesar'), city = localEntity(state, 'massilia');
  city.seed = 0;
  assert.equal(offerLocalContact(state, city.id, 'caesar', 'access').ok, true);
  advanceLocalEntities(state); advanceLocalEntities(state);
  assert.equal(city.lastOutcome.accepted, true);
  return {state, city};
}

test('a negotiated port can become a funded camp with bounded stored food and real army rest', () => {
  const {state, city} = negotiatedPort();
  const army = state.armies.find(unit => unit.id === 'viii');
  const resources = {treasury: state.factions.caesar.treasury, food: state.factions.caesar.food};
  assert.equal(footholdQuote(state, city.id).level, 1);
  assert.equal(startFoothold(state, city.id).ok, true);
  assert.equal(state.factions.caesar.treasury, resources.treasury - 8);
  assert.equal(state.factions.caesar.food, resources.food - 3);
  advanceFootholds(state);
  assert.equal(city.foothold.level, 1);
  assert.equal(city.foothold.stockFood, 0);
  const transport = footholdShipmentQuote(state, city.id, 'caesar', 6).route.treasury;
  assert.equal(stockFoothold(state, city.id, 'caesar', 6).ok, true);
  assert.equal(state.factions.caesar.food, resources.food - 9);
  assert.equal(state.factions.caesar.treasury, resources.treasury - 8 - transport);
  assert.equal(city.foothold.stockFood, 0);
  assert.equal(city.foothold.shipments.length, 1);
  assert.equal(resupplyAtFoothold(state, city.id, army.id).ok, false);
  assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).regions.find(place => place.id === 'narbo').localEntities[0].foothold.shipments.length, 1);
  advanceFootholds(state);
  const morale = army.morale;
  assert.equal(resupplyAtFoothold(state, city.id, army.id).ok, true);
  assert.ok(army.morale > morale);
  assert.equal(city.foothold.stockFood, 4);
  assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).regions.find(place => place.id === 'narbo').localEntities[0].foothold.stockFood, 4);
});

test('a blocked convoy delays and eventually loses its finite cargo', () => {
  const {state, city} = negotiatedPort();
  startFoothold(state, city.id); advanceFootholds(state);
  assert.equal(stockFoothold(state, city.id, 'caesar', 4).ok, true);
  region(state, 'narbo').owner = 'senate';
  advanceFootholds(state);
  assert.equal(city.foothold.shipments[0].blockedMonths, 1);
  assert.equal(city.foothold.stockFood, 0);
  advanceFootholds(state); advanceFootholds(state);
  assert.equal(city.foothold.shipments.length, 0);
  assert.equal(city.lastShipmentLoss.food, 4);
  assert.equal(city.foothold.stockFood, 0);
});

test('in-transit food occupies capacity and invalid saved cargo is diagnosed', () => {
  const {state, city} = negotiatedPort();
  startFoothold(state, city.id); advanceFootholds(state);
  assert.equal(stockFoothold(state, city.id, 'caesar', 10).ok, true);
  const food = state.factions.caesar.food;
  assert.equal(footholdShipmentQuote(state, city.id, 'caesar', 4).reason, 'capacity');
  assert.equal(state.factions.caesar.food, food);
  assert.equal(startupDiagnostics(state).warnings.length, 0);
  city.foothold.shipments[0].remaining = -1;
  assert.ok(startupDiagnostics(state).warnings.some(item => item.code === 'invalid-foothold-shipment'));
});

test('AI sends a paid convoy to its depleted foothold', () => {
  const state = newGame('senate'), city = localEntity(state, 'bibracte');
  city.access.caesar = state.year * 12 + state.month + 24;
  state.armies.find(unit => unit.id === 'xiii').region = 'gaul';
  assert.equal(startFoothold(state, city.id, 'caesar').ok, true);
  advanceFootholds(state);
  state.month = 1;
  tick(state);
  assert.equal(city.foothold.shipments?.[0]?.food, 4);
  assert.ok(city.foothold.shipments[0].transportCost > 0);
});

test('a city outpost requires real control; a severed hostile host pauses construction', () => {
  const {state, city} = negotiatedPort();
  startFoothold(state, city.id); advanceFootholds(state);
  assert.equal(footholdQuote(state, city.id).reason, 'control');
  assert.equal(besiegeLocalEntity(state, city.id, 'viii').ok, true);
  for (let month = 0; month < 3; month++) advanceLocalEntities(state);
  assert.equal(city.controller, 'caesar');
  assert.equal(footholdQuote(state, city.id).level, 2);
  startFoothold(state, city.id);
  const remaining = city.foothold.project.remaining;
  region(state, 'narbo').owner = 'senate';
  assert.equal(footholdConnected(state, city.id, 'caesar'), false);
  advanceFootholds(state);
  assert.equal(city.foothold.project.remaining, remaining);
  region(state, 'narbo').owner = 'caesar';
  advanceFootholds(state); advanceFootholds(state);
  assert.equal(city.foothold.level, 2);
});

test('loss of local rights removes an outpost and records its previous level', () => {
  const {state, city} = negotiatedPort();
  startFoothold(state, city.id); advanceFootholds(state);
  delete city.access.caesar;
  advanceFootholds(state);
  assert.equal(city.foothold, null);
  assert.equal(city.lastFootholdLoss.owner, 'caesar');
  assert.equal(city.lastFootholdLoss.level, 1);
});

test('inspector detects impossible depot inventory in a saved city', () => {
  const {state, city} = negotiatedPort();
  startFoothold(state, city.id); advanceFootholds(state);
  assert.equal(startupDiagnostics(state).warnings.length, 0);
  city.foothold.stockFood = 999;
  assert.ok(startupDiagnostics(state).warnings.some(item => item.code === 'invalid-foothold'));
});
