import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dynasty-id-3';
import {addReport} from '../character-system.js?v=dynasty-id-3';
import {identityKnowledge} from '../map-lab/identity-knowledge.js';

test('identity presentation follows the observer’s records, not hidden foreign state',()=>{
 const s=newGame('senate');assert.equal(identityKnowledge(s,'pacorus').kind,'unknown');assert.equal(identityKnowledge(s,'cleopatra').kind,'reported');assert.equal(identityKnowledge(s,'cicero').kind,'own');s.world.characters.pacorus.health='dying';s.world.leadership.parthia=['pacorus'];assert.equal(identityKnowledge(s,'pacorus').kind,'unknown');
 for(const source of ['spy','envoy','travelers'])addReport(s,'senate','parthia',{kind:'claimants',leaders:['pacorus'],source});assert.equal(identityKnowledge(s,'pacorus').kind,'corroborated');assert.equal(identityKnowledge({...s,player:'caesar'},'pacorus').kind,'unknown');
 s.year+=3;assert.equal(identityKnowledge(s,'pacorus').kind,'reported');assert.equal(identityKnowledge(upgradeSave(JSON.parse(JSON.stringify(s))),'pacorus').kind,'reported');
});
test('a dated personal encounter does not imply current leadership or health',()=>{
 const s=newGame('senate');s.meetings.push({actor:'senate',target:'pacorus',targetFaction:'parthia',status:'met',year:-49,month:1,resolvedYear:-49,resolvedMonth:3});s.month=4;assert.deepEqual(identityKnowledge(s,'pacorus'),{kind:'met',year:-49,month:3});s.world.characters.pacorus.health='dying';s.world.characters.pacorus.location=null;assert.deepEqual(identityKnowledge(s,'pacorus'),{kind:'met',year:-49,month:3});assert.equal(identityKnowledge({...s,player:'caesar'},'pacorus').kind,'unknown');
});
