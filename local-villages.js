import {localEntity} from './local-polities.js';

const clamp = value => Math.max(0, Math.min(100, value));
const projects = Object.freeze({
  granary: {treasury: 8, food: 2, months: 2},
  irrigation: {treasury: 10, food: 2, months: 3}
});

export function villageProjectQuote(state, id, kind, actor = state.player) {
  const entity = localEntity(state, id), village = entity?.village, plan = projects[kind];
  if (entity?.type !== 'village' || !village || !plan) return {ok: false, reason: 'unavailable'};
  if (entity.controller !== actor || state.regions.find(r => r.id === entity.theater)?.owner !== actor) return {ok: false, reason: 'control'};
  if (village.project) return {ok: false, reason: 'busy'};
  if (village[kind] >= 2) return {ok: false, reason: 'maximum'};
  if (village.satisfaction < 30 || village.security < 30) return {ok: false, reason: 'unrest'};
  const faction = state.factions[actor];
  if (!faction || faction.treasury < plan.treasury || faction.food < plan.food) return {ok: false, reason: 'resources'};
  return {ok: true, ...plan, kind};
}

export function startVillageProject(state, id, kind, actor = state.player) {
  const quote = villageProjectQuote(state, id, kind, actor);
  if (!quote.ok) return quote;
  const village = localEntity(state, id).village;
  state.factions[actor].treasury -= quote.treasury;
  state.factions[actor].food -= quote.food;
  village.project = {kind, actor, remaining: quote.months};
  return quote;
}

export function villageFoodQuote(state, id, actor = state.player, {emergency = false} = {}) {
  const entity = localEntity(state, id), village = entity?.village;
  if (entity?.type !== 'village' || !village) return {ok: false, reason: 'unavailable'};
  if (entity.controller !== actor || state.regions.find(r => r.id === entity.theater)?.owner !== actor) return {ok: false, reason: 'control'};
  const reserve = village.foodNeed * 2;
  const food = emergency ? 2 : Math.min(2, Math.max(0, village.storedFood - reserve));
  if (food < 1 || village.storedFood < food) return {ok: false, reason: 'local_need'};
  if (!emergency && state.factions[actor]?.treasury < food * 2) return {ok: false, reason: 'resources'};
  return {ok: true, food, treasury: emergency ? 0 : food * 2, emergency};
}

export function takeVillageFood(state, id, actor = state.player, options = {}) {
  const quote = villageFoodQuote(state, id, actor, options);
  if (!quote.ok) return quote;
  const entity = localEntity(state, id), village = entity.village;
  village.storedFood -= quote.food;
  state.factions[actor].treasury -= quote.treasury;
  state.factions[actor].food += quote.food;
  if (quote.emergency) {
    village.satisfaction = clamp(village.satisfaction - 18);
    village.security = clamp(village.security - 4);
    const region = state.regions.find(r => r.id === entity.theater);
    region.loyalty = clamp(region.loyalty - 3);
    village.localIssue = 'requisition';
  } else village.satisfaction = clamp(village.satisfaction + 1);
  return quote;
}

export function advanceVillages(state) {
  if (state.dlc) return;
  for (const region of state.regions) for (const entity of region.localEntities || []) {
    if (entity.type !== 'village' || !entity.village) continue;
    const village = entity.village;
    if (entity.controller !== region.owner && state.factions[region.owner]) {
      entity.controller = region.owner;
      entity.militaryOccupier = region.owner;
      entity.administrativeStatus = entity.legalSovereign === region.owner ? 'integrated' : 'occupied';
      village.project = null;
      village.satisfaction = clamp(village.satisfaction - 10);
      village.security = clamp(village.security - 10);
      village.localIssue = 'occupation';
    }
    if (village.project) {
      village.project.remaining--;
      if (village.project.remaining <= 0) {
        village[village.project.kind]++;
        village.satisfaction = clamp(village.satisfaction + 4);
        village.project = null;
      }
    }
    const production = village.foodProduction + village.irrigation;
    const capacity = 12 + village.granary * 8;
    village.storedFood = Math.min(capacity, village.storedFood + production) - village.foodNeed;
    if (village.storedFood < 0) {
      village.storedFood = 0;
      village.population = Math.max(0, village.population - 2);
      village.satisfaction = clamp(village.satisfaction - 6);
      village.security = clamp(village.security - 2);
      village.localIssue = 'shortage';
    } else if (village.storedFood >= village.foodNeed * 2 && village.satisfaction >= 60) {
      if (state.month % 3 === 0) village.population += 1 + (village.granary > 0 && village.irrigation > 0 ? 1 : 0);
      if (village.localIssue === 'shortage') village.localIssue = null;
    }
    if (state.month % 3 === 0 && village.storedFood >= village.foodNeed * 2 && village.localIssue === 'requisition') {
      village.satisfaction = clamp(village.satisfaction + 1);
      if (village.satisfaction >= 60) village.localIssue = null;
    }
  }
}
