import {ROUTES} from './data.js?v=world-kings-trade-1';
import {generatedLocalPolities,historicalLocalProfile,LOCAL_GENERATION_BANDS} from './local-generation.js';

// Settlement control is stored inside its host theater. An autonomous city
// does not transfer the whole theater, and its point is not a border polygon.
export const LOCAL_ENTITY_TEMPLATES = Object.freeze([
  {
    id: 'massilia',
    type: 'city_state',
    name: ['Massilia', '马赛'],
    theater: 'narbo',
    coordinates: [5.3698, 43.2965],
    source: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1B%2A.html',
    historical: true,
    description: ['Self-governing Greek city and Roman ally', '自治的希腊城邦与罗马盟友'],
    militia: 1800,
    fort: 1,
    treasury: 20,
    food: 12
  },
  {
    id: 'ariminum', type: 'roman_town', name: ['Ariminum', '阿里米努姆'], theater: 'italiaN',
    coordinates: [12.5683, 44.0678], source: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1A%2A.html', historical: true,
    description: ['Roman town entered by Caesar at the start of the civil war', '内战初期凯撒进入的罗马城镇'],
    initialController: 'senate', maxFootholdLevel: 3, militia: 450, fort: 0, treasury: 6, food: 8
  },
  {
    id: 'capua', type: 'roman_town', name: ['Capua', '卡普亚'], theater: 'italiaS',
    coordinates: [14.251, 41.107], source: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1A%2A.html', historical: true,
    description: ['Roman colony used for Pompeian recruitment', '庞培派曾征募兵员的罗马殖民城市'],
    initialController: 'senate', maxFootholdLevel: 3, militia: 700, fort: 0, treasury: 8, food: 10
  },
  {
    id: 'brundisium', type: 'roman_town', name: ['Brundisium', '布伦迪西姆'], theater: 'italiaS',
    coordinates: [17.944, 40.637], source: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1A%2A.html', historical: true,
    description: ['Adriatic port held by Pompey before his departure', '庞培离境前据守的亚得里亚海港口'],
    initialController: 'senate', maxFootholdLevel: 4, militia: 1200, fort: 1, treasury: 10, food: 12
  },
  {
    id: 'bibracte', type: 'tribe', name: ['Aeduan Bibracte', '埃杜伊人的比布拉克特'], theater: 'gaul',
    coordinates: [4.038, 46.921], source: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/7E%2A.html', historical: true,
    description: ['Aeduan oppidum and council center; its relationship with Rome changed during the Gallic War. This point is not a tribal border', '埃杜伊人的城镇和议事中心；其与罗马的关系在高卢战争中曾变化。此点不是部族边界'],
    spatialAccuracy: 'approximate_site_point', maxFootholdLevel: 2, militia: 1100, fort: 1, treasury: 12, food: 14
  },
  {
    id: 'commagene', type: 'microstate', name: ['Commagene at Samosata', '萨莫萨塔的科马吉尼'], theater: 'syria',
    coordinates: [38.471342, 37.564519],
    source: 'https://www.iranicaonline.org/articles/commagene-a-portion-of-southwestern-asia-minor-modern-turkey/',
    coordinateSource: 'https://pleiades.stoa.org/places/658587', historical: true,
    description: ['Independent kingdom at the Euphrates crossing, ruled by Antiochus I in 49 BCE. The site point does not define its borders or make the Syrian theater Roman territory.', '幼发拉底河渡口的独立王国；公元前49年由安条克一世统治。地点标记不定义王国边界，也不表示整个叙利亚战区属于罗马。'],
    ruler: {id: 'commagene-antiochus-i', name: ['Antiochus I Theos', '安条克一世'], source: 'https://www.iranicaonline.org/articles/antiochus-of-commagene/'},
    spatialAccuracy: 'approximate_site_point', maxFootholdLevel: 3, militia: 1000, fort: 1, treasury: 18, food: 10
  },
  {
    id: 'ravenna-farms', type: 'village', name: ['Ravenna Countryside', '拉文纳乡村'], theater: 'cisalpine',
    coordinates: [12.10, 44.46], historical: false, spatialAccuracy: 'fictional_approximate_point',
    description: ['A fictional farming village representing the Ravenna hinterland. Its point and people are gameplay estimates.', '虚构农庄村落，代表拉文纳腹地。地点和人口均为游戏模拟。'],
    initialController: 'caesar', militia: 80, fort: 0, treasury: 2, food: 0,
    village: {population: 620, leader: ['Village council', '村社议事会'], specialty: ['grain', '谷物'], storedFood: 7, foodProduction: 3, foodNeed: 2, granary: 0, irrigation: 0, market: 0, well: 0, road: 0, wall: 0, shrine: 0, agriculture: 0, satisfaction: 70, security: 70, marketAccess: 50, project: null, localIssue: null}
  }
]);

