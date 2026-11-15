import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick} from '../engine.js';
import {localEntity} from '../local-polities.js';
import {chooseAiFoothold,footholdQuote} from '../foothold.js';

test('expert AI funds a legal depot where its strained field army needs it', () => {
  const state = newGame('senate');
  state.difficulty = 'expert';
  const date = state.year * 12 + state.month;
  for (const id of ['massilia', 'bibracte']) localEntity(state, id).access.caesar = date + 24;
  const gaul = state.armies.find(army => army.id === 'xiii');
  const narbo = state.armies.find(army => army.id === 'viii');
  gaul.region = 'gaul';
  gaul.morale = 30;
  assert.equal(footholdQuote(state, 'bibracte', 'caesar').ok, true);
  assert.equal(chooseAiFoothold(state, 'caesar')?.id, 'bibracte');

  gaul.morale = 90;
  narbo.morale = 20;
  assert.equal(chooseAiFoothold(state, 'caesar')?.id, 'massilia');

  delete localEntity(state, 'massilia').access.caesar;
  assert.equal(footholdQuote(state, 'massilia', 'caesar').ok, false);
  assert.equal(chooseAiFoothold(state, 'caesar')?.id, 'bibracte');

  state.month = 3;
  state.factions.caesar.treasury = 100;
  tick(state);
  assert.equal(localEntity(state, 'bibracte').foothold?.project?.targetLevel, 1);
  assert.equal(localEntity(state, 'massilia').foothold, undefined);
});
