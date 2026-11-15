import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {proposeAgreement} from '../agreements.js';
import {planRoutes} from '../route-planner.js';

test('route planner distinguishes legal passage from trade and scoped army access', () => {
  const state = newGame('numidia');
  const unit = state.armies.find(army => army.owner === 'numidia');
  const key = ['numidia', 'mauretania'].sort().join(':'); state.relations[key] = 60;
  assert.equal(planRoutes(state, unit.id, 'mauretania').recommended.status, 'requires_permission');
  assert.equal(proposeAgreement(state, 'numidia', 'mauretania', 'trade').ok, true);
  assert.equal(planRoutes(state, unit.id, 'mauretania').recommended.status, 'requires_permission');
  assert.equal(proposeAgreement(state, 'numidia', 'mauretania', 'military_access', {
    access: {permittedParty: 'numidia', permittedTerritories: ['mauretania']}
  }).ok, true);
  assert.equal(planRoutes(state, unit.id, 'mauretania').recommended.status, 'treaty');
});

test('unknown foreign control stays unknown even when actual ownership differs', () => {
  const state = newGame('numidia');
  const unit = state.armies.find(army => army.owner === 'numidia');
  state.regions.find(region => region.id === 'mauretania').owner = 'egypt';
  delete state.controlKnowledge.numidia.mauretania;
  const result = planRoutes(state, unit.id, 'mauretania');
  assert.equal(result.recommended.status, 'unconfirmed');
  assert.equal(result.recommended.legs[0].reportedOwner, null);
  assert.equal(JSON.stringify(result).includes('egypt'), false);
});

test('long-distance planner offers distinct first steps without creating new geography', () => {
  const state = newGame('caesar');
  const result = planRoutes(state, 'xiii', 'africa');
  assert.equal(result.ok, true);
  assert.ok(result.routes.length >= 2);
  assert.notEqual(result.routes[0].firstStep, result.routes[1].firstStep);
  assert.equal(result.routes.every(route => route.nodes[0] === 'cisalpine' && route.nodes.at(-1) === 'africa'), true);
  assert.equal(planRoutes(state, 'xiii', 'outside').reason, 'outside_scenario');
});
