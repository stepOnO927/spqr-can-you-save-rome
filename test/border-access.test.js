import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave, previewMarch} from '../engine.js';
import {proposeAgreement, terminateAgreement} from '../agreements.js';
import {militaryAccessStatus} from '../border-access.js';

const friendly = (state, a, b) => { state.relations[[a, b].sort().join(':')] = 60; };

test('trade and alliance do not silently create army transit rights', () => {
  const state = newGame('numidia');
  friendly(state, 'numidia', 'mauretania');
  assert.equal(proposeAgreement(state, 'numidia', 'mauretania', 'trade').ok, true);
  state.alliances.push(['numidia', 'mauretania']);
  assert.equal(militaryAccessStatus(state, 'numidia', 'mauretania').allowed, false);
  assert.equal(militaryAccessStatus(state, 'numidia', 'mauretania', null).basis, 'unconfirmed');
  const unit = state.armies.find(army => army.owner === 'numidia');
  assert.equal(previewMarch(state, unit.id, 'mauretania').reason, 'peace');
});

test('a limited military treaty permits only its stated direction and theaters', () => {
  const state = newGame('numidia');
  friendly(state, 'numidia', 'mauretania');
  const agreement = proposeAgreement(state, 'numidia', 'mauretania', 'military_access', {
    access: {permittedParty: 'numidia', permittedTerritories: ['mauretania']}
  });
  assert.equal(agreement.ok, true);
  assert.equal(militaryAccessStatus(state, 'numidia', 'mauretania').basis, 'limited_treaty');
  assert.equal(militaryAccessStatus(state, 'mauretania', 'numidia').allowed, false);
  const unit = state.armies.find(army => army.owner === 'numidia');
  assert.equal(previewMarch(state, unit.id, 'mauretania').ok, true);
  const restored = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.agreements.find(item => item.id === agreement.agreement.id).terms.access.permittedTerritories, ['mauretania']);
  assert.equal(militaryAccessStatus(restored, 'mauretania', 'numidia').allowed, false);
  terminateAgreement(restored, agreement.agreement.id, 'numidia');
  assert.equal(militaryAccessStatus(restored, 'numidia', 'mauretania').allowed, false);
});

test('invalid theater scope is rejected without spending treasury', () => {
  const state = newGame('numidia');
  friendly(state, 'numidia', 'mauretania');
  const before = state.factions.numidia.treasury;
  assert.equal(proposeAgreement(state, 'numidia', 'mauretania', 'military_access', {
    access: {permittedTerritories: ['missing']}
  }).reason, 'invalid');
  assert.equal(state.factions.numidia.treasury, before);
});
