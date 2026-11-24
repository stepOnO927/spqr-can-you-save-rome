import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {localDiscoveryLevel,recordLocalDiscovery} from '../local-discovery.js?v=dossier-archive-1';
import {observeArrival,requestControlReport,advanceControlScouts} from '../control-intelligence.js?v=dossier-archive-1';
import {localEntity} from '../local-polities.js';
import {inspectState} from '../inspector-diagnostics.js?v=dossier-archive-1';

test('opening local knowledge distinguishes nearby, public Roman and distant minor polities',()=>{
 const s=newGame('caesar');
 assert.equal(localDiscoveryLevel(s,'caesar','bibracte'),5);
 assert.equal(localDiscoveryLevel(s,'caesar','massilia'),5);
 assert.equal(localDiscoveryLevel(s,'caesar','ravenna-farms'),5);
 assert.equal(localDiscoveryLevel(s,'caesar','brundisium'),3);
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),0);
 assert.equal(localDiscoveryLevel(s,'senate','commagene'),5);
 assert.equal(localDiscoveryLevel(s,'senate','bibracte'),0);
 assert.equal(localDiscoveryLevel(s,'senate','ravenna-farms'),1);
 assert.ok(localEntity(s,'commagene'));
});

test('a traveler report identifies a distant polity only after its reply arrives',()=>{
 const s=newGame('caesar');assert.equal(localDiscoveryLevel(s,'caesar','commagene'),0);
 assert.equal(requestControlReport(s,'syria').ok,true);s.world.intelSeed=1000;
 s.month=2;advanceControlScouts(s);s.month=3;advanceControlScouts(s);
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),0);
 s.month=4;advanceControlScouts(s);assert.equal(localDiscoveryLevel(s,'caesar','commagene'),0);
 s.month=5;advanceControlScouts(s);
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),3);
 assert.equal(s.localDiscovery.caesar.commagene.source,'travelers');
});

test('physical arrival surveys local places without broadcasting them to rivals',()=>{
 const s=newGame('caesar');observeArrival(s,'caesar','syria');
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),4);
 assert.equal(localDiscoveryLevel(s,'numidia','commagene'),0);
 assert.equal(recordLocalDiscovery(s,'caesar','commagene',2,'older_rumor'),false);
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),4);
});

test('save migration retains discovery and does not invent foreign local history',()=>{
 const old=newGame('caesar');delete old.localDiscovery;
 let s=upgradeSave(structuredClone(old));
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),0);
 observeArrival(s,'caesar','syria');s=upgradeSave(structuredClone(s));
 assert.equal(localDiscoveryLevel(s,'caesar','commagene'),4);
 assert.equal(localDiscoveryLevel(s,'senate','bibracte'),0);
});

test('the Inspector catches forged local discovery without changing the save',()=>{
 const s=newGame('caesar'),before=structuredClone(s.localDiscovery);
 s.localDiscovery.caesar.commagene={level:9,year:s.year,month:s.month,source:'forged'};
 assert.ok(inspectState(s).some(item=>item.code==='invalid-local-discovery'&&item.path==='localDiscovery.caesar.commagene'));
 assert.deepEqual(s.localDiscovery.caesar.commagene,{level:9,year:s.year,month:s.month,source:'forged'});
 s.localDiscovery=before;
 assert.equal(inspectState(s).some(item=>item.code==='invalid-local-discovery'),false);
});
