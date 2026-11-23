import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=multipolar-review-1';
import {createFictionalPerson,makeWill,settleInheritance,resolveInheritanceDispute,advanceEstateTransfers,advanceEstateRulingNotices,retryEstateRulingNotice,advanceDynasties,retryEstateTransfer,reclaimEstateTransfer} from '../dynasties.js?v=multipolar-review-1';
import {addReport} from '../character-system.js?v=multipolar-review-1';
import {renderGenealogy} from '../genealogy-ui.js?v=multipolar-review-1';

function disputed(){
 const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Testator','立遗嘱者'],faction:'caesar',birthYear:-90,wealth:30}),child=createFictionalPerson(s,{name:['Child','本方子女'],faction:'caesar',birthYear:-65,parents:[parent]}),foreign=createFictionalPerson(s,{name:['Known heir','报告受益人'],faction:'egypt',birthYear:-70,parents:[parent]});
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'spy'});assert.ok(makeWill(s,parent,foreign).ok);return {s,parent,child,foreign};
}
function resolve(s,parent){s.world.characters[parent].alive=false;settleInheritance(s,parent);const d=s.world.dynasties.inheritanceDisputes.at(-1);assert.ok(d);return d}
function advance(s,n){for(let i=0;i<n;i++){if(++s.month>12){s.month=1;s.year++}advanceEstateTransfers(s)}}

test('an undisclosed foreign death does not change the visible case, ruling, cost or escrow',()=>{
 const initial=disputed(),alive=upgradeSave(structuredClone(initial.s)),dead=upgradeSave(structuredClone(initial.s));dead.world.characters[initial.foreign].alive=false;dead.world.characters[initial.foreign].health='deceased';
 const a=resolve(alive,initial.parent),b=resolve(dead,initial.parent);assert.deepEqual(a,b);assert.equal(renderGenealogy(alive,true),renderGenealogy(dead,true));
 assert.deepEqual(resolveInheritanceDispute(alive,a.id,'compromise'),resolveInheritanceDispute(dead,b.id,'compromise'));
 assert.equal(alive.world.characters[initial.child].wealth,15);assert.equal(dead.world.characters[initial.child].wealth,15);assert.equal(alive.world.characters[initial.foreign].wealth,0);assert.equal(dead.world.characters[initial.foreign].wealth,0);
 assert.deepEqual(alive.world.dynasties.estateTransfers,dead.world.dynasties.estateTransfers);assert.equal(alive.world.dynasties.estateTransfers[0].amount,15);assert.equal(alive.factions.caesar.treasury,dead.factions.caesar.treasury);
 advanceEstateTransfers(dead);assert.equal(dead.world.dynasties.estateTransfers[0].remaining,4,'the dispatch month must not count as a travel month');
 advance(dead,3);assert.equal(dead.world.dynasties.estateTransfers[0].status,'pending');assert.equal(dead.world.characters[initial.foreign].wealth,0);advance(dead,1);assert.equal(dead.world.dynasties.estateTransfers[0].status,'no_reply');assert.equal(dead.world.characters[initial.foreign].wealth,0);
});

test('lost correspondence and an unavailable heir have the same result; a held share can be retried or reclaimed only once',()=>{
 const {s,parent,foreign}=disputed(),estate=resolve(s,parent);assert.ok(resolveInheritanceDispute(s,estate.id,'will').ok);const base=upgradeSave(structuredClone(s));let lost,delivered;
 for(let seed=1;seed<300&&(!lost||!delivered);seed++){const candidate=upgradeSave(structuredClone(base)),t=candidate.world.dynasties.estateTransfers[0];t.courierSeed=seed;advance(candidate,4);if(t.status==='no_reply')lost=candidate;if(t.status==='delivered')delivered=candidate}
 assert.ok(lost);assert.ok(delivered);const dead=upgradeSave(structuredClone(base));dead.world.characters[foreign].alive=false;dead.world.dynasties.estateTransfers[0].courierSeed=lost.world.dynasties.estateTransfers[0].courierSeed;advance(dead,4);
 assert.equal(dead.world.dynasties.estateTransfers[0].status,'no_reply');assert.equal(lost.world.dynasties.estateTransfers[0].status,'no_reply');assert.equal(delivered.world.characters[foreign].wealth,30);
 const t=lost.world.dynasties.estateTransfers[0],family=lost.world.dynasties.families[t.familyId],before=family.wealth;assert.ok(retryEstateTransfer(lost,t.id).ok);assert.equal(reclaimEstateTransfer(lost,t.id).ok,false);lost.world.characters[foreign].alive=false;advance(lost,4);assert.equal(t.status,'no_reply');assert.ok(reclaimEstateTransfer(lost,t.id).ok);assert.equal(family.wealth,before+30);assert.equal(reclaimEstateTransfer(lost,t.id).ok,false);advance(lost,4);assert.equal(family.wealth,before+30);
});

