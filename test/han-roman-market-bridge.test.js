import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=marriage-economy-merge-1';
import {attachHanWorld,hanWorld,advanceHanWorld,romanView,buyEasternImport} from '../han/world.js?v=marriage-economy-merge-1';
import {placeEasternTrade,advanceEasternMarkets} from '../han/markets.js?v=faces-wheels-1';
import {advanceDate} from '../han/util.js?v=han-1';
import {eastPanel} from '../han/east-ui.js?v=marriage-economy-merge-1';
import {setRelation} from '../han/frontier.js?v=han-1';
import {propose} from '../han/frontier.js?v=han-1';
import {proposeAgreement} from '../agreements.js?v=agreement-courier-1';
import {postTradeSale,advanceMarketAI,advanceMarkets} from '../trade-markets.js?v=faces-wheels-1';

test('the attached eastern world trades autonomously without publishing private orders to Rome',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:82});const h=hanWorld(s).state;
 const powers=['han','kangju','yuezhi','parthia'];
 for(const a of powers)for(const b of powers)if(a!==b)setRelation(h,a,b,65);
 for(const market of Object.values(h.tradeMarkets.regions))for(const item of Object.values(market.goods)){item.stock=0;item.production=0;item.consumption=0}
 for(const [id,good] of [['kangju','horses'],['qi','silk'],['hyrcania','timber'],['changan','grain']]){
  const item=h.tradeMarkets.regions[id].goods[good];item.stock=80;item.production=3;
 }
 for(const id of powers)h.factions[id].treasury=250;
 s.month=3;advanceHanWorld(s);
 const buyers=new Set(h.tradeMarkets.shipments.map(x=>x.buyer));
 for(const id of powers)assert.ok(buyers.has(id),`${id} placed no autonomous order`);
 assert.ok(h.tradeMarkets.diplomacy.attempts.some(x=>x.status==='accepted'));
 assert.deepEqual(romanView(s).imports,[]);
 assert.equal(s.log.some(x=>x.eastern&&/shipment|caravan|商队|货批/i.test(x.en||'')),false);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(hanWorld(restored).state.tradeMarkets.autonomousEnabled,true);
 assert.deepEqual(hanWorld(restored).state.tradeMarkets.shipments,h.tradeMarkets.shipments);
});

