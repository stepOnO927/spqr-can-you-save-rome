import {ROUTES} from './data.js?v=world-kings-stops-1';
import {generatedLocalPolities,generatedIndependentVillages,generatedNomadicCommunities,generatedWildernessSites,historicalLocalProfile,historicalCivicLeadership,LOCAL_GENERATION_BANDS} from './local-generation.js?v=world-kings-stops-1';
import {sendLetter} from './epistulae.js?v=world-kings-stops-1';
import {nonMilitaryAccessStatus} from './border-access.js?v=world-kings-stops-1';
import {localDiscoveryLevel,LOCAL_DISCOVERY_LEVELS} from './local-discovery.js?v=world-kings-stops-1';

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
const threatenedByHostEnemy=(state,entity,host)=>state.armies.some(army=>army.region===entity.theater&&army.owner!==host&&army.men>entity.militia&&army.men>0&&state.wars.some(war=>war.includes(host)&&war.includes(army.owner)));
const SUPPLY_FOOD = 6, SUPPLY_PRICE = 10, SUPPLY_COURIER = 2;
const roll = entity => {
  entity.seed = (Math.imul(entity.seed, 1664525) + 1013904223) >>> 0;
  return entity.seed / 4294967296;
};
const host = (state, entity) => state.regions.find(region => region.id === entity.theater);
export const localEntity = (state, id) => state.regions.flatMap(region => region.localEntities || []).find(entity => entity.id === id) || null;
export function localTradeOpen(state,entity,actor){
 const theater=host(state,entity),neighbors=ROUTES.filter(([a,b])=>a===entity.theater||b===entity.theater).map(([a,b])=>a===entity.theater?b:a);
 return !!(theater&&state.factions[actor]&&(theater.owner===actor||state.regions.some(region=>neighbors.includes(region.id)&&region.owner===actor))&&nonMilitaryAccessStatus(state,actor,entity.theater,theater.owner,'commercial').allowed);
}
export function initializeLocalRulers(state){
 state.world ||= {};
 state.world.localRulers ||= {};
 for(const region of state.regions)for(const entity of region.localEntities||[]){
  if(!entity.ruler?.id||state.world.localRulers[entity.ruler.id])continue;
  const {id,name,birthYear,personality,fictional,source}=entity.ruler;
  state.world.localRulers[id]={id,polityId:entity.id,name:structuredClone(name),birthYear:birthYear??null,
   personality:personality??null,fictional:!!fictional,source:source??null,alive:true};
 }
 return state;
}
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
    if (['city_state','microstate','tribe','strongman'].includes(entity.type)) {
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
  return initializeLocalRulers(state);
}

