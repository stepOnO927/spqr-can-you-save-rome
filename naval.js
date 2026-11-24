import {GRAND_SITES,GRAND_ROUTES} from './grand-map-data.js?v=2';
import {activeEffects,localBuildingEffects,recordMerchantContact} from './development.js?v=67';
import {officeOf} from './office-system.js';
import {nationalBudget} from './national-budget.js?v=38';

// Sea areas and costs are game-scale approximations of the 49 BCE Mediterranean.
export const SEA_ZONES=[
 {id:'western',name:['Western Mediterranean','西地中海'],point:[2,39],links:['ligurian','african']},
 {id:'ligurian',name:['Ligurian Sea','利古里亚海'],point:[8.5,42.5],links:['western','tyrrhenian']},
 {id:'tyrrhenian',name:['Tyrrhenian Sea','第勒尼安海'],point:[12,40],links:['ligurian','sicilian','central']},
 {id:'sicilian',name:['Sicilian Waters','西西里海域'],point:[15,37.5],links:['tyrrhenian','central','ionian','african']},
 {id:'adriatic',name:['Adriatic Sea','亚得里亚海'],point:[16.8,42.3],links:['ionian']},
 {id:'ionian',name:['Ionian Sea','爱奥尼亚海'],point:[19.2,38],links:['adriatic','sicilian','aegean','central']},
 {id:'aegean',name:['Aegean Sea','爱琴海'],point:[25.5,38.3],links:['ionian','eastern','propontis']},
 {id:'propontis',name:['Sea of Marmara','马尔马拉海'],point:[28.8,40.8],links:['aegean','euxine']},
 {id:'euxine',name:['Black Sea','黑海'],point:[34.5,43.2],links:['propontis']},
 {id:'central',name:['Central Mediterranean','地中海中部'],point:[17.8,35],links:['tyrrhenian','sicilian','ionian','african','eastern']},
 {id:'african',name:['North African Waters','北非沿岸海域'],point:[9.6,35.5],links:['western','sicilian','central']},
 {id:'eastern',name:['Eastern Mediterranean','东地中海'],point:[30,35],links:['aegean','central','alexandrian']},
 {id:'alexandrian',name:['Alexandrian Waters','亚历山大海域'],point:[29.8,32.3],links:['eastern']}
];
export const SHIPS={
 light:{name:['Light warship','轻型战船'],cost:12,months:2,crew:65,power:2,speed:3,upkeep:1,capacity:0,materials:{timber:1}},
 trireme:{name:['Trireme','三列桨战船'],cost:22,months:3,crew:180,power:5,speed:2,upkeep:2,capacity:0,materials:{timber:2,metal:1}},
 quadrireme:{name:['Quadrireme','四列桨战船'],cost:32,months:4,crew:250,power:7,speed:2,upkeep:3,capacity:0,materials:{timber:3,metal:2}},
 quinquereme:{name:['Quinquereme','五列桨战船'],cost:43,months:5,crew:310,power:9,speed:1,upkeep:4,capacity:0,materials:{timber:4,metal:2}},
 // Civilian freight covers merchant crews; the state pays for hull construction and naval escorts.
 merchant:{name:['Merchant vessel','商船'],cost:17,months:3,crew:45,power:0,speed:1,upkeep:0,capacity:4,materials:{timber:2}},
 transport:{name:['Military transport','军用运输船'],cost:20,months:3,crew:70,power:1,speed:1,upkeep:2,capacity:3000,materials:{timber:2}}
};
export const SHIPYARD_MIN_WORKERS=600;
export const shipyardWorkers=port=>Number.isFinite(port?.population)?port.population:1000;
export const NAVAL_JOBS={harbor:{name:['Harbor Administrator','港口行政官'],port:true,building:'port'},engineer:{name:['Naval Engineer','海军工程师'],port:true,building:'shipyard'},trade:{name:['Trade Administrator','贸易行政官'],port:false},supervisor:{name:['Shipyard Supervisor','造船厂监工'],port:true,building:'shipyard'},intelligence:{name:['Maritime Intelligence Officer','海事情报官'],port:false}};
export const NAVAL_TACTICS={formation:{name:['Keep formation','保持阵型'],description:['Balanced maneuver and reduced hull damage.','稳健机动，减少船体损伤。']},ramming:{name:['Ram','冲撞'],description:['Warships strike harder, but take more hull damage.','战船冲击力更强，但自身船体也更易受损。']},boarding:{name:['Board','接舷'],description:['Chance to seize ships or commanders, with greater sailor losses.','可俘获舰船或舰长，但水手伤亡较多。']},missile:{name:['Missile skirmish','远射牵制'],description:['Fewer sailor losses, but weaker attacks and less hull damage dealt.','水手伤亡较少，但攻击较弱、对敌船体伤害较低。']}};
const historicalNavalAptitude={pompey:{commander:60,harbor:40,intelligence:40},mamurra:{engineer:55,supervisor:50},varro:{trade:45},antony:{commander:35}};
function navalSkill(p,kind){p.navalSkills||={};p.navalSkills[kind]??=historicalNavalAptitude[p.id]?.[kind]??20;return p.navalSkills[kind]}
export function activeNavalJob(s,owner,kind,port=null){return s.naval?.jobs?.find(j=>j.owner===owner&&j.kind===kind&&j.port===port&&j.remaining===0&&s.world?.characters?.[j.characterId]?.alive&&s.world.characters[j.characterId].faction===owner)}
export function navalJobEffect(s,owner,kind,port=null){const j=activeNavalJob(s,owner,kind,port),p=j&&s.world.characters[j.characterId];return j&&p?1+Math.floor(navalSkill(p,kind)/40)+Math.floor((j.experience||0)/12):0}
export function appointNavalJob(s,owner,kind,port,characterId){initializeNaval(s);const role=NAVAL_JOBS[kind],r=s.regions.find(x=>x.id===port),p=s.world?.characters?.[characterId];if(!role||!s.factions[owner])return {ok:false,reason:'role'};if(role.port?(!r?.port||r.owner!==owner||!r.buildings?.includes(role.building)):port!=null)return {ok:false,reason:'port'};if(!p?.alive||p.faction!==owner||p.missing||p.travel||p.loyalty<35||officeOf(s,owner,characterId)||s.armies.some(a=>a.characterId===characterId)||s.naval.fleets.some(f=>f.commanderId===characterId||f.pendingCommanderId===characterId)||s.naval.jobs.some(j=>j.characterId===characterId))return {ok:false,reason:'character'};if(s.naval.jobs.some(j=>j.owner===owner&&j.kind===kind&&j.port===(role.port?port:null)))return {ok:false,reason:'occupied'};if(s.factions[owner].treasury<5)return {ok:false,reason:'treasury'};s.factions[owner].treasury-=5;navalSkill(p,kind);const months=role.port&&p.location!==r.macro?2:1;s.naval.jobs.push({owner,kind,port:role.port?port:null,characterId,remaining:months,experience:0});return {ok:true,months,cost:5}}
export function dismissNavalJob(s,owner,kind,port=null){initializeNaval(s);const j=s.naval.jobs.find(x=>x.owner===owner&&x.kind===kind&&x.port===port);if(!j)return {ok:false,reason:'role'};const p=s.world?.characters?.[j.characterId];if(p)p.loyalty=Math.max(0,p.loyalty-2);s.naval.jobs.splice(s.naval.jobs.indexOf(j),1);return {ok:true}}
const byId=Object.fromEntries(SEA_ZONES.map(z=>[z.id,z]));
const site=id=>GRAND_SITES.find(x=>x.id===id);
const rng=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const atWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
const ships=f=>Object.values(f.ships).reduce((n,v)=>n+v,0);
export const fleetCapacity=(f,s)=>(f.ships.transport||0)*(SHIPS.transport.capacity+(s?.development?.[f.owner]?.knownMaterial?.includes('military-transport-organization')?600:0));
export const fleetCargoCapacity=f=>(f.ships.merchant||0)*SHIPS.merchant.capacity;
export const fleetSpeed=f=>Math.max(1,Math.min(...Object.entries(f.ships).filter(([,count])=>count>0).map(([type])=>SHIPS[type]?.speed||1)));
export const fleetUpkeep=f=>Object.entries(f.ships).reduce((n,[id,count])=>n+(SHIPS[id]?.upkeep||0)*count,0);
export const fleetUpkeepDue=f=>(f.reserve&&f.port&&fleetUpkeep(f)>0?Math.max(1,Math.ceil(fleetUpkeep(f)*.15)):fleetUpkeep(f))+(f.commanderId?1:0);
const BLOCKADE_WARSHIPS=['light','trireme','quadrireme','quinquereme'];
const warshipCount=f=>BLOCKADE_WARSHIPS.reduce((n,type)=>n+(f.ships[type]||0),0);
function blockadePower(f){
 const crew=BLOCKADE_WARSHIPS.reduce((n,type)=>n+(f.ships[type]||0)*SHIPS[type].crew,0);
 if(!crew||f.sailors<crew/2||f.hull<20||f.supply<20)return 0;
 const strength=BLOCKADE_WARSHIPS.reduce((n,type)=>n+(f.ships[type]||0)*SHIPS[type].power,0);
 return strength*Math.min(1,f.hull/50,f.sailors/crew);
}
export function portZone(id){const s=site(id);if(!s)return null;if(['italiaS','illyricum','epirus'].includes(id))return 'adriatic';if(id==='egypt')return 'alexandrian';if(id==='sicilia')return 'sicilian';if(id==='t016'||s.macro==='roma')return 'tyrrhenian';if(s.macro==='cisalpine'&&s.lon>11)return 'adriatic';if(s.macro==='italiaN'&&s.lon>11)return 'adriatic';if(s.macro==='africa'||s.macro==='numidia'||s.macro==='mauretania')return 'african';if(['t092','bosporus','t097'].includes(id))return 'euxine';if(s.macro==='achaia'||s.macro==='anatolia')return 'aegean';if(s.macro==='syria')return 'eastern';return SEA_ZONES.reduce((best,z)=>Math.hypot((s.lon-z.point[0])*Math.cos(s.lat*Math.PI/180),s.lat-z.point[1])<Math.hypot((s.lon-best.point[0])*Math.cos(s.lat*Math.PI/180),s.lat-best.point[1])?z:best).id}
// Harbor works can resist a light close blockade, but cannot protect ships
// elsewhere in the same broad sea zone. Only crewed warships on station count.
export function isPortBlockaded(s,portId){
 const port=s.regions.find(r=>r.id===portId);if(!port?.port)return false;
 const defense=localBuildingEffects(port).navalDefense||0;
 const power=(s.naval?.fleets||[]).filter(f=>f.order?.kind==='blockade'&&f.order.targetPort===portId&&f.zone===portZone(portId)&&!f.port&&!f.reserve&&!f.mobilizing&&atWar(s,f.owner,port.owner)).reduce((total,f)=>total+blockadePower(f),0);
 return power>defense;
}
export function seaRoute(from,to){if(!byId[from]||!byId[to])return null;if(from===to)return [];const previous=new Map([[from,null]]),queue=[from];while(queue.length){const id=queue.shift();for(const next of byId[id].links){if(previous.has(next))continue;previous.set(next,id);if(next===to){const path=[];let at=to;while(at!==from){path.unshift(at);at=previous.get(at)}return path}queue.push(next)}}return null}
const makeFleet=(id,name,owner,port,composition,commanderId=null)=>({id,name,owner,port,zone:portZone(port),commanderId,ships:{...composition},sailors:Object.entries(composition).reduce((n,[k,v])=>n+(SHIPS[k]?.crew||0)*v,0),morale:65,experience:18,supply:100,hull:100,tactic:'formation',order:null});
const bosporanStraitFleet=()=>({...makeFleet('bosporan-strait',['Bosporan Strait Fleet','博斯普鲁斯海峡船队'],'bosporus','bosporus',{transport:2}),reserve:true});
const additionalRoutes=[
 ['narbo-wine','narbo','t016','wine',2],['african-oil','africa','t016','oil',2],['eastern-stone','t091','t016','stone',1],['aegean-textiles','egypt','anatolia','textiles',2],['egypt-papyrus','egypt','t016','papyrus',2],['levant-luxury','t114','t016','luxury',1],['western-horses','mauretania','t016','horses',1],['pontic-timber','t092','t016','timber',2],['hispanic-metal','hispaniaN','t016','metal',1]
];
const marketGoods=new Set(['wine','oil','textiles','papyrus','luxury','horses']);
function ensureTrade(s){s.naval.stock||={};s.naval.voyages||=[];s.naval.nextVoyage||=1;if(!Array.isArray(s.naval.disputes))s.naval.disputes=[];s.naval.nextDispute||=1;for(const owner of Object.keys(s.factions)){s.naval.stock[owner]||={wine:0,oil:0,textiles:0,papyrus:0,luxury:0,horses:0}}for(const [id,from,to,good,volume] of additionalRoutes)if(!s.naval.routes.some(r=>r.id===id))s.naval.routes.push({id,from,to,good,volume,last:null});for(const route of s.naval.routes)route.pausedBy=Array.isArray(route.pausedBy)?[...new Set(route.pausedBy.filter(id=>typeof id==='string'&&s.factions[id]))]:[]}
function seedMarketMerchants(s){
 const ports=[...new Set(s.naval.routes.filter(route=>{const from=s.regions.find(r=>r.id===route.from),to=s.regions.find(r=>r.id===route.to);return from&&to&&(from.owner!==to.owner||marketGoods.has(route.good))}).map(route=>route.from))];
 for(const id of ports){
  const port=s.regions.find(r=>r.id===id);
  if(!port?.port||!s.factions[port.owner]||port.owner==='rebels')continue;
  if(s.naval.fleets.some(f=>f.owner===port.owner&&f.port===id&&(f.ships.merchant||0)>0))continue;
  if(s.naval.voyages.some(v=>v.from===id&&v.vesselOwner===port.owner))continue;
  if(s.naval.queues.some(q=>q.port===id&&q.owner===port.owner&&q.type==='merchant'))continue;
  const fleetId=`market-${id}`;
  if(s.naval.fleets.some(f=>f.id===fleetId))continue;
  s.naval.fleets.push(makeFleet(fleetId,[`Merchant ships at ${site(id)?.site[0]||id}`,`${site(id)?.site[1]||id}商船队`],port.owner,id,{merchant:1}));
 }
}
export function toggleTradeRoute(s,actor,id){initializeNaval(s);const route=s.naval?.routes.find(r=>r.id===id),from=route&&s.regions.find(r=>r.id===route.from),to=route&&s.regions.find(r=>r.id===route.to);if(actor!==s.player||!route||!from||!to||from.owner!==actor&&to.owner!==actor)return {ok:false,reason:'route'};const at=route.pausedBy.indexOf(actor);if(at<0)route.pausedBy.push(actor);else route.pausedBy.splice(at,1);return {ok:true,paused:at<0}}
function produceGoods(s){ensureTrade(s);for(const r of s.regions.filter(x=>x.port)){const stock=s.naval.stock[r.owner];if(!stock)continue;const kinds=({narbo:['wine'],africa:['oil'],egypt:['papyrus','textiles'],syria:['luxury'],mauretania:['horses'],achaia:['wine'],anatolia:['textiles']})[r.macro]||[];for(const kind of kinds)stock[kind]=Math.min(30,(stock[kind]||0)+1)}}
function transferGood(s,from,to,good,planned){const origin=s.factions[from],destination=s.factions[to];if(!origin||!destination)return 0;const material=['timber','metal','stone'].includes(good),grain=good==='grain',left=grain?origin.food:material?s.development?.[from]?.materials?.[good]:s.naval.stock[from]?.[good],right=grain?destination.food:material?s.development?.[to]?.materials?.[good]:s.naval.stock[to]?.[good],cap=grain?(destination.foodCapacity??100):material?100:20;if(left==null||right==null)return 0;const amount=Math.max(0,Math.min(planned,left,cap-right));if(amount<=0)return 0;if(grain){origin.food-=amount;destination.food+=amount}else if(material){s.development[from].materials[good]-=amount;s.development[to].materials[good]+=amount}else{s.naval.stock[from][good]-=amount;s.naval.stock[to][good]+=amount}return amount}
function cargoAccount(s,owner,good){if(good==='grain')return {stock:s.factions[owner],key:'food',cap:s.factions[owner].foodCapacity??100};if(['timber','metal','stone'].includes(good))return {stock:s.development?.[owner]?.materials,key:good,cap:100};return {stock:s.naval.stock?.[owner],key:good,cap:20}}
function pirateSeize(s,p,owner,good,planned){const account=cargoAccount(s,owner,good);if(!account.stock)return 0;const amount=Math.max(0,Math.min(planned,account.stock[account.key]||0));account.stock[account.key]-=amount;p.cargo||={};p.cargo[good]=(p.cargo[good]||0)+amount;return amount}
function pirateRecover(s,p,owner){p.cargo||={};for(const [good,held] of Object.entries(p.cargo)){const account=cargoAccount(s,owner,good);if(!account.stock||held<=0)continue;const amount=Math.max(0,Math.min(held,account.cap-(account.stock[account.key]||0),1));if(!amount)continue;p.cargo[good]-=amount;account.stock[account.key]=(account.stock[account.key]||0)+amount;return {good,amount}}return null}
function tradeUnitPrice(s,route,zones,buyer){
 const base=route.good==='grain'?1:route.good==='luxury'?4:route.good==='horses'?3:2;
 const distance=Math.floor(Math.max(0,zones.length-2)/2);
 const stock=route.good==='grain'?s.factions[buyer].food:['stone','timber','metal'].includes(route.good)?s.development?.[buyer]?.materials?.[route.good]:null;
 const market=s.regions.find(r=>r.id===route.to);
 const scarce=marketGoods.has(route.good)?(market?.civicSatisfaction??market?.loyalty??70)<50?1:0:stock!=null&&stock<(route.good==='grain'?25:4)?1:0;
 return base+distance+scarce;
}
function tradeAccountMove(s,owner,good,amount,into){
 const account=cargoAccount(s,owner,good);if(!account.stock)return 0;
 const held=account.stock[account.key]||0,actual=Math.max(0,Math.min(amount,into?account.cap-held:held));
 account.stock[account.key]=held+(into?actual:-actual);return actual;
}
function tradeRecord(s,route,buyer,seller,reason,security,price,extra={}){
 if(route.last?.year===s.year&&route.last?.month===s.month&&route.last.reason==='delivered'&&reason!=='delivered')return;
 if(route.last?.year===s.year&&route.last?.month===s.month&&route.last.reason==='delivered'&&reason==='delivered'){
  route.last.amount+=extra.amount||0;route.last.paid+=extra.paid||0;
  route.last.marketBenefit=(route.last.marketBenefit||0)+(extra.marketBenefit||0);return;
 }
 route.last={year:s.year,month:s.month,buyer,seller,reason,security,unitPrice:price,amount:0,paid:0,captured:0,...extra};
}
function openMerchantDispute(s,v,reason){
 if(v.buyer===v.seller||!v.cargo||!Number.isFinite(v.price)||v.price<=0)return null;
 const compensation=Math.max(1,Math.ceil(v.cargo*v.price/4));
 const dispute={id:`merchant-dispute-${s.naval.nextDispute++}`,voyageId:v.id,routeId:v.routeId,buyer:v.buyer,seller:v.seller,from:v.from,to:v.to,good:v.good,cargo:v.cargo,price:v.price,compensation,reason,year:s.year,month:s.month,status:'open'};
 s.naval.disputes.push(dispute);
 const key=[v.buyer,v.seller].sort().join(':');
 const before=s.relations[key]??0;s.relations[key]=Math.max(-100,before-3);dispute.relationLoss=before-s.relations[key];
 report(s,{kind:'merchant-dispute',owner:v.buyer,seller:v.seller,from:v.from,to:v.to,good:v.good,cargo:v.cargo,compensation,reason,disputeId:dispute.id});
 return dispute;
}
export function settleMerchantDispute(s,actor,id){
 initializeNaval(s);
 const dispute=s.naval?.disputes?.find(d=>d.id===id);
 if(!dispute||dispute.buyer!==actor||dispute.status!=='open')return {ok:false,reason:'dispute'};
 const buyer=s.factions[actor],seller=s.factions[dispute.seller];
 if(!buyer||!seller||atWar(s,actor,dispute.seller))return {ok:false,reason:'diplomacy'};
 if(buyer.treasury<dispute.compensation)return {ok:false,reason:'treasury'};
 buyer.treasury-=dispute.compensation;seller.treasury+=dispute.compensation;
 const key=[actor,dispute.seller].sort().join(':');
 s.relations[key]=Math.min(100,(s.relations[key]??0)+(dispute.relationLoss??3));
 dispute.status='settled';dispute.settledYear=s.year;dispute.settledMonth=s.month;
 report(s,{kind:'merchant-dispute-settled',owner:actor,seller:dispute.seller,from:dispute.from,to:dispute.to,good:dispute.good,compensation:dispute.compensation,disputeId:id});
 return {ok:true,paid:dispute.compensation};
}
function tradeGrainNeed(s,buyer,good,seller){
 if(good!=='grain')return Infinity;
 if(buyer===seller)return 0;
 const budget=nationalBudget(s,buyer);
 return Math.max(0,Math.ceil(Math.max(18,12+3*Math.max(0,-budget.foodNet))-s.factions[buyer].food));
}
function tradeNeed(s,route,buyer,seller){
 if(marketGoods.has(route.good)){
  const city=s.regions.find(r=>r.id===route.to);
  return city?.owner===buyer?Math.max(0,80-(city.civicSatisfaction??city.loyalty??70)):0;
 }
 if(buyer===seller&&['timber','metal','stone'].includes(route.good))return 0;
 return tradeGrainNeed(s,buyer,route.good,seller);
}
function tradeCashFloor(s,buyer,good){
 if(marketGoods.has(good)&&s.wars.some(w=>w.includes(buyer))){
  const budget=nationalBudget(s,buyer);
  return Math.max(30,24+3*Math.max(0,-budget.projectedNet));
 }
 if(good!=='grain')return 0;
 const budget=nationalBudget(s,buyer),holdings=s.regions.filter(r=>r.owner===buyer).length;
 const outnumbered=s.wars.some(w=>w.includes(buyer)&&s.regions.filter(r=>r.owner===w.find(id=>id!==buyer)).length>holdings*1.5);
 return outnumbered&&s.factions[buyer].food>=6+3*Math.max(0,-budget.foodNet)?24:0;
}
function tradeExposure(s,route,zone,buyer,seller){
 const pirates=s.naval.pirates.filter(p=>p.zone===zone&&p.ships>0),piracy=Math.max(0,...pirates.map(p=>p.pressure));
 // Only operational warships at sea can protect or seize a merchant vessel.
 // A saved order must not give a bonus after its crew or hull is lost.
 const operational=f=>f.zone===zone&&!f.port&&!f.reserve&&!f.mobilizing&&blockadePower(f)>0;
 const escorts=s.naval.fleets.filter(f=>operational(f)&&['patrol','escort'].includes(f.order?.kind)&&!atWar(s,f.owner,buyer)&&!atWar(s,f.owner,seller));
 const raiders=s.naval.fleets.filter(f=>operational(f)&&f.order?.kind==='raid'&&f.order.target===route.id&&f.owner!==buyer&&f.owner!==seller&&hostileTradeRoute(s,f.owner,route));
 const security=Math.max(0,Math.min(100,100-piracy+escorts.length*16-raiders.length*28+(activeEffects(s,buyer).navalSecurity||0)+navalJobEffect(s,buyer,'harbor',route.to)*4-(atWar(s,buyer,seller)?35:0)));
 return {security,piracy,pirates,raiders};
}
function navigationTroubleRisk(s,v){
 const elapsed=(s.year-(s.startYear??-49))*12+s.month-(s.startMonth??1);
 if(elapsed<12||v.navigationDelayed)return 0;
 const winter=[12,1,2].includes(s.month),administrator=navalJobEffect(s,v.vesselOwner,'trade');
 return Math.max(.005,(winter?.06:.02)-administrator*.005);
}
function tradeHome(s,v){
 return s.regions.find(r=>r.id===v.from&&r.owner===v.vesselOwner)||s.regions.filter(r=>r.owner===v.vesselOwner&&r.port).map(r=>({r,path:seaRoute(v.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length)[0]?.r||null;
}
function tradeCargoHome(s,v){
 return s.regions.find(r=>r.id===v.from&&r.owner===v.seller)||s.regions.filter(r=>r.owner===v.seller&&r.port).map(r=>({r,path:seaRoute(v.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length)[0]?.r||null;
}
function sendTradeHome(s,v){
 v.phase='return';const home=v.cargo?tradeCargoHome(s,v):tradeHome(s,v);v.returnPort=home?.id||null;v.path=home?seaRoute(v.zone,portZone(home.id))||[]:[];
}
function finishTradeHome(s,v){
 const landing=v.cargo?tradeCargoHome(s,v):tradeHome(s,v);
 if(!landing){v.returnPort=null;return}
 if(v.zone!==portZone(landing.id)){v.returnPort=landing.id;v.path=seaRoute(v.zone,portZone(landing.id))||[];return}
 v.returnPort=landing.id;
 if(v.cargo){v.cargo-=tradeAccountMove(s,v.seller,v.good,v.cargo,true);if(v.cargo)return}
 if(v.vesselOwner!==v.seller){const vesselHome=tradeHome(s,v);if(vesselHome&&v.zone!==portZone(vesselHome.id)){sendTradeHome(s,v);return}}
 const n=s.naval,home=n.fleets.find(f=>f.id===v.fleetId&&f.owner===v.vesselOwner&&f.zone===v.zone)||n.fleets.find(f=>f.owner===v.vesselOwner&&f.zone===v.zone&&f.port===v.returnPort&&!f.reserve);
 if(home){home.ships.merchant=(home.ships.merchant||0)+1;home.sailors+=v.crew}
 else{const port=v.returnPort&&s.regions.find(r=>r.id===v.returnPort)?.owner===v.vesselOwner?v.returnPort:null,f=makeFleet(`fleet-${n.nextFleet++}`,[`Merchant at ${site(port)?.site[0]||v.zone}`,`${site(port)?.site[1]||v.zone}商船`],v.vesselOwner,port,{merchant:1});f.zone=v.zone;f.sailors=v.crew;n.fleets.push(f)}
 n.voyages.splice(n.voyages.indexOf(v),1);
}
export function harborTradeCapacity(s,port){
 return 2+(port.buildings?.includes('warehouse')?1:0)+(port.buildings?.includes('dockyard')?1:0)+(navalJobEffect(s,port.owner,'harbor',port.id)>0?1:0);
}
function reportInterruptedGrainShortages(s,log){
 const byBuyer=new Map();
 for(const v of s.naval.voyages){
  // Trade arrives after the month's food calculation. Once the delayed ship
  // has one leg left, an undelayed ship would already have delivered. This
  // also applies when that final leg starts in a different sea zone.
  const navigationWaiting=Number.isFinite(v.navigationDelayYear)&&Number.isFinite(v.navigationDelayMonth)&&v.navigationDelayYear*12+v.navigationDelayMonth<s.year*12+s.month&&v.path.length===1;
  if(v.good!=='grain'||v.phase!=='outbound'||v.shortageReported||v.cargo<=0||!Number.isFinite(v.price)||v.price<=0||!(v.blockedMonths>0||v.congestedMonths>0||navigationWaiting)||v.path.length&&!navigationWaiting)continue;
  const buyer=s.factions[v.buyer],from=s.regions.find(r=>r.id===v.from),to=s.regions.find(r=>r.id===v.to);
  const shortage=buyer?.lastFoodShortage;
  if(!shortage||shortage.year!==s.year||shortage.month!==s.month||!Number.isFinite(shortage.deficit)||shortage.deficit<=0||from?.owner!==v.seller||to?.owner!==v.buyer||atWar(s,v.buyer,v.seller))continue;
  const route=s.naval.routes.find(r=>r.id===v.routeId),relations=s.relations?.[[v.buyer,v.seller].sort().join(':')]??0;
  if(!route||route.from!==v.from||route.to!==v.to||route.good!==v.good||relations<=-40||route.pausedBy?.includes(v.buyer)||route.pausedBy?.includes(v.seller))continue;
  const need=tradeNeed(s,route,v.buyer,v.seller);
  if(need<=0)continue;
  if(!byBuyer.has(v.buyer))byBuyer.set(v.buyer,[]);
  byBuyer.get(v.buyer).push(v);
 }
 for(const [owner,voyages] of byBuyer){
  const buyer=s.factions[owner],deficit=buyer.lastFoodShortage.deficit;
  // A common food demand and cash pool must not be counted once per ship.
  // Cheapest-first asks whether a legal order of the already waiting cargo
  // could avert the recorded deficit; it does not change actual deliveries.
  let demand=tradeGrainNeed(s,owner,'grain',voyages[0].seller);
  let cash=Math.max(0,buyer.treasury-tradeCashFloor(s,owner,'grain'));
  let possible=0;const contributing=[];
  for(const v of voyages.sort((a,b)=>a.price-b.price||String(a.id).localeCompare(String(b.id)))){
   const amount=Math.min(v.cargo,demand,Math.floor(cash/v.price),deficit-possible);
   if(amount<=0)continue;
   contributing.push(v);possible+=amount;demand-=amount;cash-=amount*v.price;
   if(possible>=deficit)break;
  }
  if(possible<deficit)continue;
  for(const v of contributing)v.shortageReported=true;
  const ports=[...new Set(contributing.map(v=>v.to))],causes=[...new Set(contributing.map(v=>v.blockedMonths>0?'blockade':v.congestedMonths>0?'congestion':'navigation'))];
  report(s,{kind:'interrupted-grain-shortage',owner,port:ports[0],ports,zone:contributing[0].zone,deficit,cargo:contributing.reduce((sum,v)=>sum+v.cargo,0),shipments:contributing.length,cause:causes.length===1?causes[0]:'mixed',...(causes.length>1?{causes}:{})});
  if(owner===s.player)log(s,contributing.length===1?'Delayed imported grain could have covered this month’s food deficit; the usual shortage rules were applied.':'Delayed imported grain shipments could jointly have covered this month’s food deficit; the usual shortage rules were applied.',contributing.length===1?'延误的进口粮食原本足以填补本月粮食缺口；本月已按常规粮荒规则结算。':'多笔延误的进口粮食合计原本足以填补本月粮食缺口；本月已按常规粮荒规则结算。');
 }
}
function advanceTradeVoyages(s,log){
 const n=s.naval,unloaded=new Map();
 // Voyages already delayed at the quay get the first available berth.
 const voyages=[...n.voyages].sort((a,b)=>(b.congestedMonths||0)-(a.congestedMonths||0));
 for(const v of voyages){
  const route=n.routes.find(r=>r.id===v.routeId),owner=s.factions[v.vesselOwner];
  if(!owner){n.voyages.splice(n.voyages.indexOf(v),1);continue}
  owner.treasury=Math.max(-100,owner.treasury-SHIPS.merchant.upkeep);
  const sailed=v.path.length>0;
  if(sailed)v.zone=v.path.shift();
  if(v.phase==='return'){if(!v.path.length)finishTradeHome(s,v);continue}
  if(!route){sendTradeHome(s,v);continue}
  const {security,piracy,pirates,raiders}=tradeExposure(s,route,v.zone,v.buyer,v.seller);
  if(raiders.length&&security<75){
   const raider=raiders[0],captured=tradeAccountMove(s,raider.owner,v.good,Math.min(v.cargo,Math.max(1,Math.floor(combatPower(s,raider)/3))),true);v.cargo-=captured;raider.supply=Math.max(0,raider.supply-3);
   report(s,{kind:'trade-raid',zone:v.zone,owner:v.buyer,raider:raider.owner,good:v.good,captured});
   if(captured&&!atWar(s,raider.owner,v.seller)){const key=[raider.owner,v.seller].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]??0)-6);report(s,{kind:'trade-incident',zone:v.zone,owner:v.seller,raider:raider.owner,good:v.good,captured})}
   tradeRecord(s,route,v.buyer,v.seller,'raid',security,v.price,{captured,zone:v.zone});sendTradeHome(s,v);
   if([v.buyer,v.seller,raider.owner].includes(s.player))log(s,'A hostile fleet seized cargo from a maritime shipment.','敌方舰队夺走海上货运的货物。');continue;
  }
  if(piracy>0&&security<50&&rng(s)>=security/50){
   const pirate=pirates[0];let captured=0;
   if(pirate&&rng(s)<piracy/100){captured=Math.min(v.cargo,route.volume);v.cargo-=captured;pirate.cargo||={};pirate.cargo[v.good]=(pirate.cargo[v.good]||0)+captured;pirate.wealth+=captured;pirate.pressure=Math.min(70,pirate.pressure+2);report(s,{kind:'pirate-raid',zone:v.zone,owner:v.vesselOwner,good:v.good,captured})}
   tradeRecord(s,route,v.buyer,v.seller,'piracy',security,v.price,{captured,zone:v.zone});sendTradeHome(s,v);
   if(v.vesselOwner===s.player)log(s,'Pirates struck a merchant vessel and seized cargo.','海盗袭击商船并夺走货物。');continue;
  }
  const navigationRisk=sailed?navigationTroubleRisk(s,v):0;
  if(navigationRisk>0&&rng(s)<navigationRisk){
   // Revisit this sea zone next month. Cargo and the merchant remain at sea;
   // the extra leg is part of the saved route and cannot be rolled twice.
   v.navigationDelayed=true;v.navigationDelayYear=s.year;v.navigationDelayMonth=s.month;v.path.unshift(v.zone);
   tradeRecord(s,route,v.buyer,v.seller,'navigation',security,v.price,{cargo:v.cargo,zone:v.zone,eta:v.path.length});
   report(s,{kind:'navigation-delay',zone:v.zone,owner:v.buyer,seller:v.seller,vesselOwner:v.vesselOwner,from:v.from,to:v.to,good:v.good,amount:v.cargo,delay:1});
   if([v.buyer,v.seller,v.vesselOwner].includes(s.player))log(s,'Navigation trouble delayed a merchant vessel; its cargo remains aboard and payment awaits arrival.','航行问题耽误了一艘商船；货物仍在船上，付款要等到抵港。');
   continue;
  }
  if(v.path.length){tradeRecord(s,route,v.buyer,v.seller,'enroute',security,v.price,{cargo:v.cargo,zone:v.zone,eta:v.path.length});continue}
  const from=s.regions.find(r=>r.id===v.from),to=s.regions.find(r=>r.id===v.to),relations=s.relations?.[[v.buyer,v.seller].sort().join(':')]??0;
  const open=from?.owner===v.seller&&to?.owner===v.buyer&&!atWar(s,v.buyer,v.seller)&&relations>-40&&!route.pausedBy?.includes(v.buyer)&&!route.pausedBy?.includes(v.seller);
  if(!open){tradeRecord(s,route,v.buyer,v.seller,'closed',security,v.price,{cargo:v.cargo,zone:v.zone});sendTradeHome(s,v);continue}
  if(isPortBlockaded(s,v.to)){
   v.blockedMonths=(v.blockedMonths||0)+1;
   tradeRecord(s,route,v.buyer,v.seller,'blockade',0,v.price,{cargo:v.cargo,zone:v.zone});
   if(v.blockedMonths>=2){sendTradeHome(s,v);if([v.buyer,v.seller,v.vesselOwner].includes(s.player))log(s,'A sustained blockade turned a merchant shipment back without delivery or payment.','持续封锁迫使商船返航，货物未交付，也未付款。')}
   continue;
  }
  v.blockedMonths=0;
  const used=unloaded.get(v.to)||0;
  if(used>=harborTradeCapacity(s,to)){
   v.congestedMonths=Math.max(0,v.congestedMonths||0)+1;
   tradeRecord(s,route,v.buyer,v.seller,'congestion',security,v.price,{cargo:v.cargo,zone:v.zone,waitingMonths:v.congestedMonths});
   if(v.congestedMonths===1){report(s,{kind:'harbor-congestion',owner:v.buyer,seller:v.seller,port:v.to,zone:v.zone,good:v.good,amount:v.cargo});if([v.buyer,v.seller,v.vesselOwner].includes(s.player))log(s,'Merchant cargo is waiting for a free berth; delivery and payment are delayed.','商货正在等待空闲泊位，交付与付款因此延后。')}
   continue;
  }
  unloaded.set(v.to,used+1);v.congestedMonths=0;
  const floor=tradeCashFloor(s,v.buyer,v.good),affordable=v.buyer===v.seller?v.cargo:Math.floor(Math.max(0,s.factions[v.buyer].treasury-floor)/v.price);
  const need=tradeNeed(s,route,v.buyer,v.seller),wanted=open?Math.min(v.cargo,affordable,need):0;
  const amount=marketGoods.has(v.good)?wanted:tradeAccountMove(s,v.buyer,v.good,wanted,true),paid=v.buyer===v.seller?0:amount*v.price;v.cargo-=amount;s.factions[v.buyer].treasury-=paid;s.factions[v.seller].treasury+=paid;
  if(amount&&marketGoods.has(v.good))to.civicSatisfaction=Math.min(80,(to.civicSatisfaction??to.loyalty??70)+amount);
  const reason=amount?'delivered':!open?'closed':!need?'stocked':affordable<1?(floor?'war-reserve':'payment'):'capacity';tradeRecord(s,route,v.buyer,v.seller,reason,security,v.price,{amount,paid,marketBenefit:marketGoods.has(v.good)?amount:0,zone:v.zone});
  if(['payment','war-reserve'].includes(reason)&&v.buyer!==v.seller){openMerchantDispute(s,v,reason);if([v.buyer,v.seller].includes(s.player))log(s,'A merchant shipment reached port but the buyer did not pay; the cargo is returning and a freight claim is open.','商船抵港后买方未付款；货物正在返航，运费索赔已登记。')}
  if(amount){const lead=recordMerchantContact(s,route);if(lead){report(s,{kind:'merchant-expedition',owner:lead.buyer,seller:lead.seller,from:v.from,to:v.to,good:v.good,amount,paid,leadId:lead.id,leadBranch:lead.branch,leadName:lead.name,expiresTurn:lead.expiresTurn});if(lead.buyer===s.player)log(s,`Merchant contact brought a research lead on ${lead.name[0]}. It expires in six months; research is still required.`,`商贸往来带来了${lead.name[1]}的研究线索。线索六个月后失效，仍须投入研究。`)}}
  sendTradeHome(s,v);
 }
}
function dispatchTradeVoyage(s,route,log){
 const n=s.naval,from=s.regions.find(r=>r.id===route.from),to=s.regions.find(r=>r.id===route.to);if(!from||!to)return;
 if(n.voyages.some(v=>v.routeId===route.id&&v.phase==='outbound'&&!v.path.length&&v.congestedMonths>0))return;
 if(route.lastDispatch?.year===s.year&&route.lastDispatch?.month===s.month||route.last?.year===s.year&&route.last?.month===s.month&&['raid','piracy','closed'].includes(route.last.reason))return;
 const zones=routeZones(route),originZone=zones[0],vessel=n.fleets.find(f=>(f.owner===from.owner||f.owner===to.owner)&&(f.ships.merchant||0)>0&&f.sailors>=SHIPS.merchant.crew&&f.zone===originZone&&(!f.port||f.port===route.from)&&!f.reserve&&!f.mobilizing&&!f.order?.cargo&&f.hull>20);
 if(!vessel&&n.voyages.some(v=>v.routeId===route.id&&v.phase==='outbound'))return;
 if(!vessel&&route.last?.year===s.year&&route.last?.month===s.month&&route.last.reason==='delivered')return;
 const price=tradeUnitPrice(s,route,zones,to.owner),{security,piracy,pirates,raiders}=tradeExposure(s,route,originZone,to.owner,from.owner);
 const block=isPortBlockaded(s,route.from)||isPortBlockaded(s,route.to);
 const relations=s.relations?.[[from.owner,to.owner].sort().join(':')]??0,need=tradeNeed(s,route,to.owner,from.owner),floor=tradeCashFloor(s,to.owner,route.good);
 const reason=route.pausedBy?.includes(from.owner)||route.pausedBy?.includes(to.owner)?'paused':block?'blockade':atWar(s,from.owner,to.owner)?'war':from.owner!==to.owner&&relations<=-40?'diplomacy':!need?'stocked':!vessel?'merchant':null;
 if(reason){tradeRecord(s,route,to.owner,from.owner,reason,block?0:security,price);return}
 const planned=Math.min(route.volume+(activeEffects(s,to.owner).navalTrade||0)+(s.development?.[to.owner]?.knownMaterial?.includes('maritime-warehousing')?1:0)+navalJobEffect(s,to.owner,'trade')+(to.buildings?.includes('warehouse')?1:0),SHIPS.merchant.capacity,need);
 const affordable=from.owner===to.owner?planned:Math.floor(Math.max(0,s.factions[to.owner].treasury-floor)/price),account=cargoAccount(s,from.owner,route.good);
 if(affordable<1){tradeRecord(s,route,to.owner,from.owner,floor?'war-reserve':'payment',security,price);return}
 if(!account.stock||!(account.stock[account.key]>0)){tradeRecord(s,route,to.owner,from.owner,'capacity',security,price);return}
 if(raiders.length&&security<75){const raider=raiders[0],captured=transferGood(s,from.owner,raider.owner,route.good,Math.min(planned,affordable,Math.max(1,Math.floor(combatPower(s,raider)/3))));raider.supply=Math.max(0,raider.supply-3);report(s,{kind:'trade-raid',zone:originZone,owner:to.owner,raider:raider.owner,good:route.good,captured});if(captured&&!atWar(s,raider.owner,from.owner)){const key=[raider.owner,from.owner].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]??0)-6);report(s,{kind:'trade-incident',zone:originZone,owner:from.owner,raider:raider.owner,good:route.good,captured})}tradeRecord(s,route,to.owner,from.owner,'raid',security,price,{captured,zone:originZone});if([to.owner,from.owner,raider.owner].includes(s.player))log(s,'A hostile fleet seized cargo from a maritime shipment.','敌方舰队夺走海上货运的货物。');return}
 if(piracy>0&&security<50&&rng(s)>=security/50){const pirate=pirates[0];let captured=0;if(pirate&&rng(s)<piracy/100){captured=pirateSeize(s,pirate,from.owner,route.good,Math.min(planned,affordable));pirate.wealth+=captured;pirate.pressure=Math.min(70,pirate.pressure+2);report(s,{kind:'pirate-raid',zone:originZone,owner:vessel.owner,good:route.good,captured})}tradeRecord(s,route,to.owner,from.owner,'piracy',security,price,{captured,zone:originZone});if(vessel.owner===s.player)log(s,'Pirates struck a merchant vessel and seized cargo.','海盗袭击商船并夺走货物。');return}
 const cargo=tradeAccountMove(s,from.owner,route.good,Math.min(planned,affordable),false);if(!cargo){tradeRecord(s,route,to.owner,from.owner,'capacity',security,price);return}
 vessel.ships.merchant--;vessel.sailors=Math.max(0,vessel.sailors-SHIPS.merchant.crew);const path=seaRoute(originZone,portZone(route.to))||[];
 n.voyages.push({id:`voyage-${n.nextVoyage++}`,routeId:route.id,from:route.from,to:route.to,seller:from.owner,buyer:to.owner,good:route.good,cargo,price,vesselOwner:vessel.owner,fleetId:vessel.id,crew:SHIPS.merchant.crew,zone:originZone,path,phase:'outbound'});
 route.lastDispatch={year:s.year,month:s.month};
 tradeRecord(s,route,to.owner,from.owner,'enroute',security,price,{cargo,zone:originZone,eta:Math.max(1,path.length)});
}
function detachReservedMerchants(s,f){
 const count=f.ships.merchant||0,dock=f.port&&s.regions.find(r=>r.id===f.port);
 if(!f.reserve||!count||!fleetUpkeep(f)||!dock||dock.owner!==f.owner||f.order)return null;
 const required=count*SHIPS.merchant.crew+Object.entries(f.ships).reduce((sum,[kind,ships])=>sum+(kind==='merchant'?0:(SHIPS[kind]?.crew||0)*ships),0);
 const crew=Math.min(f.sailors||0,Math.round((f.sailors||0)*count*SHIPS.merchant.crew/Math.max(1,required)));
 let id;do{id=`fleet-${s.naval.nextFleet++}`}while(s.naval.fleets.some(other=>other.id===id));
 const detachment=makeFleet(id,[`Merchant vessels at ${site(f.port)?.site[0]||f.port}`,`${site(f.port)?.site[1]||f.port}商船队`],f.owner,f.port,{merchant:count});
 detachment.sailors=crew;detachment.hull=f.hull;detachment.supply=f.supply;detachment.morale=f.morale;detachment.experience=f.experience;
 f.ships.merchant=0;f.sailors=(f.sailors||0)-crew;s.naval.fleets.push(detachment);
 return detachment;
}
function migratePonticFleetZones(s){
 for(const f of s.naval.fleets){
  if(!f.port||!['t092','bosporus','t097'].includes(f.port)||f.zone!=='aegean')continue;
  f.zone='euxine';
  if(f.order?.targetPort)f.order.path=seaRoute(f.zone,portZone(f.order.targetPort))||[];
 }
}
export function initializeNaval(s){if(!s.grandMap)return s;if(s.naval){const oldVersion=s.naval.version||2;s.naval.intel||={};s.naval.reports||=[];normalizeNavalReportIds(s.naval);s.naval.queues||=[];s.naval.jobs||=[];s.naval.captives||=[];s.naval.provisions||={};s.naval.inlandProvisions||={};s.naval.wagons||=[];for(const p of s.naval.pirates||[])p.cargo||={};ensureTrade(s);s.naval.nextFleet||=1;if(oldVersion<3)seedMarketMerchants(s);if(oldVersion<5&&['bosporus','t097'].every(id=>s.regions.some(r=>r.id===id&&r.owner==='bosporus'))&&s.naval.fleets.filter(f=>f.owner==='bosporus').reduce((total,f)=>total+(f.ships.transport||0),0)<2)s.naval.fleets.push(bosporanStraitFleet());for(const f of [...s.naval.fleets])detachReservedMerchants(s,f);if(oldVersion<6)migratePonticFleetZones(s);s.naval.version=6;return s}const senatePort=s.regions.find(r=>r.id==='italiaS'&&r.owner==='senate')?'italiaS':'epirus',caesarPort=s.regions.find(r=>r.id==='cisalpine'&&r.owner==='caesar')?'cisalpine':'narbo';s.naval={version:6,fleets:[makeFleet('senate-adriatic',['Adriatic Squadron','亚得里亚分舰队'],'senate',senatePort,{trireme:2,transport:2}),makeFleet('caesar-adriatic',['Caesarian Coastal Fleet','凯撒沿岸舰队'],'caesar',caesarPort,{trireme:2,light:2,transport:2}),makeFleet('egypt-grain',['Alexandrian Grain Fleet','亚历山大运粮船队'],'egypt','egypt',{trireme:1,merchant:3}),{...makeFleet('bosporan-strait',['Bosporan Strait Fleet','博斯普鲁斯海峡船队'],'bosporus','bosporus',{transport:2}),reserve:true}],pirates:[{id:'illyrian-raiders',zone:'adriatic',ships:2,pressure:24,wealth:8,backer:null,cargo:{}},{id:'cilician-raiders',zone:'eastern',ships:2,pressure:20,wealth:7,backer:null,cargo:{}}],routes:[{id:'egypt-italy',from:'egypt',to:'t016',good:'grain',volume:4,last:null},{id:'africa-sicily',from:'africa',to:'sicilia',good:'grain',volume:2,last:null},{id:'adriatic-commerce',from:'illyricum',to:'italiaS',good:'timber',volume:2,last:null}],queues:[],reports:[],intel:{},jobs:[],captives:[],provisions:{},inlandProvisions:{},wagons:[],nextFleet:1,nextReport:1};for(const id of [senatePort,caesarPort]){const r=s.regions.find(x=>x.id===id);if(!r)continue;r.buildings||=[];for(const b of ['port','shipyard'])if(!r.buildings.includes(b))r.buildings.push(b);const d=s.development?.[r.owner];if(d)for(const tech of ['port-facilities','shipyard-craft'])if(!d.knownMaterial.includes(tech))d.knownMaterial.push(tech)}ensureTrade(s);seedMarketMerchants(s);return s}
export function fleet(s,id){return s.naval?.fleets.find(f=>f.id===id)}
export function setFleetTactic(s,owner,id,tactic){initializeNaval(s);const f=fleet(s,id),month=s.year*12+s.month;if(!f||f.owner!==owner||!NAVAL_TACTICS[tactic]||f.reserve||f.mobilizing||f.order?.armyId||f.lastTacticChange===month)return {ok:false,reason:'tactic'};if((f.tactic||'formation')===tactic)return {ok:false,reason:'unchanged'};f.tactic=tactic;f.lastTacticChange=month;return {ok:true}}
export function ransomFleetCommander(s,owner,characterId){initializeNaval(s);const captive=s.naval?.captives?.find(c=>c.characterId===characterId&&c.owner===owner&&c.status==='held'),payer=s.factions[owner],holder=captive&&s.factions[captive.holder];if(!captive||!payer||!holder)return {ok:false,reason:'captive'};if(payer.treasury<18)return {ok:false,reason:'treasury'};payer.treasury-=18;holder.treasury+=18;captive.status='returning';captive.remaining=2;return {ok:true,months:2,cost:18}}
export function reserveFleet(s,owner,id){initializeNaval(s);const f=fleet(s,id),dock=s.regions.find(r=>r.id===f?.port);if(!f||f.owner!==owner||!dock||dock.owner!==owner||f.order||f.reserve||f.mobilizing)return {ok:false,reason:'fleet'};const prior=fleetUpkeepDue(f);f.reserve=true;f.morale=Math.max(10,f.morale-5);const detached=detachReservedMerchants(s,f);return {ok:true,saving:prior-fleetUpkeepDue(f),detached:detached?.id}}
export function mobilizeFleet(s,owner,id){initializeNaval(s);const f=fleet(s,id),dock=s.regions.find(r=>r.id===f?.port),budget=s.factions[owner];if(!f||f.owner!==owner||!f.reserve||f.mobilizing||!dock||dock.owner!==owner)return {ok:false,reason:'fleet'};if(budget.treasury<6||budget.food<2)return {ok:false,reason:'resources'};budget.treasury-=6;budget.food-=2;f.mobilizing=2;return {ok:true,months:2,cost:6}}
export function accessibleFleet(s,owner,port,men){initializeNaval(s);return s.naval.fleets.find(f=>f.owner===owner&&f.port===port&&!f.reserve&&!f.mobilizing&&!f.order?.armyId&&fleetCapacity(f,s)>=men&&f.hull>=40&&f.supply>=20)}
export function queueShip(s,owner,port,type){initializeNaval(s);const r=s.regions.find(x=>x.id===port),ship=SHIPS[type],d=s.development?.[owner],f=s.factions[owner];if(!r?.port||r.owner!==owner||!r.buildings?.includes('shipyard')||!d?.knownMaterial?.includes('shipyard-craft'))return {ok:false,reason:'shipyard'};if(!ship||['quadrireme','quinquereme'].includes(type)&&!d.knownMaterial.includes('naval-equipment'))return {ok:false,reason:'technology'};if(s.naval.queues.some(q=>q.port===port)||s.naval.queues.filter(q=>q.owner===owner).length>=3)return {ok:false,reason:'capacity'};if(shipyardWorkers(r)<SHIPYARD_MIN_WORKERS)return {ok:false,reason:'workers'};if(f.treasury<ship.cost||f.manpower<ship.crew)return {ok:false,reason:'resources'};if(Object.entries(ship.materials).some(([k,v])=>(d.materials[k]||0)<v))return {ok:false,reason:'materials'};f.treasury-=ship.cost;f.manpower-=ship.crew;for(const [k,v] of Object.entries(ship.materials))d.materials[k]-=v;const months=Math.max(1,ship.months-(d.knownMaterial.includes('improved-shipbuilding')?1:0)-navalJobEffect(s,owner,'supervisor',port));s.naval.queues.push({owner,port,type,remaining:months,stalledReason:null});return {ok:true,months}}
export function cancelShipConstruction(s,owner,port){initializeNaval(s);const q=s.naval.queues.find(q=>q.owner===owner&&q.port===port),f=s.factions[owner];if(!q||!f)return {ok:false,reason:'queue'};s.naval.queues.splice(s.naval.queues.indexOf(q),1);const crew=SHIPS[q.type]?.crew||0;f.manpower+=crew;return {ok:true,crewReturned:crew}}
export function appointFleet(s,owner,id,characterId){const f=fleet(s,id),person=s.world?.characters?.[characterId];if(!f||f.owner!==owner||f.commanderId||f.pendingCommanderId||!person?.alive||person.faction!==owner||person.missing||person.travel||person.loyalty<35||officeOf(s,owner,characterId)||s.armies.some(a=>a.characterId===characterId))return {ok:false,reason:'character'};if(s.naval.fleets.some(x=>x.id!==id&&(x.commanderId===characterId||x.pendingCommanderId===characterId))||s.naval.jobs.some(j=>j.characterId===characterId))return {ok:false,reason:'assigned'};if(s.factions[owner].treasury<5)return {ok:false,reason:'treasury'};s.factions[owner].treasury-=5;navalSkill(person,'commander');f.pendingCommanderId=characterId;f.pendingMonths=person.location===s.regions.find(r=>r.id===f.port)?.macro?1:2;return {ok:true,months:f.pendingMonths,cost:5}}
export function dismissFleetCommander(s,owner,id){const f=fleet(s,id);if(!f||f.owner!==owner||!(f.commanderId||f.pendingCommanderId))return {ok:false,reason:'commander'};const person=s.world?.characters?.[f.commanderId||f.pendingCommanderId];if(person)person.loyalty=Math.max(0,person.loyalty-2);f.commanderId=null;f.pendingCommanderId=null;f.pendingMonths=0;return {ok:true}}
export function orderFleet(s,owner,id,kind,target){
 const f=fleet(s,id);
 if(!f||f.owner!==owner||f.order?.armyId||f.reserve||f.mobilizing||!['patrol','escort','intercept','pursue','blockade','raid','return','recon','supply'].includes(kind))return {ok:false,reason:'fleet'};
 let targetZone=target,targetPort=null,cargo=0,reportId=null;
 if(kind==='pursue'){
  const sighting=reportedHostileFleets(s,owner).find(report=>report.id===target&&s.year*12+s.month-(report.year*12+report.month)<=2);
  if(!sighting)return {ok:false,reason:'intelligence'};
  targetZone=sighting.zone;reportId=sighting.id;
 }
 if(['return','blockade','supply'].includes(kind)){
  const r=s.regions.find(x=>x.id===target&&x.port);
  if(!r||kind==='return'&&r.owner!==owner||kind==='blockade'&&!atWar(s,owner,r.owner)||kind==='supply'&&r.owner!==owner)return {ok:false,reason:'port'};
  if(kind==='blockade'&&!blockadePower(f))return {ok:false,reason:'warships'};
  targetPort=target;targetZone=portZone(target);
 }
 if(kind==='supply'){
  const origin=s.regions.find(r=>r.id===f.port&&r.owner===owner);
  if(!origin||origin.id===target||f.order)return {ok:false,reason:'departure'};
  const capacity=(f.ships.merchant||0)*4+(f.ships.transport||0)*3;
  const stored=s.naval.provisions?.[target],space=24-(stored?.owner===owner?stored.food:0);
  cargo=Math.min(12,capacity,Math.max(0,Math.floor(s.factions[owner].food)),space);
  if(cargo<4)return {ok:false,reason:'cargo'};
 }
 if(kind==='escort'||kind==='raid'){
  const route=s.naval.routes.find(x=>x.id===target);
  if(!route)return {ok:false,reason:'route'};
  if(kind==='raid'&&!hostileTradeRoute(s,owner,route))return {ok:false,reason:'war'};
  targetZone=kind==='raid'&&routeZones(route).includes(f.zone)?f.zone:portZone(route.from);
 }
 const path=seaRoute(f.zone,targetZone);
 if(!path)return {ok:false,reason:'sea'};
 if(!ships(f)||f.hull<=0||kind!=='return'&&(f.supply<15||f.hull<25))return {ok:false,reason:'condition'};
 if(['patrol','escort','raid'].includes(kind)&&!blockadePower(f))return {ok:false,reason:'operational-warships'};
 const returning=kind==='return'?f.order?.cargo||0:0;
 if(f.order?.kind==='supply'&&kind!=='return')report(s,{kind:'supply-loss',owner,port:f.order.targetPort,cargo:f.order.cargo,reason:'cancelled'});
 if(kind==='supply')s.factions[owner].food-=cargo;
 const originPort=kind==='supply'?f.port:null;
 f.port=null;f.order={kind:kind==='pursue'?'intercept':kind,target:reportId?targetZone:target,targetPort,path,...(reportId?{reportId}:{}),...(cargo?{cargo,originPort}:{}),...(returning?{cargo:returning}: {})};
 return {ok:true,months:Math.max(1,Math.ceil(path.length/fleetSpeed(f))),...(cargo?{cargo}: {})};
}
// Food landed at a port can be carted a few friendly land links inland. A
// hostile occupation breaks the chain, and each field army draws from only
// its nearest stocked port so overlapping routes do not double-charge it.
function inlandSupplyReach(s,owner,port,maxLinks=3){
 const owned=new Set(s.regions.filter(r=>r.owner===owner).map(r=>r.id)),distance=new Map([[port,0]]),queue=[port];
 while(queue.length){const id=queue.shift(),steps=distance.get(id);if(steps>=maxLinks)continue;
  for(const [from,to,kind] of GRAND_ROUTES){if(kind==='sea')continue;const next=from===id?to:to===id?from:null;if(!next||!owned.has(next)||distance.has(next))continue;distance.set(next,steps+1);queue.push(next)}
 }
 return distance;
}
function wagonRoute(s,owner,from,to){
 const owned=new Set(s.regions.filter(r=>r.owner===owner).map(r=>r.id));
 if(!owned.has(from)||!owned.has(to))return null;
 const previous=new Map([[from,null]]),queue=[from];
 while(queue.length&&!previous.has(to)){
  const id=queue.shift();
  for(const [a,b,kind] of GRAND_ROUTES){
   if(kind==='sea')continue;
   const next=a===id?b:b===id?a:null;
   if(next&&owned.has(next)&&!previous.has(next)){previous.set(next,id);queue.push(next)}
  }
 }
 if(!previous.has(to))return null;
 const path=[];for(let id=to;id!==from;id=previous.get(id))path.unshift(id);
 return path;
}
export function wagonSupplyPlan(s,owner,port,to){
 initializeNaval(s);
 const origin=s.regions.find(r=>r.id===port),target=s.regions.find(r=>r.id===to),store=s.naval?.provisions?.[port];
 if(!origin?.port||origin.owner!==owner||target?.owner!==owner)return {ok:false,reason:'owner'};
 if(!s.armies.some(a=>a.owner===owner&&a.region===to&&a.men>=1200))return {ok:false,reason:'army'};
 const path=wagonRoute(s,owner,port,to);
 if(!path||path.length<4||path.length>8)return {ok:false,reason:'route'};
 if(s.naval.wagons.some(w=>w.owner===owner&&w.to===to))return {ok:false,reason:'pending'};
 const existing=s.naval.inlandProvisions[to],space=12-(existing?.owner===owner?existing.food:0);
 const cargo=Math.min(8,store?.owner===owner?store.food:0,space),months=Math.ceil(path.length/2),cost=4+months;
 if(cargo<months+2)return {ok:false,reason:'stock'};
 if(s.factions[owner]?.treasury<cost)return {ok:false,reason:'treasury'};
 return {ok:true,path,cargo,months,cost,expectedDelivery:cargo-months};
}
export function dispatchWagonSupply(s,owner,port,to){
 const plan=wagonSupplyPlan(s,owner,port,to);if(!plan.ok)return plan;
 s.factions[owner].treasury-=plan.cost;
 s.naval.provisions[port].food-=plan.cargo;
 if(!s.naval.provisions[port].food)delete s.naval.provisions[port];
 s.naval.wagons.push({owner,from:port,to,path:plan.path,index:0,food:plan.cargo,loaded:plan.cargo,year:s.year,month:s.month});
 return {ok:true,cost:plan.cost,cargo:plan.cargo,months:plan.months,expectedDelivery:plan.expectedDelivery};
}
function advanceWagons(s,log){
 for(const wagon of [...s.naval.wagons]){
  let blocked=false;
  for(let step=0;step<2&&wagon.index<wagon.path.length;step++){
   if(s.regions.find(r=>r.id===wagon.path[wagon.index])?.owner!==wagon.owner){blocked=true;break}
   wagon.index++;
  }
  if(blocked){
   s.naval.wagons.splice(s.naval.wagons.indexOf(wagon),1);
   report(s,{kind:'wagon-loss',owner:wagon.owner,port:wagon.from,to:wagon.to,cargo:wagon.food,reason:'route occupied'});
   if(wagon.owner===s.player)log(s,'An inland supply column was lost when its route was cut.','陆路粮车路线被截断，余粮损失。');
   continue;
  }
  wagon.food=Math.max(0,wagon.food-1);
  if(wagon.index<wagon.path.length)continue;
  s.naval.wagons.splice(s.naval.wagons.indexOf(wagon),1);
  const store=s.naval.inlandProvisions[wagon.to];
  s.naval.inlandProvisions[wagon.to]={owner:wagon.owner,food:Math.min(12,(store?.owner===wagon.owner?store.food:0)+wagon.food)};
  report(s,{kind:'wagon-delivery',owner:wagon.owner,port:wagon.from,to:wagon.to,cargo:wagon.food,lost:wagon.loaded-wagon.food});
  if(wagon.owner===s.player)log(s,`Wagons delivered ${wagon.food} food to the inland army; ${wagon.loaded-wagon.food} was used on the road.`,`粮车向内陆军队交付${wagon.food}份粮；途中消耗${wagon.loaded-wagon.food}份。`);
 }
}
function consumeMaritimeProvisions(s){
 const reaches=new Map(),demand=new Map();
 for(const [port,store] of Object.entries(s.naval.provisions||{}))if(store.food>0&&s.regions.some(r=>r.id===port&&r.owner===store.owner))reaches.set(`p:${port}`,{owner:store.owner,distance:inlandSupplyReach(s,store.owner,port),store});
 for(const [id,store] of Object.entries(s.naval.inlandProvisions||{}))if(store.food>0&&s.regions.some(r=>r.id===id&&r.owner===store.owner))reaches.set(`i:${id}`,{owner:store.owner,distance:inlandSupplyReach(s,store.owner,id,1),store});
 for(const army of s.armies.filter(a=>a.men>0)){
  const key=[...reaches].filter(([,store])=>store.owner===army.owner&&store.distance.has(army.region)).sort(([a,first],[b,second])=>first.distance.get(army.region)-second.distance.get(army.region)||a.localeCompare(b))[0]?.[0];
  if(key)demand.set(key,(demand.get(key)||0)+army.men);
 }
 for(const [kind,inventory] of [['p',s.naval.provisions],['i',s.naval.inlandProvisions]])for(const [id,store] of Object.entries(inventory)){
  if(s.regions.find(r=>r.id===id)?.owner!==store.owner){delete inventory[id];continue}
  store.food=Math.max(0,store.food-1-Math.min(3,Math.floor((demand.get(`${kind}:${id}`)||0)/4000)));
  if(!store.food)delete inventory[id];
 }
}
function finishMaritimeSupply(s,log){
 for(const f of s.naval.fleets){
  const order=f.order;if(order?.kind!=='supply'||order.path.length)continue;
  const target=s.regions.find(r=>r.id===order.targetPort),cargo=order.cargo||0,carryingCapacity=(f.ships.transport||0)*3+(f.ships.merchant||0)*4;
  if(target?.owner!==f.owner||!cargo||f.hull<20||!carryingCapacity){
   report(s,{kind:'supply-loss',owner:f.owner,port:order.targetPort,cargo,reason:target?.owner!==f.owner?'port captured':'fleet disabled'});
   if(f.owner===s.player)log(s,'A maritime supply shipment was lost.','一批海运军需损失。');
   f.order=null;continue;
  }
  const blockaded=isPortBlockaded(s,target.id);
  if(blockaded){if(!order.blocked){order.blocked=true;report(s,{kind:'supply-blocked',owner:f.owner,port:target.id,cargo});if(f.owner===s.player)log(s,'A blockade kept supply ships outside the harbor.','封锁迫使补给舰停在港外。')}continue}
  const current=s.naval.provisions[target.id],stored=current?.owner===f.owner?current.food:0,carried=Math.min(cargo,carryingCapacity),delivered=Math.min(carried,Math.max(0,24-stored));
  if(carried<cargo)report(s,{kind:'supply-loss',owner:f.owner,port:target.id,cargo:cargo-carried,reason:'carrier lost'});
  s.naval.provisions[target.id]={owner:f.owner,food:stored+delivered};
  s.factions[f.owner].food=Math.min(s.factions[f.owner].foodCapacity||100,s.factions[f.owner].food+carried-delivered);
  f.port=target.id;f.zone=portZone(target.id);f.order=null;
  report(s,{kind:'supply-delivery',owner:f.owner,port:target.id,cargo:delivered,fleetId:f.id});
  if(f.owner===s.player)log(s,`Supply ships delivered ${delivered} food to ${target.name[0]}.`,`补给舰向${target.name[1]}运抵${delivered}份粮食。`);
 }
}
export function commitArmyTransport(s,unit,from,to){const f=accessibleFleet(s,unit.owner,from.id,unit.men),path=f&&seaRoute(f.zone,portZone(to.id));if(!f||!to.port||!path)return {ok:false,reason:'vessels'};
 // Two ports can share one broad sea zone. The crossing still spends a naval
 // phase offshore, where a hostile fleet can intercept the transport.
 const voyage=path.length?path:[portZone(to.id)];
 f.port=null;f.order={kind:'transport',target:to.id,targetPort:to.id,path:voyage,armyId:unit.id,departed:false};return {ok:true,fleetId:f.id,months:Math.max(1,voyage.length)}
}
// A troop voyage occupies its ships until the army actually disembarks or
// fights. Reaching the destination sea zone does not grant hostile harbor use.
export function finishArmyTransport(s,unit,{defeated=false}={}){
 const movement=unit?.move;
 if(!movement?.sea||!movement.transportFleetId||movement.returning)return;
 const convoy=s.naval?.fleets.find(f=>f.id===movement.transportFleetId);
 if(!convoy||convoy.owner!==unit.owner||convoy.order?.kind!=='transport'||convoy.order.armyId!==unit.id)return;
 const destination=s.regions.find(r=>r.id===movement.to);
 if(destination?.owner===convoy.owner&&destination.port&&convoy.zone===portZone(destination.id)){
  convoy.port=destination.id;convoy.order=null;return;
 }
 const home=s.regions.filter(r=>r.owner===convoy.owner&&r.port).map(r=>({r,path:seaRoute(convoy.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>Number(b.r.id===unit.region)-Number(a.r.id===unit.region)||a.path.length-b.path.length)[0];
 convoy.port=null;
 if(defeated&&unit.men>0){
  // Survivors of a failed amphibious assault cannot receive land orders
  // until their actual ships carry them back to a friendly harbor.
  Object.assign(movement,{to:home?.r.id||null,remaining:0,path:[],final:home?.r.id||null,transportReady:false,returning:true});
  convoy.order={kind:'return',target:home?.r.id||null,targetPort:home?.r.id||null,path:home?.path||[],armyId:unit.id};
 }else convoy.order=home?{kind:'return',target:home.r.id,targetPort:home.r.id,path:home.path}:null;
}
// Older saves could free a convoy as soon as it entered an enemy harbor,
// while the army was still at sea. Reattach those ships on import.
export function reconcileActiveTransports(s){
 for(const unit of s.armies){
  const movement=unit.move;
  if(!movement?.sea||!movement.transportFleetId||movement.returning||!movement.transportReady)continue;
  const convoy=s.naval?.fleets.find(f=>f.id===movement.transportFleetId&&f.owner===unit.owner);
  if(!convoy){unit.move=null;unit.attackIntel=null;continue}
  const destination=s.regions.find(r=>r.id===movement.to),zone=destination&&portZone(destination.id);
  if(!zone){unit.move=null;unit.attackIntel=null;continue}
  const path=seaRoute(convoy.zone,zone);
  if(!path){unit.move=null;unit.attackIntel=null;continue}
  const arrived=path.length===0;
  convoy.order={kind:'transport',target:destination.id,targetPort:destination.id,path,armyId:unit.id,departed:true,...(arrived?{arrived:true}:{})};
  convoy.port=arrived&&destination.owner===convoy.owner?destination.id:null;
  if(!arrived){movement.transportReady=false;movement.remaining=0}
 }
}
export function cancelArmyTransport(s,unit){
 const movement=unit?.move,convoy=s.naval?.fleets.find(f=>f.id===movement?.transportFleetId),origin=s.regions.find(r=>r.id===unit?.region);
 if(!movement?.transportFleetId)return {ok:true};
 // A boarded army cannot appear back at its departure port once the ship has sailed.
 if(!origin?.port||!convoy||convoy.owner!==unit.owner||convoy.order?.kind!=='transport'||convoy.order.armyId!==unit.id||convoy.order.departed!==false||movement.transportReady||convoy.zone!==portZone(origin.id))return {ok:false,reason:'departed'};
 convoy.order=null;convoy.port=origin.id;
 return {ok:true};
}
function recentFleetReports(s,owner){initializeNaval(s);return Object.entries(s.naval.intel[owner]||{}).filter(([,report])=>{const age=s.year*12+s.month-(report.year*12+report.month);return age>=0&&age<=4}).map(([id,report])=>({id,...report}))}
export function reportedHostileFleets(s,owner){return recentFleetReports(s,owner).filter(report=>atWar(s,owner,report.owner))}
export function reportedNonHostileFleets(s,owner){return recentFleetReports(s,owner).filter(report=>report.owner!==owner&&!atWar(s,owner,report.owner))}
export function reportedTransportDanger(s,unit,destination){
 const convoy=accessibleFleet(s,unit.owner,unit.region,unit.men),path=convoy&&seaRoute(convoy.zone,portZone(destination.id));
 if(!path)return false;
 const zones=new Set([convoy.zone,...path]),escortStrength=warshipCount(convoy);
 return reportedHostileFleets(s,unit.owner).some(report=>zones.has(report.zone)&&Number.isFinite(report.range?.[1])&&report.range[1]>escortStrength*1.5);
}
const observe=(s,observer,seen,source)=>{if(observer===seen.owner)return;s.naval.intel[observer]||={};const count=ships(seen),trained=source==='recon'&&(activeEffects(s,observer).navalIntel||navalJobEffect(s,observer,'intelligence')),error=trained?1:2;s.naval.intel[observer][seen.id]={owner:seen.owner,zone:seen.zone,year:s.year,month:s.month,source,range:[Math.max(1,count-error),count+error],confidence:source==='recon'?(trained?'high':'medium'):'low'}};
function normalizeNavalReportIds(naval){
 const reports=naval.reports;
 const greatest=reports.reduce((max,entry)=>{const match=/^naval-r(\d+)$/.exec(entry?.id||'');return match?Math.max(max,Number(match[1])||0):max},0);
 naval.nextReport=Math.max(Number.isSafeInteger(naval.nextReport)&&naval.nextReport>0?naval.nextReport:1,greatest+1);
 const seen=new Set();
 for(const entry of reports){
  if(!entry||typeof entry!=='object')continue;
  if(typeof entry.id!=='string'||seen.has(entry.id)){
   do{entry.id=`naval-r${naval.nextReport++}`}while(seen.has(entry.id));
  }
  seen.add(entry.id);
 }
}
const report=(s,entry)=>{const id=`naval-r${s.naval.nextReport++}`;s.naval.reports.unshift({year:s.year,month:s.month,...entry,id});s.naval.reports.length=Math.min(s.naval.reports.length,80)};
const encounterKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
function resolveReconOrder(s,f,avoided,log){
 const contacts=s.naval.fleets.filter(other=>other.id!==f.id&&other.owner!==f.owner&&other.zone===f.zone&&ships(other)&&other.hull>0);
 const light=f.ships.light||0,trained=!!(activeEffects(s,f.owner).navalIntel||navalJobEffect(s,f.owner,'intelligence'));
 let confirmed=0,nonHostile=0;
 for(const other of contacts){
  const detection=Math.min(.9,Math.max(.1,.35+light*.12+(trained?.15:0)+(other.order?.kind==='blockade'?.15:0)-(other.reserve?.15:0)));
  if(rng(s)<detection){observe(s,f.owner,other,'recon');if(atWar(s,f.owner,other.owner))confirmed++;else nonHostile++}
  const enemyDetection=Math.min(.9,.35+(other.ships.light||0)*.1+(other.order?.kind==='intercept'?.2:0));
  if(rng(s)<enemyDetection)observe(s,other.owner,f,'sighting');
  const evade=Math.min(.85,Math.max(.05,.35+(fleetSpeed(f)-fleetSpeed(other))*.14+light*.08+(other.reserve?.2:0)-(other.order?.kind==='intercept'?.2:0)));
  if(rng(s)<evade)avoided.add(encounterKey(f.id,other.id));
 }
 if(f.owner===s.player)log(s,confirmed?'Naval scouts reported a dated, approximate hostile sighting. The fleet remains at sea.':nonHostile?'Naval scouts sighted a non-hostile fleet. Its dated report is in Naval Intelligence; the fleet remains at sea.':'Naval scouts found no confirmed fleet; enemies may still be present. The fleet remains at sea.',confirmed?'海军斥候传回注明日期的敌舰概略目击报告。舰队仍在海上。':nonHostile?'海军斥候目击非交战舰队；注明日期的报告已列入海军情报，舰队仍在海上。':'海军斥候未能确认敌舰；敌人仍可能在附近。舰队仍在海上。');
}
const combatPower=(s,f)=>{const commander=s.world?.characters?.[f.commanderId],skill=commander?navalSkill(commander,'commander'):0,fullCrew=Object.entries(f.ships).reduce((n,[k,v])=>n+(SHIPS[k]?.crew||0)*v,0),crewFactor=fullCrew?Math.max(0,Math.min(1,f.sailors/fullCrew)):0,coastalFort=s.regions.find(r=>r.id===f.port&&r.owner===f.owner)?.buildings?.includes('coastal-fort')?4:0;return (Object.entries(f.ships).reduce((n,[k,v])=>n+(SHIPS[k]?.power||0)*v,0)+coastalFort)*(0.5+f.morale/180+f.experience/300+f.hull/400+f.supply/500+skill/200)*crewFactor*(f.reserve?.4:1)*(1+(activeEffects(s,f.owner).navalPower||0))};
function battleScreenSpeed(f){const armed=Object.entries(f.ships).filter(([type,count])=>count>0&&['light','trireme','quadrireme','quinquereme'].includes(type));const count=armed.reduce((sum,[,n])=>sum+n,0);return count?armed.reduce((sum,[type,n])=>sum+SHIPS[type].speed*n,0)/count:1}
function maneuverFactor(own,opponent,tactic){const weight=tactic==='ramming'?.08:tactic==='formation'?.035:.05;return Math.max(.88,Math.min(1.12,1+(battleScreenSpeed(own)-battleScreenSpeed(opponent))*weight))}
function exposedShipType(target,attackerTactic='formation',defenderTactic='formation'){
 const warships=['light','trireme','quadrireme','quinquereme'].filter(type=>(target.ships[type]||0)>0),slow=['transport','merchant'].filter(type=>(target.ships[type]||0)>0);
 const warshipCount=warships.reduce((sum,type)=>sum+target.ships[type],0),slowCount=slow.reduce((sum,type)=>sum+target.ships[type],0);
 // A formed warship screen protects cargo. Boarding can reach slow hulls when
 // the defender breaks formation and has more vulnerable hulls than escorts.
 if(attackerTactic==='boarding'&&defenderTactic!=='formation'&&slowCount>warshipCount)return slow[0];
 return warships[0]||slow[0]||null;
}
function damageFleet(s,target,amount,attackerTactic='formation',defenderTactic='formation'){if(amount<=0)return {sunk:0,type:null,sailors:0};const before=ships(target),beforeTypes={...target.ships},crew=target.sailors;target.hull=Math.max(0,target.hull-amount);target.sailors=Math.max(0,target.sailors-Math.round(amount*6));target.morale=Math.max(5,target.morale-Math.ceil(amount/3));let type=null,sunk=0;if(target.hull<45&&before>0){type=exposedShipType(target,attackerTactic,defenderTactic);if(type)target.ships[type]--;sunk=type?1:0}if(target.hull===0||ships(target)===0){sunk=before;type=null;target.hull=0;target.ships={};if(target.order?.kind==='supply')report(s,{kind:'supply-loss',owner:target.owner,port:target.order.targetPort,cargo:target.order.cargo||0,reason:'fleet sunk'});target.order=null}const byType={};for(const [ship,count] of Object.entries(beforeTypes)){const lost=count-(target.ships[ship]||0);if(lost>0)byType[ship]=lost}return {sunk,type,sailors:crew-target.sailors,...(sunk?{byType}:{})}}
function finalizeDestroyedFleet(s,f,log){
 if(ships(f))return;
 const id=f.commanderId,person=s.world?.characters?.[id];
 if(id&&person?.alive&&!person.missing){
  const origin=s.regions.filter(r=>r.owner===f.owner&&r.port).map(r=>({id:r.id,distance:seaRoute(f.zone,portZone(r.id))?.length??Infinity})).sort((a,b)=>a.distance-b.distance)[0]?.id||s.regions.find(r=>r.owner===f.owner)?.id||s.regions[0]?.id||null;
  person.location=null;person.missing={origin,remaining:3,year:s.year,month:s.month};
  if(f.owner===s.player)log(s,'The fleet was lost; its commander is missing.','舰队全灭，舰长失联。');
 }
 f.commanderId=null;f.pendingCommanderId=null;f.pendingMonths=0;
}
function disruptTransport(s,f,armyId,{defeated=false,hullDamage=0,sailorLoss=0,originalSailors=0}={}){
 const army=s.armies.find(x=>x.id===armyId);if(!army||!army.move?.sea)return null;
 const capacityLost=fleetCapacity(f,s)<army.men;
 if(!capacityLost&&!defeated)return null;
 const before=army.men,origin=s.regions.find(r=>r.id===army.region&&r.owner===f.owner&&r.port);
 const lossRate=capacityLost?(f.hull===0?.55:.28):Math.min(.18,.03+hullDamage*.0015+sailorLoss/Math.max(1,originalSailors)*.04);
 army.men=Math.max(0,Math.min(Math.round(before*(1-lossRate)),fleetCapacity(f,s)));
 army.morale=Math.max(10,army.morale-(capacityLost?20:12));
 const homes=ships(f)>0?s.regions.filter(r=>r.owner===f.owner&&r.port).map(r=>({r,path:seaRoute(f.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>Number(b.r.id===origin?.id)-Number(a.r.id===origin?.id)||a.path.length-b.path.length):[];
 const home=homes[0];
 if(!army.men){army.move=null;f.order=null;return {armyId:army.id,owner:army.owner,casualties:before,reason:'lost',origin:origin?.id||null}}
 // The army remains embarked and unavailable until its surviving ships dock.
 army.move={...army.move,to:home?.r.id||null,remaining:0,path:[],final:home?.r.id||null,transportReady:false,returning:true};
 f.order={kind:'return',target:home?.r.id||null,targetPort:home?.r.id||null,path:home?.path||[],armyId:army.id};
 return {armyId:army.id,owner:army.owner,casualties:before-army.men,reason:capacityLost?'capacity':'defeat',origin:origin?.id||null,returnPort:home?.r.id||null,returning:true};
}
function completeTransportReturn(s,f,order,log){
 const army=s.armies.find(x=>x.id===order.armyId);
 if(!army?.move?.returning||army.move.transportFleetId!==f.id)return;
 army.region=order.targetPort;army.move=null;army.attackIntel=null;
 if(army.owner===s.player)log(s,`${army.name[0]} returned to port after its troop voyage was disrupted.`,`${army.name[1]}的运兵航程受阻后已返港。`);
}
function nearestFriendlyPort(s,f,preferred=null){
 return s.regions.filter(r=>r.owner===f.owner&&r.port).map(r=>({port:r.id,path:seaRoute(f.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>Number(b.port===preferred)-Number(a.port===preferred)||a.path.length-b.path.length)[0]||null;
}
function rerouteCargoReturn(s,f){
 const order=f.order;
 if(order?.kind!=='return'||!order.cargo||s.regions.some(r=>r.id===order.targetPort&&r.owner===f.owner&&r.port))return;
 const home=nearestFriendlyPort(s,f);
 order.target=home?.port||null;order.targetPort=home?.port||null;order.path=home?.path||[];
}
function maritimeHazards(s,f,log){
 if(f.port||!ships(f))return;
 const elapsed=(s.year-(s.startYear??-49))*12+s.month-(s.startMonth??1);
 if(elapsed<12)return;
 if(rng(s)<.025){
  const armyId=f.order?.armyId,loss=5+Math.floor(rng(s)*9),damage=damageFleet(s,f,loss),disruption=disruptTransport(s,f,armyId);
  report(s,{kind:'storm',zone:f.zone,owner:f.owner,damage:loss,sailors:damage.sailors,...(disruption?{transportDisruptions:{[f.id]:disruption}}:{})});
  if(f.owner===s.player)log(s,disruption?'A storm disrupted the troop voyage; surviving ships are returning to port.':'A storm damaged the fleet and cost sailors.',disruption?'风暴打断运兵航程，幸存舰船正在返港。':'风暴损伤了舰队并造成水手伤亡。');
 }
 if(ships(f)&&f.morale<22&&f.order?.kind!=='return'&&rng(s)<.12){
  const armyId=f.order?.kind==='transport'?f.order.armyId:null,disruption=armyId?disruptTransport(s,f,armyId,{defeated:true}):null;
  const supplyOrder=f.order?.kind==='supply'?f.order:null,cargo=supplyOrder?.cargo||0;
  let home=null;
  if(supplyOrder){
   home=nearestFriendlyPort(s,f,supplyOrder.originPort);
   if(home)f.order={kind:'return',target:home.port,targetPort:home.port,path:home.path,cargo};
   else{f.order=null;report(s,{kind:'supply-loss',zone:f.zone,owner:f.owner,port:supplyOrder.targetPort,cargo,reason:'mutiny'});}
  }else if(!disruption)f.order=null;
  f.morale=Math.max(5,f.morale-4);
  report(s,{kind:'mutiny',zone:f.zone,owner:f.owner,...(cargo?{cargo,returnPort:home?.port||null}:{}),...(disruption?{transportDisruptions:{[f.id]:disruption}}:{})});
  if(f.owner===s.player)log(s,disruption?'A naval mutiny forced the troop convoy to return to port.':cargo?(home?'A mutiny forced the supply fleet home with its food still aboard.':'A mutiny lost the supply cargo; no friendly harbor was reachable.'):'A naval mutiny interrupted fleet orders.',disruption?'海军哗变迫使运兵舰队返港。':cargo?(home?'哗变迫使补给舰返港，粮食仍在船上。':'哗变导致补给粮食损失；附近没有可抵达的友方港口。'):'海军哗变中断了舰队命令。');
 }
}
function battleTactic(s,f){
 if(f.owner===s.player)return NAVAL_TACTICS[f.tactic]?f.tactic:'formation';
 if(f.order?.armyId||['escort','transport','patrol'].includes(f.order?.kind))return 'formation';
 if(f.hull<40||f.order?.kind==='raid')return 'missile';
 if(f.order?.kind==='blockade')return 'boarding';
 return (f.ships.trireme||0)+(f.ships.quadrireme||0)+(f.ships.quinquereme||0)>1?'ramming':'formation';
}
function tacticPower(f,tactic){
 if(tactic==='ramming'){const warships=(f.ships.light||0)+(f.ships.trireme||0)+(f.ships.quadrireme||0)+(f.ships.quinquereme||0);return .9+.42*warships/Math.max(1,ships(f))}
 return {formation:1.04,boarding:1.03,missile:.94}[tactic]||1;
}
function battleDamage(opponentPower,ownPower,won,opponentTactic,ownTactic){
 if(opponentPower<=0)return 0;
 const outgoing={formation:1,ramming:1.2,boarding:.83,missile:.78}[opponentTactic]||1;
 const protection={formation:.9,ramming:1.1,boarding:1.1,missile:1}[ownTactic]||1;
 const exposure=opponentPower/(ownPower+opponentPower+1);
 // The engagement term also needs an effective fighting crew. Otherwise a
 // barely crewed hull still inflicts the old fixed four or fifteen damage.
 const engagement=(won?4:15)*Math.min(1,opponentPower/4);
 return Math.min(65,Math.max(0,Math.round((exposure*34+engagement)*outgoing*protection)));
}
function observedBattleLosses(loss){
 const sailors=Math.max(0,loss.sailors||0),sunk=Math.max(0,loss.sunk||0);
 return {ships:[Math.max(0,sunk-1),sunk+1],sailors:[Math.max(0,Math.floor(Math.max(0,sailors*.6-15)/25)*25),Math.max(25,Math.ceil((sailors*1.4+15)/25)*25)]};
}
function adjustBattleSailors(f,loss,ownTactic,opponentTactic){
 if(ownTactic==='missile'){const spared=Math.round(loss.sailors*.25);f.sailors+=spared;loss.sailors-=spared}
 const extra=(ownTactic==='boarding'?8:0)+(opponentTactic==='boarding'?12:0);
 if(extra){const taken=Math.min(f.sailors,extra);f.sailors-=taken;loss.sailors+=taken}
}
function captureNavalCommander(s,loser,winner){
 const id=loser.commanderId,person=s.world?.characters?.[id];
 if(!id||!person?.alive||person.missing||winner.hull<=0||!(loser.hull<35||ships(loser)===0)||rng(s)>=(ships(loser)===0?.65:.32))return null;
 person.location=null;person.missing={origin:loser.port||s.regions.find(r=>r.owner===loser.owner&&r.port)?.id||null,year:s.year,month:s.month,capturedBy:winner.owner,remaining:0};
 loser.commanderId=null;s.naval.captives.push({characterId:id,owner:loser.owner,holder:winner.owner,status:'held',year:s.year,month:s.month});
 return {characterId:id,owner:loser.owner,holder:winner.owner};
}
export function resolveBattle(s,a,b,zone,log){
 const tactics={[a.id]:battleTactic(s,a),[b.id]:battleTactic(s,b)};
 const snapshot=f=>({owner:f.owner,name:[...f.name],commanderId:f.commanderId,ships:{...f.ships},sailors:f.sailors,morale:f.morale,hull:f.hull,supply:f.supply,reserve:!!f.reserve,tactic:tactics[f.id],coastalFort:!!s.regions.find(r=>r.id===f.port&&r.owner===f.owner)?.buildings?.includes('coastal-fort')});
 const beforeA=snapshot(a),beforeB=snapshot(b),transported={[a.id]:a.order?.armyId,[b.id]:b.order?.armyId};
 const maneuver={[a.id]:maneuverFactor(a,b,tactics[a.id]),[b.id]:maneuverFactor(b,a,tactics[b.id])};
 const pa=combatPower(s,a)*tacticPower(a,tactics[a.id])*maneuver[a.id],pb=combatPower(s,b)*tacticPower(b,tactics[b.id])*maneuver[b.id];
 // Civilian hulls without any armed escort cannot damage another fleet or
 // manufacture a combat victory merely by sharing a sea zone.
 if(pa<=0&&pb<=0)return;
 const weather=1+(rng(s)-.5)*.24,roll=(rng(s)-.5)*.24,attackerWins=pa*weather*(1+roll)>=pb*(1-roll);
 const aLoss=damageFleet(s,a,battleDamage(pb,pa,attackerWins,tactics[b.id],tactics[a.id]),tactics[b.id],tactics[a.id]);
 const bLoss=damageFleet(s,b,battleDamage(pa,pb,!attackerWins,tactics[a.id],tactics[b.id]),tactics[a.id],tactics[b.id]);
 adjustBattleSailors(a,aLoss,tactics[a.id],tactics[b.id]);adjustBattleSailors(b,bLoss,tactics[b.id],tactics[a.id]);
 const victor=attackerWins?a:b,defeated=attackerWins?b:a,defeatedLoss=attackerWins?bLoss:aLoss;
 let captured=0;if(tactics[victor.id]==='boarding'&&victor.hull>0&&defeatedLoss.sunk>0&&defeatedLoss.type){victor.ships[defeatedLoss.type]=(victor.ships[defeatedLoss.type]||0)+1;defeatedLoss.byType[defeatedLoss.type]--;if(!defeatedLoss.byType[defeatedLoss.type])delete defeatedLoss.byType[defeatedLoss.type];defeatedLoss.sunk--;captured=1}
 const capturedCommander=tactics[victor.id]==='boarding'?captureNavalCommander(s,defeated,victor):null;
 if(capturedCommander&&(capturedCommander.owner===s.player||capturedCommander.holder===s.player))log(s,'A fleet commander was taken prisoner in a boarding action.','接舷战中一名舰长被俘。');
 a.experience=Math.min(100,a.experience+3);b.experience=Math.min(100,b.experience+3);
 const transportDisruptions={};
 for(const f of [a,b]){if(f.hull<12&&f.commanderId){const person=s.world?.characters?.[f.commanderId];if(person?.health==='healthy')person.health='wounded'}if(f.commanderId){const person=s.world?.characters?.[f.commanderId];if(person?.alive){const skill=navalSkill(person,'commander');person.navalSkills.commander=Math.min(100,skill+2)}}const loss=f===a?aLoss:bLoss,before=f===a?beforeA:beforeB;const disruption=disruptTransport(s,f,transported[f.id],{defeated:f===defeated,hullDamage:before.hull-f.hull,sailorLoss:loss.sailors,originalSailors:before.sailors});if(disruption)transportDisruptions[f.id]=disruption}
 report(s,{kind:'battle',zone,participants:[a.id,b.id],snapshots:{[a.id]:beforeA,[b.id]:beforeB},winner:victor.owner,losses:{[a.id]:aLoss,[b.id]:bLoss},observedLosses:{[a.owner]:observedBattleLosses(bLoss),[b.owner]:observedBattleLosses(aLoss)},captured,capturedCommander,tactics,maneuver:{[a.id]:Math.round(maneuver[a.id]*100),[b.id]:Math.round(maneuver[b.id]*100)},weather:Math.round(weather*100),damage:{[a.id]:beforeA.hull-a.hull,[b.id]:beforeB.hull-b.hull},transportDisruptions});
 for(const owner of [a.owner,b.owner])observe(s,owner,owner===a.owner?b:a,'battle');
 finalizeDestroyedFleet(s,a,log);finalizeDestroyedFleet(s,b,log);
}
function resolveCoordinatedBattle(s,sideA,sideB,zone,log){
 const all=[...sideA,...sideB],tactics=Object.fromEntries(all.map(f=>[f.id,battleTactic(s,f)]));
 const snapshots=Object.fromEntries(all.map(f=>[f.id,{owner:f.owner,name:[...f.name],commanderId:f.commanderId,ships:{...f.ships},sailors:f.sailors,morale:f.morale,hull:f.hull,supply:f.supply,reserve:!!f.reserve,tactic:tactics[f.id],coastalFort:!!s.regions.find(r=>r.id===f.port&&r.owner===f.owner)?.buildings?.includes('coastal-fort')}]));
 const transported=Object.fromEntries(all.map(f=>[f.id,f.order?.armyId]));
 const maneuvers=Object.fromEntries(all.map(f=>[f.id,maneuverFactor(f,sideA.includes(f)?sideB[0]:sideA[0],tactics[f.id])]));
 const powers=Object.fromEntries(all.map(f=>[f.id,combatPower(s,f)*tacticPower(f,tactics[f.id])*maneuvers[f.id]]));
 const pa=sideA.reduce((n,f)=>n+powers[f.id],0),pb=sideB.reduce((n,f)=>n+powers[f.id],0);
 if(pa<=0&&pb<=0)return;
 const weather=1+(rng(s)-.5)*.24,roll=(rng(s)-.5)*.24,aWins=pa*weather*(1+roll)>=pb*(1-roll);
 const losses={};
 const damageSide=(side,opponentPower,ownPower,won,opponentTactic)=>{
  const total=battleDamage(opponentPower,ownPower,won,opponentTactic,tactics[side[0].id]);
  const weight=side.reduce((n,f)=>n+Math.max(0,powers[f.id]),0);let assigned=0;
  side.forEach((f,i)=>{
   const amount=i===side.length-1?total-assigned:Math.min(total-assigned,Math.round(total*Math.max(0,powers[f.id])/Math.max(1,weight)));
   assigned+=amount;
   const loss=damageFleet(s,f,amount,opponentTactic,tactics[f.id]);
   adjustBattleSailors(f,loss,tactics[f.id],opponentTactic);
   losses[f.id]=loss;
  });
 };
 damageSide(sideA,pb,pa,aWins,tactics[sideB[0].id]);
 damageSide(sideB,pa,pb,!aWins,tactics[sideA[0].id]);
 const winners=aWins?sideA:sideB,defeated=aWins?sideB:sideA,boarding=winners.find(f=>tactics[f.id]==='boarding'&&f.hull>0);
 let captured=0,capturedCommander=null;
 if(boarding){
  const prize=defeated.find(f=>losses[f.id].sunk>0&&losses[f.id].type);
  if(prize){const loss=losses[prize.id];boarding.ships[loss.type]=(boarding.ships[loss.type]||0)+1;loss.byType[loss.type]--;if(!loss.byType[loss.type])delete loss.byType[loss.type];loss.sunk--;captured=1}
  for(const loser of defeated){capturedCommander=captureNavalCommander(s,loser,boarding);if(capturedCommander)break}
 }
 if(capturedCommander&&(capturedCommander.owner===s.player||capturedCommander.holder===s.player))log(s,'A fleet commander was taken prisoner in a boarding action.','接舷战中一名舰长被俘。');
 const transportDisruptions={};
 for(const f of all){
  f.experience=Math.min(100,f.experience+3);
  if(f.hull<12&&f.commanderId){const person=s.world?.characters?.[f.commanderId];if(person?.health==='healthy')person.health='wounded'}
  if(f.commanderId){const person=s.world?.characters?.[f.commanderId];if(person?.alive){const skill=navalSkill(person,'commander');person.navalSkills.commander=Math.min(100,skill+2)}}
  const disruption=disruptTransport(s,f,transported[f.id],{defeated:defeated.includes(f),hullDamage:snapshots[f.id].hull-f.hull,sailorLoss:losses[f.id].sailors,originalSailors:snapshots[f.id].sailors});
  if(disruption)transportDisruptions[f.id]=disruption;
 }
 const sumLoss=side=>side.reduce((sum,f)=>({sunk:sum.sunk+(losses[f.id].sunk||0),sailors:sum.sailors+(losses[f.id].sailors||0)}),{sunk:0,sailors:0});
 report(s,{kind:'battle',zone,participants:all.map(f=>f.id),snapshots,winner:winners[0].owner,losses,observedLosses:{[sideA[0].owner]:observedBattleLosses(sumLoss(sideB)),[sideB[0].owner]:observedBattleLosses(sumLoss(sideA))},captured,capturedCommander,tactics,maneuver:Object.fromEntries(all.map(f=>[f.id,Math.round(maneuvers[f.id]*100)])),weather:Math.round(weather*100),damage:Object.fromEntries(all.map(f=>[f.id,snapshots[f.id].hull-f.hull])),transportDisruptions,coordinated:true});
 for(const observer of sideA)for(const seen of sideB)observe(s,observer.owner,seen,'battle');
 for(const observer of sideB)for(const seen of sideA)observe(s,observer.owner,seen,'battle');
 for(const f of all)finalizeDestroyedFleet(s,f,log);
}
function resolvePirateClash(s,p,eligible,log){
 const lead=eligible[0],patrol=eligible.filter(f=>f.owner===lead.owner&&!f.port&&!f.reserve&&!f.mobilizing&&f.hull>0&&f.sailors>0);
 if(!patrol.length||p.ships<=0||p.pressure<24)return;
 const before={ships:p.ships,pressure:p.pressure},tactics=Object.fromEntries(patrol.map(f=>[f.id,battleTactic(s,f)]));
 const snapshots=Object.fromEntries(patrol.map(f=>[f.id,{name:[...f.name],owner:f.owner,ships:{...f.ships},sailors:f.sailors,hull:f.hull,morale:f.morale,tactic:tactics[f.id]}]));
 const powers=Object.fromEntries(patrol.map(f=>[f.id,combatPower(s,f)*tacticPower(f,tactics[f.id])]));
 const strength=patrol.reduce((sum,f)=>sum+powers[f.id],0);
 const piratePower=p.ships*2.8*(.7+p.pressure/100),weather=1+(rng(s)-.5)*.24,roll=(rng(s)-.5)*.24;
 const victory=strength*weather*(1+roll)>=piratePower*(1-roll);
 const losses={},damage={};
 const totalDamage=battleDamage(piratePower,strength,victory,'ramming','formation');let assigned=0;
 for(let i=0;i<patrol.length;i++){
  const f=patrol[i],share=i===patrol.length-1?totalDamage-assigned:Math.min(totalDamage-assigned,Math.round(totalDamage*powers[f.id]/Math.max(1,strength)));
  assigned+=share;const hull=f.hull,loss=damageFleet(s,f,share,'ramming',tactics[f.id]);adjustBattleSailors(f,loss,tactics[f.id],'ramming');
  losses[f.id]=loss;damage[f.id]=hull-f.hull;f.experience=Math.min(100,f.experience+2);
 }
 const sunk=victory?Math.min(p.ships,Math.max(1,Math.floor(strength/Math.max(1,piratePower)))):0;
 p.ships=Math.max(0,p.ships-sunk);p.wealth=Math.max(0,p.wealth-sunk);
 p.pressure=victory?Math.max(0,p.pressure-5*patrol.length-5*sunk):Math.min(70,p.pressure+3);
 const recovered=victory?pirateRecover(s,p,lead.owner):null;
 const casualties=Object.values(losses).reduce((sum,loss)=>sum+(loss.sailors||0),0);
 report(s,{kind:'pirate-clash',zone:p.zone,owner:lead.owner,participants:patrol.map(f=>f.id),snapshots,outcome:victory?'victory':'repelled',strengthBefore:before,losses,damage,sailors:casualties,pirateShipsLost:sunk,recovered,weather:Math.round(weather*100)});
 for(const f of patrol)finalizeDestroyedFleet(s,f,log);
 if(lead.owner===s.player)log(s,victory?(recovered?`Patrols defeated pirates and recovered ${recovered.amount} ${recovered.good}.`:'Patrols defeated pirate vessels.'): 'Patrols were repelled by pirates; sailors were lost.',victory?(recovered?`巡逻舰击败海盗，收回${recovered.amount}份${recovered.good}。`:'巡逻舰击败海盗船。'):'巡逻舰被海盗击退，水手有所伤亡。');
 if(p.pressure<8&&rng(s)<.3)p.zone=byId[p.zone].links[Math.floor(rng(s)*byId[p.zone].links.length)];
}
function advanceNavalCaptives(s,log){
 for(const captive of s.naval.captives){
  const person=s.world?.characters?.[captive.characterId];if(!person?.alive){captive.status='deceased';continue}
  if(captive.status==='held'&&!s.regions.some(r=>r.owner===captive.holder)){captive.status='returning';captive.remaining=0}
  if(captive.status==='held'&&captive.owner!==s.player&&s.factions[captive.owner]?.treasury>=30){ransomFleetCommander(s,captive.owner,captive.characterId);continue}
  if(captive.status!=='returning')continue;
  if(captive.remaining>0){captive.remaining--;if(captive.remaining>0)continue}
  captive.status='released';captive.releasedYear=s.year;captive.releasedMonth=s.month;delete person.missing;
  const home=s.regions.find(r=>r.owner===captive.owner&&r.port)||s.regions.find(r=>r.owner===captive.owner);person.location=home?.macro||null;
  if(captive.owner===s.player)log(s,'A captured fleet commander returned from captivity.','被俘舰长已获释归来。');
 }
}
const routeZones=route=>{const from=portZone(route.from),to=portZone(route.to);return [from,...(seaRoute(from,to)||[])]};
const hostileTradeRoute=(s,owner,route)=>{const controllers=[route?.from,route?.to].map(id=>s.regions.find(r=>r.id===id)?.owner);return controllers.every(faction=>faction&&faction!==owner)&&controllers.some(faction=>atWar(s,owner,faction))};
function aiNavalCashflow(s,owner){
 return nationalBudget(s,owner).projectedNet;
}
function aiSupplyDestination(s,owner,f){
 if(!f.port||(f.ships.transport||0)*3+(f.ships.merchant||0)*4<4||s.factions[owner].food<10)return null;
 const destinations=s.regions.filter(r=>r.owner===owner&&r.port&&r.id!==f.port&&r.food<.6&&(s.naval.provisions?.[r.id]?.owner!==owner||(s.naval.provisions[r.id].food||0)<4));
 const knownThreats=reportedHostileFleets(s,owner).filter(report=>atWar(s,owner,report.owner));
 const alreadyServed=army=>{
  if(s.naval.wagons.some(w=>w.owner===owner&&w.to===army.region))return true;
  if(Object.entries(s.naval.inlandProvisions).some(([id,store])=>store.owner===owner&&store.food>0&&inlandSupplyReach(s,owner,id,1).has(army.region)))return true;
  if(s.naval.fleets.some(other=>other.owner===owner&&other.order?.kind==='supply'&&inlandSupplyReach(s,owner,other.order.targetPort,8).has(army.region)))return true;
  return Object.entries(s.naval.provisions).some(([id,store])=>{
   if(store.owner!==owner||store.food<4)return false;
   const links=inlandSupplyReach(s,owner,id,8).get(army.region);
   return links!=null&&(links<=3||wagonSupplyPlan(s,owner,id,army.region).ok);
  });
 };
 return destinations.map(r=>{
  const path=seaRoute(f.zone,portZone(r.id));if(!path)return null;
  const reach=inlandSupplyReach(s,owner,r.id,8);
  const nearby=s.armies.filter(a=>a.owner===owner&&a.men>=1200&&a.operationalSupply<.65&&reach.has(a.region)&&!alreadyServed(a));
  if(!nearby.length)return null;
  const shortage=Math.max(...nearby.map(a=>(.65-a.operationalSupply)*Math.max(.4,1-reach.get(a.region)*.15)));
  const zones=new Set([f.zone,...path]);
  const reportedRisk=knownThreats.reduce((risk,report)=>{
   if(!zones.has(report.zone))return risk;
   const age=Math.max(0,s.year*12+s.month-(report.year*12+report.month));
   const confidence={high:24,medium:18,low:12}[report.confidence]||12;
   return risk+(confidence+Math.min(12,(report.range?.[1]||0)*2))*(1-age/5);
  },0);
  return {region:r,score:shortage*80+(0.6-r.food)*20-path.length*6-reportedRisk};
 }).filter(Boolean).sort((a,b)=>b.score-a.score)[0]?.region||null;
}
function aiWagonOrders(s,owner){
 const cashflow=aiNavalCashflow(s,owner);
 if(s.factions[owner].treasury<Math.max(40,28+3*Math.max(0,-cashflow)))return;
 const candidates=[];
 for(const [port,store] of Object.entries(s.naval.provisions)){
  if(store.owner!==owner||store.food<4)continue;
  for(const army of s.armies.filter(a=>a.owner===owner&&a.men>=1200&&a.operationalSupply<.65&&!a.move)){
   if((s.naval.inlandProvisions[army.region]?.food||0)>0)continue;
   const plan=wagonSupplyPlan(s,owner,port,army.region);
   if(plan.ok)candidates.push({port,to:army.region,plan,score:(.65-army.operationalSupply)*100-plan.months*8});
  }
 }
 const choice=candidates.sort((a,b)=>b.score-a.score||a.plan.months-b.plan.months||a.to.localeCompare(b.to))[0];
 if(choice)dispatchWagonSupply(s,owner,choice.port,choice.to);
}
function hostileSeaLanding(s,owner,origin){
 return GRAND_ROUTES.some(([from,to,kind])=>{if(kind!=='sea')return false;const other=from===origin?to:to===origin?from:null,target=s.regions.find(r=>r.id===other);return !!target?.port&&atWar(s,owner,target.owner)});
}
function aiTransportStagingPort(s,owner,f){
 if(fleetCapacity(f,s)<1200||s.factions[owner].treasury<35)return null;
 const capacity=fleetCapacity(f,s),knownThreats=reportedHostileFleets(s,owner),escortStrength=warshipCount(f);
 return s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&a.men>=1200&&a.men<=capacity&&a.region!==f.port).map(a=>{
  const origin=s.regions.find(r=>r.id===a.region&&r.owner===owner&&r.port);
  if(!origin||s.naval.fleets.some(other=>other.id!==f.id&&other.owner===owner&&other.port===origin.id&&!other.reserve&&!other.mobilizing&&!other.order?.armyId&&fleetCapacity(other,s)>=a.men&&other.hull>=40&&other.supply>=20))return null;
  if(!hostileSeaLanding(s,owner,origin.id))return null;
  const path=seaRoute(f.zone,portZone(origin.id));if(!path)return null;
  const zones=new Set([f.zone,...path]);
  if(knownThreats.some(report=>zones.has(report.zone)&&(report.range?.[1]||0)>escortStrength*1.5))return null;
  return {origin,score:a.men/1000-path.length*2};
 }).filter(Boolean).sort((a,b)=>b.score-a.score)[0]?.origin||null;
}
function aiEscortTarget(s,owner,f){
 const month=s.year*12+s.month;
 const assigned=new Set(s.naval.fleets.filter(other=>other.owner===owner&&other.id!==f.id&&other.order?.kind==='escort'&&!other.reserve).map(other=>other.order.target));
 return s.naval.routes.map(route=>{
  const last=route.last;
  if(![route.from,route.to].some(id=>s.regions.find(r=>r.id===id)?.owner===owner)||!['piracy','raid'].includes(last?.reason)||last.year*12+last.month!==month||assigned.has(route.id))return null;
  const path=seaRoute(f.zone,portZone(route.from));
  if(!path)return null;
  return {route,score:(last.reason==='raid'?18:0)+route.volume*3+(100-(Number.isFinite(last.security)?last.security:50))/10-path.length*6};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.route.id.localeCompare(b.route.id))[0]?.route||null;
}
function aiPursuitTarget(s,owner,f){
 const warships=warshipCount(f);
 if(!warships||f.hull<45||f.supply<30)return null;
 const month=s.year*12+s.month;
 const assigned=new Set(s.naval.fleets.filter(other=>other.id!==f.id&&other.owner===owner&&other.order?.kind==='intercept'&&other.order.reportId).map(other=>other.order.reportId));
 return reportedHostileFleets(s,owner).map(report=>{
  const age=month-(report.year*12+report.month),path=seaRoute(f.zone,report.zone);
  if(age>2||!path||assigned.has(report.id)||!Number.isFinite(report.range?.[1])||report.range[1]>warships*1.5)return null;
  return {report,age,distance:path.length};
 }).filter(Boolean).sort((a,b)=>a.age-b.age||a.distance-b.distance||a.report.id.localeCompare(b.report.id))[0]?.report||null;
}
function aiCoordinatedPursuitTarget(s,owner,lead){
 const warships=warshipCount;
 const ready=f=>f.owner===owner&&!f.port&&!f.order&&!f.reserve&&!f.mobilizing&&f.hull>=45&&f.supply>=30&&warships(f)>0;
 if(!ready(lead))return null;
 const month=s.year*12+s.month;
 const assigned=new Set(s.naval.fleets.filter(f=>f.owner===owner&&f.order?.kind==='intercept'&&f.order.reportId).map(f=>f.order.reportId));
 const candidates=reportedHostileFleets(s,owner).map(report=>{
  const age=month-(report.year*12+report.month),upper=report.range?.[1],path=seaRoute(lead.zone,report.zone);
  if(age<0||age>1||!Number.isFinite(upper)||!path||path.length>(2-age)*fleetSpeed(lead)||assigned.has(report.id)||upper<=warships(lead)*1.5)return null;
  const others=s.naval.fleets.filter(f=>f.id!==lead.id&&ready(f)&&!aiEscortTarget(s,owner,f))
   .map(f=>({fleet:f,path:seaRoute(f.zone,report.zone)}))
   .filter(x=>x.path&&x.path.length<=(2-age)*fleetSpeed(x.fleet))
   .sort((a,b)=>a.path.length-b.path.length||a.fleet.id.localeCompare(b.fleet.id));
  if(others.some(x=>warships(x.fleet)*1.5>=upper))return null;
  const team=[lead];let strength=warships(lead);
  for(const member of others){if(team.length>=3||strength*1.5>=upper)break;team.push(member.fleet);strength+=warships(member.fleet)}
  return strength*1.5>=upper&&team.length>1?{report,team,age,distance:path.length}:null;
 }).filter(Boolean).sort((a,b)=>a.age-b.age||a.distance-b.distance||a.report.id.localeCompare(b.report.id));
 return candidates[0]||null;
}
function issueCoordinatedPursuit(s,owner,plan){
 const before=plan.team.map(f=>({fleet:f,port:f.port,order:f.order}));
 for(const f of plan.team){
  const order=orderFleet(s,owner,f.id,'intercept',plan.report.zone);
  if(!order.ok){for(const old of before){old.fleet.port=old.port;old.fleet.order=old.order}return {ok:false,reason:order.reason}}
  f.order.reportId=plan.report.id;
 }
 return {ok:true};
}
function aiTransportShipbuilding(s,owner){
 const treasury=s.factions[owner].treasury,cashflow=aiNavalCashflow(s,owner);
 if(treasury<100||cashflow<=0)return false;
 const fleets=s.naval.fleets.filter(f=>f.owner===owner&&ships(f));
 const coastalArmies=s.armies.filter(a=>a.owner===owner&&a.men>=1200&&!a.move&&!a.siege&&s.regions.some(r=>r.id===a.region&&r.owner===owner&&r.port)&&hostileSeaLanding(s,owner,a.region)).sort((a,b)=>b.men-a.men);
 for(const army of coastalArmies){
  if(fleets.some(f=>fleetCapacity(f,s)>=army.men))continue;
  const candidate=fleets.filter(f=>f.port&&!f.reserve&&!f.mobilizing&&!f.order&&fleetCapacity(f,s)>0&&s.regions.some(r=>r.id===f.port&&r.owner===owner&&r.buildings?.includes('shipyard'))&&!s.naval.queues.some(q=>q.port===f.port)).sort((a,b)=>fleetCapacity(b,s)-fleetCapacity(a,s))[0];
  if(candidate&&aiSupplyDestination(s,owner,candidate))continue;
  const dock=candidate?.port||(!fleets.some(f=>fleetCapacity(f,s)>0)&&s.regions.find(r=>r.id===army.region&&r.buildings?.includes('shipyard'))?.id);
  if(!dock)continue;
  const queued=queueShip(s,owner,dock,'transport');
  if(queued.ok){if(candidate)s.naval.queues.at(-1).aiFleetId=candidate.id;return true}
 }
 return false;
}
function aiNavalOrders(s,owner,f){
 if(f.port&&!f.order&&s.naval.queues.some(q=>q.owner===owner&&q.aiFleetId===f.id))return;
 // Patrols and other optional station orders must not leave an AI squadron
 // offshore until its stores are empty. A spent patrol can then be staged for
 // transport or assigned another useful mission.
 if(!f.port&&['patrol','escort','intercept','blockade','raid','recon'].includes(f.order?.kind)&&(f.supply<40||f.hull<40)){
  const home=s.regions.filter(r=>r.owner===owner&&r.port).map(r=>({r,path:seaRoute(f.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length)[0];
  if(home)orderFleet(s,owner,f.id,'return',home.r.id);
  else f.order=null;
  return;
 }
 if(f.order?.kind==='patrol'&&!s.naval.pirates.some(p=>p.zone===f.zone&&p.pressure>=12)&&aiTransportStagingPort(s,owner,f))f.order=null;
 if(f.order?.kind==='blockade'&&!s.regions.some(r=>r.id===f.order.targetPort&&atWar(s,owner,r.owner)))f.order=null;
 if(f.order?.kind==='escort'){
  const order=f.order,route=s.naval.routes.find(r=>r.id===order.target);
  const from=route&&s.regions.find(r=>r.id===route.from),to=route&&s.regions.find(r=>r.id===route.to);
  if(!from||!to||from.owner!==owner&&to.owner!==owner||route.pausedBy?.includes(from.owner)||route.pausedBy?.includes(to.owner))f.order=null;
  else{
   const month=s.year*12+s.month,last=route.last;
   if(last?.year*12+last.month===month&&order.lastReviewMonth!==month){
    const zones=new Set(routeZones(route));
    const reportedThreat=reportedHostileFleets(s,owner).some(report=>zones.has(report.zone));
    order.quietMonths=['raid','piracy'].includes(last.reason)||last.security<75||reportedThreat?0:(order.quietMonths||0)+1;
    order.lastReviewMonth=month;
    if(order.quietMonths>=3)f.order=null;
   }
  }
 }
 if(f.order?.kind==='intercept'&&f.order.reportId){
  const report=reportedHostileFleets(s,owner).find(x=>x.id===f.order.reportId);
  if(!report||s.year*12+s.month-(report.year*12+report.month)>2)f.order=null;
 }
 const cashflow=aiNavalCashflow(s,owner),treasury=s.factions[owner].treasury;
 const nearbyThreat=reportedHostileFleets(s,owner).some(r=>atWar(s,owner,r.owner)&&seaRoute(f.zone,r.zone)?.length<=1);
 const wartimeReserve=Math.max(35,24+6*Math.max(0,-cashflow));
 const outnumbered=s.wars.some(w=>w.includes(owner)&&s.regions.filter(r=>r.owner===w.find(id=>id!==owner)).length>s.regions.filter(r=>r.owner===owner).length*1.5);
 const landReserveAtRisk=outnumbered&&treasury<wartimeReserve;
 // A smaller army needs one ordinary 24-treasury levy plus a year's projected
 // operating deficit. Preserve that reserve before paying for optional patrols.
 // The fleet can still sail when a nearby hostile fleet is actually reported.
 const landWarFloor=24+12*Math.max(0,-cashflow);
 const retireOptionalFleet=cashflow< -6&&(!nearbyThreat||landReserveAtRisk)&&(treasury<110||outnumbered&&treasury<=landWarFloor)||treasury<24&&!nearbyThreat;
 if(f.reserve){
  const activeCashflow=cashflow-fleetUpkeepDue({...f,reserve:false})+fleetUpkeepDue(f);
  const reserveFloor=cashflow< -6&&(!nearbyThreat||outnumbered)?116:0;
  const canSustain=treasury>=Math.max(35,26+(outnumbered?6:3)*Math.max(0,-activeCashflow),reserveFloor);
  if(canSustain&&(nearbyThreat||cashflow>3&&treasury>=75))mobilizeFleet(s,owner,f.id);
  return;
 }
 if(f.order&&cashflow<0&&treasury<wartimeReserve&&(!nearbyThreat||landReserveAtRisk)&&!f.order.armyId&&!['return','supply'].includes(f.order.kind)){
  const home=s.regions.filter(r=>r.owner===owner&&r.port).sort((a,b)=>(seaRoute(f.zone,portZone(a.id))?.length??99)-(seaRoute(f.zone,portZone(b.id))?.length??99))[0];
  if(home)orderFleet(s,owner,f.id,'return',home.id);
  return;
 }
 if(f.order||f.mobilizing)return;
 if(f.supply<25||f.hull<35){if(f.port){if(retireOptionalFleet)reserveFleet(s,owner,f.id);return}const home=s.regions.filter(r=>r.owner===owner&&r.port).sort((a,b)=>(seaRoute(f.zone,portZone(a.id))?.length??99)-(seaRoute(f.zone,portZone(b.id))?.length??99))[0];if(home)orderFleet(s,owner,f.id,'return',home.id);return}
 if(!f.port&&retireOptionalFleet){const home=s.regions.filter(r=>r.owner===owner&&r.port).map(r=>({id:r.id,path:seaRoute(f.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length)[0];if(home)return orderFleet(s,owner,f.id,'return',home.id)}
 const transportBudget=treasury>=Math.max(35,26+3*Math.max(0,-cashflow));
 if(transportBudget&&f.port&&s.armies.some(a=>a.owner===owner&&a.region===f.port&&!a.move&&!a.siege&&a.men>=1200&&a.men<=fleetCapacity(f,s)&&hostileSeaLanding(s,owner,f.port)))return;
 if(f.port&&retireOptionalFleet){reserveFleet(s,owner,f.id);return}
 if(treasury>=40){const destination=aiSupplyDestination(s,owner,f);if(destination)return orderFleet(s,owner,f.id,'supply',destination.id)}
 if(transportBudget){const embarkation=aiTransportStagingPort(s,owner,f);if(embarkation)return orderFleet(s,owner,f.id,'return',embarkation.id)}
 const threatened=(f.ships.trireme||f.ships.light||f.ships.quadrireme||f.ships.quinquereme)&&aiEscortTarget(s,owner,f);if(threatened)return orderFleet(s,owner,f.id,'escort',threatened.id);
 if(treasury>=wartimeReserve){const group=aiCoordinatedPursuitTarget(s,owner,f);if(group){const sent=issueCoordinatedPursuit(s,owner,group);if(sent.ok)return sent}}
 const pirate=s.naval.pirates.find(p=>p.zone===f.zone&&p.pressure>18);if(pirate&&(f.ships.trireme||f.ships.light||f.ships.quadrireme||f.ships.quinquereme))return orderFleet(s,owner,f.id,'patrol',f.zone);
 const pursuit=aiPursuitTarget(s,owner,f);if(pursuit){const order=orderFleet(s,owner,f.id,'intercept',pursuit.zone);if(order.ok)f.order.reportId=pursuit.id;return order}
 const known=reportedHostileFleets(s,owner),enemyPort=s.regions.find(r=>r.port&&atWar(s,owner,r.owner)&&seaRoute(f.zone,portZone(r.id))?.length<=1&&!known.some(x=>x.zone===portZone(r.id)&&x.range[1]>warshipCount(f)*1.5));if(enemyPort&&blockadePower(f)>0&&combatPower(s,f)>4)return orderFleet(s,owner,f.id,'blockade',enemyPort.id);
}
function updatePursuitOrders(s,log){
 for(const f of s.naval.fleets){
  const order=f.order;if(order?.kind!=='intercept'||!order.reportId)continue;
  const sighting=reportedHostileFleets(s,f.owner).find(report=>report.id===order.reportId&&s.year*12+s.month-(report.year*12+report.month)<=2);
  if(!sighting){f.order=null;if(f.owner===s.player)log(s,'Fleet pursuit ended: the sighting expired or the target is no longer hostile.','舰队追击结束：目击情报过期，或目标已不再交战。');continue}
  if(sighting.zone===order.target)continue;
  const path=seaRoute(f.zone,sighting.zone);
  if(!path){f.order=null;continue}
  order.target=sighting.zone;order.path=path;
  if(f.owner===s.player)log(s,'Fleet pursuit changed course after a new dated sighting. The target may have moved again.','舰队根据新的注明日期的目击报告改航；目标仍可能再次移动。');
 }
}
function settleAIMerchantDisputes(s){
 const reviewed=new Set();
 for(const dispute of s.naval.disputes){
  const buyer=dispute.buyer;
  if(dispute.status!=='open'||buyer===s.player||reviewed.has(buyer)||s.year*12+s.month<=dispute.year*12+dispute.month)continue;
  reviewed.add(buyer);
  if(s.factions[buyer]?.treasury<dispute.compensation+30||nationalBudget(s,buyer).projectedNet<0)continue;
  settleMerchantDispute(s,buyer,dispute.id);
 }
}
function markTransportArrival(s,f,order){
 const army=s.armies.find(a=>a.id===order.armyId);
 if(!army?.move?.sea||army.move.transportFleetId!==f.id||army.move.returning){f.port=null;f.order=null;return}
 army.move.transportReady=true;order.arrived=true;
 // The convoy may dock at a friendly harbor, but a hostile harbor remains closed.
 f.port=s.regions.find(r=>r.id===order.targetPort)?.owner===f.owner?order.targetPort:null;
}
function reviewPirateSponsorship(s,p,patrol,log){
 const sponsor=p.backer;if(!sponsor||!s.factions[sponsor])return;
 if(p.ships<=0){p.backer=null;return}
 const now=s.year*12+s.month,observers=new Set(patrol.map(f=>f.owner));
 for(const route of s.naval.routes){
  const dispatched=route.lastDispatch,age=dispatched?now-(dispatched.year*12+dispatched.month):Infinity;
  if(age<0||age>2||!routeZones(route).includes(p.zone))continue;
  for(const id of [route.from,route.to])observers.add(s.regions.find(r=>r.id===id)?.owner);
 }
 for(const voyage of s.naval.voyages.filter(v=>v.zone===p.zone))for(const owner of [voyage.buyer,voyage.seller,voyage.vesselOwner])observers.add(owner);
 for(const job of s.naval.jobs.filter(j=>j.kind==='intelligence'&&j.remaining===0)){
  if(s.regions.some(r=>r.owner===job.owner&&r.port&&portZone(r.id)===p.zone))observers.add(job.owner);
 }
 observers.delete(sponsor);observers.delete('rebels');observers.delete(undefined);
 const victims=[...observers].filter(owner=>s.factions[owner]).sort();if(!victims.length)return;
 const patrolCount=patrol.filter(f=>f.owner!==sponsor).length;
 const counterintelligence=Math.max(0,...victims.map(owner=>navalJobEffect(s,owner,'intelligence')));
 const cover=navalJobEffect(s,sponsor,'intelligence');
 const chance=Math.max(.01,Math.min(.28,.02+patrolCount*.04+counterintelligence*.02-cover*.015));
 if(rng(s)>=chance)return;
 p.backer=null;s.factions[sponsor].legitimacy=Math.max(0,s.factions[sponsor].legitimacy-3);
 for(const victim of victims){const key=[sponsor,victim].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]??0)-4)}
 report(s,{kind:'scandal',zone:p.zone,owner:sponsor,victims,relationLoss:4,pirateId:p.id});
 if(sponsor===s.player)log(s,'Secret pirate support was exposed; legitimacy and foreign relations fell.','秘密资助海盗曝光，合法性及对外关系下降。');
 else if(victims.includes(s.player))log(s,'Evidence linked a foreign court to pirates in your waters; relations fell.','证据显示外国宫廷资助了本国海域的海盗；双方关系下降。');
}
export function advanceNaval(s,log=()=>{}){initializeNaval(s);if(!s.naval)return;const n=s.naval,avoidedNavalBattles=new Set();reportInterruptedGrainShortages(s,log);advanceWagons(s,log);consumeMaritimeProvisions(s);produceGoods(s);for(const j of [...n.jobs]){const p=s.world?.characters?.[j.characterId],budget=s.factions[j.owner];if(!p?.alive||p.faction!==j.owner||j.port&&s.regions.find(r=>r.id===j.port)?.owner!==j.owner){n.jobs.splice(n.jobs.indexOf(j),1);continue}if(j.remaining>0){j.remaining--;continue}budget.treasury=Math.max(-100,budget.treasury-1);if(budget.treasury<0)p.loyalty=Math.max(0,p.loyalty-1);j.experience=(j.experience||0)+1;if(j.experience%12===0){const skill=navalSkill(p,j.kind);p.navalSkills[j.kind]=Math.min(100,skill+2)}}
 for(const f of n.fleets)finalizeDestroyedFleet(s,f,log);
for(const q of [...n.queues]){
 const yard=s.regions.find(r=>r.id===q.port);
 if(yard?.owner!==q.owner||!yard.buildings?.includes('shipyard')){
  n.queues.splice(n.queues.indexOf(q),1);
  if(q.owner===s.player)log(s,'Shipbuilding stopped when the shipyard was lost.','船厂失守，造船工程中止。');
  continue;
 }
 if(shipyardWorkers(yard)<SHIPYARD_MIN_WORKERS){
  if(q.stalledReason!=='workers'&&q.owner===s.player)log(s,'Shipbuilding paused: the port has too few workers. The crew remains reserved.','港口劳动力不足，造船暂停；已征募水手仍予保留。');
  q.stalledReason='workers';continue;
 }
 if(q.stalledReason==='workers'&&q.owner===s.player)log(s,'Shipbuilding resumed as port labor recovered.','港口劳动力恢复，造船继续。');
 q.stalledReason=null;q.remaining--;
 if(q.remaining>0)continue;
 n.queues.splice(n.queues.indexOf(q),1);
 let f=n.fleets.find(x=>x.owner===q.owner&&x.port===q.port&&!x.order&&!x.reserve);
 if(!f){f=makeFleet(`fleet-${n.nextFleet++}`,[`Fleet at ${site(q.port)?.site[0]||q.port}`,`${site(q.port)?.site[1]||q.port}舰队`],q.owner,q.port,{});n.fleets.push(f)}
 const existingShips=ships(f);f.ships[q.type]=(f.ships[q.type]||0)+1;
 f.hull=existingShips?Math.round((f.hull*existingShips+100)/(existingShips+1)):100;
 f.sailors+=SHIPS[q.type].crew;
 if(q.owner===s.player)log(s,`A ${SHIPS[q.type].name[0]} was launched at ${site(q.port)?.site[0]}.`,`${SHIPS[q.type].name[1]}在${site(q.port)?.site[1]}下水。`);
}
 updatePursuitOrders(s,log);
 for(const f of n.fleets){
  const lostHarbor=f.port&&s.regions.find(r=>r.id===f.port)?.owner!==f.owner;
  if(!lostHarbor&&(!f.reserve||f.port))continue;
  const wasReserve=!!f.reserve;
  f.reserve=false;f.mobilizing=0;f.port=null;
  if(wasReserve)f.hull=Math.max(20,f.hull-8);
  if(f.owner===s.player)log(s,wasReserve?'The fleet lost its safe harbor and left reserve at reduced readiness.':'The fleet lost its harbor and sailed offshore.',wasReserve?'舰队失去安全港，仓促出港，船况受损。':'舰队失去港口，驶往近海。');
 }
 for(const f of n.fleets)if(f.order?.kind==='raid'&&!hostileTradeRoute(s,f.owner,n.routes.find(r=>r.id===f.order.target))){f.order=null;if(f.owner===s.player)log(s,'The trade raid ended because its route no longer serves an enemy.','商路不再涉及敌方，袭扰命令已结束。')}
 for(const f of n.fleets){
  const order=f.order;
  if(order?.kind!=='return'||order.targetPort&&s.regions.find(r=>r.id===order.targetPort)?.owner===f.owner)continue;
  const oldPort=order.targetPort;
  const home=s.regions.filter(r=>r.owner===f.owner&&r.port).map(r=>({id:r.id,path:seaRoute(f.zone,portZone(r.id))})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length)[0];
  if(!home){
   order.target=null;order.targetPort=null;order.path=[];
   const army=s.armies.find(a=>a.id===order.armyId&&a.move?.returning&&a.move.transportFleetId===f.id);
   if(army){army.move.to=null;army.move.final=null}
   if(oldPort&&f.owner===s.player)log(s,army?'The return harbor was lost; the troop convoy is waiting offshore for a friendly port.':'The return harbor was lost; the fleet is waiting offshore with its cargo.',army?'返航港口失守，运兵舰队正在近海等待友方港口。':'返航港口失守，舰队携货在近海等待。');
   continue;
  }
  order.target=home.id;order.targetPort=home.id;order.path=home.path;
  const army=s.armies.find(a=>a.id===order.armyId&&a.move?.returning&&a.move.transportFleetId===f.id);if(army){army.move.to=home.id;army.move.final=home.id}
  if(oldPort&&f.owner===s.player)log(s,'The return harbor was lost; the fleet diverted to another friendly port.','返航港口失守，舰队改驶另一友方港口。');
 }
 for(const f of n.fleets){if(!ships(f))continue;const budget=s.factions[f.owner];if(f.pendingCommanderId){f.pendingMonths--;if(f.pendingMonths<=0){const person=s.world?.characters?.[f.pendingCommanderId];if(person?.alive&&person.faction===f.owner&&!person.missing){f.commanderId=f.pendingCommanderId;f.morale=Math.min(100,f.morale+2)}f.pendingCommanderId=null;f.pendingMonths=0}}const upkeep=fleetUpkeepDue(f);budget.treasury=Math.max(-100,budget.treasury-upkeep);if(budget.treasury<0){f.morale=Math.max(10,f.morale-3);const commander=s.world?.characters?.[f.commanderId];if(commander)commander.loyalty=Math.max(0,commander.loyalty-1)}if(f.port){const dock=s.regions.find(r=>r.id===f.port);f.supply=Math.min(100,f.supply+25+(dock?.buildings?.includes('naval-depot')?12:0)+navalJobEffect(s,f.owner,'harbor',f.port)*4);if(!f.reserve&&dock?.buildings?.includes('shipyard')&&f.hull<100&&budget.treasury>=3&&(s.development?.[f.owner]?.materials?.timber||0)>=1){budget.treasury-=3;s.development[f.owner].materials.timber--;f.hull=Math.min(100,f.hull+8+(dock.buildings.includes('dockyard')?8:0)+(activeEffects(s,f.owner).navalRepair||0)+navalJobEffect(s,f.owner,'engineer',f.port)*3)}const crewNeeded=Object.entries(f.ships).reduce((n,[type,count])=>n+(SHIPS[type]?.crew||0)*count,0)-f.sailors;if(!f.reserve&&crewNeeded>0&&budget.treasury>=2&&budget.manpower>0){const recruited=Math.min(30,crewNeeded,budget.manpower);budget.treasury-=2;budget.manpower-=recruited;f.sailors+=recruited}if(!f.reserve&&dock?.buildings?.includes('naval-training'))f.experience=Math.min(100,f.experience+2)}else{f.supply=Math.max(0,f.supply-8+(activeEffects(s,f.owner).navalSupply||0));if(f.supply===0)f.morale=Math.max(10,f.morale-3)}maritimeHazards(s,f,log);rerouteCargoReturn(s,f);const order=f.order;if(!order||order.kind==='transport'&&order.arrived)continue;if(order.path.length){for(let step=0;step<fleetSpeed(f)&&order.path.length;step++){f.zone=order.path.shift();if(order.kind==='transport')order.departed=true}f.port=null}else if(order.targetPort){f.zone=portZone(order.targetPort);if(order.kind==='return'||order.kind==='transport'){f.port=order.targetPort;if(order.kind==='return'&&order.cargo){budget.food=Math.min(budget.foodCapacity||100,budget.food+order.cargo);report(s,{kind:'supply-return',owner:f.owner,port:order.targetPort,cargo:order.cargo})}if(order.kind==='return'&&order.armyId)completeTransportReturn(s,f,order,log);if(order.kind==='transport')markTransportArrival(s,f,order);else f.order=null}}if(order.kind==='recon'&&!order.path.length){resolveReconOrder(s,f,avoidedNavalBattles,log);f.order=null}}
 for(const f of n.fleets)finalizeDestroyedFleet(s,f,log);
  // Sharing a sea zone does not expose a fleet sheltered in harbor to an
  // open-water encounter. It must sortie before a patrol can engage it.
  const resolvedEncounters=new Set();
  const pursuitGroup=lead=>lead.order?.kind==='intercept'&&lead.order.reportId
   ?n.fleets.filter(f=>f.owner===lead.owner&&f.zone===lead.zone&&!f.port&&ships(f)&&f.order?.kind==='intercept'&&f.order.reportId===lead.order.reportId)
   :[lead];
  for(const a of n.fleets)for(const b of n.fleets){
   const key=encounterKey(a.id,b.id);
   if(a.id>=b.id||!ships(a)||!ships(b)||a.zone!==b.zone||!atWar(s,a.owner,b.owner)||avoidedNavalBattles.has(key)||resolvedEncounters.has(key)||a.port||b.port)continue;
   const sideA=pursuitGroup(a),sideB=pursuitGroup(b);
   if(sideA.length>1||sideB.length>1){
    resolveCoordinatedBattle(s,sideA,sideB,a.zone,log);
    for(const own of sideA)for(const enemy of sideB)resolvedEncounters.add(encounterKey(own.id,enemy.id));
   }else resolveBattle(s,a,b,a.zone,log);
  }
 finishMaritimeSupply(s,log);
 for(const p of n.pirates){const patrol=n.fleets.filter(f=>f.zone===p.zone&&!f.port&&!f.reserve&&!f.mobilizing&&f.hull>0&&f.sailors>0&&warshipCount(f)>0&&['patrol','escort','intercept'].includes(f.order?.kind));if(patrol.length){if(p.ships>0&&p.pressure>=24){for(const owner of new Set(patrol.map(f=>f.owner))){if(p.ships<=0||p.pressure<24)break;resolvePirateClash(s,p,patrol.filter(f=>f.owner===owner),log)}}else p.pressure=Math.max(0,p.pressure-patrol.length*5)}else p.pressure=p.ships>0?Math.min(70,p.pressure+1):Math.max(0,p.pressure-2);reviewPirateSponsorship(s,p,patrol,log)}
 advanceTradeVoyages(s,log);for(const route of [...n.routes].sort((a,b)=>(a.lastDispatch?a.lastDispatch.year*12+a.lastDispatch.month:-Infinity)-(b.lastDispatch?b.lastDispatch.year*12+b.lastDispatch.month:-Infinity)))dispatchTradeVoyage(s,route,log);
 settleAIMerchantDisputes(s);
 for(const f of n.fleets)if(f.order?.kind==='blockade'&&!blockadePower(f)){f.order=null;if(f.owner===s.player)log(s,'The blockade ended: the fleet lacks fit, crewed warships.','封锁已结束：舰队缺少可用且有足够水手的战船。')}
 for(const f of n.fleets){if(f.mobilizing){f.mobilizing--;if(f.mobilizing<=0){f.mobilizing=0;f.reserve=false;f.morale=Math.min(100,f.morale+2);if(f.owner===s.player)log(s,'The fleet has completed mobilization and can receive orders.','舰队完成整备，可以接受命令。')}}}
 for(const owner of Object.keys(s.factions).filter(x=>x!==s.player&&x!=='rebels')){const transportQueued=aiTransportShipbuilding(s,owner);for(const f of n.fleets.filter(x=>x.owner===owner&&ships(x)))aiNavalOrders(s,owner,f);if(!transportQueued&&s.month===1&&s.factions[owner].treasury>90&&aiNavalCashflow(s,owner)>0){const dock=s.regions.find(r=>r.owner===owner&&r.buildings?.includes('shipyard'));if(dock)queueShip(s,owner,dock.id,'light')}}
 for(const owner of Object.keys(s.factions).filter(x=>x!==s.player&&x!=='rebels'))aiWagonOrders(s,owner);
 advanceNavalCaptives(s,log);
}
export function supportPirates(s,owner,id){initializeNaval(s);const p=s.naval.pirates.find(x=>x.id===id),f=s.factions[owner];if(!p||!f||f.treasury<12||p.backer===owner)return {ok:false,reason:'resources'};f.treasury-=12;p.backer=owner;p.ships=Math.max(1,p.ships);p.pressure=Math.min(70,p.pressure+8);return {ok:true}}
