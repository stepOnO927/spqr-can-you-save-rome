import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=roman-vacancy-1';
import {localEntity} from '../local-polities.js';
import {advanceLocalResistance} from '../local-resistance.js';
import {advanceOffices,appointLocalAdministrator,dismissLocalAdministrator,localAdministrator,localAdministratorCandidates,officeOf,officeCandidates} from '../office-system.js?v=roman-vacancy-1';
import {inspectState} from '../inspector-diagnostics.js?v=roman-vacancy-1';
import {createFictionalPerson} from '../dynasties.js?v=roman-vacancy-1';
import {startFoothold,advanceFootholds,abandonFoothold} from '../foothold.js';
import {advanceVillages} from '../local-villages.js';
import {renderGenealogy} from '../genealogy-ui.js?v=roman-vacancy-1';

function occupiedTown(){
 const state=newGame('senate'),town=localEntity(state,'capua');
 town.controller='senate';town.legalSovereign='caesar';town.administrativeStatus='occupied';town.resistance=30;
 state.world.characters.cicero.location=town.theater;
 return {state,town};
}

test('a paid settlement appointment survives saves and reduces real local resistance',()=>{
 const {state,town}=occupiedTown(),before=state.factions.senate.treasury;
 assert.ok(localAdministratorCandidates(state,town.id).includes('cicero'));
 const control=structuredClone(state);
 assert.deepEqual(appointLocalAdministrator(state,town.id,'cicero'),{ok:true,cost:5});
 assert.equal(state.factions.senate.treasury,before-5);
 assert.equal(localAdministrator(state,town.id),'cicero');
 assert.equal(officeOf(state,'senate','cicero'),'settlement:capua');
 assert.ok(!officeCandidates(state,'senate','finance').includes('cicero'));
 assert.ok(!localAdministratorCandidates(state,'brundisium').includes('cicero'));
 advanceLocalResistance(state);advanceLocalResistance(control);
 assert.equal(localEntity(state,town.id).resistance,localEntity(control,town.id).resistance-2);
 const loaded=upgradeSave(structuredClone(state));
 assert.equal(localAdministrator(loaded,town.id),'cicero');
 assert.equal(inspectState(loaded).filter(f=>f.code==='invalid-local-administrator').length,0);
 assert.equal(dismissLocalAdministrator(loaded,town.id).ok,true);
 assert.equal(officeOf(loaded,'senate','cicero'),null);
});

test('local office ends when the officer leaves or the city is lost',()=>{
 const {state,town}=occupiedTown();appointLocalAdministrator(state,town.id,'cicero');
 state.world.characters.cicero.location='roma';
 assert.equal(localAdministrator(state,town.id),null);
 advanceOffices(state);assert.equal(state.world.localAdministrators[town.id],undefined);
 state.world.characters.cicero.location=town.theater;appointLocalAdministrator(state,town.id,'cicero');
 town.controller='caesar';advanceOffices(state);
 assert.equal(state.world.localAdministrators[town.id],undefined);
 assert.equal(localAdministratorCandidates(state,town.id).length,0);
});

test('inspector flags forged local administrator records',()=>{
 const {state,town}=occupiedTown();state.world.localAdministrators={capua:{faction:'caesar',person:'cicero'}};
 assert.ok(inspectState(state).some(f=>f.code==='invalid-local-administrator'));
});

test('AI spends its own treasury to staff a distressed city without revealing the post abroad',()=>{
 const state=newGame('caesar'),town=localEntity(state,'capua');
 town.controller='senate';town.legalSovereign='caesar';town.administrativeStatus='occupied';town.resistance=65;
 state.world.characters.cicero.location=town.theater;state.month=7;
 const cash=state.factions.senate.treasury,reports=structuredClone(state.knowledge.caesar.senate.reports);
 advanceOffices(state);
 assert.equal(localAdministrator(state,town.id),'cicero');
 assert.equal(state.factions.senate.treasury,cash-5);
 assert.deepEqual(state.knowledge.caesar.senate.reports,reports);
});