function dependentStrongmanVillage(template,region){
 const population=Math.max(350,Math.min(1200,Math.round(template.population*.35/50)*50));
 const foodNeed=Math.max(2,Math.ceil(population/350));
 return {id:`generated-village:${template.theater}`,type:'village',theater:template.theater,
  coordinates:[template.coordinates[0]+.09,template.coordinates[1]-.07],
  name:[`${template.name[0]} Hamlet`,`${template.name[1]}附属村落`],
  historical:false,procedural:true,proceduralVillage:true,spatialAccuracy:'fictional_approximate_point',
  description:['Fictional village under a local strongman. Its position, people and production are simulated; the chief has no recognized sovereign title here.','架空地方豪强控制的村落。地点、人口和产粮均为模拟；首领并未在此获得承认的主权。'],
  controller:template.id,legalSovereign:region.owner,militaryOccupier:null,administrativeStatus:'local_dependency',
  sponsor:template.id,lastHostOwner:region.owner,lastPatronController:template.id,overlord:null,access:{},pending:null,siege:null,administrationProject:null,
  resistance:0,lastOfferAt:{},militia:0,fort:0,treasury:1,food:foodNeed*3,seed:template.seed,
  village:{population,leader:[...template.ruler.name],specialty:template.theater==='parthia'?['pastoral food','畜牧食物']:['grain','谷物'],storedFood:foodNeed*3,
   foodProduction:foodNeed+1,foodNeed,granary:0,irrigation:0,market:0,well:0,road:0,wall:0,shrine:0,agriculture:0,
   satisfaction:62,security:55,marketAccess:45,project:null,localIssue:null}};
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
  if(id==='massilia')Object.assign(entity,historicalCivicLeadership(hash(id),difficulty,state.year));
 }
 const candidates=generatedLocalPolities(number,difficulty,new Set(state.regions.map(region=>region.id)),state.year);
 for(const template of candidates){
  const region=host(state,template);if(!region)continue;
  region.localEntities||=[];
  if(region.localEntities.some(entity=>entity.id===template.id))continue;
  region.localEntities.push({...template,controller:template.id,legalSovereign:template.id,militaryOccupier:null,
   administrativeStatus:template.type==='strongman'?'personal_rule':'self_governing',overlord:null,allegiance:null,access:{},pending:null,siege:null,administrationProject:null,
   resistance:0,lastOfferAt:{}});
  if(template.type==='strongman'){
   const strongman=region.localEntities.at(-1);strongman.legalSovereign=region.owner;strongman.claimedSovereignty=false;
   if(!region.localEntities.some(entity=>entity.id===`generated-village:${template.theater}`))region.localEntities.push(dependentStrongmanVillage(template,region));
  }
 }
 const independentVillages=generatedIndependentVillages(number,difficulty,new Set(state.regions.map(region=>region.id)));
 for(const template of independentVillages){
  const region=host(state,template);if(!region)continue;
  region.localEntities||=[];
  if(region.localEntities.some(entity=>entity.id===template.id))continue;
  region.localEntities.push({...template,controller:region.owner,legalSovereign:region.owner,militaryOccupier:null,administrativeStatus:'integrated',
   overlord:null,access:{},pending:null,siege:null,administrationProject:null,resistance:0,lastOfferAt:{}});
 }
 const nomads=generatedNomadicCommunities(number,difficulty,new Set(state.regions.map(region=>region.id)),state.year);
 for(const template of nomads){
  const region=host(state,template);if(!region)continue;
  region.localEntities||=[];
  if(region.localEntities.some(entity=>entity.id===template.id))continue;
  region.localEntities.push({...template,controller:template.id,legalSovereign:region.owner,claimedSovereignty:false,militaryOccupier:null,administrativeStatus:'seasonal_camp',overlord:null,allegiance:null,access:{},pending:null,siege:null,administrationProject:null,resistance:0,lastOfferAt:{}});
 }
 const wilds=generatedWildernessSites(number,new Set(state.regions.map(region=>region.id)));
 for(const template of wilds){
  const region=host(state,template);if(!region)continue;
  region.localEntities||=[];
  if(region.localEntities.some(entity=>entity.id===template.id))continue;
  region.localEntities.push({...template,controller:null,legalSovereign:region.owner,militaryOccupier:null,administrativeStatus:'unadministered_land',overlord:null,access:{},pending:null,siege:null,administrationProject:null,resistance:0,militia:0,fort:0,treasury:0,food:0,lastOfferAt:{}});
 }
 state.world.localGeneration={version:4,seed:number,difficulty,count:candidates.length,independentVillageCount:independentVillages.length,nomadCount:nomads.length,wildernessCount:wilds.length};
 return initializeLocalRulers(state);
}

function reportLocalOffer(state,entity,pending,accepted){
 if(pending.actor!==state.player)return null;
 const zhName=entity.name[1],enName=entity.name[0];
 const ruler=state.world?.localRulers?.[entity.ruler?.id];
 const officialEn=ruler?.name?.[0]||'the local council',officialZh=ruler?.name?.[1]||'当地议事机构';
 const kind=pending.proposal==='access'?'access':pending.proposal==='trade'?'trade':pending.proposal==='supplies'?'supplies':pending.proposal==='protectorate'?'protectorate':pending.proposal==='service'?'service':pending.proposal==='recognition'?'recognition':pending.proposal==='pasture'?'pasture':'submission';
 const subject={access:[`Access reply from ${enName}`,`${zhName}的通行答复`],trade:[`Trade reply from ${enName}`,`${zhName}的贸易答复`],supplies:[`Supply reply from ${enName}`,`${zhName}的粮食答复`],protectorate:[`Protectorate reply from ${enName}`,`${zhName}的附属答复`],service:[`Service reply from ${enName}`,`${zhName}的效忠答复`],recognition:[`Title reply from ${enName}`,`${zhName}的称号答复`],pasture:[`Pasture reply from ${enName}`,`${zhName}的牧地答复`],submission:[`Submission reply from ${enName}`,`${zhName}的归降答复`]}[kind];
 const outcome=accepted?['accepted','接受']:['refused','拒绝'];
 const body=kind==='supplies'?(accepted?
  [`${officialEn} supplied 6 food from ${enName}'s finite stores for the 10 treasury held in escrow. The 2-treasury courier fee was spent. No passage or political title changed.`,`${officialZh}从${zhName}有限的存粮中交付6粮食，收取预存的10国库；2国库信使费用已支出。通行权及法理归属均未改变。`]:
  [`${officialEn} did not supply food from ${enName}. The 10-treasury price held in escrow was returned; the 2-treasury courier fee was spent.`,`${officialZh}未能从${zhName}交付粮食；预存的10国库货款已退回，2国库信使费用已支出。`]):
  [`Our envoy reports that ${officialEn} has ${outcome[0]} the ${kind} proposal at ${enName}.`,
   `我方使者回报：${officialZh}已${outcome[1]}向${zhName}提出的${{access:'通行',trade:'地方贸易',protectorate:'自治附属',service:'个人效忠',recognition:'承认地方称号',pasture:'牧地协定',submission:'归降'}[kind]}提议。`];
 const sent=sendLetter(state,{senderFaction:pending.actor,senderInstitution:pending.actor,recipient:pending.actor,category:'government',
  subject,body,options:['acknowledge'],source:entity.theater,priority:'routine',
  eventId:`local:${entity.id}:${kind}:${pending.sentYear}:${pending.sentMonth}`,
  context:{kind:'local_contact_result',polityId:entity.id,proposal:kind,accepted,rulerId:ruler?.id||null,rulerName:ruler?.name||null}});
 if(!sent.ok)return null;
 // The negotiation's existing multi-month delay includes the envoy's return trip.
 sent.letter.arrival=now(state);sent.letter.delivery='received';
 return sent.letter.id;
}

