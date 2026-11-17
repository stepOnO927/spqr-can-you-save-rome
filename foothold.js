import {ROUTES} from './data.js?v=world-kings-audience-1';
import {localEntity} from './local-polities.js';
import {militaryAccessStatus} from './border-access.js?v=world-kings-audience-1';

const costs = Object.freeze({
  1: {treasury: 8, food: 3, months: 1, garrison: 1000},
  2: {treasury: 16, food: 6, months: 2, garrison: 1000},
  3: {treasury: 26, food: 10, months: 3, garrison: 1500},
  4: {treasury: 40, food: 16, months: 4, garrison: 2000}
});
const now = state => state.year * 12 + state.month;
const maxLevel = entity => entity.maxFootholdLevel ?? (({city_state: 4, microstate: 3, strongman: 2, village: 2, tribe: 1, wilderness: 1, nomadic: 1})[entity.type] || 0);
const host = (state, entity) => state.regions.find(region => region.id === entity.theater);
const garrison = (state, entity, actor, minimum) => state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men >= minimum && !army.move);
const hasLocalRight = (state, entity, actor) => entity.controller === actor || entity.controller === entity.id && (entity.overlord === actor || entity.access?.[actor] > now(state)) || entity.proceduralWilderness && entity.wilderness?.surveyedBy?.[actor] && host(state, entity)?.owner === actor && entity.access?.[actor] > now(state);
const supplyPassable = (state, actor, region) => {
  const access = militaryAccessStatus(state, actor, region.id, region.owner);
  return access.allowed && !['war', 'unconfirmed'].includes(access.basis);
};

export function footholdSupplyRoute(state, entityId, actor) {
  const entity = localEntity(state, entityId), start = entity && host(state, entity);
  if (!start || !hasLocalRight(state, entity, actor) || !supplyPassable(state, actor, start)) return null;
  const homes = new Set(state.regions.filter(region => region.owner === actor && region.administrativeStatus === 'integrated').map(region => region.id));
  if (homes.has(start.id)) return {nodes: [start.id], months: 1, treasury: 2, seaLegs: 0};
  const queue = [{id: start.id, nodes: [start.id], months: 0, seaLegs: 0}], seen = new Set();
  while (queue.length) {
    queue.sort((a, b) => a.months - b.months || a.nodes.length - b.nodes.length || a.id.localeCompare(b.id));
    const current = queue.shift();
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    if (homes.has(current.id)) return {nodes: [...current.nodes].reverse(), months: Math.max(1, current.months), treasury: 2 + (current.nodes.length - 1) * 2 + current.seaLegs * 6, seaLegs: current.seaLegs};
    for (const [from, to, kind] of ROUTES) {
      const next = from === current.id ? to : to === current.id ? from : null;
      if (!next || seen.has(next)) continue;
      const region = state.regions.find(item => item.id === next);
      if (!region || !supplyPassable(state, actor, region)) continue;
      queue.push({id: next, nodes: [...current.nodes, next], months: current.months + (kind === 'sea' ? 3 : 1) + (['hills', 'desert'].includes(region.terrain) ? 1 : 0), seaLegs: current.seaLegs + Number(kind === 'sea')});
    }
  }
  return null;
}
export const footholdConnected = (state, entityId, actor) => !!footholdSupplyRoute(state, entityId, actor);

export function footholdShipmentQuote(state, entityId, actor = state.player, food = 4) {
  const entity = localEntity(state, entityId), foothold = entity?.foothold, faction = state.factions[actor];
  if (!foothold || foothold.owner !== actor || foothold.level < 1 || !faction || !Number.isInteger(food) || food < 1) return {ok: false, reason: 'unavailable'};
  const route = footholdSupplyRoute(state, entityId, actor);
  if (!route) return {ok: false, reason: 'route_cut'};
  const committed = (Array.isArray(foothold.shipments) ? foothold.shipments : []).reduce((total, shipment) => total + shipment.food, 0);
  if (foothold.stockFood + committed + food > foothold.level * 12) return {ok: false, reason: 'capacity'};
  if (faction.food < food || faction.treasury < route.treasury) return {ok: false, reason: 'resources'};
  return {ok: true, food, route};
}

