import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfile,saveProfile,exportProfile,importProfile,purchase,recordCampaign,createScenario} from './legacy-core.js';
import {archivePanelHtml} from './archive-ui.js';
import {decidePetition,availablePetitions} from './civic.js';
import {settleRace} from './race.js';
import {ACTIVITIES,availableActivities,resolveActivity} from './activities.js';
import {ARTIFACTS} from './museum.js';
import {harborDossier,beginHarborDossier,corroborateHarborDossier,closeHarborDossier} from './intelligence-case.js';
import {newGrandGame} from '../engine.js';
import {evaluateAchievements,endCampaign} from '../achievement-system.js';

const memory=()=>{let value=null;return {getItem:()=>value,setItem:(key,v)=>{value=v}}};
test('Intelligence Office harbor case preserves uncertain evidence, branches and one-time rewards',()=>{
 const old=loadProfile(memory());assert.deepEqual(old.intelligenceDossiers,[]);
 assert.equal(beginHarborDossier(old,'registry').ok,false);
 old.coins=1000;assert.equal(purchase(old,'intelligence').ok,true);
 const initial=old.coins,politics={...old.politics};
 assert.equal(beginHarborDossier(old,'registry').cost,20);
 assert.deepEqual(harborDossier(old).evidence,['registry-copy']);
 assert.equal(beginHarborDossier(old,'informant').ok,false);
 assert.equal(corroborateHarborDossier(old).cost,15);
 assert.deepEqual(harborDossier(old).evidence,['registry-copy','dockhand-claim']);
 assert.equal(corroborateHarborDossier(old).ok,false);
 const settled=closeHarborDossier(old,'audit');assert.equal(settled.coins,50);
 assert.equal(old.coins,initial-20-15+50);
 assert.equal(old.politics.corruption,politics.corruption-3);
 assert.ok(old.collectibles.includes('harbor-seal-dossier'));
 assert.ok(ARTIFACTS.some(item=>item.id==='harbor-seal-dossier'&&item.name.every(Boolean)));
 assert.ok(harborDossier(old).startedAt&&harborDossier(old).corroboratedAt&&harborDossier(old).closedAt);
 const restored=importProfile(exportProfile(old));
 assert.deepEqual(restored.intelligenceDossiers,old.intelligenceDossiers);
 assert.equal(closeHarborDossier(restored,'accuse').ok,false);
 assert.equal(corroborateHarborDossier(restored).ok,false);
 assert.equal(restored.coins,old.coins);
 const unverified=loadProfile(memory());unverified.coins=1000;purchase(unverified,'intelligence');beginHarborDossier(unverified,'informant');
 const reputation=unverified.politics.reputation;
 assert.equal(closeHarborDossier(unverified,'accuse').ok,true);
 assert.equal(unverified.politics.reputation,reputation-5,'a public allegation from one source carries a real cost');
 assert.equal(harborDossier(unverified).corroborated,false);
});
test('Laurel rewards are distinct from campaign treasury and cannot be claimed twice through save reload',()=>{
 const storage=memory(),p=loadProfile(storage),s=newGrandGame('caesar');const initialTreasury=s.factions.caesar.treasury;s.month=1;s.year=-48;evaluateAchievements(s);assert.deepEqual(recordCampaign(p,s),[]);assert.equal(p.coins,150);endCampaign(s,'retired');assert.deepEqual(recordCampaign(p,s),['survive:12']);assert.equal(p.coins,210);assert.deepEqual(recordCampaign(p,s),[]);saveProfile(p,storage);const reloaded=loadProfile(storage);assert.deepEqual(recordCampaign(reloaded,structuredClone(s)),[]);assert.equal(reloaded.coins,210);assert.equal(s.factions.caesar.treasury,initialTreasury);
});
test('foreign campaign archive counts only battles fought by its own command',()=>{
 const profile=loadProfile(memory()),campaign=newGrandGame('egypt');
 campaign.battles=[{region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:true},{region:'t116',attacker:{owner:'egypt'},defender:{owner:'senate'},attackerWins:false}];
 endCampaign(campaign,'retired');recordCampaign(profile,campaign);
 assert.equal(profile.archive[0].battles,1);assert.equal(profile.archive[0].summary.battles,1);
 assert.deepEqual(profile.archive[0].notable,[{region:'t116',winner:'senate'}]);
});
test('reimport repairs an old foreign archive without awarding Laurel Coins twice',()=>{
 const storage=memory(),profile=loadProfile(storage),campaign=newGrandGame('egypt');
 campaign.battles=[{region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:true},{region:'t116',attacker:{owner:'egypt'},defender:{owner:'senate'},attackerWins:false}];
 campaign.civilWarOutcome={kind:'military',winner:'senate',loser:'caesar',year:-48,month:2};
 endCampaign(campaign,'retired');recordCampaign(profile,campaign);
 const archive=profile.archive[0];
 archive.summary={...archive.summary,winner:'senate',method:'military'};
 delete archive.summary.civilWarOutcome;
 archive.battles=2;archive.notable=[{region:'roma',winner:'caesar'},{region:'t116',winner:'senate'}];
 const coins=profile.coins,rewards=profile.rewards.length;
 assert.deepEqual(recordCampaign(profile,campaign),[]);
 assert.equal(profile.coins,coins);assert.equal(profile.rewards.length,rewards);assert.equal(profile.archive.length,1);
 assert.equal(archive.summary.winner,null);assert.equal(archive.summary.civilWarOutcome.winner,'senate');
 assert.equal(archive.battles,1);assert.deepEqual(archive.notable,[{region:'t116',winner:'senate'}]);
 saveProfile(profile,storage);assert.deepEqual(loadProfile(storage).archive[0],archive);
});
test('reimport also corrects an older foreign battle total before Roman civil-war settlement',()=>{
 const profile=loadProfile(memory()),campaign=newGrandGame('armenia');
 campaign.battles=[{region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:true}];
 endCampaign(campaign,'retired');recordCampaign(profile,campaign);
 const archived=profile.archive[0],coins=profile.coins;
 archived.battles=1;archived.summary.battles=1;archived.notable=[{region:'roma',winner:'caesar'}];
 assert.deepEqual(recordCampaign(profile,campaign),[]);
 assert.equal(profile.coins,coins);assert.equal(archived.battles,0);assert.equal(archived.summary.battles,0);
 assert.deepEqual(archived.notable,[]);
});
test('archive tells a foreign campaign story without exposing raw territory IDs',()=>{
 const profile=loadProfile(memory()),campaign=newGrandGame('egypt');
 campaign.civilWarOutcome={kind:'military',winner:'senate',loser:'caesar',year:-48,month:2};
 campaign.battles=[{region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:true,lossA:90,lossD:60},{region:'t116',attacker:{owner:'egypt',commander:['Egyptian commander','埃及将领']},defender:{owner:'senate'},attackerWins:false,lossA:45,lossD:20}];
 campaign.campaignEvents.push({type:'control',newOwner:'egypt',previousOwner:'senate',regionId:'t116'},{type:'control',newOwner:'egypt',previousOwner:'senate',regionId:'t116'},{type:'control',newOwner:'caesar',previousOwner:'senate',regionId:'roma'});
 campaign.achievementState.completed['first-recon']={year:-49,month:1,turn:0,evidence:{source:'scouts'}};
 endCampaign(campaign,'retired');recordCampaign(profile,campaign);
 const en=archivePanelHtml(profile,'en'),zh=archivePanelHtml(profile,'zh');
 for(const html of [en,zh])assert.doesNotMatch(html,/t116|undefined|NaN/);
 assert.match(en,/Voluntary ending/);assert.match(en,/Roman civil war: .*Senate/);assert.match(en,/Damascus/);
 assert.match(en,/Egyptian commander/);assert.match(en,/Your casualties: 45/);assert.match(en,/Eyes Across the Frontier/);
 assert.match(en,/Distinct captures 1/);assert.match(en,/Heaviest friendly losses: Damascus · 45 · lost/);
 assert.match(zh,/自愿结束/);assert.match(zh,/罗马内战/);assert.match(zh,/大马士革/);assert.match(zh,/埃及将领/);
 assert.match(zh,/不同领土的夺取 1/);assert.match(zh,/己方伤亡最重一战: 大马士革 · 45 · 败/);
 const old={archive:[{id:'old',faction:'egypt',year:-49,result:'retired',territories:2,battles:0,summary:{},notable:[{region:'<script>',winner:'senate'}]}],achievements:[]};
 assert.doesNotMatch(archivePanelHtml(old,'en'),/<script>/);
 old.archive[0].year=1;assert.match(archivePanelHtml(old,'en'),/1 CE/);
});
test('reimport fills capture and heaviest-loss records from an older finalized save',()=>{
 const profile=loadProfile(memory()),campaign=newGrandGame('caesar');
 campaign.campaignEvents.push({type:'control',newOwner:'caesar',previousOwner:'senate',regionId:'roma'});
 campaign.battles=[{region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:false,lossA:180,lossD:75}];
 endCampaign(campaign,'retired');
 delete campaign.achievementState.summary.conquests;delete campaign.achievementState.summary.worstBattle;
 recordCampaign(profile,campaign);
 assert.equal(profile.archive[0].summary.conquests,1);
 assert.deepEqual(profile.archive[0].summary.worstBattle,{region:'roma',casualties:180,won:false});
 const coins=profile.coins;
 assert.deepEqual(recordCampaign(profile,campaign),[]);assert.equal(profile.coins,coins);
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
test('the villa case branches into delayed reprisal or relief with durable consequences',()=>{
 const reckless=loadProfile(memory());
 assert.equal(decidePetition(reckless,'villa-reprisal',0).ok,false);
 assert.equal(decidePetition(reckless,'villa',1).ok,true);
 assert.equal(availablePetitions(reckless).some(p=>p.id==='villa-reprisal'),false);
 for(const id of ['doorway','grain'])assert.equal(decidePetition(reckless,id,0).ok,true);
 assert.equal(availablePetitions(reckless).some(p=>p.id==='villa-reprisal'),false);
 assert.equal(decidePetition(reckless,'inheritance',0).ok,true);
 const restored=importProfile(exportProfile(reckless)),before=restored.politics.aristocrats,coins=restored.coins;
 assert.equal(availablePetitions(restored).some(p=>p.id==='villa-reprisal'),true);
 assert.equal(availablePetitions(restored).some(p=>p.id==='villa-relief'),false);
 assert.equal(decidePetition(restored,'villa-reprisal',0).ok,true);
 assert.equal(restored.politics.aristocrats,before+6);
 assert.equal(restored.coins,coins+70);
 assert.ok(restored.collectibles.includes('villa-seal'));
 assert.ok(restored.collectibles.includes('villa-reprisal-letter'));
 assert.equal(decidePetition(restored,'villa-reprisal',0).ok,false);
 assert.equal(importProfile(exportProfile(restored)).coins,coins+70);
 const fair=loadProfile(memory());assert.equal(decidePetition(fair,'villa',0).ok,true);
 for(const id of ['doorway','grain','inheritance'])assert.equal(decidePetition(fair,id,0).ok,true);
 assert.equal(availablePetitions(fair).some(p=>p.id==='villa-relief'),true);
 assert.equal(availablePetitions(fair).some(p=>p.id==='villa-reprisal'),false);
 const people=fair.politics.people;
 assert.equal(decidePetition(fair,'villa-relief',0).ok,true);
 assert.equal(fair.politics.people,people+7);
 assert.ok(fair.collectibles.includes('villa-relief-ledger'));
});
test('race places, trophy, last place punishment and reward guard persist',()=>{
 const p=loadProfile(memory());const race={id:'race-test',driver:'Aurelia',place:1,lastDriver:'Lucius'};assert.equal(settleRace(p,race).payout,100);assert.ok(p.collectibles.includes('race-cup'));assert.ok(p.race.eliminated.includes('Lucius'));assert.equal(settleRace(p,race).ok,false);const last=settleRace(p,{id:'race-last',driver:'Aurelia',place:5,lastDriver:'Aurelia'});assert.equal(last.payout,0);assert.ok(p.race.eliminated.includes('Aurelia'));
});
test('unlocked scenario creates a distinct playable alternate history state',()=>{
 const s=createScenario('scenario-rubicon',newGrandGame);assert.equal(s.grandMap,true);assert.equal(s.regions.length,120);assert.equal(s.player,'senate');assert.ok(s.legacyScenario);assert.equal(s.difficulty,'standard');
});
test('six hub districts contain permanent choices with one-time rewards and civic consequences',()=>{
 const storage=memory(),p=loadProfile(storage);p.coins=5000;for(const building of ['camp','temple','library','harbor','court','intelligence'])assert.equal(purchase(p,building).ok,true);assert.equal(ACTIVITIES.length,13);const before=p.politics.corruption,coins=p.coins;assert.equal(resolveActivity(p,'court-bribe',0).ok,true);assert.equal(p.politics.corruption,before-3);assert.equal(p.coins,coins+40);assert.equal(resolveActivity(p,'court-bribe',0).ok,false);assert.equal(resolveActivity(p,'intelligence-sources',1).correct,false);saveProfile(p,storage);assert.equal(loadProfile(storage).activities.length,2)
});
test('a twice dismissed Curia petitioner can obtain a distinct durable court judgment',()=>{
 const p=loadProfile(memory());p.buildings.push('court');
 assert.equal(availableActivities(p,'court').some(x=>x.id==='court-catinius'),false);
 assert.equal(resolveActivity(p,'court-catinius',0).ok,false);
 assert.equal(decidePetition(p,'doorway',1).ok,true);
 assert.equal(availableActivities(p,'court').some(x=>x.id==='court-catinius'),false);
 assert.equal(decidePetition(p,'doorway-appeal',1).ok,true);
 assert.equal(availableActivities(p,'court')[0].id,'court-catinius');
 const restored=importProfile(exportProfile(p)),coins=restored.coins,people=restored.politics.people;
 const verdict=resolveActivity(restored,'court-catinius',0);
 assert.equal(verdict.correct,null);
 assert.equal(verdict.coins,45);
 assert.equal(restored.coins,coins+45);
 assert.equal(restored.politics.people,people+5);
 assert.ok(restored.collectibles.includes('catinius-court-record'));
 assert.ok(restored.activities.find(x=>x.id==='court-catinius').at);
 const after=importProfile(exportProfile(restored));
 assert.equal(resolveActivity(after,'court-catinius',1).ok,false);
 assert.equal(after.coins,coins+45);
 const settlement=loadProfile(memory());settlement.buildings.push('court');decidePetition(settlement,'doorway',1);decidePetition(settlement,'doorway-appeal',1);
 assert.equal(resolveActivity(settlement,'court-catinius',1).ok,true);
 assert.equal(settlement.politics.corruption,23);
});
test('tight track championship and Thessaly scenario persist as distinct content',()=>{
 const p=loadProfile(memory());assert.equal(settleRace(p,{id:'tight-win',driver:'Aurelia',place:1,lastDriver:'Lucius',track:'tight'}).ok,true);assert.ok(p.collectibles.includes('tight-cup'));assert.ok(p.race.champions.includes('tight'));const s=createScenario('scenario-pharsalus',newGrandGame);assert.equal(s.year,-48);assert.equal(s.month,6);assert.equal(s.player,'caesar');assert.equal(s.armies.find(a=>a.id==='xiii').region,s.regions.find(r=>r.site?.[0]==='Apollonia').id);assert.equal(s.armies.find(a=>a.id==='pompey').region,s.regions.find(r=>r.site?.[0]==='Larissa').id)
});
test('city profile export and import preserve one-time rewards across devices',()=>{
 const p=loadProfile(memory());p.buildings.push('court');assert.equal(resolveActivity(p,'court-bribe',0).ok,true);const restored=importProfile(exportProfile(p));assert.deepEqual(restored.activities,p.activities);assert.deepEqual(restored.rewards,p.rewards);assert.equal(resolveActivity(restored,'court-bribe',0).ok,false);assert.throws(()=>importProfile('{"player":"caesar"}'));assert.throws(()=>importProfile('x'.repeat(2_000_001)));
});
