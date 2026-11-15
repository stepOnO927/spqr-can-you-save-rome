import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, upgradeSave, diplomacy, isWar, tick} from '../engine.js?v=world-kings-trade-1';
import {proposeAgreement, advanceAgreements, terminateAgreement} from '../agreements.js?v=world-kings-trade-1';
import {subjectRelation, subjectAidQuote, requestSubjectAid, subjectTerms} from '../suzerainty.js?v=world-kings-trade-1';
import {militaryAccessStatus, nonMilitaryAccessStatus} from '../border-access.js?v=world-kings-trade-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-trade-1';
import {suzeraintyColor} from '../map-lab/suzerainty-map.js?v=world-kings-trade-1';

const friends = (state, a, b) => { state.relations[[a, b].sort().join(':')] = 70; };
function client() {
  const state = newGame('senate');
  friends(state, 'senate', 'egypt');
  const result = proposeAgreement(state, 'senate', 'egypt', 'client_kingdom');
  assert.equal(result.ok, true);
  return {state, treaty: result.agreement};
}

test('a client kingdom retains territory, army, treasury and dated legal rights', () => {
  let {state, treaty} = client();
  const terms = treaty.terms.subject;
  assert.deepEqual(treaty.parties, ['senate', 'egypt']);
  assert.deepEqual(terms.established, {year: -49, month: 1});
  assert.equal(terms.tribute.treasury, 2);
  assert.equal(terms.militaryObligation.defensiveProtection, true);
  assert.equal(terms.diplomaticAutonomy, 'limited');
  assert.equal(terms.internalAutonomy, 'broad');
  assert.equal(state.regions.find(region => region.id === 'egypt').owner, 'egypt');
  assert.equal(state.armies.find(army => army.id === 'egyptguard').owner, 'egypt');
  assert.equal(militaryAccessStatus(state, 'senate', 'egypt', 'egypt').basis, 'suzerainty');
  assert.equal(militaryAccessStatus(state, 'egypt', 'syria', 'senate').allowed, false);
  state.borderPolicies.egypt.commercial = 'closed';
  assert.equal(nonMilitaryAccessStatus(state, 'senate', 'egypt', 'egypt', 'commercial').basis, 'suzerainty');
  assert.equal(nonMilitaryAccessStatus(state, 'parthia', 'egypt', 'egypt', 'commercial').allowed, false);
  state = upgradeSave(structuredClone(state));
  treaty = subjectRelation(state, 'egypt');
  assert.equal(treaty.terms.subject.politicalLoyalty, 60);
  assert.equal(inspectState(state).filter(item => item.code.includes('subject')).length, 0);
  assert.equal(terminateAgreement(state, treaty.id, 'senate').ok, true);
  assert.equal(subjectRelation(state, 'egypt'), null);
  assert.equal(militaryAccessStatus(state, 'senate', 'egypt', 'egypt').allowed, false);
});

test('tributary payment uses the subject reserve and missed payments increase independence pressure', () => {
  const {state, treaty} = client();
  state.month = 3;
  const subjectCash = state.factions.egypt.treasury, suzerainCash = state.factions.senate.treasury;
  advanceAgreements(state);
  assert.equal(state.factions.egypt.treasury, subjectCash - 2);
  assert.equal(state.factions.senate.treasury, suzerainCash + 2);
  assert.deepEqual(treaty.terms.subject.lastTribute, {year: -49, month: 3, treasury: 2});
  advanceAgreements(state);
  assert.equal(state.factions.egypt.treasury, subjectCash - 2);
  state.factions.egypt.treasury = 13;
  state.month = 6;
  advanceAgreements(state);
  assert.equal(state.factions.egypt.treasury, 13);
  assert.equal(treaty.terms.subject.independenceAspiration, 23);
});

test('sustained inability to pay can end clientage before its scheduled expiry', () => {
  const {state, treaty} = client();
  state.factions.egypt.treasury = 12;
  for (let quarter = 1; quarter <= 12; quarter++) {
    state.year = -49 + Math.floor((quarter - 1) / 4);
    state.month = ((quarter - 1) % 4 + 1) * 3;
    advanceAgreements(state);
  }
  assert.equal(treaty.status, 'renounced');
  assert.equal(subjectRelation(state, 'egypt'), null);
  assert.equal(state.regions.find(region => region.id === 'egypt').owner, 'egypt');
  assert.equal(militaryAccessStatus(state, 'senate', 'egypt', 'egypt').allowed, false);
});

test('a protectorate has a distinct autonomy level, no tribute or automatic military access', () => {
  const state = newGame('senate');
  friends(state, 'senate', 'armenia');
  const treaty = proposeAgreement(state, 'senate', 'armenia', 'protectorate').agreement;
  assert.equal(treaty.terms.subject.internalAutonomy, 'full');
  assert.equal(treaty.terms.subject.diplomaticAutonomy, 'independent');
  assert.equal(treaty.terms.subject.tribute.treasury, 0);
  assert.equal(militaryAccessStatus(state, 'senate', 'armenia', 'armenia').allowed, false);
  state.month = 3;
  const cash = state.factions.armenia.treasury;
  advanceAgreements(state);
  assert.equal(state.factions.armenia.treasury, cash);
  assert.equal(inspectState(state).filter(item => item.code.includes('subject')).length, 0);
});

test('a court unable to protect the proposed subject cannot conclude a dependency', () => {
  const state = newGame('egypt');
  friends(state, 'egypt', 'senate');
  const cash = state.factions.egypt.treasury;
  assert.equal(proposeAgreement(state, 'egypt', 'senate', 'client_kingdom').reason, 'declined');
  assert.equal(state.factions.egypt.treasury, cash);
  assert.equal(subjectRelation(state, 'senate'), null);
});

