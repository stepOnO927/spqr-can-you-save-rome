import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=imperium-1';
import {HANDOFF_KEY,stageHandoff,receiveHandoff} from '../view-handoff.js';

function memoryStorage() {
  const values=new Map();
  return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}

test('switching views preserves the entire campaign without touching save slots',()=>{
  const storage=memoryStorage(), state=newGame('senate');
  state.month=8;
  state.extraHandoffCheck={pendingLetter:{status:'in transit'},secret:'world and knowledge'};
  storage.setItem('spqr-save-3','existing save');
  stageHandoff(storage,state,'atlas');
  assert.equal(receiveHandoff(storage,'campaign',upgradeSave),null);
  const received=receiveHandoff(storage,'atlas',upgradeSave);
  assert.equal(received.player,'senate');
  assert.equal(received.month,8);
  assert.deepEqual(received.extraHandoffCheck,state.extraHandoffCheck);
  assert.equal(storage.getItem('spqr-save-3'),'existing save');
  assert.equal(storage.getItem(HANDOFF_KEY),null);
  assert.equal(receiveHandoff(storage,'atlas',upgradeSave),null);
});

test('invalid transfers are not consumed and storage failures do not appear successful',()=>{
  const storage=memoryStorage();
  storage.setItem(HANDOFF_KEY,'{invalid');
  assert.equal(receiveHandoff(storage,'atlas',upgradeSave),null);
  assert.equal(storage.getItem(HANDOFF_KEY),'{invalid');
  storage.setItem(HANDOFF_KEY,JSON.stringify({target:'atlas',state:{player:'egypt',regions:[],armies:[],factions:{}}}));
  assert.equal(receiveHandoff(storage,'atlas',upgradeSave),null);
  assert.throws(()=>stageHandoff({setItem(){throw Error('storage blocked')}},newGame(),'atlas'),/storage blocked/);
});

