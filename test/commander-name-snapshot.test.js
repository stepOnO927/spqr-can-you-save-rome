import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=intelligence-archive-1';
import {createFictionalPerson,reportedDynasticContacts,offerForeignMarriage} from '../dynasties.js?v=intelligence-archive-1';
import {observeArmies,reportedArmies} from '../character-system.js?v=intelligence-archive-1';
import {reportedPersonName,visiblePersonName} from '../person-knowledge.js?v=intelligence-archive-1';

test('a reported commander name is a dated snapshot usable for subsequent correspondence',()=>{
 let s=newGame('senate');s.wars=[];s.relations['caesar:senate']=20;const id=createFictionalPerson(s,{name:['Observed commander','报告指挥官'],faction:'caesar',birthYear:s.year-30,sex:'female'}),unit=s.armies.find(a=>a.id==='xiii');unit.characterId=id;observeArmies(s);
 assert.deepEqual(reportedArmies(s,'senate').find(x=>x.id==='xiii').commanderName,['Observed commander','报告指挥官']);assert.deepEqual(reportedPersonName(s,'senate','caesar',id).name,['Observed commander','报告指挥官']);assert.ok(reportedDynasticContacts(s,'senate').some(x=>x.id===id));
 s.world.dynasties.catalog[id].name=['Hidden later name','隐藏的新姓名'];assert.deepEqual(visiblePersonName(s,'senate',id),['Observed commander','报告指挥官']);assert.deepEqual(visiblePersonName(s,'egypt',id),['Unrecorded name','姓名未记录']);
 s=upgradeSave(structuredClone(s));assert.deepEqual(visiblePersonName(s,'senate',id),['Observed commander','报告指挥官']);const result=offerForeignMarriage(s,'fictional:3',id,'caesar');assert.ok(result.ok);assert.deepEqual(result.offer.reportedName,['Observed commander','报告指挥官']);assert.equal(result.offer.months,3);
});
test('old or future sightings never gain a name from current hidden state',()=>{
 const s=newGame('senate'),id=createFictionalPerson(s,{name:['Secret','秘密姓名'],faction:'caesar',birthYear:s.year-30}),k=s.knowledge.senate.caesar;k.sightings.legacy={commanderId:id,year:s.year,month:s.month};k.commanderReports=[{commanderId:id,year:s.year,month:s.month},{commanderId:id,commanderName:['Future','未来姓名'],year:s.year+1,month:s.month}];
 assert.equal(reportedPersonName(s,'senate','caesar',id),null);assert.deepEqual(visiblePersonName(s,'senate',id),['Unrecorded name','姓名未记录']);
});
