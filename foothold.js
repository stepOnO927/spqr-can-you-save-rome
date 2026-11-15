import {ROUTES} from './data.js?v=phase-x-1';
import {localEntity} from './local-polities.js';
import {militaryAccessStatus} from './border-access.js';

const costs = Object.freeze({
  1: {treasury: 8, food: 3, months: 1, garrison: 1000},
  2: {treasury: 16, food: 6, months: 2, garrison: 1000},
  3: {treasury: 26, food: 10, months: 3, garrison: 1500},
  4: {treasury: 40, food: 16, months: 4, garrison: 2000}
});
const now = state => state.year * 12 + state.month;
const maxLevel = entity => entity.maxFootholdLevel || ({city_state: 4, microstate: 3, strongman: 2, village: 2, tribe: 1, wilderness: 1, nomadic: 1})[entity.type] || 0;
const host = (state, entity) => state.regions.find(region => region.id === entity.theater);
const garrison = (state, entity, actor, minimum) => state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men >= minimum && !army.move);
const hasLocalRight = (state, entity, actor) => entity.controller === actor || entity.controller === entity.id && (entity.overlord === actor || entity.access?.[actor] > now(state));
const supplyPassable = (state, actor, region) => {
  const access = militaryAccessStatus(state, actor, region.id, region.owner);
  return access.allowed && !['war', 'unconfirmed'].includes(access.basis);
};

export function footholdConnected(state, entityId, actor) {
  const entity = localEntity(state, entityId), start = entity && host(state, entity);
  if (!start || !hasLocalRight(state, entity, actor)) return false;
  if (!supplyPassable(state, actor, start)) return false;
  if (start.owner === actor && start.administrativeStatus === 'integrated') return true;
  const homes = new Set(state.regions.filter(region => region.id !== start.id && region.owner === actor && region.administrativeStatus === 'integrated').map(region => region.id));
  const queue = [start.id], seen = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    for (const [from, to, kind] of ROUTES) {
      const next = from === current ? to : to === current ? from : null;
      if (!next || seen.has(next) || kind === 'sea' && state.factions[actor]?.treasury < 8) continue;
      const region = state.regions.find(item => item.id === next);
      if (!region || !supplyPassable(state, actor, region)) continue;
      if (homes.has(next)) return true;
      seen.add(next); queue.push(next);
    }
  }
  return false;
}

export function footholdQuote(state, entityId, actor = state.player) {
  const entity = localEntity(state, entityId), faction = state.factions[actor];
  if (!entity || !faction) return {ok: false, reason: 'unavailable'};
  if (entity.foothold && entity.foothold.owner !== actor) return {ok: false, reason: 'foreign_foothold'};
  const level = entity.foothold?.owner === actor ? entity.foothold.level : 0, next = level + 1;
  if (next > maxLevel(entity)) return {ok: false, reason: 'maximum'};
  if (entity.foothold?.project) return {ok: false, reason: 'in_progress'};
  if (!hasLocalRight(state, entity, actor)) return {ok: false, reason: 'no_rights'};
  if (next >= 2 && entity.controller !== actor) return {ok: false, reason: 'control'};
  if (next >= 2 && host(state, entity)?.owner !== actor) return {ok: false, reason: 'host_control'};
  if (next === 4 && entity.administrativeStatus !== 'administered') return {ok: false, reason: 'administration'};
  if (!footholdConnected(state, entityId, actor)) return {ok: false, reason: 'route_cut'};
  const cost = costs[next];
  if (!garrison(state, entity, actor, cost.garrison)) return {ok: false, reason: 'garrison'};
  if (faction.treasury < cost.treasury || faction.food < cost.food) return {ok: false, reason: 'resources'};
  return {ok: true, level: next, ...cost};
}

export function startFoothold(state, entityId, actor = state.player) {
  const quote = footholdQuote(state, entityId, actor);
  if (!quote.ok) return quote;
  const entity = localEntity(state, entityId), faction = state.factions[actor];
  faction.treasury -= quote.treasury; faction.food -= quote.food;
  entity.foothold ||= {owner: actor, level: 0, stockFood: 0, project: null};
  entity.foothold.project = {actor, targetLevel: quote.level, remaining: quote.months, started: {year: state.year, month: state.month}};
  return {ok: true, ...quote};
}

export function stockFoothold(state, entityId, actor = state.player, food = 1) {
  const entity = localEntity(state, entityId), foothold = entity?.foothold;
  if (!foothold || foothold.owner !== actor || foothold.level < 1 || !Number.isInteger(food) || food < 1) return {ok: false, reason: 'unavailable'};
  if (!footholdConnected(state, entityId, actor)) return {ok: false, reason: 'route_cut'};
  if (state.factions[actor]?.food < food || foothold.stockFood + food > foothold.level * 12) return {ok: false, reason: 'capacity_or_food'};
  state.factions[actor].food -= food; foothold.stockFood += food;
  return {ok: true, stockFood: foothold.stockFood};
}

export function resupplyAtFoothold(state, entityId, armyId, actor = state.player) {
  const entity = localEntity(state, entityId), foothold = entity?.foothold, army = state.armies.find(unit => unit.id === armyId);
  if (!foothold || foothold.owner !== actor || foothold.level < 1 || foothold.stockFood < 2 || !hasLocalRight(state, entity, actor) || !army || army.owner !== actor || army.region !== entity.theater || army.move || army.morale >= 100) return {ok: false, reason: 'unavailable'};
  foothold.stockFood -= 2;
  army.morale = Math.min(100, army.morale + Math.min(8, foothold.level * 2 + 2));
  return {ok: true, morale: army.morale, stockFood: foothold.stockFood};
}

export function advanceFootholds(state) {
  for (const region of state.regions) for (const entity of region.localEntities || []) {
    const foothold = entity.foothold;
    if (!foothold) continue;
    const actor = foothold.owner;
    if (!hasLocalRight(state, entity, actor)) { entity.lastFootholdLoss = {owner: actor, level: foothold.level, year: state.year, month: state.month}; entity.foothold = null; continue; }
    const project = foothold.project;
    if (!project) continue;
    const cost = costs[project.targetLevel];
    if (!cost || !footholdConnected(state, entity.id, actor) || !garrison(state, entity, actor, cost.garrison)) continue;
    if (--project.remaining <= 0) { foothold.level = project.targetLevel; foothold.project = null; }
  }
  return state;
}
