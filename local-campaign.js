import {FACTIONS,ROUTES} from './data.js?v=portrait-fourteen-1';
import {localEntity,localTradeOpen} from './local-polities.js';
import {initializeControlKnowledge,reportedControl} from './control-intelligence.js?v=portrait-fourteen-1';
import {initializeLocalDiscovery,localDiscoveryLevel,LOCAL_DISCOVERY_LEVELS,recordLocalDiscovery} from './local-discovery.js?v=portrait-fourteen-1';
import {sendLetter} from './epistulae.js?v=portrait-fourteen-1';
import {nonMilitaryAccessStatus} from './border-access.js?v=portrait-fourteen-1';

const date=state=>state.year*12+state.month;
const relation=(state,a,b)=>state.relations[[a,b].sort().join(':')]??0;
const hostOf=(state,city)=>state.regions.find(region=>region.id===city.theater)?.owner;
export const localCampaignCity=state=>state.localCampaign?.id===state.player?localEntity(state,state.player):null;
export const playableLocalCities=state=>state.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.type==='city_state'&&entity.controller===entity.id&&(entity.procedural||entity.id==='massilia'&&entity.historical&&entity.ruler?.fictional));
export function localTradePartners(state,city=localCampaignCity(state)){
 if(!city)return [];
 const neighbors=ROUTES.filter(([a,b])=>a===city.theater||b===city.theater).map(([a,b])=>a===city.theater?b:a);
 const known=[hostOf(state,city),...neighbors.map(id=>reportedControl(state,city.id,id)?.owner)];
 return [...new Set(known)].filter(actor=>actor&&actor!==city.id&&actor!=='rebels'&&FACTIONS[actor]&&!state.wars.some(war=>war.includes(city.id)&&war.includes(actor)));
}

const adjacentTheaters=(a,b)=>a===b||ROUTES.some(([from,to])=>from===a&&to===b||from===b&&to===a);
export function localPeerCities(state,city=localCampaignCity(state)){
 if(!city)return [];
 return state.regions.flatMap(region=>region.localEntities||[]).filter(peer=>peer.id!==city.id&&peer.type==='city_state'&&adjacentTheaters(city.theater,peer.theater)&&localDiscoveryLevel(state,city.id,peer.id)>=LOCAL_DISCOVERY_LEVELS.identified);
}
const peerRouteOpen=(state,city,peer)=>{
 if(!adjacentTheaters(city.theater,peer.theater))return false;
 if(city.theater===peer.theater)return true;
 // A land or sea route needs commercial access through both actual theaters.
 return [city.theater,peer.theater].every(theaterId=>nonMilitaryAccessStatus(state,city.id,theaterId,undefined,'commercial').allowed);
};

export function registerLocalCampaign(state){
 const city=localCampaignCity(state);
 if(!city||!state.factions?.[city.id])return false;
 FACTIONS[city.id]={name:[...city.name],short:[...city.name],color:'#d3ad67',ruler:[...city.ruler.name]};
 return true;
}

export function startLocalCampaign(state,id){
 const city=playableLocalCities(state).find(entity=>entity.id===id);
 if(!city||state.localCampaign)throw Error('Invalid city-state start');
 const field=Math.min(Math.floor(city.militia*.4),Math.floor(city.population*.08));
 city.militia-=field;
 state.player=id;
 state.scenario='local_city';
 state.localCampaign={id,startedAt:date(state),survived:0,tradeOffer:null,peerTradeOffer:null,protectionOffer:null,independenceOffer:null,tradeCompleted:0};
 state.factions[id]={treasury:city.treasury,food:city.food,manpower:Math.floor(city.population*.05),stability:65,legitimacy:60,tax:'normal',research:0};
 state.armies.push({id:`local-field:${id}`,name:['City militia','城邦民兵'],owner:id,region:city.theater,men:field,morale:62,skill:Math.max(1,Math.floor(city.strategy/2)),experience:0,commander:[...city.civicOfficers?.captain?.name||city.ruler.name],move:null,siege:null});
 state.world.leadership[id]=[];
 state.knowledge[id]=Object.fromEntries(Object.keys(state.factions).map(target=>[target,{reportedLeaders:[],reports:[],sightings:{}}]));
 for(const targets of Object.values(state.knowledge))targets[id]||={reportedLeaders:[],reports:[],sightings:{}};
 initializeControlKnowledge(state);initializeLocalDiscovery(state);
 for(const peer of state.regions.flatMap(region=>region.localEntities||[]))if(peer.id!==city.id&&peer.type==='city_state'&&adjacentTheaters(city.theater,peer.theater))recordLocalDiscovery(state,id,peer.id,LOCAL_DISCOVERY_LEVELS.identified,'local_council_contact');
 registerLocalCampaign(state);
 return state;
}

