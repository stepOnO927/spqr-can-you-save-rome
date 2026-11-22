import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-meeting-1';
import {createFictionalPerson,isKnownAdult,isKnownMinor,offerFamilyAccord,nominateGuardian,settleInheritance,advanceDynasties} from '../dynasties.js?v=world-kings-meeting-1';

test('unknown, future and historically ambiguous ages are not treated as confirmed minors or adults',()=>{
 const s=newGame('caesar'),future=createFictionalPerson(s,{name:['Future','未来人物'],faction:'caesar',birthYear:s.year+1,parents:['caesar']}),child=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:s.year-8,parents:['caesar']});
 // Arsinoe's historically uncertain birth range spans the age threshold.
 s.world.characters.arsinoe.faction='caesar';s.world.characters.arsinoe.parents.push('caesar');s.world.characters.caesar.children.push('arsinoe');
 for(const id of ['lepidus',future,'arsinoe']){assert.equal(isKnownMinor(s,id),false,id);assert.equal(isKnownAdult(s,id),false,id)}
 assert.equal(isKnownMinor(s,child),true);assert.equal(isKnownAdult(s,'caesar'),true);
 const treasury=s.factions.caesar.treasury;
 for(const id of ['lepidus',future,'arsinoe'])assert.equal(offerFamilyAccord(s,'wardship','cleopatra','egypt',id).reason,'child');
 assert.equal(s.factions.caesar.treasury,treasury);
 assert.equal(nominateGuardian(s,'caesar',future,'antony').reason,'age');
 assert.equal(nominateGuardian(s,'caesar','arsinoe','antony').reason,'age');
 assert.ok(nominateGuardian(s,'caesar',child,'antony').ok);
});

test('an old nomination cannot activate a guardianship when a child’s age is unrecorded',()=>{
 let s=newGame('caesar'),child=createFictionalPerson(s,{name:['Uncertain','年龄未记录'],faction:'caesar',birthYear:s.year-8,parents:['caesar']});
 s.world.characters[child].guardianNominee='antony';s.world.characters[child].birthYear=null;s.world.dynasties.catalog[child].birth=null;
 s=upgradeSave(structuredClone(s));s.world.characters.caesar.alive=false;settleInheritance(s,'caesar');assert.equal(s.world.characters[child].guardian,undefined);
});

test('a pending wardship cannot become active if its child’s age is no longer recorded',()=>{
 for(let seed=1;seed<=20;seed++){
  let s=newGame('caesar');const child=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:s.year-8,parents:['caesar']});
  assert.ok(offerFamilyAccord(s,'wardship','cleopatra','egypt',child).ok);s.world.characters[child].birthYear=null;s.world.dynasties.catalog[child].birth=null;
  s=upgradeSave(structuredClone(s));s.world.dynasties.seed=seed*1000003;for(let i=0;i<4;i++){s.month++;advanceDynasties(s)}
  assert.equal(s.world.dynasties.familyAccords[0].status,'no_reply');assert.equal(s.world.characters[child].diplomaticGuardian,undefined);
 }
});

test('guardianship ends at the age threshold or when its guardian becomes unavailable',()=>{
 for(const change of [s=>s.year+=8,s=>s.world.characters.antony.alive=false,s=>s.world.characters.antony.missing=true,s=>s.world.characters.antony.faction='senate']){
  let s=newGame('caesar'),child=createFictionalPerson(s,{name:['Ward','受监护子女'],faction:'caesar',birthYear:s.year-8,parents:['caesar']});assert.ok(nominateGuardian(s,'caesar',child,'antony').ok);s.world.characters.caesar.alive=false;settleInheritance(s,'caesar');assert.equal(s.world.characters[child].guardian,'antony');
  s=upgradeSave(structuredClone(s));change(s);advanceDynasties(s);assert.equal(s.world.characters[child].guardian,undefined);const count=s.world.dynasties.lives[child].length;advanceDynasties(s);assert.equal(s.world.dynasties.lives[child].length,count);
 }
});
test('an unknown ward age does not prove an existing guardianship has ended',()=>{
 let s=newGame('caesar'),child=createFictionalPerson(s,{name:['Ward','子女'],faction:'caesar',birthYear:s.year-8,parents:['caesar']});assert.ok(nominateGuardian(s,'caesar',child,'antony').ok);s.world.characters.caesar.alive=false;settleInheritance(s,'caesar');s.world.characters[child].birthYear=null;s.world.dynasties.catalog[child].birth=null;s=upgradeSave(structuredClone(s));advanceDynasties(s);assert.equal(s.world.characters[child].guardian,'antony');
});
