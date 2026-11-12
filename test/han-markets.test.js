import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=han-1';
import {declareWar,propose,setRelation} from '../han/frontier.js?v=han-1';
import {advanceEasternMarkets,placeEasternTrade,quoteEasternTrade} from '../han/markets.js?v=faces-of-empire-1';

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
  assert.equal(quantity(good)+consumed+discarded,initial[good]+production,`${good} was created or lost`);
 }
 assert.equal(cash(),initialCash,'market payments must balance');
 assert.ok(s.tradeMarkets.transactions.length>0);
 assert.ok(s.tradeMarkets.shipments.every(x=>!['traveling','blocked'].includes(x.status)||x.escrow>0));
});
