import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=world-kings-local-protection-1';
import {frontierEntries,frontierOutlineColor} from '../map-lab/frontier-map.js';
import {explorationEntries,explorationOutlineColor} from '../map-lab/exploration-map.js';

test('land frontiers follow mapped land links and dated control reports',()=>{
 const s=newGame('caesar'),entry=id=>frontierEntries(s,'caesar').find(x=>x.theaterId===id);
 assert.equal(entry('gaul').kind,'interior');
 assert.equal(entry('cisalpine').kind,'own_frontier');
 assert.equal(entry('italiaN').kind,'hostile');
 assert.equal(entry('sicilia').kind,'distant');
 const before=frontierEntries(s,'caesar').map(x=>[x.theaterId,x.kind,x.color]);
 s.regions.find(r=>r.id==='italiaN').owner='egypt';
 assert.deepEqual(frontierEntries(s,'caesar').map(x=>[x.theaterId,x.kind,x.color]),before);
 assert.equal(frontierOutlineColor([entry('gaul'),entry('cisalpine')]),'#b39757');
});

test('exploration mode uses only known local records and conceals unidentified names',()=>{
 const s=newGame('caesar'),initial=explorationEntries(s,'caesar');
 assert.ok(initial.some(x=>x.id==='bibracte'&&x.level===5));
 assert.ok(!initial.some(x=>x.id==='commagene'));
 const before=explorationOutlineColor(initial,['syria']);
 s.regions.find(r=>r.id==='syria').localEntities.push({id:'hidden-place',name:['Hidden Place','隐秘地点']});
 assert.deepEqual(explorationEntries(s,'caesar'),initial);
 assert.equal(explorationOutlineColor(explorationEntries(s,'caesar'),['syria']),before);
 s.localDiscovery.caesar['ravenna-farms'].level=1;
 const geographic=explorationEntries(s,'caesar').find(x=>x.id==='ravenna-farms');
 assert.equal(geographic.name,null);
 assert.equal(explorationOutlineColor([geographic],['cisalpine']),'#b8a66f');
});