test('a Roman listing reaches Han through two paid Parthian intermediary shipments',()=>{
 let s=newGame('caesar');attachHanWorld(s,{seed:49});
 s.regions.find(r=>r.id==='syria').owner='caesar';s.relations['caesar:parthia']=70;
 assert.equal(proposeAgreement(s,'caesar','parthia','trade').ok,true);
 const h=hanWorld(s).state;h.tradeMarkets.autonomousEnabled=false;
 const source=s.markets.regions.syria.goods.copper,romanRelay=s.markets.regions.parthia.goods.copper,eastRelay=h.tradeMarkets.regions.ctesiphon.goods.copper;
 Object.assign(source,{stock:20,production:0,consumption:0});Object.assign(romanRelay,{stock:0,production:0,consumption:0});Object.assign(eastRelay,{stock:0,production:0,consumption:0});s.factions.parthia.treasury=200;
 const posted=postTradeSale(s,{origin:'syria',commodity:'copper',quantity:5,unitPrice:1});assert.equal(posted.ok,true);
 s.month=3;const sellerCash=s.factions.caesar.treasury,brokerCash=s.factions.parthia.treasury;
 const romanShipment=advanceMarketAI(s).find(x=>x.seller==='caesar'&&x.buyer==='parthia'&&x.commodity==='copper'&&x.saleOrderId===posted.order.id);
 assert.ok(romanShipment,'Parthia must buy a listed, treaty-backed lot through normal AI');
 assert.equal(source.stock,15);assert.equal(eastRelay.stock,0);assert.equal(s.factions.parthia.treasury,brokerCash-romanShipment.escrow);
 for(let i=0;i<romanShipment.legs[0].months;i++){advanceDate(s);advanceMarkets(s);advanceHanWorld(s);if(i===0)assert.equal(eastRelay.stock,0,'cargo cannot teleport before Roman delivery')}
 assert.equal(romanShipment.status,'delivered');assert.equal(s.factions.caesar.treasury,sellerCash+romanShipment.price);
 assert.equal(romanRelay.stock,0);assert.equal(eastRelay.stock,romanShipment.quantity);
 assert.equal(hanWorld(s).bridge.romanExports[romanShipment.id].status,'transferred');
 assert.equal(romanView(s).exports[0].romanShipment,romanShipment.id);
 s.player='senate';assert.deepEqual(romanView(s).exports,[],'the rival Roman court cannot inspect this receipt');s.player='caesar';
 assert.match(eastPanel(s,{lang:0}),/Your cargo received by Parthian brokers.*Copper/s);
 assert.match(eastPanel(s,{lang:1}),/经安息商人转售的本方货物.*铜/s);
 s=upgradeSave(structuredClone(s));const world=hanWorld(s).state,beforeRelay=world.tradeMarkets.regions.ctesiphon.goods.copper.stock;
 advanceDate(s);advanceHanWorld(s);assert.equal(world.tradeMarkets.regions.ctesiphon.goods.copper.stock,beforeRelay,'reload cannot bridge the same Roman batch twice');
 setRelation(world,'han','parthia',70);assert.equal(propose(world,'han','parthia','market').proposal.status,'accepted');
 world.silk.security=10;const destination=world.tradeMarkets.regions.dunhuang.goods.copper;Object.assign(destination,{stock:0,production:0,consumption:0});
 const hanCash=world.factions.han.treasury,eastOrder=placeEasternTrade(world,{seller:'parthia',buyer:'han',origin:'ctesiphon',destination:'dunhuang',commodity:'copper',quantity:1});
 assert.equal(eastOrder.ok,true,eastOrder.reason);assert.equal(world.factions.han.treasury,hanCash-eastOrder.quote.total);
 assert.equal(destination.stock,0);assert.equal(world.tradeMarkets.regions.ctesiphon.goods.copper.stock,beforeRelay-1);
 assert.ok(eastOrder.quote.months>12,'the long Silk Road leg must take time');
 for(let i=0;i<eastOrder.quote.months;i++){advanceDate(world);advanceEasternMarkets(world)}
 assert.equal(eastOrder.shipment.status,'delivered');assert.equal(destination.stock,1);
 assert.equal(world.tradeMarkets.transactions.filter(x=>x.shipment===eastOrder.shipment.id).length,1);
 assert.equal(s.markets.transactions.filter(x=>x.shipment===romanShipment.id).length,1);
});

