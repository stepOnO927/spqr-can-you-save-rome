import {FACTIONS} from './data.js?v=world-kings-guardian-1';
import {localEntity} from './local-polities.js';
import {initializeControlKnowledge} from './control-intelligence.js?v=world-kings-guardian-1';
import {initializeLocalDiscovery} from './local-discovery.js?v=world-kings-guardian-1';

const date=state=>state.year*12+state.month;
export const localCampaignCity=state=>state.localCampaign?.id===state.player?localEntity(state,state.player):null;
export const playableLocalCities=state=>state.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.procedural&&entity.type==='city_state'&&entity.controller===entity.id);

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
 state.localCampaign={id,startedAt:date(state),survived:0,tradeOffer:null,tradeCompleted:0};
 state.factions[id]={treasury:city.treasury,food:city.food,manpower:Math.floor(city.population*.05),stability:65,legitimacy:60,tax:'normal',research:0};
 state.armies.push({id:`local-field:${id}`,name:['City militia','城邦民兵'],owner:id,region:city.theater,men:field,morale:62,skill:Math.max(1,Math.floor(city.strategy/2)),experience:0,commander:[...city.civicOfficers?.captain?.name||city.ruler.name],move:null,siege:null});
 state.world.leadership[id]=[];
 state.knowledge[id]=Object.fromEntries(Object.keys(state.factions).map(target=>[target,{reportedLeaders:[],reports:[],sightings:{}}]));
 for(const targets of Object.values(state.knowledge))targets[id]||={reportedLeaders:[],reports:[],sightings:{}};
 initializeControlKnowledge(state);initializeLocalDiscovery(state);
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

export function localTradeOffer(state){
 const city=localCampaignCity(state),f=state.factions[state.player],host=state.regions.find(region=>region.id===city?.theater)?.owner;
 if(!city||city.controller!==city.id||!f||!host||!state.factions[host]||f.treasury<3||state.localCampaign.tradeOffer||city.tradeRights?.[host]>date(state))return false;
 f.treasury-=3;city.treasury=f.treasury;
 state.localCampaign.tradeOffer={host,remaining:2};
 return true;
}

export function advanceLocalCampaign(state){
 const city=localCampaignCity(state);if(!city)return state;
 const campaign=state.localCampaign,f=state.factions[state.player];
 if(city.controller!==city.id){state.defeat=true;return state}
 campaign.survived++;
 if(campaign.tradeOffer&&--campaign.tradeOffer.remaining<=0){
  const host=campaign.tradeOffer.host,accepted=state.regions.find(region=>region.id===city.theater)?.owner===host&&state.factions[host]&&city.food>=6;
  if(accepted){city.tradeRights||={};city.tradeRights[host]=date(state)+24;state.log.unshift({year:state.year,month:state.month,en:`${city.name[0]} concluded a two-year food compact with ${FACTIONS[host]?.short[0]||host}.`,zh:`${city.name[1]}与${FACTIONS[host]?.short[1]||host}订立两年粮食贸易协定。`})}
  else state.log.unshift({year:state.year,month:state.month,en:'The city trade proposal was declined.',zh:'城邦贸易提议未能达成。'});
  campaign.tradeOffer=null;
 }
 if(city.lastTrade?.year===state.year&&city.lastTrade?.month===state.month)campaign.tradeCompleted++;
 f.treasury=city.treasury;f.food=city.food;
 f.manpower=Math.min(Math.floor(city.population*.12),f.manpower+Math.max(5,Math.floor(city.population/800)));
 if(campaign.survived>=24&&campaign.tradeCompleted>0&&f.treasury>=0&&f.food>=4&&f.stability>=45&&!state.victory){state.victory=true;state.log.unshift({year:state.year,month:state.month,en:'The city council secured two years of autonomy and a working trade compact. The campaign may continue.',zh:'城邦议会维持两年自治，并建立有效贸易协定；战役仍可继续。'})}
 state.log=state.log.slice(0,80);
 return state;
}
