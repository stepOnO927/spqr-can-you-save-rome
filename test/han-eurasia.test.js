import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,tick,moveArmy,serialize,loadHanSave} from '../han/engine.js';
import {REGIONS,ROUTES,PLAYABLE} from '../han/data.js';
import {tradePath,TRADE_END} from '../han/silk-road.js';
import {declareWar} from '../han/frontier.js';
import {changeDependency,dependencyOf} from '../han/dependencies.js';
import {drawMap} from '../han/map.js';
test('49 BCE start and playable polities share a connected Eurasian route',()=>{
 const s=newHanGame('shanshan',{seed:49});
 assert.equal(s.year,-49);assert.equal(s.month,1);assert.equal(s.throne.orthodox,'liu-xun');
 for(const id of ['shanshan','qiuci','yuezhi','parthia','armenia','commagene'])assert.ok(PLAYABLE.includes(id));
 const path=tradePath(s);assert.equal(path[0],'changan');assert.equal(path.at(-1),TRADE_END);
 assert.ok(path.includes('parthia'));assert.ok(path.includes('bactra'));
 for(const id of path)assert.ok(s.regions.some(r=>r.id===id));
 for(let i=1;i<path.length;i++)assert.ok(ROUTES.some(e=>e.a===path[i-1]&&e.b===path[i]||e.b===path[i-1]&&e.a===path[i]));
});
test('caravans cross actual regions and respond to Parthian war',()=>{
 const s=newHanGame('han',{seed:11});
 assert.ok(tradePath(s));
 declareWar(s,'han','parthia');
 assert.equal(tradePath(s),null);
});
test('dependencies transfer small annual tribute and grant autonomy',()=>{
 const s=newHanGame('parthia',{seed:22}),d=dependencyOf(s,'atropatene');
 assert.equal(d.overlord,'parthia');
 const initial=d.autonomy;
 assert.equal(changeDependency(s,'atropatene','grant_autonomy','parthia').ok,true);
 assert.equal(d.autonomy,initial+15);
 assert.equal(changeDependency(s,'atropatene','grant_autonomy','han').ok,false);
});
test('120 months remain stable for Han, oasis and western campaigns; saves preserve data',()=>{
 for(const player of ['han','shanshan','parthia','commagene']){
  const s=newHanGame(player,{seed:13});
  for(let i=0;i<120;i++)tick(s);
  assert.equal(s.year,-39);assert.equal(s.month,1);
  assert.ok(s.silk.farWestDeliveries>0);
  assert.equal(s.throne.orthodox==null||s.persons[s.throne.orthodox]?.birthSurname==='Liu',true);
  const saved=loadHanSave(serialize(s));
  assert.equal(saved.regions.length,s.regions.length);
  assert.equal(saved.dependencies.length,s.dependencies.length);
  assert.deepEqual(saved.silk.lastPath,s.silk.lastPath);
 }
});
test('map modes show state and playable army moves use route checks',()=>{
 const s=newHanGame('parthia',{seed:4}),a=s.armies.find(x=>x.owner==='parthia');
 assert.ok(a);
 for(const mode of ['political','terrain','military','supply','economy'])assert.match(drawMap(s,{mode,visibleArmy:x=>x.owner===s.player}),/data-region="parthia"/);
 assert.equal(moveArmy(s,a.id,'changan',{owner:'parthia'}).reason,'not_adjacent');
 const target=ROUTES.find(x=>x.a===a.region||x.b===a.region);
 assert.ok(target);const to=target.a===a.region?target.b:target.a;
 const result=moveArmy(s,a.id,to,{owner:'parthia'});
 assert.ok(result.ok||result.reason==='no_access');
});