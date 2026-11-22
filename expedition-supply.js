import {ROUTES} from './data.js?v=world-kings-command-age-1';
import {militaryAccessStatus} from './border-access.js?v=world-kings-command-age-1';
import {footholdConnected} from './foothold.js';
import {villageFoodQuote, takeVillageFood} from './local-villages.js';

const neighbors = new Map();
for (const [from, to] of ROUTES) {
  if (!neighbors.has(from)) neighbors.set(from, []);
  if (!neighbors.has(to)) neighbors.set(to, []);
  neighbors.get(from).push(to);
  neighbors.get(to).push(from);
}

function supplyNetwork(state, owner) {
  const places = new Map(state.regions.map(region => [region.id, region]));
  const connected = new Set(state.regions.filter(region => region.owner === owner && region.administrativeStatus === 'integrated').map(region => region.id));
  const queue = [...connected];
  for (let index = 0; index < queue.length; index++) {
    for (const id of neighbors.get(queue[index]) || []) {
      if (connected.has(id)) continue;
      const region = places.get(id);
      if (!region) continue;
      const access = militaryAccessStatus(state, owner, id, region.owner);
      if (!access.allowed || ['war', 'unconfirmed'].includes(access.basis)) continue;
      connected.add(id);
      queue.push(id);
    }
  }
  return connected;
}

export function armyExpeditionSupply(state, army, connected = supplyNetwork(state, army?.owner)) {
  const region = state.regions.find(place => place.id === army?.region), faction = state.factions[army?.owner];
  if (!region || !faction || !army?.men || state.dlc) return {status: 'unavailable'};
  const localLoad = state.armies.filter(unit => unit.owner === army.owner && unit.region === region.id && unit.men > 0).reduce((sum, unit) => sum + unit.men, 0);
  const home=state.localCampaign?.id===army.owner&&region.localEntities?.find(entity=>entity.id===army.owner&&entity.controller===army.owner);
  if(home&&localLoad<=Math.max(100,Math.floor(home.population*.15))&&home.food>=2)return {status:'full',basis:'local_home'};
  const capacity = Math.max(0, region.supply || 0) * 1000;
  if (region.owner === army.owner && region.administrativeStatus === 'integrated' && localLoad <= capacity) return {status: 'full'};
  const depot = (region.localEntities || []).find(entity => entity.foothold?.owner === army.owner && entity.foothold.level >= 1 && entity.foothold.stockFood >= Math.max(1, Math.ceil(army.men / 5000)) && footholdConnected(state, entity.id, army.owner));
  if (connected.has(region.id)) {
    if (localLoad <= capacity) return {status: 'full'};
    if (depot) return {status: 'depot', entityId: depot.id, food: Math.max(1, Math.ceil(army.men / 5000))};
    const village = (region.localEntities || []).find(entity => entity.type === 'village' && villageFoodQuote(state, entity.id, army.owner).ok);
    if (village) return {status: 'village_support', entityId: village.id};
    return {status: 'partial'};
  }
  if ((neighbors.get(region.id) || []).some(id => connected.has(id)) && localLoad <= capacity && faction.treasury >= 3) return {status: 'local_purchase', treasury: 3};
  return {status: 'cut_off'};
}

export function advanceExpeditionSupply(state) {
  if (state.dlc) return [];
  const networks = new Map(), events = [];
  for (const army of state.armies) {
    if (!army.men || !state.factions[army.owner]) continue;
    if (!networks.has(army.owner)) networks.set(army.owner, supplyNetwork(state, army.owner));
    const assessment = armyExpeditionSupply(state, army, networks.get(army.owner));
    if (assessment.status === 'unavailable') continue;
    const previous = army.expeditionSupply?.status;
    const strain = ['partial', 'cut_off'].includes(assessment.status);
    const months = strain ? (army.expeditionSupply?.strainMonths || 0) + 1 : 0;
    army.expeditionSupply = {status: assessment.status, strainMonths: months, year: state.year, month: state.month};
    if (assessment.status === 'depot') {
      const depot = state.regions.flatMap(region => region.localEntities || []).find(entity => entity.id === assessment.entityId);
      depot.foothold.stockFood -= assessment.food;
    } else if (assessment.status === 'village_support') {
      const result = takeVillageFood(state, assessment.entityId, army.owner);
      if (result.ok) state.factions[army.owner].food -= result.food;
    } else if (assessment.status === 'local_purchase') {
      state.factions[army.owner].treasury -= assessment.treasury;
    } else if (assessment.status === 'partial' || assessment.status === 'cut_off') {
      army.morale = Math.max(20, army.morale - (assessment.status === 'cut_off' ? 4 : 2));
      if (months >= 2) army.men = Math.max(1, army.men - Math.max(1, Math.ceil(army.men * (assessment.status === 'cut_off' ? .01 : .004))));
    }
    if (previous !== assessment.status && [state.player, 'caesar', 'senate'].includes(army.owner)) events.push({armyId: army.id, owner: army.owner, status: assessment.status});
  }
  return events;
}
