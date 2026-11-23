import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=peace-sender-1';
import {advanceLocalEntities,advanceLocalTrade,localContactQuote,localEntity,offerLocalContact} from '../local-polities.js';
import {inspectState} from '../inspector-diagnostics.js?v=peace-sender-1';

function compact(){
 const state=newGame('caesar'),city=localEntity(state,'massilia');
 const treasury=state.factions.caesar.treasury;
 assert.deepEqual(localContactQuote(state,'massilia','caesar','trade'),{ok:true,cost:10,months:2});
 assert.equal(offerLocalContact(state,'massilia','caesar','trade').ok,true);
 assert.equal(state.factions.caesar.treasury,treasury-10);
 state.month=2;advanceLocalEntities(state);state.month=3;advanceLocalEntities(state);
 assert.equal(city.lastOutcome.proposal,'trade');assert.equal(city.lastOutcome.accepted,true);
 return {state,city,treasury};
}

test('local trade spends real money and finite food without granting territory or army passage',()=>{
 const {state,city,treasury}=compact();
 assert.equal(city.tradeRights.caesar,-49*12+3+24);
 assert.equal(state.factions.caesar.treasury,treasury-13);
 assert.equal(state.factions.caesar.food,67);
 assert.equal(city.food,10);assert.equal(city.treasury,23);
 assert.equal(city.controller,city.id);assert.equal(state.regions.find(region=>region.id==='narbo').owner,'caesar');
 assert.equal(city.access.caesar,undefined);
 advanceLocalEntities(state);assert.equal(city.food,10);assert.equal(state.factions.caesar.food,67);
 const loaded=upgradeSave(structuredClone(state));assert.equal(localEntity(loaded,'massilia').tradeRights.caesar,city.tradeRights.caesar);
 assert.equal(inspectState(loaded).filter(f=>['invalid-local-trade-rights','invalid-local-trade'].includes(f.code)).length,0);
});

test('a closed or hostile commercial route and civilian reserve stop a local trade transfer',()=>{
 const {state,city}=compact();state.month=6;city.food=5;
 const before={food:state.factions.caesar.food,treasury:state.factions.caesar.treasury};
 advanceLocalTrade(state);assert.equal(state.factions.caesar.food,before.food);assert.equal(state.factions.caesar.treasury,before.treasury);
 assert.equal(localContactQuote(state,'massilia','caesar','trade').reason,'no_surplus');
 city.food=10;state.month=9;state.regions.find(region=>region.id==='narbo').owner='senate';
 state.borderPolicies.senate.commercial='closed';advanceLocalTrade(state);
 assert.equal(state.factions.caesar.food,before.food);assert.equal(city.food,10);
 assert.equal(localContactQuote(state,'massilia','caesar','trade').reason,'trade_route_closed');
});

test('a food-short AI government seeks a nearby independent market',()=>{
 const state=newGame('senate');state.month=2;state.factions.caesar.food=12;state.factions.caesar.treasury=100;
 tick(state);
 assert.equal(localEntity(state,'massilia').pending?.proposal,'trade');
 assert.equal(localEntity(state,'massilia').pending?.actor,'caesar');
});

test('inspector rejects forged compact data',()=>{
 const state=newGame('caesar'),city=localEntity(state,'massilia');city.tradeRights={ghost:10};city.lastTrade={actor:'caesar',year:-49,month:13,food:2,price:3};
 const codes=inspectState(state).map(f=>f.code);assert.ok(codes.includes('invalid-local-trade-rights'));assert.ok(codes.includes('invalid-local-trade'));
});

test('ordinary campaign turns apply one resource-backed local exchange',()=>{
 const {state}=compact();state.month=5;const control=structuredClone(state);delete localEntity(control,'massilia').tradeRights.caesar;
 tick(state);tick(control);
 assert.equal(state.month,6);assert.equal(state.factions.caesar.food,control.factions.caesar.food+2);
 assert.equal(state.factions.caesar.treasury,control.factions.caesar.treasury-3);
 assert.equal(localEntity(state,'massilia').food,localEntity(control,'massilia').food-2);
});
