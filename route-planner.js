import {ROUTES,REGIONS} from './data.js?v=intelligence-archive-1';
import {reportedControl} from './control-intelligence.js?v=intelligence-archive-1';
import {militaryAccessStatus} from './border-access.js?v=intelligence-archive-1';

const graph = new Map();
for (const [from, to, type] of ROUTES) {
  for (const [a, b] of [[from, to], [to, from]]) {
    if (!graph.has(a)) graph.set(a, []);
    graph.get(a).push({to: b, sea: type === 'sea'});
  }
}

const rank = {legal: 0, treaty: 1, supply_risk: 2, unconfirmed: 3, requires_transport: 4, requires_permission: 5};
const openingSupply=new Map(REGIONS.map(region=>[region.id,region.supply]));

function legFor(state, actor, army, theaterId, edge) {
  const theater = state.regions.find(region => region.id === theaterId);
  const report = reportedControl(state, actor, theaterId);
  const knownOwner = report?.owner ?? null;
  const access = militaryAccessStatus(state, actor, theaterId, knownOwner);
  // Only the published scenario capacity is usable for a distant estimate.
  // A foreign theater's current improvements and stores may be undiscovered.
  const supplyRisk = state.factions[actor].food < 10 || army.men > (openingSupply.get(theaterId) || 0) * 1000;
  const months = (edge.sea ? 3 : 1) + (['hills', 'desert'].includes(theater.terrain) ? 1 : 0);
  return {
    from: army.region, to: theaterId, sea: edge.sea, months,
    reportedOwner: knownOwner, status: !access.allowed ? 'requires_permission' :
      access.basis === 'unconfirmed' ? 'unconfirmed' :
      ['treaty', 'limited_treaty'].includes(access.basis) ? 'treaty' : 'legal',
    supplyRisk, supportUnconfirmed:knownOwner!==actor
  };
}

// Every item in this brief is either the player's own state, a dated control
// report, or the public route graph. It is recomputed from the same route that
// startExpedition validates and orders, so the preview cannot invent a depot.
export function expeditionBrief(state,armyId,route){
 const army=state.armies.find(unit=>unit.id===armyId),actor=army?.owner;
 if(!army||!state.factions[actor]||!route?.nodes?.length||route.nodes[0]!==army.region)return null;
 const own=id=>state.regions.find(region=>region.id===id&&region.owner===actor);
 const reported=id=>reportedControl(state,actor,id)?.owner||null;
 const home=route.nodes.find(id=>own(id)?.administrativeStatus==='integrated')||null;
 const staging=[];
 const outposts=[];
 const administration=[];
 for(const id of route.nodes){
  const theater=state.regions.find(region=>region.id===id),region=own(id);
  if(!theater)continue;
  for(const entity of theater.localEntities||[]){
   const post=entity.foothold;
   if(post?.owner===actor&&post.level>=1)outposts.push({theater:id,entityId:entity.id,level:post.level,storedFood:post.stockFood||0});
  }
  if(!region)continue;
  if(region.administrativeStatus!=='integrated')administration.push({theater:id,status:region.administrativeStatus||'unadministered'});
  const depot=(region.localEntities||[]).find(entity=>entity.foothold?.owner===actor&&entity.foothold.level>=1&&entity.foothold.stockFood>0);
  if(region.administrativeStatus==='integrated'||depot)staging.push({theater:id,kind:depot?'depot':'integrated',depotId:depot?.id||null,storedFood:depot?.foothold.stockFood||0});
 }
 const risk=[];
 for(const leg of route.legs||[]){
  if(leg.status==='requires_permission'||leg.status==='unconfirmed')risk.push({theater:leg.to,kind:leg.status});
  if(leg.supplyRisk)risk.push({theater:leg.to,kind:'supply'});
  if(leg.supportUnconfirmed)risk.push({theater:leg.to,kind:'support_unconfirmed'});
  if(leg.sea)risk.push({theater:leg.to,kind:'sea'});
 }
 if(route.seaCost>state.factions[actor].treasury)risk.push({theater:null,kind:'transport'});
 return {objective:route.nodes.at(-1),homeBase:home,staging,outposts,administration,
  stops:(route.legs||[]).map(leg=>({theater:leg.to,months:leg.months,sea:leg.sea,reportedOwner:reported(leg.to),baselineSupply:(openingSupply.get(leg.to)||0)*1000})),
  monthlyDepotFood:Math.max(1,Math.ceil(army.men/5000)),armyMen:army.men,
  factionFood:state.factions[actor].food,seaCost:route.seaCost,
  politicalAccess:(route.legs||[]).map(leg=>({theater:leg.to,reportedOwner:reported(leg.to),status:leg.status})),
  risk};
}

