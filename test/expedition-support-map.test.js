import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, startExpedition, upgradeSave} from '../engine.js';
import {localEntity} from '../local-polities.js';
import {proposeAgreement} from '../agreements.js?v=dossier-archive-1';
import {expeditionSupportMap} from '../map-lab/expedition-support-map.js';
import {planRoutes} from '../route-planner.js';

const coordinates={cisalpine:[11.6,44.75],narbo:[3.3,43.4],gaul:[4.5,47.54],egypt:[29.92,31.2],egyptUpper:[32.632,25.665],parthia:[44.5,33.1]};

test('own depot, in-transit food and expedition order appear without changing the save',()=>{
 const state=newGame('caesar'),farm=localEntity(state,'ravenna-farms');
 farm.foothold={owner:'caesar',level:1,stockFood:4,shipments:[{id:'shipment-1',owner:'caesar',food:2,route:['cisalpine'],remaining:1}]};
 assert.equal(startExpedition(state,'xiii',['cisalpine','narbo','gaul']).ok,true);
 const before=JSON.stringify(state),view=expeditionSupportMap(state,coordinates);
 assert.equal(JSON.stringify(state),before);
 assert.ok(view.entries.some(entry=>entry.kind==='depot'&&entry.id===farm.id&&entry.food===4));
 assert.ok(view.entries.some(entry=>entry.kind==='objective'&&entry.theaterId==='gaul'));
 assert.ok(view.points.features.some(item=>item.properties.kind==='objective'));
 assert.ok(view.lines.features.some(item=>item.properties.kind==='expedition'));
 assert.deepEqual(expeditionSupportMap(upgradeSave(structuredClone(state)),coordinates).entries,view.entries);
});

test('a saved town objective uses its own site point and name in the expedition map',()=>{
 const state=newGame('caesar'),town=localEntity(state,'corfinium');
 const route=planRoutes(state,'viii','italiaS').routes.find(item=>item.status==='legal').nodes;
 assert.equal(startExpedition(state,'viii',route,state.player,{localObjectiveId:town.id}).ok,true);
 const saved=upgradeSave(structuredClone(state)),view=expeditionSupportMap(saved,coordinates);
 const marker=view.points.features.find(item=>item.properties.kind==='objective'&&item.properties.id==='viii');
 assert.deepEqual(marker.geometry.coordinates,town.coordinates);
 assert.equal(marker.properties.localObjectiveId,town.id);
 assert.deepEqual(view.entries.find(item=>item.kind==='objective'&&item.id==='viii').localGoalName,town.name);
 const army=saved.armies.find(item=>item.id==='viii');
 army.region='italiaS';army.expedition.status='completed';army.expedition.nextIndex=army.expedition.nodes.length;
 const arrived=expeditionSupportMap(saved,coordinates);
 assert.equal(arrived.entries.find(item=>item.kind==='objective'&&item.id==='viii').status,'completed');
 assert.deepEqual(arrived.points.features.find(item=>item.properties.kind==='objective'&&item.properties.id==='viii').geometry.coordinates,town.coordinates);
 army.region='italiaN';
 assert.equal(expeditionSupportMap(saved,coordinates).entries.some(item=>item.kind==='objective'&&item.id==='viii'),false);
 army.region='italiaS';
 localEntity(saved,town.id).controller=saved.player;
 assert.equal(expeditionSupportMap(saved,coordinates).entries.some(item=>item.kind==='objective'&&item.id==='viii'),false);
});

test('severed local rights mark an own depot isolated, and foreign depots stay hidden',()=>{
 const state=newGame('caesar'),port=localEntity(state,'massilia');
 port.access.caesar=state.year*12+state.month+12;
 port.foothold={owner:'caesar',level:1,stockFood:2,shipments:[]};
 let view=expeditionSupportMap(state,coordinates);
 assert.ok(view.entries.some(entry=>entry.kind==='depot'&&entry.id===port.id));
 delete port.access.caesar;
 localEntity(state,'bibracte').foothold={owner:'senate',level:2,stockFood:8,shipments:[]};
 view=expeditionSupportMap(state,coordinates);
 assert.ok(view.entries.some(entry=>entry.kind==='isolated'&&entry.id===port.id));
 assert.equal(view.entries.some(entry=>entry.id==='bibracte'),false);
});

test('access markers require a player treaty and a delivered foreign control report',()=>{
 const state=newGame('caesar');state.relations['caesar:egypt']=70;
 assert.equal(proposeAgreement(state,'caesar','egypt','military_access',{access:{permittedParty:'caesar',permittedTerritories:['egypt']}}).ok,true);
 let view=expeditionSupportMap(state,coordinates);
 assert.ok(view.entries.some(entry=>entry.kind==='access'&&entry.theaterId==='egypt'));
 assert.equal(view.entries.some(entry=>entry.theaterId==='egyptUpper'),false);
 delete state.controlKnowledge.caesar.egypt;
 view=expeditionSupportMap(state,coordinates);
 assert.equal(view.entries.some(entry=>entry.kind==='access'&&entry.theaterId==='egypt'),false);
 state.regions.find(item=>item.id==='parthia').owner='egypt';
 assert.equal(view.entries.some(entry=>entry.kind==='access'&&entry.theaterId==='parthia'),false);
});
