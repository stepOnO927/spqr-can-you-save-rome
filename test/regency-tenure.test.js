import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=guardian-playability-1';
import {advanceGovernments,deriveGovernment} from '../governance.js?v=guardian-playability-1';
import {createFictionalPerson} from '../dynasties.js?v=guardian-playability-1';

function fixture(){const s=newGame('caesar');s.world.romanRegimes={caesar:'roman_principate'};s.world.appointments.caesar='lepidus';s.world.characters.caesar.health='seriously_ill';s.wars=[];return s}
test('a renewed illness starts a new regency instead of inheriting the previous tenure',()=>{
 let s=fixture();for(let m=1;m<=5;m++){s.month=m;advanceGovernments(s)}assert.equal(s.world.regencies.caesar.months,5);assert.equal(deriveGovernment(s,'caesar').acting[0],'lepidus');
 s.month=6;s.world.characters.caesar.health='healthy';advanceGovernments(s);assert.equal(s.world.regencies.caesar.endedMonth,6);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.month=7;s.world.characters.caesar.health='dying';advanceGovernments(s);
 assert.deepEqual(s.world.regencies.caesar,{regent:'lepidus',ward:'caesar',months:1,startedYear:-49,startedMonth:7});
 s.month=8;advanceGovernments(s);assert.equal(s.world.regencies.caesar.months,2);
});
test('an end date in 1 CE is not overwritten and a later regency starts fresh',()=>{
 let s=fixture();s.year=0;s.month=1;advanceGovernments(s);s.month=2;s.world.characters.caesar.health='healthy';advanceGovernments(s);assert.equal(s.world.regencies.caesar.endedYear,0);assert.equal(s.world.regencies.caesar.endedMonth,2);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.month=3;advanceGovernments(s);assert.equal(s.world.regencies.caesar.endedMonth,2);
 s.month=4;s.world.characters.caesar.health='seriously_ill';advanceGovernments(s);assert.equal(s.world.regencies.caesar.months,1);assert.equal(s.world.regencies.caesar.startedMonth,4);assert.equal(s.world.regencies.caesar.endedYear,undefined);
});
test('the same Egyptian court can resume a regency without disclosing its private duration to Rome',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Court official','宫廷官员'],faction:'egypt',birthYear:-85,location:'egypt'});s.world.appointments.egypt=id;s.world.characters.cleopatra.health='seriously_ill';
 for(let m=1;m<=5;m++){s.month=m;advanceGovernments(s)}assert.equal(s.world.regencies.egypt.months,5);assert.deepEqual(deriveGovernment(s,'egypt').acting,[id]);
 s.month=6;s.world.characters.cleopatra.health='healthy';advanceGovernments(s);assert.equal(s.world.regencies.egypt.endedMonth,6);
 s.month=7;s.world.characters.cleopatra.health='seriously_ill';advanceGovernments(s);assert.equal(s.world.regencies.egypt.months,1);assert.equal(s.world.regencies.egypt.startedMonth,7);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
