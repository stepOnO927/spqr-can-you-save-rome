import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=han-1';
import {declareWar,propose,setRelation} from '../han/frontier.js?v=han-1';
import {advanceEasternMarkets,placeEasternTrade,quoteEasternTrade,easternMarketOffers,setEasternTariffPolicy} from '../han/markets.js?v=faces-of-empire-1';
import {advanceSilk} from '../han/silk-road.js?v=han-1';
import {roll} from '../han/util.js?v=han-1';

const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceEasternMarkets(s)};

test('Eastern markets use measured stock and a real Kangju–Han horse route',()=>{
 const s=newHanGame('han',{seed:49});
 for(const faction of ['han','kangju','yuezhi','parthia'])assert.ok(s.regions.some(r=>r.owner===faction&&s.tradeMarkets.regions[r.id]));
 assert.equal(propose(s,'han','kangju','market').proposal.status,'accepted');
 const request={seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1};
 const quote=quoteEasternTrade(s,request),source=s.tradeMarkets.regions.kangju.goods.horses.stock,cash=s.factions.han.treasury;
 assert.equal(quote.ok,true);assert.ok(quote.months>=5);assert.ok(quote.path.length>=4);
 const result=placeEasternTrade(s,request);assert.equal(result.ok,true);
 assert.equal(s.tradeMarkets.regions.kangju.goods.horses.stock,source-1);
 assert.equal(s.factions.han.treasury,cash-quote.total);
 assert.ok(s.persons[result.shipment.merchantId]);
 const loaded=loadHanSave(serialize(s));assert.equal(loaded.tradeMarkets.shipments[0].merchantId,result.shipment.merchantId);
 for(let i=0;i<quote.months;i++)next(loaded);
 assert.equal(loaded.tradeMarkets.shipments[0].status,'delivered');
 assert.equal(loaded.tradeMarkets.transactions.filter(x=>x.shipment===result.shipment.id).length,1);
 assert.equal(loaded.tradeMarkets.transportSpent+loaded.tradeMarkets.merchantFees,loaded.tradeMarkets.transactions.reduce((sum,x)=>sum+x.transport,0));
});

test('a transit state can set customs duties without repricing a caravan already underway',()=>{
 let s=newHanGame('yuezhi',{seed:21});s.tradeMarkets.embeddedRoman=true;
 for(const r of s.regions){r.fort=2;r.unrest=0}
 s.treaties.push({type:'market',parties:['han','parthia']});s.factions.parthia.treasury=2000;
 s.tradeMarkets.regions.changan.goods.silk.stock=60;
 const request={seller:'han',buyer:'parthia',origin:'changan',destination:'parthia',commodity:'silk',quantity:10};
 const standard=quoteEasternTrade(s,request);assert.equal(standard.ok,true,standard.reason);
 assert.ok(standard.tariffs.some(t=>t.owner==='yuezhi'),'the caravan must actually cross Yuezhi territory');
 assert.equal(setEasternTariffPolicy(s,'han','high').ok,false,'a player cannot change a foreign policy');
 assert.equal(setEasternTariffPolicy(s,'yuezhi','extreme').ok,false);
 assert.equal(setEasternTariffPolicy(s,'yuezhi','high').ok,true);
 const high=quoteEasternTrade(s,request);assert.equal(high.ok,true);assert.ok(high.total>standard.total);
 const duty=high.tariffs.find(t=>t.owner==='yuezhi').amount,cash=s.factions.yuezhi.treasury;
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true,placed.reason);
 assert.equal(placed.shipment.tariffs.find(t=>t.owner==='yuezhi').amount,duty);
 assert.equal(setEasternTariffPolicy(s,'yuezhi','low').ok,true);
 const low=quoteEasternTrade(s,request);assert.ok(low.total<high.total);
 s=loadHanSave(serialize(s));assert.equal(s.tradeMarkets.tariffs.yuezhi,.02);
 const shipment=s.tradeMarkets.shipments.find(x=>x.id===placed.shipment.id);
 assert.equal(shipment.tariffs.find(t=>t.owner==='yuezhi').amount,duty);
 for(let i=0;i<high.months;i++)next(s);
 assert.equal(shipment.status,'delivered');
 assert.equal(s.factions.yuezhi.treasury,cash+duty,'the actual transit government receives the locked duty exactly once');
 assert.equal(s.tradeMarkets.transactions.filter(t=>t.shipment===shipment.id).length,1);
 s.tradeMarkets.tariffs.yuezhi=.2;
 s=loadHanSave(serialize(s));assert.equal(s.tradeMarkets.tariffs.yuezhi,.2,'an older custom rate remains compatible');
 s.tradeMarkets.tariffs.yuezhi=NaN;
 s=loadHanSave(serialize(s));assert.equal(s.tradeMarkets.tariffs.yuezhi,.05,'an invalid saved rate cannot poison future quotes');
});

