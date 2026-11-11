import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,tick,aiTurn,diplomacy,isWar,nationalBudget,endCampaign,trainArmy,previewMarch,upgradeSave} from './engine.js';
import {militaryResult} from './campaign-outcome.js';
import {campaignEndingHtml,campaignVictoryHtml} from './achievement-ui.js';
import {normalizeProfile,recordCampaign} from './legacy/legacy-core.js';

const other=id=>id==='caesar'?'senate':'caesar';
function pressure(s,id){
 const enemy=other(id),key=id==='caesar'?'roma':'cisalpine';
 for(const r of s.regions.filter(r=>r.id===key||r.macro===key))r.owner=id;
 for(const r of s.regions.filter(r=>r.owner===enemy).slice(0,id==='caesar'?48:20))r.owner=id;
 for(const a of s.armies.filter(a=>a.owner===enemy))a.men=150;
 s.battles=[{attackerWins:true,attacker:{owner:id,commander:'Test commander'},defender:{owner:enemy},lossA:30,lossD:200}];
}

test('objectives alone do not end either Roman campaign; decisive conditions are symmetric',()=>{
 for(const id of ['caesar','senate']){
  const s=newGrandGame(id);assert.equal(militaryResult(s,id),null);
  s.objectiveProgress.frontier={status:'completed',changedTurn:1};assert.equal(militaryResult(s,id),null);
  pressure(s,id);assert.equal(militaryResult(s,id)?.winner,id);
  tick(s);assert.equal(s.victory,true);assert.equal(s.campaignOutcome.kind,'military');
  assert.equal(s.achievementState.finalized,false);
  assert.equal(campaignVictoryHtml(s,'en').includes('CONTINUE PLAYING'),true);
  assert.equal(campaignVictoryHtml(s,'zh').includes('继续执政'),true);
  assert.equal(campaignEndingHtml(s,'en'),'');
 }
});

test('civil settlement changes territory, peace and legitimacy without revealing achievements',()=>{
 const s=newGrandGame('caesar');pressure(s,'caesar');s.battles=[];
 const before=s.factions.caesar.legitimacy,treasury=s.factions.caesar.treasury,territories=s.regions.filter(r=>r.owner==='caesar').length;
 assert.equal(diplomacy(s,'caesar','senate','settlement'),true);
 assert.equal(s.campaignOutcome.kind,'settlement');assert.equal(s.victory,true);
 assert.equal(s.wars.some(w=>w.includes('caesar')&&w.includes('senate')),false);
 assert.ok(s.factions.caesar.legitimacy>before);assert.ok(s.regions.filter(r=>r.owner==='caesar').length>=territories);
 assert.equal(s.factions.caesar.treasury,treasury-4);
 assert.equal(s.world.governments.caesar.civilWarRecognition,'recognized');
 assert.equal(s.world.governments.senate.civilWarRecognition,'conceded');
 tick(s);assert.equal(s.world.governments.caesar.civilWarRecognition,'recognized');
 assert.equal(s.achievementState.finalized,false);
});

test('ordinary peace cannot silently end the Roman civil war without an outcome',()=>{
 for(const create of [newGame,newGrandGame])for(const actor of ['caesar','senate']){
  const target=other(actor),s=create('egypt');s.factions[target].stability=10;
  assert.equal(diplomacy(s,actor,target,'peace'),false);
  assert.equal(isWar(s,'caesar','senate'),true);
  assert.equal(s.civilWarOutcome,undefined);
 }
 const spectator=newGrandGame('egypt');spectator.seed=1;
 for(let month=0;month<12;month++)tick(spectator);
 assert.ok(isWar(spectator,'caesar','senate')||spectator.civilWarOutcome?.winner,'AI may end the civil war only through a formal result');
});

test('a saved pre-fix Roman ordinary peace remains loadable and can be resumed',()=>{
 const old=newGrandGame('egypt');old.wars=[];
 const loaded=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.equal(isWar(loaded,'caesar','senate'),false);
 assert.equal(loaded.civilWarOutcome,undefined);
 assert.equal(diplomacy(loaded,'caesar','senate','war'),true);
 assert.equal(isWar(loaded,'caesar','senate'),true);
});

test('an AI Roman command can conclude a qualified civil settlement for a third-party observer',()=>{
 const s=newGrandGame('egypt');pressure(s,'senate');s.regions.find(r=>r.id==='narbo').owner='caesar';s.month=12;
 aiTurn(s,'senate');
 assert.equal(s.civilWarOutcome?.kind,'settlement');
 assert.equal(s.civilWarOutcome.winner,'senate');
 assert.equal(isWar(s,'caesar','senate'),false);
 assert.equal(s.campaignOutcome,undefined);
});

