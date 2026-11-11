import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveBattle,region,tick,upgradeSave,diplomacy,setTax,isWar} from '../engine.js?v=strategic-offers-1';
import {observeArmies,reportedArmies} from '../character-system.js?v=imperium-1';
import {battleSideForPlayer,visibleLogText,visibleArmyForPlayer,visibleSummaryEvidence} from '../visibility.js';

test('battle projection hides opponent details while preserving actual simulation evidence',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),d=s.armies.find(x=>x.id==='italy');resolveBattle(s,a,d,region(s,'italiaN'));const b=s.battles[0],own=battleSideForPlayer(b,'caesar','attacker'),enemy=battleSideForPlayer(b,'caesar','defender');
 assert.equal(own.casualties,b.lossA);assert.deepEqual(enemy,{owner:'senate',unknown:true});assert.equal(typeof b.defender.men,'number');assert.match(s.log[0].en,/enemy unknown/);assert.doesNotMatch(s.log[0].en,/\d+ \/ \d+/);
});
test('legacy casualty logs do not reveal exact enemy numbers in either language',()=>{
 const event={en:'Caesar won. Casualties: 1,234 / 5,678.',zh:'凯撒获胜。伤亡：1,234 / 5,678。'};assert.equal(visibleLogText(event,'en'),'Caesar won. Casualties: details unverified.');assert.equal(visibleLogText(event,'zh'),'凯撒获胜。伤亡：详情未核实。');
});
test('old chronicle evidence without provenance remains hidden after loading, while new dispatches remain visible',()=>{
 let s=newGame('caesar');delete s.chronicleVisibilityVersion;
 s.log=[{en:'Secret Egyptian tax policy changed.',zh:'秘密税率变更。'}];
 const old={changes:[{name:['Egypt','埃及'],owner:['Parthia','帕提亚']}],events:[s.log[0]]};
 s.turnSummaries=[old];s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.match(visibleLogText(s.log[0],'en'),/unknown intelligence source/);
 assert.match(visibleLogText(s.log[0],'zh'),/来源无法确认/);
 assert.deepEqual(visibleSummaryEvidence(s.turnSummaries[0],'caesar'),{changes:[],events:[],legacy:true});
 s.log.unshift({en:'A new messenger arrives.',zh:'新信使抵达。'});
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(visibleLogText(s.log[0],'en'),'A new messenger arrives.');
 const fresh={knowledgeViewer:'caesar',changes:[{name:['Rome','罗马']}],events:[s.log[0]]};
 assert.deepEqual(visibleSummaryEvidence(fresh,'caesar'),{changes:fresh.changes,events:fresh.events,legacy:false});
 assert.deepEqual(visibleSummaryEvidence(fresh,'senate'),{changes:[],events:[],legacy:true});
});
test('foreign sieges in unseen theaters are not published to the player chronicle',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='egyptguard'),target=region(s,'syria');target.owner='parthia';target.fort=1;s.wars.push(['egypt','parthia']);a.move={to:'syria',remaining:1};tick(s);assert.ok(a.siege);assert.ok(!s.log.some(e=>e.en.includes('began a siege at Syria')));
});
test('an old army sighting does not expose its actual destruction, movement, or defection',()=>{
 const s=newGame('senate'),reported=visibleArmyForPlayer(s,'senate','xiii');
 assert.equal(reported.reported,true);assert.equal(reported.region,'cisalpine');
 const actual=s.armies.find(a=>a.id==='xiii');actual.region='syria';actual.men=1;actual.name=['Secret change','秘密变更'];
 assert.deepEqual(visibleArmyForPlayer(s,'senate','xiii'),reported);
 actual.owner='egypt';assert.deepEqual(visibleArmyForPlayer(s,'senate','xiii'),reported);
 s.armies=s.armies.filter(a=>a.id!=='xiii');
 assert.deepEqual(visibleArmyForPlayer(s,'senate','xiii'),reported);
 assert.equal(visibleArmyForPlayer(s,'senate','italy').owner,'senate');
});
test('only a visible recheck retires a marker; history survives saves without revealing its fate',()=>{
 let s=newGame('senate');region(s,'italiaN').owner='caesar';const unit=s.armies.find(a=>a.id==='xiii');unit.region='gaul';unit.characterId='antony';s.month=2;observeArmies(s);
 assert.equal(reportedArmies(s,'senate').find(a=>a.id==='xiii').region,'cisalpine');assert.equal(s.knowledge.senate.caesar.sightingHistory,undefined);
 region(s,'italiaN').owner='senate';s.month=3;observeArmies(s);assert.equal(reportedArmies(s,'senate').find(a=>a.id==='xiii'),undefined);
 let entry=s.knowledge.senate.caesar.sightingHistory[0];assert.equal(entry.region,'cisalpine');assert.equal(entry.month,1);assert.equal(entry.checkedMonth,3);assert.equal(entry.commanderId,'caesar');assert.equal(entry.fate,undefined);assert.equal(entry.destination,undefined);assert.equal(s.knowledge.egypt.caesar.sightingHistory,undefined);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));entry=s.knowledge.senate.caesar.sightingHistory[0];assert.equal(entry.checkedMonth,3);
});
test('an army still in its last observed theater is not erased just because it is moving',()=>{
 const s=newGame('senate'),unit=s.armies.find(a=>a.id==='xiii');unit.move={to:'gaul',remaining:1};s.month=2;observeArmies(s);
 assert.equal(reportedArmies(s,'senate').find(a=>a.id==='xiii').region,'cisalpine');assert.equal(s.knowledge.senate.caesar.sightingHistory,undefined);
});

test('unrelated foreign diplomacy and taxation do not appear in the player chronicle',()=>{
 const s=newGame('caesar');s.log=[];assert.equal(setTax(s,'egypt','high'),true);assert.equal(diplomacy(s,'egypt','parthia','improve'),true);s.relations['egypt:parthia']=50;assert.equal(diplomacy(s,'egypt','parthia','alliance'),true);assert.equal(diplomacy(s,'egypt','parthia','break'),true);assert.equal(diplomacy(s,'egypt','parthia','war'),true);s.factions.egypt.stability=0;s.factions.parthia.stability=0;assert.equal(diplomacy(s,'egypt','parthia','peace'),true);assert.equal(s.log.length,0);
});
test('diplomacy involving the player and wars entered through alliances remain visible',()=>{
 const direct=newGame('caesar');direct.log=[];assert.equal(diplomacy(direct,'caesar','egypt','improve'),true);assert.match(direct.log[0].en,/improved relations/);
 for(const side of ['egypt','parthia']){const s=newGame('caesar');s.log=[];s.alliances.push(['caesar',side]);assert.equal(diplomacy(s,'egypt','parthia','war'),true);const enemy=side==='egypt'?'parthia':'egypt';assert.equal(isWar(s,'caesar',enemy),true);assert.equal(s.log.length,1);assert.match(s.log[0].en,/alliance has brought your faction into war/);assert.match(s.log[0].en,new RegExp(enemy==='egypt'?'Egypt':'Parthia'));}
});
