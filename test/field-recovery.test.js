import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,issueMilitaryOrder,reinforcementQuote,previewMarch,moveArmy,vacatedTheaterRisk,resolveBattle,region,upgradeSave} from '../engine.js?v=field-recovery-1';
import {captureCampaignState,recordCampaignTurn,formatChronicleEntry} from '../chronicle.js?v=field-recovery-1';
import {enemyBattleLossEstimate} from '../battle-estimate.js';
import {battleSideForPlayer} from '../visibility.js';

test('reinforcement has a real per-army monthly cap and consumes all three resources',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),f=s.factions.caesar;
 a.men=346;
 const before={treasury:f.treasury,food:f.food,manpower:f.manpower};
 const quote=reinforcementQuote(s,a.id);
 assert.deepEqual([quote.ok,quote.men,quote.treasury,quote.food,quote.manpower],[true,1000,10,3,1000]);
 assert.equal(issueMilitaryOrder(s,a.id,'reinforce').ok,true);
 assert.equal(a.men,1346);
 assert.deepEqual([before.treasury-f.treasury,before.food-f.food,before.manpower-f.manpower],[10,3,1000]);
 assert.equal(reinforcementQuote(s,a.id).reason,'monthly_limit');
 assert.equal(issueMilitaryOrder(s,a.id,'reinforce').reason,'monthly_limit');
 assert.equal(a.men,1346);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(issueMilitaryOrder(loaded,a.id,'reinforce').reason,'monthly_limit');
 loaded.month=2;
 assert.equal(reinforcementQuote(loaded,a.id).ok,true);
 assert.equal(issueMilitaryOrder(loaded,a.id,'reinforce').ok,true);
 assert.equal(loaded.armies.find(x=>x.id===a.id).men,2346);
});

test('reinforcement explains a missing resource before charging anything',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),f=s.factions.caesar;
 f.manpower=999;
 const before={treasury:f.treasury,food:f.food,manpower:f.manpower,men:a.men};
 assert.equal(reinforcementQuote(s,a.id).reason,'manpower');
 assert.equal(issueMilitaryOrder(s,a.id,'reinforce').reason,'manpower');
 assert.deepEqual({treasury:f.treasury,food:f.food,manpower:f.manpower,men:a.men},before);
});

test('vacating the last friendly garrison warns without revealing hidden enemy armies',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 const risk=vacatedTheaterRisk(s,a.id);
 assert.equal(risk.region,'cisalpine');
 assert.ok(!('enemyStrength' in risk));
 assert.equal(previewMarch(s,a.id,'italiaN').vacatedTheater.region,'cisalpine');
 const order=moveArmy(s,a.id,'italiaN');
 assert.equal(order.ok,true);
 assert.equal(order.warning.region,'cisalpine');
 assert.match(s.log[0].zh,/可能未经战斗就失守/);
 const fresh=newGame('caesar'),copy={...fresh.armies.find(x=>x.id==='xiii'),id:'backup',move:null};
 fresh.armies.push(copy);
 assert.equal(vacatedTheaterRisk(fresh,'xiii'),null);
});

test('battlefield range is useful while exact enemy strength stays hidden',()=>{
 const s=newGame('caesar'),before=captureCampaignState(s);
 resolveBattle(s,s.armies.find(x=>x.id==='xiii'),s.armies.find(x=>x.id==='italy'),region(s,'italiaN'));
 const b=s.battles[0],estimate=enemyBattleLossEstimate(b,'caesar');
 assert.ok(estimate.low<=b.lossD&&estimate.high>=b.lossD);
 assert.ok(estimate.high>estimate.low);
 assert.deepEqual(battleSideForPlayer(b,'caesar','defender'),{owner:'senate',unknown:true});
 assert.match(s.log[0].en,/estimated enemy losses/i);
 recordCampaignTurn(s,before);
 const entry=s.chronicle.entries.find(e=>e.kind==='battle');
 assert.deepEqual(entry.enemyEstimate,estimate);
 assert.match(formatChronicleEntry(entry,'zh'),/敌方伤亡估计/);
 assert.match(formatChronicleEntry(entry,'en'),/Estimated enemy losses/);
});

test('uncontested player loss is explicit in the monthly chronicle',()=>{
 const s=newGame('caesar'),before=captureCampaignState(s);
 region(s,'cisalpine').owner='senate';s.month=2;recordCampaignTurn(s,before);
 const loss=s.chronicle.entries.find(e=>e.kind==='territory'&&e.region==='cisalpine');
 assert.equal(loss.ownCasualties,null);
 assert.ok(s.chronicle.monthly[0].territoriesLost.includes('cisalpine'));
 assert.match(formatChronicleEntry(loss,'zh'),/无人驻守时易手/);
 assert.match(formatChronicleEntry(loss,'en'),/without a battle/);
});
