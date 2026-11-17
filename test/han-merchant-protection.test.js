import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=audience-silence-1';
import {advanceEasternMarkets,answerEasternMerchantProtection,MERCHANT_PROTECTION_COST,placeEasternTrade} from '../han/markets.js?v=audience-silence-1';
import {roll} from '../han/util.js?v=audience-silence-1';

function raid(s,request){
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true,placed.reason);
 const shipment=placed.shipment,site=s.regions.find(r=>r.id===shipment.legs[0].to);
 site.unrest=1;site.fort=0;for(const army of s.armies.filter(a=>a.region===site.id))army.men=0;
 shipment.remaining=1;s.month++;
 const seed=Array.from({length:10000},(_,i)=>i+1).find(value=>roll({...s,seed:value},`market-bandit:${shipment.id}:${site.id}`)<.08);
 assert.ok(seed);s.seed=seed;advanceEasternMarkets(s);assert.equal(shipment.status,'lost');
 return shipment;
}

test('a raided merchant petitions the player; one paid escort changes the next real caravan risk and survives a save',()=>{
 let s=newHanGame('han',{seed:49});s.tradeMarkets.embeddedRoman=true;
 const request={seller:'han',buyer:'han',origin:'hongnong',destination:'changan',commodity:'provisions',quantity:1};
 const lost=raid(s,request),petition=s.tradeMarkets.merchantProtectionRequests[0];
 assert.equal(petition.shipmentId,lost.id);assert.equal(petition.faction,'han');assert.equal(petition.status,'pending');
 assert.equal(answerEasternMerchantProtection(s,petition.id,'other').reason,'invalid');
 const poor=loadHanSave(serialize(s));poor.factions.han.treasury=MERCHANT_PROTECTION_COST-1;
 assert.equal(answerEasternMerchantProtection(poor,petition.id,'fund').reason,'treasury');
 assert.equal(poor.tradeMarkets.merchantProtectionRequests[0].status,'pending');
 const defected=loadHanSave(serialize(s));defected.persons[lost.merchantId].faction='shanshan';
 assert.equal(answerEasternMerchantProtection(defected,petition.id,'fund').reason,'invalid');
 assert.equal(defected.tradeMarkets.courtEscortSpent,0,'a changed allegiance cannot use another court’s pledge');
 const expired=loadHanSave(serialize(s));expired.year++;advanceEasternMarkets(expired);
 assert.equal(expired.tradeMarkets.merchantProtectionRequests[0].status,'expired');
 const declined=loadHanSave(serialize(s)),cash=declined.factions.han.treasury;
 assert.equal(answerEasternMerchantProtection(declined,petition.id,'decline').ok,true);
 assert.equal(declined.factions.han.treasury,cash);assert.equal(answerEasternMerchantProtection(declined,petition.id,'fund').reason,'invalid');
 const treasury=s.factions.han.treasury;
 assert.equal(answerEasternMerchantProtection(s,petition.id,'fund').ok,true);
 assert.equal(s.factions.han.treasury,treasury-MERCHANT_PROTECTION_COST);
 assert.equal(s.tradeMarkets.courtEscortSpent,MERCHANT_PROTECTION_COST);
 assert.equal(s.persons[lost.merchantId].courtEscort.origin,request.origin);
 s=loadHanSave(serialize(s));assert.equal(s.tradeMarkets.merchantProtectionRequests[0].status,'funded');
 for(let i=0;i<5&&s.persons[lost.merchantId].location!==request.origin;i++){s.month++;advanceEasternMarkets(s)}
 assert.equal(s.persons[lost.merchantId].location,request.origin);
 const next=placeEasternTrade(s,request);assert.equal(next.ok,true,next.reason);
 assert.equal(next.shipment.merchantId,lost.merchantId);assert.equal(next.shipment.courtEscort,true);
 assert.equal(s.persons[lost.merchantId].courtEscort,undefined,'one sponsorship covers one dispatched trip');
 const site=s.regions.find(r=>r.id===next.shipment.legs[0].to),base=.08-(s.silk?.security||0)*.01-Math.min(2,next.shipment.merchantExperience||0)*.01-(next.shipment.merchantEscortCost||0)*.01;
 site.unrest=1;site.fort=0;for(const army of s.armies.filter(a=>a.region===site.id))army.men=0;
 const seed=Array.from({length:10000},(_,i)=>i+1).find(value=>{const v=roll({...s,month:s.month+1,seed:value},`market-bandit:${next.shipment.id}:${site.id}`);return v>=base-.03&&v<base});
 assert.ok(seed);s.seed=seed;next.shipment.remaining=1;
 const without=loadHanSave(serialize(s));without.tradeMarkets.shipments.find(x=>x.id===next.shipment.id).courtEscort=false;
 s.month++;without.month++;advanceEasternMarkets(s);advanceEasternMarkets(without);
 assert.notEqual(s.tradeMarkets.shipments.find(x=>x.id===next.shipment.id).status,'lost');
 assert.equal(without.tradeMarkets.shipments.find(x=>x.id===next.shipment.id).status,'lost');
});

