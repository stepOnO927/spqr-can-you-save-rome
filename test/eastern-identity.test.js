import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYABLE} from '../han/data.js?v=han-1';
import {newHanGame} from '../han/engine.js?v=faces-name-disagreement-1';
import {drawMap} from '../han/map.js?v=faces-name-disagreement-1';
import {IDENTITIES,identity,identityStory,factionMark} from '../identity.js?v=identity-encyclopedia-1';

test('each playable eastern polity has a distinct game reconstruction and a stable army designation',()=>{
 const kits=PLAYABLE.map(id=>identity(id));
 assert.ok(kits.every(kit=>kit!==IDENTITIES.shared));
 assert.equal(new Set(kits.map(kit=>kit.abbr)).size,PLAYABLE.length);
 assert.equal(new Set(PLAYABLE.map(id=>factionMark(id,'insignia'))).size,PLAYABLE.length,'every playable polity needs a visibly distinct compact mark');
 for(const id of ['huhanye','zhizhi','wusun','wusun_lesser','kangju','dayuan','yuezhi','qiuci']){
  assert.match(factionMark(id,'standard'),/faction-standard/);
  assert.match(identityStory(id,null,'en').provenance,/not a documented ancient national flag/);
  assert.match(identityStory(id,null,'zh').provenance,/原创游戏重建/);
 }
 assert.notEqual(identity('huhanye').primary,identity('zhizhi').primary);
 assert.notEqual(identity('wusun').primary,identity('wusun_lesser').primary);
});

test('eastern army counters display the polity standard in the real campaign map',()=>{
 const s=newHanGame('han',{seed:57});
 const map=drawMap(s,{visibleArmy:a=>['han','wusun'].includes(a.owner)});
 assert.match(map,/data-army="[^"]+"[^>]*>[\s\S]*?faction-standard/);
 assert.match(map,/--identity-primary:#3f6f6a/);
 assert.doesNotMatch(map,/<text class="glyph"/);
});
