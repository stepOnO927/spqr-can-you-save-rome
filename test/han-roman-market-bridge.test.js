import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {attachHanWorld,hanWorld,advanceHanWorld,romanView} from '../han/world.js?v=han-1';
import {placeEasternTrade,advanceEasternMarkets} from '../han/markets.js?v=faces-of-empire-1';
import {advanceDate} from '../han/util.js?v=han-1';
import {eastPanel} from '../han/east-ui.js?v=han-1';

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
 s.factions.caesar.treasury=100;const cash=s.factions.caesar.treasury+h.tradeMarkets.externalTreasury;
 advanceDate(s);advanceHanWorld(s);
 assert.equal(gate.stock,gateBefore-1);assert.equal(roman.stock,romanBefore+1);
 assert.equal(s.factions.caesar.treasury+h.tradeMarkets.externalTreasury,cash);
 assert.equal(s.factions.caesar.treasury,100-placed.shipment.price);
 const receipt=romanView(s).imports[0];assert.equal(receipt.hanShipment,placed.shipment.id);
 assert.equal(receipt.port,'syria');assert.equal(receipt.price,placed.shipment.price);
 assert.equal(s.markets.transactions.filter(x=>x.linkedHanShipment===placed.shipment.id).length,1);
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

test('a rival Roman port purchase does not expose its import to the player',()=>{
 const s=newGame('caesar');attachHanWorld(s,{seed:8});
 for(const id of ['syria','egypt','anatolia','achaia'])s.regions.find(r=>r.id===id).owner='senate';
 const h=hanWorld(s).state,gate=h.tradeMarkets.regions.mediterranean_gate.goods.silk;
 h.tradeMarkets.shipments.push({id:'eastern-shipment:rival',buyer:'external',seller:'han',destination:'mediterranean_gate',commodity:'silk',quantity:1,price:7,status:'delivered'});gate.stock++;
 const before=s.factions.senate.treasury;advanceDate(s);advanceHanWorld(s);
 assert.equal(s.factions.senate.treasury,before-7);
 assert.equal(romanView(s).silkCargoes,0);assert.deepEqual(romanView(s).imports,[]);
 assert.equal(s.log.some(x=>x.en?.includes('Seric silk reached')),false);
});
