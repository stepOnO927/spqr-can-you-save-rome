import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=intelligence-archive-1';
import {setBorderPolicy,militaryAccessStatus} from '../border-access.js?v=intelligence-archive-1';
import {proposeAgreement,terminateAgreement,advanceAgreements,commercialCorridor} from '../agreements.js?v=intelligence-archive-1';
import {inspectState} from '../inspector-diagnostics.js?v=intelligence-archive-1';

test('trade revenue requires an actual connected commercial corridor',()=>{
  const state=newGame('egypt');state.relations['egypt:parthia']=30;
  assert.equal(proposeAgreement(state,'egypt','parthia','trade').ok,true);
  assert.deepEqual(commercialCorridor(state,'egypt','parthia').path,['egypt','syria','parthia']);
  const before=state.factions.egypt.treasury;advanceAgreements(state);
  assert.equal(state.factions.egypt.treasury,before);
  assert.equal(state.tradeCargo.filter(cargo=>cargo.status==='transit').length,2);
  assert.equal(inspectState(state).filter(item=>item.code.startsWith('invalid-trade')).length,0);
  assert.equal(setBorderPolicy(state,'senate','commercial','closed').ok,true);
  assert.equal(commercialCorridor(state,'egypt','parthia').reason,'blocked');
  for(let month=2;month<=5;month++){state.month=month;advanceAgreements(state)}
  assert.equal(state.factions.egypt.treasury,before);
  assert.equal(state.tradeCargo.every(cargo=>cargo.status==='lost'),true);
  const saved=upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.equal(saved.borderPolicies.senate.commercial,'closed');
  assert.equal(commercialCorridor(saved,'egypt','parthia').reason,'blocked');
  assert.equal(saved.tradeCargo[0].reason,'blocked');
  saved.tradeCargo[0].path[1]='roma';
  assert.ok(inspectState(saved).some(item=>item.code==='invalid-trade-route'));
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

test('trade goods arrive after mapped legs and winter delays a difficult crossing',()=>{
 const state=newGame('egypt');state.relations['egypt:parthia']=30;
 assert.equal(proposeAgreement(state,'egypt','parthia','trade').ok,true);
 const before=state.factions.egypt.treasury;advanceAgreements(state);
 const first=state.tradeCargo.find(cargo=>cargo.from==='parthia');
 assert.deepEqual(first.path,['parthia','syria','egypt']);
 assert.equal(first.remaining,2);
 for(let month=2;month<=4;month++){state.month=month;advanceAgreements(state)}
 assert.equal(first.status,'transit');assert.equal(state.factions.egypt.treasury,before);
 state.month=5;advanceAgreements(state);
 assert.equal(first.status,'delivered');assert.equal(state.factions.egypt.treasury,before+1);
 const winter=newGame('numidia');winter.relations['mauretania:numidia']=60;
 assert.equal(proposeAgreement(winter,'numidia','mauretania','trade').ok,true);
 advanceAgreements(winter);
 assert.equal(winter.tradeCargo.find(cargo=>cargo.from==='numidia').remaining,3);
});

test('a winter sea hazard can lose recorded goods without crediting the recipient',()=>{
 const state=newGame('senate');state.relations['bosporus:senate']=60;
 assert.equal(proposeAgreement(state,'senate','bosporus','trade').ok,true);
 const before=state.factions.senate.treasury;advanceAgreements(state);
 const cargo=state.tradeCargo.find(item=>item.from==='bosporus');
 assert.deepEqual(cargo.path,['bosporus','anatolia']);
 assert.equal(cargo.remaining,4);
 for(let month=2;month<=5;month++){state.month=month;advanceAgreements(state)}
 assert.equal(cargo.status,'lost');assert.equal(cargo.reason,'winter_hazard');
 assert.equal(state.factions.senate.treasury,before);
});

test('a treaty ends its cargo and does not dispatch twice in one month',()=>{
 const state=newGame('egypt');state.relations['egypt:parthia']=30;
 const treaty=proposeAgreement(state,'egypt','parthia','trade').agreement;
 advanceAgreements(state);advanceAgreements(state);
 assert.equal(state.tradeCargo.length,2);
 assert.equal(terminateAgreement(state,treaty.id,'egypt',{mutual:true}).ok,true);
 state.month=2;advanceAgreements(state);
 assert.equal(state.tradeCargo.every(cargo=>cargo.status==='lost'&&cargo.reason==='treaty_ended'),true);
});

test('cargo cannot credit a former destination after territorial control changes',()=>{
 const state=newGame('egypt');state.relations['egypt:parthia']=30;
 assert.equal(proposeAgreement(state,'egypt','parthia','trade').ok,true);
 advanceAgreements(state);const cargo=state.tradeCargo.find(item=>item.from==='egypt');
 state.regions.find(region=>region.id==='parthia').owner='senate';
 for(let month=2;month<=7;month++){state.month=month;advanceAgreements(state)}
 assert.equal(cargo.status,'lost');assert.equal(cargo.reason,'blocked');
});