test('Parthian brokers autonomously resell delivered Roman copper into a Central Asian market',()=>{
 let s=newGame('caesar');attachHanWorld(s,{seed:61});
 s.regions.find(r=>r.id==='syria').owner='caesar';s.relations['caesar:parthia']=70;
 assert.equal(proposeAgreement(s,'caesar','parthia','trade').ok,true);
 const h=hanWorld(s).state;h.tradeMarkets.autonomousEnabled=true;
 const source=s.markets.regions.syria.goods.copper,romanRelay=s.markets.regions.parthia.goods.copper,eastRelay=h.tradeMarkets.regions.ctesiphon.goods.copper;
 Object.assign(source,{stock:20,production:0,consumption:0});Object.assign(romanRelay,{stock:0,production:0,consumption:0});Object.assign(eastRelay,{stock:0,production:0,consumption:0});
 for(const market of Object.values(h.tradeMarkets.regions))for(const item of Object.values(market.goods)){item.stock=100;item.production=0;item.consumption=0}
 for(const market of Object.values(h.tradeMarkets.regions))market.goods.copper.stock=0;
 eastRelay.stock=0;
 for(const [id,faction] of Object.entries(h.factions))faction.treasury=id==='yuezhi'?1000:0;
 s.factions.parthia.treasury=200;
 const posted=postTradeSale(s,{origin:'syria',commodity:'copper',quantity:5,unitPrice:1});assert.equal(posted.ok,true);
 s.month=3;const first=advanceMarketAI(s).find(x=>x.seller==='caesar'&&x.buyer==='parthia'&&x.commodity==='copper'&&x.saleOrderId===posted.order.id);
 assert.ok(first,'the Roman lot must be bought and delivered through the existing physical market');
 for(let i=0;i<first.legs[0].months;i++){advanceDate(s);advanceMarkets(s);advanceHanWorld(s)}
 assert.equal(first.status,'delivered');assert.equal(eastRelay.stock,first.quantity);
 setRelation(h,'yuezhi','parthia',70);assert.equal(propose(h,'yuezhi','parthia','market').proposal.status,'accepted');
 for(let i=0;i<12&&!h.tradeMarkets.shipments.some(x=>x.seller==='parthia'&&x.buyer==='yuezhi'&&x.commodity==='copper'&&x.origin==='ctesiphon');i++){advanceDate(s);advanceHanWorld(s)}
 const onward=h.tradeMarkets.shipments.find(x=>x.seller==='parthia'&&x.buyer==='yuezhi'&&x.commodity==='copper'&&x.origin==='ctesiphon');
 assert.ok(onward,'Yuezhi AI should buy a viable Roman-origin lot from the Parthian market');
 assert.ok(onward.escrow>0&&onward.legs.reduce((n,leg)=>n+leg.months,0)>0&&onward.path.includes('margiana'));
 assert.equal(eastRelay.stock+onward.quantity,first.quantity,'the second leg reserves the same finite imported stock');
 assert.equal(romanRelay.stock,0,'the Roman projection cannot keep a second copy');
 assert.equal(h.factions.yuezhi.treasury,1000-onward.escrow);
 const saved=upgradeSave(structuredClone(s)),world=hanWorld(saved).state,shipment=world.tradeMarkets.shipments.find(x=>x.id===onward.id);
 const stockBefore=world.tradeMarkets.regions[onward.destination].goods.copper.stock,sellerCash=world.factions.parthia.treasury;
 for(let i=0;i<onward.legs.reduce((n,leg)=>n+leg.months,0);i++){advanceDate(world);advanceEasternMarkets(world)}
 assert.equal(shipment.status,'delivered');
 assert.equal(world.tradeMarkets.regions[onward.destination].goods.copper.stock,stockBefore+onward.quantity);
 assert.equal(world.factions.parthia.treasury,sellerCash+onward.price);
 assert.equal(world.tradeMarkets.transactions.filter(x=>x.shipment===onward.id).length,1);
});

