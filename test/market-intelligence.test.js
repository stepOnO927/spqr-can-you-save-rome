import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=marriage-economy-merge-1';
import {proposeAgreement} from '../agreements.js?v=agreement-courier-1';
import {placeTradeOrder,advanceMarkets} from '../trade-markets.js?v=faces-wheels-1';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=marriage-economy-merge-1';
import {propose} from '../han/frontier.js?v=han-1';
import {placeEasternTrade,advanceEasternMarkets} from '../han/markets.js?v=faces-wheels-1';
import {ownMarketIntelligence} from '../trade-intelligence.js?v=faces-wheels-1';

test('a Roman buyer keeps a dated foreign quote and supply band without a live warehouse leak',()=>{
 let s=newGame('armenia');s.relations['armenia:parthia']=45;
 assert.equal(proposeAgreement(s,'armenia','parthia','trade').ok,true);
 const order=placeTradeOrder(s,{seller:'parthia',buyer:'armenia',origin:'parthia',destination:'armenia',commodity:'horses',quantity:2});
 assert.equal(order.ok,true);
 const report=order.shipment.marketObservation;
 assert.equal(report.unitPrice,order.quote.unitPrice);assert.equal(report.year,-49);
 assert.ok(['scarce','adequate','surplus'].includes(report.supply));
 assert.equal(Object.hasOwn(report,'stock'),false);
 s=upgradeSave(structuredClone(s));s.markets.regions.parthia.goods.horses.stock=999999;
 assert.equal(ownMarketIntelligence(s.markets,'armenia').observations[0].supply,report.supply);
 assert.deepEqual(ownMarketIntelligence(s.markets,'caesar').observations,[]);
});

test('a Han buyer keeps its observed foreign quote and only its own caravan disruption',()=>{
 let s=newHanGame('han',{seed:49});s.tradeMarkets.embeddedRoman=true;
 assert.equal(propose(s,'han','kangju','market').proposal.status,'accepted');
 const order=placeEasternTrade(s,{seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1});
 assert.equal(order.ok,true);
 assert.equal(order.shipment.marketObservation.unitPrice,order.quote.unitPrice);
 assert.equal(Object.hasOwn(order.shipment.marketObservation,'stock'),false);
 order.shipment.status='blocked';order.shipment.blockedAt=s.year*12+s.month;
 s=loadHanSave(serialize(s));
 const report=ownMarketIntelligence(s.tradeMarkets,'han');
 assert.equal(report.observations.length,1);assert.equal(report.disruptions.length,1);
 assert.deepEqual([report.disruptions[0].year,report.disruptions[0].month],[-49,1]);
 assert.deepEqual(ownMarketIntelligence(s.tradeMarkets,'parthia'),{observations:[],disruptions:[]});
});

test('Roman route closure leaves one persistent dated disruption through settlement and load',()=>{
 let s=newGame('armenia');s.relations['armenia:parthia']=45;
 assert.equal(proposeAgreement(s,'armenia','parthia','trade').ok,true);
 const order=placeTradeOrder(s,{seller:'parthia',buyer:'armenia',origin:'parthia',destination:'armenia',commodity:'horses',quantity:1});
 assert.equal(order.ok,true);s.wars.push(['armenia','parthia']);
 for(let i=0;i<13;i++){if(++s.month>12){s.month=1;s.year++}advanceMarkets(s)}
 assert.equal(order.shipment.status,'stranded');assert.equal(order.shipment.routeDisruptions.length,1);
 s=upgradeSave(structuredClone(s));
 const report=ownMarketIntelligence(s.markets,'armenia');
 assert.equal(report.disruptions.length,1);
 assert.deepEqual([report.disruptions[0].year,report.disruptions[0].month],[-49,2]);
});

test('Han route closure leaves one persistent dated disruption through settlement and load',()=>{
 let s=newHanGame('han',{seed:51});s.tradeMarkets.embeddedRoman=true;
 assert.equal(propose(s,'han','kangju','market').proposal.status,'accepted');
 const order=placeEasternTrade(s,{seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1});
 assert.equal(order.ok,true);s.wars.push(['han','kangju']);
 for(let i=0;i<13;i++){if(++s.month>12){s.month=1;s.year++}advanceEasternMarkets(s)}
 assert.equal(order.shipment.status,'stranded');assert.equal(order.shipment.routeDisruptions.length,1);
 s=loadHanSave(serialize(s));
 const report=ownMarketIntelligence(s.tradeMarkets,'han');
 assert.equal(report.disruptions.length,1);
 assert.deepEqual([report.disruptions[0].year,report.disruptions[0].month],[-49,2]);
});
