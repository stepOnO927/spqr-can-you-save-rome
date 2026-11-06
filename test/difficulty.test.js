import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';

test('hard and expert change monthly resources without revealing hidden enemy state',()=>{
 const states=['standard','hard','expert'].map(difficulty=>{const s=newGame('caesar');s.difficulty=difficulty;tick(s);return s});
 const funds=states.map(s=>s.factions.caesar.treasury);
 const food=states.map(s=>s.factions.caesar.food);
 assert.ok(funds[0]>=funds[1]&&funds[1]>=funds[2]);
 assert.ok(food[0]>=food[1]&&food[1]>=food[2]);
 assert.ok(funds[0]>funds[2]||food[0]>food[2]);
 const restored=upgradeSave(JSON.parse(JSON.stringify(states[2])));
 assert.equal(restored.difficulty,'expert');
});