test('successive paid Roman lots can pass through Parthia and Yuezhi to an AI Han buyer',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:62});
 s.regions.find(r=>r.id==='syria').owner='caesar';s.relations['caesar:parthia']=70;
 assert.equal(proposeAgreement(s,'caesar','parthia','trade').ok,true);
 const h=hanWorld(s).state;h.tradeMarkets.autonomousEnabled=true;
 for(const market of Object.values(h.tradeMarkets.regions))for(const item of Object.values(market.goods)){item.stock=100;item.production=0;item.consumption=0}
 for(const market of Object.values(h.tradeMarkets.regions))market.goods.copper.stock=0;
 for(const faction of Object.values(h.factions))faction.treasury=0;
 Object.assign(s.markets.regions.syria.goods.copper,{stock:20,production:0,consumption:0});
 Object.assign(s.markets.regions.parthia.goods.copper,{stock:0,production:0,consumption:0});
 s.factions.parthia.treasury=500;
 const posted=postTradeSale(s,{origin:'syria',commodity:'copper',quantity:9,unitPrice:1});assert.equal(posted.ok,true);
 s.month=3;assert.ok(advanceMarketAI(s).some(x=>x.seller==='caesar'&&x.buyer==='parthia'&&x.commodity==='copper'));
 const transferred=()=>Object.values(hanWorld(s).bridge.romanExports).filter(x=>x.status==='transferred'&&x.commodity==='copper');
 for(let i=0;i<36&&transferred().reduce((n,x)=>n+x.quantity,0)<6;i++){
  advanceDate(s);advanceMarkets(s);advanceHanWorld(s);if(s.month%3===0)advanceMarketAI(s);
 }
 const imported=transferred().reduce((n,x)=>n+x.quantity,0);
 assert.ok(imported>=6,'two paid Roman caravans should reach Parthia before resale');
 assert.equal(h.tradeMarkets.regions.ctesiphon.goods.copper.stock,imported);
 h.factions.yuezhi.treasury=1000;setRelation(h,'yuezhi','parthia',70);
 assert.equal(propose(h,'yuezhi','parthia','market').proposal.status,'accepted');
 for(let i=0;i<12&&!h.tradeMarkets.shipments.some(x=>x.seller==='parthia'&&x.buyer==='yuezhi'&&x.commodity==='copper');i++){advanceDate(s);advanceHanWorld(s)}
 const second=h.tradeMarkets.shipments.find(x=>x.seller==='parthia'&&x.buyer==='yuezhi'&&x.commodity==='copper');
 assert.ok(second&&second.quantity>=2,'Yuezhi must fund a multi-batch intermediary purchase');
 for(let i=0;i<second.legs.reduce((n,leg)=>n+leg.months,0);i++){advanceDate(h);advanceEasternMarkets(h)}
 assert.equal(second.status,'delivered');
 h.factions.han.treasury=1000;setRelation(h,'han','yuezhi',70);
 assert.equal(propose(h,'han','yuezhi','market').proposal.status,'accepted');
 for(let i=0;i<12&&!h.tradeMarkets.shipments.some(x=>x.seller==='yuezhi'&&x.buyer==='han'&&x.commodity==='copper');i++){advanceDate(h);advanceEasternMarkets(h)}
 const third=h.tradeMarkets.shipments.find(x=>x.seller==='yuezhi'&&x.buyer==='han'&&x.commodity==='copper');
 assert.ok(third,'Han AI should buy the same Roman-origin stock from the closer Yuezhi market');
 assert.equal(h.tradeMarkets.shipments.some(x=>x.seller==='yuezhi'&&x.buyer==='parthia'&&x.commodity==='copper'),false,'the first broker cannot immediately buy back its own sale');
 assert.ok(third.escrow>0&&third.path.includes('bactra')&&third.legs.reduce((n,leg)=>n+leg.months,0)>0);
 const restored=upgradeSave(structuredClone(s)),world=hanWorld(restored).state,paid=world.tradeMarkets.shipments.find(x=>x.id===third.id);
 const hanStock=world.tradeMarkets.regions[third.destination].goods.copper.stock,yuezhiCash=world.factions.yuezhi.treasury;
 world.tradeMarkets.autonomousEnabled=false;
 for(let i=0;i<third.legs.reduce((n,leg)=>n+leg.months,0);i++){advanceDate(world);advanceEasternMarkets(world)}
 assert.equal(paid.status,'delivered');
 assert.equal(world.tradeMarkets.regions[third.destination].goods.copper.stock,hanStock+third.quantity);
 assert.equal(world.factions.yuezhi.treasury,yuezhiCash+third.price);
 assert.equal(world.tradeMarkets.transactions.filter(x=>x.shipment===third.id).length,1);
});

test('old Roman deliveries remain in their saved market instead of entering the East on upgrade',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:16});
 s.markets.regions.parthia.goods.copper.stock=3;
 s.markets.transactions.push({shipment:'shipment:historical',seller:'caesar',buyer:'parthia',origin:'syria',destination:'parthia',commodity:'copper',quantity:3,price:6,year:s.year,month:s.month});
 const easternGood=hanWorld(s).state.tradeMarkets.regions.ctesiphon.goods.copper;Object.assign(easternGood,{production:0,consumption:0});const eastern=easternGood.stock;
 delete hanWorld(s).bridge.romanExports;
 const loaded=upgradeSave(structuredClone(s));
 assert.equal(hanWorld(loaded).bridge.romanExports['shipment:historical'].status,'legacy');
 advanceDate(loaded);advanceHanWorld(loaded);
 assert.equal(loaded.markets.regions.parthia.goods.copper.stock,3);
 assert.equal(hanWorld(loaded).state.tradeMarkets.regions.ctesiphon.goods.copper.stock,eastern);
});

test('attaching the eastern world midcampaign does not bridge historical Roman sales',()=>{
 const s=newGame('caesar');
 s.markets.regions.parthia.goods.copper.stock=3;
 s.markets.transactions.push({shipment:'shipment:before-attachment',seller:'caesar',buyer:'parthia',origin:'syria',destination:'parthia',commodity:'copper',quantity:3,price:6,year:s.year,month:s.month});
 attachHanWorld(s,{seed:16});
 assert.equal(hanWorld(s).bridge.romanExports['shipment:before-attachment'].status,'legacy');
 const easternGood=hanWorld(s).state.tradeMarkets.regions.ctesiphon.goods.copper;Object.assign(easternGood,{production:0,consumption:0});const eastern=easternGood.stock;
 advanceDate(s);advanceHanWorld(s);
 assert.equal(s.markets.regions.parthia.goods.copper.stock,3);
 assert.equal(easternGood.stock,eastern);
});

