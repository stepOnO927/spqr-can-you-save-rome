import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,queueMission} from '../engine.js';
import {addReport,advanceOperations,contestLeadership,supportClaimant} from '../character-system.js';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
const knownClaimant=(s,actor)=>addReport(s,actor,'egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});

test('accepted claimant support is secret until a delayed spy report reaches an observer',()=>{
 let s=newGame('senate');contestLeadership(s,'egypt','cleopatra');knownClaimant(s,'caesar');
 assert.equal(supportClaimant(s,'caesar','egypt','cleopatra').ok,true);
 s.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');assert.equal(s.knowledge.senate.egypt.reports.length,0);
 assert.equal(queueMission(s,'senate','egypt','spy','contacts').ok,true);for(let i=0;i<3;i++)advanceOperations(s);
 assert.equal(s.operations[0].status,'pending');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);
 assert.equal(s.knowledge.senate.egypt.reports[0].value,'caesar');assert.equal(s.knowledge.senate.egypt.reports[0].verified,false);assert.equal(s.knowledge.parthia.egypt.reports.length,0);
});
test('a rumor may falsely suggest a sponsor and no reliable information is not proof of absence',()=>{
 const s=newGame('senate');contestLeadership(s,'egypt','cleopatra');queueMission(s,'senate','egypt','spy','contacts');s.world.intelSeed=seedFor(.4,.44);for(let i=0;i<4;i++)advanceOperations(s);
 assert.equal(s.knowledge.senate.egypt.reports[0].value,'caesar');assert.equal(s.operations.some(o=>o.type==='support'),false);
 const t=newGame('senate');queueMission(t,'senate','egypt','spy','contacts');t.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(t);
 assert.equal(t.knowledge.senate.egypt.reports[0].value,'unknown');assert.equal(queueMission(t,'senate','egypt','envoy','contacts').reason,'subject');
});
test('the Roman AI offers support only to claimants it has learned about',()=>{
 const unaware=newGame('caesar');unaware.month=11;unaware.factions.senate.treasury=100;contestLeadership(unaware,'egypt','cleopatra');tick(unaware);
 assert.equal(unaware.operations.some(o=>o.actor==='senate'&&o.type==='support'),false);
 const informed=newGame('caesar');informed.month=11;informed.factions.senate.treasury=100;knownClaimant(informed,'senate');tick(informed);
 const offer=informed.operations.find(o=>o.actor==='senate'&&o.type==='support');assert.equal(offer?.claimant,'cleopatra');assert.equal(offer.status,'pending');assert.ok(!informed.log.some(e=>e.en.includes('offer of support')));
});
test('old reports can be forwarded without becoming fresh evidence and expired contacts are not observed',()=>{
 const s=newGame('senate');s.alliances.push(['senate','parthia']);s.world.intelSeed=seedFor(.7,.8);
 addReport(s,'parthia','egypt',{kind:'contacts',value:'caesar',source:'spy',confidence:'unverified',reliability:'moderate',observationYear:-52,observationMonth:1});
 assert.equal(queueMission(s,'senate','egypt','exchange','contacts','parthia').ok,true);for(let i=0;i<3;i++)advanceOperations(s);
 const r=s.knowledge.senate.egypt.reports[0];assert.equal(r.value,'caesar');assert.equal(r.observationYear,-52);assert.equal(r.originSource,'spy');assert.equal(r.verified,false);
 const t=newGame('senate');t.operations.push({type:'support',status:'complete',actor:'caesar',target:'egypt',sentYear:-52,sentMonth:1});queueMission(t,'senate','egypt','spy','contacts');t.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(t);assert.equal(t.knowledge.senate.egypt.reports[0].value,'unknown');
});

test('allied age observations retain their original source and date without revealing hidden facts',()=>{
 const s=newGame('senate');s.alliances.push(['senate','parthia']);s.world.intelSeed=seedFor(.7,.8);
 const original=addReport(s,'parthia','egypt',{kind:'age',character:'cleopatra',value:[19,21],source:'meeting',confidence:'unverified',observationYear:-49,observationMonth:1});
 assert.equal(queueMission(s,'senate','egypt','spy','age').reason,'subject');assert.equal(queueMission(s,'senate','egypt','exchange','age','parthia').ok,true);for(let i=0;i<3;i++)advanceOperations(s);
 const r=s.knowledge.senate.egypt.reports[0];assert.deepEqual(r.value,[19,21]);assert.notEqual(r.value,original.value);assert.equal(r.originSource,'meeting');assert.equal(r.observationMonth,1);assert.equal(r.verified,false);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
