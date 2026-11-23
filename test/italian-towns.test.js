import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, region} from '../engine.js';
import {transferTerritory} from '../territory.js';
import {localEntity, localSubmissionQuote, offerLocalSubmission, advanceLocalEntities, localSiegeQuote, besiegeLocalEntity, startLocalAdministration} from '../local-polities.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

test('five sourced Italian towns are local settlements, not extra sovereign theaters', () => {
  const state = newGame('caesar');
  for (const id of ['ariminum', 'iguvium', 'corfinium', 'capua', 'brundisium']) {
    const town = localEntity(state, id);
    assert.equal(town.type, 'roman_town');
    assert.equal(town.controller, 'senate');
    assert.equal(town.legalSovereign, 'senate');
    assert.ok(town.source.includes('/Caesar/Civil_Wars/1A'));
    assert.ok(Array.isArray(town.coordinates));
  }
  assert.equal(localEntity(state,'iguvium').coordinateSource,'https://pleiades.stoa.org/places/413174');
  assert.equal(localEntity(state,'corfinium').coordinateSource,'https://pleiades.stoa.org/places/413105');
  assert.equal(localEntity(state,'iguvium').theater,'italiaN');
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
