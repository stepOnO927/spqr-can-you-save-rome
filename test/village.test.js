import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, upgradeSave} from '../engine.js?v=peace-sender-1';
import {localEntity, localEntityRevenue, villageDevelopment} from '../local-polities.js';
import {villageProjectQuote, startVillageProject, villageFoodQuote, takeVillageFood, advanceVillages} from '../local-villages.js';
import {armyExpeditionSupply, advanceExpeditionSupply} from '../expedition-supply.js';
import {inspectState} from '../inspector-diagnostics.js?v=peace-sender-1';
import {footholdQuote, footholdShipmentQuote, footholdStorageCapacity, startFoothold, stockFoothold, advanceFootholds, resupplyAtFoothold, abandonFoothold} from '../foothold.js';

test('a controlled village supports a paid, finite outpost that can be abandoned', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms');
  const army = state.armies.find(unit => unit.id === 'xiii');
  const before = {treasury: state.factions.caesar.treasury, food: state.factions.caesar.food, localFood: entity.village.storedFood};
  assert.equal(footholdQuote(state, entity.id, 'senate').reason, 'no_rights');
  assert.equal(footholdQuote(state, entity.id).ok, true);
  assert.equal(startFoothold(state, entity.id).ok, true);
  assert.equal(state.factions.caesar.treasury, before.treasury - 8);
  assert.equal(state.factions.caesar.food, before.food - 3);
  advanceFootholds(state);
  assert.equal(entity.foothold.level, 1);
  assert.equal(footholdStorageCapacity(entity), 8);
  assert.equal(stockFoothold(state, entity.id, 'caesar', 4).ok, true);
  assert.equal(stockFoothold(state, entity.id, 'caesar', 4).ok, true);
  assert.equal(footholdShipmentQuote(state, entity.id, 'caesar', 1).reason, 'capacity');
  assert.equal(entity.village.storedFood, before.localFood);
  advanceFootholds(state);
  assert.equal(entity.foothold.stockFood, 8);
  army.morale = 60;
  assert.equal(resupplyAtFoothold(state, entity.id, army.id).ok, true);
  assert.equal(entity.foothold.stockFood, 6);
  assert.equal(footholdShipmentQuote(state, entity.id, 'caesar', 2).ok, true);
  assert.equal(footholdShipmentQuote(state, entity.id, 'caesar', 4).reason, 'capacity');
  const loaded = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(localEntity(loaded, entity.id).foothold.stockFood, 6);
  assert.equal(inspectState(loaded).filter(item => item.code === 'invalid-foothold' || item.code === 'foothold-overcommitted').length, 0);
  entity.foothold.stockFood = 9;
  assert.ok(inspectState(state).some(item => item.code === 'invalid-foothold'));
  entity.foothold.stockFood = 6;
  assert.equal(abandonFoothold(state, entity.id).ok, true);
  assert.equal(entity.foothold, null);
  assert.deepEqual([entity.lastFootholdLoss.reason, entity.lastFootholdLoss.stockFood], ['abandoned', 6]);
  assert.equal(abandonFoothold(state, entity.id).ok, false);
  assert.equal(footholdQuote(state, entity.id).ok, true);
});

test('a village outpost is lost when a new theater controller takes the village', () => {
  const state = newGame('senate'), entity = localEntity(state, 'ravenna-farms');
  assert.equal(startFoothold(state, entity.id, 'caesar').ok, true);
  advanceFootholds(state);
  state.regions.find(region => region.id === entity.theater).owner = 'senate';
  advanceVillages(state);
  assert.equal(entity.controller, 'senate');
  advanceFootholds(state);
  assert.equal(entity.foothold, null);
  assert.equal(entity.lastFootholdLoss.owner, 'caesar');
});

test('a shrinking village cannot receive cargo beyond its local storage capacity', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms');
  assert.equal(startFoothold(state, entity.id).ok, true);
  advanceFootholds(state);
  assert.equal(stockFoothold(state, entity.id, 'caesar', 4).ok, true);
  assert.equal(stockFoothold(state, entity.id, 'caesar', 4).ok, true);
  entity.village.population = 350;
  assert.equal(footholdStorageCapacity(entity), 4);
  advanceFootholds(state);
  assert.equal(entity.foothold.stockFood, 4);
  assert.equal(entity.lastShipmentLoss.reason, 'capacity');
  assert.equal(entity.lastShipmentLoss.food, 4);
  assert.equal(inspectState(state).filter(item => item.code === 'invalid-foothold' || item.code === 'foothold-overcommitted').length, 0);
});

