import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=faces-born-portrait-1';
import {createMarketMerchant} from '../han/field-identities.js';
import {merchantPortraitSrc} from '../han/merchant-portrait.js';

test('named eastern merchants keep distinct culturally styled portraits across saves',()=>{
 const s=newHanGame('han',{seed:91}),factions=['han','kangju','yuezhi','shanshan','parthia'];
 const ids=factions.map(faction=>createMarketMerchant(s,faction,s.regions.find(r=>r.owner===faction).id));
 const portraits=ids.map(id=>merchantPortraitSrc(s.persons[id],s));
 assert.equal(new Set(portraits).size,ids.length);
 assert.deepEqual(portraits.map(src=>decodeURIComponent(src).match(/data-culture-style="([^"]+)"/)?.[1]),['han','steppe','steppe','oasis','western']);
 const before=serialize(s);
 assert.deepEqual(ids.map(id=>merchantPortraitSrc(s.persons[id],s)),portraits);
 assert.equal(serialize(s),before,'rendering must not mutate the saved person');
 const loaded=loadHanSave(before);
 assert.deepEqual(ids.map(id=>merchantPortraitSrc(loaded.persons[id],loaded)),portraits);
});

test('a legacy merchant without a saved seed still has a stable portrait',()=>{
 const s=newHanGame('shanshan',{seed:92}),id=createMarketMerchant(s,'shanshan','shanshan');
 delete s.persons[id].appearanceSeed;
 const first=merchantPortraitSrc(s.persons[id],s);
 assert.match(first,/^data:image\/svg\+xml,/);
 assert.equal(merchantPortraitSrc(loadHanSave(serialize(s)).persons[id],s),first);
 assert.equal(s.persons[id].appearanceSeed,undefined);
});
