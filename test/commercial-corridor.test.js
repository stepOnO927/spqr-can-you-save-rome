import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js';
import {setBorderPolicy,militaryAccessStatus} from '../border-access.js';
import {proposeAgreement,terminateAgreement,advanceAgreements,commercialCorridor} from '../agreements.js';

test('trade revenue requires an actual connected commercial corridor',()=>{
  const state=newGame('egypt');state.relations['egypt:parthia']=30;
  assert.equal(proposeAgreement(state,'egypt','parthia','trade').ok,true);
  assert.deepEqual(commercialCorridor(state,'egypt','parthia').path,['egypt','syria','parthia']);
  const before=state.factions.egypt.treasury;advanceAgreements(state);
  assert.equal(state.factions.egypt.treasury,before+1);
  assert.equal(setBorderPolicy(state,'senate','commercial','closed').ok,true);
  assert.equal(commercialCorridor(state,'egypt','parthia').reason,'blocked');
  advanceAgreements(state);assert.equal(state.factions.egypt.treasury,before+1);
  const saved=upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(saved.borderPolicies.senate.commercial,'closed');
  assert.equal(commercialCorridor(saved,'egypt','parthia').reason,'blocked');
});

test('a transit trade agreement reopens a closed merchant border without army access',()=>{
  const state=newGame('egypt');state.relations['egypt:parthia']=30;state.relations['egypt:senate']=30;
  assert.equal(proposeAgreement(state,'egypt','parthia','trade').ok,true);
  setBorderPolicy(state,'senate','commercial','closed');
  assert.equal(commercialCorridor(state,'egypt','parthia').ok,false);
  const transit=proposeAgreement(state,'egypt','senate','trade');assert.equal(transit.ok,true);
  assert.equal(commercialCorridor(state,'egypt','parthia').ok,true);
  assert.equal(militaryAccessStatus(state,'egypt','syria','senate').allowed,false);
  assert.equal(terminateAgreement(state,transit.agreement.id,'egypt',{mutual:true}).ok,true);
  assert.equal(commercialCorridor(state,'egypt','parthia').ok,false);
});