const now = state => state.year * 12 + state.month;
const roll = entity => {
  entity.seed = (Math.imul(entity.seed, 1664525) + 1013904223) >>> 0;
  return entity.seed / 4294967296;
};
const host = (state, entity) => state.regions.find(region => region.id === entity.theater);
export const localEntity = (state, id) => state.regions.flatMap(region => region.localEntities || []).find(entity => entity.id === id) || null;
// A settlement's status follows current population, production and infrastructure.
// It is a local classification, never an independent country or legal title.
export function villageDevelopment(village) {
  if (!village) return {marketTown: false, fortified: false};
  const viable = village.population >= 700 && village.granary > 0 && village.foodProduction + village.irrigation + (village.agriculture || 0) >= village.foodNeed;
  return {
    marketTown: viable && village.market > 0 && village.road > 0 && village.marketAccess >= 70 && village.satisfaction >= 55,
    fortified: viable && village.wall > 0 && village.road > 0 && village.security >= 65
  };
}
export function localEntityRevenue(state, actor) {
  let revenue = 0;
  for (const region of state.regions.filter(item => item.owner === actor)) for (const entity of region.localEntities || []) {
    if (entity.type === 'roman_town') revenue += entity.controller === actor ? entity.resistance >= 60 ? 0 : 1 : -1;
    if (['city_state','microstate','tribe'].includes(entity.type)) {
      if (entity.controller === actor && entity.resistance < 60) revenue += entity.administrativeStatus === 'administered' ? entity.type === 'city_state' ? 3 : 2 : entity.type === 'city_state' ? 2 : 1;
      else if (entity.controller === entity.id && (entity.access[actor] > now(state) || entity.overlord === actor)) revenue++;
    }
    if (entity.type === 'village' && entity.controller === actor && entity.village?.market > 0 && entity.village.satisfaction >= 40) revenue += 1 + (villageDevelopment(entity.village).marketTown ? 1 : 0);
  }
  return revenue;
}

export function initializeLocalEntities(state, {opening = false} = {}) {
  if (!opening) return state; // Old saves cannot establish an unmodeled city's intervening history.
  for (const template of LOCAL_ENTITY_TEMPLATES) {
    const region = state.regions.find(region => region.id === template.theater);
    if (!region) continue;
    region.localEntities ||= [];
    if (region.localEntities.some(entity => entity.id === template.id)) continue;
    region.localEntities.push({
      ...structuredClone(template),
      controller: template.initialController || template.id,
      legalSovereign: template.initialController || template.id,
      militaryOccupier: null,
      administrativeStatus: template.initialController ? 'integrated' : 'self_governing',
      overlord: null,
      access: {},
      pending: null,
      siege: null,
      administrationProject: null,
      resistance: 0,
      lastOfferAt: {},
      seed: 49149
    });
  }
  return state;
}

