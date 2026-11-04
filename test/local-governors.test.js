import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {appointGovernor,dismissGovernor,governorCandidates,localGovernor,officeOf,officeCandidates,advanceOffices,governorLoyaltyEffect} from '../office-system.js';
import {previewPersonTravel} from '../personal-diplomacy.js';
import {availableCommanders} from '../command-appointments.js';

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
