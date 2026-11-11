import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORICAL_DEATHS} from '../historical-reference.js';
import {CHARACTER_CATALOG} from '../characters.js?v=dynasty-id-3';
import {newGame} from '../engine.js?v=strategic-offers-2';
import {advanceCharacters} from '../character-system.js?v=imperium-1';

test('sourced historical death years preserve disputed and unknown entries',()=>{
 assert.deepEqual(HISTORICAL_DEATHS.caesar.years,[44]);assert.deepEqual(HISTORICAL_DEATHS.cleopatra.years,[30]);assert.deepEqual(HISTORICAL_DEATHS.orodes.years,[38,37]);assert.equal(HISTORICAL_DEATHS.orodes.disputed,true);assert.deepEqual(HISTORICAL_DEATHS.labienus.years,[45]);assert.deepEqual(HISTORICAL_DEATHS.lepidus.years,[13,12]);assert.equal(HISTORICAL_DEATHS.lepidus.disputed,true);assert.deepEqual(HISTORICAL_DEATHS.deiotarus.years,[41,40]);assert.equal(HISTORICAL_DEATHS.deiotarus.disputed,true);assert.deepEqual(Object.keys(HISTORICAL_DEATHS).sort(),Object.keys(CHARACTER_CATALOG).sort());
 for(const entry of Object.values(HISTORICAL_DEATHS)){assert.ok(entry.sources.length);for(const source of entry.sources){assert.match(source.url,/^https:\/\//);assert.equal(source.label.length,2)}}
});
test('a historical death year does not determine a simulated character’s lifespan',()=>{
 const s=newGame('caesar');s.year=-40;s.month=1;s.world.characters.caesar.health='healthy';advanceCharacters(s);assert.equal(s.world.characters.caesar.alive,true);assert.equal(s.world.leadership.caesar.includes('caesar'),true);
});

test('approximate single-year birth references remain unbounded and do not create precise simulation ages',async()=>{
 const {HISTORICAL_BIRTH_ESTIMATES}=await import('../historical-reference.js');const {ageRange}=await import('../characters.js?v=dynasty-id-3');assert.equal(ageRange('labienus',-49),null);assert.equal(ageRange('lepidus',-49),null);assert.deepEqual(ageRange('ptolemy',-49),[11,13]);assert.match(HISTORICAL_BIRTH_ESTIMATES.labienus.text[1],/误差范围不明/);assert.ok(HISTORICAL_BIRTH_ESTIMATES.ptolemy.sources.length);
});
test('disputed Roman birth dates remain sourced and represented as inclusive age bounds',async()=>{
 const {HISTORICAL_BIRTH_ESTIMATES,HISTORICAL_NAME_FORMS}=await import('../historical-reference.js');const {ageRange}=await import('../characters.js?v=dynasty-id-3');
 assert.deepEqual(ageRange('caesar',-49),[50,53]);assert.deepEqual(ageRange('antony',-49),[32,37]);
 assert.match(HISTORICAL_BIRTH_ESTIMATES.caesar.text[1],/较常用/);assert.match(HISTORICAL_BIRTH_ESTIMATES.antony.text[1],/可能性较低/);
 assert.ok(HISTORICAL_BIRTH_ESTIMATES.caesar.sources.some(x=>x.url.includes('cambridge.org')));assert.ok(HISTORICAL_BIRTH_ESTIMATES.antony.sources.some(x=>x.url.includes('jstor.org')));
 assert.equal(HISTORICAL_NAME_FORMS.cleopatra.form,'ΚΛΕΟΠΑΤΡΑ');assert.match(HISTORICAL_NAME_FORMS.cleopatra.note[1],/后期/);assert.equal(HISTORICAL_NAME_FORMS.antony.form,'ΑΝΤΩΝΙΟΣ');
});
