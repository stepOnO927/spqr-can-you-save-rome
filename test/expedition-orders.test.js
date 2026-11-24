import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, startExpedition, cancelExpedition, resumeExpedition, issueMilitaryOrder, upgradeSave} from '../engine.js';
import {planRoutes} from '../route-planner.js';
import {observeControl} from '../control-intelligence.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

const routeTo = (state, destination) => planRoutes(state, 'xiii', destination).routes[0].nodes;

test('a town expedition remembers its local objective without taking the town or theater', () => {
  const state = newGame('caesar'), veterans = state.armies.find(unit => unit.id === 'viii');
  const route = planRoutes(state, veterans.id, 'italiaS').routes.find(item => item.status === 'legal').nodes;
  assert.equal(startExpedition(state, veterans.id, route, state.player, {localObjectiveId: 'iguvium'}).reason, 'invalid_objective');
  assert.equal(veterans.move, null);
  assert.equal(startExpedition(state, veterans.id, route, state.player, {localObjectiveId: 'corfinium'}).ok, true);
  assert.equal(veterans.expedition.localObjectiveId, 'corfinium');
  const restored = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.armies.find(unit => unit.id === veterans.id).expedition.localObjectiveId, 'corfinium');
  assert.equal(restored.regions.find(region => region.id === 'italiaS').owner, 'senate');
  const town = restored.regions.flatMap(region => region.localEntities || []).find(entity => entity.id === 'corfinium');
  assert.equal(town.controller, 'senate');
  assert.equal(town.legalSovereign, 'senate');
  assert.equal(startupDiagnostics(restored).warnings.some(item => item.code === 'invalid-expedition-objective'), false);
  town.theater = 'italiaN';
  assert.equal(startupDiagnostics(restored).warnings.some(item => item.code === 'invalid-expedition-objective'), true);
});

test('a confirmed multi-theater expedition advances one validated leg at a time and survives a save', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  assert.equal(startExpedition(state, legion.id, routeTo(state, 'gaul')).ok, true);
  assert.equal(legion.move.to, 'narbo');
  const firstLegMonths = legion.move.remaining;
  tick(state);
  assert.equal(legion.region, 'cisalpine');
  assert.equal(legion.move.remaining, firstLegMonths - 1);
  for (let month = 1; month < firstLegMonths; month++) tick(state);
  assert.equal(legion.region, 'narbo');
  assert.equal(legion.move.to, 'gaul');
  assert.equal(legion.expedition.nextIndex, 2);
  assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).armies.find(unit => unit.id === legion.id).expedition.destination, 'gaul');
  const secondLegMonths = legion.move.remaining;
  assert.ok(secondLegMonths >= 1);
  for (let month = 0; month < secondLegMonths; month++) tick(state);
  assert.equal(legion.region, 'gaul');
  assert.equal(legion.expedition.status, 'completed');
  assert.equal(startupDiagnostics(state).warnings.length, 0);
});

