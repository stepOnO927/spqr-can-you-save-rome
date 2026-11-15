import {activeAgreement} from './agreements.js?v=world-kings-1';

export const BORDER_ACCESS_CATEGORIES = Object.freeze([
  'closed', 'civilian', 'commercial', 'diplomatic',
  'limited_military', 'full_military', 'allied_military', 'suzerainty'
]);

// These policies describe the default border stance. Rights granted by a
// particular treaty are checked separately, so trade never moves an army.
export function initializeBorderPolicies(state) {
  state.borderPolicies ||= {};
  for (const owner of Object.keys(state.factions || {})) {
    state.borderPolicies[owner] ||= {
      civilian: 'closed', commercial: 'closed', diplomatic: 'closed', military: 'closed'
    };
  }
  return state;
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
  return {allowed: false, reason: 'peace', basis: 'closed', owner};
}
