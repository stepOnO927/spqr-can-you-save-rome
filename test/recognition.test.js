import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=regional-mail-merge-1';
import {addReport,contestLeadership,recognizeClaimant,supportClaimant,advanceOperations} from '../character-system.js?v=regional-mail-merge-1';
const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
const report=(s,target,id)=>addReport(s,'senate',target,{kind:'claimants',leaders:[id],source:'spy',confidence:'rumor'});
test('recognition follows reported claimants, not secret court truth, and persists until withdrawn',()=>{
 for(const [target,id] of [['egypt','cleopatra'],['parthia','pacorus']]){let s=newGame('senate');assert.equal(recognizeClaimant(s,target,id).reason,'unavailable');report(s,target,id);const before=s.factions.senate.treasury,knowledge=structuredClone(s.knowledge.senate[target]);assert.equal(recognizeClaimant(s,target,id).ok,true);assert.equal(s.factions.senate.treasury,before-5);assert.equal(s.relations[['senate',target].sort().join(':')],-5);assert.deepEqual(s.knowledge.senate[target],knowledge);assert.equal(s.world.recognitions.senate[target].claimant,id);assert.equal(recognizeClaimant(s,target,id).reason,'already');s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.recognitions.senate[target].claimant,id);assert.equal(recognizeClaimant(s,target,null).ok,true);assert.equal(s.world.recognitions.senate[target],undefined);assert.equal(s.factions.senate.treasury,before-5)}
});
test('recognition can help a delayed support offer but cannot make a nonexistent claimant reply',()=>{
 function trial(recognized,valid){const s=newGame('senate');if(valid)contestLeadership(s,'egypt','cleopatra');report(s,'egypt','cleopatra');if(recognized)recognizeClaimant(s,'egypt','cleopatra');assert.equal(supportClaimant(s,'senate','egypt','cleopatra').ok,true);s.world.intelSeed=seedFor(.41,.43);for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');advanceOperations(s);return s}
 assert.equal(trial(false,true).operations[0].status,'declined');const backed=trial(true,true);assert.equal(backed.operations[0].status,'complete');assert.equal(backed.world.disputes.egypt.support.cleopatra,15);assert.equal(trial(true,false).operations[0].status,'no_reply');
});
test('recognition cannot be created without funds and old saves migrate without changing their world',()=>{
 let s=newGame('senate');delete s.world.recognitions;report(s,'egypt','cleopatra');s.factions.senate.treasury=4;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(recognizeClaimant(s,'egypt','cleopatra').reason,'treasury');assert.deepEqual(s.world.recognitions,{});assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
