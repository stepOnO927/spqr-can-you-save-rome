import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {proposeAgreement} from '../agreements.js';
import {planRoutes} from '../route-planner.js';

test('route planner distinguishes legal passage from trade and scoped army access', () => {
  const state = newGame('numidia');
  const unit = state.armies.find(army => army.owner === 'numidia');
  const key = ['numidia', 'mauretania'].sort().join(':'); state.relations[key] = 60;
  assert.equal(planRoutes(state, unit.id, 'mauretania').recommended.status, 'requires_permission');
  assert.equal(proposeAgreement(state, 'numidia', 'mauretania', 'trade').ok, true);
  assert.equal(planRoutes(state, unit.id, 'mauretania').recommended.status, 'requires_permission');
  assert.equal(proposeAgreement(state, 'numidia', 'mauretania', 'military_access', {
    access: {permittedParty: 'numidia', permittedTerritories: ['mauretania']}
  }).ok, true);
  assert.equal(planRoutes(state, unit.id, 'mauretania').recommended.status, 'treaty');
});

test('unknown foreign control stays unknown even when actual ownership differs', () => {
  const state = newGame('numidia');
  const unit = state.armies.find(army => army.owner === 'numidia');
  state.regions.find(region => region.id === 'mauretania').owner = 'egypt';
  delete state.controlKnowledge.numidia.mauretania;
  const result = planRoutes(state, unit.id, 'mauretania');
  assert.equal(result.recommended.status, 'unconfirmed');
  assert.equal(result.recommended.legs[0].reportedOwner, null);
  assert.equal(JSON.stringify(result).includes('egypt'), false);
});

test('long-distance planner offers distinct first steps without creating new geography', () => {
  const state = newGame('caesar');
  const result = planRoutes(state, 'xiii', 'africa');
  assert.equal(result.ok, true);
  assert.ok(result.routes.length >= 2);
  assert.notEqual(result.routes[0].firstStep, result.routes[1].firstStep);
  assert.equal(result.routes.every(route => route.nodes[0] === 'cisalpine' && route.nodes.at(-1) === 'africa'), true);
  assert.equal(planRoutes(state, 'xiii', 'outside').reason, 'outside_scenario');
});

test('expedition brief ties objective and staging to the real route and own stores',()=>{
 const state=newGame('caesar'),route=planRoutes(state,'xiii','gaul').recommended;
 assert.equal(route.brief.objective,'gaul');
 assert.equal(route.brief.homeBase,'cisalpine');
 assert.equal(route.brief.armyMen,7200);
 assert.equal(route.brief.monthlyDepotFood,2);
 assert.ok(route.brief.staging.some(point=>point.theater==='cisalpine'&&point.kind==='integrated'));
 assert.deepEqual(route.brief.politicalAccess.map(leg=>leg.theater),route.nodes.slice(1));
 assert.equal(route.brief.seaCost,route.seaCost);
});

test('foreign current supply changes do not leak into distant route briefs',()=>{
 const state=newGame('numidia'),unit=state.armies.find(army=>army.owner==='numidia');
 const before=planRoutes(state,unit.id,'mauretania');
 const foreign=state.regions.find(region=>region.id==='mauretania');
 foreign.supply=1;foreign.fort=5;foreign.food=999;
 const after=planRoutes(state,unit.id,'mauretania');
 assert.deepEqual(after,before);
 assert.equal(after.recommended.brief.homeBase,'numidia');
 assert.ok(after.recommended.brief.risk.some(item=>item.kind==='support_unconfirmed'));
});