test('an oasis intermediary resells delivered Han silk as a second paid shipment',()=>{
 let s=newHanGame('han',{seed:15});s.tradeMarkets.embeddedRoman=true;
 for(const r of s.regions){r.fort=2;r.unrest=0}
 s.treaties.push({type:'market',parties:['han','shanshan']},{type:'market',parties:['shanshan','qiemo']});
 s.factions.shanshan.treasury=1000;s.factions.qiemo.treasury=1000;
 const source=s.tradeMarkets.regions.changan.goods.silk,middle=s.tradeMarkets.regions.shanshan.goods.silk,destination=s.tradeMarkets.regions.qiemo.goods.silk;
 source.stock=20;source.production=0;source.consumption=0;middle.production=0;middle.consumption=0;middle.stock=2;destination.production=0;destination.consumption=0;
 assert.equal(easternMarketOffers(s).some(o=>o.origin==='shanshan'&&o.commodity==='silk'),false);
 const first=placeEasternTrade(s,{seller:'han',buyer:'shanshan',origin:'changan',destination:'shanshan',commodity:'silk',quantity:4});
 assert.equal(first.ok,true,first.reason);
 for(let i=0;i<first.quote.months;i++)next(s);
 assert.equal(first.shipment.status,'delivered');
 const offer=easternMarketOffers(s).find(o=>o.origin==='shanshan'&&o.commodity==='silk');
 assert.ok(offer?.resale);assert.ok(offer.available>=4);
 const middleBefore=middle.stock,destBefore=destination.stock,cashBefore=s.factions.shanshan.treasury;
 const second=placeEasternTrade(s,{seller:'shanshan',buyer:'qiemo',origin:'shanshan',destination:'qiemo',commodity:'silk',quantity:2});
 assert.equal(second.ok,true,second.reason);assert.equal(middle.stock,middleBefore-2);
 s=loadHanSave(serialize(s));for(let i=0;i<second.quote.months;i++)next(s);
 assert.equal(s.tradeMarkets.shipments.find(x=>x.id===second.shipment.id).status,'delivered');
 assert.equal(s.tradeMarkets.regions.qiemo.goods.silk.stock,destBefore+2);
 assert.equal(s.factions.shanshan.treasury,cashBefore+second.quote.price);
 assert.equal(s.tradeMarkets.transactions.filter(x=>x.commodity==='silk').length,2);
});

