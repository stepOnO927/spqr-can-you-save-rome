import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region} from '../engine.js?v=fort-intel-1';
import {reportedArmies} from '../character-system.js?v=fort-intel-1';
import {estimateAttackLosses} from '../attack-forecast.js';

test('dated observations reveal a broad strength band but no exact enemy count',()=>{
 const s=newGame('caesar'),report=reportedArmies(s,'caesar').find(x=>x.region==='italiaN'),actual=s.armies.find(x=>x.id===report.id);
 assert.ok(report.strengthBand[0]<=actual.men&&actual.men<=report.strengthBand[1]);
 assert.ok(report.strengthBand[1]-report.strengthBand[0]>=2000);
 assert.equal(report.men,undefined);
});

test('attack casualty scenarios use reports, terrain and date without hidden army state',()=>{
 const s=newGame('caesar'),attacker=s.armies.find(x=>x.id==='xiii'),destination=region(s,'italiaN'),sightings=reportedArmies(s,'caesar').filter(x=>x.region===destination.id);
 const args={attacker,food:s.factions.caesar.food,originSupply:region(s,attacker.region).supply,destination,sightings,year:s.year,month:s.month};
 const base=estimateAttackLosses(args);
 assert.equal(base.available,true);assert.ok(base.low>=0&&base.high>=base.low&&base.high<=attacker.men);
 assert.equal(estimateAttackLosses({...args,destination:{...destination,terrain:'hills',fort:2}}).high>=base.high,true);
 assert.equal(estimateAttackLosses({...args,sightings:[]}).available,false);
 assert.equal(estimateAttackLosses({...args,year:s.year+1}).available,false);
});
