import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dynastic-reported-leads-1';
import {createFictionalPerson,reportedDynasticContacts,offerForeignMarriage,advanceDynasties} from '../dynasties.js?v=dynastic-reported-leads-1';
import {addReport,reportedHealthSubjects} from '../character-system.js?v=dynastic-reported-leads-1';

test('delivered succession and governing reports become shared diplomatic leads, not facts about the foreign court',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Reported person','报告人物'],faction:'egypt',birthYear:s.year-30,sex:'female',location:'egypt'}),ours='fictional:1';
 assert.ok(!reportedDynasticContacts(s).some(c=>c.id===id));addReport(s,'caesar','egypt',{kind:'succession',value:id,source:'spy',confidence:'unverified'});
 assert.ok(reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.ok(reportedDynasticContacts(s).some(c=>c.id===id&&c.faction==='egypt'));assert.ok(!reportedDynasticContacts(s,'senate').some(c=>c.id===id));
 const before=reportedDynasticContacts(s);s.world.characters[id].alive=false;s.world.characters[id].faction='parthia';assert.deepEqual(reportedDynasticContacts(s),before,'hidden changes cannot rewrite the lead');
 const sent=offerForeignMarriage(s,ours,id,'egypt');assert.equal(sent.ok,true);assert.equal(sent.offer.status,'pending');assert.equal(sent.offer.months,3);assert.equal(s.world.characters[ours].spouse,null);
 s=upgradeSave(structuredClone(s));for(let i=0;i<3;i++){s.month++;advanceDynasties(s)}assert.equal(s.world.dynasties.marriageOffers.at(-1).status,'no_reply');assert.equal(s.world.characters[ours].spouse,null);
});
test('authority, office, commander and completed meeting leads are usable, but future messages are not',()=>{
 const s=newGame('caesar');const ids=Array.from({length:5},(_,i)=>createFictionalPerson(s,{name:[`Person ${i}`,`人物${i}`],faction:'egypt',birthYear:s.year-30}));
 addReport(s,'caesar','egypt',{kind:'authority',value:{kind:'regency',actors:[ids[0]]},source:'spy'});addReport(s,'caesar','egypt',{kind:'office_finance',value:ids[1],source:'spy'});
 s.knowledge.caesar.egypt.sightings.test={commanderId:ids[2],year:s.year,month:s.month};s.meetings.push({actor:'caesar',targetFaction:'egypt',person:'caesar',target:ids[3],status:'met',year:s.year,month:s.month});s.knowledge.caesar.egypt.reports.unshift({kind:'succession',value:ids[4],source:'spy',year:s.year+1,month:s.month});
 const contacts=reportedDynasticContacts(s).filter(c=>c.faction==='egypt').map(c=>c.id);for(const id of ids.slice(0,4))assert.ok(contacts.includes(id));assert.ok(!contacts.includes(ids[4]));assert.equal(new Set(contacts).size,contacts.length);
});
