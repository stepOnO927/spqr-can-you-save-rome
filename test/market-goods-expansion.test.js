import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=born-portraits-eleven-1';
import {newHanGame,loadHanSave} from '../han/engine.js?v=born-portraits-eleven-1';
import {placeEasternTrade,advanceEasternMarkets} from '../han/markets.js?v=born-portraits-eleven-1';
import {propose,setRelation} from '../han/frontier.js?v=born-portraits-eleven-1';
import {COMMODITIES} from '../market-goods.js?v=born-portraits-eleven-1';
import {advanceDate} from '../han/util.js?v=born-portraits-eleven-1';

test('livestock, copper, woollen cloth and jade have measured regional markets in old saves',()=>{
 const roman=newGame('caesar'),romanCash=roman.factions.caesar.treasury;
 for(const market of Object.values(roman.markets.regions))for(const good of ['livestock','copper','wool','jade'])delete market.goods[good];
 const restored=upgradeSave(structuredClone(roman));
 assert.equal(restored.factions.caesar.treasury,romanCash);
 assert.ok(restored.markets.regions.numidia.goods.livestock.production>0);
 assert.ok(restored.markets.regions.media.goods.copper.production>0);
 assert.ok(restored.markets.regions.galatia.goods.wool.production>0);
 assert.equal(restored.markets.regions.syria.goods.jade.stock,0);
 const han=newHanGame('han',{seed:49}),hanCash=han.factions.han.treasury;
 for(const market of Object.values(han.tradeMarkets.regions))for(const good of ['livestock','copper','wool','jade'])delete market.goods[good];
 const loaded=loadHanSave(structuredClone(han));
 assert.equal(loaded.factions.han.treasury,hanCash);
 assert.ok(loaded.tradeMarkets.regions.yutian.goods.jade.production>0);
 assert.ok(loaded.tradeMarkets.regions.kangju.goods.wool.production>0);
 assert.ok(loaded.tradeMarkets.regions.henan.goods.copper.production>0);
 assert.equal(loaded.tradeMarkets.regions.dunhuang.goods.jade.stock,0);
 for(const good of ['livestock','copper','wool','jade'])assert.ok(COMMODITIES[good].unit[0]&&COMMODITIES[good].unit[1]);
});

test('Yutian jade reaches a Han market only after paid desert transport',()=>{
 let s=newHanGame('han',{seed:49});
 const request={seller:'yutian',buyer:'han',origin:'yutian',destination:'dunhuang',commodity:'jade',quantity:2};
 assert.equal(placeEasternTrade(s,request).reason,'access');
 setRelation(s,'han','yutian',70);
 assert.equal(propose(s,'han','yutian','market').proposal.status,'accepted');
 const source=s.tradeMarkets.regions.yutian.goods.jade,destination=s.tradeMarkets.regions.dunhuang.goods.jade;
 const beforeSource=source.stock,beforeDestination=destination.stock,beforeCash=s.factions.han.treasury;
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true,placed.reason);
 assert.equal(source.stock,beforeSource-2);
 assert.equal(destination.stock,beforeDestination);
 assert.equal(s.factions.han.treasury,beforeCash-placed.quote.total);
 assert.deepEqual(placed.shipment.path,['yutian','shanshan','dunhuang']);
 s=loadHanSave(structuredClone(s));
 for(let i=0;i<placed.quote.months;i++){advanceDate(s);advanceEasternMarkets(s)}
 const shipment=s.tradeMarkets.shipments.find(x=>x.id===placed.shipment.id);
 assert.equal(shipment.status,'delivered');
 assert.equal(s.tradeMarkets.regions.dunhuang.goods.jade.stock,beforeDestination+2);
 assert.equal(s.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id).length,1);
 assert.ok(s.tradeMarkets.transactions.find(x=>x.shipment===shipment.id).tariffs.some(x=>x.owner==='shanshan'));
});
