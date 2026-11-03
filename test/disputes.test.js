import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js';
import {contestLeadership,advanceDisputes} from '../character-system.js';
import {knownLeaders} from '../characters.js';

test('a stable court can reconcile after time, while foreign knowledge remains unchanged',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');for(let i=0;i<5;i++)advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1972;advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['ptolemy','cleopatra']);assert.deepEqual(s.world.claimants.egypt,[]);assert.equal(s.world.disputeHistory[0].outcome,'reconciliation');assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('an unstable court may experience a takeover and an opposing claimant without fabricating people',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.intelSeed=1972;advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.deepEqual(s.world.claimants.egypt,['ptolemy']);assert.equal(s.factions.egypt.stability,26);assert.equal(s.world.disputeHistory[0].outcome,'takeover');assert.equal(s.world.disputes.egypt.months,0);assert.equal(s.knowledge.caesar.egypt.reports.length,0);assert.ok(!s.log.some(x=>x.en.includes('court struggle')));
});
test('claimants who die are removed, and separate Mauretanian kingdoms cannot be treated as co-rulers',()=>{
 const s=newGame();assert.equal(contestLeadership(s,'mauretania','bocchus'),false);contestLeadership(s,'egypt','cleopatra');s.world.characters.cleopatra.alive=false;advanceDisputes(s);assert.deepEqual(s.world.claimants.egypt,[]);assert.equal(s.world.disputes.egypt,undefined);
});
test('campaign turns progress a live dispute rather than leaving it frozen',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.disputes.egypt.months=3;tick(s);assert.equal(s.world.disputes.egypt.months,4);
});
