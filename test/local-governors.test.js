import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=faces-empire-2';
import {appointGovernor,dismissGovernor,governorCandidates,localGovernor,officeOf,officeCandidates,advanceOffices,governorLoyaltyEffect} from '../office-system.js?v=faces-empire-2';
import {previewPersonTravel} from '../personal-diplomacy.js?v=faces-empire-2';
import {availableCommanders} from '../command-appointments.js?v=faces-empire-2';

test('a local administrator costs resources and improves only that theater quarterly',()=>{
 let s=newGame('senate');const cash=s.factions.senate.treasury;assert.ok(governorCandidates(s,'roma').includes('cicero'));
 assert.equal(appointGovernor(s,'roma','cicero').ok,true);assert.equal(s.factions.senate.treasury,cash-5);assert.equal(localGovernor(s,'roma'),'cicero');
 assert.equal(officeOf(s,'senate','cicero'),'theater:roma');assert.equal(previewPersonTravel(s,'cicero','epirus').reason,'unavailable');assert.ok(!availableCommanders(s,'pompey').includes('cicero'));assert.ok(!officeCandidates(s,'senate','finance').includes('cicero'));
 s.month=2;assert.equal(governorLoyaltyEffect(s,'roma'),0);const control=upgradeSave(JSON.parse(JSON.stringify(s)));delete control.world.localGovernors.roma;tick(s);tick(control);
 assert.equal(s.regions.find(r=>r.id==='roma').loyalty,control.regions.find(r=>r.id==='roma').loyalty+1);assert.equal(s.regions.find(r=>r.id==='italiaS').loyalty,control.regions.find(r=>r.id==='italiaS').loyalty);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(localGovernor(s,'roma'),'cicero');assert.equal(dismissGovernor(s,'roma').ok,true);assert.equal(officeOf(s,'senate','cicero'),null);
});
test('appointments require local, capable, unassigned, loyal personnel and player control',()=>{
 const s=newGame('senate');assert.equal(appointGovernor(s,'egypt','cleopatra').reason,'unavailable');assert.equal(appointGovernor(s,'epirus','cicero').reason,'unavailable');assert.equal(appointGovernor(s,'roma','pompey').reason,'unavailable');
 s.world.characters.cicero.loyalty=39;assert.equal(appointGovernor(s,'roma','cicero').reason,'unavailable');s.world.characters.cicero.loyalty=75;s.factions.senate.treasury=4;assert.equal(appointGovernor(s,'roma','cicero').reason,'treasury');
});
test('an invalidated or captured assignment stops working before the next economy and foreign knowledge stays unchanged',()=>{
 for(const change of [s=>s.world.characters.cicero.health='seriously_ill',s=>s.world.characters.cicero.missing={origin:'roma',remaining:3},s=>s.world.characters.cicero.faction='caesar',s=>s.regions.find(r=>r.id==='roma').owner='caesar']){
  const s=newGame('senate');appointGovernor(s,'roma','cicero');change(s);s.month=3;assert.equal(localGovernor(s,'roma'),null);assert.equal(governorLoyaltyEffect(s,'roma'),0);advanceOffices(s);assert.equal(s.world.localGovernors.roma,undefined);assert.equal(s.knowledge.caesar.senate.reports.length,0);
 }
});

test('both Roman AI factions appoint a local administrator with their own available people and without broadcasting the appointment',()=>{
 for(const [player,opponent,theater] of [['caesar','senate','roma'],['senate','caesar','cisalpine']]){
  let s=newGame(player),cash=s.factions[opponent].treasury,chronicle=s.log.length;s.month=1;advanceOffices(s);assert.equal(Object.keys(s.world.offices[opponent]).length,1);assert.equal(s.factions[opponent].treasury,cash-5);assert.equal(s.world.localGovernors[theater],undefined);
  s.month=7;advanceOffices(s);const id=localGovernor(s,theater);assert.ok(id);assert.equal(s.factions[opponent].treasury,cash-10);assert.equal(s.world.characters[id].faction,opponent);assert.equal(s.world.characters[id].location,theater);assert.equal(s.knowledge[player][opponent].reports.length,0);assert.equal(s.log.length,chronicle);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(localGovernor(s,theater),id);s.world.characters[id].health='seriously_ill';assert.equal(localGovernor(s,theater),null);advanceOffices(s);assert.equal(s.knowledge[player][opponent].reports.length,0);
 }
});
test('AI prioritizes a weak eligible theater, spends funds and never appoints into a foreign theater',()=>{
 const s=newGame('caesar');s.month=1;s.regions.find(r=>r.id==='roma').loyalty=50;const initial=s.factions.senate.treasury;advanceOffices(s);assert.ok(localGovernor(s,'roma'));assert.equal(Object.keys(s.world.offices.senate).length,0);assert.equal(s.factions.senate.treasury,initial-5);assert.equal(s.world.localGovernors.cisalpine,undefined);
 const poor=newGame('caesar');poor.month=1;poor.regions.find(r=>r.id==='roma').loyalty=50;poor.factions.senate.treasury=4;advanceOffices(poor);assert.deepEqual(poor.world.localGovernors,{});assert.equal(poor.factions.senate.treasury,4);
});
