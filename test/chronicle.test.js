import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,resolveBattle,region,diplomacy} from '../engine.js?v=strategic-offers-1';
import {captureCampaignState,recordCampaignTurn,filterChronicle,formatChronicleEntry,recordIntelligenceReports,syncChronicleDispatches} from '../chronicle.js?v=dynasty-id-3';

test('between-turn dispatches appear once with their original dates without importing unverified legacy entries',()=>{
 const s=newGame('caesar');s.log.unshift({year:-49,month:2,en:'An offer arrived.',zh:'议和信已送达。'},{year:-49,month:1,en:'SECRET',zh:'秘密',legacyUnverified:true});
 syncChronicleDispatches(s);syncChronicleDispatches(s);
 const messages=s.chronicle.entries.filter(e=>e.en==='An offer arrived.');assert.equal(messages.length,1);assert.equal(messages[0].month,2);assert.ok(!s.chronicle.entries.some(e=>e.en==='SECRET'));
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));syncChronicleDispatches(loaded);assert.equal(loaded.chronicle.entries.filter(e=>e.en==='An offer arrived.').length,1);
});
import {finalizeCampaign} from '../legacy.js?v=imperium-1';
import {appointCommander} from '../command-appointments.js';
import {planSuccession} from '../governance.js';

test('36 monthly turns preserve a full chronology and three evidence-based annual reviews',()=>{
 const s=newGame('caesar');for(let i=0;i<36;i++)tick(s);
 const records=s.chronicle.entries.filter(e=>e.kind==='economy'&&e.change==='monthly');
 assert.equal(records.length,36);assert.equal(s.chronicle.monthly.length,36);assert.equal(s.chronicle.annual.length,3);
 for(const review of s.chronicle.annual)assert.equal(review.economy.treasury,s.chronicle.entries.filter(e=>e.year===review.year&&e.kind==='economy').reduce((n,e)=>n+e.delta.treasury,0));
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.chronicle.entries.length,s.chronicle.entries.length);assert.deepEqual(saved.chronicle.monthly,s.chronicle.monthly);assert.deepEqual(saved.chronicle.annual,s.chronicle.annual);
});

test('recapture and capital loss record actual controllers, location, consequences and critical priority',()=>{
 const s=newGame('senate'),r=region(s,'roma'),before=captureCampaignState(s);r.owner='caesar';s.month=2;recordCampaignTurn(s,before);
 const loss=s.chronicle.entries.find(e=>e.kind==='territory');assert.equal(loss.previous,'senate');assert.equal(loss.current,'caesar');assert.equal(loss.region,'roma');assert.equal(loss.priority,'critical');assert.deepEqual(loss.strategic.objectives,['roma']);assert.match(formatChronicleEntry(loss,'en'),/Rome|Latium/);assert.match(formatChronicleEntry(loss,'zh'),/罗马|拉丁姆/);
 const next=captureCampaignState(s);r.owner='senate';s.month=3;recordCampaignTurn(s,next);assert.equal(s.chronicle.entries.find(e=>e.kind==='territory').current,'senate');
});

test('simultaneous real battles retain separate identifiers and known friendly losses',()=>{
 const s=newGame('caesar'),before=captureCampaignState(s);
 resolveBattle(s,s.armies.find(a=>a.id==='xiii'),s.armies.find(a=>a.id==='italy'),region(s,'italiaN'));
 resolveBattle(s,s.armies.find(a=>a.id==='viii'),s.armies.find(a=>a.id==='spain'),region(s,'hispaniaN'));
 recordCampaignTurn(s,before);const battles=s.chronicle.entries.filter(e=>e.kind==='battle');assert.equal(battles.length,2);assert.equal(new Set(battles.map(e=>e.battleId)).size,2);assert.ok(battles.every(e=>e.ownCasualties>=0&&e.enemyCasualties===null));
});

test('two battles by one army in one theater have distinct report links after save and load',()=>{
 const s=newGame('caesar'),before=captureCampaignState(s),attacker=s.armies.find(a=>a.id==='xiii'),defender=s.armies.find(a=>a.id==='italy');
 resolveBattle(s,attacker,defender,region(s,'italiaN'));
 const fresh={...defender,id:'reinforcements',name:['Senatorial reinforcements','元老院援军'],men:5000,region:'italiaN',move:null,siege:null};s.armies.push(fresh);
 resolveBattle(s,attacker,fresh,region(s,'italiaN'));recordCampaignTurn(s,before);
 const ids=s.chronicle.entries.filter(e=>e.kind==='battle').map(e=>e.battleId);assert.equal(new Set(ids).size,2);assert.ok(ids.every(id=>s.battles.some(b=>b.id===id)));
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(saved.chronicle.entries.filter(e=>e.kind==='battle').map(e=>e.battleId),ids);
});

