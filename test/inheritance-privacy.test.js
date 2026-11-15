import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=conspiracy-name-1';
import {createFictionalPerson,makeWill,settleInheritance} from '../dynasties.js?v=conspiracy-name-1';
import {addReport} from '../character-system.js?v=conspiracy-name-1';

function foreignSpouses(){let s=newGame('caesar');const own=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,wealth:24}),foreign=createFictionalPerson(s,{name:['Reported','报告姓名'],faction:'egypt',birthYear:-78});s.world.characters[own].spouse=foreign;s.world.characters[foreign].spouse=own;addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'spy'});s.world.dynasties.catalog[foreign].name=['Secret','秘密姓名'];return {s:upgradeSave(structuredClone(s)),own,foreign}}

test('a will records the beneficiary name known at signing, not a hidden later name',()=>{
 let {s,own,foreign}=foreignSpouses();assert.ok(makeWill(s,own,foreign).ok);let event=s.world.dynasties.lives[own].at(-1);assert.match(event.zh,/报告姓名/);assert.doesNotMatch(event.zh,/秘密姓名/);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'envoy',peopleNames:{[foreign]:['Later','后续姓名']},observationYear:s.year,observationMonth:s.month});s=upgradeSave(structuredClone(s));event=s.world.dynasties.lives[own].at(-1);assert.match(event.zh,/报告姓名/);assert.doesNotMatch(event.zh,/秘密姓名|后续姓名/);
});

test('unobserved foreign inheritance disputes do not announce private deaths to the player',()=>{
 let s=newGame('caesar');const parent=createFictionalPerson(s,{name:['Hidden death','秘密死者'],faction:'egypt',birthYear:-90,wealth:30}),heir=createFictionalPerson(s,{name:['Child','子女'],faction:'egypt',birthYear:-65,parents:[parent]}),beneficiary=createFictionalPerson(s,{name:['Other','他人'],faction:'egypt',birthYear:-70});assert.ok(makeWill(s,parent,beneficiary).ok);const before=structuredClone(s.log);s.world.characters[parent].alive=false;settleInheritance(s,parent);assert.equal(s.world.dynasties.inheritanceDisputes.at(-1).deceased,parent);assert.deepEqual(s.log,before);s=upgradeSave(structuredClone(s));assert.doesNotMatch(JSON.stringify(s.log),/秘密死者|Hidden death/);assert.ok(heir);
});

test('an inheritance record uses the recipient court’s reported name of the deceased',()=>{
 let {s,own,foreign}=foreignSpouses();s.world.characters[foreign].wealth=12;assert.ok(makeWill(s,foreign,own).ok);s.world.characters[foreign].alive=false;settleInheritance(s,foreign);const event=s.world.dynasties.lives[own].at(-1);assert.match(event.zh,/报告姓名/);assert.doesNotMatch(event.zh,/秘密姓名/);assert.equal(s.world.characters[own].wealth,36);
});
