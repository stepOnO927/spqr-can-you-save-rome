import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,army,upgradeSave} from '../engine.js';
import {advanceOperationalState,holdPosition} from '../grand-operations.js';

test('repeating a hold order preserves accumulated defensive preparation across reload',()=>{
 const state=newGrandGame('caesar'),unit=army(state,'xiii');
 assert.equal(holdPosition(state,unit.id).ok,true);
 for(let month=0;month<3;month++)advanceOperationalState(state);
 assert.equal(unit.prepared,3);
 assert.equal(holdPosition(state,unit.id).ok,true);
 assert.equal(unit.prepared,3);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(state))),restored=army(loaded,unit.id);
 assert.equal(restored.prepared,3);
 assert.equal(holdPosition(loaded,restored.id).ok,true);
 assert.equal(restored.prepared,3);
});
