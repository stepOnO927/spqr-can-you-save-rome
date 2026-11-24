import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, region, upgradeSave} from '../engine.js';
import {transferTerritory} from '../territory.js';
import {localEntity, localEntityRevenue, localSubmissionQuote, offerLocalSubmission, advanceLocalEntities, localSiegeQuote, besiegeLocalEntity, startLocalAdministration} from '../local-polities.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';
import {configureStartingDifficulty} from '../difficulty.js';

test('six sourced Italian towns are local settlements, not extra sovereign theaters', () => {
  const state = newGame('caesar');
  for (const id of ['ariminum', 'iguvium', 'auximum', 'corfinium', 'capua', 'brundisium']) {
    const town = localEntity(state, id);
    assert.equal(town.type, 'roman_town');
    assert.equal(town.controller, 'senate');
    assert.equal(town.legalSovereign, 'senate');
    assert.ok(town.source.includes('/Caesar/Civil_Wars/1A'));
    assert.ok(Array.isArray(town.coordinates));
  }
  assert.equal(localEntity(state,'iguvium').coordinateSource,'https://pleiades.stoa.org/places/413174');
  assert.equal(localEntity(state,'auximum').coordinateSource,'https://pleiades.stoa.org/places/413045');
  assert.equal(localEntity(state,'corfinium').coordinateSource,'https://pleiades.stoa.org/places/413105');
  assert.equal(localEntity(state,'iguvium').theater,'italiaN');
  assert.equal(localEntity(state,'auximum').theater,'italiaN');
  assert.equal(localEntity(state,'corfinium').theater,'italiaS');
  assert.equal(state.regions.length, 24);
  assert.equal(startupDiagnostics(state).fatal.length, 0);
});

test('a Roman town can submit after host conquest without surrendering legal title', () => {
  const state = newGame('caesar'), town = localEntity(state, 'ariminum');
  transferTerritory(state, 'italiaN', 'caesar');
  state.armies.find(army => army.id === 'xiii').region = 'italiaN';
  town.seed = 0;
  assert.equal(localSubmissionQuote(state, town.id).ok, true);
  const treasury = state.factions.caesar.treasury;
  assert.equal(offerLocalSubmission(state, town.id).ok, true);
  assert.equal(state.factions.caesar.treasury, treasury - 6);
  advanceLocalEntities(state); advanceLocalEntities(state);
  assert.equal(town.controller, 'caesar');
  assert.equal(town.legalSovereign, 'senate');
  assert.equal(town.administrativeStatus, 'occupied');
  assert.equal(region(state, 'italiaN').owner, 'caesar');
  assert.equal(startLocalAdministration(state, town.id).ok, true);
});

test('Auximum civic sympathy improves, but does not guarantee, a delayed Caesarian submission', () => {
  const decide = (id, seed) => {
    const state = newGame('caesar'), town = localEntity(state, id);
    transferTerritory(state, 'italiaN', 'caesar');
    state.armies.find(army => army.id === 'xiii').region = 'italiaN';
    town.seed = seed;
    assert.equal(offerLocalSubmission(state, id).ok, true);
    advanceLocalEntities(state); advanceLocalEntities(state);
    return {controller: town.controller, legalSovereign: town.legalSovereign};
  };
  assert.equal(decide('ariminum', 1100).controller, 'senate');
  assert.deepEqual(decide('auximum', 1100), {controller: 'caesar', legalSovereign: 'senate'});
  assert.equal(decide('auximum', 1700).controller, 'senate');
});

test('Roman town decisions receive a campaign seed and retain it through save loading', () => {
  const first = configureStartingDifficulty(newGame('caesar'), 'standard', false, {localSeed: 15});
  const second = configureStartingDifficulty(newGame('caesar'), 'standard', false, {localSeed: 16});
  const seed = localEntity(first, 'auximum').seed;
  assert.notEqual(seed, localEntity(second, 'auximum').seed);
  assert.equal(localEntity(upgradeSave(JSON.parse(JSON.stringify(first))), 'auximum').seed, seed);
});

test('Auximum adds a local objective without counting its theater tax twice', () => {
  const state = newGame('caesar'), withTown = localEntityRevenue(state, 'senate');
  const north = region(state, 'italiaN');
  north.localEntities = north.localEntities.filter(entity => entity.id !== 'auximum');
  assert.equal(localEntityRevenue(state, 'senate'), withTown);
});

test('a real army can besiege a hostile port town without annexing the host theater', () => {
  const state = newGame('caesar'), town = localEntity(state, 'brundisium'), army = state.armies.find(unit => unit.id === 'xiii');
  army.region = 'italiaS';
  const men = army.men;
  assert.equal(localSiegeQuote(state, town.id, army.id).ok, true);
  assert.equal(besiegeLocalEntity(state, town.id, army.id).ok, true);
  for (let month = 0; month < 3; month++) advanceLocalEntities(state);
  assert.equal(town.controller, 'caesar');
  assert.equal(town.legalSovereign, 'senate');
  assert.equal(region(state, 'italiaS').owner, 'senate');
  assert.ok(army.men < men);
});

test('AI may seek local submission through the same delayed offer', () => {
  const state = newGame('senate'), town = localEntity(state, 'ariminum');
  transferTerritory(state, 'italiaN', 'caesar');
  state.armies.find(army => army.id === 'xiii').region = 'italiaN';
  state.month = 2;
  tick(state);
  assert.equal(town.pending?.proposal, 'submission');
  assert.equal(town.pending?.actor, 'caesar');
});