test('a selected known staging point pauses the march until the player resumes it', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  const nodes = routeTo(state, 'gaul');
  assert.deepEqual(nodes, ['cisalpine', 'narbo', 'gaul']);
  assert.equal(startExpedition(state, legion.id, nodes, state.player, {stagingStops: ['gaul']}).reason, 'invalid_staging');
  assert.equal(startExpedition(state, legion.id, nodes, state.player, {stagingStops: ['narbo', 'narbo']}).reason, 'invalid_staging');
  assert.equal(legion.move, null);
  assert.equal(startExpedition(state, legion.id, nodes, state.player, {stagingStops: ['narbo']}).ok, true);
  const monthsToStaging = legion.move.remaining;
  for (let month = 0; month < monthsToStaging; month++) tick(state);
  assert.equal(legion.region, 'narbo');
  assert.equal(legion.move, null);
  assert.equal(legion.expedition.status, 'paused');
  assert.equal(legion.expedition.reason, 'staging');
  assert.equal(legion.expedition.nextIndex, 2);
  assert.deepEqual(upgradeSave(JSON.parse(JSON.stringify(state))).armies.find(unit => unit.id === legion.id).expedition.stagingStops, ['narbo']);
  assert.equal(startupDiagnostics(state).warnings.length, 0);
  tick(state);
  assert.equal(legion.region, 'narbo');
  assert.equal(legion.move, null);
  state.regions.find(place => place.id === 'gaul').owner = 'parthia';
  observeControl(state);
  assert.equal(resumeExpedition(state, legion.id).ok, false);
  assert.equal(legion.expedition.reason, 'permission');
  assert.equal(legion.move, null);
  state.regions.find(place => place.id === 'gaul').owner = 'caesar';
  observeControl(state);
  assert.equal(resumeExpedition(state, legion.id).ok, true);
  assert.equal(legion.move.to, 'gaul');
  assert.equal(legion.expedition.status, 'active');
  const saved=legion.expedition.stagingStops;
  legion.expedition.stagingStops=['not-on-route'];
  assert.ok(startupDiagnostics(state).warnings.some(item => item.code === 'invalid-expedition-order'));
  legion.expedition.stagingStops=saved;
});

test('changed border control pauses the route without an illegal crossing and can be rechecked', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  assert.equal(startExpedition(state, legion.id, routeTo(state, 'gaul')).ok, true);
  state.regions.find(region => region.id === 'narbo').owner = 'parthia';
  const monthsToBorder = legion.move.remaining;
  for (let month = 0; month < monthsToBorder - 1; month++) {
    tick(state);
    assert.equal(legion.move?.to, 'narbo');
  }
  tick(state);
  assert.equal(legion.region, 'cisalpine');
  assert.equal(legion.move, null);
  assert.equal(legion.expedition.status, 'paused');
  assert.equal(legion.expedition.reason, 'permission');
  assert.equal(state.borderIncidents.length, 0);
  state.regions.find(region => region.id === 'narbo').owner = 'caesar';
  observeControl(state);
  assert.equal(resumeExpedition(state, legion.id).ok, true);
  assert.equal(legion.move.to, 'narbo');
});

test('battle pauses future legs for a player decision', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  const path = planRoutes(state, legion.id, 'roma').routes.find(route => route.firstStep === 'italiaN').nodes;
  assert.equal(startExpedition(state, legion.id, path).ok, true);
  tick(state);
  assert.equal(state.battles[0].attacker.id, legion.id);
  assert.equal(legion.expedition.status, 'paused');
  assert.equal(legion.expedition.reason, 'battle');
  assert.equal(legion.move, null);
  assert.equal(resumeExpedition(state, legion.id).ok, true);
  assert.equal(legion.move.to, 'roma');
});

test('player cancellation stops future legs; an unsafe route is never started automatically', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  const unsafe = planRoutes(state, legion.id, 'parthia').routes.find(route => route.status === 'requires_permission');
  assert.equal(startExpedition(state, legion.id, unsafe.nodes).reason, 'route_unconfirmed');
  assert.equal(startExpedition(state, legion.id, routeTo(state, 'gaul')).ok, true);
  assert.equal(cancelExpedition(state, legion.id).ok, true);
  const monthsToNarbo = legion.move.remaining;
  for (let month = 0; month < monthsToNarbo; month++) tick(state);
  assert.equal(legion.region, 'narbo');
  assert.equal(legion.move, null);
  assert.equal(legion.expedition.status, 'cancelled');
  assert.equal(startExpedition(state, legion.id, planRoutes(state, legion.id, 'gaul').routes[0].nodes).ok, true);
  assert.equal(issueMilitaryOrder(state, legion.id, 'cancel').ok, true);
  assert.equal(legion.expedition.status, 'cancelled');
  legion.expedition.nextIndex = 900;
  assert.ok(startupDiagnostics(state).warnings.some(item => item.code === 'invalid-expedition-order'));
});
