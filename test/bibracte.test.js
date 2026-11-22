import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {localEntity, localContactQuote, offerLocalContact, advanceLocalEntities} from '../local-polities.js';
import {footholdQuote, footholdSupplyRoute, startFoothold, advanceFootholds, stockFoothold} from '../foothold.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

test('Bibracte is a sourced local Aeduan town, not a new sovereign theater', () => {
  const state = newGame('caesar'), town = localEntity(state, 'bibracte');
  assert.equal(town.type, 'tribe');
  assert.equal(town.controller, 'bibracte');
  assert.equal(town.legalSovereign, 'bibracte');
  assert.equal(town.theater, 'gaul');
  assert.equal(town.spatialAccuracy, 'approximate_site_point');
  assert.ok(town.source.includes('/Caesar/Gallic_War/7E'));
  assert.equal(state.regions.some(region => region.id === 'bibracte'), false);
  assert.equal(startupDiagnostics(state).fatal.length, 0);
});

test('negotiated Aeduan access supports a funded, connected camp with finite food', () => {
  const state = newGame('caesar'), town = localEntity(state, 'bibracte');
  state.armies.find(army => army.id === 'xiii').region = 'gaul';
  town.seed = 0;
  assert.equal(localContactQuote(state, town.id, 'caesar', 'access').ok, true);
  assert.equal(offerLocalContact(state, town.id, 'caesar', 'access').ok, true);
  advanceLocalEntities(state); advanceLocalEntities(state);
  assert.ok(town.access.caesar > state.year * 12 + state.month);
  assert.equal(town.controller, town.id);
  assert.equal(town.legalSovereign, town.id);
  assert.equal(footholdQuote(state, town.id, 'caesar').ok, true);
  assert.equal(startFoothold(state, town.id, 'caesar').ok, true);
  advanceFootholds(state);
  assert.equal(town.foothold.level, 1);
  state.regions.find(region => region.id === 'gaul').administrativeStatus = 'occupied';
  state.regions.find(region => region.id === 'narbo').administrativeStatus = 'occupied';
  const route = footholdSupplyRoute(state, town.id, 'caesar');
  assert.deepEqual(route.nodes, ['cisalpine', 'narbo', 'gaul']);
  assert.equal(route.months, 3);
  assert.equal(stockFoothold(state, town.id, 'caesar', 4).ok, true);
  assert.equal(town.foothold.stockFood, 0);
  assert.equal(town.foothold.shipments.length, 1);
  advanceFootholds(state); advanceFootholds(state);
  assert.equal(town.foothold.stockFood, 0);
  advanceFootholds(state);
  assert.equal(town.foothold.stockFood, 4);
  assert.equal(state.regions.find(region => region.id === 'gaul').owner, 'caesar');
});
