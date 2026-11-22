import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=estate-courier-1';
import {createFictionalPerson,makeWill,settleInheritance,resolveInheritanceDispute,advanceEstateTransfers,advanceDynasties,retryEstateTransfer,reclaimEstateTransfer} from '../dynasties.js?v=estate-courier-1';
import {addReport} from '../character-system.js?v=estate-courier-1';
import {renderGenealogy} from '../genealogy-ui.js?v=estate-courier-1';

function disputed(){
 const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Testator','立遗嘱者'],faction:'caesar',birthYear:-90,wealth:30}),child=createFictionalPerson(s,{name:['Child','本方子女'],faction:'caesar',birthYear:-65,parents:[parent]}),foreign=createFictionalPerson(s,{name:['Known heir','报告受益人'],faction:'egypt',birthYear:-70,parents:[parent]});
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'spy'});assert.ok(makeWill(s,parent,foreign).ok);return {s,parent,child,foreign};
}
function resolve(s,parent){s.world.characters[parent].alive=false;settleInheritance(s,parent);const d=s.world.dynasties.inheritanceDisputes.at(-1);assert.ok(d);return d}
function advance(s,n){for(let i=0;i<n;i++)advanceEstateTransfers(s)}

test('an undisclosed foreign death does not change the visible case, ruling, cost or escrow',()=>{
 const initial=disputed(),alive=upgradeSave(structuredClone(initial.s)),dead=upgradeSave(structuredClone(initial.s));dead.world.characters[initial.foreign].alive=false;dead.world.characters[initial.foreign].health='deceased';
 const a=resolve(alive,initial.parent),b=resolve(dead,initial.parent);assert.deepEqual(a,b);assert.equal(renderGenealogy(alive,true),renderGenealogy(dead,true));
 assert.deepEqual(resolveInheritanceDispute(alive,a.id,'compromise'),resolveInheritanceDispute(dead,b.id,'compromise'));
 assert.equal(alive.world.characters[initial.child].wealth,15);assert.equal(dead.world.characters[initial.child].wealth,15);assert.equal(alive.world.characters[initial.foreign].wealth,0);assert.equal(dead.world.characters[initial.foreign].wealth,0);
 assert.deepEqual(alive.world.dynasties.estateTransfers,dead.world.dynasties.estateTransfers);assert.equal(alive.world.dynasties.estateTransfers[0].amount,15);assert.equal(alive.factions.caesar.treasury,dead.factions.caesar.treasury);
 advance(dead,4);assert.equal(dead.world.dynasties.estateTransfers[0].status,'no_reply');assert.equal(dead.world.characters[initial.foreign].wealth,0);
});

test('lost correspondence and an unavailable heir have the same result; a held share can be retried or reclaimed only once',()=>{
 const {s,parent,foreign}=disputed(),estate=resolve(s,parent);assert.ok(resolveInheritanceDispute(s,estate.id,'will').ok);const base=upgradeSave(structuredClone(s));let lost,delivered;
 for(let seed=1;seed<300&&(!lost||!delivered);seed++){const candidate=upgradeSave(structuredClone(base)),t=candidate.world.dynasties.estateTransfers[0];t.courierSeed=seed;advance(candidate,4);if(t.status==='no_reply')lost=candidate;if(t.status==='delivered')delivered=candidate}
 assert.ok(lost);assert.ok(delivered);const dead=upgradeSave(structuredClone(base));dead.world.characters[foreign].alive=false;dead.world.dynasties.estateTransfers[0].courierSeed=lost.world.dynasties.estateTransfers[0].courierSeed;advance(dead,4);
 assert.equal(dead.world.dynasties.estateTransfers[0].status,'no_reply');assert.equal(lost.world.dynasties.estateTransfers[0].status,'no_reply');assert.equal(delivered.world.characters[foreign].wealth,30);
 const t=lost.world.dynasties.estateTransfers[0],family=lost.world.dynasties.families[t.familyId],before=family.wealth;assert.ok(retryEstateTransfer(lost,t.id).ok);assert.equal(reclaimEstateTransfer(lost,t.id).ok,false);t.courierSeed=dead.world.dynasties.estateTransfers[0].courierSeed;advance(lost,4);assert.equal(t.status,'no_reply');assert.ok(reclaimEstateTransfer(lost,t.id).ok);assert.equal(family.wealth,before+30);assert.equal(reclaimEstateTransfer(lost,t.id).ok,false);advance(lost,4);assert.equal(family.wealth,before+30);
});

test('foreign beneficiaries do not cause an immediate automatic ruling from hidden death',()=>{
 const {s,parent,child,foreign}=disputed(),estate=resolve(s,parent);s.world.characters[child].alive=false;s.world.characters[foreign].alive=false;s.month++;advanceDynasties(s);assert.equal(estate.status,'pending');
});
