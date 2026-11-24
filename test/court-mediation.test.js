import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,upgradeSave,tick} from '../engine.js';
import {contestLeadership,courtMediationPlan,mediateCourtDispute,advanceDisputes} from '../character-system.js';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});

test('domestic mediation pays once, survives a save, and changes a real low-stability review without certainty',()=>{
 const opening=newGame('egypt');
 assert.equal(contestLeadership(opening,'egypt','cleopatra'),true);
 opening.factions.egypt.stability=30;
 opening.world.disputes.egypt.months=5;
 const unmediated=structuredClone(opening);
 const treasury=opening.factions.egypt.treasury;
 assert.equal(courtMediationPlan(opening,'egypt').ok,true);
 assert.equal(mediateCourtDispute(opening,'egypt').ok,true);
 assert.equal(opening.factions.egypt.treasury,treasury-15);
 assert.equal(mediateCourtDispute(opening,'egypt').reason,'pending');
 const saved=upgradeSave(JSON.parse(JSON.stringify(opening)));
 assert.equal(saved.world.disputes.egypt.mediationPending,true);
 assert.equal(saved.factions.egypt.treasury,treasury-15);
 const seed=seedFor(.15,.2);
 unmediated.world.intelSeed=seed;saved.world.intelSeed=seed;
 advanceDisputes(unmediated);advanceDisputes(saved);
 assert.deepEqual(unmediated.world.leadership.egypt,['cleopatra']);
 assert.deepEqual(saved.world.leadership.egypt,['ptolemy','cleopatra']);
 assert.equal(saved.world.disputeHistory[0].mediated,true);
 assert.equal(unmediated.world.disputeHistory[0].mediated,false);
 assert.equal(saved.factions.egypt.treasury,treasury-15);
 assert.equal(saved.knowledge.caesar.egypt.reports.length,0);
 assert.equal(courtMediationPlan(saved,'egypt').reason,'dispute');
});

test('mediation can fail and cannot be repeated or funded by a foreign command',()=>{
 const s=newGame('egypt');contestLeadership(s,'egypt','cleopatra');
 s.world.disputes.egypt.months=5;
 assert.equal(courtMediationPlan(s,'caesar').reason,'command');
 assert.equal(mediateCourtDispute(s,'egypt').ok,true);
 s.world.intelSeed=seedFor(.9,.95);advanceDisputes(s);
 assert.deepEqual(s.world.claimants.egypt,['cleopatra']);
 assert.equal(s.world.disputes.egypt.mediationPending,false);
 assert.equal(courtMediationPlan(s,'egypt').reason,'cooldown');
 for(let i=0;i<6;i++)s.month++;
 s.factions.egypt.treasury=14;
 assert.equal(courtMediationPlan(s,'egypt').reason,'treasury');
});

test('funded mediation improves a ten-year Egyptian succession route against an untreated dispute',()=>{
 const s=newGrandGame('egypt');let attempts=0;
 assert.equal(contestLeadership(s,'egypt','cleopatra'),true,'the player starts a genuine royal dispute');
 const untreated=structuredClone(s);
 for(let month=0;month<120;month++){
  if(courtMediationPlan(s,'egypt').ok){assert.equal(mediateCourtDispute(s,'egypt').ok,true);attempts++}
  tick(s);
  tick(untreated);
 }
 assert.ok(attempts>0);
 assert.ok(s.factions.egypt.stability>untreated.factions.egypt.stability);
 assert.ok(s.factions.egypt.food>=0);
 assert.ok(s.world.disputeHistory.some(x=>x.faction==='egypt'&&x.mediated));
});