export function localContactQuote(state, id, actor = state.player, proposal = 'access') {
  const entity = localEntity(state, id), faction = state.factions[actor];
  if (!entity || !faction || !['access', 'trade','supplies','protectorate','service','recognition','pasture'].includes(proposal)) return {ok: false, reason: 'unavailable'};
  if(['trade','supplies'].includes(proposal)&&!['city_state','microstate','tribe'].includes(entity.type))return {ok:false,reason:'unavailable'};
  if((['service','recognition'].includes(proposal)&&entity.type!=='strongman')||(proposal==='pasture'&&entity.type!=='nomadic')||(entity.type==='nomadic'&&proposal!=='pasture')||(proposal==='protectorate'&&entity.type==='strongman'))return {ok:false,reason:'unavailable'};
  if (entity.controller !== entity.id) return {ok: false, reason: 'controlled'};
  if (entity.pending || entity.siege) return {ok: false, reason: 'busy'};
  const theater = host(state, entity), neighbors = ROUTES.filter(([a, b]) => a === entity.theater || b === entity.theater).map(([a, b]) => a === entity.theater ? b : a);
  if (theater.owner !== actor && !state.regions.some(region => neighbors.includes(region.id) && region.owner === actor)) return {ok: false, reason: 'no_contact'};
  if(['trade','supplies'].includes(proposal)&&!localTradeOpen(state,entity,actor))return {ok:false,reason:'trade_route_closed'};
  if(proposal==='trade'&&entity.food-2<Math.max(4,Math.ceil((entity.population||3000)/3000)))return {ok:false,reason:'no_surplus'};
  if(proposal==='supplies'&&entity.food-SUPPLY_FOOD<Math.max(4,Math.ceil((entity.population||3000)/3000)))return {ok:false,reason:'no_surplus'};
  if(proposal==='supplies'&&faction.food>=20)return {ok:false,reason:'no_need'};
  if (proposal === 'recognition' && (theater.owner !== actor || entity.allegiance && entity.allegiance !== actor)) return {ok: false, reason: 'no_authority'};
  if (entity.lastOfferAt[actor] != null && now(state) - entity.lastOfferAt[actor] < 6) return {ok: false, reason: 'cooldown'};
  if (proposal === 'access' && entity.overlord === actor) return {ok: false, reason: 'already_subject'};
  if (proposal === 'access' && entity.access[actor] > now(state)) return {ok: false, reason: 'already_granted'};
  if (proposal === 'trade' && entity.tradeRights?.[actor] > now(state)) return {ok: false, reason: 'already_granted'};
  if (proposal === 'protectorate' && entity.overlord) return {ok: false, reason: 'already_subject'};
  if(proposal==='service'&&entity.allegiance)return {ok:false,reason:'already_affiliated'};
  if(proposal==='recognition'&&entity.recognizedBy===actor)return {ok:false,reason:'already_recognized'};
  if(proposal==='pasture'&&entity.pastureRights?.[actor]>now(state))return {ok:false,reason:'already_granted'};
  const cost = proposal === 'access' ? 8 : proposal==='trade'?10:proposal==='supplies'?SUPPLY_PRICE+SUPPLY_COURIER:proposal==='service'?12:proposal==='recognition'?8:proposal==='pasture'?6:16;
  if (faction.treasury < cost) return {ok: false, reason: 'resources'};
  return {ok: true, cost, months: proposal === 'protectorate' ? 3 : 2};
}

