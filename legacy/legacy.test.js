import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfile,saveProfile,exportProfile,importProfile,purchase,recordCampaign,createScenario} from './legacy-core.js';
import {decidePetition,availablePetitions} from './civic.js';
import {settleRace} from './race.js';
import {ACTIVITIES,resolveActivity} from './activities.js';
import {newGrandGame} from '../engine.js';
import {evaluateAchievements,endCampaign} from '../achievement-system.js';

const memory=()=>{let value=null;return {getItem:()=>value,setItem:(key,v)=>{value=v}}};
test('Laurel rewards are distinct from campaign treasury and cannot be claimed twice through save reload',()=>{
 const storage=memory(),p=loadProfile(storage),s=newGrandGame('caesar');const initialTreasury=s.factions.caesar.treasury;s.month=1;s.year=-48;evaluateAchievements(s);assert.deepEqual(recordCampaign(p,s),[]);assert.equal(p.coins,150);endCampaign(s,'retired');assert.deepEqual(recordCampaign(p,s),['survive:12']);assert.equal(p.coins,210);assert.deepEqual(recordCampaign(p,s),[]);saveProfile(p,storage);const reloaded=loadProfile(storage);assert.deepEqual(recordCampaign(reloaded,structuredClone(s)),[]);assert.equal(reloaded.coins,210);assert.equal(s.factions.caesar.treasury,initialTreasury);
});
test('buildings visually owned through durable purchases and unlock museum content',()=>{
 const storage=memory(),p=loadProfile(storage);p.coins=1200;assert.equal(purchase(p,'museum').ok,true);assert.ok(p.buildings.includes('museum'));assert.ok(p.collectibles.includes('senate-tablet'));assert.equal(purchase(p,'museum').ok,false);assert.equal(purchase(p,'temple').ok,true);assert.equal(purchase(p,'circus').ok,false);p.coins=600;assert.equal(purchase(p,'circus').ok,true);saveProfile(p,storage);assert.ok(loadProfile(storage).buildings.includes('circus'));
});
test('Curia decisions change politics, pay once and yield museum relics',()=>{
 const p=loadProfile(memory()),before=p.politics.people;const result=decidePetition(p,'doorway',0);assert.equal(result.ok,true);assert.equal(p.politics.people,before+6);assert.ok(p.collectibles.includes('catinius-scroll'));assert.equal(decidePetition(p,'doorway',0).ok,false);
});
test('a dismissed petitioner returns later, survives export and cannot pay twice',()=>{
 const p=loadProfile(memory());
 assert.equal(availablePetitions(p).some(x=>x.id==='doorway-appeal'),false);
 assert.equal(decidePetition(p,'doorway-appeal',0).ok,false);
 assert.equal(decidePetition(p,'doorway',Number.NaN).ok,false);
 assert.equal(decidePetition(p,'doorway',1).ok,true);
 assert.equal(availablePetitions(p).some(x=>x.id==='doorway-appeal'),true);
 const restored=importProfile(exportProfile(p)),coins=restored.coins,people=restored.politics.people;
 assert.equal(decidePetition(restored,'doorway-appeal',0).ok,true);
 assert.equal(restored.coins,coins+70);
 assert.equal(restored.politics.people,people+8);
 assert.ok(restored.collectibles.includes('catinius-appeal-tablet'));
 assert.equal(decidePetition(restored,'doorway-appeal',0).ok,false);
 assert.equal(importProfile(exportProfile(restored)).coins,coins+70);
 const heard=loadProfile(memory());assert.equal(decidePetition(heard,'doorway',0).ok,true);
 assert.equal(availablePetitions(heard).some(x=>x.id==='doorway-appeal'),false);
});
test('race places, trophy, last place punishment and reward guard persist',()=>{
 const p=loadProfile(memory());const race={id:'race-test',driver:'Aurelia',place:1,lastDriver:'Lucius'};assert.equal(settleRace(p,race).payout,100);assert.ok(p.collectibles.includes('race-cup'));assert.ok(p.race.eliminated.includes('Lucius'));assert.equal(settleRace(p,race).ok,false);const last=settleRace(p,{id:'race-last',driver:'Aurelia',place:5,lastDriver:'Aurelia'});assert.equal(last.payout,0);assert.ok(p.race.eliminated.includes('Aurelia'));
});
test('unlocked scenario creates a distinct playable alternate history state',()=>{
 const s=createScenario('scenario-rubicon',newGrandGame);assert.equal(s.grandMap,true);assert.equal(s.regions.length,120);assert.equal(s.player,'senate');assert.ok(s.legacyScenario);assert.equal(s.difficulty,'standard');
});
test('six hub districts contain permanent choices with one-time rewards and civic consequences',()=>{
 const storage=memory(),p=loadProfile(storage);p.coins=5000;for(const building of ['camp','temple','library','harbor','court','intelligence'])assert.equal(purchase(p,building).ok,true);assert.equal(ACTIVITIES.length,12);const before=p.politics.corruption,coins=p.coins;assert.equal(resolveActivity(p,'court-bribe',0).ok,true);assert.equal(p.politics.corruption,before-3);assert.equal(p.coins,coins+40);assert.equal(resolveActivity(p,'court-bribe',0).ok,false);assert.equal(resolveActivity(p,'intelligence-sources',1).correct,false);saveProfile(p,storage);assert.equal(loadProfile(storage).activities.length,2)
});
test('tight track championship and Thessaly scenario persist as distinct content',()=>{
 const p=loadProfile(memory());assert.equal(settleRace(p,{id:'tight-win',driver:'Aurelia',place:1,lastDriver:'Lucius',track:'tight'}).ok,true);assert.ok(p.collectibles.includes('tight-cup'));assert.ok(p.race.champions.includes('tight'));const s=createScenario('scenario-pharsalus',newGrandGame);assert.equal(s.year,-48);assert.equal(s.month,6);assert.equal(s.player,'caesar');assert.equal(s.armies.find(a=>a.id==='xiii').region,s.regions.find(r=>r.site?.[0]==='Apollonia').id);assert.equal(s.armies.find(a=>a.id==='pompey').region,s.regions.find(r=>r.site?.[0]==='Larissa').id)
});
test('city profile export and import preserve one-time rewards across devices',()=>{
 const p=loadProfile(memory());p.buildings.push('court');assert.equal(resolveActivity(p,'court-bribe',0).ok,true);const restored=importProfile(exportProfile(p));assert.deepEqual(restored.activities,p.activities);assert.deepEqual(restored.rewards,p.rewards);assert.equal(resolveActivity(restored,'court-bribe',0).ok,false);assert.throws(()=>importProfile('{"player":"caesar"}'));assert.throws(()=>importProfile('x'.repeat(2_000_001)));
});
