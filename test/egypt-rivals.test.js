import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,region,isWar} from '../engine.js';
import {egyptianClaimantCandidate,advanceCharacters,contestLeadership,advanceDisputes,addReport,supportClaimant,advanceOperations} from '../character-system.js';
const seedFor=(min,max)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=min&&q<max});

test('either Egyptian co-ruler can be selected, with discontent influencing but not deciding the choice',()=>{
 const s=newGame('caesar');assert.equal(egyptianClaimantCandidate(s,.1),'cleopatra');assert.equal(egyptianClaimantCandidate(s,.9),'ptolemy');s.world.characters.ptolemy.loyalty=5;assert.equal(egyptianClaimantCandidate(s,.4),'ptolemy');assert.equal(egyptianClaimantCandidate(s,.01),'cleopatra');s.world.characters.ptolemy.health='dying';assert.equal(egyptianClaimantCandidate(s,.9),'cleopatra');s.world.characters.cleopatra.missing={origin:'egypt',remaining:3};assert.equal(egyptianClaimantCandidate(s,.1),null);
});
test('a minor claimant has court supporters and an unnamed field commander, without informing foreign factions',()=>{
 let s=newGame('caesar');assert.equal(contestLeadership(s,'egypt','ptolemy'),true);s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.disputes.egypt.duration=11;s.world.intelSeed=seedFor(.7,.8);advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.equal(region(s,'egyptUpper').owner,'egypt_claimant');assert.equal(isWar(s,'egypt','egypt_claimant'),true);const army=s.armies.find(a=>a.owner==='egypt_claimant');assert.equal(army.characterId,null);assert.deepEqual(army.commander,['Unnamed officer','未具名军官']);assert.equal(s.world.leadership.egypt_claimant[0],'ptolemy');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const unit=s.armies.find(a=>a.owner==='egypt_claimant'),before=unit.men;addReport(s,'caesar','egypt',{kind:'claimants',leaders:['ptolemy'],source:'spy'});assert.equal(supportClaimant(s,'caesar','egypt','ptolemy',null,'military').ok,true);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(unit.men,before+1000);assert.equal(unit.characterId,null);
});

test('a discontented co-ruler can become a claimant through ordinary annual simulation',()=>{const s=newGame('caesar');s.month=1;s.world.characters.cleopatra.loyalty=90;s.world.characters.ptolemy.loyalty=5;s.world.intelSeed=5;advanceCharacters(s);assert.deepEqual(s.world.claimants.egypt,['ptolemy']);assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.equal(s.knowledge.caesar.egypt.reports.length,0)});
