import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=born-portraits-1';
import {considerDefection,advanceCharacters} from '../character-system.js?v=born-portraits-1';
import {assignSuccession,knownLeaders} from '../characters.js?v=newborn-age-1';

test('a disloyal unattached officer may defect and is no longer an eligible successor',()=>{
 let s=newGame('caesar');s.world.characters.antony.loyalty=10;s.world.characters.antony.travel={destination:'gaul',remaining:1,legs:[]};s.world.successionPlans.caesar='antony';const old=s.factions.caesar.stability;s.world.intelSeed=1972;
 assert.equal(considerDefection(s,'antony'),true);assert.equal(s.world.characters.antony.faction,'senate');assert.equal(s.world.characters.antony.travel,undefined);assert.equal(s.factions.caesar.stability,old-2);assert.ok(s.log.some(e=>e.zh.includes('改变了政治立场')));assert.deepEqual(knownLeaders(s,'egypt','caesar'),['caesar']);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.defections[0].id,'antony');s.world.characters.caesar.alive=false;assignSuccession(s,'caesar');assert.deepEqual(s.world.leadership.caesar,['lepidus']);
});
test('leaders, army commanders, foreign monarchs and officers at peace cannot defect through this rule',()=>{
 const s=newGame();for(const id of ['caesar','pompey','cleopatra']){s.world.characters[id].loyalty=0;s.world.intelSeed=1972;assert.equal(considerDefection(s,id),false)}s.world.characters.antony.loyalty=0;s.wars=[];s.world.intelSeed=1972;assert.equal(considerDefection(s,'antony'),false);
});
test('annual character simulation can produce a defection without fabricating a person',()=>{
 let outcome;for(let seed=0;seed<1000&&!outcome;seed++){const s=newGame();s.month=1;s.world.characters.antony.loyalty=5;s.world.intelSeed=seed*100000;advanceCharacters(s);if(s.world.characters.antony.faction==='senate')outcome=s}assert.ok(outcome);assert.equal(outcome.world.defections[0].id,'antony');assert.equal(outcome.world.characters.antony.loyalty,45);
});
