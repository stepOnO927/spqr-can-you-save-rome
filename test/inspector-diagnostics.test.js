import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {newHanGame} from '../han/engine.js';
import {isLiuClan} from '../han/dynasty.js';
import {inspectState,startupDiagnostics} from '../inspector-diagnostics.js';

test('fresh Roman and Han campaigns pass fatal startup invariants',()=>{
 for(const player of ['caesar','senate']){
  const state=newGame(player),before=JSON.stringify(state);
  assert.deepEqual(startupDiagnostics(state).fatal,[]);
  assert.equal(JSON.stringify(state),before,'diagnostics must not mutate the campaign');
 }
 const han=newHanGame('han',{seed:49049});
 assert.deepEqual(startupDiagnostics(han,{mode:'han',isLiuClan}).fatal,[]);
});
test('reports invalid owners, units and commander references with paths',()=>{
 const state=newGame();
 state.regions[0].owner='missing';
 state.armies[0].men=-1;
 state.armies[0].characterId='missing';
 const report=inspectState(state);
 assert.ok(report.some(x=>x.code==='invalid-owner'&&x.path==='regions[0].owner'));
 assert.ok(report.some(x=>x.code==='invalid-troops'&&x.path==='armies[0].men'));
 assert.ok(report.some(x=>x.code==='invalid-commander'&&x.path==='armies[0].characterId'));
});
test('a non-Liu save edit is a fatal diagnostic',()=>{
 const han=newHanGame('han',{seed:49049});
 han.throne.orthodox='shi-gao';
 assert.ok(inspectState(han,{mode:'han',isLiuClan}).some(x=>x.code==='non-liu-orthodox'&&x.severity==='fatal'));
});
test('JSON save roundtrip preserves valid state for the diagnostic',()=>{
 const roman=JSON.parse(JSON.stringify(newGame()));
 const han=JSON.parse(JSON.stringify(newHanGame('han',{seed:49049})));
 assert.deepEqual(startupDiagnostics(roman).fatal,[]);
 assert.deepEqual(startupDiagnostics(han,{mode:'han',isLiuClan}).fatal,[]);
});
