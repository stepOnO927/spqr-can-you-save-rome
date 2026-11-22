import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,army,region,upgradeSave} from '../engine.js';
import {encircled,armySupply,strategicRetreat,advanceOperationalState} from '../grand-operations.js';

test('strategic retreat cannot chain across friendly territory or reset on save reload',()=>{
 const s=newGrandGame('caesar'),unit=army(s,'xiii');unit.region='t034';
 const first=strategicRetreat(s,unit.id,'t035');
 assert.equal(first.ok,true);assert.equal(first.moraleCost,4);assert.equal(unit.region,'t035');
 assert.equal(strategicRetreat(s,unit.id,'t037').reason,'already-retreated');
 assert.equal(unit.region,'t035');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(strategicRetreat(restored,unit.id,'t037').reason,'already-retreated');
 restored.month+=1;
 assert.equal(strategicRetreat(restored,unit.id,'t037').ok,true);
 assert.equal(army(restored,unit.id).region,'t037');
});

test('an isolated army can withdraw within its friendly pocket but cannot cross enemy ground',()=>{
 const s=newGrandGame('caesar'),unit=army(s,'xiii');
 for(const site of s.regions)if(site.owner==='caesar')site.owner='senate';
 for(const id of ['t034','t035'])region(s,id).owner='caesar';
 unit.region='t034';unit.men=5000;unit.morale=70;
 assert.equal(encircled(s,unit),true);assert.ok(armySupply(s,unit)<.5);
 assert.equal(strategicRetreat(s,unit.id,'t033').ok,false);
 const retreat=strategicRetreat(s,unit.id,'t035');
 assert.deepEqual({ok:retreat.ok,moraleCost:retreat.moraleCost,stillCutOff:retreat.stillCutOff},{ok:true,moraleCost:8,stillCutOff:true});
 assert.equal(unit.morale,62);
 advanceOperationalState(s);
 assert.equal(unit.men,4700,'a move within the pocket does not restore the supply line');
 region(s,'t034').owner='senate';s.month+=1;
 assert.equal(strategicRetreat(s,unit.id,'t034').ok,false,'enemy occupation closes the only land exit');
});

test('an army already marching or besieging cannot teleport by retreat',()=>{
 const s=newGrandGame('caesar'),unit=army(s,'xiii');unit.region='t034';
 unit.move={to:'t035',remaining:1};assert.equal(strategicRetreat(s,unit.id,'t035').ok,false);
 unit.move=null;unit.siege={regionId:'t035',remaining:1};assert.equal(strategicRetreat(s,unit.id,'t035').ok,false);
 assert.equal(unit.region,'t034');
});
