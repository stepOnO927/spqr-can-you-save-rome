import {footholdSupplyRoute} from '../foothold.js';
import {accessMapEntries} from './access-map.js?v=dossier-archive-1';

const point = coordinates => Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite) ? coordinates : null;
const feature = (kind, coordinates, name, extra = {}) => ({
  type: 'Feature', properties: {kind, name, ...extra}, geometry: {type: 'Point', coordinates}
});
const line = (kind, coordinates, name, extra = {}) => ({
  type: 'Feature', properties: {kind, name, ...extra}, geometry: {type: 'LineString', coordinates}
});

// This is a player's logistics ledger. Foreign control is read only through
// delivered control reports in accessMapEntries; own cargo and orders are known.
export function expeditionSupportMap(state, coordinatesByTheater) {
  const viewer = state.player;
  const points = [];
  const lines = [];
  const entries = [];
  const theaterPoint = id => point(coordinatesByTheater[id]);
  const path = nodes => {
    if (!Array.isArray(nodes)) return [];
    const coordinates = nodes.map(theaterPoint);
    return coordinates.every(Boolean) ? coordinates : [];
  };
  const addPath = (kind, nodes, name, extra) => {
    const coordinates = path(nodes);
    if (coordinates.length > 1) lines.push(line(kind, coordinates, name, extra));
  };

  for (const theater of state.regions || []) {
    for (const entity of theater.localEntities || []) {
      const depot = entity.foothold;
      if (depot?.owner !== viewer || depot.level < 1) continue;
      const coordinates = point(entity.coordinates) || theaterPoint(theater.id);
      const route = footholdSupplyRoute(state, entity.id, viewer);
      const kind = route ? 'depot' : 'isolated';
      const name = entity.name?.en || entity.name || entity.id;
      entries.push({kind, id: entity.id, theaterId: theater.id, name, level: depot.level, food: depot.stockFood || 0});
      if (coordinates) points.push(feature(kind, coordinates, name, {id: entity.id}));
      if (route) addPath('supply', route.nodes, name, {id: entity.id});
      for (const shipment of depot.shipments || []) {
        if (shipment.owner === viewer)
          addPath('shipment', shipment.route, name, {id: entity.id});
      }
    }
  }

  for (const access of accessMapEntries(state, viewer)) {
    if (!['military', 'limited'].includes(access.kind)) continue;
    const coordinates = theaterPoint(access.theaterId);
    if (!coordinates) continue;
    entries.push({kind: 'access', theaterId: access.theaterId, name: access.name, report: access.report});
    points.push(feature('access', coordinates, access.name?.en || access.name || access.theaterId, {theaterId: access.theaterId}));
  }

  for (const cargo of state.tradeCargo || []) {
    if (cargo.from !== viewer || cargo.status !== 'transit') continue;
    addPath('trade', cargo.path, cargo.id, {id: cargo.id});
    entries.push({kind: 'trade', id: cargo.id, to: cargo.to, dispatched: cargo.dispatched});
  }

  for (const army of state.armies || []) {
    const order = army.expedition;
    if (army.owner !== viewer || !['active', 'paused', 'completed'].includes(order?.status)) continue;
    if (order.status !== 'completed' && Array.isArray(order.nodes) && Array.isArray(order.stagingStops)) {
      for (const theaterId of order.stagingStops) {
        const index = order.nodes.indexOf(theaterId);
        const arrived = order.reason === 'staging' && army.region === theaterId;
        if (index < 1 || index >= order.nodes.length - 1 || index < order.nextIndex && !arrived) continue;
        const coordinates = theaterPoint(theaterId), theater = state.regions.find(region => region.id === theaterId);
        if (!coordinates || !theater) continue;
        const status = arrived ? 'arrived' : 'planned';
        entries.push({kind: 'staging', id: army.id, theaterId, name: theater.name, armyName: army.name, status});
        points.push(feature('staging', coordinates, theater.name?.en || theater.name || theaterId, {id: army.id, theaterId, status}));
      }
    }
    const localGoal = order.localObjectiveId && state.regions.flatMap(region => region.localEntities || [])
      .find(entity => entity.id === order.localObjectiveId && entity.theater === order.destination);
    // Arrival leaves the town decision open. Completed generic routes and secured towns are no longer objectives.
    if (order.status === 'completed' && (!localGoal || army.region !== order.destination || localGoal.controller === viewer)) continue;
    const destination = point(localGoal?.coordinates) || theaterPoint(order.destination);
    const name = army.name?.en || army.name || army.id;
    if (destination) points.push(feature('objective', destination, localGoal?.name || name, {id: army.id, ...(localGoal ? {localObjectiveId: localGoal.id} : {})}));
    addPath('expedition', [army.region, ...(order.nodes || []).slice(order.nextIndex || 0)], name, {id: army.id});
    entries.push({kind: 'objective', id: army.id, name, theaterId: order.destination, status: order.status, ...(localGoal ? {localObjectiveId: localGoal.id, localGoalName: localGoal.name} : {})});
  }

  return {points: {type: 'FeatureCollection', features: points}, lines: {type: 'FeatureCollection', features: lines}, entries};
}