test('Han, Kangju, Yuezhi and Parthia can negotiate and trade without player orders',()=>{
 const s=newHanGame(null,{seed:82});s.month=3;
 const powers=['han','kangju','yuezhi','parthia'];
 for(const a of powers)for(const b of powers)if(a!==b)setRelation(s,a,b,65);
 for(const market of Object.values(s.tradeMarkets.regions))for(const item of Object.values(market.goods)){item.stock=0;item.production=0;item.consumption=0}
 for(const [id,good] of [['kangju','horses'],['qi','silk'],['hyrcania','timber'],['changan','grain']]){
  const item=s.tradeMarkets.regions[id].goods[good];item.stock=80;item.production=3;
 }
 for(const id of powers)s.factions[id].treasury=250;
 advanceEasternMarkets(s);
 const buyers=new Set(s.tradeMarkets.shipments.map(x=>x.buyer));
 for(const id of powers)assert.ok(buyers.has(id),`${id} placed no autonomous order`);
 for(const id of powers)assert.ok(s.treaties.some(x=>x.type==='market'&&x.parties.includes(id)),`${id} has no market agreement`);
 assert.ok(s.tradeMarkets.diplomacy.attempts.some(x=>x.status==='accepted'));
 assert.ok(s.tradeMarkets.shipments.every(x=>s.persons[x.merchantId]?.profession==='merchant'));
});

test('a closed route settles its escrow and goods after twelve months',()=>{
 const s=newHanGame('han',{seed:77});assert.equal(propose(s,'han','kangju','market').proposal.status,'accepted');
 const request={seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1};
 const startingCash=s.factions.han.treasury,startingStock=s.tradeMarkets.regions.kangju.goods.horses.stock;
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true);
 const source=s.tradeMarkets.regions.kangju.goods.horses;source.production=0;source.consumption=0;
 declareWar(s,'han','kangju');for(let i=0;i<13;i++)next(s);
 assert.equal(placed.shipment.status,'stranded');assert.equal(placed.shipment.escrow,0);
 assert.equal(source.stock,startingStock);
 assert.equal(s.factions.han.treasury,startingCash-placed.shipment.transport);
 assert.equal(s.tradeMarkets.transactions.filter(x=>x.shipment===placed.shipment.id).length,1);
 const receipt=s.tradeMarkets.transactions.find(x=>x.shipment===placed.shipment.id);
 assert.equal(receipt.destination,'kangju');assert.equal(receipt.refund,placed.shipment.price+placed.shipment.tariffs.reduce((sum,t)=>sum+t.amount,0));
 assert.deepEqual(loadHanSave(serialize(s)).tradeMarkets.transactions.find(x=>x.shipment===placed.shipment.id),receipt);
 assert.equal(s.tradeMarkets.transportSpent+s.tradeMarkets.merchantFees,s.tradeMarkets.transactions.reduce((sum,x)=>sum+x.transport,0));
});

test('120 autonomous market months conserve goods and money through save reload',()=>{
 let s=newHanGame(null,{seed:93});const powers=['han','kangju','yuezhi','parthia'];
 for(const a of powers)for(const b of powers)if(a!==b)setRelation(s,a,b,55);
 const goods=Object.keys(s.tradeMarkets.regions.changan.goods);
 const quantity=good=>Object.values(s.tradeMarkets.regions).reduce((n,m)=>n+m.goods[good].stock,0)+s.tradeMarkets.shipments.filter(x=>['traveling','blocked'].includes(x.status)&&x.commodity===good).reduce((n,x)=>n+x.quantity,0);
 const initial=Object.fromEntries(goods.map(good=>[good,quantity(good)]));
 const cash=()=>Object.values(s.factions).reduce((n,f)=>n+f.treasury,0)+Object.values(s.tradeMarkets.merchants).flat().reduce((n,id)=>n+(s.persons[id]?.wealth||0),0)+s.tradeMarkets.shipments.reduce((n,x)=>n+(x.escrow||0),0)+s.tradeMarkets.transportSpent+Object.values(s.tradeMarkets.transitTreasury).reduce((n,x)=>n+x,0);
 const initialCash=cash();
 for(let i=0;i<120;i++){next(s);if(i===59)s=loadHanSave(serialize(s))}
 for(const good of goods){
  const items=Object.values(s.tradeMarkets.regions).map(m=>m.goods[good]);
  const production=items.reduce((n,x)=>n+x.production*120,0);
  const consumed=items.reduce((n,x)=>n+x.consumed,0);
  const discarded=items.reduce((n,x)=>n+x.surplusDiscarded,0);
  assert.equal(quantity(good)+consumed+discarded+(s.tradeMarkets.lostGoods[good]||0),initial[good]+production,`${good} was created or lost`);
 }
 assert.equal(cash(),initialCash,'market payments must balance');
 assert.ok(s.tradeMarkets.transactions.length>0);
 assert.ok(s.tradeMarkets.shipments.every(x=>!['traveling','blocked'].includes(x.status)||x.escrow>0));
});

