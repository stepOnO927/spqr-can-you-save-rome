import {ROUTES} from './data.js?v=multipolar-review-1';
import historical from './historical-territories.js?v=multipolar-review-1';

// state.regions remains the only mutable territory registry. This module
// enriches those records without maintaining a second ownership table.
const polygonIds = new Map();
for (const feature of historical.features) for (const id of feature.properties.regions || []) {
  if (!polygonIds.has(id)) polygonIds.set(id, []);
  polygonIds.get(id).push(feature.properties.id);
}

export function initializeTerritories(state) {
  for (const territory of state.regions) {
    territory.legalSovereign ??= territory.owner;
    territory.militaryOccupier ??= null;
    territory.administrativeStatus ??= territory.militaryOccupier ? 'occupied' : 'integrated';
    territory.controlSince ??= {year: state.year, month: state.month};
  }
  return state;
}

export function territoryRecord(state, id) {
  const territory = state.regions.find(region => region.id === id);
  if (!territory) return null;
  const neighbors = ROUTES.filter(([a, b]) => a === id || b === id).map(([a, b, mode]) => ({id: a === id ? b : a, mode: mode || 'land'}));
  return {
    ...territory,
    spatialReference: polygonIds.has(id)
      ? {kind: 'historical_polygon', accuracy: 'approximate_realm_outline', featureIds: [...polygonIds.get(id)]}
      : {kind: 'theater_anchor', accuracy: 'boundary_unmapped', x: territory.x, y: territory.y},
    labelAnchor: {x: territory.x, y: territory.y},
    neighbors,
    principalSettlement: territory.city,
    recruitmentAccess: territory.owner === state.player
  };
}

export function transferTerritory(state, id, newController, method = 'military') {
  const territory = state.regions.find(region => region.id === id);
  if (!territory || !state.factions[newController] || !['military', 'secession', 'peaceful', 'restoration', 'command_merger'].includes(method)) return {ok: false, reason: 'invalid'};
  initializeTerritories(state);
  if (territory.owner === newController) return {ok: false, reason: 'already_controlled'};
  const previous = territory.owner;
  const previousStatus = territory.administrativeStatus;
  territory.owner = newController;
  territory.controlSince = {year: state.year, month: state.month};
  if (method === 'command_merger' && territory.administrationProject?.owner === previous) territory.administrationProject.owner = newController;
  else territory.administrationProject = null;
  if (method === 'command_merger') {
    if (territory.legalSovereign === previous) territory.legalSovereign = newController;
    if (territory.militaryOccupier === previous) territory.militaryOccupier = newController;
    territory.administrativeStatus = territory.legalSovereign === newController ? 'integrated' : territory.militaryOccupier === newController ? previousStatus === 'administered' ? 'administered' : 'occupied' : 'disputed';
    if (territory.administrativeStatus === 'integrated') territory.militaryOccupier = null;
  } else if (method === 'peaceful' || method === 'restoration' || territory.legalSovereign === newController) {
    territory.legalSovereign = newController;
    territory.militaryOccupier = null;
    territory.administrativeStatus = 'integrated';
  } else if (method === 'military') {
    territory.militaryOccupier = newController;
    territory.administrativeStatus = 'occupied';
  } else {
    territory.militaryOccupier = null;
    territory.administrativeStatus = 'disputed';
  }
  return {ok: true, previous, current: newController, legalSovereign: territory.legalSovereign, status: territory.administrativeStatus};
}

export function territoryTaxFactor(territory) {
  return {integrated: 1, administered: 0.85, occupied: 0.65, disputed: 0.5}[territory.administrativeStatus] ?? 1;
}

export function administrationQuote(state, id, actor = state.player) {
  const territory = state.regions.find(region => region.id === id);
  if (!territory || territory.owner !== actor || !state.factions[actor]) return {ok: false, reason: 'not_controlled'};
  if (territory.administrativeStatus !== 'occupied') return {ok: false, reason: 'not_occupied'};
  if (territory.administrationProject) return {ok: false, reason: 'in_progress'};
  if (!state.armies.some(army => army.owner === actor && army.region === id && army.men >= 1000 && !army.move)) return {ok: false, reason: 'garrison'};
  if (territory.loyalty < 35) return {ok: false, reason: 'resistance'};
  if (state.factions[actor].treasury < 18 || state.factions[actor].food < 5) return {ok: false, reason: 'resources'};
  return {ok: true, treasury: 18, food: 5, months: 3};
}

export function startAdministration(state, id, actor = state.player) {
  const quote = administrationQuote(state, id, actor);
  if (!quote.ok) return quote;
  const territory = state.regions.find(region => region.id === id);
  state.factions[actor].treasury -= quote.treasury;
  state.factions[actor].food -= quote.food;
  territory.administrationProject = {owner: actor, remaining: quote.months};
  return {ok: true, remaining: quote.months};
}

export function advanceTerritories(state) {
  for (const territory of state.regions) {
    if (territory.administrativeStatus !== 'occupied') continue;
    const garrison = state.armies.some(army => army.owner === territory.owner && army.region === territory.id && army.men >= 1000 && !army.move);
    if (!garrison) {
      territory.loyalty = Math.max(0, territory.loyalty - 1);
      continue;
    }
    const project = territory.administrationProject;
    if (!project || project.owner !== territory.owner) continue;
    project.remaining--;
    if (project.remaining > 0) continue;
    territory.administrationProject = null;
    territory.administrativeStatus = 'administered';
    territory.loyalty = Math.min(100, territory.loyalty + 5);
  }
  return state;
}
