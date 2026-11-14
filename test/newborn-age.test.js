import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=government-intel-courier-1';
import {createFictionalPerson} from '../dynasties.js?v=portraits-hundred-days-1';
import {ageRange} from '../characters.js?v=succession-ui-recovery-1';

test('a newborn has no negative age, including after loading a save',()=>{
 const state=newGame('caesar');
 const id=createFictionalPerson(state,{name:['Newborn','新生儿'],faction:'caesar',birthYear:state.year});
 assert.deepEqual(ageRange(id,state.year),[0,0]);
 assert.equal(ageRange(id,state.year-1),null);
 assert.deepEqual(ageRange(id,state.year+1),[0,1]);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(ageRange(id,loaded.year),[0,0]);
});
