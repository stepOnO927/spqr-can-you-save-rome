import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=faces-reported-identity-1';
import {activeEasternMarketHouse,advanceEasternMarkets,fundEasternMarketHouse,MARKET_HOUSE_COST,MARKET_HOUSE_MONTHS,placeEasternTrade,quoteEasternTrade} from '../han/markets.js?v=faces-wheels-1';
import {createMarketMerchant} from '../han/field-identities.js';
import {roll} from '../han/util.js?v=han-1';

function setup(){
 const s=newHanGame('han',{seed:113});s.tradeMarkets.embeddedRoman=true;
 s.treaties.push({type:'market',parties:['han','parthia']});
 s.factions.han.treasury=1000;
 const id=createMarketMerchant(s,'han','changan'),person=s.persons[id];
 s.tradeMarkets.merchants.han=[id];person.wealth=MARKET_HOUSE_COST;person.marketReputation=2;
 return {s,id,person};
}

const request={seller:'parthia',buyer:'han',origin:'parthia',destination:'changan',commodity:'silk',quantity:1};

test('a market house uses merchant wealth, persists, and changes a real paid quote',()=>{
 let {s,id}=setup();
 const original=quoteEasternTrade(s,request);assert.equal(original.ok,true,original.reason);
 const treasury=s.factions.han.treasury,wealth=s.persons[id].wealth;
 const result=fundEasternMarketHouse(s,id,'changan');assert.equal(result.ok,true);
 assert.equal(s.persons[id].wealth,wealth-MARKET_HOUSE_COST);
 assert.equal(s.factions.han.treasury,treasury);
 assert.equal(s.tradeMarkets.marketHouseSpent,MARKET_HOUSE_COST);
 assert.equal(fundEasternMarketHouse(s,id,'changan').ok,false,'no duplicate house or cost');
 s=loadHanSave(serialize(s));
 assert.equal(activeEasternMarketHouse(s,'changan','han')?.merchantId,id);
 const discounted=quoteEasternTrade(s,request);assert.equal(discounted.ok,true,discounted.reason);
 assert.equal(discounted.marketHouseId,id);
 assert.ok(discounted.transport<original.transport,`${original.transport} -> ${discounted.transport}`);
 const sent=placeEasternTrade(s,request);assert.equal(sent.ok,true,sent.reason);
 assert.equal(sent.shipment.transport,discounted.transport);
 assert.equal(sent.shipment.marketHouseId,id);
 const last=sent.shipment.legs.length-1;sent.shipment.leg=last;sent.shipment.remaining=1;
 s.regions.find(r=>r.id===sent.shipment.destination).fort=5;
 s.month++;advanceEasternMarkets(s);
 assert.equal(sent.shipment.status,'delivered');
 assert.equal(sent.shipment.marketHouseRent,1);
 assert.equal(s.persons[id].wealth,1,'house owner receives a share of prepaid transport');
 assert.equal(s.tradeMarkets.marketHouseRent,1);
 assert.equal(s.tradeMarkets.marketHouses.changan.rentEarned,1);
 assert.equal(s.tradeMarkets.transactions.at(-1).marketHouseRent,1);
 s=loadHanSave(serialize(s));
 assert.equal(s.tradeMarkets.marketHouses.changan.rentEarned,1);
 assert.equal(s.tradeMarkets.marketHouseSpent,MARKET_HOUSE_COST);
});

test('house benefits stop on death, allegiance, control loss, or expiry',()=>{
 const {s,id}=setup();assert.equal(fundEasternMarketHouse(s,id,'changan').ok,true);
 for(const mutate of [
  state=>{state.persons[id].alive=false},
  state=>{state.persons[id].faction='parthia'},
  state=>{state.regions.find(r=>r.id==='changan').owner='parthia'},
  state=>{state.year+=Math.ceil(MARKET_HOUSE_MONTHS/12)}
 ]){
  const changed=loadHanSave(serialize(s));mutate(changed);
  assert.equal(activeEasternMarketHouse(changed,'changan','han'),null);
  if(changed.regions.find(r=>r.id==='changan').owner==='han')assert.equal(quoteEasternTrade(changed,request).marketHouseId,null);
 }
});

test('the player cannot spend a defector’s, poor, or distant merchant’s wealth',()=>{
 const {s,id}=setup();
 const before=s.tradeMarkets.marketHouseSpent;
 s.persons[id].wealth=MARKET_HOUSE_COST-1;assert.equal(fundEasternMarketHouse(s,id,'changan').ok,false);
 s.persons[id].wealth=MARKET_HOUSE_COST;s.persons[id].faction='parthia';assert.equal(fundEasternMarketHouse(s,id,'changan').ok,false);
 s.persons[id].faction='han';s.persons[id].location='hongnong';assert.equal(fundEasternMarketHouse(s,id,'changan').ok,false);
 assert.equal(s.tradeMarkets.marketHouseSpent,before);
});

test('a market house guards the last leg only while its owner still serves the destination',()=>{
 let {s,id}=setup();assert.equal(fundEasternMarketHouse(s,id,'changan').ok,true);
 const sent=placeEasternTrade(s,request);assert.equal(sent.ok,true,sent.reason);
 const shipment=sent.shipment,last=shipment.legs.length-1;shipment.leg=last;shipment.remaining=1;
 const site=s.regions.find(r=>r.id===shipment.destination);site.unrest=1;site.fort=0;
 for(const army of s.armies.filter(a=>a.region===site.id))army.men=0;
 s.month++;
 const seed=Array.from({length:10000},(_,i)=>i+1).find(value=>{
  const valueAtRisk=roll({...s,seed:value},`market-bandit:${shipment.id}:${site.id}`);
  return valueAtRisk>=.07&&valueAtRisk<.08;
 });
 assert.ok(seed,'find a seed at the house protection threshold');s.seed=seed;
 const defected=loadHanSave(serialize(s));defected.persons[id].faction='parthia';
 advanceEasternMarkets(s);advanceEasternMarkets(defected);
 assert.equal(shipment.status,'delivered');
 assert.equal(defected.tradeMarkets.shipments.find(x=>x.id===shipment.id).status,'lost');
 assert.equal(defected.tradeMarkets.marketHouseRent,0);
});
