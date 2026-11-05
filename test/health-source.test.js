import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js';
import {queueMission,advanceOperations} from '../character-system.js';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function investigate(health,q,type='travelers',change=()=>{}){
 let s=newGame('caesar');s.world.characters.cleopatra.health=health;change(s);
 const mission=queueMission(s,'caesar','egypt',type,'health',null,'cleopatra');assert.equal(mission.ok,true);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(q,q+.01);for(let i=0;i<mission.duration;i++)advanceOperations(s);return s;
}
test('travelers report limited rumors instead of a precise private medical state',()=>{
 for(const health of ['ill','seriously_ill','dying']){const s=investigate(health,.9),r=s.knowledge.caesar.egypt.reports[0];assert.equal(r.value,'ill');assert.equal(r.confidence,'rumor');assert.equal(r.reliability,'low');assert.equal(r.verified,false);assert.equal(s.knowledge.senate.egypt.reports.length,0)}
 assert.equal(investigate('dying',.7).knowledge.caesar.egypt.reports[0].value,'unknown');
 assert.equal(investigate('dying',.9,'spy').knowledge.caesar.egypt.reports[0].value,'dying');
});
test('travelers may observe a wound locally, hear misleading propaganda, or have no information',()=>{
 assert.equal(investigate('wounded',.7).knowledge.caesar.egypt.reports[0].value,'wounded');
 assert.equal(investigate('wounded',.7,'travelers',s=>{s.world.characters.cleopatra.location='parthia'}).knowledge.caesar.egypt.reports[0].value,'unknown');
 assert.equal(investigate('dying',.4,'travelers',s=>{s.world.claimants.egypt=['ptolemy']}).knowledge.caesar.egypt.reports[0].value,'healthy');
 assert.equal(investigate('healthy',.5,'travelers',s=>{s.world.claimants.egypt=['ptolemy']}).knowledge.caesar.egypt.reports[0].value,'ill');
});
