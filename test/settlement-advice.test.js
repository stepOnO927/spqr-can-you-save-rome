import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,aiTurn} from '../engine.js';
import {publicSettlementTerms,settlementEligible} from '../campaign-outcome.js';
import {settlementAdvice} from '../settlement-ui.js';

test('civil settlement advice shows only public and own conditions in both languages',()=>{
 const s=newGrandGame('caesar'),before=publicSettlementTerms(s,'caesar','senate');
 assert.equal(before.strategicReady,false);
 assert.equal(before.held,before.initial);
 assert.match(settlementAdvice(s,'caesar','senate','en'),/Control Rome/);
 assert.match(settlementAdvice(s,'caesar','senate','zh'),/须控制罗马/);
 s.regions.find(r=>r.id==='roma').owner='caesar';
 const underPressure=settlementAdvice(s,'caesar','senate','en');
 assert.match(underPressure,/territorial losses since the opening: 1\/9/);
 assert.match(settlementAdvice(s,'caesar','senate','zh'),/领土损失为1\/9/);
 const unchanged=settlementAdvice(s,'caesar','senate','en');
 for(const army of s.armies.filter(a=>a.owner==='senate'))army.men=1;
 assert.equal(settlementAdvice(s,'caesar','senate','en'),unchanged,'advice must not inspect concealed enemy troops');
 for(const army of s.armies.filter(a=>a.owner==='senate'))army.men=12000;
 s.factions.caesar.legitimacy=30;s.factions.caesar.stability=20;
 assert.match(settlementAdvice(s,'caesar','senate','en'),/legitimacy must reach 35 and stability 30/);
 s.factions.caesar.legitimacy=50;s.factions.caesar.stability=50;
 for(const site of s.regions.filter(r=>r.owner==='senate').slice(0,before.requiredLosses-1))site.owner='caesar';
 assert.equal(publicSettlementTerms(s,'caesar','senate').held,before.initial-before.requiredLosses);
 assert.match(settlementAdvice(s,'caesar','senate','en'),/conditions appear met/);
 assert.equal(settlementEligible(s,'caesar','senate'),false,'public readiness must not predict private acceptance');
 const now=s.year*12+s.month;s.lastSettlementOffer={'caesar:senate':now-1};
 assert.match(settlementAdvice(s,'caesar','senate','en'),/Wait 2 more month/);
 assert.match(settlementAdvice(s,'caesar','senate','zh'),/等待2个月/);
});

test('AI does not fund a civil settlement mission before visible territorial pressure exists',()=>{
 const scenario=losses=>{
  const s=newGrandGame('senate');s.year=-49;s.month=12;
  Object.assign(s.factions.caesar,{treasury:500,food:100,legitimacy:60,stability:60,manpower:0});
  s.armies.find(a=>a.id==='xiii').men=30000;
  for(const site of s.regions.filter(r=>r.owner==='senate').slice(0,losses))site.owner='caesar';
  s.regions.find(r=>r.id==='roma').owner='caesar';
  aiTurn(s,'caesar');return s;
 };
 assert.equal(scenario(1).lastSettlementOffer?.['caesar:senate'],undefined);
 assert.equal(scenario(10).lastSettlementOffer?.['caesar:senate'],-49*12+12,'once public losses are sufficient the mission can still be sent and refused privately');
});
