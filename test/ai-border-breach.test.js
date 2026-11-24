import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick} from '../engine.js';
import {observeControl} from '../control-intelligence.js';

function blockedWarRoute(difficulty) {
  const state = newGame('senate');
  state.world.imperium = {enabled: false};
  state.difficulty = difficulty;
  state.factions.caesar.treasury = 500;
  state.factions.caesar.food = 200;
  for (const army of state.armies.filter(unit => unit.owner === 'caesar')) army.men = 15000;
  for (const army of state.armies.filter(unit => unit.owner === 'senate')) army.men = 500;
  for (const id of ['italiaN', 'hispaniaN']) state.regions.find(region => region.id === id).owner = 'galatia';
  observeControl(state);
  return state;
}

test('an offensive expert AI may deliberately cross one reported closed border to reach a war target', () => {
  const state = blockedWarRoute('expert');
  tick(state);
  const legion = state.armies.find(army => army.id === 'xiii');
  assert.equal(state.world.strategicPlans.caesar.goal, 'campaign');
  assert.equal(legion.move?.to, 'italiaN');
  assert.equal(legion.move?.intent, 'unauthorized_entry');
  assert.ok(Number.isInteger(state.world.lastUnauthorizedAttempt.caesar));
  tick(state);
  const incident = state.borderIncidents.find(item => item.attacker === 'caesar' && item.defender === 'galatia');
  assert.equal(incident?.outcome, 'crossed');
  assert.equal(incident?.scope, 'local');
  assert.equal(state.wars.some(war => war.includes('caesar') && war.includes('galatia')), false);
});

test('standard AI does not initiate the deliberate border breach', () => {
  const state = blockedWarRoute('standard');
  tick(state);
  assert.equal(state.armies.find(army => army.id === 'xiii').move?.intent, undefined);
  assert.equal(state.world.lastUnauthorizedAttempt?.caesar, undefined);
});
