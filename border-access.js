import {activeAgreement,proposeAgreement} from './agreements.js?v=world-kings-audience-1';
import {subjectRelation} from './suzerainty.js?v=world-kings-audience-1';

export const BORDER_ACCESS_CATEGORIES = Object.freeze([
  'closed', 'civilian', 'commercial', 'diplomatic',
  'limited_military', 'full_military', 'allied_military', 'suzerainty'
]);

// These policies describe the default border stance. Rights granted by a
// particular treaty are checked separately, so trade never moves an army.
export function initializeBorderPolicies(state) {
  state.borderPolicies ||= {};
  state.borderIncidents ||= [];
  state.nextBorderIncidentId ||= 1;
  for (const owner of Object.keys(state.factions || {})) {
    state.borderPolicies[owner] ||= {
      civilian: 'open', commercial: 'open', diplomatic: 'open', military: 'closed'
    };
    // Earlier saves stored closed civilian/diplomatic placeholders without
    // enforcing them. Preserve their actual travel rules during migration.
    if ((state.borderPolicyVersion || 0) < 2) {
      state.borderPolicies[owner].civilian = 'open';
      state.borderPolicies[owner].commercial = 'open';
      state.borderPolicies[owner].diplomatic = 'open';
    }
  }
  state.borderPolicyVersion = 2;
  return state;
}

export function setBorderPolicy(state, owner, kind, mode) {
  if (!state.factions?.[owner] || !['civilian', 'commercial', 'diplomatic'].includes(kind) || !['open', 'closed'].includes(mode)) return {ok: false, reason: 'invalid'};
  initializeBorderPolicies(state);
  state.borderPolicies[owner][kind] = mode;
  return {ok: true, policy: state.borderPolicies[owner]};
}

// Declared border policies are public. A route preview supplies its dated
// control report; arrival supplies actual control after observing the border.
export function nonMilitaryAccessStatus(state, actor, theaterId, reportedOwner, kind = 'civilian') {
  const target = state.regions.find(region => region.id === theaterId);
  if (!target || !['civilian', 'commercial', 'diplomatic'].includes(kind)) return {allowed: false, reason: 'invalid'};
  const owner = reportedOwner === undefined ? target.owner : reportedOwner;
  if (!owner) return {allowed: true, basis: 'unconfirmed', owner: null};
  if (owner === actor) return {allowed: true, basis: 'own', owner};
  if (atWar(state, actor, owner)) return {allowed: false, reason: 'war', owner};
  const policy = state.borderPolicies?.[owner]?.[kind] || 'open';
  if (policy === 'open') return {allowed: true, basis: 'open_policy', owner};
  if (kind === 'commercial' && activeAgreement(state, actor, owner, 'trade')) return {allowed: true, basis: 'trade_treaty', owner};
  if (kind === 'commercial' && subjectRelation(state, owner)?.terms.subject.suzerain === actor && subjectRelation(state, owner).terms.subject.commercialPrivileges === 'suzerain_into_subject') return {allowed: true, basis: 'suzerainty', owner};
  return {allowed: false, reason: 'closed', owner};
}

export function recordUnauthorizedCrossing(state, army, target) {
  initializeBorderPolicies(state);
  if (militaryAccessStatus(state, army.owner, target.id, target.owner).allowed) return null;
  const defender = state.armies
    .filter(unit => unit.id !== army.id && unit.owner === target.owner && unit.region === target.id && unit.men > 0 && !unit.move)
    .sort((a, b) => b.men - a.men || a.id.localeCompare(b.id))[0] || null;
  const ratio = defender ? army.men / Math.max(1, defender.men) : Infinity;
  const attackerLoss = defender ? Math.min(army.men - 1, Math.max(20, Math.round(army.men * (ratio >= 1 ? 0.04 : 0.09)))) : 0;
  const defenderLoss = defender ? Math.min(defender.men - 1, Math.max(20, Math.round(defender.men * (ratio >= 1 ? 0.09 : 0.04)))) : 0;
  army.men -= attackerLoss;
  if (defender) defender.men -= defenderLoss;
  const origin = army.region;
  const crossed = !defender || army.men > defender.men * 1.2;
  if (crossed) army.region = target.id;
  const key = [army.owner, target.owner].sort().join(':');
  state.relations[key] = Math.max(-100, (state.relations[key] || 0) - (defender ? 15 : 8));
  state.diplomaticCredibility ||= {};
  state.diplomaticCredibility[army.owner] = Math.max(0, (state.diplomaticCredibility[army.owner] ?? 100) - 3);
  const incident = {
    id: `border:${state.nextBorderIncidentId++}`,
    attacker: army.owner, defender: target.owner, territory: target.id, origin,
    armyId: army.id, defenderArmyId: defender?.id || null,
    start: {year: state.year, month: state.month},
    scope: 'local', status: 'open', escalation: defender ? 'skirmish' : 'protest',
    outcome: crossed ? 'crossed' : 'repelled',
    attackerLoss, defenderLoss
  };
  state.borderIncidents.push(incident);
  return incident;
}

