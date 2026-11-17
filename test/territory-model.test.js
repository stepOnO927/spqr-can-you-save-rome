import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave, region, resolveBattle, forecastEconomy} from '../engine.js';
import {initializeTerritories, territoryRecord, transferTerritory, administrationQuote, startAdministration, advanceTerritories} from '../territory.js';
import {renderTerritoryFacts} from '../map-lab/territory-facts.js';

test('territory registry keeps playable links and names without inventing precise boundaries', () => {
  const state = newGame('caesar');
  const italy = territoryRecord(state, 'italiaN');
  assert.equal(italy.legalSovereign, 'senate');
  assert.equal(italy.administrativeStatus, 'integrated');
  assert.ok(italy.neighbors.some(edge => edge.id === 'cisalpine'));
  assert.equal(italy.principalSettlement, 'Ariminum');
  assert.equal(territoryRecord(state, 'galatia').spatialReference.kind, 'theater_anchor');
  assert.equal(territoryRecord(state, 'absent'), null);
});

test('military capture preserves legal title, while restoration and peaceful transfer update it', () => {
  const state = newGame('caesar');
  assert.equal(transferTerritory(state, 'italiaN', 'caesar').ok, true);
  const italy = region(state, 'italiaN');
  assert.equal(italy.owner, 'caesar');
  assert.equal(italy.legalSovereign, 'senate');
  assert.equal(italy.militaryOccupier, 'caesar');
  assert.equal(italy.administrativeStatus, 'occupied');
  assert.equal(transferTerritory(state, 'italiaN', 'senate').ok, true);
  assert.equal(italy.administrativeStatus, 'integrated');
  assert.equal(italy.militaryOccupier, null);
  assert.equal(transferTerritory(state, 'italiaN', 'caesar', 'peaceful').ok, true);
  assert.equal(italy.legalSovereign, 'caesar');
  assert.equal(italy.administrativeStatus, 'integrated');
});

test('merging a rebel command does not erase a third party legal claim', () => {
  const state = newGame('caesar');
  state.factions.caesar_claimant = {treasury: 0, food: 0, manpower: 0, stability: 40, legitimacy: 30, tax: 'normal', research: 0};
  transferTerritory(state, 'italiaN', 'caesar_claimant');
  assert.equal(region(state, 'italiaN').legalSovereign, 'senate');
  transferTerritory(state, 'italiaN', 'caesar', 'command_merger');
  assert.equal(region(state, 'italiaN').legalSovereign, 'senate');
  assert.equal(region(state, 'italiaN').militaryOccupier, 'caesar');
  assert.equal(region(state, 'italiaN').administrativeStatus, 'occupied');
});

test('occupied tax is reduced and administration takes resources, time and a garrison', () => {
  const state = newGame('caesar');
  transferTerritory(state, 'italiaN', 'caesar');
  const italy = region(state, 'italiaN');
  italy.loyalty = 38;
  const occupiedTax = forecastEconomy(state, 'caesar').treasury;
  italy.administrativeStatus = 'integrated';
  const integratedTax = forecastEconomy(state, 'caesar').treasury;
  italy.administrativeStatus = 'occupied';
  assert.ok(integratedTax > occupiedTax);
  assert.equal(administrationQuote(state, 'italiaN').reason, 'garrison');
  const army = state.armies.find(unit => unit.id === 'xiii');
  army.region = 'italiaN';
  const before = {treasury: state.factions.caesar.treasury, food: state.factions.caesar.food};
  assert.equal(startAdministration(state, 'italiaN').ok, true);
  assert.equal(state.factions.caesar.treasury, before.treasury - 18);
  assert.equal(state.factions.caesar.food, before.food - 5);
  army.region = 'cisalpine';
  advanceTerritories(state);
  assert.equal(italy.administrationProject.remaining, 3);
  assert.equal(italy.loyalty, 37);
  army.region = 'italiaN';
  for (let i = 0; i < 3; i++) advanceTerritories(state);
  assert.equal(italy.administrativeStatus, 'administered');
  assert.equal(italy.legalSovereign, 'senate');
  assert.equal(italy.militaryOccupier, 'caesar');
  assert.ok(forecastEconomy(state, 'caesar').treasury > occupiedTax);
  const loaded = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(region(loaded, 'italiaN').administrativeStatus, 'administered');
});

test('a real battle changes control through the same territorial transition', () => {
  const state = newGame('caesar');
  const attacker = state.armies.find(army => army.id === 'xiii');
  const defender = state.armies.find(army => army.id === 'italy');
  attacker.men = 50000;
  defender.men = 1;
  resolveBattle(state, attacker, defender, region(state, 'italiaN'));
  const italy = region(state, 'italiaN');
  assert.equal(italy.owner, 'caesar');
  assert.equal(italy.legalSovereign, 'senate');
  assert.equal(italy.militaryOccupier, 'caesar');
});

test('legacy saves migrate without changing control or foreign intelligence', () => {
  const state = newGame('caesar');
  const old = JSON.parse(JSON.stringify(state));
  for (const territory of old.regions) {
    delete territory.legalSovereign;
    delete territory.militaryOccupier;
    delete territory.administrativeStatus;
    delete territory.controlSince;
  }
  const reports = JSON.stringify(old.controlKnowledge);
  upgradeSave(old);
  assert.equal(region(old, 'roma').owner, 'senate');
  assert.equal(region(old, 'roma').legalSovereign, 'senate');
  assert.equal(JSON.stringify(old.controlKnowledge), reports);
  const snapshot = JSON.stringify(old.regions);
  initializeTerritories(old);
  assert.equal(JSON.stringify(old.regions), snapshot);
});

test('territory inspector shows own legal title and hides foreign actual title', () => {
  const state = newGame('caesar');
  transferTerritory(state, 'italiaN', 'caesar');
  const own = renderTerritoryFacts({state, territory: region(state, 'italiaN')});
  assert.match(own, /Legal sovereign<\/span><b>Senate/);
  assert.match(own, /Administration<\/span><b>Military occupation/);
  const foreign = renderTerritoryFacts({state, territory: region(state, 'roma')});
  assert.match(foreign, /Legal sovereign<\/span><b>Unknown/);
});
