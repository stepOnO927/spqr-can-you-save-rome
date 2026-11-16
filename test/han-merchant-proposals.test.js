import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=guardian-age-1';
import {advanceEasternMarkets,answerEasternMerchantProposal,placeEasternTrade,quoteEasternTrade} from '../han/markets.js?v=guardian-age-1';
import {createMarketMerchant} from '../han/field-identities.js';
import {setRelation} from '../han/frontier.js?v=guardian-age-1';

const request={seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1};
function deliveredRoute(){
 const s=newHanGame('han',{seed:229});s.tradeMarkets.embeddedRoman=true;
 s.treaties.push({type:'market',parties:['han','kangju']});setRelation(s,'han','kangju',70);
 const id=createMarketMerchant(s,'han','kangju'),merchant=s.persons[id];
 s.tradeMarkets.merchants.han=[id];merchant.marketReputation=1;
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true,placed.reason);
 const shipment=placed.shipment;assert.equal(shipment.merchantId,id);
 shipment.leg=shipment.legs.length-1;shipment.remaining=1;
 const dest=s.regions.find(r=>r.id==='dunhuang');dest.fort=5;dest.unrest=0;
 s.month++;advanceEasternMarkets(s);
 assert.equal(shipment.status,'delivered');
 const proposal=s.tradeMarkets.merchantProposals.find(x=>x.merchantId===id);
 assert.ok(proposal,'a real delivered route creates the merchant proposal');
 return {s,id,proposal};
}

test('a successful carrier offers a saved, paid supply contract using actual inventory and access',()=>{
 let {s,id,proposal}=deliveredRoute();
 assert.equal(proposal.sourceShipment,s.tradeMarkets.shipments[0].id);
 assert.equal(proposal.status,'pending');assert.equal(proposal.interval,6);assert.equal(proposal.duration,12);
 s=loadHanSave(serialize(s));proposal=s.tradeMarkets.merchantProposals[0];
 const original=s.factions.han.treasury,merchantWealth=s.persons[id].wealth;
 const quote=quoteEasternTrade(s,proposal);assert.equal(quote.ok,true,quote.reason);
 const accepted=answerEasternMerchantProposal(s,proposal.id,'accept');assert.equal(accepted.ok,true,accepted.reason);
 assert.equal(accepted.proposal.status,'accepted');
 const contract=s.tradeMarkets.supplyContracts.find(x=>x.id===proposal.contractId);
 assert.equal(contract.status,'active');assert.equal(contract.brokerId,id);
 assert.equal(contract.shipments.length,1);
 assert.equal(s.factions.han.treasury,original-quote.total-contract.negotiationCost);
 assert.equal(s.persons[id].wealth,merchantWealth+contract.negotiationCost);
 assert.equal(s.tradeMarkets.merchantProposalFees,contract.negotiationCost);
 assert.equal(s.tradeMarkets.regions.kangju.goods.horses.stock>=0,true);
 assert.equal(answerEasternMerchantProposal(s,proposal.id,'accept').ok,false,'no double acceptance');
 s=loadHanSave(serialize(s));assert.equal(s.tradeMarkets.supplyContracts[0].brokerId,id);
 assert.equal(s.tradeMarkets.merchantProposals[0].contractId,contract.id);
});

test('a proposal may be declined or remain pending when the court cannot pay',()=>{
 const {s,proposal}=deliveredRoute(),declined=loadHanSave(serialize(s));
 const treasury=declined.factions.han.treasury;
 assert.equal(answerEasternMerchantProposal(declined,proposal.id,'decline').ok,true);
 assert.equal(declined.factions.han.treasury,treasury);
 assert.equal(declined.tradeMarkets.supplyContracts.length,0);
 assert.equal(answerEasternMerchantProposal(declined,proposal.id,'accept').ok,false);
 s.factions.han.treasury=0;
 const poor=answerEasternMerchantProposal(s,proposal.id,'accept');assert.equal(poor.ok,false);
 assert.equal(s.tradeMarkets.merchantProposals[0].status,'pending');
 assert.equal(s.tradeMarkets.merchantProposalFees,0);
});

test('death, changed allegiance, access loss, and time expire proposals without a phantom contract',()=>{
 const {s,id,proposal}=deliveredRoute();
 for(const change of [
  state=>{state.persons[id].alive=false},
  state=>{state.persons[id].faction='kangju'},
  state=>{state.regions.find(r=>r.id==='dunhuang').owner='kangju'},
  state=>{state.year++}
 ]){
  const changed=loadHanSave(serialize(s));change(changed);changed.month++;
  advanceEasternMarkets(changed);
  assert.equal(changed.tradeMarkets.merchantProposals.find(x=>x.id===proposal.id).status,'expired');
  assert.equal(answerEasternMerchantProposal(changed,proposal.id,'accept').ok,false);
  assert.equal(changed.tradeMarkets.supplyContracts.length,0);
 }
 const legacy=loadHanSave(serialize(s));delete legacy.tradeMarkets.merchantProposals;delete legacy.tradeMarkets.nextMerchantProposal;delete legacy.tradeMarkets.merchantProposalFees;
 const restored=loadHanSave(serialize(legacy));
 assert.deepEqual(restored.tradeMarkets.merchantProposals,[]);
 assert.equal(restored.tradeMarkets.nextMerchantProposal,1);
 assert.equal(restored.tradeMarkets.merchantProposalFees,0);
});
