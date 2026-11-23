import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=official-inquiries-1';
import {localEntity,localEntityRevenue,localContactQuote,offerLocalContact,localSiegeQuote,besiegeLocalEntity,localAdministrationQuote,startLocalAdministration,advanceLocalEntities} from '../local-polities.js';
import {footholdQuote,startFoothold,advanceFootholds} from '../foothold.js';
import {inspectState} from '../inspector-diagnostics.js?v=official-inquiries-1';

test('Commagene begins as an independent sourced microstate, separate from Syria',()=>{
 const state=newGame('senate'),city=localEntity(state,'commagene');
 assert.equal(city.type,'microstate');assert.equal(city.controller,'commagene');assert.equal(city.legalSovereign,'commagene');
 assert.equal(city.ruler.id,'commagene-antiochus-i');assert.deepEqual(city.coordinates,[38.471342,37.564519]);
 assert.equal(state.regions.find(region=>region.id==='syria').owner,'senate');
 assert.equal(state.regions.some(region=>region.id==='commagene'),false);
 assert.equal(localContactQuote(state,'commagene','senate','access').ok,true);
 assert.equal(inspectState(state).filter(item=>item.code.startsWith('invalid-local')).length,0);
 const saved=upgradeSave(JSON.parse(JSON.stringify(state)));
 assert.equal(localEntity(saved,'commagene').ruler.id,city.ruler.id);
 const legacy=JSON.parse(JSON.stringify(state));legacy.regions.find(region=>region.id==='syria').localEntities=[];
 assert.equal(localEntity(upgradeSave(legacy),'commagene'),null);
});

test('Samosata can receive a delayed offer or be occupied without annexing its host theater',()=>{
 const state=newGame('senate'),city=localEntity(state,'commagene'),army=state.armies.find(unit=>unit.owner==='senate');
 const initialRevenue=localEntityRevenue(state,'senate');
 assert.equal(offerLocalContact(state,city.id,'senate','access').ok,true);
 assert.equal(city.pending.remaining,2);
 city.pending=null;army.region='syria';army.move=null;
 assert.equal(localSiegeQuote(state,city.id,army.id,'senate').ok,true);
 assert.equal(besiegeLocalEntity(state,city.id,army.id,'senate').ok,true);
 for(let i=0;i<3;i++){state.month++;advanceLocalEntities(state)}
 assert.equal(city.controller,'senate');assert.equal(city.legalSovereign,'commagene');
 assert.equal(state.regions.find(region=>region.id==='syria').owner,'senate');
 assert.equal(localEntityRevenue(state,'senate'),initialRevenue+1);
 assert.equal(localAdministrationQuote(state,city.id,'senate').ok,true);
 assert.equal(startLocalAdministration(state,city.id,'senate').ok,true);
 assert.equal(footholdQuote(state,city.id,'senate').ok,true);
 assert.equal(startFoothold(state,city.id,'senate').ok,true);
 advanceFootholds(state);assert.equal(city.foothold.level,1);
 for(let i=0;i<2;i++){state.month++;advanceLocalEntities(state)}
 assert.equal(city.administrativeStatus,'administered');
 assert.equal(localEntityRevenue(state,'senate'),initialRevenue+2);
});

test('nonplayer Senate seeks local access at its eastern frontier',()=>{
 const state=newGame('caesar');tick(state);
 const city=localEntity(state,'commagene');
 assert.equal(city.pending?.actor,'senate');assert.equal(city.pending?.proposal,'access');
});