test('foreign beneficiaries do not cause an immediate automatic ruling from hidden death',()=>{
 const {s,parent,child,foreign}=disputed(),estate=resolve(s,parent);s.world.characters[child].alive=false;s.world.characters[foreign].alive=false;s.month++;advanceDynasties(s);assert.equal(estate.status,'pending');
});

test('an AI court reclaims an unanswered cross-border share without announcing its private estate',()=>{
 const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Foreign testator','外国立遗嘱者'],faction:'egypt',birthYear:-90,wealth:18}),heir=createFictionalPerson(s,{name:['Foreign child','外国子女'],faction:'parthia',birthYear:-66,parents:[parent]});
 assert.ok(makeWill(s,parent,heir).ok);s.world.characters[heir].alive=false;const before=structuredClone(s.log);s.world.characters[parent].alive=false;settleInheritance(s,parent);const transfer=s.world.dynasties.estateTransfers[0],family=s.world.dynasties.families[transfer.familyId],wealth=family.wealth;
 advance(s,4);assert.equal(transfer.status,'no_reply');advance(s,5);assert.equal(transfer.status,'no_reply');advance(s,1);assert.equal(transfer.status,'reclaimed');assert.equal(family.wealth,wealth+18);assert.deepEqual(s.log,before);
});

test('old saves without a transfer ledger keep their existing estate cases',()=>{
 const {s,parent}=disputed(),estate=resolve(s,parent);delete s.world.dynasties.estateTransfers;delete s.world.dynasties.nextEstateTransfer;const loaded=upgradeSave(structuredClone(s));assert.deepEqual(loaded.world.dynasties.estateTransfers,[]);assert.equal(loaded.world.dynasties.inheritanceDisputes.find(x=>x.id===estate.id).status,'pending');assert.ok(resolveInheritanceDispute(loaded,estate.id,'compromise').ok);assert.equal(loaded.world.dynasties.estateTransfers[0].amount,15);
});


test('foreign reactions wait for an acknowledged ruling notice and preserve uncertainty across saves',()=>{
 const {s,parent,child,foreign}=disputed(),estate=resolve(s,parent),loyalty=s.world.characters[foreign].loyalty,relations=s.relations['caesar:egypt']||0;assert.ok(resolveInheritanceDispute(s,estate.id,'heirs').ok);
 const notice=s.world.dynasties.estateRulingNotices[0];assert.ok(notice);assert.equal(s.world.characters[foreign].loyalty,loyalty);assert.equal(s.relations['caesar:egypt']||0,relations);advanceEstateRulingNotices(s);assert.equal(notice.remaining,4);
 const base=upgradeSave(structuredClone(s));let delivered,lost;for(let seed=1;seed<500&&(!delivered||!lost);seed++){const candidate=upgradeSave(structuredClone(base)),n=candidate.world.dynasties.estateRulingNotices[0];n.courierSeed=seed;for(let i=0;i<4;i++){if(++candidate.month>12){candidate.month=1;candidate.year++}advanceEstateRulingNotices(candidate)}if(n.status==='delivered')delivered=candidate;else if(n.status==='no_reply')lost=candidate}
 assert.ok(delivered);assert.ok(lost);assert.equal(delivered.world.characters[foreign].loyalty,loyalty-10);assert.equal(delivered.relations['caesar:egypt'],relations-4);assert.equal(lost.world.characters[foreign].loyalty,loyalty);assert.equal(lost.relations['caesar:egypt']||0,relations);
 const dead=upgradeSave(structuredClone(base));dead.world.characters[foreign].alive=false;dead.world.dynasties.estateRulingNotices[0].courierSeed=lost.world.dynasties.estateRulingNotices[0].courierSeed;for(let i=0;i<4;i++){if(++dead.month>12){dead.month=1;dead.year++}advanceEstateRulingNotices(dead)}assert.equal(dead.world.dynasties.estateRulingNotices[0].status,'no_reply');assert.equal(dead.relations['caesar:egypt']||0,relations);
 const n=lost.world.dynasties.estateRulingNotices[0];assert.ok(retryEstateRulingNotice(lost,n.id).ok);assert.equal(n.status,'pending');assert.equal(n.remaining,4);assert.equal(retryEstateRulingNotice(lost,n.id).ok,false);assert.ok(child);
});

test('old saves without a ruling notice ledger are upgraded',()=>{const {s}=disputed();delete s.world.dynasties.estateRulingNotices;const loaded=upgradeSave(structuredClone(s));assert.deepEqual(loaded.world.dynasties.estateRulingNotices,[])});