export function localRecruit(state){
 const city=localCampaignCity(state),f=state.factions[state.player];
 if(!city||city.controller!==city.id||!f||f.treasury<8||f.food<3||f.manpower<100||city.population<1200)return false;
 f.treasury-=8;f.food-=3;f.manpower-=100;city.population-=100;
 const field=state.armies.find(army=>army.owner===state.player&&army.region===city.theater&&!army.move&&!army.siege&&army.men>0);
 if(field)field.men+=100;
 else state.armies.push({id:`local-field:${state.nextArmy++}`,name:['City militia','城邦民兵'],owner:state.player,region:city.theater,men:100,morale:55,skill:1,experience:0,commander:[...city.civicOfficers?.captain?.name||city.ruler.name],move:null,siege:null});
 city.treasury=f.treasury;city.food=f.food;
 return true;
}

export function localTradeOffer(state,partnerId=null){
 const city=localCampaignCity(state),f=state.factions[state.player],host=partnerId||(city&&hostOf(state,city));
 if(!city||city.controller!==city.id||!f||!host||!localTradePartners(state,city).includes(host)||f.treasury<3||state.localCampaign.tradeOffer||state.localCampaign.peerTradeOffer||state.localCampaign.protectionOffer||state.localCampaign.independenceOffer||city.tradeRights?.[host]>date(state))return false;
 f.treasury-=3;city.treasury=f.treasury;
 state.localCampaign.tradeOffer={host,remaining:2};
 return true;
}

export function localPeerTradeOffer(state,peerId){
 const city=localCampaignCity(state),f=state.factions[state.player],peer=localPeerCities(state,city).find(item=>item.id===peerId);
 if(!city||city.controller!==city.id||!f||!peer||f.treasury<3||state.localCampaign.tradeOffer||state.localCampaign.peerTradeOffer||state.localCampaign.protectionOffer||state.localCampaign.independenceOffer||city.peerTradeRights?.[peerId]>date(state)||state.wars.some(war=>war.includes(city.id)&&war.includes(peerId)))return false;
 f.treasury-=3;city.treasury=f.treasury;
 state.localCampaign.peerTradeOffer={host:peerId,remaining:2};
 return true;
}

export function localProtectionOffer(state){
 const city=localCampaignCity(state),f=state.factions[state.player],host=city&&hostOf(state,city);
 if(!city||city.controller!==city.id||!f||!host||!state.factions[host]||city.overlord||f.treasury<6||state.localCampaign.tradeOffer||state.localCampaign.peerTradeOffer||state.localCampaign.protectionOffer||state.localCampaign.independenceOffer||state.wars.some(war=>war.includes(city.id)&&war.includes(host)))return false;
 f.treasury-=6;city.treasury=f.treasury;
 state.localCampaign.protectionOffer={host,remaining:3};
 return true;
}

export function localIndependenceOffer(state){
 const city=localCampaignCity(state),f=state.factions[state.player],host=city?.overlord;
 if(!city||city.controller!==city.id||!f||!host||!state.factions[host]||f.treasury<4||state.localCampaign.tradeOffer||state.localCampaign.peerTradeOffer||state.localCampaign.protectionOffer||state.localCampaign.independenceOffer||state.wars.some(war=>war.includes(city.id)&&war.includes(host)))return false;
 f.treasury-=4;city.treasury=f.treasury;
 state.localCampaign.independenceOffer={host,remaining:2};
 return true;
}

