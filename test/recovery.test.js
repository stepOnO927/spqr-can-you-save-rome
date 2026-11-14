import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,advanceRomanDefeat,previewMarch,moveArmy,projectTaxPath,forecastEconomy,upgradeSave,adjacent} from '../engine.js?v=diplomatic-chronicle-1';
import {marchReason} from '../movement-help.js';
import {canFinalizeCampaign,finalizeCampaign} from '../legacy.js?v=portraits-hundred-days-1';

test('last field army loss gives a recovery window, then a final archivable defeat',()=>{
 const s=newGame('caesar');s.armies=s.armies.filter(a=>a.owner!=='caesar');
 advanceRomanDefeat(s);assert.equal(s.world.romanDefeatNotice.remaining,3);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.world.romanDefeatNotice.remaining,3);
 advanceRomanDefeat(s);advanceRomanDefeat(s);assert.equal(s.defeat,undefined);
 advanceRomanDefeat(s);assert.equal(s.defeat,true);assert.equal(s.victor,'senate');
 const date=[s.year,s.month];tick(s);assert.deepEqual([s.year,s.month],date);
 assert.equal(canFinalizeCampaign(s),true);
 const result=finalizeCampaign(s);assert.equal(result.ok,true);assert.equal(result.archive.defeat,true);
});
test('rebuilding during the warning cancels defeat',()=>{
 const s=newGame('caesar');const reserve=s.armies.find(a=>a.owner==='caesar');s.armies=s.armies.filter(a=>a.owner!=='caesar');advanceRomanDefeat(s);
 s.armies.push(reserve);advanceRomanDefeat(s);assert.equal(s.world.romanDefeatNotice,undefined);assert.equal(s.defeat,undefined);
});
test('main and terrain movement help identify the true sea transport cost',()=>{
 const s=newGame('caesar');const a=s.armies.find(a=>a.owner==='caesar');a.region='italiaS';s.factions.caesar.treasury=0;
 assert.ok(adjacent('italiaS').some(x=>x.to==='sicilia'&&x.sea));
 const p=previewMarch(s,a.id,'sicilia');assert.equal(p.reason,'transport');assert.equal(moveArmy(s,a.id,'sicilia').reason,'transport');
 assert.match(marchReason(p.reason,'zh'),/8国库/);assert.match(marchReason(p.reason,'en'),/8 treasury/);
});
test('famine drains manpower, deep debt slows replenishment, and tax preview shows loyalty cost',()=>{
 const s=newGame('senate');s.wars=[];s.factions.senate.food=-100;s.factions.senate.treasury=-100;
 const p=forecastEconomy(s,'senate');assert.ok(p.manpower<=0);
 const before=s.factions.senate.manpower;tick(s);assert.ok(s.factions.senate.manpower<before);
 const low=projectTaxPath(s,'senate','low',3),high=projectTaxPath(s,'senate','high',3);
 assert.equal(low.length,3);assert.ok(low.at(-1).loyalty>high.at(-1).loyalty);
});
test('AI recruitment remains tied to its territory and resources over seven years',()=>{
 const s=newGame('caesar');s.wars=[];for(let i=0;i<84;i++)tick(s);
 const senate=s.armies.filter(a=>a.owner==='senate'&&a.men>0).length;
 const land=s.regions.filter(r=>r.owner==='senate').length;
 assert.ok(senate<=Math.max(2,Math.ceil(land*.75)),`senate armies ${senate} for ${land} theaters`);
});