test('a paid village administrator needs a real outpost, improves civilian conditions and signs a petition',()=>{
 const state=newGame('caesar'),site=localEntity(state,'ravenna-farms');
 const id=createFictionalPerson(state,{name:['Test steward','测试村官'],faction:'caesar',birthYear:-85,location:'cisalpine',origin:'court_nominee'});
 assert.ok(!localAdministratorCandidates(state,site.id).includes(id));
 state.world.localAdministrators[site.id]={faction:'caesar',person:id};
 assert.ok(inspectState(state).some(f=>f.code==='invalid-local-administrator'&&f.path.endsWith(site.id)));
 delete state.world.localAdministrators[site.id];
 assert.ok(startFoothold(state,site.id).ok);advanceFootholds(state);
 assert.ok(localAdministratorCandidates(state,site.id).includes(id));
 const cash=state.factions.caesar.treasury;
 assert.deepEqual(appointLocalAdministrator(state,site.id,id),{ok:true,cost:5});
 assert.equal(state.factions.caesar.treasury,cash-5);
 assert.match(renderGenealogy(state),/Village administrator/);
 site.village.security=59;site.village.satisfaction=59;site.village.localIssue='occupation';
 const control=structuredClone(state);delete control.world.localAdministrators[site.id];
 state.month=3;control.month=3;advanceVillages(state);advanceVillages(control);
 assert.equal(site.village.security,localEntity(control,site.id).village.security+2);
 assert.equal(site.village.satisfaction,localEntity(control,site.id).village.satisfaction+1);
 assert.equal(site.village.localIssue,null);
 assert.equal(site.legalSovereign,localEntity(control,site.id).legalSovereign);
 site.village.storedFood=0;site.village.road=0;state.month=6;advanceVillages(state);
 const petition=state.mail.messages.find(mail=>mail.context?.kind==='village_petition'&&mail.context.villageId===site.id);
 assert.ok(petition);assert.deepEqual(petition.senderName,['Test steward','测试村官']);
 site.village.road=1;site.village.storedFood=8;state.month=12;advanceVillages(state);
 const report=state.mail.messages.find(mail=>mail.context?.kind==='village_digest'&&mail.context.sites.includes(site.name[0]));
 assert.ok(report);assert.deepEqual(report.senderName,['Test steward','测试村官']);assert.match(report.body[0],/reported by Test steward/);
 const loaded=upgradeSave(structuredClone(state));assert.equal(localAdministrator(loaded,site.id),id);
 assert.equal(inspectState(loaded).filter(f=>f.code==='invalid-local-administrator').length,0);
 assert.ok(abandonFoothold(loaded,site.id).ok);assert.equal(loaded.world.localAdministrators[site.id],undefined);
});

test('AI can staff a distressed controlled village using its own present officer and treasury',()=>{
 const state=newGame('senate'),site=localEntity(state,'ravenna-farms');
 const id=createFictionalPerson(state,{name:['AI steward','外方村官'],faction:'caesar',birthYear:-85,location:'cisalpine',origin:'court_nominee'});
 state.world.characters[id].loyalty=90;
 assert.ok(startFoothold(state,site.id,'caesar').ok);advanceFootholds(state);
 site.village.security=45;site.village.satisfaction=45;site.village.localIssue='occupation';state.month=7;
 const cash=state.factions.caesar.treasury,reports=structuredClone(state.knowledge.senate.caesar.reports);
 advanceOffices(state);
 assert.equal(localAdministrator(state,site.id),id);
 assert.equal(state.factions.caesar.treasury,cash-5);
 assert.deepEqual(state.knowledge.senate.caesar.reports,reports);
 site.controller='senate';advanceOffices(state);assert.equal(state.world.localAdministrators[site.id],undefined);
});