test('an AI court funds a valuable raided route only while keeping its treasury reserve',()=>{
 const make=()=>{const s=newHanGame('yuezhi',{seed:21});s.tradeMarkets.embeddedRoman=true;s.treaties.push({type:'market',parties:['han','parthia']});s.factions.parthia.treasury=2000;s.tradeMarkets.regions.changan.goods.silk.stock=60;return s};
 const request={seller:'han',buyer:'parthia',origin:'changan',destination:'parthia',commodity:'silk',quantity:1};
 const rich=make(),lost=raid(rich,request),petition=rich.tradeMarkets.merchantProtectionRequests[0];
 assert.equal(petition.faction,'parthia');assert.equal(petition.status,'funded');
 assert.equal(rich.tradeMarkets.courtEscortSpent,MERCHANT_PROTECTION_COST);
 assert.equal(rich.persons[lost.merchantId].courtEscort.destination,request.destination);
 assert.equal(answerEasternMerchantProtection(rich,petition.id,'decline').reason,'invalid','the player cannot answer another court’s petition');
 const poor=make(),placed=placeEasternTrade(poor,request);assert.equal(placed.ok,true);poor.factions.parthia.treasury=0;
 const shipment=placed.shipment,site=poor.regions.find(r=>r.id===shipment.legs[0].to);site.unrest=1;site.fort=0;for(const army of poor.armies.filter(a=>a.region===site.id))army.men=0;
 shipment.remaining=1;poor.month++;const seed=Array.from({length:10000},(_,i)=>i+1).find(value=>roll({...poor,seed:value},`market-bandit:${shipment.id}:${site.id}`)<.08);assert.ok(seed);poor.seed=seed;
 advanceEasternMarkets(poor);assert.equal(shipment.status,'lost');assert.equal(poor.tradeMarkets.merchantProtectionRequests[0].status,'declined');assert.equal(poor.tradeMarkets.courtEscortSpent,0);
});

test('a merchant who changes allegiance neither returns for the old court nor carries its next caravan',()=>{
 let s=newHanGame('han',{seed:91});s.tradeMarkets.embeddedRoman=true;
 const request={seller:'han',buyer:'han',origin:'hongnong',destination:'changan',commodity:'provisions',quantity:1};
 const first=placeEasternTrade(s,request);assert.equal(first.ok,true,first.reason);
 const id=first.shipment.merchantId,site=s.regions.find(r=>r.id===first.shipment.legs[0].to);
 site.unrest=0;site.fort=5;for(const army of s.armies.filter(a=>a.region===site.id))army.men=0;
 first.shipment.remaining=1;s.month++;
 s.seed=Array.from({length:10000},(_,i)=>i+1).find(value=>roll({...s,seed:value},`market-bandit:${first.shipment.id}:${site.id}`)>.9);
 advanceEasternMarkets(s);assert.equal(first.shipment.status,'delivered');
 assert.ok(s.persons[id].marketReturn);assert.equal(s.persons[id].location,request.destination);
 s.persons[id].faction='shanshan';s=loadHanSave(serialize(s));
 s.month++;advanceEasternMarkets(s);
 assert.equal(s.persons[id].location,request.destination,'the former court cannot move a defector home');
 assert.equal(s.persons[id].marketReturn,undefined);
 s.persons[id].location=request.origin;
 const next=placeEasternTrade(s,request);assert.equal(next.ok,true,next.reason);
 assert.notEqual(next.shipment.merchantId,id,'a stale roster entry cannot assign a defector');
 assert.equal(s.persons[next.shipment.merchantId].faction,'han');
});
