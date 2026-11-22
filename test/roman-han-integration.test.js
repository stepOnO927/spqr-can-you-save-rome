import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=marriage-economy-merge-1';
import {attachHanWorld,hanWorld} from '../han/world.js?v=marriage-economy-merge-1';

for(const seed of [49,73])test(`120 Roman turns advance the attached Han world and survive a midcampaign save (seed ${seed})`,()=>{
 let s=newGame('parthia');attachHanWorld(s,{seed});
 for(let month=0;month<120;month++){
  const before=s.year*12+s.month;
  tick(s);
  assert.equal(s.defeat,undefined,'the integrated campaign ended before 120 turns');
  assert.equal(s.year*12+s.month,before+1,'the Roman clock stalled');
  const h=hanWorld(s).state;
  assert.equal(h.year*12+h.month,s.year*12+s.month,'the attached Han clock drifted');
  for(const f of Object.values(h.factions))assert.ok(Number.isFinite(f.treasury)&&Math.abs(f.treasury)<1_000_000);
  for(const market of Object.values(h.tradeMarkets.regions))for(const item of Object.values(market.goods))assert.ok(Number.isSafeInteger(item.stock)&&item.stock>=0);
  if(month===59){
   const identities=Object.fromEntries(Object.entries(h.persons).map(([id,p])=>[id,{name:p.name,appearanceSeed:p.appearanceSeed,portrait:p.portrait}]));
   const shipmentCount=h.tradeMarkets.shipments.length;
   s=upgradeSave(structuredClone(s));
   for(const [id,identity] of Object.entries(identities)){
    const p=hanWorld(s).state.persons[id];
    assert.deepEqual({name:p?.name,appearanceSeed:p?.appearanceSeed,portrait:p?.portrait},identity,`person ${id} changed on load`);
   }
   assert.equal(hanWorld(s).state.tradeMarkets.shipments.length,shipmentCount);
  }
 }
 const h=hanWorld(s).state,markets=h.tradeMarkets;
 assert.ok(markets.shipments.some(x=>x.status==='delivered'),'no eastern shipment arrived');
 assert.equal(markets.transportSpent+markets.merchantFees+markets.marketHouseRent,markets.transactions.reduce((n,tx)=>n+(tx.transport||0),0));
 assert.ok(markets.shipments.every(x=>h.persons[x.merchantId]?.profession==='merchant'));
});