export function footholdShipmentRouteOpen(state, entityId, shipment) {
  const entity = localEntity(state, entityId), route = shipment?.route;
  if (!entity || !Array.isArray(route) || !route.length || route.at(-1) !== entity.theater || !hasLocalRight(state, entity, shipment.owner)) return false;
  const first = state.regions.find(region => region.id === route[0]);
  if (!first || first.owner !== shipment.owner || first.administrativeStatus !== 'integrated') return false;
  for (let i = 0; i < route.length; i++) {
    const region = state.regions.find(place => place.id === route[i]);
    if (!region || !supplyPassable(state, shipment.owner, region)) return false;
    if (i && !ROUTES.some(([a, b]) => a === route[i - 1] && b === route[i] || b === route[i - 1] && a === route[i])) return false;
  }
  return true;
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

// A nonplayer court weighs where its field army needs a depot before spending
// on another level at the first eligible place in map order.
export function chooseAiFoothold(state, actor) {
  const candidates = state.regions.flatMap(region => region.localEntities || [])
    .map(entity => ({entity, quote: footholdQuote(state, entity.id, actor)}))
    .filter(candidate => candidate.quote.ok);
  if (!candidates.length) return null;
  if (!['hard', 'expert'].includes(state.difficulty)) return candidates[0].entity;
  const rank = ({entity, quote}) => {
    const units = state.armies.filter(army => army.owner === actor && army.region === entity.theater && !army.move && army.men > 0);
    const strained = units.reduce((total, army) => total + Math.max(0, 75 - (army.morale ?? 75)) * Math.min(2, army.men / 1000), 0);
    const route = footholdSupplyRoute(state, entity.id, actor);
    const existing = entity.foothold?.owner === actor ? entity.foothold.level : 0;
    return (existing ? 12 : 36) + strained + Math.min(12, units.reduce((total, army) => total + army.men, 0) / 1000)
      - Math.max(0, (route?.months || 1) - 1) * 3 - quote.treasury / 3;
  };
  return candidates.sort((a, b) => rank(b) - rank(a) || a.entity.id.localeCompare(b.entity.id))[0].entity;
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
  const quote = footholdShipmentQuote(state, entityId, actor, food);
  if (!quote.ok) return quote;
  const foothold = localEntity(state, entityId).foothold;
  state.factions[actor].food -= food;
  state.factions[actor].treasury -= quote.route.treasury;
  if (!Array.isArray(foothold.shipments)) foothold.shipments = [];
  const shipment = {id: `foothold-shipment:${state.nextFootholdShipmentId || 1}`, owner: actor, food, route: [...quote.route.nodes], remaining: quote.route.months, transportCost: quote.route.treasury, blockedMonths: 0, sent: {year: state.year, month: state.month}};
  state.nextFootholdShipmentId = (state.nextFootholdShipmentId || 1) + 1;
  foothold.shipments.push(shipment);
  return {ok: true, shipment};
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
    if (!hasLocalRight(state, entity, actor)) { entity.lastFootholdLoss = {owner: actor, level: foothold.level, stockFood: foothold.stockFood, shipmentFood: (Array.isArray(foothold.shipments) ? foothold.shipments : []).reduce((sum, item) => sum + item.food, 0), year: state.year, month: state.month}; entity.foothold = null; continue; }
    if (!Array.isArray(foothold.shipments)) foothold.shipments = [];
    for (const shipment of [...(foothold.shipments || [])]) {
      if (!footholdShipmentRouteOpen(state, entity.id, shipment)) {
        shipment.blockedMonths = (shipment.blockedMonths || 0) + 1;
        if (shipment.blockedMonths < 3) continue;
        entity.lastShipmentLoss = {id: shipment.id, owner: actor, food: shipment.food, year: state.year, month: state.month, reason: 'route_cut'};
      } else {
        shipment.blockedMonths = 0;
        if (--shipment.remaining > 0) continue;
        foothold.stockFood += shipment.food;
      }
      foothold.shipments.splice(foothold.shipments.indexOf(shipment), 1);
    }
    const project = foothold.project;
    if (!project) continue;
    const cost = costs[project.targetLevel];
    if (!cost || !footholdConnected(state, entity.id, actor) || !garrison(state, entity, actor, cost.garrison)) continue;
    if (--project.remaining <= 0) { foothold.level = project.targetLevel; foothold.project = null; }
  }
  return state;
}
