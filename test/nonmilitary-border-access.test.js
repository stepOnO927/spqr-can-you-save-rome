import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js';
import {initializeBorderPolicies,setBorderPolicy,nonMilitaryAccessStatus,militaryAccessStatus} from '../border-access.js';
import {proposeAgreement} from '../agreements.js';
import {previewPersonTravel,startPersonTravel,advancePersonalDiplomacy} from '../personal-diplomacy.js';

test('old policy placeholders preserve previously permitted civilian journeys',()=>{
  const state=newGame('senate');delete state.borderPolicyVersion;
  state.borderPolicies.egypt={civilian:'closed',commercial:'closed',diplomatic:'closed',military:'closed'};
  const restored=upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.borderPolicyVersion,2);
  assert.equal(restored.borderPolicies.egypt.civilian,'open');
  assert.equal(restored.borderPolicies.egypt.diplomatic,'open');
  assert.equal(restored.borderPolicies.egypt.commercial,'open');
  assert.equal(restored.borderPolicies.egypt.military,'closed');
});

test('civilian and diplomatic access are separate and travel respects reported control',()=>{
  const state=newGame('senate');
  state.regions.find(r=>r.id==='italiaS').owner='egypt';
  state.controlKnowledge.senate.italiaS={owner:'egypt',year:state.year,month:state.month};
  assert.equal(setBorderPolicy(state,'egypt','civilian','closed').ok,true);
  assert.equal(nonMilitaryAccessStatus(state,'senate','italiaS','egypt').allowed,false);
  const ordinary=previewPersonTravel(state,'cicero','epirus');
  assert.equal(ordinary.ok,false);
  const envoy=previewPersonTravel(state,'cicero','epirus',{purpose:'diplomatic'});
  assert.equal(envoy.ok,true);
  assert.equal(envoy.legs[0].to,'italiaS');
  assert.equal(startPersonTravel(state,'cicero','epirus',{purpose:'diplomatic'}).ok,true);
  assert.equal(state.world.characters.cicero.travel.purpose,'diplomatic');
  const saved=upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(saved.borderPolicies.egypt.civilian,'closed');
  assert.equal(saved.world.characters.cicero.travel.purpose,'diplomatic');
  for(let i=0;i<envoy.legs[0].months;i++)advancePersonalDiplomacy(state);
  assert.equal(state.world.characters.cicero.location,'italiaS');
});

test('a dated report cannot override closed actual access on arrival',()=>{
  const state=newGame('senate');
  state.regions.find(r=>r.id==='italiaS').owner='egypt';
  state.controlKnowledge.senate.italiaS={owner:'egypt',year:state.year,month:state.month};
  const plan=previewPersonTravel(state,'cicero','epirus');
  assert.equal(plan.ok,true);
  assert.equal(startPersonTravel(state,'cicero','epirus').ok,true);
  state.regions.find(r=>r.id==='italiaS').owner='parthia';
  assert.equal(setBorderPolicy(state,'parthia','civilian','closed').ok,true);
  for(let i=0;i<plan.legs[0].months;i++)advancePersonalDiplomacy(state);
  assert.equal(state.world.characters.cicero.location,'roma');
  assert.equal(state.world.characters.cicero.travel,undefined);
  assert.equal(state.controlKnowledge.senate.italiaS.owner,'parthia');
});

test('trade allows merchants but grants neither civilian nor military passage',()=>{
  const state=newGame('senate');
  state.relations['egypt:senate']=30;
  assert.equal(setBorderPolicy(state,'egypt','civilian','closed').ok,true);
  assert.equal(setBorderPolicy(state,'egypt','commercial','closed').ok,true);
  assert.equal(proposeAgreement(state,'senate','egypt','trade').ok,true);
  assert.equal(nonMilitaryAccessStatus(state,'senate','egypt','egypt','commercial').basis,'trade_treaty');
  assert.equal(nonMilitaryAccessStatus(state,'senate','egypt','egypt','civilian').allowed,false);
  assert.equal(militaryAccessStatus(state,'senate','egypt','egypt').allowed,false);
  assert.equal(setBorderPolicy(state,'egypt','military','open').ok,false);
});