test('the far-west caravan reserves real silk and a finite buyer budget',()=>{
 let s=newHanGame('han',{seed:38});s.month=2;s.tradeMarkets.embeddedRoman=true;
 const request={seller:'han',buyer:'external',origin:'changan',destination:'mediterranean_gate',commodity:'silk',quantity:1};
 const quote=quoteEasternTrade(s,request);assert.equal(quote.ok,true);
 s.tradeMarkets.externalTreasury=quote.total;
 const source=s.tradeMarkets.regions.changan.goods.silk,destination=s.tradeMarkets.regions.mediterranean_gate.goods.silk;
 const initialStock=source.stock,initialDestination=destination.stock,initialHan=s.factions.han.treasury;
 const cash=()=>Object.values(s.factions).reduce((sum,f)=>sum+f.treasury,0)+s.tradeMarkets.externalTreasury+s.tradeMarkets.shipments.reduce((sum,x)=>sum+x.escrow,0)+Object.values(s.tradeMarkets.merchants).flat().reduce((sum,id)=>sum+(s.persons[id]?.wealth||0),0)+s.tradeMarkets.transportSpent;
 const initialCash=cash();advanceSilk(s);
 const caravan=s.silk.caravans.find(c=>c.shipmentId),shipment=s.tradeMarkets.shipments.find(x=>x.id===caravan?.shipmentId);
 assert.ok(caravan);assert.ok(s.persons[caravan.merchantId]);assert.equal(source.stock,initialStock-1);
 assert.equal(s.tradeMarkets.externalTreasury,0);assert.equal(s.factions.han.treasury,initialHan);assert.equal(cash(),initialCash);
 source.production=0;source.consumption=0;
 s=loadHanSave(serialize(s));
 for(let i=0;i<quote.months+2;i++){next(s);advanceSilk(s)}
 const delivered=s.tradeMarkets.shipments.find(x=>x.id===shipment.id),arrival=s.silk.caravans.find(x=>x.shipmentId===shipment.id);
 assert.equal(delivered.status,'delivered');assert.equal(arrival.status,'arrived');
 assert.equal(s.tradeMarkets.regions.mediterranean_gate.goods.silk.stock,initialDestination+1);
 assert.equal(s.factions.han.treasury,initialHan+quote.price);
 assert.equal(s.silk.farWestDeliveries,1);assert.equal(s.silk.income.han,quote.price);
 assert.equal(cash(),initialCash);
 assert.equal(s.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id).length,1);
});

test('bandit risk consumes real cargo while route security can protect it',()=>{
 const s=newHanGame('han',{seed:1});s.tradeMarkets.embeddedRoman=true;
 const request={seller:'han',buyer:'external',origin:'changan',destination:'mediterranean_gate',commodity:'silk',quantity:1};
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true);
 const shipment=placed.shipment,nextRegion=s.regions.find(r=>r.id===shipment.legs[0].to);
 nextRegion.unrest=1;nextRegion.fort=0;for(const army of s.armies.filter(a=>a.region===nextRegion.id))army.men=0;
 s.month++;shipment.remaining=1;
 let selected=null;for(let seed=1;seed<10000;seed++){s.seed=seed;if(roll(s,`market-bandit:${shipment.id}:${nextRegion.id}`)<.08){selected=seed;break}}
 assert.ok(selected);
 const protectedState=loadHanSave(serialize(s));protectedState.silk.security=10;
 advanceEasternMarkets(protectedState);assert.equal(protectedState.tradeMarkets.shipments[0].status,'traveling');
 const externalBefore=s.tradeMarkets.externalTreasury,hanBefore=s.factions.han.treasury;
 advanceEasternMarkets(s);
 assert.equal(shipment.status,'lost');assert.equal(shipment.escrow,0);
 assert.equal(s.tradeMarkets.lostGoods.silk,1);assert.equal(s.tradeMarkets.externalTreasury,externalBefore+shipment.price+shipment.tariffs.reduce((n,t)=>n+t.amount,0));
 assert.equal(s.factions.han.treasury,hanBefore);
 assert.equal(s.tradeMarkets.transportSpent+s.tradeMarkets.merchantFees,shipment.transport);
 const receipt=s.tradeMarkets.transactions.find(x=>x.shipment===shipment.id);
 assert.equal(receipt.status,'lost');assert.equal(receipt.destination,nextRegion.id);
 assert.equal(receipt.refund,shipment.price+shipment.tariffs.reduce((sum,t)=>sum+t.amount,0));
});