// Difficulty is selected after the opening state is assembled. Only new
// campaigns call this; loaded campaigns retain every local polity and value.
export function generateOpeningLocalPolities(state,difficulty,seed){
 if(state.world?.localGeneration)return state;
 if(!LOCAL_GENERATION_BANDS[difficulty])throw new Error('Invalid local generation difficulty');
 const number=seed>>>0;
 const hash=id=>[...id].reduce((value,char)=>Math.imul(value^char.charCodeAt(0),16777619)>>>0,number);
 for(const id of ['massilia','bibracte','commagene']){
  const entity=localEntity(state,id);if(!entity)continue;
  const profile=historicalLocalProfile(hash(id),difficulty,entity.type,id==='massilia'?1.15:1);
  Object.assign(entity,profile,{seed:hash(`${id}:decisions`)});
 }
 const candidates=generatedLocalPolities(number,difficulty,new Set(state.regions.map(region=>region.id)));
 for(const template of candidates){
  const region=host(state,template);if(!region)continue;
  region.localEntities||=[];
  if(region.localEntities.some(entity=>entity.id===template.id))continue;
  region.localEntities.push({...template,controller:template.id,legalSovereign:template.id,militaryOccupier:null,
   administrativeStatus:'self_governing',overlord:null,access:{},pending:null,siege:null,administrationProject:null,
   resistance:0,lastOfferAt:{}});
 }
 state.world.localGeneration={version:1,seed:number,difficulty,count:candidates.length};
 return state;
}

export function localContactQuote(state, id, actor = state.player, proposal = 'access') {
  const entity = localEntity(state, id), faction = state.factions[actor];
  if (!entity || !faction || !['access', 'protectorate'].includes(proposal)) return {ok: false, reason: 'unavailable'};
  if (entity.controller !== entity.id) return {ok: false, reason: 'controlled'};
  if (entity.pending || entity.siege) return {ok: false, reason: 'busy'};
  const theater = host(state, entity), neighbors = ROUTES.filter(([a, b]) => a === entity.theater || b === entity.theater).map(([a, b]) => a === entity.theater ? b : a);
  if (theater.owner !== actor && !state.regions.some(region => neighbors.includes(region.id) && region.owner === actor)) return {ok: false, reason: 'no_contact'};
  if (entity.lastOfferAt[actor] != null && now(state) - entity.lastOfferAt[actor] < 6) return {ok: false, reason: 'cooldown'};
  if (proposal === 'access' && entity.overlord === actor) return {ok: false, reason: 'already_subject'};
  if (proposal === 'access' && entity.access[actor] > now(state)) return {ok: false, reason: 'already_granted'};
  if (proposal === 'protectorate' && entity.overlord) return {ok: false, reason: 'already_subject'};
  const cost = proposal === 'access' ? 8 : 16;
  if (faction.treasury < cost) return {ok: false, reason: 'resources'};
  return {ok: true, cost, months: proposal === 'access' ? 2 : 3};
}

export function offerLocalContact(state, id, actor = state.player, proposal = 'access') {
  const quote = localContactQuote(state, id, actor, proposal);
  if (!quote.ok) return quote;
  const entity = localEntity(state, id);
  state.factions[actor].treasury -= quote.cost;
  entity.lastOfferAt[actor] = now(state);
  entity.pending = {actor, proposal, remaining: quote.months, sentYear: state.year, sentMonth: state.month};
  return {ok: true, months: quote.months};
}

export function localSubmissionQuote(state, id, actor = state.player) {
  const entity = localEntity(state, id), faction = state.factions[actor];
  if (!entity || entity.type !== 'roman_town' || !faction || entity.controller === actor || !state.factions[entity.controller]) return {ok: false, reason: 'unavailable'};
  if (!state.wars.some(pair => pair.includes(actor) && pair.includes(entity.controller))) return {ok: false, reason: 'not_at_war'};
  if (host(state, entity)?.owner !== actor) return {ok: false, reason: 'host_control'};
  if (entity.pending || entity.siege) return {ok: false, reason: 'busy'};
  if (entity.lastOfferAt[actor] != null && now(state) - entity.lastOfferAt[actor] < 6) return {ok: false, reason: 'cooldown'};
  if (!state.armies.some(army => army.owner === actor && army.region === entity.theater && !army.move && army.men >= Math.max(1000, entity.militia))) return {ok: false, reason: 'garrison'};
  if (faction.treasury < 6) return {ok: false, reason: 'resources'};
  return {ok: true, treasury: 6, months: 2};
}

