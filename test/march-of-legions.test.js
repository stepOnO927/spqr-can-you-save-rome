import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region,previewMarch,previewRoute,issueRouteOrder,issueMilitaryOrder,upgradeSave,tick} from '../engine.js';
import {MARCH_CONFIG,MARCH_POINTS,estimateMarchEdge,findMarchPath,marchEdge,terrainFor} from '../march-geography.js';

test('the route graph uses playable theaters and preserves real geography',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 assert.equal(Object.keys(MARCH_POINTS).length,s.regions.length);
 assert.equal(marchEdge('cisalpine','italiaN').bridge,true);
 assert.equal(marchEdge('roma','sicilia'),null);
 assert.ok(terrainFor('gaul').includes('dense_forest'));
 assert.ok(terrainFor('roma').includes('marsh'));
 assert.equal(findMarchPath(s,a,'cisalpine','decorative-polygon').reason,'unknown_terrain');
});

test('terrain, historical roads, river crossings and pace change measured travel',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 const road=estimateMarchEdge(s,a,'italiaN','roma'),forest=estimateMarchEdge(s,a,'gaul','narbo');
 assert.equal(road.road,true);assert.equal(road.bridge,true);assert.equal(forest.terrain,'dense_forest');
 assert.ok(forest.months>=road.months);assert.ok(forest.food>=road.food);
 const normal=estimateMarchEdge(s,a,'cisalpine','narbo'),forced=estimateMarchEdge(s,a,'cisalpine','narbo',{pace:'forced'}),cautious=estimateMarchEdge(s,a,'cisalpine','narbo',{pace:'cautious'});
 assert.ok(forced.months<=normal.months);assert.ok(forced.food>=normal.food);assert.ok(cautious.months>=normal.months);assert.ok(cautious.risk<=normal.risk);
 assert.equal(MARCH_CONFIG.roadTime<1,true);
});

test('winter blocks a high pass without applying Egyptian winter conditions',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');s.month=1;
 assert.equal(estimateMarchEdge(s,a,'galatia','armenia').blocked,'snow');
 assert.equal(estimateMarchEdge(s,a,'egypt','egyptUpper').blocked,undefined);
 s.month=5;assert.equal(estimateMarchEdge(s,a,'galatia','armenia').blocked,undefined);
});

test('route previews reject reported foreign access, sea cost and impossible points',()=>{
 const s=newGame('caesar');region(s,'narbo').owner='egypt';s.controlKnowledge.caesar.narbo={owner:'egypt',year:s.year,month:s.month};
 assert.equal(previewRoute(s,'xiii',['narbo']).reason,'peace');
 assert.equal(previewRoute(s,'xiii',['not-a-theater']).reason,'unknown_terrain');
 assert.ok(previewRoute(s,'xiii',['italiaN']).ok);
 const sea=newGame('caesar'),a=sea.armies.find(x=>x.id==='xiii');a.region='italiaS';sea.factions.caesar.treasury=0;
 assert.equal(previewMarch(sea,'xiii','sicilia').reason,'transport');
});

test('marching consumes provisions and advances by months rather than teleporting',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 a.region='cisalpine';const plan=previewRoute(s,a.id,['narbo']);assert.ok(plan.ok);assert.ok(plan.months>1);
 const before=a.provisions;assert.equal(issueRouteOrder(s,a.id,['narbo']).ok,true);assert.equal(a.region,'cisalpine');
 tick(s);assert.equal(a.region,'cisalpine');assert.ok(a.move.elapsed>=1);assert.ok(a.provisions<before);assert.ok(a.move.progress>0&&a.move.progress<1);
});

test('a hidden border change is checked at arrival, not leaked during a long march',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 const months=previewMarch(s,a.id,'narbo').months;assert.ok(months>1);
 assert.equal(issueMilitaryOrder(s,a.id,'move','narbo').ok,true);
 region(s,'narbo').owner='parthia';const departureLogCount=s.log.length;
 tick(s);assert.equal(a.region,'cisalpine');assert.equal(a.move?.to,'narbo');assert.equal(a.move.remaining,months-1);
 assert.equal(s.log.slice(departureLogCount).some(entry=>entry.kind==='march_blocked'),false);
 for(let month=1;month<months;month++)tick(s);
 assert.equal(a.region,'cisalpine');assert.equal(a.move,null);
});

test('food shortage is visible and can cause contextual nonbattle losses',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');a.provisions=0;s.factions.caesar.food=-100;
 assert.equal(issueRouteOrder(s,a.id,['narbo']).ok,true);tick(s);
 assert.ok(s.log.some(e=>e.kind==='supply_shortage'&&e.armyId===a.id));
 assert.ok(a.fatigue>0);assert.equal(a.provisions,0);
});

test('halt, resume, cancellation and a midjourney change preserve physical position',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 assert.equal(issueRouteOrder(s,a.id,['gaul']).ok,true);tick(s);const firstTarget=a.move.to,elapsed=a.move.elapsed;
 assert.equal(issueMilitaryOrder(s,a.id,'halt').ok,true);tick(s);assert.equal(a.move.elapsed,elapsed);
 assert.equal(issueMilitaryOrder(s,a.id,'resume').ok,true);
 const revised=issueRouteOrder(s,a.id,['italiaN']);assert.equal(revised.ok,true);assert.equal(revised.pending,true);assert.equal(a.move.to,firstTarget);assert.equal(a.region,'cisalpine');
 assert.equal(issueMilitaryOrder(s,a.id,'cancel').ok,true);assert.equal(a.move.cancelAfterLeg,true);assert.equal(a.region,'cisalpine');
});

test('save migration preserves route, progress, fatigue and provisions',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');issueRouteOrder(s,a.id,['gaul']);tick(s);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),restored=loaded.armies.find(x=>x.id===a.id);
 assert.deepEqual(restored.move.route,a.move.route);assert.equal(restored.move.elapsed,a.move.elapsed);assert.equal(restored.provisions,a.provisions);assert.equal(restored.fatigue,a.fatigue);
 const legacy=newGame('caesar'),old=legacy.armies.find(x=>x.id==='xiii');old.move={to:'narbo',remaining:2,sea:false};delete old.provisions;delete old.fatigue;
 const migrated=upgradeSave(JSON.parse(JSON.stringify(legacy))).armies.find(x=>x.id==='xiii');assert.ok(migrated.provisions>0);assert.equal(migrated.move.totalMonths,2);assert.equal(migrated.move.progress,0);
});

test('bounded pathfinding remains usable with many AI armies on the same graph',()=>{
 const s=newGame('caesar'),template=s.armies.find(x=>x.id==='xiii');
 for(let i=0;i<120;i++){const a={...template,id:`stress-${i}`,owner:'senate',region:i%2?'roma':'italiaN',men:3000};const result=findMarchPath(s,a,a.region,'epirus',{canEnter:()=>true});assert.ok(result.ok);assert.ok(result.nodes.length<=Object.keys(MARCH_POINTS).length)}
});
