import {footholdConnected} from './foothold.js';
import {localAdministrator} from './office-system.js?v=world-kings-guardian-1';

const garrisoned = (state, entity, actor) => state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men >= 1000 && !army.move);

export function localSecurity(state, entity) {
  const actor = entity?.controller;
  if (!actor || !state.factions[actor]) return {garrison: false, connected: false};
  return {garrison: garrisoned(state, entity, actor), connected: footholdConnected(state, entity.id, actor)};
}

// A controlled town can resist taxation and administration for months. It
// reverts only after severe unrest, loss of its garrison and an unresolved
// competing legal title. Garrisoned cities never flip by a random roll.
export function advanceLocalResistance(state) {
  const reverted = [];
  for (const region of state.regions) for (const entity of region.localEntities || []) {
    if (entity.type === 'village') continue; // Villages follow the host theater or their local patron; civilian welfare is modeled separately.
    if (!state.factions[entity.controller]) continue;
    entity.resistance ??= entity.administrativeStatus === 'occupied' ? 20 : 0;
    const actor = entity.controller;
    if (entity.legalSovereign === actor && entity.administrativeStatus === 'integrated') {
      entity.resistance = Math.max(0, entity.resistance - 3);
      continue;
    }
    const security = localSecurity(state, entity);
    const taxPressure = state.factions[actor].tax === 'high' ? 1 : 0;
    const unrest = (security.garrison ? -2 : 5) + (security.connected ? -2 : 3) + taxPressure + (entity.administrativeStatus === 'administered' ? -1 : 0) - (localAdministrator(state,entity.id) ? 2 : 0);
    entity.resistance = Math.max(0, Math.min(100, entity.resistance + unrest));
    if (entity.resistance < 100 || security.garrison) continue;
    const prior = actor, claimant = entity.type==='strongman'?entity.id:entity.legalSovereign;
    if (claimant !== entity.id && !state.factions[claimant]) continue;
    entity.controller = claimant;
    if(entity.type==='strongman')entity.allegiance=null;
    entity.militaryOccupier = null;
    entity.administrativeStatus = claimant === entity.id ? entity.type==='strongman'?'personal_rule':'self_governing' : 'integrated';
    entity.administrationProject = null;
    entity.pending = null;
    entity.siege = null;
    if(state.world?.localAdministrators)delete state.world.localAdministrators[entity.id];
    entity.resistance = 35;
    entity.lastOutcome = {actor: claimant, proposal: 'local_reversion', accepted: true, year: state.year, month: state.month};
    if(entity.type==='strongman')for(const village of region.localEntities||[])if(village.sponsor===entity.id){village.controller=entity.id;village.lastPatronController=entity.id;village.militaryOccupier=null;village.administrativeStatus='local_dependency';village.village.project=null;village.village.satisfaction=Math.max(0,village.village.satisfaction-8)}
    reverted.push({id: entity.id, prior, claimant, theater: entity.theater});
  }
  return reverted;
}
