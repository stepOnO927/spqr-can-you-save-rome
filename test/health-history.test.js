import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=diplomatic-chronicle-1';
import {battlefieldWound,advanceCharacters,illnessRisk} from '../character-system.js?v=portraits-hundred-days-1';
import {previewPersonTravel} from '../personal-diplomacy.js?v=portraits-hundred-days-1';
import {syncChronicleDispatches,filterChronicle} from '../chronicle.js?v=succession-ui-recovery-1';

test('battle wounds are persisted, affect risk, and notify only the owner',()=>{
 let s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii'),before=illnessRisk(s,'caesar');s.world.intelSeed=1972;battlefieldWound(s,unit);assert.equal(s.world.characters.caesar.health,'wounded');assert.equal(s.world.characters.caesar.wounds,1);assert.ok(illnessRisk(s,'caesar')>before);assert.ok(s.log.some(e=>e.zh.includes('游戏战斗中受伤')));syncChronicleDispatches(s);assert.ok(filterChronicle(s.chronicle.entries,{kind:'character',character:'caesar'}).some(e=>e.zh.includes('游戏战斗中受伤')));s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters.caesar.wounds,1);
 const other=newGame('caesar'),enemy=other.armies.find(a=>a.id==='pompey');other.world.intelSeed=1972;battlefieldWound(other,enemy);assert.equal(other.world.characters.pompey.wounds,1);assert.equal(other.log.length,0);
});
test('shortages and prior wounds can change simulated disease outcomes',()=>{
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>.0025&&q<.004}),healthy=newGame(),shortage=newGame();healthy.month=1;shortage.month=1;healthy.world.intelSeed=seed;shortage.world.intelSeed=seed;shortage.factions.caesar.food=-1;shortage.world.characters.caesar.wounds=1;advanceCharacters(healthy);advanceCharacters(shortage);assert.equal(healthy.world.characters.caesar.health,'healthy');assert.equal(shortage.world.characters.caesar.health,'ill');assert.equal(shortage.world.characters.caesar.illnessEpisodes,1);
});
test('wounded travelers move more slowly and older saves retain their wounded state',()=>{
 let s=newGame('senate');const normal=previewPersonTravel(s,'cicero','epirus');s.world.characters.cicero.health='wounded';delete s.world.characters.cicero.wounds;delete s.world.characters.cicero.illnessEpisodes;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters.cicero.wounds,1);assert.equal(s.world.characters.cicero.illnessEpisodes,0);assert.ok(previewPersonTravel(s,'cicero','epirus').months>normal.months);
});

test('wounds and serious illness can recover in a non-January month without revealing foreign health',()=>{
 const s=newGame('caesar');s.month=7;s.world.characters.caesar.health='wounded';s.world.intelSeed=1972;advanceCharacters(s);assert.equal(s.world.characters.caesar.health,'recovering');const message=s.log.find(x=>x.characterId==='caesar'&&x.zh.includes('健康状态发生变化'));assert.match(message.zh,/受伤 → 康复中/);assert.match(message.en,/wounded to recovering/);syncChronicleDispatches(s);assert.ok(filterChronicle(s.chronicle.entries,{kind:'character',character:'caesar'}).some(x=>x.zh.includes('受伤 → 康复中')));
 const foreign=newGame('caesar');foreign.month=7;for(const c of Object.values(foreign.world.characters))if(c.id!=='orodes')c.missing={};foreign.world.characters.orodes.health='seriously_ill';const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>.04&&q<.05});foreign.world.intelSeed=seed;advanceCharacters(foreign);assert.equal(foreign.world.characters.orodes.health,'recovering');assert.equal(foreign.knowledge.caesar.parthia.reports.length,0);assert.equal(foreign.log.length,0);
});