export function offerLocalContact(state, id, actor = state.player, proposal = 'access') {
  const quote = localContactQuote(state, id, actor, proposal);
  if (!quote.ok) return quote;
  const entity = localEntity(state, id);
  state.factions[actor].treasury -= quote.cost;
  entity.lastOfferAt[actor] = now(state);
  entity.pending = {actor, proposal, remaining: quote.months, sentYear: state.year, sentMonth: state.month,...(proposal==='supplies'?{escrow:SUPPLY_PRICE,lastAdvancedAt:now(state)}:{})};
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
  if(entity?.type==='nomadic')return {ok:false,reason:'mobile_camp'};
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
 if(proposal==='service')return Math.max(.08,Math.min(.8,.4+(pressure>=2?.035*skill:-.02*skill)+(host(state,entity)?.owner===actor ? .1 : 0)+(entity.recognizedBy===actor ? .12 : 0)-(entity.treasury>=18 ? .05 : 0)));
 if(proposal==='recognition')return Math.max(.1,Math.min(.85,.58-.025*skill+(host(state,entity)?.owner===actor ? .12 : 0)+(entity.treasury<10 ? .06 : 0)));
 if(proposal==='pasture')return Math.max(.12,Math.min(.9,.65-.035*skill+(host(state,entity)?.owner===actor ? .1 : 0)+(entity.waterSecurity<60 ? .08 : 0)));
 if(proposal==='trade')return Math.max(.1,Math.min(.85,.6-(skill-2)*.025+(entity.food<8?-.18:0)+(host(state,entity)?.owner===actor ? .08 : 0)));
 if(proposal==='supplies')return Math.max(.08,Math.min(.85,.67-(skill-2)*.025+(host(state,entity)?.owner===actor ? .08 : 0)-(entity.food<16 ? .12 : 0)));
 return Math.max(.04,Math.min(.75,.22+(pressure>=2?.045*skill:-.028*skill)+(entity.food<8?.06:0)));
}

// A compact transfers finite local food and actual treasury at a nearby
// commercial border. It grants no army passage or political title.
export function advanceLocalTrade(state){
 if(state.localTradeLastAdvancedAt===now(state))return state;
 state.localTradeLastAdvancedAt=now(state);
 if(state.month%3!==0)return state;
 for(const region of state.regions)for(const entity of region.localEntities||[]){
  if(entity.controller!==entity.id||!['city_state','microstate','tribe'].includes(entity.type))continue;
  for(const [actor,until] of Object.entries(entity.tradeRights||{})){
   const reserve=Math.max(4,Math.ceil((entity.population||3000)/3000));
   if(until<=now(state)||entity.food-2<reserve||state.factions[actor]?.treasury<3||!localTradeOpen(state,entity,actor))continue;
   entity.food-=2;entity.treasury+=3;state.factions[actor].treasury-=3;state.factions[actor].food+=2;
   const count=entity.lastTrade?.year===state.year&&entity.lastTrade?.month===state.month?(entity.lastTrade.count||1)+1:1;
   entity.lastTrade={actor,year:state.year,month:state.month,food:2,price:3,count};
   if(actor===state.player)state.log.unshift({year:state.year,month:state.month,en:`A commercial compact brought 2 food from ${entity.name[0]} for 3 treasury.`,zh:`地方贸易协定从${entity.name[1]}购得2粮食，支付3国库。`});
  }
 }
 state.log=state.log.slice(0,80);return state;
}

// Autonomous communities keep a small budget for their own fields and
// defenders. The surrounding game theater's tax and food remain with its
// controller; this settlement neither owns nor silently taxes that theater.
export function advanceLocalCivicEconomy(state){
 if(state.localCivicEconomyLastAt===now(state))return state;
 state.localCivicEconomyLastAt=now(state);
 for(const region of state.regions)for(const entity of region.localEntities||[]){
  if(!['city_state','microstate','tribe'].includes(entity.type)||entity.controller!==entity.id||entity.siege)continue;
  const population=Math.max(1000,entity.population||6000),militia=Math.max(0,entity.militia||0),strategy=Math.max(0,entity.strategy||0);
  const production=Math.ceil(population/4000)+(strategy>0?Math.max(1,strategy-1):0),civilianNeed=Math.ceil(population/6500),guardNeed=Math.ceil(militia/2400);
  const harvest=state.month===9?Math.ceil(population/4000):0;
  const stewardBenefit=Math.floor(Math.max(0,(entity.civicOfficers?.steward?.skill||1)-1)/2);
  const captainBenefit=Math.floor(Math.max(0,(entity.civicOfficers?.captain?.skill||1)-1)/2);
  const tax=Math.ceil(population/6000)+Math.max(0,strategy-1)+stewardBenefit,upkeep=Math.max(0,Math.ceil(militia/1800)-captainBenefit);
  const storageCap=Math.max(8,entity.food,Math.ceil(population/300)),grossFood=Math.max(0,entity.food+production+harvest-civilianNeed-guardNeed);
  const availableFood=Math.min(storageCap,grossFood),spoilage=grossFood-availableFood;
  const foodShortfall=Math.max(0,civilianNeed+guardNeed-entity.food-production-harvest);
  const availableTreasury=Math.max(0,entity.treasury+tax-upkeep);
  const payShortfall=Math.max(0,upkeep-entity.treasury-tax);
  entity.food=availableFood;entity.treasury=availableTreasury;
  if(foodShortfall){entity.population=Math.max(1000,population-Math.min(Math.floor(population*.01),foodShortfall*80));entity.militia=Math.max(0,militia-foodShortfall*45)}
  if(payShortfall)entity.militia=Math.max(0,entity.militia-payShortfall*35);
  entity.lastCivicBudget={year:state.year,month:state.month,production,harvest,civilianNeed,guardNeed,tax,upkeep,storageCap,spoilage,foodShortfall,payShortfall,...(entity.civicOfficers?{stewardBenefit,captainBenefit}:{})};
 }
 return state;
}

