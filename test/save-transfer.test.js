import test from 'node:test';
import assert from 'node:assert/strict';
import {exportSaves,importSaves} from '../save-transfer.js';

const storage=(initial={})=>{
  const data=new Map(Object.entries(initial));
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),entries:()=>Object.fromEntries(data)};
};
const roman=JSON.stringify({player:'caesar',regions:[{id:'italy'}],armies:[],factions:{caesar:{}}});
const han=JSON.stringify({dlc:'mandate-of-heaven',regions:[],armies:[],factions:{},persons:{},genealogy:{},throne:{},court:{}});

test('transfers main-campaign saves for Han and regional factions without rewriting their identity',()=>{
  const eastern=JSON.stringify({player:'han',regions:[{id:'roma'}],armies:[],factions:{han:{treasury:47}}});
  const egyptian=JSON.stringify({player:'egypt',regions:[{id:'egypt'}],armies:[],factions:{egypt:{treasury:31}}});
  const destination=storage();
  const result=importSaves(exportSaves(storage({'spqr-save-1':eastern,'spqr-save-2':egyptian})),destination);
  assert.deepEqual(result.imported,['spqr-save-1','spqr-save-2']);
  assert.equal(destination.getItem('spqr-save-1'),eastern);
  assert.equal(destination.getItem('spqr-save-2'),egyptian);
});

test('exports only known SPQR saves without changing storage',()=>{
  const source=storage({'spqr-save-1':roman,'spqr-han-save-browser':han,'unrelated-secret':'keep'});
  const bundle=exportSaves(source);
  assert.deepEqual(bundle.saves,{'spqr-save-1':roman,'spqr-han-save-browser':han});
  assert.equal(source.getItem('unrelated-secret'),'keep');
});

test('imports Roman saves into empty slots and preserves occupied slots',()=>{
  const destination=storage({'spqr-save-1':'existing','spqr-legacy-archive':'[{"id":"old"}]'});
  const bundle={format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':roman,'spqr-han-save-browser':han,'spqr-legacy-archive':'[{"id":"old"},{"id":"new"}]'}};
  const result=importSaves(bundle,destination);
  assert.equal(destination.getItem('spqr-save-1'),'existing');
  assert.equal(destination.getItem('spqr-save-2'),roman);
  assert.equal(destination.getItem('spqr-han-save-browser'),han);
  assert.deepEqual(JSON.parse(destination.getItem('spqr-legacy-archive')).map(x=>x.id),['old','new']);
  assert.equal(result.skipped.length,0);
});

test('rejects invalid files and never overwrites full slots',()=>{
  const destination=storage({'spqr-save-1':'one','spqr-save-2':'two','spqr-save-3':'three'});
  assert.throws(()=>importSaves({format:'other',version:1,saves:{}},destination));
  const result=importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':roman,'spqr-han-save-browser':'{}'}},destination);
  assert.equal(result.skipped.length,2);
  assert.deepEqual(destination.entries(),{'spqr-save-1':'one','spqr-save-2':'two','spqr-save-3':'three'});
});
