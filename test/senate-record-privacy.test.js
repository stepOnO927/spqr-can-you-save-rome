import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js';
import {initializeCursus,seekSenatorEndorsement,advanceCursus} from '../cursus-honorum.js';

test('foreign Senate records retain the original known name across hidden changes and saves',()=>{
 let s=newGame('senate'),c=initializeCursus(s),foreign=c.senators.find(x=>x.faction==='caesar'),known=[...foreign.publicName];
 s.world.characters[foreign.id].alive=false;s.world.dynasties.catalog[foreign.id].name=['Secret new name','秘密新姓名'];
 s=upgradeSave(JSON.parse(JSON.stringify(s)));c=initializeCursus(s);assert.deepEqual(c.senators.find(x=>x.id===foreign.id).publicName,known);
});
test('legacy records recover a documented opening name, never a hidden replacement',()=>{
 const s=newGame('senate'),c=initializeCursus(s),foreign=c.senators.find(x=>x.faction==='caesar'),known=[...foreign.publicName];delete foreign.publicName;initializeCursus(s);assert.deepEqual(foreign.publicName,known);
 delete foreign.publicName;delete s.world.dynasties.senatorPortraitClaims[foreign.id];s.world.dynasties.catalog[foreign.id].name=['Secret new name','秘密新姓名'];initializeCursus(s);assert.equal(foreign.publicName,undefined);
});
test('a request to a foreign senator does not disclose unobserved absence immediately',()=>{
 const s=newGame('senate'),c=initializeCursus(s),foreign=c.senators.find(x=>x.faction==='caesar'),candidate=c.applicants.find(x=>x.faction==='senate'&&x.office==='consul'),funds=s.factions.senate.treasury;
 delete s.world.characters[foreign.id];const r=seekSenatorEndorsement(s,foreign.id,candidate.id);assert.equal(r.ok,true);assert.equal(s.factions.senate.treasury,funds-5);assert.equal(c.endorsements.at(-1).status,'pending');
 s.month++;advanceCursus(s);assert.equal(c.endorsements.at(-1).status,'pending');s.month++;advanceCursus(s);assert.equal(c.endorsements.at(-1).status,'lapsed');
});
