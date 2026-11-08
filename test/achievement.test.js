import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,tick,upgradeSave} from '../engine.js';
import {ACHIEVEMENTS,evaluateAchievements,endCampaign,revealedAchievements} from '../achievement-system.js';
import {normalizeProfile,recordCampaign} from '../legacy/legacy-core.js';
import {campaignEndingHtml} from '../achievement-ui.js';
import {objectiveDefinitions} from '../campaign-reports.js';

const profile=()=>normalizeProfile(null);
test('unfinished campaigns keep all achievement details and Laurel Coins private',()=>{
 const s=newGrandGame('senate'),p=profile();s.year=-48;s.month=1;evaluateAchievements(s);
 assert.ok(s.achievementState.completed['survive:12']);assert.deepEqual(revealedAchievements(s),[]);assert.equal(campaignEndingHtml(s,'en'),'');assert.equal(campaignEndingHtml(s,'zh'),'');assert.deepEqual(recordCampaign(p,s),[]);assert.equal(p.coins,150);assert.deepEqual(p.achievements,[]);
});
test('independent kingdoms earn delayed milestones and keep their own archive identity',()=>{
 const s=newGrandGame('egypt'),p=profile();
 assert.deepEqual(objectiveDefinitions(s).map(g=>g.id),['home','field']);
 assert.equal(objectiveDefinitions(s)[0].regionId,'egypt');
 assert.doesNotMatch(objectiveDefinitions(s).map(g=>g.en).join(' '),/northern Italy|Latium/i);
 s.year=-48;s.month=1;evaluateAchievements(s);
 assert.ok(s.achievementState.completed['survive:12']);
 assert.deepEqual(revealedAchievements(s),[]);
 assert.equal(recordCampaign(p,s).length,0);
 assert.equal(p.coins,150);
 assert.equal(endCampaign(s,'retired').ok,true);
 assert.deepEqual(recordCampaign(p,s),['survive:12']);
 assert.equal(p.coins,210);
 assert.equal(p.archive[0].faction,'egypt');
 assert.match(campaignEndingHtml(s,'en'),/Independent campaign concluded/);
 assert.match(campaignEndingHtml(s,'zh'),/独立势力战役结束/);
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(recordCampaign(p,restored),[]);
 assert.equal(p.coins,210);
 assert.equal(p.archive.length,1);
 assert.equal(p.achievements.some(a=>a.id==='victory'),false);
});
test('a military victory remains silent while play continues, then reveals once on ending',()=>{
 const s=newGrandGame('caesar'),p=profile();s.victory=true;evaluateAchievements(s);assert.deepEqual(recordCampaign(p,s),[]);const month=s.month;tick(s);assert.notEqual(s.month,month);assert.equal(s.achievementState.finalized,false);assert.deepEqual(revealedAchievements(s),[]);
 assert.equal(endCampaign(s,'retired').ok,true);assert.equal(s.achievementState.result,'victory');const done=recordCampaign(p,s);assert.ok(done.includes('victory'));assert.equal(recordCampaign(p,s).length,0);assert.equal(endCampaign(s,'retired').ok,false);assert.match(campaignEndingHtml(s,'zh'),/执掌历史/);assert.match(campaignEndingHtml(s,'en'),/History in Your Hands/);
});
test('a terminal defeat finalizes without a victory award',()=>{
 const s=newGrandGame('senate'),p=profile();s.terminalResult='defeat';tick(s);assert.equal(s.achievementState.finalized,true);assert.equal(s.achievementState.result,'defeat');assert.equal(s.achievementState.completed.victory,undefined);recordCampaign(p,s);assert.equal(p.achievements.some(a=>a.id==='victory'),false);
});
test('formally ending a wiped-out command records defeat',()=>{
 const s=newGrandGame('senate');for(const r of s.regions)if(r.owner==='senate')r.owner='caesar';s.armies=s.armies.filter(a=>a.owner!=='senate');const done=endCampaign(s,'retired');assert.equal(done.ok,true);assert.equal(done.state.result,'defeat');assert.equal(revealedAchievements(s).some(a=>a.id==='victory'),false)
});
test('a command without territory or troops ends in defeat on the next turn',()=>{
 const s=newGrandGame('senate');for(const r of s.regions)if(r.owner==='senate')r.owner='caesar';s.armies=s.armies.filter(a=>a.owner!=='senate');tick(s);assert.equal(s.terminalResult,'defeat');assert.equal(s.achievementState.finalized,true);assert.equal(s.achievementState.result,'defeat');
});
test('legacy imports gain a stable campaign key while new campaigns remain distinct',()=>{
 const first=newGrandGame('senate'),second=newGrandGame('senate');assert.notEqual(first.legacyRunId,second.legacyRunId);
 const older=structuredClone(first);delete older.legacyRunId;const a=upgradeSave(structuredClone(older)),b=upgradeSave(structuredClone(older));assert.equal(a.legacyRunId,b.legacyRunId);assert.equal(upgradeSave(structuredClone(a)).legacyRunId,a.legacyRunId);
});
test('voluntary endings preserve dated evidence through saves without duplicate claims',()=>{
 const s=newGrandGame('senate'),p=profile();s.year=-48;s.month=1;evaluateAchievements(s);const evidence=structuredClone(s.achievementState.completed['survive:12']);endCampaign(s,'retired');recordCampaign(p,s);const coins=p.coins;const restored=upgradeSave(structuredClone(s));assert.deepEqual(restored.achievementState.completed['survive:12'],evidence);assert.equal(restored.achievementState.result,'retired');assert.equal(recordCampaign(p,restored).length,0);assert.equal(p.coins,coins);assert.equal(tick(restored).month,1);
});
test('hidden and legendary entries have no active campaign representation',()=>{
 assert.deepEqual(new Set(ACHIEVEMENTS.map(a=>a.category)),new Set(['ordinary','hidden','legendary']));const s=newGrandGame('senate');s.victory=true;evaluateAchievements(s);assert.equal(campaignEndingHtml(s,'en'),'');assert.equal(revealedAchievements(s).length,0)
});
