import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=letter-cost-1';
import {HANDOFF_KEY,stageHandoff,receiveHandoff} from '../view-handoff.js';
import {CHARACTER_CATALOG} from '../characters.js?v=safe-save-1';

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

test('Han campaigns transfer between campaign and atlas with their named commanders',()=>{
 const storage=memoryStorage(),state=newGame('han');
 const commander=state.armies.find(a=>a.id==='hanCapitalGuard').characterId;
 stageHandoff(storage,state,'atlas');
 const atlas=receiveHandoff(storage,'atlas',upgradeSave);
 assert.equal(atlas.player,'han');
 assert.equal(atlas.armies.find(a=>a.id==='hanCapitalGuard').characterId,commander);
 stageHandoff(storage,atlas,'campaign');
 const campaign=receiveHandoff(storage,'campaign',upgradeSave);
 assert.equal(campaign.player,'han');
 assert.equal(campaign.world.dynasties.catalog[commander].fictional,true);
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

test('failed migration and failed transfer consumption restore the active fictional catalog',()=>{
 const active=newGame('caesar'),original=CHARACTER_CATALOG['fictional:1'].name[0],broken=JSON.parse(JSON.stringify(active));broken.world.dynasties.catalog['fictional:1'].name=['Wrong save','错误存档人物'];broken.agreements={};
 assert.throws(()=>upgradeSave(broken));assert.equal(CHARACTER_CATALOG['fictional:1'].name[0],original);
 const candidate=JSON.parse(JSON.stringify(active));candidate.world.dynasties.catalog['fictional:1'].name=['Wrong transfer','错误转移人物'];const storage=memoryStorage();stageHandoff(storage,candidate,'atlas');storage.removeItem=()=>{throw Error('blocked')};
 assert.equal(receiveHandoff(storage,'atlas',upgradeSave),null);assert.equal(CHARACTER_CATALOG['fictional:1'].name[0],original);assert.ok(storage.getItem(HANDOFF_KEY));
});

test('a transfer missing the selected faction is rejected before migration',()=>{
 const active=newGame('caesar'),storage=memoryStorage(),invalid=JSON.parse(JSON.stringify(active));delete invalid.factions.caesar;stageHandoff(storage,invalid,'atlas');let called=false;
 assert.equal(receiveHandoff(storage,'atlas',()=>{called=true;throw Error('must not migrate')}),null);assert.equal(called,false);
});

