import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=missing-fate-privacy-1';
import {placeTradeOrder} from '../trade-markets.js?v=faces-wheels-1';
import {proposeAgreement} from '../agreements.js?v=agreement-courier-1';
import {buildTradeMapView} from '../trade-map-view.js?v=faces-wheels-1';

const points={cisalpine:[11.6,44.75],narbo:[3.3,43.4],roma:[12.45,42.1],hanGuanzhong:[108.95,34.27],hanHexi:[94.66,40.14],shanshanOasis:[89.5,40.5],media:[48.518,34.804],parthia:[44.5,33.1]};

test('trade map projects owned markets and paid shipments without foreign inventory',()=>{
 let s=newGame('caesar');const order=placeTradeOrder(s,{seller:'caesar',buyer:'caesar',origin:'cisalpine',destination:'narbo',commodity:'grain',quantity:1});
 assert.equal(order.ok,true);
 s.markets.regions.roma.goods.grain.stock=987654;
 s.markets.shipments.push({id:'foreign-secret',seller:'senate',buyer:'egypt',status:'traveling',commodity:'silk',quantity:999,legs:[{from:'roma',to:'narbo',months:2}],leg:0,remaining:1});
 let view=buildTradeMapView(s,'caesar',points);
 assert.ok(view.corridors.features.some(x=>x.properties.from==='narbo'&&x.properties.to==='cisalpine'));
 assert.deepEqual(view.markets.map(x=>x.id).sort(),['cisalpine','narbo']);
 assert.equal(view.shipments.length,1);assert.equal(view.shipments[0].id,order.shipment.id);
 assert.equal(view.routes.features.length,1);
 assert.doesNotMatch(JSON.stringify(view),/987654|foreign-secret|999/);
 s=upgradeSave(structuredClone(s));view=buildTradeMapView(s,'caesar',points);
 assert.equal(view.shipments[0].id,order.shipment.id);
});

test('Silk Road route uses real intermediate coordinates and a blocked own caravan stays marked',()=>{
 const s=newGame('han');s.relations['han:parthia']=45;assert.equal(proposeAgreement(s,'han','parthia','trade').ok,true);
 const placed=placeTradeOrder(s,{seller:'han',buyer:'parthia',origin:'hanGuanzhong',destination:'parthia',commodity:'silk',quantity:1});assert.equal(placed.ok,true);
 placed.shipment.remaining=1;
 const view=buildTradeMapView(s,'han',points);
 assert.equal(view.routes.features.length,placed.shipment.legs.length);
 assert.ok(view.routes.features.some(f=>f.geometry.coordinates.some(([lon,lat])=>lon===84.6&&lat===41.75)));
 assert.ok(view.shipments[0].point[0]<points.hanGuanzhong[0]);
 placed.shipment.status='blocked';const blocked=buildTradeMapView(s,'han',points);
 assert.equal(blocked.shipments[0].status,'blocked');
 assert.deepEqual(blocked.shipments[0].point,points.hanGuanzhong);
});