test('ten years of attached eastern trade survive a Roman save migration',()=>{
 let s=newGame('caesar');attachHanWorld(s,{seed:49});
 for(let i=0;i<120;i++){
  advanceDate(s);advanceHanWorld(s);
  if(i===59)s=upgradeSave(structuredClone(s));
  const h=hanWorld(s).state;
  for(const f of Object.values(h.factions))assert.ok(Number.isFinite(f.treasury)&&Math.abs(f.treasury)<1_000_000);
  for(const market of Object.values(h.tradeMarkets.regions))for(const item of Object.values(market.goods))assert.ok(Number.isSafeInteger(item.stock)&&item.stock>=0&&item.stock<=Math.max(80,item.production*24));
 }
 const h=hanWorld(s).state,ships=h.tradeMarkets.shipments;
 assert.ok(ships.length>0,'Eastern NPCs never initiated trade');
 assert.ok(ships.some(x=>x.status==='delivered'),'No eastern cargo was delivered');
 assert.ok(ships.every(x=>h.persons[x.merchantId]?.profession==='merchant'));
 assert.equal(h.tradeMarkets.transportSpent+h.tradeMarkets.merchantFees+h.tradeMarkets.marketHouseRent,h.tradeMarkets.transactions.reduce((n,x)=>n+x.transport,0));
 assert.equal(romanView(s).imports.some(x=>x.owner!==s.player),false);
});

test('a delivered Han silk batch crosses into a Roman market with a payer and no duplicate stock',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:21});
 const h=hanWorld(s).state;for(const id of ['syria','egypt','anatolia','achaia'])s.regions.find(r=>r.id===id).owner='caesar';
 for(const r of h.regions){r.fort=2;r.unrest=0}
 const request={seller:'han',buyer:'external',origin:'changan',destination:'mediterranean_gate',commodity:'silk',quantity:1};
 const placed=placeEasternTrade(h,request);assert.equal(placed.ok,true,placed.reason);
 const source=h.tradeMarkets.regions.changan.goods.silk;source.stock=0;source.production=0;source.consumption=0;
 for(let i=0;i<placed.quote.months;i++){advanceDate(h);advanceEasternMarkets(h)}
 assert.equal(placed.shipment.status,'delivered');
 const gate=h.tradeMarkets.regions.mediterranean_gate.goods.silk,roman=s.markets.regions.syria.goods.silk;
 const gateBefore=gate.stock,romanBefore=roman.stock;
 s.year=h.year;s.month=h.month;advanceDate(s);
 s.factions.caesar.treasury=0;advanceHanWorld(s);
 assert.equal(gate.stock,gateBefore,'cargo waits for an actual buyer');
 assert.equal(roman.stock,romanBefore);
 assert.equal(romanView(s).imports.length,0);
 assert.equal(buyEasternImport(s,placed.shipment.id,'syria').reason,'treasury');
 s.factions.caesar.treasury=100;const cash=s.factions.caesar.treasury+h.tradeMarkets.externalTreasury;
 advanceDate(s);advanceHanWorld(s);
 assert.equal(gate.stock,gateBefore,'a funded player port does not buy without an order');
 assert.equal(romanView(s).availableImports.some(x=>x.id===placed.shipment.id),true);
 const offer=romanView(s).availableImports.find(x=>x.id===placed.shipment.id);
 assert.equal(offer.merchantId,placed.shipment.merchantId);
 assert.deepEqual(offer.merchantName,h.persons[placed.shipment.merchantId].name);
 assert.equal(buyEasternImport(s,placed.shipment.id,'roma').reason,'port');
 const bought=buyEasternImport(s,placed.shipment.id,'syria');assert.equal(bought.ok,true,bought.reason);
 assert.equal(gate.stock,gateBefore-1);assert.equal(roman.stock,romanBefore+1);
 assert.equal(s.factions.caesar.treasury+h.tradeMarkets.externalTreasury,cash);
 assert.equal(s.factions.caesar.treasury,100-placed.shipment.price);
 const receipt=romanView(s).imports[0];assert.equal(receipt.hanShipment,placed.shipment.id);
 assert.equal(receipt.port,'syria');assert.equal(receipt.price,placed.shipment.price);
 assert.equal(receipt.merchantId,placed.shipment.merchantId);
 assert.equal(s.markets.transactions.filter(x=>x.linkedHanShipment===placed.shipment.id).length,1);
 assert.equal(buyEasternImport(s,placed.shipment.id,'syria').ok,false,'a purchased batch cannot be bought twice');
 assert.match(eastPanel(s,{lang:0}),/Purchases at your ports/);
 assert.match(eastPanel(s,{lang:1}),/本方港口购入/);
 advanceHanWorld(s);assert.equal(s.markets.transactions.filter(x=>x.linkedHanShipment===placed.shipment.id).length,1);
 const loaded=upgradeSave(structuredClone(s)),loadedGate=hanWorld(loaded).state.tradeMarkets.regions.mediterranean_gate.goods.silk.stock;
 const loadedPort=loaded.markets.regions.syria.goods.silk.stock;
 advanceDate(loaded);advanceHanWorld(loaded);
 assert.equal(hanWorld(loaded).state.tradeMarkets.regions.mediterranean_gate.goods.silk.stock,loadedGate);
 assert.equal(loaded.markets.regions.syria.goods.silk.stock,loadedPort);
 assert.equal(loaded.markets.transactions.filter(x=>x.linkedHanShipment===placed.shipment.id).length,1);
});

