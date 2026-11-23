import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=peace-sender-1';
import {fictionalPortraitKey} from '../portrait-registry.js?v=peace-sender-1';

test('opening portrait identity checks both saved names and rejects contradictory details',()=>{
 let s=newGame('caesar'),id='fictional:1',c=s.world.characters[id],entry=s.world.dynasties.catalog[id];assert.equal(fictionalPortraitKey(s,id),'fictional-varenus');
 c.faction='senate';assert.equal(fictionalPortraitKey(s,id),'fictional-varenus','defection does not change the person');c.faction='caesar';
 entry.name[1]='另一位人物';assert.equal(fictionalPortraitKey(s,id),null);entry.name[1]='普布利乌斯·瓦雷努斯';
 c.sex='female';assert.equal(fictionalPortraitKey(s,id),null);c.sex='male';entry.faction='egypt';assert.equal(fictionalPortraitKey(s,id),null);
 entry.faction='caesar';delete c.sex;delete entry.faction;s=upgradeSave(structuredClone(s));assert.equal(fictionalPortraitKey(s,id),'fictional-varenus','missing legacy fields do not contradict known identity');
});
