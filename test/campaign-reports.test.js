import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,moveArmy,tick,upgradeSave,diplomacy,resolveBattle,region} from '../engine.js';
import {eventText,markRead,unreadCount,recordEvent,latestCritical} from '../campaign-reports.js';
import {chronicleHtml,notificationsHtml,battleReportHtml} from '../reports-ui.js';

test('five-month Caesarian campaign records conquest, recapture, objective loss, and siege completion',()=>{
 const s=newGame();assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
 tick(s);assert.equal(region(s,'italiaN').owner,'caesar');
 const conquest=s.campaignEvents.find(e=>e.type==='control'&&e.regionId==='italiaN');assert.equal(conquest.previousOwner,'senate');
 assert.equal(moveArmy(s,'xiii','roma').ok,true);
 tick(s);assert.equal(region(s,'italiaN').owner,'senate');
 const loss=s.campaignEvents.find(e=>e.type==='control'&&e.regionId==='italiaN'&&e.previousOwner==='caesar');
 assert.equal(loss.severity,'critical');assert.equal(s.objectiveProgress.frontier.status,'lost');
 const objective=s.campaignEvents.find(e=>e.type==='objective'&&e.objectiveStatus==='lost'&&e.regionId==='italiaN');
 assert.equal(objective.causeEventId,loss.id);assert.match(eventText(s,objective,'en').description,/Northern Italy/);
 assert.match(eventText(s,loss,'zh').title,/意大利北部/);
 tick(s);assert.equal(s.objectiveProgress.frontier.status,'lost');
 tick(s);assert.equal(region(s,'roma').owner,'caesar');assert.ok(s.campaignEvents.some(e=>e.type==='siege'&&e.phase==='completed'&&e.regionId==='roma'));
 assert.ok(s.campaignEvents.findIndex(e=>e.id===loss.id)<s.campaignEvents.findIndex(e=>e.id===conquest.id));
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.campaignEvents.find(e=>e.id===loss.id).regionId,'italiaN');assert.equal(restored.objectiveProgress.frontier.status,'lost');
});

test('simultaneous battles and territory changes retain distinct stable references',()=>{
 const s=newGame();moveArmy(s,'xiii','italiaN');moveArmy(s,'viii','hispaniaN');s.armies.find(a=>a.id==='viii').move.remaining=1;tick(s);
 const battles=s.campaignEvents.filter(e=>e.type==='battle');assert.deepEqual(new Set(battles.map(e=>e.regionId)),new Set(['italiaN','hispaniaN']));
 assert.equal(new Set(battles.map(e=>e.battleId)).size,2);
 for(const e of battles){assert.ok(s.battles.find(b=>b.id===e.battleId));assert.match(battleReportHtml(s,s.battles.find(b=>b.id===e.battleId),'en'),/Initial strength/)}
 const s2=newGame();s2.armies=s2.armies.filter(a=>!['italy','spain'].includes(a.id));region(s2,'italiaN').fort=0;region(s2,'hispaniaN').fort=0;
 moveArmy(s2,'xiii','italiaN');moveArmy(s2,'viii','hispaniaN');s2.armies.find(a=>a.id==='viii').move.remaining=1;tick(s2);
 assert.deepEqual(new Set(s2.campaignEvents.filter(e=>e.type==='control').map(e=>e.regionId)),new Set(['italiaN','hispaniaN']));
});

test('rebellion and defeat are reported without inventing foreign intelligence',()=>{
 const s=newGame();region(s,'gaul').loyalty=0;s.factions.caesar.stability=0;tick(s);
 assert.ok(s.campaignEvents.some(e=>e.type==='rebellion'&&e.regionId==='gaul'));
 const weak=newGame();weak.armies.find(a=>a.id==='xiii').men=100;moveArmy(weak,'xiii','italiaN');tick(weak);
 assert.ok(weak.campaignEvents.some(e=>e.type==='battle'&&e.outcome==='lost'&&e.severity==='critical'));
 const foreign=newGame();const count=foreign.campaignEvents.length;
 assert.equal(diplomacy(foreign,'egypt','parthia','war'),true);
 foreign.wars.push(['numidia','mauretania']);resolveBattle(foreign,foreign.armies.find(a=>a.id==='mauretaniaarmy'),foreign.armies.find(a=>a.id==='numidiaarmy'),region(foreign,'numidia'));
 assert.equal(foreign.campaignEvents.length,count);
});

test('notification expiry does not erase chronicle and read state survives save/load',()=>{
 const s=newGame();for(let i=0;i<70;i++)recordEvent(s,{type:'diplomacy',category:'diplomatic',severity:'major',factionId:'caesar',targetFactionId:'senate',action:'improve'});
 assert.equal(s.notifications.length,60);assert.equal(s.campaignEvents.length,70);assert.equal(unreadCount(s),60);
 const first=s.notifications[0].eventId;markRead(s,first);const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(unreadCount(restored),59);assert.equal(restored.campaignEvents.length,70);assert.match(notificationsHtml(restored,'zh'),/未读/);
 assert.equal((chronicleHtml(restored,'en',{type:'military'}).match(/class="report-card/g)||[]).length,0);
 assert.equal((chronicleHtml(restored,'en',{faction:'caesar'}).match(/class="report-card/g)||[]).length,70);
 assert.equal((chronicleHtml(restored,'en',{query:'no such event'}).match(/class="report-card/g)||[]).length,0);
 assert.equal((chronicleHtml(restored,'zh',{query:'改善关系'}).match(/class="report-card/g)||[]).length,70);
 assert.equal((chronicleHtml(restored,'en',{date:'-49:1'}).match(/class="report-card/g)||[]).length,70);
 assert.match(chronicleHtml(restored,'en'),/1\/49 BCE/);
});

test('critical event detection supports the saved optional pause preference',()=>{
 const s=newGame();const before=s.nextCampaignEvent;s.reportPreferences.pauseCritical=true;
 recordEvent(s,{type:'control',category:'military',severity:'critical',regionId:'italiaN',factionId:'senate',previousOwner:'caesar',newOwner:'senate'});
 assert.equal(latestCritical(s,before)?.type,'control');
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).reportPreferences.pauseCritical,true);
});

test('last field army loss points to the battle that caused the objective to fail',()=>{
 const s=newGame();s.armies=s.armies.filter(a=>a.owner!=='caesar'||a.id==='xiii');s.armies.find(a=>a.id==='xiii').men=100;
 moveArmy(s,'xiii','italiaN');tick(s);
 const destroyed=s.campaignEvents.find(e=>e.type==='armyDestroyed'&&e.armyId==='xiii');
 const objective=s.campaignEvents.find(e=>e.type==='objective'&&e.objectiveId==='field'&&e.objectiveStatus==='lost');
 assert.ok(destroyed);assert.ok(objective);assert.equal(objective.causeEventId,destroyed.id);assert.equal(objective.regionId,destroyed.regionId);assert.equal(objective.battleId,destroyed.battleId);
 assert.match(eventText(s,objective,'en').description,/no longer in the field/);
});
