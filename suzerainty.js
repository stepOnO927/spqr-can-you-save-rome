import {ROUTES} from './data.js?v=world-kings-village-foothold-1';

// State-level dependency is a treaty between governments. It never changes
// ownership of regions, an army's commander, or a subject's private treasury.
export const SUBJECT_TYPES = Object.freeze(['protectorate', 'client_kingdom']);
const at = state => state.year * 12 + state.month;
const atWar = (state, a, b) => (state.wars || []).some(war => war.includes(a) && war.includes(b));
const clamp = value => Math.max(0, Math.min(100, value));
const heldSubjectTreaty = (state, subject) => (state.agreements || []).find(treaty =>
  SUBJECT_TYPES.includes(treaty.type) && treaty.status === 'active' &&
  treaty.terms?.subject?.subject === subject && at(state) < treaty.expiresAt
) || null;

export function subjectRelation(state, subject) {
  const treaty = heldSubjectTreaty(state, subject);
  return treaty && !atWar(state, treaty.terms.subject.suzerain, subject) ? treaty : null;
}

export function mayBecomeSubject(state, suzerain, subject) {
  if (heldSubjectTreaty(state, subject)) return false;
  // Hierarchies are possible, but a court cannot become its own ancestor.
  const seen = new Set();
  for (let current = suzerain; current; current = heldSubjectTreaty(state, current)?.terms.subject.suzerain) {
    if (current === subject || seen.has(current)) return false;
    seen.add(current);
  }
  return true;
}

export function subjectTerms(type, suzerain, subject, date) {
  if (!SUBJECT_TYPES.includes(type)) return null;
  const client = type === 'client_kingdom';
  return {
    suzerain, subject, basis: 'negotiated_treaty', established: {...date},
    tribute: {treasury: client ? 2 : 0, everyMonths: 3, minimumReserve: 12},
    militaryObligation: {defensiveProtection: true, aidOnRequest: client, manpower: client ? 400 : 0, food: client ? 3 : 0},
    diplomaticAutonomy: client ? 'limited' : 'independent',
    internalAutonomy: client ? 'broad' : 'full',
    militaryAccess: client ? 'suzerain_into_subject' : 'none',
    commercialPrivileges: client ? 'suzerain_into_subject' : 'none',
    politicalLoyalty: client ? 60 : 70, independenceAspiration: client ? 20 : 10,
    lastAidAt: null,
    termination: ['expiry', 'war', 'mutual consent', 'breach', 'independence claim']
  };
}

export function advanceSubjectTreaty(state, treaty) {
  const terms = treaty.terms?.subject;
  if (!terms || state.month % terms.tribute.everyMonths !== 0) return;
  const subject = state.factions[terms.subject], suzerain = state.factions[terms.suzerain];
  if (!subject || !suzerain) return;
  const amount = terms.tribute.treasury;
  if (amount && subject.treasury >= terms.tribute.minimumReserve + amount) {
    subject.treasury -= amount;
    suzerain.treasury += amount;
    terms.politicalLoyalty = clamp(terms.politicalLoyalty + 1);
    terms.independenceAspiration = clamp(terms.independenceAspiration - 1);
    terms.lastTribute = {year: state.year, month: state.month, treasury: amount};
  } else if (amount) {
    terms.politicalLoyalty = clamp(terms.politicalLoyalty - 3);
    terms.independenceAspiration = clamp(terms.independenceAspiration + 4);
  }
  if (terms.independenceAspiration >= 65 && terms.politicalLoyalty <= 30) {
    treaty.status = 'renounced';
    treaty.ended = {year: state.year, month: state.month, actor: terms.subject};
  }
}

