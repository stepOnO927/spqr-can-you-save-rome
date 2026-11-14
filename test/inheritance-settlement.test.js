import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=coalition-courier-1';
import {createFictionalPerson,makeWill,settleInheritance,resolveInheritanceDispute,advanceDynasties} from '../dynasties.js?v=portraits-hundred-days-1';

function caseFixture(){
 const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Testator','立遗嘱者'],faction:'caesar',birthYear:-90,wealth:35}),family=s.world.characters[parent].familyId;
 const heir=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:-66,parents:[parent],familyId:family}),beneficiary=createFictionalPerson(s,{name:['Beneficiary','受益人'],faction:'caesar',birthYear:-70});
 assert.equal(makeWill(s,parent,beneficiary).ok,true);s.world.characters[parent].alive=false;settleInheritance(s,parent);return {s,parent,family,heir,beneficiary,estate:s.world.dynasties.inheritanceDisputes.at(-1)};
}
test('ordinary inheritance transfers indivisible remainder to the family estate',()=>{
 const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Parent','家长'],faction:'caesar',birthYear:-90,wealth:5}),family=s.world.characters[parent].familyId;
 const a=createFictionalPerson(s,{name:['First','甲'],faction:'caesar',birthYear:-70,parents:[parent],familyId:family}),b=createFictionalPerson(s,{name:['Second','乙'],faction:'caesar',birthYear:-68,parents:[parent],familyId:family});
 s.world.characters[parent].alive=false;settleInheritance(s,parent);assert.equal(s.world.characters[a].wealth,2);assert.equal(s.world.characters[b].wealth,2);assert.equal(s.world.dynasties.families[family].wealth,1);assert.equal(s.world.characters[parent].wealth,0);
 settleInheritance(s,parent);assert.equal(s.world.dynasties.families[family].wealth,1);
});
test('legacy settled remainders are recovered once without changing the treasury',()=>{
 let s=newGame('caesar');const parent=createFictionalPerson(s,{name:['Old parent','旧存档家长'],faction:'caesar',birthYear:-90,wealth:1}),family=s.world.characters[parent].familyId,cash=s.factions.caesar.treasury;
 s.world.characters[parent].alive=false;s.world.characters[parent].inheritanceSettled=true;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.dynasties.families[family].wealth,1);assert.equal(s.world.characters[parent].wealth,0);assert.equal(s.factions.caesar.treasury,cash);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.dynasties.families[family].wealth,1);
});
test('legacy family merging recovers a deceased sibling remainder into the surviving family record',()=>{
 let s=newGame('caesar');s.world.dynasties.historicalSeeded=false;const person=s.world.characters.arsinoe;person.familyId='family:arsinoe';person.alive=false;person.inheritanceSettled=true;person.wealth=3;s.world.dynasties.families['family:arsinoe']={id:'family:arsinoe',wealth:4};
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters.arsinoe.familyId,'family:cleopatra');assert.equal(s.world.dynasties.families['family:cleopatra'].wealth,7);assert.equal(s.world.characters.arsinoe.wealth,0);
});
test('an unclaimed contested estate is settled without a fee or duplicated wealth',()=>{
 let {s,parent,family,heir,beneficiary,estate}=caseFixture();s.world.characters[heir].alive=false;s.world.characters[beneficiary].alive=false;s.factions.caesar.treasury=0;
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(resolveInheritanceDispute(s,estate.id,'compromise').outcome,'family');assert.equal(s.world.dynasties.families[family].wealth,35);assert.equal(s.factions.caesar.treasury,0);assert.equal(s.world.characters[parent].wealth,0);assert.equal(resolveInheritanceDispute(s,estate.id,'will').ok,false);
});
test('automatic court resolution does not give funds to a deceased beneficiary',()=>{
 const {s,family,heir,beneficiary,estate}=caseFixture();s.world.characters[beneficiary].alive=false;assert.equal(resolveInheritanceDispute(s,estate.id,'will').ok,false);s.year++;advanceDynasties(s);assert.equal(estate.status,'resolved');assert.equal(estate.choice,'heirs');assert.equal(s.world.characters[heir].wealth,35);assert.equal(s.world.characters[beneficiary].wealth,0);assert.equal(s.world.dynasties.families[family].wealth,0);
});
test('an unclaimed estate resolves on the next month without waiting a year',()=>{
 const {s,family,heir,beneficiary,estate}=caseFixture();s.world.characters[heir].alive=false;s.world.characters[beneficiary].alive=false;s.month++;advanceDynasties(s);assert.equal(estate.status,'resolved');assert.equal(estate.choice,'family');assert.equal(s.world.dynasties.families[family].wealth,35);
});
