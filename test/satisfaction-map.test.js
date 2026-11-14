import test from 'node:test';
import assert from 'node:assert/strict';
import {satisfactionForOutline} from '../map-lab/satisfaction-map.js?v=cursus-portraits-1';

const region=(owner,satisfaction)=>({owner,population:{satisfaction}});
test('satisfaction color represents only own theaters and averages shared outlines',()=>{
 const a=region('caesar',80),b=region('caesar',40),foreign=region('senate',5);
 assert.deepEqual(satisfactionForOutline([a,b,foreign],'caesar'),{kind:'known',value:60,color:'#c2aa6b'});
 foreign.population.satisfaction=100;assert.deepEqual(satisfactionForOutline([a,b,foreign],'caesar'),{kind:'known',value:60,color:'#c2aa6b'});
 assert.equal(satisfactionForOutline([foreign],'caesar').kind,'foreign');
 assert.equal(satisfactionForOutline([region('caesar',30)],'caesar').color,'#b36250');
 assert.equal(satisfactionForOutline([region('caesar',65)],'caesar').color,'#83a487');
});
test('missing or invalid own values do not silently become an average or reveal a foreign value',()=>{
 assert.deepEqual(satisfactionForOutline([region('caesar',70),{owner:'caesar'},region('senate',0)],'caesar'),{kind:'unknown',value:null,color:'#848381'});
 assert.equal(satisfactionForOutline([region('caesar',NaN)],'caesar').kind,'unknown');
 assert.equal(satisfactionForOutline([region('caesar',101)],'caesar').kind,'unknown');
});