function classify(legs, treasury) {
  if (legs.some(leg => leg.status === 'requires_permission')) return 'requires_permission';
  if (legs.filter(leg => leg.sea).length * 8 > treasury) return 'requires_transport';
  if (legs.some(leg => leg.status === 'unconfirmed')) return 'unconfirmed';
  if (legs.some(leg => leg.supplyRisk)) return 'supply_risk';
  if (legs.some(leg => leg.status === 'treaty')) return 'treaty';
  return 'legal';
}

// A bounded search of the existing route graph. It never reads foreign actual
// ownership, armies or defenses; all political labels use the actor's reports.
export function planRoutes(state, armyId, destination, {maxSteps = 24, limit = 3} = {}) {
  const army = state.armies.find(unit => unit.id === armyId && unit.men > 0);
  const knownIds = new Set(state.regions.map(region => region.id));
  if (!army || !state.factions[army.owner]) return {ok: false, reason: 'unavailable', routes: []};
  if (!knownIds.has(destination)) return {ok: false, reason: 'outside_scenario', routes: []};
  if (army.region === destination) return {ok: false, reason: 'already_here', routes: []};
  const queue = [{nodes: [army.region], legs: [], score: 0}];
  const found = [];
  let expanded = 0;
  while (queue.length && expanded++ < 5000 && found.length < 40) {
    queue.sort((a, b) => a.score - b.score || a.nodes.length - b.nodes.length || a.nodes.join('|').localeCompare(b.nodes.join('|')));
    const path = queue.shift(), current = path.nodes.at(-1);
    if (current === destination) { found.push(path); continue; }
    if (path.legs.length >= maxSteps) continue;
    for (const edge of graph.get(current) || []) {
      if (!knownIds.has(edge.to) || path.nodes.includes(edge.to)) continue;
      const leg = legFor(state, army.owner, army, edge.to, edge);
      leg.from = current;
      const penalty = leg.status === 'requires_permission' ? 15 : leg.status === 'unconfirmed' ? 8 : leg.sea ? 2 : 0;
      queue.push({nodes: [...path.nodes, edge.to], legs: [...path.legs, leg], score: path.score + leg.months + penalty + (leg.supplyRisk ? 4 : 0)});
    }
  }
  if (!found.length) return {ok: false, reason: 'no_route', routes: []};
  const ordered = found.map(path => {
    const status = classify(path.legs, state.factions[army.owner].treasury);
    const route={nodes: path.nodes, legs: path.legs, status, months: path.legs.reduce((sum, leg) => sum + leg.months, 0), seaCost: path.legs.filter(leg => leg.sea).length * 8, firstStep: path.nodes[1], score: path.score};
    route.brief=expeditionBrief(state,armyId,route);return route;
  }).sort((a, b) => rank[a.status] - rank[b.status] || a.score - b.score || a.nodes.join('|').localeCompare(b.nodes.join('|')));
  const alternatives = [];
  for (const path of ordered) if (!alternatives.some(other => other.firstStep === path.firstStep)) alternatives.push(path);
  for (const path of ordered) if (alternatives.length < limit && !alternatives.includes(path)) alternatives.push(path);
  return {ok: true, routes: alternatives.slice(0, limit), recommended: alternatives[0]};
}
