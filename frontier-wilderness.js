import {localEntity} from './local-polities.js';
import {recordLocalDiscovery} from './local-discovery.js?v=official-inquiries-1';

const now=state=>state.year*12+state.month;
const sites=state=>state.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.type==='wilderness'&&entity.proceduralWilderness);

export function wildernessSurveyQuote(state,id,actor=state.player){
 const entity=localEntity(state,id),w=entity?.wilderness,faction=state.factions?.[actor];
 if(!w||entity.type!=='wilderness'||!faction||w.passability==='impassable')return {ok:false,reason:'unavailable'};
 if(w.surveyedBy?.[actor])return {ok:false,reason:'already_surveyed'};
 if(w.surveyProject)return {ok:false,reason:'busy'};
 if(!state.armies.some(army=>army.owner===actor&&army.region===entity.theater&&army.men>=100&&!army.move))return {ok:false,reason:'field_party'};
 if(faction.treasury<4||faction.food<1)return {ok:false,reason:'resources'};
 return {ok:true,treasury:4,food:1,months:2};
}

export function startWildernessSurvey(state,id,actor=state.player){
 const quote=wildernessSurveyQuote(state,id,actor);if(!quote.ok)return quote;
 state.factions[actor].treasury-=quote.treasury;state.factions[actor].food-=quote.food;
 localEntity(state,id).wilderness.surveyProject={actor,remaining:quote.months,lastAdvanced:null};
 return quote;
}

export function advanceWildernessSurveys(state){
 if(state.dlc)return [];
 const completed=[];
 for(const entity of sites(state)){
  const project=entity.wilderness.surveyProject;if(!project)continue;
  if(project.lastAdvanced?.year===state.year&&project.lastAdvanced?.month===state.month)continue;
  if(!state.armies.some(army=>army.owner===project.actor&&army.region===entity.theater&&army.men>=100&&!army.move))continue;
  project.lastAdvanced={year:state.year,month:state.month};
  if(--project.remaining>0)continue;
  entity.wilderness.surveyProject=null;
  entity.wilderness.surveyedBy[project.actor]={year:state.year,month:state.month};
  recordLocalDiscovery(state,project.actor,entity.id,4,'field_survey');
  if(state.regions.find(region=>region.id===entity.theater)?.owner===project.actor&&entity.maxFootholdLevel>0)entity.access[project.actor]=now(state)+18;
  completed.push({id:entity.id,actor:project.actor,theater:entity.theater});
 }
 return completed;
}