test('fictional village has civilian needs and save-compatible development', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms'), v = entity.village;
  assert.equal(entity.historical, false);
  assert.equal(entity.theater, 'cisalpine');
  assert.equal(v.storedFood, 7);
  assert.equal(inspectState(state).filter(item => item.code === 'invalid-village').length, 0);
  assert.equal(villageProjectQuote(state, entity.id, 'irrigation').ok, true);
  assert.equal(startVillageProject(state, entity.id, 'irrigation').ok, true);
  assert.equal(villageProjectQuote(state, entity.id, 'granary').reason, 'busy');
  for (let i = 0; i < 3; i++) advanceVillages(state);
  assert.equal(v.irrigation, 1);
  assert.equal(v.project, null);
  assert.equal(v.storedFood, 10);
  const restored = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(localEntity(restored, entity.id).village.irrigation, 1);
  const legacy = JSON.parse(JSON.stringify(state));
  legacy.regions.find(r => r.id === 'cisalpine').localEntities = [];
  assert.equal(localEntity(upgradeSave(legacy), entity.id), null);
});

test('normal village purchases preserve local food while requisition causes unrest', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms'), v = entity.village;
  assert.equal(takeVillageFood(state, entity.id).food, 2);
  assert.equal(v.storedFood, 5);
  assert.equal(takeVillageFood(state, entity.id).food, 1);
  assert.equal(v.storedFood, 4);
  assert.equal(villageFoodQuote(state, entity.id).reason, 'local_need');
  const before = v.satisfaction, loyalty = state.regions.find(r => r.id === entity.theater).loyalty;
  assert.equal(takeVillageFood(state, entity.id, 'caesar', {emergency: true}).food, 2);
  assert.equal(v.satisfaction, before - 18);
  assert.equal(state.regions.find(r => r.id === entity.theater).loyalty, loyalty - 3);
  assert.equal(villageFoodQuote(state, entity.id, 'senate').reason, 'control');
  assert.equal(inspectState(state).filter(item => item.code === 'invalid-village').length, 0);
});

test('overloaded army can buy finite village support then loses it when reserve is reached', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms'), region = state.regions.find(r => r.id === 'cisalpine');
  const army = state.armies.find(a => a.owner === 'caesar');
  army.region = 'cisalpine'; army.move = null; region.supply = 1;
  const beforeTreasury = state.factions.caesar.treasury;
  assert.equal(armyExpeditionSupply(state, army).status, 'village_support');
  advanceExpeditionSupply(state);
  assert.equal(army.expeditionSupply.status, 'village_support');
  assert.equal(entity.village.storedFood, 5);
  assert.equal(state.factions.caesar.treasury, beforeTreasury - 4);
  advanceExpeditionSupply(state);
  assert.equal(entity.village.storedFood, 4);
  assert.equal(armyExpeditionSupply(state, army).status, 'partial');
});

test('campaign month advances village construction and civilian inventory', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms');
  assert.equal(startVillageProject(state, entity.id, 'granary').ok, true);
  tick(state);
  assert.equal(entity.village.project.remaining, 1);
  tick(state);
  assert.equal(entity.village.granary, 1);
  assert.equal(entity.village.storedFood, 9);
});

test('nonplayer Caesar funds village construction through the player action rules', () => {
  const state = newGame('senate');
  tick(state);
  const village = localEntity(state, 'ravenna-farms').village;
  assert.deepEqual(village.project, {kind: 'granary', actor: 'caesar', remaining: 2});
});

test('village follows a conquered theater without silently changing legal title', () => {
  const state = newGame('senate'), region = state.regions.find(r => r.id === 'cisalpine');
  const entity = localEntity(state, 'ravenna-farms');
  assert.equal(startVillageProject(state, entity.id, 'granary', 'caesar').ok, true);
  region.owner = 'senate';
  advanceVillages(state);
  assert.equal(entity.controller, 'senate');
  assert.equal(entity.legalSovereign, 'caesar');
  assert.equal(entity.administrativeStatus, 'occupied');
  assert.equal(entity.village.localIssue, 'occupation');
  assert.equal(entity.village.project, null);
  assert.equal(villageFoodQuote(state, entity.id, 'senate').ok, true);
  assert.equal(villageFoodQuote(state, entity.id, 'caesar').reason, 'control');
  assert.equal(inspectState(state).filter(item => item.code.startsWith('invalid-local') || item.code === 'invalid-village').length, 0);
});

test('market construction increases paid purchases and real local revenue', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms');
  const before = localEntityRevenue(state, 'caesar');
  assert.equal(startVillageProject(state, entity.id, 'market').ok, true);
  for (let i = 0; i < 3; i++) advanceVillages(state);
  assert.equal(entity.village.market, 1);
  assert.equal(entity.village.marketAccess, 70);
  assert.equal(localEntityRevenue(state, 'caesar'), before + 1);
  assert.deepEqual(villageFoodQuote(state, entity.id), {ok: true, food: 3, treasury: 3, emergency: false});
  assert.equal(villageProjectQuote(state, entity.id, 'market').reason, 'maximum');
  entity.village.satisfaction = 39;
  assert.equal(localEntityRevenue(state, 'caesar'), before);
});

