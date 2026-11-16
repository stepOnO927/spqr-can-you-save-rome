import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, startExpedition, cancelExpedition, resumeExpedition, issueMilitaryOrder, upgradeSave} from '../engine.js';
import {planRoutes} from '../route-planner.js';
import {observeControl} from '../control-intelligence.js';
import {startupDiagnostics} from '../inspector-diagnostics.js';

const routeTo = (state, destination) => planRoutes(state, 'xiii', destination).routes[0].nodes;

test('a confirmed multi-theater expedition advances one validated leg at a time and survives a save', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  assert.equal(startExpedition(state, legion.id, routeTo(state, 'gaul')).ok, true);
  assert.equal(legion.move.to, 'narbo');
  tick(state);
  assert.equal(legion.region, 'cisalpine');
  assert.equal(legion.move.remaining, 1);
  tick(state);
  assert.equal(legion.region, 'narbo');
  assert.equal(legion.move.to, 'gaul');
  assert.equal(legion.expedition.nextIndex, 2);
  assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).armies.find(unit => unit.id === legion.id).expedition.destination, 'gaul');
  tick(state);
  assert.equal(legion.region, 'gaul');
  assert.equal(legion.expedition.status, 'completed');
  assert.equal(startupDiagnostics(state).warnings.length, 0);
});

test('changed border control pauses the route without an illegal crossing and can be rechecked', () => {
  const state = newGame('caesar'), legion = state.armies.find(unit => unit.id === 'xiii');
  assert.equal(startExpedition(state, legion.id, routeTo(state, 'gaul')).ok, true);
  state.regions.find(region => region.id === 'narbo').owner = 'parthia';
  tick(state); tick(state);
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
  tick(state); tick(state);
  assert.equal(legion.region, 'narbo');
  assert.equal(legion.move, null);
  assert.equal(legion.expedition.status, 'cancelled');
  assert.equal(startExpedition(state, legion.id, planRoutes(state, legion.id, 'gaul').routes[0].nodes).ok, true);
  assert.equal(issueMilitaryOrder(state, legion.id, 'cancel').ok, true);
  assert.equal(legion.expedition.status, 'cancelled');
  legion.expedition.nextIndex = 900;
  assert.ok(startupDiagnostics(state).warnings.some(item => item.code === 'invalid-expedition-order'));
});
