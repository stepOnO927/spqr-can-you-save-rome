import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=roman-vacancy-1';
import {localEntity} from '../local-polities.js';
import {advanceVillages,startVillageProject} from '../local-villages.js';
import {inspectState} from '../inspector-diagnostics.js';
import {receivedMail,replyToLetter} from '../epistulae.js?v=roman-vacancy-1';

test('a surplus supports one dated village gathering without repeated notifications', () => {
  const state = newGame('caesar'), site = localEntity(state, 'ravenna-farms'), village = site.village;
  village.road = 1;
  state.month = 6;
  const food = village.storedFood, satisfaction = village.satisfaction;
  advanceVillages(state);
  assert.deepEqual(village.lastEvent, {kind: 'harvest', year: -49, month: 6});
  assert.equal(village.storedFood, food + village.foodProduction - village.foodNeed - 1);
  assert.equal(village.satisfaction, satisfaction + 2);
  const digest=state.mail.messages.find(mail=>mail.context?.kind==='village_digest');
  assert.ok(digest);
  assert.ok(digest.body[0].includes(`${site.name[0]} — harvest gathering`));
  assert.ok(digest.arrival>state.year*12+state.month);
  advanceVillages(state);
  assert.equal(village.satisfaction, satisfaction + 2);
  assert.equal(state.mail.messages.filter(mail=>mail.context?.kind==='village_digest').length,1);
  assert.equal(inspectState(state).filter(item => item.code.startsWith('invalid-village-event')).length, 0);
  assert.deepEqual(upgradeSave(structuredClone(state)).regions.find(region => region.id === site.theater).localEntities.find(entity => entity.id === site.id).village.lastEvent, village.lastEvent);
  village.lastEvent.kind = 'impossible';
  assert.ok(inspectState(state).some(item => item.code === 'invalid-village-event'));
});

test('another court does not receive private village developments',()=>{
  const state=newGame('senate'),site=localEntity(state,'ravenna-farms');
  site.village.road=1;state.month=6;advanceVillages(state);
  assert.equal(state.mail.messages.some(mail=>mail.context?.kind==='village_digest'&&mail.recipient==='senate'),false);
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

test('a dated road petition funds construction only with control and real resources', () => {
  const state=newGame('caesar'),site=localEntity(state,'ravenna-farms');
  site.village.storedFood=0;state.month=6;advanceVillages(state);
  const letter=state.mail.messages.find(mail=>mail.context?.kind==='village_petition');
  assert.equal(letter.context.issue,'road_request');
  assert.deepEqual(letter.senderName,site.village.leader);
  assert.ok(letter.arrival>-49*12+6);
  letter.delivery='received';
  const cash=state.factions.caesar.treasury,food=state.factions.caesar.food;
  state.factions.caesar.treasury=0;
  assert.equal(replyToLetter(state,letter.id,'fund_village_road',{startVillageProject}).reason,'resources');
  assert.equal(letter.responses.length,0);
  state.factions.caesar.treasury=cash;
  assert.equal(replyToLetter(state,letter.id,'fund_village_road',{startVillageProject}).ok,true);
  assert.equal(state.factions.caesar.treasury,cash-14);
  assert.equal(state.factions.caesar.food,food-2);
  assert.equal(site.village.project.kind,'road');
  assert.deepEqual(upgradeSave(structuredClone(state)).mail.messages.find(mail=>mail.id===letter.id).responses,letter.responses);
  for(const month of [7,8,9]){state.month=month;advanceVillages(state)}
  assert.equal(site.village.road,1);
  assert.equal(site.village.localIssue,null);
  assert.equal(receivedMail(state).filter(mail=>mail.context?.kind==='village_petition').length,1);
});

test('tax relief is local, paid, and rejected after a village changes hands', () => {
  const state=newGame('caesar'),site=localEntity(state,'ravenna-farms');
  site.village.road=1;site.village.storedFood=0;site.village.satisfaction=60;
  state.factions.caesar.tax='high';state.month=6;advanceVillages(state);
  const letter=state.mail.messages.find(mail=>mail.context?.issue==='tax_complaint');
  assert.ok(letter);letter.delivery='received';
  const treasury=state.factions.caesar.treasury,satisfaction=site.village.satisfaction;
  assert.equal(replyToLetter(state,letter.id,'relieve_village_tax',{}).ok,true);
  assert.equal(state.factions.caesar.treasury,treasury-5);
  assert.equal(site.village.satisfaction,satisfaction+8);
  assert.equal(site.village.localIssue,null);
  assert.equal(state.factions.caesar.tax,'high');
  const second=newGame('caesar'),other=localEntity(second,'ravenna-farms');
  other.village.road=1;other.village.storedFood=0;other.village.satisfaction=60;
  second.factions.caesar.tax='high';second.month=6;advanceVillages(second);
  const stale=second.mail.messages.find(mail=>mail.context?.issue==='tax_complaint');stale.delivery='received';
  second.regions.find(r=>r.id===other.theater).owner='senate';
  assert.equal(replyToLetter(second,stale.id,'relieve_village_tax',{}).reason,'changed_state');
  assert.equal(stale.responses.length,0);
});
