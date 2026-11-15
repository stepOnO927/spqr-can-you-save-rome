import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';
import {portZone} from '../naval.js';
import {maritimeMapIntel} from '../map-lab/maritime-map-intel.js';

test('maritime map shows observed hazards, own logistics and port closure without leaking hidden pirates',()=>{
 const state=newGrandGame('senate'),owner=state.player,month=state.month,year=state.year;
 assert.equal(maritimeMapIntel(state,owner).hazards.length,0,'live pirate groups are not public sightings');
 const own=state.naval.fleets.find(fleet=>fleet.owner===owner),enemy=state.naval.fleets.find(fleet=>fleet.owner==='caesar');
 own.order={kind:'supply',targetPort:'italiaS',cargo:12,path:[]};
 enemy.port=null;enemy.zone=portZone('italiaS');enemy.order={kind:'blockade',targetPort:'italiaS',path:[]};
 state.naval.fleets.push({...own,id:'senate-test-blockade',port:null,zone:portZone('cisalpine'),order:{kind:'blockade',targetPort:'cisalpine',path:[]}});
 state.naval.reports.push({kind:'pirate-raid',owner,zone:'adriatic',year,month},{kind:'pirate-raid',owner:'caesar',zone:'eastern',year,month});
 const data=maritimeMapIntel(state,owner);
 assert.ok(data.ports.find(port=>port.id==='italiaS')?.blockaded);
 assert.deepEqual(data.convoys.map(convoy=>({port:convoy.port,cargo:convoy.cargo})),[{port:'italiaS',cargo:12}]);
 assert.ok(data.blockades.some(blockade=>blockade.port==='cisalpine'&&blockade.fleetId==='senate-test-blockade'));
 assert.deepEqual(data.hazards.map(hazard=>hazard.zone),['adriatic']);
 assert.ok(data.ports.find(port=>port.id==='italiaS')?.facilities.includes('shipyard'));
 assert.equal(JSON.stringify(data).includes('caesar-adriatic'),false,'enemy fleet identity remains private');
 state.month+=4;
 assert.deepEqual(maritimeMapIntel(state,owner).hazards,[],'old hazard reports expire from the map');
});

test('trade lanes and danger status use only current player ports and their dated commerce',()=>{
 const state=newGrandGame('senate'),route=state.naval.routes.find(item=>item.id==='egypt-italy');
 route.last={buyer:'egypt',seller:'caesar',reason:'piracy',zone:'eastern',year:state.year,month:state.month};
 let data=maritimeMapIntel(state,'senate');
 assert.equal(data.routes.find(item=>item.id===route.id)?.status,'unknown');
 assert.equal(data.hazards.some(item=>item.zone==='eastern'),false);
 route.last={buyer:'senate',seller:'egypt',reason:'piracy',zone:'adriatic',year:state.year,month:state.month};
 data=maritimeMapIntel(state,'senate');
 assert.equal(data.routes.find(item=>item.id===route.id)?.status,'piracy');
 assert.ok(data.hazards.some(item=>item.zone==='adriatic'));
 state.month+=4;
 assert.equal(maritimeMapIntel(state,'senate').routes.find(item=>item.id===route.id)?.status,'unknown');
});
