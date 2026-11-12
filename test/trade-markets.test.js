import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,recruit,resolveBattle} from '../engine.js?v=faces-empire-2';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {COMMODITIES,initializeMarkets,quoteTrade,placeTradeOrder,advanceMarkets} from '../trade-markets.js?v=faces-empire-2';
import {previewPersonTravel} from '../personal-diplomacy.js?v=newborn-age-1';

const deal=()=>{
 const s=newGame('armenia');s.relations['armenia:parthia']=45;
 assert.equal(proposeAgreement(s,'armenia','parthia','trade').ok,true);
 return s;
};
const request={seller:'parthia',buyer:'armenia',origin:'parthia',destination:'armenia',commodity:'horses',quantity:2};

test('markets have measured units, local output and bounded shortage prices',()=>{
 const s=newGame('armenia'),parthia=s.markets.regions.parthia,egypt=s.markets.regions.egypt;
 assert.deepEqual(COMMODITIES.horses.unit,['100 head','百匹']);
 assert.ok(parthia.goods.horses.production>0);
 assert.ok(egypt.goods.papyrus.production>0);
 const normal=parthia.goods.horses.price;
 parthia.goods.horses.stock=0;s.month++;advanceMarkets(s);
 assert.ok(parthia.goods.horses.price>=normal);
 assert.ok(parthia.goods.horses.price<=COMMODITIES.horses.basePrice*3);
});

test('a horse order escrows goods and money, travels, then pays and delivers exactly once',()=>{
 const s=deal(),quote=quoteTrade(s,request),stock=s.markets.regions.parthia.goods.horses.stock,buyerMoney=s.factions.armenia.treasury,sellerMoney=s.factions.parthia.treasury;
 assert.equal(quote.ok,true);assert.ok(quote.months>=1);assert.deepEqual(quote.route,['parthia','armenia']);
 const result=placeTradeOrder(s,request);assert.equal(result.ok,true);
 assert.ok(s.world.characters[result.shipment.merchantId]);
 assert.equal(s.world.characters[result.shipment.merchantId].profession,'merchant');
 assert.equal(previewPersonTravel(s,result.shipment.merchantId,'parthia').reason,'unavailable');
 assert.equal(s.markets.regions.parthia.goods.horses.stock,stock-2);
 assert.equal(s.factions.armenia.treasury,buyerMoney-quote.total);
 assert.equal(s.factions.parthia.treasury,sellerMoney);
 let loaded=upgradeSave(structuredClone(s)),destination=loaded.markets.regions.armenia.goods.horses.stock;
 const local=loaded.markets.regions.armenia.goods.horses;
 for(let i=0;i<quote.months-1;i++){loaded.month++;advanceMarkets(loaded);assert.equal(loaded.markets.shipments[0].status,'traveling')}
 loaded.month++;advanceMarkets(loaded);
 assert.equal(loaded.markets.shipments[0].status,'delivered');
 assert.equal(loaded.markets.shipments[0].escrow,0);
 assert.equal(loaded.factions.parthia.treasury,sellerMoney+quote.price);
 assert.equal(loaded.markets.transportSpent+loaded.markets.merchantFees,quote.transport);
 assert.equal(loaded.world.characters[result.shipment.merchantId].wealth,loaded.markets.merchantFees);
 assert.equal(loaded.markets.regions.armenia.goods.horses.stock,destination+quote.months*(local.production-local.consumption)+2);
 assert.equal(loaded.markets.transactions.length,1);
 advanceMarkets(loaded);assert.equal(loaded.markets.transactions.length,1);
 assert.equal(loaded.markets.transportSpent+loaded.markets.merchantFees,quote.transport);
 assert.equal(upgradeSave(structuredClone(loaded)).markets.transactions.length,1);
});

test('border war blocks an actual shipment until passage is restored',()=>{
 const s=deal(),shipment=placeTradeOrder(s,request).shipment;
 s.wars.push(['armenia','parthia']);s.month++;advanceMarkets(s);
 assert.equal(shipment.status,'blocked');assert.equal(s.markets.transactions.length,0);
 s.wars=s.wars.filter(w=>!w.includes('armenia'));
 for(let i=0;i<shipment.legs[0].months;i++){s.month++;advanceMarkets(s)}
 assert.equal(shipment.status,'delivered');assert.equal(s.markets.transactions.length,1);
});

test('orders reject unaffordable and missing-stock trades while using mapped Eurasian routes',()=>{
 const s=deal(),before=structuredClone(s.markets.regions.parthia.goods.horses);
 assert.equal(placeTradeOrder(s,{...request,quantity:1000}).reason,'invalid');
 assert.equal(placeTradeOrder(s,{...request,quantity:20}).reason,'unavailable');
 s.factions.armenia.treasury=0;assert.equal(placeTradeOrder(s,request).reason,'treasury');
 assert.deepEqual(s.markets.regions.parthia.goods.horses,before);
 const han=newGame('han');han.relations['han:parthia']=45;assert.equal(proposeAgreement(han,'han','parthia','trade').ok,true);
 assert.equal(quoteTrade(han,{seller:'han',buyer:'parthia',origin:'hanGuanzhong',destination:'parthia',commodity:'silk',quantity:1}).ok,true);
});

