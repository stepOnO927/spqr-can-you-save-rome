import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=missing-health-1';
import {advanceCharacters,advanceMissingCommanders} from '../character-system.js?v=missing-health-1';
import {deriveGovernment} from '../governance.js?v=missing-health-1';
import {renderGenealogyDossier} from '../genealogy-ui.js?v=missing-health-1';

const sample=i=>((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;const seedWhere=fn=>Array.from({length:10000},(_,i)=>i).find(i=>fn(sample(i)));
function month(s){if(++s.month>12){s.month=1;s.year++}}

test('a missing leader can die privately, with succession and stability deferred until confirmed',()=>{
 let s=newGame('senate'),c=s.world.characters.pompey,unit=s.armies.find(x=>x.characterId==='pompey');unit.characterId=null;unit.commander=['Unnamed officer','未具名军官'];c.location=null;c.health='dying';c.missing={origin:'roma',remaining:2,year:s.year-1,month:12,healthSeed:seedWhere(q=>q<1-Math.pow(1-.45,1/12))};const before=s.factions.senate.stability,visible=renderGenealogyDossier(s,'pompey',true);
 advanceCharacters(s);assert.equal(c.alive,false);assert.ok(c.missing);assert.equal(c.inheritanceSettled,undefined);assert.equal(s.factions.senate.stability,before);assert.deepEqual(s.world.leadership.senate,['pompey']);assert.equal(deriveGovernment(s,'senate').kind,'acting_command');assert.equal(renderGenealogyDossier(s,'pompey',true),visible);assert.ok(!s.log.some(e=>e.zh.includes('庞培')&&e.zh.includes('去世')));
 s=upgradeSave(structuredClone(s));s.world.characters.pompey.missing.remaining=1;month(s);s.world.intelSeed=0;advanceMissingCommanders(s);assert.equal(s.world.characters.pompey.missing,undefined);assert.equal(s.world.characters.pompey.inheritanceSettled,true);assert.equal(s.factions.senate.stability,before-3);assert.ok(!s.world.leadership.senate.includes('pompey'));assert.ok(s.log.some(e=>e.zh.includes('确认在游戏中去世')));
});

test('illness can improve during missing time and is shown only when contact resumes',()=>{
 const s=newGame('caesar'),c=s.world.characters.antony,total=1-Math.pow(1-.77,1/12),seed=seedWhere(q=>q>=total*.22/.77&&q<total);c.health='ill';c.location=null;c.missing={origin:'cisalpine',remaining:1,year:s.year-1,month:12,healthSeed:seed};advanceCharacters(s);assert.equal(c.health,'recovering');assert.match(renderGenealogyDossier(s,'antony',true),/游戏健康: 未知/);month(s);advanceMissingCommanders(s);assert.equal(c.missing,undefined);assert.match(renderGenealogyDossier(s,'antony',true),/游戏健康: 康复中/);
});
