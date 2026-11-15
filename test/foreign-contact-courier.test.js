import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=frontier-response-1';
import {initializeCursus,cultivateOfficial,proposeCooperation,advanceCursus} from '../cursus-honorum.js?v=multipolar-courier-review-1';

function setup(){
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 s.month=3;s.factions.senate.treasury=500;
 c.contacts.push({actor:'senate',target:'parthia',id,status:'open',trust:35,relationship:{familiarity:40,trust:35,respect:40,professional:20,alignment:30,obligation:0,rivalry:0,willingness:25}});
 return {s,c,id,contact:c.contacts.at(-1)};
}
function step(s,seed=1000){s.month++;s.world.intelSeed=seed;advanceCursus(s)}

test('a hidden change of allegiance does not reject a letter or expose the outcome before delivery',()=>{
 const a=setup(),b=setup();b.s.world.characters[b.id].faction='egypt';
 assert.deepEqual(cultivateOfficial(a.s,'parthia',a.id),cultivateOfficial(b.s,'parthia',b.id));
 for(let i=0;i<2;i++){step(a.s);step(b.s);assert.equal(a.contact.trust,35);assert.equal(b.contact.trust,35);assert.equal(a.contact.status,b.contact.status);assert.equal(a.contact.pendingCultivation.remaining,b.contact.pendingCultivation.remaining)}
 step(a.s);step(b.s);assert.equal(a.contact.lastCultivation.outcome,'cultivated');assert.equal(b.contact.lastCultivation.outcome,'no_reply');
 assert.ok(a.contact.trust>35);assert.equal(b.contact.trust,35);
});

test('a delivered answer reflects the earlier observation and survives an old-save migration',()=>{
 const {s,id,contact}=setup();assert.ok(cultivateOfficial(s,'parthia',id).ok);step(s);step(s);
 const saved=upgradeSave(structuredClone(s));saved.world.characters[id].faction='egypt';step(saved);
 const restored=saved.world.cursus.contacts.findLast(x=>x.id===id&&x.actor==='senate');
 assert.equal(restored.lastCultivation.outcome,'cultivated');assert.ok(restored.trust>35);
});

test('cooperation is independently answered and stale contacts do not reveal hidden departures',()=>{
 const a=setup(),b=setup();b.s.world.characters[b.id].faction='egypt';
 assert.deepEqual(proposeCooperation(a.s,'parthia',a.id),proposeCooperation(b.s,'parthia',b.id));
 step(a.s);step(b.s);assert.equal(a.c.cooperations.at(-1).status,'pending');assert.equal(b.c.cooperations.at(-1).status,'pending');
 step(a.s);step(b.s);assert.equal(b.c.cooperations.at(-1).status,'no_reply');
});