test('a paid horse caravan reaches a Roman port once and keeps silk reports separate',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:29});const h=hanWorld(s).state;
 s.regions.find(r=>r.id==='syria').owner='caesar';
 h.tradeMarkets.regions.changan.goods.horses.stock=10;
 const placed=placeEasternTrade(h,{seller:'han',buyer:'external',origin:'changan',destination:'mediterranean_gate',commodity:'horses',quantity:1});
 assert.equal(placed.ok,true,placed.reason);
 const source=h.tradeMarkets.regions.changan.goods.horses;source.stock=0;source.production=0;source.consumption=0;
 for(let i=0;i<placed.quote.months;i++){advanceDate(h);advanceEasternMarkets(h)}
 assert.equal(placed.shipment.status,'delivered');
 const gate=h.tradeMarkets.regions.mediterranean_gate.goods.horses,port=s.markets.regions.syria.goods.horses;
 const gateBefore=gate.stock,portBefore=port.stock,price=placed.shipment.price;
 s.year=h.year;s.month=h.month;advanceDate(s);s.factions.caesar.treasury=100;
 const cash=s.factions.caesar.treasury+h.tradeMarkets.externalTreasury;
 advanceHanWorld(s);
 assert.equal(gate.stock,gateBefore);
 assert.equal(buyEasternImport(s,placed.shipment.id,'syria').ok,true);
 assert.equal(gate.stock,gateBefore-1);assert.equal(port.stock,portBefore+1);
 assert.equal(s.factions.caesar.treasury,100-price);
 assert.equal(s.factions.caesar.treasury+h.tradeMarkets.externalTreasury,cash);
 assert.equal(romanView(s).imports[0].commodity,'horses');
 assert.equal(romanView(s).silkCargoes,0);
 assert.match(eastPanel(s,{lang:0}),/Horses/);assert.match(eastPanel(s,{lang:1}),/马匹/);
 const restored=upgradeSave(structuredClone(s)),before=restored.markets.regions.syria.goods.horses.stock;
 advanceDate(restored);advanceHanWorld(restored);
 assert.equal(restored.markets.regions.syria.goods.horses.stock,before);
 assert.equal(restored.markets.transactions.filter(x=>x.linkedHanShipment===placed.shipment.id).length,1);
});

test('upgrading an older delivered cargo does not import it or mint customs a second time',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:7});const w=hanWorld(s),h=w.state;
 s.regions.find(r=>r.id==='syria').owner='caesar';
 h.tradeMarkets.shipments.push({id:'eastern-shipment:old',buyer:'external',seller:'han',destination:'mediterranean_gate',commodity:'silk',quantity:1,price:7,status:'delivered'});
 h.tradeMarkets.regions.mediterranean_gate.goods.silk.stock++;
 w.known.silkCargoes=1;delete w.bridge;
 const restored=upgradeSave(structuredClone(s)),again=hanWorld(restored);
 assert.equal(again.bridge.settled['eastern-shipment:old'].status,'legacy');
 const cash=restored.factions.caesar.treasury,stock=restored.markets.regions.syria.goods.silk.stock;
 advanceDate(restored);advanceHanWorld(restored);
 assert.equal(restored.factions.caesar.treasury,cash);
 assert.equal(restored.markets.regions.syria.goods.silk.stock,stock);
 assert.equal(romanView(restored).silkCargoes,1);
});

