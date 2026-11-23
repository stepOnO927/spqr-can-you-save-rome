import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-name-disagreement-1';
import {addReport} from '../character-system.js?v=faces-name-disagreement-1';
import {identityKnowledge} from '../map-lab/identity-knowledge.js?v=faces-name-disagreement-1';

test('identity presentation follows the observer’s records, not hidden foreign state',()=>{
 const s=newGame('senate');assert.equal(identityKnowledge(s,'pacorus').kind,'unknown');assert.equal(identityKnowledge(s,'cleopatra').kind,'reported');assert.equal(identityKnowledge(s,'cicero').kind,'own');s.world.characters.pacorus.health='dying';s.world.leadership.parthia=['pacorus'];assert.equal(identityKnowledge(s,'pacorus').kind,'unknown');
 for(const source of ['spy','envoy','travelers'])addReport(s,'senate','parthia',{kind:'claimants',leaders:['pacorus'],source});assert.equal(identityKnowledge(s,'pacorus').kind,'corroborated');assert.equal(identityKnowledge({...s,player:'caesar'},'pacorus').kind,'unknown');
 s.year+=3;assert.equal(identityKnowledge(s,'pacorus').kind,'reported');assert.equal(identityKnowledge(upgradeSave(JSON.parse(JSON.stringify(s))),'pacorus').kind,'reported');
});
test('a dated personal encounter does not imply current leadership or health',()=>{
 const s=newGame('senate');s.meetings.push({actor:'senate',target:'pacorus',targetFaction:'parthia',status:'met',year:-49,month:1,resolvedYear:-49,resolvedMonth:3});s.month=4;assert.deepEqual(identityKnowledge(s,'pacorus'),{kind:'met',year:-49,month:3});s.world.characters.pacorus.health='dying';s.world.characters.pacorus.location=null;assert.deepEqual(identityKnowledge(s,'pacorus'),{kind:'met',year:-49,month:3});assert.equal(identityKnowledge({...s,player:'caesar'},'pacorus').kind,'unknown');
});
test('archived identities remain reported without acquiring current corroboration or exposing future records',()=>{
 let s=newGame('senate');for(const source of ['spy','envoy','travelers'])addReport(s,'senate','parthia',{kind:'claimants',leaders:['pacorus'],source});
 assert.equal(identityKnowledge(s,'pacorus').kind,'corroborated');for(let i=0;i<35;i++)addReport(s,'senate','parthia',{kind:'stability',value:'stable',source:'spy'});
 assert.equal(identityKnowledge(s,'pacorus').kind,'reported');s.world.characters.pacorus.alive=false;s.world.characters.pacorus.location=null;s=upgradeSave(structuredClone(s));assert.equal(identityKnowledge(s,'pacorus').kind,'reported');assert.equal(identityKnowledge({...s,player:'caesar'},'pacorus').kind,'unknown');
 const future=newGame('caesar');future.knowledge.caesar.parthia.reportArchive=[{kind:'claimants',leaders:['pacorus'],source:'spy',verified:true,confidence:'confirmed',year:future.year+1,month:future.month}];assert.equal(identityKnowledge(future,'pacorus').kind,'unknown');future.year++;assert.equal(identityKnowledge(future,'pacorus').kind,'reported');
});