test('Han silk travels through independent oasis and Central Asian markets, with war blocking its actual leg',()=>{
 const s=newGame('han');s.relations['han:parthia']=45;assert.equal(proposeAgreement(s,'han','parthia','trade').ok,true);
 const request={seller:'han',buyer:'parthia',origin:'hanGuanzhong',destination:'parthia',commodity:'silk',quantity:1};
 const quote=quoteTrade(s,request),sellerStock=s.markets.regions.hanGuanzhong.goods.silk.stock,buyerStock=s.markets.regions.parthia.goods.silk.stock,buyerCash=s.factions.parthia.treasury,sellerCash=s.factions.han.treasury,shanshanCash=s.factions.shanshan.treasury;
 assert.equal(quote.ok,true);assert.ok(quote.months>=20);assert.deepEqual(quote.route.slice(0,3),['hanGuanzhong','hanHexi','shanshanOasis']);
 assert.ok(quote.route.includes('silk:bactra')&&quote.route.includes('silk:parthia'));assert.ok(quote.tariffs.some(x=>x.owner==='yuezhi'));
 const shipment=placeTradeOrder(s,request).shipment;assert.equal(s.markets.regions.hanGuanzhong.goods.silk.stock,sellerStock-1);assert.equal(s.factions.parthia.treasury,buyerCash-quote.total);
 const saved=upgradeSave(structuredClone(s));saved.wars.push(['han','yuezhi']);
 const next=()=>{if(++saved.month>12){saved.month=1;saved.year++}advanceMarkets(saved)};
 for(let i=0;i<quote.months;i++){next();if(saved.markets.shipments[0].status==='blocked')break}
 assert.equal(saved.markets.shipments[0].status,'blocked');assert.equal(saved.markets.regions.parthia.goods.silk.stock,buyerStock);assert.equal(saved.markets.shipments[0].escrow,quote.total);
 saved.wars=saved.wars.filter(w=>!w.includes('yuezhi'));
 for(let i=0;i<quote.months+2&&saved.markets.shipments[0].status!=='delivered';i++)next();
 assert.equal(saved.markets.shipments[0].status,'delivered');assert.equal(saved.markets.regions.parthia.goods.silk.stock,buyerStock+1);
 assert.equal(saved.factions.han.treasury,sellerCash+quote.price);
 assert.equal(saved.factions.shanshan.treasury,shanshanCash+quote.tariffs.find(x=>x.owner==='shanshan').amount);
 assert.equal(saved.markets.transitTreasury.yuezhi,quote.tariffs.find(x=>x.owner==='yuezhi').amount);
 assert.equal(saved.markets.transactions.length,1);assert.equal(saved.markets.transportSpent+saved.markets.merchantFees,quote.transport);
 assert.equal(saved.markets.transactions[0].merchantId,saved.markets.shipments[0].merchantId);
 assert.equal(shipment.status,'traveling','serialized state advances independently');
});

test('old saves gain markets once without changing existing treasury or region ownership',()=>{
 const s=newGame('caesar'),cash=s.factions.caesar.treasury,owners=s.regions.map(r=>r.owner);delete s.markets;
 const restored=upgradeSave(structuredClone(s)),again=upgradeSave(structuredClone(restored));
 assert.equal(restored.factions.caesar.treasury,cash);
 assert.deepEqual(restored.regions.map(r=>r.owner),owners);
 assert.deepEqual(restored.markets.transitTreasury,{});
 assert.deepEqual(restored.markets.merchants,{});
 assert.deepEqual(again.markets,restored.markets);
 assert.equal(Object.keys(initializeMarkets(again).regions).length,again.regions.length);
});

test('an older in-flight order gains one stable merchant without changing escrow',()=>{
 const s=deal(),shipment=placeTradeOrder(s,request).shipment,escrow=shipment.escrow;
 delete shipment.merchantId;delete s.markets.merchants;delete s.markets.merchantFees;
 const restored=upgradeSave(structuredClone(s)),id=restored.markets.shipments[0].merchantId;
 assert.ok(id);assert.equal(restored.markets.shipments[0].escrow,escrow);
 assert.equal(upgradeSave(structuredClone(restored)).markets.shipments[0].merchantId,id);
});

test('parallel caravans receive separate merchants and preserve both identities',()=>{
 const s=deal(),first=placeTradeOrder(s,request),second=placeTradeOrder(s,request);
 assert.equal(first.ok,true);assert.equal(second.ok,true);
 assert.notEqual(first.shipment.merchantId,second.shipment.merchantId);
 assert.equal(s.markets.merchants.armenia.length,2);
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(restored.markets.shipments.map(x=>x.merchantId),[first.shipment.merchantId,second.shipment.merchantId]);
});

test('imported horses equip Han scouts and improve their actual battlefield power',()=>{
 const s=newGame('han');s.relations['han:parthia']=45;assert.equal(proposeAgreement(s,'han','parthia','trade').ok,true);
 const horses=s.markets.regions.hanHexi.goods.horses;horses.stock=0;horses.production=0;horses.consumption=0;
 const order=placeTradeOrder(s,{seller:'parthia',buyer:'han',origin:'parthia',destination:'hanHexi',commodity:'horses',quantity:1});assert.equal(order.ok,true);
 for(let i=0;i<order.quote.months;i++){if(++s.month>12){s.month=1;s.year++}advanceMarkets(s)}
 assert.equal(order.shipment.status,'delivered');assert.equal(horses.stock,1);
 assert.equal(recruit(s,'hanHexi'),true);const recruited=s.armies.at(-1);
 assert.equal(recruited.mounted,100);assert.equal(horses.stock,0);
 const mounted=structuredClone(s),infantry=structuredClone(s);delete infantry.armies.find(a=>a.id===recruited.id).mounted;
 const fight=state=>{state.wars.push(['han','shanshan']);const attacker=state.armies.find(a=>a.id===recruited.id),defender=state.armies.find(a=>a.id==='shanshanGuard'),target=state.regions.find(r=>r.id==='shanshanOasis');resolveBattle(state,attacker,defender,target);return state.battles[0].attacker.power};
 assert.ok(fight(mounted)>fight(infantry));
 assert.equal(upgradeSave(structuredClone(s)).armies.find(a=>a.id===recruited.id).mounted,100);
});
