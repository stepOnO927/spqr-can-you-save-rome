import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=faces-reported-names-1';
import {drawMap} from '../han/map.js?v=faces-reported-names-1';
import {propose,setRelation} from '../han/frontier.js?v=faces-reported-names-1';
import {placeEasternTrade} from '../han/markets.js?v=faces-reported-names-1';

const tradeMap=s=>drawMap(s,{mode:'trade',visibleArmy:army=>army.owner===s.player});

test('the eastern trade map shows own markets and known routes without leaking foreign warehouses',()=>{
 const s=newHanGame('han',{seed:57});
 s.tradeMarkets.regions.kangju.goods.horses.stock=987654;
 const initial=tradeMap(s);
 assert.match(initial,/data-market="changan"/);
 assert.match(initial,/trade-market foreign/);
 assert.match(initial,/trade-market foreign port/);
 assert.match(initial,/Foreign stock unknown/);
 assert.match(initial,/Grain \d+ @\d+/);
 assert.doesNotMatch(initial,/987654/);
 setRelation(s,'han','kangju',70);assert.equal(propose(s,'han','kangju','market').proposal.status,'accepted');
 const placed=placeEasternTrade(s,{seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1});
 assert.equal(placed.ok,true,placed.reason);
 const visible=tradeMap(s);
 assert.match(visible,new RegExp(`data-shipment="${placed.shipment.id}"`));
 assert.match(visible,/trade-active/);
 assert.match(visible,/Horses \d+ · (adequate|surplus|scarce)/);
 assert.doesNotMatch(visible,/987654/);
 s.tradeMarkets.shipments.push({...placed.shipment,id:'foreign-secret-caravan',buyer:'parthia',seller:'kangju'});
 assert.doesNotMatch(tradeMap(s),/foreign-secret-caravan/);
 placed.shipment.status='blocked';
 const restored=loadHanSave(serialize(s));
 assert.match(tradeMap(restored),/trade-blocked/);
 assert.match(tradeMap(restored),new RegExp(`data-shipment="${placed.shipment.id}"`));
});
