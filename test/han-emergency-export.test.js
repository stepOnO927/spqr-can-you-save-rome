import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=marriage-economy-merge-1';
import {advanceEasternMarkets,easternMarketOffers,placeEasternTrade,proposeEasternSupplyContract,quoteEasternTrade,setEasternExportRestriction} from '../han/markets.js?v=faces-wheels-1';
import {relation,setRelation} from '../han/frontier.js?v=han-1';

const request={seller:'parthia',buyer:'han',origin:'parthia',destination:'changan',commodity:'grain',quantity:1};
function setup(){
 const s=newHanGame('han',{seed:117});s.tradeMarkets.embeddedRoman=true;
 s.treaties.push({type:'market',parties:['han','parthia']});setRelation(s,'han','parthia',70);
 s.factions.han.treasury=1000;
 const source=s.tradeMarkets.regions.parthia.goods.grain;source.stock=20;
 Object.assign(s.tradeMarkets.regions.ctesiphon.goods.grain,{stock:0,production:0,consumption:1});
 s.armies.find(a=>a.owner==='parthia').region='ctesiphon';
 for(const region of s.regions){region.fort=2;region.unrest=0}
 return s;
}
const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceEasternMarkets(s)};

test('a wartime AI court reserves grain for its own short depot without revoking a paid caravan',()=>{
 let s=setup();const quote=quoteEasternTrade(s,request);assert.equal(quote.ok,true,quote.reason);
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true,placed.reason);
 assert.equal(setEasternExportRestriction(s,'han','silk',true).ok,true);
 s.wars.push(['parthia','armenia']);next(s);
 assert.ok(s.tradeMarkets.emergencyExportRestrictions.parthia.includes('grain'));
 assert.equal(quoteEasternTrade(s,request).reason,'export_restricted');
 assert.equal(easternMarketOffers(s).some(o=>o.seller==='parthia'&&o.commodity==='grain'),false);
 assert.equal(quoteEasternTrade(s,{...request,buyer:'parthia',destination:'ctesiphon'}).ok,true,'domestic supply still moves');
 assert.deepEqual(s.tradeMarkets.exportRestrictions.han,['silk'],'the player’s manual policy is separate');
 s=loadHanSave(serialize(s));
 assert.ok(s.tradeMarkets.emergencyExportRestrictions.parthia.includes('grain'));
 for(let i=0;i<quote.months+3&&s.tradeMarkets.shipments[0].status==='traveling';i++)next(s);
 assert.equal(s.tradeMarkets.shipments[0].status,'delivered','already paid cargo is honored');
 s.wars=[];next(s);
 assert.equal(s.tradeMarkets.emergencyExportRestrictions.parthia,undefined);
 assert.equal(quoteEasternTrade(s,request).ok,true);
 assert.deepEqual(s.tradeMarkets.exportRestrictions.han,['silk']);
 delete s.tradeMarkets.emergencyExportRestrictions;
 const legacy=loadHanSave(serialize(s));
 assert.deepEqual(legacy.tradeMarkets.emergencyExportRestrictions,{},'older saves gain an empty AI policy ledger');
});

test('an emergency restriction causes real scheduled supply misses and treaty penalties',()=>{
 const s=setup(),contract=proposeEasternSupplyContract(s,{...request,interval:3,duration:12});
 assert.equal(contract.ok,true,contract.reason);
 const relationship=relation(s,'han','parthia');
 s.wars.push(['parthia','armenia']);
 for(let i=0;i<7;i++)next(s);
 assert.ok(s.tradeMarkets.emergencyExportRestrictions.parthia.includes('grain'));
 assert.equal(contract.contract.dispatched,1);
 assert.equal(contract.contract.missed,2);
 assert.equal(contract.contract.status,'breached');
 assert.equal(contract.contract.endedReason,'export_restricted');
 assert.ok(relation(s,'han','parthia')<relationship);
 assert.equal(s.tradeMarkets.shipments[0].status,'traveling','the first prepaid caravan continues');
});
