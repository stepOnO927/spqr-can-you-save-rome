import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=infant-portraits-1';
import {createFictionalPerson} from '../dynasties.js?v=infant-portraits-1';
import {genealogyMeetingContacts} from '../genealogy-personal-actions.js?v=genealogy-personal-actions-1';

test('meeting recipients come from reports rather than a foreign court’s hidden state',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Hidden Person','秘密人物'],faction:'egypt',birthYear:-75,location:'egypt'});
 s.knowledge.caesar.egypt.reports.push({kind:'leaders',leaders:[id],year:s.year,month:s.month});const before=genealogyMeetingContacts(s,true);assert.ok(before.some(c=>c.id==='cleopatra'));const fictional=before.find(c=>c.id===id);assert.match(fictional.label,/未核实人物/);assert.doesNotMatch(fictional.label,/秘密人物/);
 s.world.characters[id].alive=false;s.world.characters[id].location='parthia';s.world.dynasties.catalog[id].name=['Changed Secret','秘密改名'];s=upgradeSave(structuredClone(s));assert.deepEqual(genealogyMeetingContacts(s,true),before);
});
test('unreported foreign people are never offered as personal meeting recipients',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Unreported','未报告'],faction:'egypt',birthYear:-75});assert.ok(!genealogyMeetingContacts(s,true).some(c=>c.id===id));
});
