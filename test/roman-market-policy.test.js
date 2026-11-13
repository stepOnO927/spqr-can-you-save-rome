import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceMarketAI,advanceMarkets,placeTradeOrder,postTradeSale,quoteTrade,setTradeExportRestriction,setTradeTariffPolicy} from '../trade-markets.js?v=faces-empire-2';

const treaty=(s,a,b)=>{s.relations[[a,b].sort().join(':')]=80;assert.equal(proposeAgreement(s,a,b,'trade').ok,true)};
const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceMarkets(s)};

test('Roman export restrictions block new foreign orders but preserve dispatched contracts',()=>{
 let s=newGame('armenia');treaty(s,'armenia','parthia');
 const stock=s.markets.regions.armenia.goods.iron;stock.stock=10;stock.production=0;stock.consumption=0;
 s.factions.parthia.treasury=1000;
 const sale=postTradeSale(s,{origin:'armenia',commodity:'iron',quantity:5,unitPrice:2}).order;
 const request={seller:'armenia',buyer:'parthia',origin:'armenia',destination:'parthia',commodity:'iron',quantity:2,saleOrderId:sale.id};
 const quoted=quoteTrade(s,request);assert.equal(quoted.ok,true);
 const placed=placeTradeOrder(s,{...request,maxTotal:quoted.total});assert.equal(placed.ok,true);
 assert.equal(setTradeExportRestriction(s,'parthia','iron',true).ok,false);
 assert.equal(setTradeExportRestriction(s,'armenia','iron',true).ok,true);
 assert.equal(quoteTrade(s,{...request,quantity:1}).reason,'export_restricted');
 s.month=3;assert.ok(!advanceMarketAI(s).some(x=>x.seller==='armenia'&&x.commodity==='iron'));
 s=upgradeSave(structuredClone(s));assert.deepEqual(s.markets.exportRestrictions.armenia,['iron']);
 for(let i=0;i<quoted.months;i++)next(s);
 assert.equal(s.markets.shipments[0].status,'delivered');assert.equal(s.markets.regions.parthia.goods.iron.stock>=2,true);
 assert.equal(setTradeExportRestriction(s,'armenia','iron',false).ok,true);
 assert.equal(quoteTrade(s,{...request,quantity:1}).ok,true);
});

test('Roman transit customs use the saved rate at dispatch and pay the actual transit court',()=>{
 let s=newGame('armenia');
 for(const [a,b] of [['galatia','parthia'],['galatia','armenia'],['armenia','parthia']])treaty(s,a,b);
 s.markets.regions.galatia.goods.iron.stock=20;s.factions.parthia.treasury=1000;
 const request={seller:'galatia',buyer:'parthia',origin:'galatia',destination:'parthia',commodity:'iron',quantity:10};
 assert.equal(setTradeTariffPolicy(s,'parthia','high').ok,false);
 assert.equal(setTradeTariffPolicy(s,'armenia','low').rate,.02);
 const low=quoteTrade(s,request);assert.equal(low.ok,true);assert.ok(low.route.includes('armenia'));
 assert.deepEqual(low.tariffs,[{owner:'armenia',amount:Math.ceil(low.price*.02)}]);
 const cash=s.factions.armenia.treasury;
 const shipment=placeTradeOrder(s,{...request,maxTotal:low.total}).shipment;
 assert.equal(setTradeTariffPolicy(s,'armenia','high').rate,.15);
 const high=quoteTrade(s,request);assert.equal(high.ok,true);
 assert.deepEqual(high.tariffs,[{owner:'armenia',amount:Math.ceil(high.price*.15)}]);
 assert.deepEqual(shipment.tariffs,low.tariffs);
 s=upgradeSave(structuredClone(s));assert.equal(s.markets.tariffs.armenia,.15);
 for(let i=0;i<low.months;i++)next(s);
 assert.equal(s.markets.shipments[0].status,'delivered');
 assert.equal(s.factions.armenia.treasury,cash+low.tariffs[0].amount);
 const legacy=newGame('armenia');delete legacy.markets.exportRestrictions;
 assert.deepEqual(upgradeSave(legacy).markets.exportRestrictions,{});
});