test('deaths, diplomacy, rebellion and army destruction generate classified alerts without foreign secrets',()=>{
 const s=newGame('caesar'),before=captureCampaignState(s);s.month=2;s.world.characters.caesar.alive=false;s.world.governments.caesar.kind='vacant';s.wars.push(['caesar','egypt']);region(s,'gaul').owner='rebels';s.armies=s.armies.filter(a=>a.id!=='xiii');recordCampaignTurn(s,before);
 const entries=s.chronicle.entries;assert.ok(entries.some(e=>e.kind==='character'&&e.characterId==='caesar'&&e.priority==='critical'));assert.ok(entries.some(e=>e.kind==='government'&&e.to==='vacant'));assert.ok(entries.some(e=>e.kind==='diplomacy'&&e.other==='egypt'));assert.ok(entries.some(e=>e.kind==='army'&&e.armyId==='xiii'&&e.priority==='critical'));assert.ok(entries.some(e=>e.kind==='territory'&&e.current==='rebels'));
 const foreign=captureCampaignState(s);s.world.characters.cleopatra.alive=false;s.factions.egypt.treasury=-90;recordCampaignTurn(s,foreign);assert.ok(!s.chronicle.entries.some(e=>e.characterId==='cleopatra'||e.faction==='egypt'));
});

test('Chronicle filtering, dated intelligence, and finalized archive replay stay bilingual',()=>{
 const s=newGame('caesar');const before=captureCampaignState(s);s.month=2;region(s,'gaul').owner='senate';recordCampaignTurn(s,before);
 recordIntelligenceReports(s,[{region:'egypt',name:['Egypt','埃及'],owner:['Egypt','埃及'],year:-49,month:1,source:'travelers'}]);
 const events=s.chronicle.entries,territory=filterChronicle(events,{kind:'territory',faction:'senate',from:String(-49*12+2)});assert.equal(territory.length,1);assert.equal(filterChronicle(events,{kind:'territory',to:String(-49*12+1)}).length,0);assert.ok(filterChronicle(events,{query:'Egypt',kind:'intelligence'}).length);
 assert.match(formatChronicleEntry(events[0],'en'),/may be outdated/);assert.match(formatChronicleEntry(events[0],'zh'),/可能过时/);
 s.victory=true;const archive=finalizeCampaign(s).archive;assert.ok(archive.chronicle.some(e=>e.kind==='territory'));assert.ok(archive.chronicle.some(e=>e.kind==='intelligence'&&e.source==='travelers'));
});

test('Senatorial campaign retains 36 monthly reports and three annual reviews',()=>{
 const s=newGame('senate');for(let i=0;i<36;i++)tick(s);assert.equal(s.chronicle.monthly.length,36);assert.equal(s.chronicle.annual.length,3);assert.ok(s.chronicle.entries.every(e=>e.faction==='senate'));
});

test('diplomatic decisions enter the Chronicle before month advance, save and finalization',()=>{
 const s=newGame('caesar');assert.equal(diplomacy(s,'caesar','mauretania','improve'),true);syncChronicleDispatches(s);const entry=s.chronicle.entries.find(e=>e.topic==='diplomacy');assert.equal(entry.other,'mauretania');assert.equal(filterChronicle(s.chronicle.entries,{kind:'diplomacy',faction:'mauretania'}).length,1);assert.match(entry.zh,/关系/);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));syncChronicleDispatches(saved);assert.equal(saved.chronicle.entries.filter(e=>e.en===entry.en).length,1);saved.victory=true;const archive=finalizeCampaign(saved).archive;assert.ok(archive.chronicle.some(e=>e.id===entry.id));
});

test('December decisions appear by name in the annual review without double counting',()=>{
 const s=newGame('caesar');for(let i=0;i<11;i++)tick(s);assert.equal(s.month,12);s.factions.caesar.treasury=Math.max(100,s.factions.caesar.treasury);region(s,'mauretania').owner='mauretania';region(s,'cisalpine').owner='caesar';s.wars=s.wars.filter(w=>!w.includes('mauretania'));assert.equal(diplomacy(s,'caesar','mauretania','improve'),true);syncChronicleDispatches(s);const report=s.chronicle.annual[0];assert.ok(report.diplomaticEvents.some(e=>/improved relations/.test(e.en)&&/关系/.test(e.zh)));assert.equal(report.diplomacy,report.diplomaticEvents.length);syncChronicleDispatches(s);assert.equal(report.diplomaticEvents.length,1);
});

test('new commander appointment can be found by character before advancing time',()=>{
 const s=newGame('caesar');assert.equal(appointCommander(s,'xiii','antony').ok,true);syncChronicleDispatches(s);const found=filterChronicle(s.chronicle.entries,{kind:'character',character:'antony'});assert.ok(found.some(e=>/Appointed commander/.test(e.en)));assert.ok(found.every(e=>e.characterId==='antony'));assert.ok(s.chronicle.monthly[0].entryIds.includes(found[0].id));const save=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(filterChronicle(save.chronicle.entries,{kind:'character',character:'antony'}).length,found.length);
});

test('successor designation is an immediate character event with a stable person filter',()=>{
 const s=newGame('caesar');assert.equal(planSuccession(s,'antony').ok,true);syncChronicleDispatches(s);const entries=filterChronicle(s.chronicle.entries,{kind:'character',character:'antony'});assert.ok(entries.some(e=>/possible successor/.test(e.en)));assert.ok(entries.some(e=>/可能继任者/.test(e.zh)));
});