function reportOffer(state,city,host,proposal,accepted){
 if(!state.factions[host])return;
 const trade=proposal==='trade',subject=trade?['Reply to the city trade proposal','城邦贸易提议答复']:['Reply to the protection request','城邦庇护请求答复'];
 const body=trade?[accepted?`${FACTIONS[host]?.name[0]||host} accepts a two-year food compact. Each completed exchange moves 2 food from the city for 3 treasury, subject to the real route and reserves.`:`${FACTIONS[host]?.name[0]||host} declines the food compact. No goods or treaty rights were created.`,accepted?`${FACTIONS[host]?.name[1]||host}接受为期两年的粮食贸易协定。每次实际交易从城邦交付2粮食并获得3国库，仍须满足路线与储备条件。`:`${FACTIONS[host]?.name[1]||host}拒绝粮食贸易提议；未转移物资或授予协定权利。`]:[accepted?`${FACTIONS[host]?.name[0]||host} accepts a protective relationship. The city keeps its ruler, resources and self-government; it owes one treasury each year while protected.`:`${FACTIONS[host]?.name[0]||host} declines to protect the city. Its local government remains independent.`,accepted?`${FACTIONS[host]?.name[1]||host}接受庇护关系。城邦保留领袖、资源和自治；庇护期间每年缴纳1国库。`:`${FACTIONS[host]?.name[1]||host}拒绝庇护城邦；地方政府继续独立。`];
 if(proposal==='independence'){
  subject.splice(0,2,'Reply to the independence petition','城邦独立请愿答复');
  body.splice(0,2,
   accepted?`${FACTIONS[host]?.name[0]||host} releases the city from protection. Annual tribute ends; the city keeps its local government and legal site title.`:`${FACTIONS[host]?.name[0]||host} declines the petition. Protection and annual tribute continue.`,
   accepted?`${FACTIONS[host]?.name[1]||host}同意结束庇护关系。年度贡金停止；城邦保留地方政府与当地法理归属。`:`${FACTIONS[host]?.name[1]||host}拒绝请愿；庇护与年度贡金继续。`);
 }
 const sent=sendLetter(state,{senderInstitution:host,senderFaction:host,recipient:city.id,category:'government',priority:'important',source:city.theater,destination:city.theater,subject,body,options:['acknowledge'],context:{kind:'local_city_offer_result',polityId:city.id,host,proposal,accepted}});
 if(sent.ok){sent.letter.arrival=date(state);sent.letter.delivery='received';sent.letter.senderName=[...(FACTIONS[host]?.name||[host,host])]}
}