test('an older save with non-silk cargo at the gate can finish its first Roman purchase',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:31});s.regions.find(r=>r.id==='syria').owner='caesar';
 const w=hanWorld(s),h=w.state,id='eastern-shipment:old-horses';
 h.tradeMarkets.shipments.push({id,buyer:'external',seller:'han',destination:'mediterranean_gate',commodity:'horses',quantity:1,price:5,status:'delivered'});
 h.tradeMarkets.regions.mediterranean_gate.goods.horses.stock++;
 delete w.bridge;const restored=upgradeSave(structuredClone(s));
 assert.equal(hanWorld(restored).bridge.settled[id],undefined);
 const before=restored.markets.regions.syria.goods.horses.stock;
 advanceDate(restored);advanceHanWorld(restored);
 assert.equal(restored.markets.regions.syria.goods.horses.stock,before);
 assert.equal(buyEasternImport(restored,id,'syria').ok,true);
 assert.equal(restored.markets.regions.syria.goods.horses.stock,before+1);
 assert.equal(restored.markets.transactions.filter(x=>x.linkedHanShipment===id).length,1);
});

test('a rival Roman port purchase does not expose its import to the player',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:8});
 for(const id of ['syria','egypt','anatolia','achaia'])s.regions.find(r=>r.id===id).owner='senate';
 const h=hanWorld(s).state,gate=h.tradeMarkets.regions.mediterranean_gate.goods.silk;
 h.tradeMarkets.shipments.push({id:'eastern-shipment:rival',buyer:'external',seller:'han',destination:'mediterranean_gate',commodity:'silk',quantity:1,price:7,status:'delivered'});gate.stock++;
 const before=s.factions.senate.treasury;advanceDate(s);advanceHanWorld(s);
 assert.equal(s.factions.senate.treasury,before-7);
 assert.equal(romanView(s).silkCargoes,0);assert.deepEqual(romanView(s).imports,[]);assert.deepEqual(romanView(s).availableImports,[]);
 assert.equal(s.log.some(x=>x.en?.includes('Seric silk reached')),false);
});

test('a rival court can buy an observed cargo after the player priority window, including after save/load',()=>{
 let s=newGame('caesar');attachHanWorld(s,{seed:18});
 s.regions.find(r=>r.id==='syria').owner='caesar';s.regions.find(r=>r.id==='egypt').owner='senate';
 let h=hanWorld(s).state;h.tradeMarkets.autonomousEnabled=false;
 const id='eastern-shipment:contested-horses',gate=h.tradeMarkets.regions.mediterranean_gate.goods.horses;
 gate.stock++;gate.consumption=0;
 h.tradeMarkets.shipments.push({id,buyer:'external',seller:'han',destination:'mediterranean_gate',commodity:'horses',quantity:1,price:7,status:'delivered',deliveredAt:s.year*12+s.month});
 s.factions.senate.treasury=100;
 assert.equal(romanView(s).availableImports.find(x=>x.id===id).rivalBidIn,3);
 for(let i=0;i<2;i++){advanceDate(s);advanceHanWorld(s);assert.equal(hanWorld(s).bridge.settled[id],undefined)}
 s=upgradeSave(structuredClone(s));h=hanWorld(s).state;
 assert.equal(romanView(s).availableImports.find(x=>x.id===id).rivalBidIn,1);
 advanceDate(s);advanceHanWorld(s);
 assert.equal(hanWorld(s).bridge.settled[id].owner,'senate');
 assert.equal(s.factions.senate.treasury,93);
 assert.equal(romanView(s).availableImports.some(x=>x.id===id),false);
 assert.equal(romanView(s).imports.some(x=>x.hanShipment===id),false);
 assert.equal(s.markets.transactions.filter(x=>x.linkedHanShipment===id).length,1);
 assert.match(s.log[0].en,/rival court/);
 advanceDate(s);advanceHanWorld(s);
 assert.equal(s.markets.transactions.filter(x=>x.linkedHanShipment===id).length,1);
});