export function offerLocalSubmission(state, id, actor = state.player) {
  const quote = localSubmissionQuote(state, id, actor);
  if (!quote.ok) return quote;
  const entity = localEntity(state, id);
  state.factions[actor].treasury -= quote.treasury;
  entity.lastOfferAt[actor] = now(state);
  entity.pending = {actor, proposal: 'submission', expectedController: entity.controller, remaining: quote.months, sentYear: state.year, sentMonth: state.month};
  return {ok: true, months: quote.months};
}

export function localSiegeQuote(state, id, armyId, actor = state.player) {
  const entity = localEntity(state, id), army = state.armies.find(unit => unit.id === armyId);
  if (entity?.overlord === actor) return {ok: false, reason: 'own_subject'};
  const eligible = entity?.controller === entity?.id || entity?.type === 'roman_town' && state.wars.some(pair => pair.includes(actor) && pair.includes(entity.controller));
  if (!entity || !eligible || entity.controller === actor || entity.siege || !army || army.owner !== actor || army.region !== entity.theater || army.move || army.siege || army.men < entity.militia * 1.5) return {ok: false, reason: 'army_or_resistance'};
  if (!state.factions[actor] || state.factions[actor].food < 8) return {ok: false, reason: 'supplies'};
  return {ok: true, food: 8, months: Math.max(2, entity.fort * 3)};
}

export function besiegeLocalEntity(state, id, armyId, actor = state.player) {
  const quote = localSiegeQuote(state, id, armyId, actor);
  if (!quote.ok) return quote;
  const entity = localEntity(state, id);
  state.factions[actor].food -= quote.food;
  entity.pending = null;
  entity.siege = {actor, armyId, remaining: quote.months};
  const protectedBy = entity.overlord || (state.factions[entity.controller] ? entity.controller : 'senate');
  if (actor !== protectedBy && state.factions[protectedBy]) {
    const key = [actor, protectedBy].sort().join(':');
    state.relations[key] = Math.max(-100, (state.relations[key] || 0) - 10);
  }
  return {ok: true, months: quote.months};
}

export function localAdministrationQuote(state, id, actor = state.player) {
  const entity = localEntity(state, id);
  if (!entity || entity.controller !== actor || entity.administrativeStatus !== 'occupied') return {ok: false, reason: 'not_occupied'};
  if (host(state, entity)?.owner !== actor) return {ok: false, reason: 'route_cut'};
  if (entity.administrationProject) return {ok: false, reason: 'in_progress'};
  if (!state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men >= 1000 && !army.move)) return {ok: false, reason: 'garrison'};
  if (state.factions[actor]?.treasury < 12 || state.factions[actor]?.food < 3) return {ok: false, reason: 'resources'};
  return {ok: true, treasury: 12, food: 3, months: 2};
}

export function startLocalAdministration(state, id, actor = state.player) {
  const quote = localAdministrationQuote(state, id, actor);
  if (!quote.ok) return quote;
  const entity = localEntity(state, id);
  state.factions[actor].treasury -= quote.treasury;
  state.factions[actor].food -= quote.food;
  entity.administrationProject = {actor, remaining: quote.months};
  return {ok: true, months: quote.months};
}

export function localOfferChance(state,entity,actor,proposal){
 const skill=entity.strategy||2,army=state.armies.filter(unit=>unit.owner===actor&&unit.region===entity.theater&&!unit.move).reduce((total,unit)=>total+unit.men,0);
 const pressure=army/Math.max(500,entity.militia);
 if(proposal==='access')return Math.max(.08,Math.min(.9,(actor==='senate'?.7:.45)+(pressure>=2?.025*skill:entity.treasury>=25?-.018*skill:0)));
 return Math.max(.04,Math.min(.75,.22+(pressure>=2?.045*skill:-.028*skill)+(entity.food<8?.06:0)));
}