test('protection is defensive and dependency cannot become circular or multiply held', () => {
  const {state} = client();
  assert.equal(proposeAgreement(state, 'parthia', 'egypt', 'protectorate').reason, 'existing');
  assert.equal(proposeAgreement(state, 'egypt', 'senate', 'protectorate').reason, 'existing');
  assert.equal(proposeAgreement(state, 'egypt', 'parthia', 'offensive').reason, 'autonomy');
  assert.equal(diplomacy(state, 'egypt', 'parthia', 'war'), false);
  assert.equal(diplomacy(state, 'parthia', 'egypt', 'war'), true);
  assert.equal(isWar(state, 'senate', 'parthia'), true);
  assert.equal(state.armies.find(army => army.id === 'egyptguard').owner, 'egypt');
});

test('war suspends rights but cannot create a second suzerain before the old treaty is settled', () => {
  const {state} = client();
  state.wars.push(['senate', 'egypt']);
  assert.equal(subjectRelation(state, 'egypt'), null);
  assert.equal(proposeAgreement(state, 'parthia', 'egypt', 'protectorate').reason, 'existing');
  advanceAgreements(state);
  assert.equal(state.agreements.find(treaty => treaty.type === 'client_kingdom').status, 'ended_by_war');
});

test('requested aid travels over a real border and arrives after a delay', () => {
  let {state} = client();
  const quote = subjectAidQuote(state, 'senate', 'egypt');
  assert.equal(quote.ok, true);
  assert.deepEqual(quote.route, ['egypt', 'syria']);
  assert.equal(quote.months, 2);
  const before = {senateMen: state.factions.senate.manpower, senateFood: state.factions.senate.food, egyptMen: state.factions.egypt.manpower};
  assert.equal(requestSubjectAid(state, 'senate', 'egypt').ok, true);
  assert.equal(state.factions.senate.manpower, before.senateMen);
  assert.equal(state.factions.senate.food, before.senateFood);
  assert.equal(state.factions.egypt.manpower, before.egyptMen - 400);
  assert.equal(subjectAidQuote(state, 'senate', 'egypt').reason, 'cooldown');
  state = upgradeSave(structuredClone(state));
  assert.equal(state.subjectAidShipments[0].status, 'transit');
  state.month = 2;
  advanceAgreements(state);
  assert.equal(state.subjectAidShipments[0].status, 'transit');
  state.month = 3;
  advanceAgreements(state);
  assert.equal(state.subjectAidShipments[0].status, 'delivered');
  assert.equal(state.factions.senate.manpower, before.senateMen + 400);
  assert.equal(state.factions.senate.food, before.senateFood + 3);
  assert.equal(inspectState(state).filter(item => item.code.includes('subject')).length, 0);
});

test('a closed receiving border blocks aid and three blocked months lose the shipment', () => {
  const {state} = client();
  requestSubjectAid(state, 'senate', 'egypt');
  state.borderPolicies.senate.commercial = 'closed';
  for (let month = 2; month <= 4; month++) { state.month = month; advanceAgreements(state); }
  assert.equal(state.subjectAidShipments[0].status, 'lost');
  assert.equal(state.factions.senate.manpower, 34000);
});

test('suzerainty map colors only reported controllers and concluded own treaties', () => {
  const {state, treaty} = client();
  assert.equal(suzeraintyColor(state, 'senate', ['senate']), '#a74737');
  assert.equal(suzeraintyColor(state, 'senate', ['egypt']), '#c0a35b');
  assert.equal(suzeraintyColor(state, 'egypt', ['senate']), '#6d91ac');
  assert.equal(suzeraintyColor(state, 'senate', ['shared']), '#65756d');
  assert.equal(suzeraintyColor(state, 'senate', ['egypt', 'parthia']), '#b39757');
  assert.equal(suzeraintyColor(state, 'parthia', ['egypt']), '#65756d');
  terminateAgreement(state, treaty.id, 'senate');
  assert.equal(suzeraintyColor(state, 'senate', ['egypt']), '#65756d');
});

test('hard AI sends a dated subject offer only to a reported nonplayer neighbor', () => {
  const state = newGame('caesar');
  state.difficulty = 'hard';
  state.month = 5;
  friends(state, 'senate', 'numidia');
  tick(state);
  const offer = (state.world.agreementLetters || []).find(letter => letter.actor === 'senate' && letter.target === 'numidia' && letter.type === 'client_kingdom');
  assert.ok(offer);
  assert.equal(offer.status, 'pending');
  assert.equal(subjectRelation(state, 'numidia'), null);
  assert.ok((state.world.agreementLetters || []).every(letter => letter.target !== state.player));
});

test('the Inspector rejects forged double suzerainty and circular dependencies', () => {
  const {state, treaty} = client();
  const duplicate = structuredClone(treaty);
  duplicate.id = 'invalid:second-suzerain';
  duplicate.parties = ['parthia', 'egypt'];
  duplicate.terms.subject = subjectTerms('client_kingdom', 'parthia', 'egypt', duplicate.start);
  state.agreements.push(duplicate);
  assert.ok(inspectState(state).some(item => item.code === 'multiple-suzerains'));
  state.agreements.pop();
  const cycle = structuredClone(treaty);
  cycle.id = 'invalid:cycle';
  cycle.parties = ['egypt', 'senate'];
  cycle.terms.subject = subjectTerms('client_kingdom', 'egypt', 'senate', cycle.start);
  state.agreements.push(cycle);
  assert.ok(inspectState(state).some(item => item.code === 'circular-suzerainty'));
});
