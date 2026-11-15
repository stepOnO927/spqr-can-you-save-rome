import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js';
import {localEntity} from '../local-polities.js';
import {advanceVillages,startVillageProject} from '../local-villages.js';
import {inspectState} from '../inspector-diagnostics.js';

test('a surplus supports one dated village gathering without repeated notifications', () => {
  const state = newGame('caesar'), site = localEntity(state, 'ravenna-farms'), village = site.village;
  village.road = 1;
  state.month = 6;
  const food = village.storedFood, satisfaction = village.satisfaction;
  advanceVillages(state);
  assert.deepEqual(village.lastEvent, {kind: 'harvest', year: -49, month: 6});
  assert.equal(village.storedFood, food + village.foodProduction - village.foodNeed - 1);
  assert.equal(village.satisfaction, satisfaction + 2);
  advanceVillages(state);
  assert.equal(village.satisfaction, satisfaction + 2);
  assert.equal(inspectState(state).filter(item => item.code.startsWith('invalid-village-event')).length, 0);
  assert.deepEqual(upgradeSave(structuredClone(state)).regions.find(region => region.id === site.theater).localEntities.find(entity => entity.id === site.id).village.lastEvent, village.lastEvent);
  village.lastEvent.kind = 'impossible';
  assert.ok(inspectState(state).some(item => item.code === 'invalid-village-event'));
});

test('high tax complaints and road requests arise from actual village conditions', () => {
  const taxed = newGame('caesar'), farm = localEntity(taxed, 'ravenna-farms');
  farm.village.road = 1;
  farm.village.storedFood = 0;
  farm.village.satisfaction = 60;
  taxed.factions.caesar.tax = 'high';
  taxed.month = 6;
  advanceVillages(taxed);
  assert.equal(farm.village.lastEvent.kind, 'tax_complaint');
  assert.equal(farm.village.localIssue, 'tax_complaint');
  assert.equal(farm.village.satisfaction, 58);

  const roads = newGame('caesar'), hamlet = localEntity(roads, 'ravenna-farms');
  hamlet.village.storedFood = 0;
  roads.month = 6;
  advanceVillages(roads);
  assert.equal(hamlet.village.lastEvent.kind, 'road_request');
  assert.equal(hamlet.village.localIssue, 'road_request');
  assert.equal(startVillageProject(roads, hamlet.id, 'road').ok, true);
  for (const month of [7, 8, 9]) {roads.month = month; advanceVillages(roads);}
  assert.equal(hamlet.village.road, 1);
  assert.equal(hamlet.village.localIssue, null);
});
