import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region,adjacent,upgradeSave} from '../engine.js?v=inheritance-fix-1';
import {reportedControl} from '../control-intelligence.js';
import historical from '../historical-territories.js';

test('eastern theaters share the sourced realm outline without asserting an internal border',()=>{
 const s=newGame();
 for(const [realm,child] of [['egypt','egyptUpper'],['parthia','media']]){
  assert.equal(region(s,realm).owner,realm);assert.equal(region(s,child).owner,realm);
  assert.ok(adjacent(realm).some(x=>x.to===child));
  const shape=historical.features.find(f=>f.properties.id===realm);
  assert.ok(shape.properties.regions.includes(realm));assert.ok(shape.properties.regions.includes(child));
 }
 assert.equal(region(s,'egypt').food+region(s,'egyptUpper').food,9);
 assert.equal(region(s,'egypt').tax+region(s,'egyptUpper').tax,8);
 assert.equal(region(s,'parthia').food+region(s,'media').food,5);
 assert.equal(region(s,'parthia').tax+region(s,'media').tax,6);
});
test('old campaigns acquire operational theaters without changing control or exposing hidden changes',()=>{
 let s=newGame('caesar');s.regions=s.regions.filter(r=>!['egyptUpper','media'].includes(r.id));
 const e=region(s,'egypt'),p=region(s,'parthia');e.food=9;e.tax=8;e.owner='senate';p.food=5;p.tax=6;p.owner='egypt';
 for(const reports of Object.values(s.controlKnowledge)){delete reports.egyptUpper;delete reports.media}
 s.controlKnowledge.caesar.egypt={owner:'egypt',year:-49,month:1};s.controlKnowledge.caesar.parthia={owner:'parthia',year:-49,month:1};
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(region(s,'egyptUpper').owner,'senate');assert.equal(region(s,'media').owner,'egypt');
 assert.equal(region(s,'egypt').food+region(s,'egyptUpper').food,9);assert.equal(region(s,'parthia').tax+region(s,'media').tax,6);
 assert.deepEqual(reportedControl(s,'caesar','egyptUpper'),{owner:'egypt',year:-49,month:1});assert.deepEqual(reportedControl(s,'caesar','media'),{owner:'parthia',year:-49,month:1});
 const snapshot=JSON.stringify(s.regions);upgradeSave(s);assert.equal(JSON.stringify(s.regions),snapshot);
});
