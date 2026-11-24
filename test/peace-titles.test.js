import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, tick, sendInquiry, answerPeaceOffer, diplomacy} from '../engine.js';
import {transferTerritory} from '../territory.js';
import {localEntity} from '../local-polities.js';
import {eligibleTitleAssets, titleAssetQuote} from '../peace-titles.js';
import {syncPeaceLetters,receivedMail} from '../epistulae.js';

test('a peace letter can request only title to a place already controlled by its sender', () => {
  const state = newGame('caesar');
  const asset = {kind: 'theater', id: 'italiaN'};
  assert.equal(titleAssetQuote(state, 'caesar', 'senate', asset).ok, false);
  transferTerritory(state, 'italiaN', 'caesar');
  assert.equal(titleAssetQuote(state, 'caesar', 'senate', asset).ok, true);
  assert.ok(eligibleTitleAssets(state, 'caesar', 'senate').some(place => place.id === asset.id));
  assert.equal(sendInquiry(state, 'caesar', 'senate', 'peace', {titleAsset: asset}).ok, true);
  const letter = state.inquiries[0];
  assert.deepEqual(letter.titleAsset, asset);
  assert.equal(state.regions.find(place => place.id === asset.id).legalSovereign, 'senate');
  assert.equal(diplomacy(state, 'caesar', 'senate', 'peace', {acceptedByPlayer: true, titleAsset: letter.titleAsset}), true);
  const place = state.regions.find(region => region.id === asset.id);
  assert.equal(place.legalSovereign, 'caesar');
  assert.equal(place.owner, 'caesar');
  assert.equal(place.titleTreaty.from, 'senate');
  assert.equal(state.world.territorialSettlements.length, 1);
  assert.equal(state.wars.some(pair => pair.includes('caesar') && pair.includes('senate')), false);
});

test('a treaty can recognize a town separately from its host theater', () => {
  const state = newGame('caesar'), town = localEntity(state, 'ariminum');
  town.controller = 'caesar'; town.militaryOccupier = 'caesar'; town.administrativeStatus = 'occupied';
  assert.equal(diplomacy(state, 'caesar', 'senate', 'peace', {acceptedByPlayer: true, titleAsset: {kind: 'local', id: town.id}}), true);
  assert.equal(town.legalSovereign, 'caesar');
  assert.equal(state.regions.find(region => region.id === 'italiaN').legalSovereign, 'senate');
  assert.equal(state.regions.find(region => region.id === 'italiaN').owner, 'senate');
});

test('a stale territorial term cannot settle a war or grant title', () => {
  const state = newGame('caesar'), asset = {kind: 'theater', id: 'italiaN'};
  transferTerritory(state, asset.id, 'caesar');
  assert.equal(sendInquiry(state, 'caesar', 'senate', 'peace', {titleAsset: asset}).ok, true);
  transferTerritory(state, asset.id, 'senate', 'restoration');
  assert.equal(diplomacy(state, 'caesar', 'senate', 'peace', {acceptedByPlayer: true, titleAsset: asset}), false);
  assert.equal(state.regions.find(region => region.id === asset.id).legalSovereign, 'senate');
  assert.equal(state.wars.some(pair => pair.includes('caesar') && pair.includes('senate')), true);
});

test('a player-accepted title term takes effect only after the courier returns', () => {
  const state = newGame('senate'), asset = {kind: 'theater', id: 'italiaN'};
  transferTerritory(state, asset.id, 'caesar');
  state.seed = 1;
  assert.equal(sendInquiry(state, 'caesar', 'senate', 'peace', {titleAsset: asset}).ok, true);
  tick(state);
  const letter = state.inquiries.find(item => item.actor === 'caesar' && item.subject === 'peace');
  assert.equal(letter.status, 'awaiting_decision');
  syncPeaceLetters(state);
  assert.match(receivedMail(state).find(mail=>mail.id===letter.mailId).body[1],/意大利北部.*法理归属.*回信送达前/);
  assert.equal(state.regions.find(place => place.id === asset.id).legalSovereign, 'senate');
  assert.equal(answerPeaceOffer(state, 'caesar', 'accept').ok, true);
  assert.equal(state.regions.find(place => place.id === asset.id).legalSovereign, 'senate');
  tick(state);
  assert.equal(letter.status, 'answered');
  assert.equal(state.regions.find(place => place.id === asset.id).legalSovereign, 'caesar');
});
