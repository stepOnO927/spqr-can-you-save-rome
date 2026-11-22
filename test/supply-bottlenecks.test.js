import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,army,region} from '../engine.js';
import {armySupply,encircled,supplyBottlenecks} from '../grand-operations.js';

function narrowFront(){
 const s=newGrandGame('caesar');
 for(const site of s.regions)if(site.owner==='caesar')site.owner='senate';
 for(const id of ['cisalpine','t005','t008'])region(s,id).owner='caesar';
 army(s,'xiii').region='t008';
 return s;
}

test('the sole supply port and its road corridor are both critical to a connected field army',()=>{
 const s=narrowFront(),unit=army(s,'xiii');
 assert.ok(armySupply(s,unit)>=.5);
 assert.deepEqual([...supplyBottlenecks(s,'caesar')].sort(),['cisalpine','t005']);
 region(s,'cisalpine').owner='senate';
 assert.equal(encircled(s,unit),true);
 assert.ok(armySupply(s,unit)<.5,'the source loss must reduce actual army supply');
 const route=narrowFront(),front=army(route,'xiii');
 region(route,'t005').owner='senate';
 assert.equal(encircled(route,front),true);
 assert.ok(armySupply(route,front)<.5,'the corridor loss must also reduce actual army supply');
});

test('a local granary removes false bottlenecks and an already stranded force creates none',()=>{
 const s=narrowFront();region(s,'t008').buildings.push('granary');
 assert.deepEqual([...supplyBottlenecks(s,'caesar')],[],'an independent source at the army removes the port and corridor dependency');
 const isolated=narrowFront();region(isolated,'t005').owner='senate';
 assert.deepEqual([...supplyBottlenecks(isolated,'caesar')],[],'an already cut-off army cannot create a new prospective bottleneck');
});
