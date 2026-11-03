import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js';
import {addReport,reportedClaimants,supportClaimant,contestLeadership,advanceOperations,advanceDisputes} from '../character-system.js';

const report=s=>addReport(s,s.player,'egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});
test('offers require a reported claimant but do not expose whether that report is true',()=>{
 const s=newGame();assert.equal(supportClaimant(s,'caesar','egypt','cleopatra').reason,'unavailable');report(s);assert.deepEqual(reportedClaimants(s,'caesar','egypt'),['cleopatra']);assert.equal(supportClaimant(s,'caesar','egypt','cleopatra').ok,true);assert.equal(s.factions.caesar.treasury,80);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'no_reply');assert.equal(s.world.disputes.egypt,undefined);
});
test('accepted support changes the actual dispute after delay and survives a save',()=>{
 let s=newGame();contestLeadership(s,'egypt','cleopatra');report(s);const before=s.relations['caesar:egypt']||0;supportClaimant(s,'caesar','egypt','cleopatra');for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.world.disputes.egypt.support.cleopatra,15);assert.equal(s.relations['caesar:egypt'],before-10);
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>.13&&q<.2});s.world.disputes.egypt.months=5;s.world.intelSeed=seed;advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.deepEqual(s.world.claimants.egypt,['ptolemy']);assert.deepEqual(s.world.disputes.egypt.support,{});
});
test('offers can be refused or lost without changing support',()=>{
 for(const [seed,outcome] of [[0,'declined'],[1972,'no_reply']]){const s=newGame();contestLeadership(s,'egypt','cleopatra');report(s);supportClaimant(s,'caesar','egypt','cleopatra');s.world.intelSeed=seed;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,outcome);assert.equal(s.world.disputes.egypt.support,undefined)}
});