test('a legacy caravan without prepaid goods carries reports without minting money or horses',()=>{
 const s=newHanGame('han',{seed:6});s.month=1;
 s.silk.caravans.push({id:777,path:['changan','kangju'],pos:1,wait:0,goods:['silk','lacquer','iron'],value:27,start:s.year*12+s.month,tolls:0,status:'travelling'});
 const treasury=s.factions.han.treasury,horses=s.factions.han.horses,deliveries=s.silk.farWestDeliveries||0;
 advanceSilk(s);
 assert.equal(s.silk.caravans.find(c=>c.id===777).status,'arrived');
 assert.equal(s.factions.han.treasury,treasury);assert.equal(s.factions.han.horses,horses);
 assert.equal(s.silk.farWestDeliveries||0,deliveries);
 s.silk.caravans.push({id:778,path:['changan','mediterranean_gate'],pos:1,wait:0,goods:['silk'],value:18,start:s.year*12+s.month,tolls:0,status:'travelling'});
 advanceSilk(s);assert.equal(s.silk.caravans.find(c=>c.id===778).status,'arrived');
 assert.equal(s.silk.farWestDeliveries||0,deliveries);
 assert.equal(s.factions.han.treasury,treasury);
});

test('autonomous Han buyers seek another horse supplier after a wartime blockade',()=>{
 const s=newHanGame(null,{seed:48});s.month=3;
 for(const market of Object.values(s.tradeMarkets.regions))for(const item of Object.values(market.goods)){item.stock=0;item.production=0;item.consumption=0}
 for(const id of ['kangju','wusun']){const item=s.tradeMarkets.regions[id].goods.horses;item.stock=60;item.production=3;setRelation(s,'han',id,65)}
 for(const f of Object.values(s.factions))f.treasury=0;s.factions.han.treasury=600;
 advanceEasternMarkets(s);
 const first=s.tradeMarkets.shipments.find(x=>x.buyer==='han'&&x.commodity==='horses');
 assert.ok(first,'Han should initiate a horse import');
 assert.ok(['kangju','wusun'].includes(first.seller));
 const alternative=first.seller==='kangju'?'wusun':'kangju';
 assert.equal(declareWar(s,'han',first.seller).ok,true);
 for(let i=0;i<18;i++)next(s);
 assert.ok(s.tradeMarkets.shipments.some(x=>x.buyer==='han'&&x.seller===alternative&&x.commodity==='horses'),'Han did not seek the other supplier');
 assert.ok(['blocked','stranded'].includes(first.status));
});

test('local eastern prices react to actual scarcity and surplus',()=>{
 const s=newHanGame('han',{seed:12}),horses=s.tradeMarkets.regions.dunhuang.goods.horses;
 horses.stock=0;horses.production=0;horses.consumption=0;advanceEasternMarkets(s);
 const scarce=horses.price;horses.stock=80;next(s);
 assert.ok(scarce>horses.price,`scarce ${scarce}, surplus ${horses.price}`);
});
