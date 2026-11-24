import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave, previewMarch, moveArmy, tick} from '../engine.js';
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

test('a strained field army takes longer to march and the preview matches its order', () => {
  const state = newGame('caesar'), army = state.armies.find(unit => unit.id === 'xiii');
  assert.equal(previewMarch(state, army.id, 'italiaN').months, 1);
  army.region = 'roma';
  const cutOff = previewMarch(state, army.id, 'italiaN');
  assert.equal(cutOff.supplyDelay, 2);
  assert.equal(cutOff.months, 3);
  assert.equal(moveArmy(state, army.id, 'italiaN').ok, true);
  assert.equal(army.move.remaining, cutOff.months);
  army.move = null;
  army.region = 'gaul'; army.men = 12000;
  state.regions.find(region => region.id === 'gaul').administrativeStatus = 'occupied';
  state.regions.find(region => region.id === 'narbo').administrativeStatus = 'occupied';
  assert.equal(armyExpeditionSupply(state, army).status, 'partial');
  assert.equal(previewMarch(state, army.id, 'narbo').supplyDelay, 1);
});

test('AI seeks an actual integrated relief point after prolonged supply strain', () => {
  const state = newGame('senate'), army = state.armies.find(unit => unit.id === 'xiii');
  army.region = 'italiaN';
  army.expeditionSupply = {status: 'partial', strainMonths: 1, year: -49, month: 1};
  const forward = state.regions.find(region => region.id === 'italiaN');
  forward.owner = 'caesar'; forward.administrativeStatus = 'occupied'; forward.supply = 2;
  state.world.imperium = {enabled: false};
  tick(state);
  assert.equal(army.expeditionSupply.status, 'partial');
  assert.equal(army.expeditionSupply.strainMonths, 2);
  assert.equal(army.move?.to, 'cisalpine');
  assert.equal(state.world.lastSupplyRecovery[army.id], state.year * 12 + state.month);
});

test('AI follows a controlled two-leg relief route and reevaluates the destination', () => {
  const state = newGame('senate'), army = state.armies.find(unit => unit.id === 'xiii');
  const gaul = state.regions.find(place => place.id === 'gaul');
  const narbo = state.regions.find(place => place.id === 'narbo');
  army.region = gaul.id;
  gaul.supply = 2;
  narbo.supply = 2;
  gaul.administrativeStatus = 'occupied';
  narbo.administrativeStatus = 'occupied';
  state.world.imperium = {enabled: false};
  tick(state);
  assert.equal(army.expeditionSupply.status, 'partial');
  assert.equal(army.move?.to, 'narbo');
  army.move.remaining = 1;
  tick(state);
  assert.equal(army.region, 'narbo');
  assert.equal(army.expeditionSupply.status, 'partial');
  assert.equal(army.move?.to, 'cisalpine');
});

test('AI relief route does not cross an uncontrolled theater', () => {
  const state = newGame('senate'), army = state.armies.find(unit => unit.id === 'xiii');
  army.region = 'gaul';
  state.regions.find(place => place.id === 'gaul').supply = 2;
  state.regions.find(place => place.id === 'gaul').administrativeStatus = 'occupied';
  state.regions.find(place => place.id === 'narbo').owner = 'senate';
  state.wars = [];
  state.world.imperium = {enabled: false};
  tick(state);
  assert.equal(army.expeditionSupply.status, 'cut_off');
  assert.equal(army.move?.to, undefined);
});

test('AI uses a paid sea link to leave a strained island garrison', () => {
  const state = newGame('caesar'), army = state.armies.find(unit => unit.id === 'pompey');
  army.region = 'sicilia';
  const island = state.regions.find(place => place.id === 'sicilia');
  island.supply = 1; island.administrativeStatus = 'occupied';
  state.world.imperium = {enabled: false}; state.wars = [];
  state.factions.senate.treasury = 500;
  tick(state);
  assert.equal(army.expeditionSupply.status, 'partial');
  const fare = previewMarch(state, army.id, 'africa').seaCost;
  const control = upgradeSave(JSON.parse(JSON.stringify(state)));
  control.world.lastSupplyRecovery = {[army.id]: 999999};
  tick(state); tick(control);
  assert.equal(army.move?.sea, true);
  assert.ok(['africa', 'italiaS'].includes(army.move.to));
  assert.equal(state.regions.find(place => place.id === army.move.to).owner, 'senate');
  assert.equal(control.factions.senate.treasury - state.factions.senate.treasury, fare);
});

test('AI does not order a sea relief trip it cannot pay for', () => {
  const state = newGame('caesar'), army = state.armies.find(unit => unit.id === 'pompey');
  army.region = 'sicilia';
  const island = state.regions.find(place => place.id === 'sicilia');
  island.supply = 1; island.administrativeStatus = 'occupied';
  state.world.imperium = {enabled: false}; state.wars = [];
  state.factions.senate.treasury = -100;
  tick(state); tick(state);
  assert.equal(army.expeditionSupply.status, 'partial');
  assert.equal(army.move, null);
});
