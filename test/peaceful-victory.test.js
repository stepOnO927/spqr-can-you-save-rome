import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,diplomacy,sendInquiry,isWar,advancePeacefulSettlement,upgradeSave} from '../engine.js?v=multipolar-autoplay-1';
import {canFinalizeCampaign,finalizeCampaign} from '../legacy.js?v=succession-ui-recovery-1';

test('a year of stable peace creates a real archival outcome without military conquest',()=>{
 let s=newGame('senate');s.seed=(Math.imul(7,2654435761)>>>0);for(let i=0;i<12;i++)tick(s);s.seed=1587;assert.ok(sendInquiry(s,'senate','caesar','peace').ok);
 for(let i=0;i<6&&isWar(s,'senate','caesar');i++)tick(s);assert.equal(isWar(s,'senate','caesar'),false);assert.ok(diplomacy(s,'senate','caesar','improve'));assert.ok(diplomacy(s,'senate','caesar','improve'));
 const remaining=12-(s.world.peacefulSettlementMonths||0);for(let i=1;i<remaining;i++)tick(s);assert.equal(canFinalizeCampaign(s),false);s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);
 assert.equal(s.peacefulVictory,true);assert.equal(s.victory,false);assert.equal(canFinalizeCampaign(s),true);assert.equal(finalizeCampaign(s).archive.peacefulVictory,true);
});
test('war or instability interrupts a pending peaceful settlement',()=>{
 const s=newGame('senate');s.wars=[];for(let i=0;i<11;i++){s.month++;if(s.month>12){s.month=1;s.year++}advancePeacefulSettlement(s)}assert.equal(s.world.peacefulSettlementMonths,11);
 s.factions.senate.stability=54;advancePeacefulSettlement(s);assert.equal(s.world.peacefulSettlementMonths,0);assert.equal(canFinalizeCampaign(s),false);
 s.factions.senate.stability=60;for(let i=0;i<12;i++){s.month++;if(s.month>12){s.month=1;s.year++}advancePeacefulSettlement(s)}assert.equal(s.peacefulVictory,true);s.wars.push(['caesar','senate']);advancePeacefulSettlement(s);assert.equal(s.peacefulVictory,undefined);
});