export function advanceLocalEntities(state) {
  for (const region of state.regions) for (const entity of region.localEntities || []) {
    if(entity.procedural&&entity.controller===entity.id&&!entity.siege){
      const threat=state.armies.filter(army=>army.region===entity.theater&&army.owner!==entity.overlord&&army.men>0).reduce((total,army)=>Math.max(total,army.men),0);
      if(state.month%3===0&&entity.strategy>=3&&threat>entity.militia&&entity.treasury>=4&&entity.food>=2&&(entity.lastMobilized?.year!==state.year||entity.lastMobilized?.month!==state.month)){
        const recruits=Math.min(Math.max(0,Math.floor(entity.population*.22)-entity.militia),entity.strategy*60);
        if(recruits>0){entity.treasury-=4;entity.food-=2;entity.militia+=recruits;entity.lastMobilized={year:state.year,month:state.month}}
      }else if(state.month===12&&entity.strategy>=4&&threat===0&&entity.fort<3&&entity.treasury>=16&&entity.food>=6&&(entity.lastFortified?.year!==state.year||entity.lastFortified?.month!==state.month)){
        entity.treasury-=12;entity.food-=2;entity.fort++;entity.lastFortified={year:state.year,month:state.month};
      }
    }
    if (entity.pending && --entity.pending.remaining <= 0) {
      const {actor, proposal, expectedController} = entity.pending;
      const submission = proposal === 'submission';
      const accepted = submission ? entity.type === 'roman_town' && entity.controller === expectedController && state.wars.some(pair => pair.includes(actor) && pair.includes(expectedController)) && host(state, entity)?.owner === actor && !entity.siege && state.armies.some(army => army.owner === actor && army.region === entity.theater && !army.move && army.men >= Math.max(1000, entity.militia)) && roll(entity) < 0.6 : entity.controller === entity.id && !entity.siege && roll(entity) < localOfferChance(state,entity,actor,proposal);
      entity.lastOutcome = {actor, proposal, accepted, year: state.year, month: state.month};
      entity.pending = null;
      if (accepted && proposal === 'access') entity.access[actor] = now(state) + 24;
      if (accepted && proposal === 'protectorate') entity.overlord = actor;
      if (accepted && submission) { entity.controller = actor; entity.militaryOccupier = actor; entity.administrativeStatus = 'occupied'; entity.resistance = 18; }
    }
    if (entity.siege) {
      const {actor, armyId} = entity.siege, army = state.armies.find(unit => unit.id === armyId && unit.owner === actor && unit.region === entity.theater && !unit.move && unit.men > 0);
      if (!army) { entity.siege = null; continue; }
      army.men = Math.max(1, army.men - Math.max(20, Math.round(entity.militia * 0.012 * (1+(entity.strategy||0)*.08))));
      entity.militia = Math.max(0, Math.round(entity.militia * 0.9));
      if (--entity.siege.remaining > 0 || army.men <= entity.militia) continue;
      entity.controller = actor;
      entity.militaryOccupier = actor;
      entity.administrativeStatus = 'occupied';
      entity.resistance = 30;
      entity.overlord = null;
      entity.siege = null;
      entity.lastOutcome = {actor, proposal: 'siege', accepted: true, year: state.year, month: state.month};
    }
    if (entity.administrationProject) {
      const {actor} = entity.administrationProject;
      const garrison = host(state, entity)?.owner === actor && state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men >= 1000 && !army.move);
      if (entity.controller !== actor) entity.administrationProject = null;
      else if (garrison && --entity.administrationProject.remaining <= 0) {
        entity.administrationProject = null;
        entity.administrativeStatus = 'administered';
      }
    }
    if (entity.overlord && state.month === 12 && entity.treasury > 0 && state.factions[entity.overlord]) {
      entity.treasury--;
      state.factions[entity.overlord].treasury++;
    }
  }
  return state;
}
