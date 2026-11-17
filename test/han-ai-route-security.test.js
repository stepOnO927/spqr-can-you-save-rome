import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=mutual-audience-1';
import {advanceEasternMarkets} from '../han/markets.js?v=mutual-audience-1';
import {advanceSilk,protectRoute,ROUTE_PROTECTION_COST} from '../han/silk-road.js?v=mutual-audience-1';
import {roll} from '../han/util.js?v=mutual-audience-1';

test('AI Han funds route guards after its own paid caravan is actually raided',()=>{
 let s=newHanGame('shanshan',{seed:38});s.tradeMarkets.embeddedRoman=true;s.month=2;advanceSilk(s);
 const caravan=s.silk.caravans.find(c=>c.shipmentId),shipment=s.tradeMarkets.shipments.find(x=>x.id===caravan?.shipmentId);
 assert.ok(caravan&&shipment);assert.equal(shipment.sponsor,'han');
 const hazard=s.regions.find(r=>r.id===shipment.legs[0].to);hazard.unrest=1;hazard.fort=0;
 for(const army of s.armies.filter(a=>a.region===hazard.id))army.men=0;
 s.month=3;shipment.remaining=1;
 let selected=null;for(let seed=1;seed<10000;seed++){if(roll({...s,seed},`market-bandit:${shipment.id}:${hazard.id}`)<.08){selected=seed;break}}
 assert.ok(selected);s.seed=selected;
 const poor=loadHanSave(serialize(s));poor.factions.han.treasury=ROUTE_PROTECTION_COST+119;
 const treasury=s.factions.han.treasury;
 advanceEasternMarkets(s);assert.equal(shipment.status,'lost');assert.equal(s.silk.security,0);
 advanceSilk(s);assert.equal(caravan.status,'lost');assert.equal(s.silk.security,1);
 assert.equal(s.factions.han.treasury,treasury-ROUTE_PROTECTION_COST);
 assert.equal(s.silk.protectionSpent,ROUTE_PROTECTION_COST);
 assert.deepEqual(s.silk.aiProtectedLossIds,[caravan.id]);
 advanceSilk(s);assert.equal(s.factions.han.treasury,treasury-ROUTE_PROTECTION_COST,'one raid cannot be charged twice');
 s=loadHanSave(serialize(s));s.month=4;advanceEasternMarkets(s);advanceSilk(s);
 assert.equal(s.silk.security,1);assert.equal(s.silk.protectionSpent,ROUTE_PROTECTION_COST);
 advanceEasternMarkets(poor);assert.equal(poor.tradeMarkets.shipments.find(x=>x.id===shipment.id).status,'lost');advanceSilk(poor);
 assert.equal(poor.silk.security,0,'AI keeps an operating treasury reserve');
 const player=newHanGame('han');assert.equal(protectRoute(player).ok,true);
 assert.equal(player.silk.protectionSpent,ROUTE_PROTECTION_COST,'player protection is recorded in the same ledger');
});
