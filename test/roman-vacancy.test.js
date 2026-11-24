import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {initializeCursus} from '../cursus-honorum.js?v=dossier-archive-1';
import {createFictionalPerson} from '../dynasties.js?v=dossier-archive-1';
import {assignSuccession,successorFor} from '../characters.js?v=dossier-archive-1';
import {advanceGovernments,appointVacantRomanLeader,deriveGovernment,eligibleDeputies,planSuccession} from '../governance.js?v=dossier-archive-1';

const clearLeaders=s=>{for(const id of ['caesar','antony','lepidus']){s.world.characters[id].alive=false;s.world.characters[id].health='deceased'}s.world.leadership.caesar=[]};

test('Roman public figures can succeed, while unrelated family and unavailable figures cannot',()=>{
 const s=newGame('caesar'),c=initializeCursus(s),id=c.senators.find(x=>x.faction==='caesar').id;
 const relative=createFictionalPerson(s,{name:['Relative','亲属'],faction:'caesar',birthYear:s.year-30,location:'cisalpine'});
 assert.ok(successorFor(s,'caesar').includes(id));assert.ok(!successorFor(s,'caesar').includes(relative));
 c.retired[id]=true;assert.ok(!successorFor(s,'caesar').includes(id));delete c.retired[id];
 s.world.characters[id].birthYear=s.year-17;assert.ok(!successorFor(s,'caesar').includes(id));s.world.characters[id].birthYear=s.year-40;
 s.world.characters[id].missing=true;assert.ok(!successorFor(s,'caesar').includes(id));delete s.world.characters[id].missing;
 s.world.characters[id].faction='senate';assert.ok(!successorFor(s,'caesar').includes(id));s.world.characters[id].faction='caesar';
 s.world.characters[id].influence=100;assert.equal(planSuccession(s,id).ok,true);s.world.characters.caesar.alive=false;
 assert.deepEqual(assignSuccession(s,'caesar'),[id]);assert.equal(s.world.successionPlans.caesar,undefined);
});

test('a player can fill a genuine vacancy, but not replace a missing leader or spend unavailable funds',()=>{
 let s=newGame('caesar');const c=initializeCursus(s),id=c.senators.find(x=>x.faction==='caesar').id,treasury=s.factions.caesar.treasury;
 s.world.characters.caesar.missing=true;assert.equal(appointVacantRomanLeader(s,id).reason,'unavailable');assert.equal(s.factions.caesar.treasury,treasury);
 delete s.world.characters.caesar.missing;clearLeaders(s);s.world.characters[id].travel={destination:'roma'};
 assert.equal(appointVacantRomanLeader(s,id).reason,'unavailable');delete s.world.characters[id].travel;
 assert.ok(eligibleDeputies(s,'caesar').includes(id));s.factions.caesar.treasury=4;assert.equal(appointVacantRomanLeader(s,id).reason,'treasury');
 s.factions.caesar.treasury=20;s.world.successionPlans.caesar='lepidus';assert.equal(appointVacantRomanLeader(s,id).ok,true);
 assert.deepEqual(s.world.leadership.caesar,[id]);assert.equal(s.factions.caesar.treasury,15);assert.equal(s.world.successionPlans.caesar,undefined);assert.equal(deriveGovernment(s,'caesar').kind,'normal');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.world.leadership.caesar,[id]);assert.equal(deriveGovernment(s,'caesar').kind,'normal');
});

test('AI revisits a vacancy after an eligible official appears; a human retains the choice',()=>{
 const s=newGame('caesar');clearLeaders(s);s.world.governments.caesar=deriveGovernment(s,'caesar');
 const c=initializeCursus(s),id=c.senators.find(x=>x.faction==='caesar').id;s.world.characters[id].influence=100;
 advanceGovernments(s);assert.deepEqual(s.world.leadership.caesar,[]);
 advanceGovernments(s,{autoplayPlayer:true});assert.equal(s.world.leadership.caesar[0],id);
});
