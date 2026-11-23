import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=official-inquiries-1';
import {advanceLocalEntities,localContactQuote,localEntity,offerLocalContact} from '../local-polities.js';
import {inspectState} from '../inspector-diagnostics.js?v=official-inquiries-1';
import {exportSaves,importSaves} from '../save-transfer.js';

function storage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}

function request(seed=0){
 const state=newGame('caesar'),city=localEntity(state,'massilia');
 state.factions.caesar.food=8;city.seed=seed;
 assert.deepEqual(localContactQuote(state,city.id,'caesar','supplies'),{ok:true,cost:12,months:2});
 assert.equal(offerLocalContact(state,city.id,'caesar','supplies').ok,true);
 return {state,city};
}
function arrive(state){state.month=2;advanceLocalEntities(state);advanceLocalEntities(state);assert.equal(localEntity(state,'massilia').pending.remaining,1);state.month=3;advanceLocalEntities(state);advanceLocalEntities(state)}

test('an emergency supply request escrows real money and transfers finite local food after a saved reply',()=>{
 const {state,city}=request();
 assert.equal(state.factions.caesar.treasury,78);
 assert.equal(state.factions.caesar.food,8);
 assert.equal(city.food,12);
 assert.deepEqual(city.pending,{actor:'caesar',proposal:'supplies',remaining:2,sentYear:-49,sentMonth:1,escrow:10,lastAdvancedAt:-49*12+1});
 const source=storage({'spqr-save-1':JSON.stringify(state)}),destination=storage();
 assert.deepEqual(importSaves(exportSaves(source),destination).imported,['spqr-save-1']);
 const loaded=upgradeSave(JSON.parse(destination.getItem('spqr-save-1'))),savedCity=localEntity(loaded,city.id);
 assert.equal(savedCity.pending.escrow,10);
 arrive(loaded);
 assert.equal(savedCity.lastOutcome.accepted,true);
 assert.equal(savedCity.lastOutcome.food,6);
 assert.equal(loaded.factions.caesar.food,14);
 assert.equal(loaded.factions.caesar.treasury,78);
 assert.equal(savedCity.food,6);
 assert.equal(savedCity.treasury,30);
 assert.equal(savedCity.controller,savedCity.id);
 assert.equal(savedCity.access.caesar,undefined);
 assert.equal(savedCity.overlord,null);
 assert.match(loaded.mail.messages.find(mail=>mail.id===savedCity.lastOutcome.mailId).body[0],/6 food/);
 assert.equal(inspectState(loaded).filter(finding=>finding.code.startsWith('invalid-local-supply')).length,0);
});

test('refusal returns the escrow while the courier fee remains spent',()=>{
 const {state,city}=request(0x80000000);
 arrive(state);
 assert.equal(city.lastOutcome.accepted,false);
 assert.equal(city.lastOutcome.refunded,10);
 assert.equal(state.factions.caesar.treasury,88);
 assert.equal(state.factions.caesar.food,8);
 assert.equal(city.food,12);
 assert.equal(city.treasury,20);
 assert.match(state.mail.messages.find(mail=>mail.id===city.lastOutcome.mailId).body[0],/returned/);
});

test('changed route, depleted stores or recovered demand cancels delivery and refunds the price',()=>{
 for(const change of [
  (state,city)=>{state.regions.find(region=>region.id===city.theater).owner='senate';state.borderPolicies.senate.commercial='closed'},
  (_state,city)=>{city.food=9},
  state=>{state.factions.caesar.food=20}
 ]){
  const {state,city}=request();change(state,city);const before={buyerFood:state.factions.caesar.food,localFood:city.food,localTreasury:city.treasury};
  arrive(state);
  assert.equal(city.lastOutcome.accepted,false);
  assert.equal(state.factions.caesar.treasury,88);
  assert.equal(state.factions.caesar.food,before.buyerFood);
  assert.equal(city.food,before.localFood);
  assert.equal(city.treasury,before.localTreasury);
 }
});

test('a severely hungry AI court uses the same request and corrupt escrow is diagnosed',()=>{
 const state=newGame('senate'),city=localEntity(state,'massilia');
 state.month=2;state.factions.caesar.food=0;state.factions.caesar.treasury=100;
 tick(state);
 assert.equal(city.pending?.proposal,'supplies');assert.equal(city.pending?.actor,'caesar');
 assert.equal(city.pending.escrow,10);
 city.pending.escrow=1000;
 assert.ok(inspectState(state).some(finding=>finding.code==='invalid-local-supply-request'));
});
