import {localEntity, villageDevelopment} from './local-polities.js';

const clamp = value => Math.max(0, Math.min(100, value));
function villageEvent(state, region, entity) {
  if (state.month !== 6 && state.month !== 12) return;
  const village = entity.village;
  if (village.lastEvent?.year === state.year && village.lastEvent.month === state.month) return;
  const options = [];
  if (village.storedFood >= village.foodNeed * 3 && village.satisfaction >= 45) options.push('harvest');
  if (state.factions[region.owner]?.tax === 'high' && village.satisfaction <= 70) options.push('tax_complaint');
  if (village.market > 0 && village.marketAccess >= 60) options.push('merchants');
  if (village.shrine > 0 && village.storedFood >= village.foodNeed * 2) options.push('festival');
  if (village.road < 1 && village.security >= 40 && !village.localIssue) options.push('road_request');
  const choices = options.filter(kind => kind !== village.lastEvent?.kind);
  if (!choices.length) return;
  village.eventSeed = (Math.imul((village.eventSeed ?? ((entity.seed ?? 0) ^ 0x85ebca6b)) >>> 0, 1664525) + 1013904223) >>> 0;
  const kind = choices[village.eventSeed % choices.length];
  if (kind === 'harvest' || kind === 'festival') {village.storedFood--; village.satisfaction = clamp(village.satisfaction + (kind === 'harvest' ? 2 : 3));}
  if (kind === 'tax_complaint') {village.satisfaction = clamp(village.satisfaction - 2); village.localIssue = 'tax_complaint';}
  if (kind === 'merchants') {entity.treasury++; village.marketAccess = clamp(village.marketAccess + 1);}
  if (kind === 'road_request') village.localIssue = 'road_request';
  village.lastEvent = {kind, year: state.year, month: state.month};
}
const projects = Object.freeze({
  granary: {treasury: 8, food: 2, months: 2},
  irrigation: {treasury: 10, food: 2, months: 3},
  market: {treasury: 12, food: 2, months: 3},
  well: {treasury: 7, food: 1, months: 2},
  road: {treasury: 14, food: 2, months: 3},
  wall: {treasury: 16, food: 2, months: 4},
  shrine: {treasury: 9, food: 1, months: 2},
  agriculture: {treasury: 12, food: 2, months: 3}
});

export function migrateVillageRecords(state) {
  for (const region of state.regions || []) for (const entity of region.localEntities || []) {
    if (entity.type !== 'village' || !entity.village) continue;
    for (const kind of ['market', 'well', 'road', 'wall', 'shrine', 'agriculture']) entity.village[kind] ??= 0;
    entity.village.marketAccess ??= 50;
  }
  return state;
}

export function villageProjectQuote(state, id, kind, actor = state.player) {
  const entity = localEntity(state, id), village = entity?.village, plan = projects[kind];
  if (entity?.type !== 'village' || !village || !plan) return {ok: false, reason: 'unavailable'};
  if (entity.controller !== actor || state.regions.find(r => r.id === entity.theater)?.owner !== actor) return {ok: false, reason: 'control'};
  if (village.project) return {ok: false, reason: 'busy'};
  if (village[kind] >= (['granary', 'irrigation', 'agriculture'].includes(kind) ? 2 : 1)) return {ok: false, reason: 'maximum'};
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
  const reserve = Math.max(village.foodNeed, Math.ceil(village.population / 350)) * 2;
  const food = emergency ? 2 : Math.min(villageDevelopment(village).marketTown ? 4 : village.marketAccess >= 70 ? 3 : 2, Math.max(0, village.storedFood - reserve));
  if (food < 1 || village.storedFood < food) return {ok: false, reason: 'local_need'};
  const treasury = emergency ? 0 : food * (village.market > 0 ? 1 : 2);
  if (!emergency && state.factions[actor]?.treasury < treasury) return {ok: false, reason: 'resources'};
  return {ok: true, food, treasury, emergency};
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
    const patron=entity.sponsor?localEntity(state,entity.sponsor):null;
    const hostChanged=!!entity.sponsor&&entity.lastHostOwner!==region.owner;
    const patronChanged=!!patron&&entity.lastPatronController!==patron.controller;
    if(entity.sponsor){entity.lastHostOwner=region.owner;entity.lastPatronController=patron?.controller??entity.lastPatronController}
    if ((hostChanged||patronChanged||!entity.sponsor&&entity.controller !== region.owner)&&state.factions[region.owner]) {
      const occupationShock = Math.max(4, 10 - village.wall * 3 - (villageDevelopment(village).fortified ? 3 : 0));
      const occupier=hostChanged||!entity.sponsor?region.owner:patron.controller;
      entity.controller = occupier;
      entity.militaryOccupier = occupier;
      entity.administrativeStatus = entity.legalSovereign === occupier ? 'integrated' : 'occupied';
      village.project = null;
      village.satisfaction = clamp(village.satisfaction - occupationShock);
      village.security = clamp(village.security - occupationShock);
      village.localIssue = 'occupation';
    }
    if (village.project) {
      village.project.remaining--;
      if (village.project.remaining <= 0) {
        const completed = village.project.kind;
        village[completed]++;
        if (completed === 'market') village.marketAccess = clamp(village.marketAccess + 20);
        if (completed === 'road') { village.marketAccess = clamp(village.marketAccess + 15); region.supply++; if (village.localIssue === 'road_request') village.localIssue = null; }
        if (completed === 'well') village.satisfaction = clamp(village.satisfaction + 6);
        if (completed === 'wall') { village.security = clamp(village.security + 12); entity.militia += 30; }
        if (completed === 'shrine') village.satisfaction = clamp(village.satisfaction + 5);
        village.satisfaction = clamp(village.satisfaction + 4);
        village.project = null;
      }
    }
    village.foodNeed = Math.max(2, Math.ceil(village.population / 350));
    const production = village.foodProduction + village.irrigation + village.agriculture;
    const capacity = 12 + village.granary * 8;
    village.storedFood = Math.min(capacity, village.storedFood + production) - village.foodNeed;
    if (village.storedFood < 0) {
      village.storedFood = 0;
      village.population = Math.max(0, village.population - 2);
      village.satisfaction = clamp(village.satisfaction - 6);
      village.security = clamp(village.security - 2);
      village.localIssue = 'shortage';
    } else if (production > village.foodNeed && village.storedFood >= village.foodNeed * 2 && village.satisfaction >= 60) {
      if (state.month % 3 === 0) village.population += 1 + (village.granary > 0 && village.irrigation > 0 ? 1 : 0) + (village.well > 0 ? 1 : 0);
      if (village.localIssue === 'shortage') village.localIssue = null;
    }
    if (state.month % 3 === 0 && village.storedFood >= village.foodNeed * 2 && village.localIssue === 'requisition') {
      village.satisfaction = clamp(village.satisfaction + 1);
      if (village.satisfaction >= 60) village.localIssue = null;
    }
    if (state.month % 3 === 0 && village.localIssue === 'tax_complaint' && state.factions[region.owner]?.tax !== 'high') {
      village.satisfaction = clamp(village.satisfaction + 1);
      if (village.satisfaction >= 65) village.localIssue = null;
    }
    if (state.month % 3 === 0 && village.shrine > 0 && village.storedFood >= village.foodNeed * 2) village.satisfaction = clamp(village.satisfaction + 1);
    villageEvent(state, region, entity);
  }
}
