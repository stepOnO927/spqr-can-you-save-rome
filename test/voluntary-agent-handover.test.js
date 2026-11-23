import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=dossier-archive-1';
import {offerAgentHandover,advanceAgentRequests,requestAgentRelease,availableAgents} from '../character-system.js?v=dossier-archive-1';

function fixture(owner='senate',holder='caesar'){const s=newGame('caesar');s.world.captives.push({id:'handover-1',owner,holder,state:'held'});return s}
function month(s){if(++s.month>12){s.month=1;s.year++}advanceAgentRequests(s)}
test('voluntary handover survives save and takes two months to restore capacity',()=>{
 let s=fixture();const key='caesar:senate',initial=s.relations[key]||0;assert.equal(availableAgents(s,'senate'),2);assert.equal(offerAgentHandover(s,'caesar','handover-1').ok,true);assert.equal(offerAgentHandover(s,'caesar','handover-1').reason,'pending');advanceAgentRequests(s);assert.equal(s.releaseRequests[0].remaining,2);month(s);assert.equal(s.world.captives[0].state,'held');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;month(s);assert.equal(s.releaseRequests[0].status,'released');assert.equal(availableAgents(s,'senate'),3);assert.equal(s.relations[key],Math.min(100,initial+3));
});
test('failed handover leaves captive held and can be retried without changing relations',()=>{
 const s=fixture(),initial=s.relations['caesar:senate']||0;offerAgentHandover(s,'caesar','handover-1');month(s);s.world.intelSeed=1972;month(s);assert.equal(s.releaseRequests[0].status,'no_reply');assert.equal(s.world.captives[0].state,'held');assert.equal(s.relations['caesar:senate']||0,initial);assert.equal(offerAgentHandover(s,'caesar','handover-1').ok,true);
});
test('undelivered letters and offers do not block an independent action or reveal themselves',()=>{
 const s=fixture();assert.equal(requestAgentRelease(s,'senate','handover-1').ok,true);assert.equal(s.log.length,0);assert.equal(offerAgentHandover(s,'caesar','handover-1').ok,true);
 const t=fixture('caesar','egypt');const before=t.log.length;assert.equal(offerAgentHandover(t,'egypt','handover-1').ok,true);assert.equal(t.log.length,before);assert.equal(availableAgents(t,'caesar'),2);assert.equal(requestAgentRelease(t,'caesar','handover-1').ok,true);
});
test('AI factions can complete handovers without revealing them to the player early',()=>{
 const s=fixture('parthia','egypt'),initial=s.relations['egypt:parthia']||0;assert.equal(offerAgentHandover(s,'egypt','handover-1').ok,true);assert.equal(s.log.length,0);month(s);s.world.intelSeed=1000;month(s);assert.equal(s.world.captives[0].state,'released');assert.equal(s.relations['egypt:parthia'],Math.min(100,initial+3));assert.equal(s.log.length,0);
});
test('AI may arrange handovers through regular turns',()=>{
 let offers=0;for(let seed=1;seed<=60;seed++){const s=fixture('parthia','egypt');s.month=3;s.seed=seed;s.wars=[];s.relations['egypt:parthia']=50;tick(s);if(s.releaseRequests.some(r=>r.initiatedByHolder&&r.captiveId==='handover-1'))offers++}assert.ok(offers>0&&offers<60,`expected occasional autonomous offers; got ${offers}`);
});