export function advanceLocalCampaign(state){
 const city=localCampaignCity(state);if(!city)return state;
 const campaign=state.localCampaign,f=state.factions[state.player];
 if(city.controller!==city.id){state.defeat=true;return state}
 campaign.survived++;
 if(campaign.tradeOffer&&--campaign.tradeOffer.remaining<=0){
  const host=campaign.tradeOffer.host,accepted=localTradeOpen(state,city,host)&&state.factions[host]?.treasury>=6&&city.food>=6&&relation(state,city.id,host)>=-35&&!state.wars.some(war=>war.includes(city.id)&&war.includes(host));
  if(accepted){city.tradeRights||={};city.tradeRights[host]=date(state)+24;state.log.unshift({year:state.year,month:state.month,en:`${city.name[0]} concluded a two-year food compact with ${FACTIONS[host]?.short[0]||host}.`,zh:`${city.name[1]}与${FACTIONS[host]?.short[1]||host}订立两年粮食贸易协定。`})}
  else state.log.unshift({year:state.year,month:state.month,en:state.factions[host]?'The city trade proposal was declined.':'The city trade envoy found no surviving court to answer.',zh:state.factions[host]?'城邦贸易提议未能达成。':'城邦贸易使者抵达时，受信政权已不存在。'});
  reportOffer(state,city,host,'trade',accepted);
  campaign.tradeOffer=null;
 }
 if(campaign.peerTradeOffer&&--campaign.peerTradeOffer.remaining<=0){
  const peer=localEntity(state,campaign.peerTradeOffer.host),reserve=peer&&Math.max(4,Math.ceil((peer.population||3000)/3000));
  const accepted=!!(peer&&peer.type==='city_state'&&peer.controller===peer.id&&!peer.siege&&peer.food>=reserve+4&&peerRouteOpen(state,city,peer)&&relation(state,city.id,peer.id)>=-25+Math.min(15,peer.strategy||0)&&!state.wars.some(war=>war.includes(city.id)&&war.includes(peer.id)));
  if(accepted){city.peerTradeRights||={};city.peerTradeRights[peer.id]=date(state)+24}
  const name=peer?.name||[campaign.peerTradeOffer.host,campaign.peerTradeOffer.host];
  state.log.unshift({year:state.year,month:state.month,en:`${name[0]} ${accepted?'accepted':'declined'} the city-to-city food compact.`,zh:`${name[1]}${accepted?'接受':'拒绝'}了城邦间粮食贸易协定。`});
  const sent=sendLetter(state,{senderInstitution:city.id,senderFaction:city.id,recipient:city.id,category:'government',priority:'important',source:city.theater,destination:city.theater,subject:['City envoy returned','城邦使者回报'],body:[`${name[0]} ${accepted?'accepted a two-year food compact; actual quarterly shipments still require food, treasury and an open route.':'declined the proposal; no goods or rights were transferred.'}`,`${name[1]}${accepted?'接受为期两年的粮食协定；每季度实际交易仍须有粮食、国库与通商路线。':'拒绝提议；未转移物资或授予贸易权。'}`],options:['acknowledge'],context:{kind:'local_peer_trade_result',polityId:city.id,host:peer?.id||campaign.peerTradeOffer.host,accepted}});
  if(sent.ok){sent.letter.arrival=date(state);sent.letter.delivery='received';sent.letter.senderName=['City envoys','城邦使者']}
  campaign.peerTradeOffer=null;
 }
 if(campaign.protectionOffer&&--campaign.protectionOffer.remaining<=0){
  const host=campaign.protectionOffer.host,capacity=state.armies.filter(army=>army.owner===host&&army.men>0).reduce((sum,army)=>sum+army.men,0);
  const accepted=hostOf(state,city)===host&&city.controller===city.id&&!city.overlord&&state.factions[host]?.treasury>=10&&state.factions[host]?.stability>=45&&capacity>=city.militia*2&&relation(state,city.id,host)>=-35&&!state.wars.some(war=>war.includes(city.id)&&war.includes(host));
  if(accepted){city.overlord=host;state.log.unshift({year:state.year,month:state.month,en:`${FACTIONS[host]?.short[0]||host} accepted protection of ${city.name[0]}; the city retains self-government.`,zh:`${FACTIONS[host]?.short[1]||host}接受庇护${city.name[1]}；城邦继续自治。`})}
  else state.log.unshift({year:state.year,month:state.month,en:'The city protection request was declined.',zh:'城邦庇护请求被拒绝。'});
  reportOffer(state,city,host,'protection',accepted);
  campaign.protectionOffer=null;
 }
 if(campaign.independenceOffer&&--campaign.independenceOffer.remaining<=0){
  const host=campaign.independenceOffer.host,hostForce=state.armies.filter(army=>army.owner===host&&army.region===city.theater&&army.men>0).reduce((sum,army)=>sum+army.men,0);
  const cityForce=city.militia+state.armies.filter(army=>army.owner===city.id&&army.region===city.theater&&army.men>0).reduce((sum,army)=>sum+army.men,0);
  const trustNeeded={travel:10,beginner:15,standard:25,hard:35,expert:45}[state.difficulty]??25;
  const consent=relation(state,city.id,host)>=trustNeeded&&f.stability>=55;
  const cannotEnforce=hostOf(state,city)!==host&&hostForce<cityForce*.6;
  const accepted=city.controller===city.id&&city.overlord===host&&!!state.factions[host]&&!state.wars.some(war=>war.includes(city.id)&&war.includes(host))&&(consent||cannotEnforce);
  if(accepted){city.overlord=null;state.log.unshift({year:state.year,month:state.month,en:`${city.name[0]} gained independence by agreement with ${FACTIONS[host]?.short[0]||host}; annual tribute ended.`,zh:`${city.name[1]}经${FACTIONS[host]?.short[1]||host}同意恢复独立；年度贡金停止。`})}
  else {const key=[city.id,host].sort().join(':');state.relations[key]=Math.max(-100,relation(state,city.id,host)-3);state.log.unshift({year:state.year,month:state.month,en:'The city independence petition was declined.',zh:'城邦独立请愿遭拒。'})}
  reportOffer(state,city,host,'independence',accepted);
  campaign.independenceOffer=null;
 }
 if(city.lastTrade?.year===state.year&&city.lastTrade?.month===state.month)campaign.tradeCompleted+=city.lastTrade.count||1;
 if(state.month%3===0)for(const [peerId,until] of Object.entries(city.peerTradeRights||{})){
  const peer=localEntity(state,peerId),reserve=peer&&Math.max(4,Math.ceil((peer.population||3000)/3000));
  if(!peer||until<=date(state)||peer.controller!==peer.id||peer.siege||peer.food-2<reserve||city.treasury<3||!peerRouteOpen(state,city,peer)||state.wars.some(war=>war.includes(city.id)&&war.includes(peer.id)))continue;
  peer.food-=2;peer.treasury+=3;city.treasury-=3;city.food+=2;
  campaign.tradeCompleted++;
  state.log.unshift({year:state.year,month:state.month,en:`${city.name[0]} bought 2 food from ${peer.name[0]} for 3 treasury.`,zh:`${city.name[1]}向${peer.name[1]}支付3国库，购得2粮食。`});
 }
 f.treasury=city.treasury;f.food=city.food;
 f.manpower=Math.min(Math.floor(city.population*.12),f.manpower+Math.max(5,Math.floor(city.population/800)));
 if(campaign.survived>=24&&campaign.tradeCompleted>0&&f.treasury>=0&&f.food>=4&&f.stability>=45&&!state.victory){state.victory=true;state.log.unshift({year:state.year,month:state.month,en:'The city council secured two years of autonomy and a working trade compact. The campaign may continue.',zh:'城邦议会维持两年自治，并建立有效贸易协定；战役仍可继续。'})}
 state.log=state.log.slice(0,80);
 return state;
}