test('road, well and wall projects affect transport, growth conditions and civilian security', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms'), region = state.regions.find(r => r.id === entity.theater);
  const supply = region.supply, militia = entity.militia;
  const army = state.armies.find(unit => unit.owner === 'caesar' && unit.region === entity.theater);
  army.men = (supply + 1) * 1000;
  assert.equal(armyExpeditionSupply(state, army).status, 'village_support');
  assert.equal(startVillageProject(state, entity.id, 'road').ok, true);
  for (let i = 0; i < 3; i++) advanceVillages(state);
  assert.equal(region.supply, supply + 1);
  assert.equal(armyExpeditionSupply(state, army).status, 'full');
  assert.equal(entity.village.marketAccess, 65);
  advanceVillages(state);
  assert.equal(region.supply, supply + 1);
  assert.equal(startVillageProject(state, entity.id, 'well').ok, true);
  for (let i = 0; i < 2; i++) advanceVillages(state);
  assert.equal(entity.village.well, 1);
  assert.ok(entity.village.satisfaction >= 80);
  assert.equal(startVillageProject(state, entity.id, 'wall').ok, true);
  for (let i = 0; i < 4; i++) advanceVillages(state);
  assert.equal(entity.village.wall, 1);
  assert.equal(entity.militia, militia + 30);
  assert.equal(entity.village.security, 82);
  const saved = upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(localEntity(saved, entity.id).village.wall, 1);
  assert.equal(saved.regions.find(r => r.id === entity.theater).supply, supply + 1);
  assert.equal(inspectState(saved).filter(item => item.code === 'invalid-village').length, 0);
});

test('save upgrade fills new village project fields without resetting existing village data', () => {
  const state = newGame('caesar'), old = JSON.parse(JSON.stringify(state)), village = localEntity(old, 'ravenna-farms').village;
  village.storedFood = 5;
  for (const key of ['market', 'well', 'road', 'wall', 'shrine', 'agriculture', 'marketAccess']) delete village[key];
  const restored = upgradeSave(old), next = localEntity(restored, 'ravenna-farms').village;
  assert.equal(next.storedFood, 5);
  assert.deepEqual([next.market, next.well, next.road, next.wall, next.shrine, next.agriculture, next.marketAccess], [0, 0, 0, 0, 0, 0, 50]);
  assert.equal(inspectState(restored).filter(item => item.code === 'invalid-village').length, 0);
});

test('population growth raises civilian food need and pauses without a production surplus', () => {
  const state = newGame('caesar'), village = localEntity(state, 'ravenna-farms').village;
  village.population = 701;
  village.storedFood = 7;
  state.month = 3;
  assert.equal(villageFoodQuote(state, 'ravenna-farms').food, 1);
  advanceVillages(state);
  assert.equal(village.foodNeed, 3);
  assert.equal(village.population, 701);
  assert.equal(village.storedFood, 7);
  village.irrigation = 1;
  advanceVillages(state);
  assert.equal(village.population, 702);
});

test('fields, shrine and population-backed town development change the real economy', () => {
  const state = newGame('caesar'), entity = localEntity(state, 'ravenna-farms'), village = entity.village;
  state.factions.caesar.treasury = 100;
  state.factions.caesar.food = 100;
  assert.equal(startVillageProject(state, entity.id, 'agriculture').ok, true);
  for (let i = 0; i < 3; i++) advanceVillages(state);
  assert.equal(village.agriculture, 1);
  assert.equal(villageProjectQuote(state, entity.id, 'agriculture').ok, true);
  const previousSatisfaction = village.satisfaction;
  assert.equal(startVillageProject(state, entity.id, 'shrine').ok, true);
  for (let i = 0; i < 2; i++) advanceVillages(state);
  assert.equal(village.shrine, 1);
  assert.ok(village.satisfaction >= previousSatisfaction + 9);
  village.population = 700;
  village.granary = 1;
  village.market = 1;
  village.road = 1;
  village.marketAccess = 85;
  village.storedFood = 12;
  assert.equal(villageDevelopment(village).marketTown, true);
  assert.equal(villageFoodQuote(state, entity.id).food, 4);
  const townRevenue = localEntityRevenue(state, 'caesar');
  village.wall = 1;
  village.security = 70;
  assert.equal(villageDevelopment(village).fortified, true);
  village.population = 650;
  assert.deepEqual(villageDevelopment(village), {marketTown: false, fortified: false});
  assert.equal(localEntityRevenue(state, 'caesar'), townRevenue - 1);
  village.population = 700;
  const previousSecurity = village.security;
  state.regions.find(region => region.id === entity.theater).owner = 'senate';
  advanceVillages(state);
  assert.equal(village.security, previousSecurity - 4);
  assert.equal(entity.controller, 'senate');
  assert.equal(entity.legalSovereign, 'caesar');
  assert.equal(inspectState(state).filter(item => item.code === 'invalid-village').length, 0);
});
