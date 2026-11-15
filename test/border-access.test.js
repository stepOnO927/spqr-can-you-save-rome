import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave, previewMarch, issueMilitaryOrder, tick} from '../engine.js';
import {proposeAgreement, terminateAgreement} from '../agreements.js';
import {militaryAccessStatus, recordUnauthorizedCrossing} from '../border-access.js';

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

test('explicit unauthorized order creates an unopposed incident without declaring war or annexing land', () => {
  const state = newGame('numidia');
  friendly(state, 'numidia', 'mauretania');
  state.armies = state.armies.filter(unit => unit.owner !== 'mauretania');
  state.factions.mauretania.manpower = 0;
  state.factions.mauretania.treasury = 0;
  const unit = state.armies.find(army => army.owner === 'numidia');
  assert.equal(previewMarch(state, unit.id, 'mauretania').reason, 'peace');
  assert.equal(previewMarch(state, unit.id, 'mauretania', {unauthorized: true}).unauthorized, true);
  assert.equal(issueMilitaryOrder(state, unit.id, 'unauthorized_entry', 'mauretania').ok, true);
  assert.equal(unit.move.intent, 'unauthorized_entry');
  for (let month = 0; month < 4 && unit.move; month++) tick(state);
  const incident = state.borderIncidents.at(-1);
  assert.equal(incident.outcome, 'crossed');
  assert.equal(incident.defenderArmyId, null);
  assert.equal(unit.region, 'mauretania');
  assert.equal(state.regions.find(region => region.id === 'mauretania').owner, 'mauretania');
  assert.equal(state.wars.some(pair => pair.includes('numidia') && pair.includes('mauretania')), false);
  assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).borderIncidents.at(-1).id, incident.id);
});

test('a real defending army can repel an unauthorized crossing with limited losses', () => {
  const state = newGame('numidia');
  const unit = state.armies.find(army => army.owner === 'numidia');
  const defender = state.armies.find(army => army.owner === 'mauretania');
  defender.region = 'mauretania'; defender.move = null; defender.men = unit.men * 3;
  const before = {attacker: unit.men, defender: defender.men};
  const incident = recordUnauthorizedCrossing(state, unit, state.regions.find(region => region.id === 'mauretania'));
  assert.equal(incident.outcome, 'repelled');
  assert.equal(incident.escalation, 'skirmish');
  assert.equal(unit.region, 'numidia');
  assert.ok(unit.men < before.attacker && defender.men < before.defender);
  assert.ok(incident.attackerLoss < before.attacker / 4);
  assert.ok(incident.defenderLoss < before.defender / 4);
  assert.equal(state.wars.some(pair => pair.includes('numidia') && pair.includes('mauretania')), false);
});