export function advanceLocalEntities(state) {
  for (const region of state.regions) for (const entity of region.localEntities || []) {
    if(entity.overlord&&!state.factions[entity.overlord]){
      const former=entity.overlord;entity.overlord=null;
      entity.lastProtectorateEnd={year:state.year,month:state.month,former,reason:'protector_dissolved'};
      if(state.localCampaign?.id===entity.id){state.localCampaign.independenceOffer=null;state.log.unshift({year:state.year,month:state.month,en:`${entity.name[0]} no longer owes tribute after its protector's court dissolved.`,zh:`${entity.name[1]}的庇护国政权消亡，年度贡金义务终止。`})}
    }
    if(entity.type==='strongman'&&entity.procedural){
      const charter=entity.localCharter;
      if(charter?.active&&(region.owner!==charter.host||entity.controller!==entity.id||!state.factions[charter.host]||entity.allegiance&&entity.allegiance!==charter.host)){
        charter.active=false;charter.ended={year:state.year,month:state.month,reason:'control_changed'};
        if(entity.administrativeStatus==='chartered_household')entity.administrativeStatus='personal_rule';
      }
      if(charter?.active&&[6,12].includes(state.month)&&(charter.lastPayment?.year!==state.year||charter.lastPayment?.month!==state.month)){
        charter.lastPayment={year:state.year,month:state.month};
        if(entity.treasury>=2){entity.treasury-=2;state.factions[charter.host].treasury+=2;charter.arrears=0}
        else if(++charter.arrears>=2){charter.active=false;charter.ended={year:state.year,month:state.month,reason:'arrears'};entity.administrativeStatus='personal_rule'}
      }
      const last=entity.lastCharterPetitionAt;
      if(state.month===4&&entity.controller===entity.id&&!entity.siege&&!entity.pending&&!entity.localCharter?.active&&(!entity.allegiance||entity.allegiance===region.owner)&&region.owner===state.player&&entity.strategy>=4&&entity.treasury>=6&&entity.militia>=Math.max(200,entity.population*.08)&&(!last||now(state)-(last.year*12+last.month)>=12)){
        const sent=sendLetter(state,{senderFaction:state.player,senderInstitution:state.player,recipient:state.player,category:'government',priority:'important',source:region.id,
          subject:[`Autonomy petition from ${entity.name[0]}`,`${entity.name[1]}自治请愿`],
          body:[`${entity.ruler.name[0]} asks for a local household charter. Granting it costs 5 treasury; the chief keeps personal control and legal title stays with the host court. The household owes 2 treasury each half-year while the charter is active.`,` ${entity.ruler.name[1]}请求地方家族自治特许。批准需5国库；首领继续掌管当地，法理归属仍属本方。特许有效时，地方家族每半年缴纳2国库。`],
          options:['grant_local_charter','refuse'],context:{kind:'strongman_charter_request',polityId:entity.id,host:region.owner}});
        if(sent.ok){sent.letter.senderName=[...entity.ruler.name];entity.lastCharterPetitionAt={year:state.year,month:state.month};entity.charterPetitionMailId=sent.letter.id}
      }
      const npcHost=region.owner,npcLast=entity.lastNpcCharterAt;
      if(state.month===4&&npcHost!==state.player&&state.factions[npcHost]?.treasury>=10&&state.factions[npcHost].stability>=45&&entity.controller===entity.id&&!entity.siege&&!entity.pending&&!entity.localCharter?.active&&!entity.npcCharterOffer&&(!entity.allegiance||entity.allegiance===npcHost)&&entity.strategy>=4&&entity.treasury>=6&&entity.militia>=Math.max(200,entity.population*.08)&&localDiscoveryLevel(state,npcHost,entity.id)>=LOCAL_DISCOVERY_LEVELS.identified&&(!npcLast||now(state)-(npcLast.year*12+npcLast.month)>=12)){
        entity.npcCharterOffer={host:npcHost,remaining:2,sentYear:state.year,sentMonth:state.month,lastAdvancedAt:now(state)};
        entity.lastNpcCharterAt={year:state.year,month:state.month};
      }
      if(entity.npcCharterOffer&&entity.npcCharterOffer.lastAdvancedAt!==now(state)){
        entity.npcCharterOffer.lastAdvancedAt=now(state);
        if(--entity.npcCharterOffer.remaining<=0){
          const offer=entity.npcCharterOffer,hostCourt=state.factions[offer.host];
          const accepted=region.owner===offer.host&&entity.controller===entity.id&&!entity.siege&&!entity.pending&&!entity.localCharter?.active&&(!entity.allegiance||entity.allegiance===offer.host)&&hostCourt?.treasury>=10&&hostCourt.stability>=45&&entity.treasury>=3;
          if(accepted){hostCourt.treasury-=5;entity.localCharter={host:offer.host,active:true,granted:{year:state.year,month:state.month},arrears:0,lastPayment:null};entity.administrativeStatus='chartered_household';const village=region.localEntities.find(site=>site.sponsor===entity.id)?.village;if(village)village.satisfaction=Math.min(100,village.satisfaction+3)}
          entity.lastNpcCharterOutcome={host:offer.host,accepted:!!accepted,year:state.year,month:state.month};
          entity.npcCharterOffer=null;
        }
      }
    }
    if(entity.procedural&&['city_state','microstate','tribe'].includes(entity.type)&&state.month===4&&entity.strategy>=3&&entity.controller===entity.id&&!entity.siege&&!entity.pending&&!entity.tradePetitionReply&&state.factions[state.player]&&!(entity.tradeRights?.[state.player]>now(state))){
      const buyer=state.factions[state.player],reserve=Math.max(4,Math.ceil(entity.population/3000));
      const last=entity.lastTradePetitionAt;
      if(buyer.food<20&&buyer.treasury>=6&&entity.food>=reserve+4&&entity.treasury>=3&&localTradeOpen(state,entity,state.player)&&(!last||now(state)-(last.year*12+last.month)>=12)){
        const sent=sendLetter(state,{senderFaction:state.player,senderInstitution:state.player,recipient:state.player,category:'government',priority:'routine',source:entity.theater,
          subject:[`Food compact proposed by ${entity.name[0]}`,`${entity.name[1]}提出粮食贸易`],
          body:[`${entity.ruler.name[0]}, a fictional local ruler in this campaign, proposes a two-year compact. Your answer must travel back; the court can buy 2 local food for 3 treasury each quarter only after acceptance arrives and the commercial route and both reserves remain sufficient. The compact grants no military access or political title.`,`本局虚构地方领袖${entity.ruler.name[1]}提议订立两年粮食协定。本方回信须送抵当地；此后仅当商路及双方储备允许时，本方每季度可用3国库购入当地2粮食。协定不授予军队通行或法理归属。`],
          options:['accept_local_trade','refuse'],expires:now(state)+6,
          context:{kind:'local_trade_petition',polityId:entity.id,host:state.player,rulerName:[...entity.ruler.name]}});
        if(sent.ok){sent.letter.senderName=[...entity.ruler.name];entity.lastTradePetitionAt={year:state.year,month:state.month};entity.tradePetitionMailId=sent.letter.id}
      }
    }
    if(entity.tradePetitionReply&&entity.tradePetitionReply.lastAdvancedAt!==now(state)){
      entity.tradePetitionReply.lastAdvancedAt=now(state);
      if(--entity.tradePetitionReply.remaining<=0){
        const reply=entity.tradePetitionReply,buyer=state.factions[reply.host],reserve=Math.max(4,Math.ceil((entity.population||3000)/3000));
        const concluded=reply.accepted&&entity.controller===entity.id&&!entity.siege&&buyer?.treasury>=3&&entity.food>=reserve+2&&localTradeOpen(state,entity,reply.host)&&!(entity.tradeRights?.[reply.host]>now(state));
        if(concluded){entity.tradeRights||={};entity.tradeRights[reply.host]=now(state)+24}
        entity.lastOutcome={actor:reply.host,proposal:'trade_petition',accepted:!!concluded,year:state.year,month:state.month};
        entity.tradePetitionReply=null;
        if(reply.host===state.player&&buyer){
          const status=concluded?['Your acceptance reached the local ruler. The two-year food compact is now active; each quarterly exchange still needs an open route and funded reserves.','本方同意书已送达地方领袖。两年粮食协定现已生效；每季度交易仍须商路畅通且双方有足够储备。']:reply.accepted?['The acceptance reached the locality, but changed control, a closed route or depleted reserves prevented the compact. No trade right was created.','同意书抵达当地，但控制权、商路或储备已变化，协定未能成立；未获得贸易权利。']:['Your refusal reached the local ruler. No trade right was created.','本方拒绝书已送达地方领袖；未获得贸易权利。'];
          const sent=sendLetter(state,{senderFaction:reply.host,senderInstitution:reply.host,recipient:reply.host,category:'government',priority:'routine',source:entity.theater,
            subject:[`Reply delivered to ${entity.name[0]}`,`致${entity.name[1]}的回信已送达`],body:status,options:['acknowledge'],
            context:{kind:'local_trade_reply_result',polityId:entity.id,host:reply.host,accepted:!!concluded}});
          if(sent.ok){sent.letter.arrival=now(state);sent.letter.delivery='received'}
        }
      }
    }
    if(entity.procedural&&['city_state','microstate','tribe'].includes(entity.type)&&state.month===4&&entity.strategy>=3&&entity.controller===entity.id&&!entity.siege&&!entity.pending&&!entity.npcTradeOffer){
      const last=entity.lastNpcTradeOfferAt,reserve=Math.max(4,Math.ceil(entity.population/3000));
      if(entity.food>=reserve+4&&(!last||now(state)-(last.year*12+last.month)>=12)){
        const candidates=Object.entries(state.factions).filter(([actor,buyer])=>actor!==state.player&&buyer.food<20&&buyer.treasury>=6&&!(entity.tradeRights?.[actor]>now(state))&&localDiscoveryLevel(state,actor,entity.id)>=LOCAL_DISCOVERY_LEVELS.identified&&localTradeOpen(state,entity,actor));
        candidates.sort(([a,buyerA],[b,buyerB])=>buyerA.food-buyerB.food||a.localeCompare(b));
        if(candidates.length){entity.npcTradeOffer={host:candidates[0][0],remaining:2,sentYear:state.year,sentMonth:state.month,lastAdvancedAt:now(state)};entity.lastNpcTradeOfferAt={year:state.year,month:state.month}}
      }
    }
    if(entity.npcTradeOffer&&entity.npcTradeOffer.lastAdvancedAt!==now(state)){
      entity.npcTradeOffer.lastAdvancedAt=now(state);
      if(--entity.npcTradeOffer.remaining<=0){
        const offer=entity.npcTradeOffer,buyer=state.factions[offer.host],reserve=Math.max(4,Math.ceil((entity.population||3000)/3000));
        const accepted=entity.controller===entity.id&&!entity.siege&&buyer?.food<20&&buyer.treasury>=6&&entity.food>=reserve+2&&localTradeOpen(state,entity,offer.host)&&!(entity.tradeRights?.[offer.host]>now(state));
        if(accepted){entity.tradeRights||={};entity.tradeRights[offer.host]=now(state)+24}
        entity.lastNpcTradeOutcome={host:offer.host,accepted:!!accepted,year:state.year,month:state.month};
        entity.npcTradeOffer=null;
      }
    }
    if(entity.procedural&&['city_state','microstate','tribe'].includes(entity.type)&&state.month===4&&entity.strategy>=3&&entity.controller===entity.id&&!entity.overlord&&!entity.siege&&!entity.pending&&!entity.npcProtectorateOffer&&state.localCampaign?.id!==entity.id){
      const patron=region.owner,court=state.factions[patron],last=entity.lastNpcProtectorateAt;
      const threat=threatenedByHostEnemy(state,entity,patron);
      if(patron!==state.player&&court?.treasury>=12&&court.stability>=45&&entity.treasury>=2&&threat&&localDiscoveryLevel(state,patron,entity.id)>=LOCAL_DISCOVERY_LEVELS.identified&&(!last||now(state)-(last.year*12+last.month)>=12)){
        entity.treasury-=2;
        entity.npcProtectorateOffer={host:patron,remaining:3,sentYear:state.year,sentMonth:state.month,lastAdvancedAt:now(state)};
        entity.lastNpcProtectorateAt={year:state.year,month:state.month};
      }
    }
    if(entity.npcProtectorateOffer&&entity.npcProtectorateOffer.lastAdvancedAt!==now(state)){
      entity.npcProtectorateOffer.lastAdvancedAt=now(state);
      if(--entity.npcProtectorateOffer.remaining<=0){
        const offer=entity.npcProtectorateOffer,court=state.factions[offer.host];
        const threat=threatenedByHostEnemy(state,entity,offer.host);
        const accepted=region.owner===offer.host&&entity.controller===entity.id&&!entity.overlord&&!entity.siege&&!entity.pending&&court?.treasury>=10&&court.stability>=45&&threat;
        if(accepted){court.treasury-=6;entity.treasury+=6;entity.overlord=offer.host}
        entity.lastNpcProtectorateOutcome={host:offer.host,accepted:!!accepted,year:state.year,month:state.month};
        entity.npcProtectorateOffer=null;
      }
    }
    if(entity.procedural&&!entity.proceduralVillage&&entity.controller===entity.id&&!entity.siege){
      if(entity.type==='strongman'&&state.month%3===0&&(entity.lastVillageLevy?.year!==state.year||entity.lastVillageLevy?.month!==state.month)){
        entity.lastVillageLevy={year:state.year,month:state.month};
        const dependent=region.localEntities.find(site=>site.sponsor===entity.id&&site.controller===entity.id),village=dependent?.village;
        if(village&&village.storedFood>village.foodNeed*2&&village.satisfaction>=40){village.storedFood--;village.satisfaction=Math.max(0,village.satisfaction-1);entity.food++}
      }
      const threat=state.armies.filter(army=>army.region===entity.theater&&army.owner!==entity.overlord&&army.men>0).reduce((total,army)=>Math.max(total,army.men),0);
      if(state.month%3===0&&entity.strategy>=3&&threat>entity.militia&&entity.treasury>=4&&entity.food>=2&&(entity.lastMobilized?.year!==state.year||entity.lastMobilized?.month!==state.month)){
        const recruits=Math.min(Math.max(0,Math.floor(entity.population*.22)-entity.militia),entity.strategy*60);
        if(recruits>0){entity.treasury-=4;entity.food-=2;entity.militia+=recruits;entity.lastMobilized={year:state.year,month:state.month}}
      }else if(entity.type!=='nomadic'&&state.month===12&&entity.strategy>=4&&threat===0&&entity.fort<3&&entity.treasury>=16&&entity.food>=6&&(entity.lastFortified?.year!==state.year||entity.lastFortified?.month!==state.month)){
        entity.treasury-=12;entity.food-=2;entity.fort++;entity.lastFortified={year:state.year,month:state.month};
      }
    }
    const canAdvancePending=entity.pending&&(entity.pending.proposal!=='supplies'||entity.pending.lastAdvancedAt!==now(state));
    if(canAdvancePending&&entity.pending.proposal==='supplies')entity.pending.lastAdvancedAt=now(state);
    if (canAdvancePending && --entity.pending.remaining <= 0) {
      const pending=entity.pending,{actor, proposal, expectedController} = pending;
      const submission = proposal === 'submission';
      const buyer=state.factions[actor],supplyReady=proposal!=='supplies'||pending.escrow===SUPPLY_PRICE&&buyer?.food<20&&entity.food-SUPPLY_FOOD>=Math.max(4,Math.ceil((entity.population||3000)/3000))&&localTradeOpen(state,entity,actor);
      const accepted = submission ? entity.type === 'roman_town' && entity.controller === expectedController && state.wars.some(pair => pair.includes(actor) && pair.includes(expectedController)) && host(state, entity)?.owner === actor && !entity.siege && state.armies.some(army => army.owner === actor && army.region === entity.theater && !army.move && army.men >= Math.max(1000, entity.militia)) && roll(entity) < 0.6 : entity.controller === entity.id && !entity.siege && supplyReady && roll(entity) < localOfferChance(state,entity,actor,proposal);
      entity.lastOutcome = {actor, proposal, accepted, year: state.year, month: state.month,...(proposal==='supplies'?{food:accepted?SUPPLY_FOOD:0,price:accepted?SUPPLY_PRICE:0,refunded:accepted?0:pending.escrow===SUPPLY_PRICE&&buyer?SUPPLY_PRICE:0}:{})};
      entity.pending = null;
      if (accepted && proposal === 'access') entity.access[actor] = now(state) + 24;
      if (accepted && proposal === 'trade') {entity.tradeRights||={};entity.tradeRights[actor]=now(state)+24;}
      if(proposal==='supplies'&&pending.escrow===SUPPLY_PRICE&&buyer){if(accepted){entity.food-=SUPPLY_FOOD;entity.treasury+=SUPPLY_PRICE;buyer.food+=SUPPLY_FOOD}else buyer.treasury+=SUPPLY_PRICE}
      if (accepted && proposal === 'protectorate') entity.overlord = actor;
      if (accepted && proposal === 'service') {entity.allegiance=actor;entity.access[actor]=now(state)+24;}
      if (accepted && proposal === 'recognition') {entity.recognizedBy=actor;entity.titleRecognizedAt={year:state.year,month:state.month};const village=region.localEntities?.find(site=>site.sponsor===entity.id)?.village;if(village){village.satisfaction=Math.min(100,village.satisfaction+3);village.security=Math.min(100,village.security+2)}}
      if (accepted && proposal === 'pasture') {entity.pastureRights[actor]=now(state)+24;entity.treasury+=6;}
      if (accepted && submission) { entity.controller = actor; entity.militaryOccupier = actor; entity.administrativeStatus = 'occupied'; entity.resistance = 18; }
      entity.lastOutcome.mailId=reportLocalOffer(state,entity,pending,accepted);
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
      entity.tradeRights = {};
      entity.overlord = null;
      entity.allegiance = null;
      entity.siege = null;
      entity.lastOutcome = {actor, proposal: 'siege', accepted: true, year: state.year, month: state.month};
      if(entity.type==='strongman')for(const village of region.localEntities||[])if(village.sponsor===entity.id&&village.controller===entity.id){village.controller=actor;village.lastPatronController=actor;village.militaryOccupier=actor;village.administrativeStatus='occupied';village.village.project=null;village.village.satisfaction=Math.max(0,village.village.satisfaction-10)}
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
  advanceLocalTrade(state);
  return state;
}
