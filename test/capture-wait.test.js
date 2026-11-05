import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForMapIdle} from '../map-lab/capture-wait.js';

function fakeMap(){
 let listener=null;
 return {once:(event,fn)=>{assert.equal(event,'idle');listener=fn},off:(event,fn)=>{assert.equal(event,'idle');if(listener===fn)listener=null},triggerRepaint(){},idle(){listener?.()},hasListener:()=>!!listener};
}
test('capture proceeds when the map becomes idle',async()=>{
 const map=fakeMap(),waiting=waitForMapIdle(map,100);assert.equal(map.hasListener(),true);map.idle();assert.equal(await waiting,true);assert.equal(map.hasListener(),false);
});
test('capture does not hang when map data never settles',async()=>{
 const map=fakeMap();assert.equal(await waitForMapIdle(map,10),false);assert.equal(map.hasListener(),false);
});