test('rejected settlement missions cost resources and cannot be spammed for hidden intelligence',()=>{
 const s=newGrandGame('senate'),before=s.factions.senate.treasury;
 assert.equal(diplomacy(s,'senate','caesar','settlement'),false);assert.equal(s.factions.senate.treasury,before-4);
 assert.equal(diplomacy(s,'senate','caesar','settlement'),false);assert.equal(s.factions.senate.treasury,before-4);
});

test('a Roman civil-war outcome does not terminate a third-party campaign',()=>{
 const s=newGrandGame('egypt');pressure(s,'caesar');tick(s);
 assert.equal(s.civilWarOutcome?.winner,'caesar');assert.equal(s.campaignOutcome,undefined);assert.equal(s.achievementState.finalized,false);
 assert.notEqual(s.terminalResult,'defeat');
 assert.equal(endCampaign(s,'retired').state.summary.winner,null);
 assert.equal(s.achievementState.summary.civilWarOutcome.winner,'caesar');
 assert.match(campaignEndingHtml(s,'en'),/Roman civil war: Caesar prevailed/);
 assert.match(campaignEndingHtml(s,'zh'),/罗马内战：凯撒获胜/);
 assert.doesNotMatch(campaignEndingHtml(s,'en'),/Winner: Caesar/);
});

test('older foreign saves move the Roman civil-war result out of their campaign outcome',()=>{
 const old=newGrandGame('egypt');old.campaignOutcome={kind:'military',winner:'senate',loser:'caesar',year:-48,month:2};
 const restored=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.equal(restored.campaignOutcome,undefined);assert.equal(restored.civilWarOutcome.winner,'senate');assert.equal(restored.victory,false);
 const finished=newGrandGame('egypt');finished.campaignOutcome={kind:'military',winner:'senate',loser:'caesar',year:-48,month:2};
 endCampaign(finished,'retired');finished.achievementState.summary.winner='senate';finished.achievementState.summary.method='military';
 const migrated=upgradeSave(JSON.parse(JSON.stringify(finished)));
 assert.equal(migrated.achievementState.summary.winner,null);assert.equal(migrated.achievementState.summary.civilWarOutcome.winner,'senate');
});

test('final results preserve a summary and reward each achievement only once',()=>{
 const s=newGrandGame('senate');pressure(s,'senate');tick(s);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.achievementState.finalized,false);
 const result=endCampaign(s,'victory');assert.equal(result.ok,true);assert.equal(s.achievementState.result,'victory');
 assert.equal(s.achievementState.summary.winner,'senate');assert.ok(s.achievementState.summary.battles>=1);
 assert.match(campaignEndingHtml(s,'en'),/CAMPAIGN SUMMARY/);assert.match(campaignEndingHtml(s,'zh'),/战役总览/);
 const p=normalizeProfile({});const coins=p.coins;recordCampaign(p,s);const awarded=p.coins-coins;
 assert.ok(awarded>0);recordCampaign(p,s);assert.equal(p.coins,coins+awarded);
 assert.equal(endCampaign(s,'victory').ok,false);assert.equal(p.archive.length,1);
});

test('the national budget matches one quiet monthly land settlement',()=>{
 const s=newGrandGame('senate');const b=nationalBudget(s,'senate'),before=s.factions.senate.treasury;
 // The land calculation is exact; later naval operations and AI spending can differ.
 assert.equal(Number.isFinite(b.landNet),true);assert.equal(Number.isFinite(b.projectedNet),true);
 assert.ok(b.navyUpkeep>=0);assert.ok(b.manpowerNet>0);
 tick(s);assert.ok(Number.isFinite(s.factions.senate.treasury));assert.ok(s.factions.senate.treasury<=before+b.landNet+20);
});

test('paid army training consumes resources and a month of marching readiness',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.owner==='senate'),treasury=s.factions.senate.treasury,food=s.factions.senate.food,experience=unit.experience;
 assert.equal(trainArmy(s,unit.id).ok,true);assert.equal(s.factions.senate.treasury,treasury-8);assert.equal(s.factions.senate.food,food-2);
 assert.equal(previewMarch(s,unit.id,s.regions.find(r=>r.owner==='senate'&&r.id!==unit.region).id).ok,false);
 tick(s);assert.equal(unit.trainingRemaining,0);assert.equal(unit.experience,experience+1);
});

test('36 months of defensive and low recruitment play remain serializable',()=>{
 for(const id of ['caesar','senate']){
  const s=newGrandGame(id);for(let i=0;i<36&&!s.achievementState.finalized;i++)tick(s);
  const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.regions.length,120);
  assert.ok(restored.factions[id].treasury>=-100);assert.ok(restored.factions[id].food>=-100);
  assert.ok(restored.achievementState.finalized||restored.year*12+restored.month>=-46*12+1);
 }
});
