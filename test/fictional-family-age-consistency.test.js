import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=family-legend-merge-1';
import {createFictionalPerson,personAge,isKnownAdult,isKnownMinor,proposeMarriage,adoptHeir,nominateGuardian,advanceDynasties} from '../dynasties.js?v=family-legend-merge-1';
import {deriveGovernment} from '../governance.js?v=family-legend-merge-1';

test('a missing fictional birth year cannot authorize new family actions using a stale catalog',()=>{
 let s=newGame('caesar'),adult=createFictionalPerson(s,{name:['Unknown age','年龄未知'],faction:'caesar',birthYear:s.year-40}),partner=createFictionalPerson(s,{name:['Partner','配偶人选'],faction:'caesar',birthYear:s.year-30}),child=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:s.year-8,parents:[adult]});
 s.world.characters[adult].birthYear=null;s=upgradeSave(structuredClone(s));assert.equal(personAge(s,adult),null);assert.equal(isKnownAdult(s,adult),false);assert.equal(isKnownMinor(s,adult),false);
 assert.equal(proposeMarriage(s,adult,partner).ok,false);assert.equal(adoptHeir(s,adult,partner).ok,false);assert.equal(nominateGuardian(s,adult,child,partner).ok,false);
 s.world.characters[adult].birthYear=s.year-40;assert.equal(personAge(s,adult),40);assert.equal(isKnownAdult(s,adult),true);assert.equal(nominateGuardian(s,adult,child,partner).ok,true);
});
test('unknown guardian age preserves an existing guardianship without inventing a minor ruler',()=>{
 let s=newGame('caesar'),guardian=createFictionalPerson(s,{name:['Guardian','监护人'],faction:'caesar',birthYear:s.year-35}),child=createFictionalPerson(s,{name:['Ward','受监护人'],faction:'caesar',birthYear:s.year-8});s.world.characters[child].guardian=guardian;s.world.characters[guardian].birthYear=null;s=upgradeSave(structuredClone(s));advanceDynasties(s);assert.equal(s.world.characters[child].guardian,guardian);
 s.world.characters[guardian].alive=false;advanceDynasties(s);assert.equal(s.world.characters[child].guardian,undefined);
 const t=newGame('caesar'),ruler=createFictionalPerson(t,{name:['Uncertain ruler','年龄未知的统治者'],faction:'egypt',birthYear:t.year-8,location:'egypt'});t.world.characters[ruler].birthYear=null;t.world.leadership.egypt=[ruler];assert.equal(deriveGovernment(t,'egypt').kind,'normal');
});