export function subjectAidQuote(state, suzerain, subject) {
  const treaty = subjectRelation(state, subject), terms = treaty?.terms.subject;
  if (!terms || terms.suzerain !== suzerain || !terms.militaryObligation.aidOnRequest) return {ok: false, reason: 'no_obligation'};
  if (!(state.wars || []).some(war => war.includes(suzerain) && !war.includes(subject))) return {ok: false, reason: 'no_war'};
  if (terms.lastAidAt && at(state) - (terms.lastAidAt.year * 12 + terms.lastAidAt.month) < 6) return {ok: false, reason: 'cooldown'};
  if (terms.politicalLoyalty < 45 || terms.independenceAspiration > 65) return {ok: false, reason: 'unwilling'};
  const payer = state.factions[suzerain], source = state.factions[subject];
  if (!payer || !source || payer.treasury < 3 || source.manpower < 4000 + terms.militaryObligation.manpower || source.food < 12 + terms.militaryObligation.food) return {ok: false, reason: 'resources'};
  // A contingent needs an actual neighboring corridor; a remote client cannot
  // add people or food instantly to the suzerain's global reserves.
  const regions = new Map(state.regions.map(region => [region.id, region]));
  const route = ROUTES.map(edge => {
    const a = regions.get(edge[0]), b = regions.get(edge[1]);
    if (a?.owner === subject && b?.owner === suzerain) return {path: [a.id, b.id], sea: edge[2] === 'sea', terrain: b.terrain};
    if (b?.owner === subject && a?.owner === suzerain) return {path: [b.id, a.id], sea: edge[2] === 'sea', terrain: a.terrain};
    return null;
  }).find(Boolean);
  if (!route || state.borderPolicies?.[suzerain]?.commercial === 'closed') return {ok: false, reason: 'route'};
  const months = 1 + (route.sea ? 1 : 0) + (['hills', 'desert'].includes(route.terrain) ? 1 : 0);
  return {ok: true, treasury: 3, manpower: terms.militaryObligation.manpower, food: terms.militaryObligation.food, route: route.path, months};
}

export function requestSubjectAid(state, suzerain, subject) {
  const quote = subjectAidQuote(state, suzerain, subject);
  if (!quote.ok) return quote;
  const source = state.factions[subject], recipient = state.factions[suzerain];
  recipient.treasury -= quote.treasury;
  source.treasury += quote.treasury;
  source.manpower -= quote.manpower;
  source.food -= quote.food;
  state.subjectAidShipments ||= [];
  state.nextSubjectAidId ||= 1;
  state.subjectAidShipments.push({id: `subject-aid:${state.nextSubjectAidId++}`, suzerain, subject, treatyId: subjectRelation(state, subject).id, path: quote.route, manpower: quote.manpower, food: quote.food, remaining: quote.months, blockedMonths: 0, status: 'transit', dispatched: {year: state.year, month: state.month}});
  subjectRelation(state, subject).terms.subject.lastAidAt = {year: state.year, month: state.month};
  return quote;
}

export function advanceSubjectAidShipments(state) {
  for (const shipment of state.subjectAidShipments || []) {
    if (shipment.status !== 'transit') continue;
    const [from, to] = shipment.path || [];
    const treaty = subjectRelation(state, shipment.subject);
    const open = treaty?.id === shipment.treatyId && state.regions.some(region => region.id === from && region.owner === shipment.subject) && state.regions.some(region => region.id === to && region.owner === shipment.suzerain) && state.borderPolicies?.[shipment.suzerain]?.commercial !== 'closed';
    if (!open) {
      shipment.blockedMonths++;
      if (shipment.blockedMonths >= 3) { shipment.status = 'lost'; shipment.ended = {year: state.year, month: state.month}; }
      continue;
    }
    shipment.blockedMonths = 0;
    shipment.remaining--;
    if (shipment.remaining > 0) continue;
    state.factions[shipment.suzerain].manpower += shipment.manpower;
    state.factions[shipment.suzerain].food += shipment.food;
    shipment.status = 'delivered';
    shipment.delivered = {year: state.year, month: state.month};
  }
  const settled = (state.subjectAidShipments || []).filter(shipment => shipment.status !== 'transit');
  if (settled.length > 40) { const keep = new Set(settled.slice(-40)); state.subjectAidShipments = state.subjectAidShipments.filter(shipment => shipment.status === 'transit' || keep.has(shipment)); }
}
