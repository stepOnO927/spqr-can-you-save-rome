import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORICAL_DEATHS} from '../historical-reference.js';
import {newGame} from '../engine.js';
import {advanceCharacters} from '../character-system.js';

test('sourced historical death years preserve disputed and unknown entries',()=>{
 assert.deepEqual(HISTORICAL_DEATHS.caesar.years,[44]);assert.deepEqual(HISTORICAL_DEATHS.cleopatra.years,[30]);assert.deepEqual(HISTORICAL_DEATHS.orodes.years,[38,37]);assert.equal(HISTORICAL_DEATHS.orodes.disputed,true);assert.deepEqual(HISTORICAL_DEATHS.labienus.years,[45]);assert.equal(HISTORICAL_DEATHS.lepidus,undefined);
 for(const entry of Object.values(HISTORICAL_DEATHS)){assert.ok(entry.sources.length);for(const source of entry.sources){assert.match(source.url,/^https:\/\//);assert.equal(source.label.length,2)}}
});
test('a historical death year does not determine a simulated character’s lifespan',()=>{
 const s=newGame('caesar');s.year=-40;s.month=1;s.world.characters.caesar.health='healthy';advanceCharacters(s);assert.equal(s.world.characters.caesar.alive,true);assert.equal(s.world.leadership.caesar.includes('caesar'),true);
});
