import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=portraits-hundred-days-1';
import {assignSuccession,knownLeaders,mauretanianSeatHolders} from '../characters.js?v=succession-ui-recovery-1';
import {createFictionalPerson} from '../dynasties.js?v=portraits-hundred-days-1';
import {deriveGovernment,advanceGovernments} from '../governance.js?v=portraits-hundred-days-1';
import {queueMission,advanceOperations} from '../character-system.js?v=portraits-hundred-days-1';
const child=(s,parent,name,years=10)=>createFictionalPerson(s,{name:[name,name],faction:'mauretania',birthYear:s.year-years,parents:[parent],location:'mauretania',sex:'male'});
function death(s,id){s.world.characters[id].alive=false;s.world.characters[id].health='deceased'}
test('each Mauretanian crown passes to its own recorded child without revealing succession abroad',()=>{
 let s=newGame('caesar');const heir=child(s,'bocchus','Simulated heir');death(s,'bocchus');
 assert.deepEqual(assignSuccession(s,'mauretania'),[heir,'bogud']);assert.deepEqual(mauretanianSeatHolders(s),{bocchus:heir,bogud:'bogud'});
 assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_unavailable');assert.deepEqual(deriveGovernment(s,'mauretania').acting,['bogud']);assert.deepEqual(knownLeaders(s,'caesar','mauretania'),['bocchus','bogud']);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(mauretanianSeatHolders(s).bocchus,heir);s.year+=7;assert.equal(deriveGovernment(s,'mauretania').kind,'normal');
 const op=queueMission(s,'caesar','mauretania','spy','authority');assert.equal(op.ok,true);for(let i=0;i<op.duration-1;i++){s.month++;advanceOperations(s)}s.world.intelSeed=1000;s.month++;advanceOperations(s);
 const report=s.knowledge.caesar.mauretania.reports[0];assert.equal(report.kind,'authority');assert.deepEqual(report.value.actors,[heir,'bogud']);assert.equal(s.knowledge.senate.mauretania.reports.length,0);
});
test('a missing heir can later recover the vacant seat without taking the other crown',()=>{
 const s=newGame('caesar'),heir=child(s,'bogud','Missing heir',20);s.world.characters[heir].missing={year:s.year,month:s.month,remaining:1,origin:'mauretania'};death(s,'bogud');assignSuccession(s,'mauretania');
 assert.deepEqual(s.world.leadership.mauretania,['bocchus']);assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_vacant');delete s.world.characters[heir].missing;advanceGovernments(s);
 assert.deepEqual(s.world.leadership.mauretania,['bocchus',heir]);assert.equal(deriveGovernment(s,'mauretania').kind,'normal');
});
test('separate crowns cannot be inherited twice, and an unproven legacy leader is never assigned a seat',()=>{
 const s=newGame('caesar');s.world.characters.bocchus.children.push('bogud');s.world.characters.bogud.parents.push('bocchus');death(s,'bocchus');assignSuccession(s,'mauretania');
 assert.deepEqual(s.world.leadership.mauretania,['bogud']);assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_vacant');
 const unrelated=child(s,'bogud','Unrelated surviving leader',20);s.world.leadership.mauretania.push(unrelated);delete s.world.constituentSeats;assignSuccession(s,'mauretania');
 assert.ok(s.world.leadership.mauretania.includes(unrelated));assert.equal(mauretanianSeatHolders(s).bocchus,'bocchus');assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_vacant');
});
test('a recorded grandchild can inherit the same seat in a later generation',()=>{
 let s=newGame('caesar');const heir=child(s,'bocchus','First heir',22),grandchild=child(s,heir,'Next heir',4);death(s,'bocchus');assignSuccession(s,'mauretania');s=upgradeSave(JSON.parse(JSON.stringify(s)));death(s,heir);assignSuccession(s,'mauretania');
 assert.deepEqual(mauretanianSeatHolders(s),{bocchus:grandchild,bogud:'bogud'});assert.deepEqual(s.world.leadership.mauretania,[grandchild,'bogud']);assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_unavailable');
});
test('an old save can trace a recorded line through a deceased child without inventing a relationship',()=>{
 let s=newGame('caesar');const heir=child(s,'bocchus','Deceased heir',22),grandchild=child(s,heir,'Recorded grandchild',4);death(s,'bocchus');death(s,heir);
 s.world.leadership.mauretania=['bogud'];delete s.world.constituentSeats;s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceGovernments(s);
 assert.deepEqual(mauretanianSeatHolders(s),{bocchus:grandchild,bogud:'bogud'});assert.deepEqual(s.world.leadership.mauretania,[grandchild,'bogud']);
 const other=newGame('caesar'),unverified=child(other,'bocchus','Unverified',12);other.world.characters[unverified].parents=[];death(other,'bocchus');assignSuccession(other,'mauretania');
 assert.equal(deriveGovernment(other,'mauretania').kind,'constituent_vacant');assert.ok(!other.world.leadership.mauretania.includes(unverified));
});
