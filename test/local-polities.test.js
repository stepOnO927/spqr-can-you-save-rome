import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave, tick, forecastEconomy, region} from '../engine.js';
import {localEntity, localEntityRevenue, localContactQuote, offerLocalContact, advanceLocalEntities, localSiegeQuote, besiegeLocalEntity, localAdministrationQuote, startLocalAdministration} from '../local-polities.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

test('Massilia is an independent city inside, not the owner of, Narbonensis', () => {
  const state = newGame('caesar'), city = localEntity(state, 'massilia');
  assert.equal(region(state, 'narbo').owner, 'caesar');
  assert.equal(city.type, 'city_state');
  assert.equal(city.controller, 'massilia');
  assert.equal(city.legalSovereign, 'massilia');
  assert.equal(city.theater, 'narbo');
  assert.equal(localEntityRevenue(state, 'caesar'), 0);
});

test('port access is negotiated with cost, travel time, refusal and no sovereignty transfer', () => {
  const state = newGame('caesar'), city = localEntity(state, 'massilia');
  const before = state.factions.caesar.treasury;
  city.seed = 0;
  assert.equal(offerLocalContact(state, 'massilia', 'caesar', 'access').ok, true);
  assert.equal(state.factions.caesar.treasury, before - 8);
  assert.equal(localContactQuote(state, 'massilia', 'caesar', 'access').reason, 'busy');
  advanceLocalEntities(state);
  assert.equal(city.pending.remaining, 1);
  advanceLocalEntities(state);
  assert.equal(city.lastOutcome.accepted, true);
  assert.equal(city.controller, 'massilia');
  assert.equal(city.overlord, null);
  assert.equal(localEntityRevenue(state, 'caesar'), 1);
  assert.equal(localContactQuote(state, 'massilia', 'caesar', 'access').reason, 'cooldown');
  const loaded = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(localEntity(loaded, 'massilia').access.caesar, city.access.caesar);

  const refused = newGame('caesar'), other = localEntity(refused, 'massilia');
  other.seed = 1000;
  offerLocalContact(refused, 'massilia', 'caesar', 'access');
  advanceLocalEntities(refused);advanceLocalEntities(refused);
  assert.equal(other.lastOutcome.accepted, false);
  assert.equal(localEntityRevenue(refused, 'caesar'), 0);
});

test('city siege needs an actual army and supply, inflicts losses, and preserves legal title', () => {
  const state = newGame('caesar'), city = localEntity(state, 'massilia');
  assert.equal(localSiegeQuote(state, 'massilia', 'xiii').ok, false);
  const army = state.armies.find(unit => unit.id === 'viii');
  const men = army.men, food = state.factions.caesar.food;
  const beforeRevenue = forecastEconomy(state, 'caesar').treasury;
  assert.equal(besiegeLocalEntity(state, 'massilia', army.id).ok, true);
  assert.equal(state.factions.caesar.food, food - 8);
  for (let i = 0; i < 3; i++) advanceLocalEntities(state);
  assert.equal(city.controller, 'caesar');
  assert.equal(city.legalSovereign, 'massilia');
  assert.equal(city.militaryOccupier, 'caesar');
  assert.equal(city.administrativeStatus, 'occupied');
  assert.equal(region(state, 'narbo').owner, 'caesar');
  assert.ok(army.men < men);
  assert.equal(localEntityRevenue(state, 'caesar'), 2);
  assert.ok(forecastEconomy(state, 'caesar').treasury > beforeRevenue);
  region(state, 'narbo').owner = 'senate';
  assert.equal(localEntityRevenue(state, 'caesar'), 0);
  assert.equal(localAdministrationQuote(state, 'massilia').reason, 'route_cut');
  region(state, 'narbo').owner = 'caesar';
  assert.equal(localAdministrationQuote(state, 'massilia').ok, true);
  const treasury = state.factions.caesar.treasury;
  assert.equal(startLocalAdministration(state, 'massilia').ok, true);
  assert.equal(state.factions.caesar.treasury, treasury - 12);
  army.region = 'cisalpine';
  advanceLocalEntities(state);
  assert.equal(city.administrationProject.remaining, 2);
  army.region = 'narbo';
  advanceLocalEntities(state);advanceLocalEntities(state);
  assert.equal(city.administrativeStatus, 'administered');
  assert.equal(city.legalSovereign, 'massilia');
  assert.equal(localEntityRevenue(state, 'caesar'), 3);
});

test('an accepted protectorate keeps city sovereignty and grants limited trade and tribute', () => {
  const state = newGame('caesar'), city = localEntity(state, 'massilia');
  city.seed = 1972;
  assert.equal(offerLocalContact(state, 'massilia', 'caesar', 'protectorate').ok, true);
  for (let i = 0; i < 3; i++) advanceLocalEntities(state);
  assert.equal(city.lastOutcome.accepted, true);
  assert.equal(city.controller, 'massilia');
  assert.equal(city.legalSovereign, 'massilia');
  assert.equal(city.overlord, 'caesar');
  assert.equal(localEntityRevenue(state, 'caesar'), 1);
  state.month = 12;
  const treasury = state.factions.caesar.treasury;
  advanceLocalEntities(state);
  assert.equal(state.factions.caesar.treasury, treasury + 1);
});

test('AI uses the same local contact path and legacy saves keep their original map', () => {
  const state = newGame('senate');
  tick(state);
  assert.equal(localEntity(state, 'massilia').pending?.actor, 'caesar');
  const old = newGame('caesar');
  delete region(old, 'narbo').localEntities;
  upgradeSave(old);
  assert.equal(localEntity(old, 'massilia'), null);
  assert.equal(region(old, 'narbo').owner, 'caesar');
});

test('inspector catches invalid local geography and controller without treating city autonomy as a missing faction', () => {
  const state = newGame('caesar');
  assert.equal(startupDiagnostics(state).fatal.length, 0);
  const city = localEntity(state, 'massilia');
  city.coordinates = [NaN, 43];
  city.controller = 'missing_power';
  const codes = startupDiagnostics(state).fatal.map(finding => finding.code);
  assert.ok(codes.includes('invalid-local-geography'));
  assert.ok(codes.includes('invalid-local-controller'));
});