export function respondBorderIncident(state, id, actor, choice) {
  const incident = (state.borderIncidents || []).find(item => item.id === id);
  if (!incident || !['open', 'protested'].includes(incident.status) || ![incident.attacker, incident.defender].includes(actor)) return {ok: false, reason: 'unavailable'};
  const attacker = actor === incident.attacker;
  const unit = state.armies.find(army => army.id === incident.armyId && army.owner === incident.attacker);
  const inForeignTheater = unit?.region === incident.territory && !unit.move;
  const mayWithdraw = !unit || (!unit.move && (unit.region === incident.origin || inForeignTheater) && (!inForeignTheater || !!incident.origin && state.regions.some(region => region.id === incident.origin)));
  const withdraw = () => {
    if (inForeignTheater) {
      unit.move = {to: incident.origin, remaining: 1, sea: false, intent: 'withdraw_border'};
      unit.order = {kind: 'retreat', target: incident.origin};
    }
  };
  const finish = resolution => {
    incident.status = 'resolved'; incident.resolution = resolution;
    incident.resolved = {year: state.year, month: state.month, actor};
    return {ok: true, incident};
  };
  if (attacker && choice === 'withdraw') {
    if (!mayWithdraw) return {ok: false, reason: 'no_route'};
    withdraw(); return finish('withdrawal');
  }
  if (attacker && choice === 'compensate') {
    if (!mayWithdraw) return {ok: false, reason: 'no_route'};
    if (state.factions[actor]?.treasury < 10) return {ok: false, reason: 'resources'};
    state.factions[actor].treasury -= 10;
    state.factions[incident.defender].treasury += 10;
    const key = [actor, incident.defender].sort().join(':');
    state.relations[key] = Math.min(100, (state.relations[key] || 0) + 6);
    state.diplomaticCredibility[actor] = Math.min(100, (state.diplomaticCredibility[actor] ?? 100) + 2);
    withdraw(); return finish('compensation_and_withdrawal');
  }
  if (attacker && choice === 'request_access') {
    const result = proposeAgreement(state, actor, incident.defender, 'military_access', {
      access: {permittedParty: actor, permittedTerritories: [incident.territory]}
    });
    if (!result.ok) return result;
    return finish('negotiated_access');
  }
  if (!attacker && choice === 'protest') {
    if (incident.status === 'protested') return {ok: false, reason: 'already_protested'};
    incident.status = 'protested';
    incident.protested = {year: state.year, month: state.month, actor};
    const key = [actor, incident.attacker].sort().join(':');
    state.relations[key] = Math.max(-100, (state.relations[key] || 0) - 5);
    return {ok: true, incident};
  }
  if (!attacker && choice === 'tolerate') return finish('tolerated');
  return {ok: false, reason: 'invalid_choice'};
}

const atWar = (state, a, b) => (state.wars || []).some(pair => pair.includes(a) && pair.includes(b));

// `reportedOwner` lets a planner use the viewer's report. Pass the actual
// owner on arrival, when the army has reached the border and can observe it.
export function militaryAccessStatus(state, actor, theaterId, reportedOwner) {
  const target = state.regions.find(region => region.id === theaterId);
  if (!target) return {allowed: false, reason: 'no_theater'};
  const owner = reportedOwner === undefined ? target.owner : reportedOwner;
  if (!owner) return {allowed: true, basis: 'unconfirmed', owner: null};
  if (owner === actor) return {allowed: true, basis: 'own', owner};
  if (atWar(state, actor, owner)) return {allowed: true, basis: 'war', owner};
  const treaty = activeAgreement(state, actor, owner, 'military_access');
  if (treaty) {
    const access = treaty.terms?.access;
    const permittedParty = access?.permittedParty;
    const permittedTerritories = access?.permittedTerritories;
    if ((!permittedParty || permittedParty === 'both' || permittedParty === actor)
        && (!Array.isArray(permittedTerritories) || permittedTerritories.includes(theaterId))) {
      return {allowed: true, basis: Array.isArray(permittedTerritories) ? 'limited_treaty' : 'treaty', owner, treatyId: treaty.id};
    }
  }
  if (subjectRelation(state, owner)?.terms.subject.suzerain === actor && subjectRelation(state, owner).terms.subject.militaryAccess === 'suzerain_into_subject') return {allowed: true, basis: 'suzerainty', owner};
  return {allowed: false, reason: 'peace', basis: 'closed', owner};
}
