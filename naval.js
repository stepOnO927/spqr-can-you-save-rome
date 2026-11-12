import {GRAND_SITES,GRAND_ROUTES} from './grand-map-data.js';
import {activeEffects} from './development.js?v=28';
import {officeOf} from './office-system.js';
import {nationalBudget} from './national-budget.js?v=8';

// Sea areas and costs are game-scale approximations of the 49 BCE Mediterranean.
export const SEA_ZONES=[
 {id:'western',name:['Western Mediterranean','西地中海'],point:[2,39],links:['ligurian','african']},
 {id:'ligurian',name:['Ligurian Sea','利古里亚海'],point:[8.5,42.5],links:['western','tyrrhenian']},
 {id:'tyrrhenian',name:['Tyrrhenian Sea','第勒尼安海'],point:[12,40],links:['ligurian','sicilian','central']},
 {id:'sicilian',name:['Sicilian Waters','西西里海域'],point:[15,37.5],links:['tyrrhenian','central','ionian','african']},
 {id:'adriatic',name:['Adriatic Sea','亚得里亚海'],point:[16.8,42.3],links:['ionian']},
 {id:'ionian',name:['Ionian Sea','爱奥尼亚海'],point:[19.2,38],links:['adriatic','sicilian','aegean','central']},
 {id:'aegean',name:['Aegean Sea','爱琴海'],point:[25.5,38.3],links:['ionian','eastern']},
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
 merchant:{name:['Merchant vessel','商船'],cost:17,months:3,crew:45,power:0,speed:1,upkeep:1,capacity:4,materials:{timber:2}},
 transport:{name:['Military transport','军用运输船'],cost:20,months:3,crew:70,power:1,speed:1,upkeep:2,capacity:3000,materials:{timber:2}}
};
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
export const fleetUpkeepDue=f=>(f.reserve&&f.port?Math.max(1,Math.ceil(fleetUpkeep(f)*.35)):fleetUpkeep(f))+(f.commanderId?1:0);
export function portZone(id){const s=site(id);if(!s)return null;if(['italiaS','illyricum','epirus'].includes(id))return 'adriatic';if(id==='egypt')return 'alexandrian';if(id==='sicilia')return 'sicilian';if(id==='t016'||s.macro==='roma')return 'tyrrhenian';if(s.macro==='cisalpine'&&s.lon>11)return 'adriatic';if(s.macro==='italiaN'&&s.lon>11)return 'adriatic';if(s.macro==='africa'||s.macro==='numidia'||s.macro==='mauretania')return 'african';if(s.macro==='achaia'||s.macro==='anatolia')return 'aegean';if(s.macro==='syria')return 'eastern';return SEA_ZONES.reduce((best,z)=>Math.hypot((s.lon-z.point[0])*Math.cos(s.lat*Math.PI/180),s.lat-z.point[1])<Math.hypot((s.lon-best.point[0])*Math.cos(s.lat*Math.PI/180),s.lat-best.point[1])?z:best).id}
export function seaRoute(from,to){if(!byId[from]||!byId[to])return null;if(from===to)return [];const previous=new Map([[from,null]]),queue=[from];while(queue.length){const id=queue.shift();for(const next of byId[id].links){if(previous.has(next))continue;previous.set(next,id);if(next===to){const path=[];let at=to;while(at!==from){path.unshift(at);at=previous.get(at)}return path}queue.push(next)}}return null}
const makeFleet=(id,name,owner,port,composition,commanderId=null)=>({id,name,owner,port,zone:portZone(port),commanderId,ships:{...composition},sailors:Object.entries(composition).reduce((n,[k,v])=>n+(SHIPS[k]?.crew||0)*v,0),morale:65,experience:18,supply:100,hull:100,tactic:'formation',order:null});
const additionalRoutes=[
 ['narbo-wine','narbo','t016','wine',2],['african-oil','africa','t016','oil',2],['eastern-stone','t091','t016','stone',1],['aegean-textiles','egypt','anatolia','textiles',2],['egypt-papyrus','egypt','t016','papyrus',2],['levant-luxury','t114','t016','luxury',1],['western-horses','mauretania','t016','horses',1],['pontic-timber','t092','t016','timber',2],['hispanic-metal','hispaniaN','t016','metal',1]
];
function ensureTrade(s){s.naval.stock||={};for(const owner of Object.keys(s.factions)){s.naval.stock[owner]||={wine:0,oil:0,textiles:0,papyrus:0,luxury:0,horses:0}}for(const [id,from,to,good,volume] of additionalRoutes)if(!s.naval.routes.some(r=>r.id===id))s.naval.routes.push({id,from,to,good,volume,last:null})}
function produceGoods(s){ensureTrade(s);for(const r of s.regions.filter(x=>x.port)){const stock=s.naval.stock[r.owner];if(!stock)continue;const kinds=({narbo:['wine'],africa:['oil'],egypt:['papyrus','textiles'],syria:['luxury'],mauretania:['horses'],achaia:['wine'],anatolia:['textiles']})[r.macro]||[];for(const kind of kinds)stock[kind]=Math.min(30,(stock[kind]||0)+1)}}
function transferGood(s,from,to,good,planned){const origin=s.factions[from],destination=s.factions[to];if(!origin||!destination)return 0;const material=['timber','metal','stone'].includes(good),grain=good==='grain',left=grain?origin.food:material?s.development?.[from]?.materials?.[good]:s.naval.stock[from]?.[good],right=grain?destination.food:material?s.development?.[to]?.materials?.[good]:s.naval.stock[to]?.[good],cap=grain?(destination.foodCapacity??100):material?100:20;if(left==null||right==null)return 0;const amount=Math.max(0,Math.min(planned,left,cap-right));if(amount<=0)return 0;if(grain){origin.food-=amount;destination.food+=amount}else if(material){s.development[from].materials[good]-=amount;s.development[to].materials[good]+=amount}else{s.naval.stock[from][good]-=amount;s.naval.stock[to][good]+=amount}return amount}
function cargoAccount(s,owner,good){if(good==='grain')return {stock:s.factions[owner],key:'food',cap:s.factions[owner].foodCapacity??100};if(['timber','metal','stone'].includes(good))return {stock:s.development?.[owner]?.materials,key:good,cap:100};return {stock:s.naval.stock?.[owner],key:good,cap:20}}
function pirateSeize(s,p,owner,good,planned){const account=cargoAccount(s,owner,good);if(!account.stock)return 0;const amount=Math.max(0,Math.min(planned,account.stock[account.key]||0));account.stock[account.key]-=amount;p.cargo||={};p.cargo[good]=(p.cargo[good]||0)+amount;return amount}
function pirateRecover(s,p,owner){p.cargo||={};for(const [good,held] of Object.entries(p.cargo)){const account=cargoAccount(s,owner,good);if(!account.stock||held<=0)continue;const amount=Math.max(0,Math.min(held,account.cap-(account.stock[account.key]||0),1));if(!amount)continue;p.cargo[good]-=amount;account.stock[account.key]=(account.stock[account.key]||0)+amount;return {good,amount}}return null}
function tradeUnitPrice(s,route,zones,buyer){
 const base=route.good==='grain'?1:route.good==='luxury'?4:route.good==='horses'?3:2;
 const distance=Math.floor(Math.max(0,zones.length-2)/2);
 const stock=route.good==='grain'?s.factions[buyer].food:['stone','timber','metal'].includes(route.good)?s.development?.[buyer]?.materials?.[route.good]:s.naval.stock[buyer]?.[route.good];
 const scarce=stock!=null&&stock<(route.good==='grain'?25:4)?1:0;
 return base+distance+scarce;
}
function settleRoute(s,route,log,merchantCapacity){
 const n=s.naval,from=s.regions.find(r=>r.id===route.from),to=s.regions.find(r=>r.id===route.to);if(!from||!to)return;
 const zones=routeZones(route),war=atWar(s,from.owner,to.owner),block=n.fleets.some(f=>f.order?.kind==='blockade'&&[route.from,route.to].includes(f.order.targetPort)&&f.zone===portZone(f.order.targetPort)&&atWar(s,f.owner,s.regions.find(r=>r.id===f.order.targetPort)?.owner));
 const vessel=n.fleets.find(f=>(f.owner===from.owner||f.owner===to.owner)&&(merchantCapacity.get(f.id)||0)>0&&zones.includes(f.zone)&&f.hull>20),merchant=!!vessel,piracy=Math.max(0,...n.pirates.filter(p=>zones.includes(p.zone)).map(p=>p.pressure)),relations=s.relations?.[[from.owner,to.owner].sort().join(':')]??0;
 const escorts=n.fleets.filter(f=>zones.includes(f.zone)&&['patrol','escort'].includes(f.order?.kind)&&ships(f)),raiders=n.fleets.filter(f=>f.order?.kind==='raid'&&f.order.target===route.id&&zones.includes(f.zone)&&ships(f)&&f.owner!==from.owner&&f.owner!==to.owner&&hostileTradeRoute(s,f.owner,route));
 let security=Math.max(0,Math.min(100,100-piracy+escorts.length*16-raiders.length*28+(activeEffects(s,to.owner).navalSecurity||0)+navalJobEffect(s,to.owner,'harbor',to.id)*4-(war?35:0)));if(block)security=0;
 const safe=security>=50||rng(s)<security/50,price=tradeUnitPrice(s,route,zones,to.owner);let amount=0,captured=0,paid=0,reason='delivered';
 const foodBudget=route.good==='grain'&&from.owner!==to.owner?nationalBudget(s,to.owner):null;
 const grainNeed=foodBudget?Math.max(0,Math.ceil(Math.max(18,12+3*Math.max(0,-foodBudget.foodNet))-s.factions[to.owner].food)):Infinity;
 const buyerHoldings=foodBudget?s.regions.filter(r=>r.owner===to.owner).length:0;
 const outnumbered=foodBudget&&s.wars.some(w=>w.includes(to.owner)&&s.regions.filter(r=>r.owner===w.find(id=>id!==to.owner)).length>buyerHoldings*1.5);
 const grainCashFloor=outnumbered&&s.factions[to.owner].food>=6+3*Math.max(0,-foodBudget.foodNet)?24:0;
 if(block)reason='blockade';else if(war)reason='war';else if(from.owner!==to.owner&&relations<=-40)reason='diplomacy';else if(!grainNeed)reason='stocked';else if(!merchant)reason='merchant';else{
  merchantCapacity.set(vessel.id,merchantCapacity.get(vessel.id)-1);
  if(raiders.length&&security<75){
   reason='raid';const raider=raiders[0];raider.supply=Math.max(0,raider.supply-3);
   captured=transferGood(s,from.owner,raider.owner,route.good,Math.max(1,Math.min(route.volume,Math.floor(combatPower(s,raider)/3))));
   report(s,{kind:'trade-raid',zone:raider.zone,owner:to.owner,raider:raider.owner,good:route.good,captured});
   if(captured&&!atWar(s,raider.owner,from.owner)){
    const key=[raider.owner,from.owner].sort().join(':');
    s.relations[key]=Math.max(-100,(s.relations[key]??0)-6);
    report(s,{kind:'trade-incident',zone:raider.zone,owner:from.owner,raider:raider.owner,good:route.good,captured});
    if(from.owner===s.player||raider.owner===s.player)log(s,'A raid on enemy commerce seized neutral cargo and damaged relations with its origin.','袭扰敌方商路时夺取中立商人的货物，损害了与货源地的关系。');
   }
   if(to.owner===s.player||from.owner===s.player||raider.owner===s.player)log(s,'A hostile fleet seized cargo from a maritime shipment.','敌方舰队夺走海上货运的货物。');
  }else if(!safe)reason='piracy';else if(from.owner!==to.owner&&s.factions[to.owner].treasury<price+grainCashFloor)reason=grainCashFloor?'war-reserve':'payment';else{
   const planned=route.volume+(activeEffects(s,to.owner).navalTrade||0)+(s.development?.[to.owner]?.knownMaterial?.includes('maritime-warehousing')?1:0)+navalJobEffect(s,to.owner,'trade')+(to.buildings?.includes('warehouse')?1:0);
   const affordable=from.owner===to.owner?planned:Math.floor((s.factions[to.owner].treasury-grainCashFloor)/price);
   amount=transferGood(s,from.owner,to.owner,route.good,Math.min(planned,affordable,grainNeed));
   if(amount){paid=from.owner===to.owner?0:amount*price;s.factions[to.owner].treasury-=paid;s.factions[from.owner].treasury+=paid}else reason=affordable<1?'payment':'capacity';
  }
 }
 if(reason==='piracy'&&piracy>20&&rng(s)<piracy/100){const p=n.pirates.find(x=>zones.includes(x.zone)),victim=n.fleets.find(f=>(f.owner===from.owner||f.owner===to.owner)&&(f.ships.merchant||0)>0&&!f.reserve&&f.zone===p?.zone);if(p&&victim){captured=pirateSeize(s,p,from.owner,route.good,route.volume);p.wealth+=captured;p.pressure=Math.min(70,p.pressure+2);damageFleet(s,victim,3);report(s,{kind:'pirate-raid',zone:p.zone,owner:victim.owner,good:route.good,captured});if(victim.owner===s.player)log(s,'Pirates struck a merchant vessel and seized cargo.','海盗袭击商船并夺走货物。')}}
 route.last={year:s.year,month:s.month,amount,security,reason,unitPrice:price,paid,captured};if(route.id==='egypt-italy'&&to.owner===s.player&&amount===0&&security<40){s.factions[to.owner].stability=Math.max(0,s.factions[to.owner].stability-1);log(s,'Egyptian grain delivery was disrupted.','埃及粮船受阻，稳定度下降。')}
}
export function initializeNaval(s){if(!s.grandMap)return s;if(s.naval){s.naval.intel||={};s.naval.reports||=[];s.naval.queues||=[];s.naval.jobs||=[];s.naval.captives||=[];s.naval.provisions||={};for(const p of s.naval.pirates||[])p.cargo||={};ensureTrade(s);return s}const senatePort=s.regions.find(r=>r.id==='italiaS'&&r.owner==='senate')?'italiaS':'epirus',caesarPort=s.regions.find(r=>r.id==='cisalpine'&&r.owner==='caesar')?'cisalpine':'narbo';s.naval={version:1,fleets:[makeFleet('senate-adriatic',['Adriatic Squadron','亚得里亚分舰队'],'senate',senatePort,{trireme:2,transport:2}),makeFleet('caesar-adriatic',['Caesarian Coastal Fleet','凯撒沿岸舰队'],'caesar',caesarPort,{trireme:2,light:2,transport:2}),makeFleet('egypt-grain',['Alexandrian Grain Fleet','亚历山大运粮船队'],'egypt','egypt',{trireme:1,merchant:3})],pirates:[{id:'illyrian-raiders',zone:'adriatic',ships:2,pressure:24,wealth:8,backer:null,cargo:{}},{id:'cilician-raiders',zone:'eastern',ships:2,pressure:20,wealth:7,backer:null,cargo:{}}],routes:[{id:'egypt-italy',from:'egypt',to:'t016',good:'grain',volume:4,last:null},{id:'africa-sicily',from:'africa',to:'sicilia',good:'grain',volume:2,last:null},{id:'adriatic-commerce',from:'illyricum',to:'italiaS',good:'timber',volume:2,last:null}],queues:[],reports:[],intel:{},jobs:[],captives:[],provisions:{},nextFleet:1};for(const id of [senatePort,caesarPort]){const r=s.regions.find(x=>x.id===id);if(!r)continue;r.buildings||=[];for(const b of ['port','shipyard'])if(!r.buildings.includes(b))r.buildings.push(b);const d=s.development?.[r.owner];if(d)for(const tech of ['port-facilities','shipyard-craft'])if(!d.knownMaterial.includes(tech))d.knownMaterial.push(tech)}ensureTrade(s);return s}
export function fleet(s,id){return s.naval?.fleets.find(f=>f.id===id)}
export function setFleetTactic(s,owner,id,tactic){initializeNaval(s);const f=fleet(s,id),month=s.year*12+s.month;if(!f||f.owner!==owner||!NAVAL_TACTICS[tactic]||f.reserve||f.mobilizing||f.order?.armyId||f.lastTacticChange===month)return {ok:false,reason:'tactic'};if((f.tactic||'formation')===tactic)return {ok:false,reason:'unchanged'};f.tactic=tactic;f.lastTacticChange=month;return {ok:true}}
export function ransomFleetCommander(s,owner,characterId){initializeNaval(s);const captive=s.naval?.captives?.find(c=>c.characterId===characterId&&c.owner===owner&&c.status==='held'),payer=s.factions[owner],holder=captive&&s.factions[captive.holder];if(!captive||!payer||!holder)return {ok:false,reason:'captive'};if(payer.treasury<18)return {ok:false,reason:'treasury'};payer.treasury-=18;holder.treasury+=18;captive.status='returning';captive.remaining=2;return {ok:true,months:2,cost:18}}
export function reserveFleet(s,owner,id){initializeNaval(s);const f=fleet(s,id),dock=s.regions.find(r=>r.id===f?.port);if(!f||f.owner!==owner||!dock||dock.owner!==owner||f.order||f.reserve||f.mobilizing)return {ok:false,reason:'fleet'};f.reserve=true;f.morale=Math.max(10,f.morale-5);return {ok:true,saving:fleetUpkeep(f)+(f.commanderId?1:0)-fleetUpkeepDue(f)}}
export function mobilizeFleet(s,owner,id){initializeNaval(s);const f=fleet(s,id),dock=s.regions.find(r=>r.id===f?.port),budget=s.factions[owner];if(!f||f.owner!==owner||!f.reserve||f.mobilizing||!dock||dock.owner!==owner)return {ok:false,reason:'fleet'};if(budget.treasury<6||budget.food<2)return {ok:false,reason:'resources'};budget.treasury-=6;budget.food-=2;f.mobilizing=1;return {ok:true,months:1,cost:6}}
export function accessibleFleet(s,owner,port,men){initializeNaval(s);return s.naval.fleets.find(f=>f.owner===owner&&f.port===port&&!f.reserve&&!f.mobilizing&&!f.order?.armyId&&fleetCapacity(f,s)>=men&&f.hull>=40&&f.supply>=20)}
export function queueShip(s,owner,port,type){initializeNaval(s);const r=s.regions.find(x=>x.id===port),ship=SHIPS[type],d=s.development?.[owner],f=s.factions[owner];if(!r?.port||r.owner!==owner||!r.buildings?.includes('shipyard')||!d?.knownMaterial?.includes('shipyard-craft'))return {ok:false,reason:'shipyard'};if(!ship||['quadrireme','quinquereme'].includes(type)&&!d.knownMaterial.includes('naval-equipment'))return {ok:false,reason:'technology'};if(s.naval.queues.some(q=>q.port===port)||s.naval.queues.filter(q=>q.owner===owner).length>=3)return {ok:false,reason:'capacity'};if((r.population||1000)<600)return {ok:false,reason:'workers'};if(f.treasury<ship.cost||f.manpower<ship.crew)return {ok:false,reason:'resources'};if(Object.entries(ship.materials).some(([k,v])=>(d.materials[k]||0)<v))return {ok:false,reason:'materials'};f.treasury-=ship.cost;f.manpower-=ship.crew;for(const [k,v] of Object.entries(ship.materials))d.materials[k]-=v;const months=Math.max(1,ship.months-(d.knownMaterial.includes('improved-shipbuilding')?1:0)-navalJobEffect(s,owner,'supervisor',port));s.naval.queues.push({owner,port,type,remaining:months});return {ok:true,months}}
export function appointFleet(s,owner,id,characterId){const f=fleet(s,id),person=s.world?.characters?.[characterId];if(!f||f.owner!==owner||f.commanderId||f.pendingCommanderId||!person?.alive||person.faction!==owner||person.missing||person.travel||person.loyalty<35||officeOf(s,owner,characterId)||s.armies.some(a=>a.characterId===characterId))return {ok:false,reason:'character'};if(s.naval.fleets.some(x=>x.id!==id&&(x.commanderId===characterId||x.pendingCommanderId===characterId))||s.naval.jobs.some(j=>j.characterId===characterId))return {ok:false,reason:'assigned'};if(s.factions[owner].treasury<5)return {ok:false,reason:'treasury'};s.factions[owner].treasury-=5;navalSkill(person,'commander');f.pendingCommanderId=characterId;f.pendingMonths=person.location===s.regions.find(r=>r.id===f.port)?.macro?1:2;return {ok:true,months:f.pendingMonths,cost:5}}
export function dismissFleetCommander(s,owner,id){const f=fleet(s,id);if(!f||f.owner!==owner||!(f.commanderId||f.pendingCommanderId))return {ok:false,reason:'commander'};const person=s.world?.characters?.[f.commanderId||f.pendingCommanderId];if(person)person.loyalty=Math.max(0,person.loyalty-2);f.commanderId=null;f.pendingCommanderId=null;f.pendingMonths=0;return {ok:true}}
export function orderFleet(s,owner,id,kind,target){
 const f=fleet(s,id);
 if(!f||f.owner!==owner||f.order?.armyId||f.reserve||f.mobilizing||!['patrol','escort','intercept','blockade','raid','return','recon','supply'].includes(kind))return {ok:false,reason:'fleet'};
 let targetZone=target,targetPort=null,cargo=0;
 if(['return','blockade','supply'].includes(kind)){
  const r=s.regions.find(x=>x.id===target&&x.port);
  if(!r||kind==='return'&&r.owner!==owner||kind==='blockade'&&!atWar(s,owner,r.owner)||kind==='supply'&&r.owner!==owner)return {ok:false,reason:'port'};
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
  targetZone=portZone(route.from);
 }
 const path=seaRoute(f.zone,targetZone);
 if(!path)return {ok:false,reason:'sea'};
 if(!ships(f)||f.hull<=0||kind!=='return'&&(f.supply<15||f.hull<25))return {ok:false,reason:'condition'};
 const returning=kind==='return'?f.order?.cargo||0:0;
 if(f.order?.kind==='supply'&&kind!=='return')report(s,{kind:'supply-loss',owner,port:f.order.targetPort,cargo:f.order.cargo,reason:'cancelled'});
 if(kind==='supply')s.factions[owner].food-=cargo;
 f.port=null;f.order={kind,target,targetPort,path,...(cargo?{cargo}:{}),...(returning?{cargo:returning}: {})};
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
function consumeMaritimeProvisions(s){
 const reaches=new Map(),demand=new Map();
 for(const [port,store] of Object.entries(s.naval.provisions||{}))if(store.food>0&&s.regions.some(r=>r.id===port&&r.owner===store.owner))reaches.set(port,{owner:store.owner,distance:inlandSupplyReach(s,store.owner,port)});
 for(const army of s.armies.filter(a=>a.men>0)){
  const port=[...reaches].filter(([,store])=>store.owner===army.owner&&store.distance.has(army.region)).sort(([a,first],[b,second])=>first.distance.get(army.region)-second.distance.get(army.region)||a.localeCompare(b))[0]?.[0];
  if(port)demand.set(port,(demand.get(port)||0)+army.men);
 }
 for(const [port,store] of Object.entries(s.naval.provisions||{})){
  const site=s.regions.find(r=>r.id===port);
  if(site?.owner!==store.owner){delete s.naval.provisions[port];continue}
  store.food=Math.max(0,store.food-1-Math.min(3,Math.floor((demand.get(port)||0)/4000)));
  if(!store.food)delete s.naval.provisions[port];
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
  const blockaded=s.naval.fleets.some(enemy=>enemy.owner!==f.owner&&atWar(s,f.owner,enemy.owner)&&enemy.order?.kind==='blockade'&&enemy.order.targetPort===target.id&&enemy.zone===portZone(target.id)&&ships(enemy)&&enemy.hull>0);
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
export function commitArmyTransport(s,unit,from,to){const f=accessibleFleet(s,unit.owner,from.id,unit.men),path=f&&seaRoute(f.zone,portZone(to.id));if(!f||!to.port||!path)return {ok:false,reason:'vessels'};f.port=null;f.order={kind:'transport',target:to.id,targetPort:to.id,path,armyId:unit.id};return {ok:true,fleetId:f.id,months:Math.max(1,path.length)}}
function recentFleetReports(s,owner){initializeNaval(s);return Object.entries(s.naval.intel[owner]||{}).filter(([,report])=>{const age=s.year*12+s.month-(report.year*12+report.month);return age>=0&&age<=4}).map(([id,report])=>({id,...report}))}
export function reportedHostileFleets(s,owner){return recentFleetReports(s,owner).filter(report=>atWar(s,owner,report.owner))}
export function reportedNonHostileFleets(s,owner){return recentFleetReports(s,owner).filter(report=>report.owner!==owner&&!atWar(s,owner,report.owner))}
const observe=(s,observer,seen,source)=>{if(observer===seen.owner)return;s.naval.intel[observer]||={};const count=ships(seen),trained=source==='recon'&&(activeEffects(s,observer).navalIntel||navalJobEffect(s,observer,'intelligence')),error=trained?1:2;s.naval.intel[observer][seen.id]={owner:seen.owner,zone:seen.zone,year:s.year,month:s.month,source,range:[Math.max(1,count-error),count+error],confidence:source==='recon'?(trained?'high':'medium'):'low'}};
const report=(s,entry)=>{s.naval.reports.unshift({id:`naval-${s.year}-${s.month}-${s.naval.reports.length}`,year:s.year,month:s.month,...entry});s.naval.reports.length=Math.min(s.naval.reports.length,80)};
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
const combatPower=(s,f)=>{const commander=s.world?.characters?.[f.commanderId],skill=commander?navalSkill(commander,'commander'):0,fullCrew=Object.entries(f.ships).reduce((n,[k,v])=>n+(SHIPS[k]?.crew||0)*v,0),crewFactor=fullCrew?Math.max(.35,Math.min(1,f.sailors/fullCrew)):0,coastalFort=s.regions.find(r=>r.id===f.port&&r.owner===f.owner)?.buildings?.includes('coastal-fort')?4:0;return (Object.entries(f.ships).reduce((n,[k,v])=>n+(SHIPS[k]?.power||0)*v,0)+coastalFort)*(0.5+f.morale/180+f.experience/300+f.hull/400+f.supply/500+skill/200)*crewFactor*(f.reserve?.4:1)*(1+(activeEffects(s,f.owner).navalPower||0))};
function damageFleet(s,target,amount){const before=ships(target),crew=target.sailors;target.hull=Math.max(0,target.hull-amount);target.sailors=Math.max(0,target.sailors-Math.round(amount*6));target.morale=Math.max(5,target.morale-Math.ceil(amount/3));let type=null,sunk=0;if(target.hull<45&&before>0){type=Object.keys(target.ships).find(k=>target.ships[k]>0);target.ships[type]--;sunk=1}if(target.hull===0||ships(target)===0){sunk=before;target.hull=0;target.ships={};if(target.order?.kind==='supply')report(s,{kind:'supply-loss',owner:target.owner,port:target.order.targetPort,cargo:target.order.cargo||0,reason:'fleet sunk'});target.order=null}return {sunk,type,sailors:crew-target.sailors}}
function disruptTransport(s,f,armyId){const army=s.armies.find(x=>x.id===armyId);if(army&&fleetCapacity(f,s)<army.men){army.men=Math.max(0,Math.round(army.men*(f.hull===0?.45:.72)));army.morale=Math.max(10,army.morale-20);army.move=null;f.order=null}}
function maritimeHazards(s,f,log){if(f.port||!ships(f))return;const elapsed=(s.year-(s.startYear??-49))*12+s.month-(s.startMonth??1);if(elapsed<12)return;if(rng(s)<.025){const armyId=f.order?.armyId,loss=5+Math.floor(rng(s)*9),damage=damageFleet(s,f,loss);disruptTransport(s,f,armyId);report(s,{kind:'storm',zone:f.zone,owner:f.owner,damage:loss,sailors:damage.sailors});if(f.owner===s.player)log(s,'A storm damaged the fleet and cost sailors.','风暴损伤了舰队并造成水手伤亡。')}if(f.morale<22&&rng(s)<.12){const army=s.armies.find(x=>x.id===f.order?.armyId);if(army)army.move=null;f.order=null;f.morale=Math.max(5,f.morale-4);report(s,{kind:'mutiny',zone:f.zone,owner:f.owner});if(f.owner===s.player)log(s,'A naval mutiny interrupted fleet orders.','海军哗变中断了舰队命令。')}}
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
 const outgoing={formation:1,ramming:1.2,boarding:.83,missile:.78}[opponentTactic]||1;
 const protection={formation:.9,ramming:1.1,boarding:1.1,missile:1}[ownTactic]||1;
 return Math.min(65,Math.max(0,Math.round((opponentPower/(ownPower+opponentPower+1)*34+(won?4:15))*outgoing*protection)));
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
function resolveBattle(s,a,b,zone,log){
 const tactics={[a.id]:battleTactic(s,a),[b.id]:battleTactic(s,b)};
 const snapshot=f=>({owner:f.owner,name:[...f.name],commanderId:f.commanderId,ships:{...f.ships},sailors:f.sailors,morale:f.morale,hull:f.hull,supply:f.supply,reserve:!!f.reserve,tactic:tactics[f.id],coastalFort:!!s.regions.find(r=>r.id===f.port&&r.owner===f.owner)?.buildings?.includes('coastal-fort')});
 const beforeA=snapshot(a),beforeB=snapshot(b),transported={[a.id]:a.order?.armyId,[b.id]:b.order?.armyId};
 const pa=combatPower(s,a)*tacticPower(a,tactics[a.id]),pb=combatPower(s,b)*tacticPower(b,tactics[b.id]);
 const weather=1+(rng(s)-.5)*.24,roll=(rng(s)-.5)*.24,attackerWins=pa*weather*(1+roll)>=pb*(1-roll);
 const aLoss=damageFleet(s,a,battleDamage(pb,pa,attackerWins,tactics[b.id],tactics[a.id]));
 const bLoss=damageFleet(s,b,battleDamage(pa,pb,!attackerWins,tactics[a.id],tactics[b.id]));
 adjustBattleSailors(a,aLoss,tactics[a.id],tactics[b.id]);adjustBattleSailors(b,bLoss,tactics[b.id],tactics[a.id]);
 const victor=attackerWins?a:b,defeated=attackerWins?b:a,defeatedLoss=attackerWins?bLoss:aLoss;
 let captured=0;if(tactics[victor.id]==='boarding'&&victor.hull>0&&defeatedLoss.sunk>0&&defeatedLoss.type){victor.ships[defeatedLoss.type]=(victor.ships[defeatedLoss.type]||0)+1;defeatedLoss.sunk--;captured=1}
 const capturedCommander=tactics[victor.id]==='boarding'?captureNavalCommander(s,defeated,victor):null;
 if(capturedCommander&&(capturedCommander.owner===s.player||capturedCommander.holder===s.player))log(s,'A fleet commander was taken prisoner in a boarding action.','接舷战中一名舰长被俘。');
 a.experience=Math.min(100,a.experience+3);b.experience=Math.min(100,b.experience+3);
 for(const f of [a,b]){if(f.hull<12&&f.commanderId){const person=s.world?.characters?.[f.commanderId];if(person?.health==='healthy')person.health='wounded'}if(f.commanderId){const person=s.world?.characters?.[f.commanderId];if(person?.alive){const skill=navalSkill(person,'commander');person.navalSkills.commander=Math.min(100,skill+2)}}disruptTransport(s,f,transported[f.id])}
 report(s,{kind:'battle',zone,participants:[a.id,b.id],snapshots:{[a.id]:beforeA,[b.id]:beforeB},winner:victor.owner,losses:{[a.id]:aLoss,[b.id]:bLoss},observedLosses:{[a.owner]:observedBattleLosses(bLoss),[b.owner]:observedBattleLosses(aLoss)},captured,capturedCommander,tactics,weather:Math.round(weather*100),damage:{[a.id]:beforeA.hull-a.hull,[b.id]:beforeB.hull-b.hull}});
 for(const owner of [a.owner,b.owner])observe(s,owner,owner===a.owner?b:a,'battle');
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
 return destinations.map(r=>{
  const path=seaRoute(f.zone,portZone(r.id));if(!path)return null;
  const reach=inlandSupplyReach(s,owner,r.id);
  const nearby=s.armies.filter(a=>a.owner===owner&&a.men>=1200&&a.operationalSupply<.65&&reach.has(a.region));
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
function hostileSeaLanding(s,owner,origin){
 return GRAND_ROUTES.some(([from,to,kind])=>{if(kind!=='sea')return false;const other=from===origin?to:to===origin?from:null,target=s.regions.find(r=>r.id===other);return !!target?.port&&atWar(s,owner,target.owner)});
}
function aiTransportStagingPort(s,owner,f){
 if(fleetCapacity(f,s)<1200||s.factions[owner].treasury<35)return null;
 const capacity=fleetCapacity(f,s),knownThreats=reportedHostileFleets(s,owner),fleetCount=ships(f);
 return s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&a.men>=1200&&a.men<=capacity&&a.region!==f.port).map(a=>{
  const origin=s.regions.find(r=>r.id===a.region&&r.owner===owner&&r.port);
  if(!origin||s.naval.fleets.some(other=>other.id!==f.id&&other.owner===owner&&other.port===origin.id&&!other.reserve&&!other.mobilizing&&!other.order?.armyId&&fleetCapacity(other,s)>=a.men&&other.hull>=40&&other.supply>=20))return null;
  if(!hostileSeaLanding(s,owner,origin.id))return null;
  const path=seaRoute(f.zone,portZone(origin.id));if(!path)return null;
  const zones=new Set([f.zone,...path]);
  if(knownThreats.some(report=>zones.has(report.zone)&&(report.range?.[1]||0)>fleetCount*1.5))return null;
  return {origin,score:a.men/1000-path.length*2};
 }).filter(Boolean).sort((a,b)=>b.score-a.score)[0]?.origin||null;
}
function aiNavalOrders(s,owner,f){
 const cashflow=aiNavalCashflow(s,owner),treasury=s.factions[owner].treasury;
 const nearbyThreat=reportedHostileFleets(s,owner).some(r=>atWar(s,owner,r.owner)&&seaRoute(f.zone,r.zone)?.length<=1);
 const wartimeReserve=Math.max(35,24+6*Math.max(0,-cashflow));
 const outnumbered=s.wars.some(w=>w.includes(owner)&&s.regions.filter(r=>r.owner===w.find(id=>id!==owner)).length>s.regions.filter(r=>r.owner===owner).length*1.5);
 const landReserveAtRisk=outnumbered&&treasury<wartimeReserve;
 // A smaller army needs one ordinary 24-treasury levy plus a year's projected
 // operating deficit. Preserve that reserve before paying for optional patrols.
 // The fleet can still sail when a nearby hostile fleet is actually reported.
 const landWarFloor=24+12*Math.max(0,-cashflow);
 const retireOptionalFleet=cashflow< -6&&(!nearbyThreat||landReserveAtRisk)&&(treasury<110||outnumbered&&treasury<=landWarFloor);
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
 const transportBudget=treasury>=Math.max(35,26+3*Math.max(0,-cashflow));
 if(transportBudget){
  if(f.port&&s.armies.some(a=>a.owner===owner&&a.region===f.port&&!a.move&&!a.siege&&a.men>=1200&&a.men<=fleetCapacity(f,s)&&hostileSeaLanding(s,owner,f.port)))return;
  const embarkation=aiTransportStagingPort(s,owner,f);if(embarkation)return orderFleet(s,owner,f.id,'return',embarkation.id);
 }
 if(f.port&&retireOptionalFleet){reserveFleet(s,owner,f.id);return}
 if(treasury>=40){const destination=aiSupplyDestination(s,owner,f);if(destination)return orderFleet(s,owner,f.id,'supply',destination.id)}
 const pirate=s.naval.pirates.find(p=>p.zone===f.zone&&p.pressure>18);if(pirate&&(f.ships.trireme||f.ships.light||f.ships.quadrireme||f.ships.quinquereme))return orderFleet(s,owner,f.id,'patrol',f.zone);
 const threatened=s.naval.routes.find(r=>[r.from,r.to].some(id=>s.regions.find(x=>x.id===id)?.owner===owner)&&['piracy','raid'].includes(r.last?.reason));if(threatened&&(f.ships.trireme||f.ships.light||f.ships.quadrireme||f.ships.quinquereme))return orderFleet(s,owner,f.id,'escort',threatened.id);
 const known=reportedHostileFleets(s,owner),enemyPort=s.regions.find(r=>r.port&&atWar(s,owner,r.owner)&&seaRoute(f.zone,portZone(r.id))?.length<=1&&!known.some(x=>x.zone===portZone(r.id)&&x.range[1]>(ships(f)*1.5)));if(enemyPort&&combatPower(s,f)>4)return orderFleet(s,owner,f.id,'blockade',enemyPort.id);
}
export function advanceNaval(s,log=()=>{}){initializeNaval(s);if(!s.naval)return;const n=s.naval,avoidedNavalBattles=new Set();consumeMaritimeProvisions(s);produceGoods(s);for(const j of [...n.jobs]){const p=s.world?.characters?.[j.characterId],budget=s.factions[j.owner];if(!p?.alive||p.faction!==j.owner||j.port&&s.regions.find(r=>r.id===j.port)?.owner!==j.owner){n.jobs.splice(n.jobs.indexOf(j),1);continue}if(j.remaining>0){j.remaining--;continue}budget.treasury=Math.max(-100,budget.treasury-1);if(budget.treasury<0)p.loyalty=Math.max(0,p.loyalty-1);j.experience=(j.experience||0)+1;if(j.experience%12===0){const skill=navalSkill(p,j.kind);p.navalSkills[j.kind]=Math.min(100,skill+2)}}for(const q of [...n.queues]){if(s.regions.find(r=>r.id===q.port)?.owner!==q.owner){n.queues.splice(n.queues.indexOf(q),1);if(q.owner===s.player)log(s,'Shipbuilding stopped when the shipyard was lost.','船厂失守，造船工程中止。');continue}q.remaining--;if(q.remaining>0)continue;n.queues.splice(n.queues.indexOf(q),1);let f=n.fleets.find(x=>x.owner===q.owner&&x.port===q.port&&!x.order&&!x.reserve);if(!f){f=makeFleet(`fleet-${n.nextFleet++}`,[`Fleet at ${site(q.port)?.site[0]||q.port}`,`${site(q.port)?.site[1]||q.port}舰队`],q.owner,q.port,{});n.fleets.push(f)}f.ships[q.type]=(f.ships[q.type]||0)+1;f.sailors+=SHIPS[q.type].crew;if(q.owner===s.player)log(s,`A ${SHIPS[q.type].name[0]} was launched at ${site(q.port)?.site[0]}.`,`${SHIPS[q.type].name[1]}在${site(q.port)?.site[1]}下水。`)}
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
  if(!home){order.targetPort=null;order.path=[];if(oldPort&&f.owner===s.player)log(s,'The return harbor was lost; the fleet is waiting offshore with its cargo.','返航港口失守，舰队携货在近海等待。');continue}
  order.target=home.id;order.targetPort=home.id;order.path=home.path;
  if(oldPort&&f.owner===s.player)log(s,'The return harbor was lost; the fleet diverted to another friendly port.','返航港口失守，舰队改驶另一友方港口。');
 }
 for(const f of n.fleets){if(!ships(f))continue;const budget=s.factions[f.owner];if(f.pendingCommanderId){f.pendingMonths--;if(f.pendingMonths<=0){const person=s.world?.characters?.[f.pendingCommanderId];if(person?.alive&&person.faction===f.owner&&!person.missing){f.commanderId=f.pendingCommanderId;f.morale=Math.min(100,f.morale+2)}f.pendingCommanderId=null;f.pendingMonths=0}}const upkeep=fleetUpkeepDue(f);budget.treasury=Math.max(-100,budget.treasury-upkeep);if(budget.treasury<0){f.morale=Math.max(10,f.morale-3);const commander=s.world?.characters?.[f.commanderId];if(commander)commander.loyalty=Math.max(0,commander.loyalty-1)}if(f.port){const dock=s.regions.find(r=>r.id===f.port);f.supply=Math.min(100,f.supply+25+(dock?.buildings?.includes('naval-depot')?12:0)+navalJobEffect(s,f.owner,'harbor',f.port)*4);if(!f.reserve&&dock?.buildings?.includes('shipyard')&&f.hull<100&&budget.treasury>=3&&(s.development?.[f.owner]?.materials?.timber||0)>=1){budget.treasury-=3;s.development[f.owner].materials.timber--;f.hull=Math.min(100,f.hull+8+(dock.buildings.includes('dockyard')?8:0)+(activeEffects(s,f.owner).navalRepair||0)+navalJobEffect(s,f.owner,'engineer',f.port)*3)}const crewNeeded=Object.entries(f.ships).reduce((n,[type,count])=>n+(SHIPS[type]?.crew||0)*count,0)-f.sailors;if(!f.reserve&&crewNeeded>0&&budget.treasury>=2&&budget.manpower>0){const recruited=Math.min(30,crewNeeded,budget.manpower);budget.treasury-=2;budget.manpower-=recruited;f.sailors+=recruited}if(!f.reserve&&dock?.buildings?.includes('naval-training'))f.experience=Math.min(100,f.experience+2)}else{f.supply=Math.max(0,f.supply-8+(activeEffects(s,f.owner).navalSupply||0));if(f.supply===0)f.morale=Math.max(10,f.morale-3)}maritimeHazards(s,f,log);const order=f.order;if(!order)continue;if(order.path.length){for(let step=0;step<fleetSpeed(f)&&order.path.length;step++)f.zone=order.path.shift();f.port=null}else if(order.targetPort){f.zone=portZone(order.targetPort);if(order.kind==='return'||order.kind==='transport'){f.port=order.targetPort;if(order.kind==='return'&&order.cargo){budget.food=Math.min(budget.foodCapacity||100,budget.food+order.cargo);report(s,{kind:'supply-return',owner:f.owner,port:order.targetPort,cargo:order.cargo})}if(order.kind==='transport'){const a=s.armies.find(x=>x.id===order.armyId);if(a?.move)a.move.transportReady=true}f.order=null}}if(order.kind==='recon'&&!order.path.length){resolveReconOrder(s,f,avoidedNavalBattles,log);f.order=null}}
  // Sharing a sea zone does not expose a fleet sheltered in harbor to an
  // open-water encounter. It must sortie before a patrol can engage it.
  for(const a of n.fleets)for(const b of n.fleets){if(a.id>=b.id||!ships(a)||!ships(b)||a.zone!==b.zone||!atWar(s,a.owner,b.owner)||avoidedNavalBattles.has(encounterKey(a.id,b.id)))continue;if(a.port||b.port)continue;resolveBattle(s,a,b,a.zone,log)}
 finishMaritimeSupply(s,log);
 for(const p of n.pirates){const patrol=n.fleets.filter(f=>f.zone===p.zone&&['patrol','escort','intercept'].includes(f.order?.kind)&&ships(f));if(patrol.length){if(p.ships>0&&p.pressure>=24){const engaged=patrol[0],loss=damageFleet(s,engaged,Math.min(9,2+p.ships)),recovered=pirateRecover(s,p,engaged.owner);p.ships=Math.max(0,p.ships-1);p.wealth=Math.max(0,p.wealth-1);report(s,{kind:'pirate-clash',zone:p.zone,owner:engaged.owner,sailors:loss.sailors,pirateShipsLost:1,recovered});if(engaged.owner===s.player)log(s,recovered?`Patrols fought pirates and recovered ${recovered.amount} ${recovered.good}.`:'Patrols fought pirate vessels; sailors were lost.',recovered?`巡逻舰击退海盗，收回${recovered.amount}份${recovered.good}。`:'巡逻舰与海盗船交战，水手有所伤亡。')}p.pressure=Math.max(0,p.pressure-patrol.length*5);if(p.pressure<8&&rng(s)<.3)p.zone=byId[p.zone].links[Math.floor(rng(s)*byId[p.zone].links.length)]}else p.pressure=p.ships>0?Math.min(70,p.pressure+1):Math.max(0,p.pressure-2);if(p.backer&&rng(s)<.05){const sponsor=p.backer;p.backer=null;s.factions[sponsor].legitimacy=Math.max(0,s.factions[sponsor].legitimacy-3);for(const r of n.routes.filter(r=>routeZones(r).includes(p.zone))){const victim=s.regions.find(x=>x.id===r.to)?.owner;if(victim&&victim!==sponsor){const key=[sponsor,victim].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]??0)-4)}}report(s,{kind:'scandal',zone:p.zone,owner:sponsor});if(sponsor===s.player)log(s,'Secret pirate support was exposed; legitimacy fell.','秘密资助海盗曝光，合法性下降。')}}
 const merchantCapacity=new Map(n.fleets.map(f=>[f.id,f.reserve||f.order?.kind==='supply'||f.order?.cargo?0:(f.ships.merchant||0)]));for(const route of n.routes)settleRoute(s,route,log,merchantCapacity);
 for(const f of n.fleets){if(f.mobilizing){f.mobilizing--;if(f.mobilizing<=0){f.mobilizing=0;f.reserve=false;f.morale=Math.min(100,f.morale+2);if(f.owner===s.player)log(s,'The fleet has completed mobilization and can receive orders.','舰队完成整备，可以接受命令。')}}}
 for(const owner of Object.keys(s.factions).filter(x=>x!==s.player&&x!=='rebels')){for(const f of n.fleets.filter(x=>x.owner===owner&&ships(x)))aiNavalOrders(s,owner,f);if(s.month===1&&s.factions[owner].treasury>90&&aiNavalCashflow(s,owner)>0){const dock=s.regions.find(r=>r.owner===owner&&r.buildings?.includes('shipyard'));if(dock)queueShip(s,owner,dock.id,'light')}}
 advanceNavalCaptives(s,log);
}
export function supportPirates(s,owner,id){initializeNaval(s);const p=s.naval.pirates.find(x=>x.id===id),f=s.factions[owner];if(!p||!f||f.treasury<12||p.backer===owner)return {ok:false,reason:'resources'};f.treasury-=12;p.backer=owner;p.ships=Math.max(1,p.ships);p.pressure=Math.min(70,p.pressure+8);return {ok:true}}
