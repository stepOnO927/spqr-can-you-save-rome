import {claimReward} from './legacy-core.js?v=7';

// A fictional constitutional exercise in the permanent city. The opinions
// come from invited groups, never from hidden campaign characters or events.
export const COUNCIL_COST=20;
export const COUNCIL_AUDIENCES={
 senate:{name:['Senate delegation','元老院代表'],view:['The delegates demand a public vote and a record of the appointment.','代表要求公开表决，并保存任命记录。'],effects:{senate:2,people:-1}},
 veterans:{name:['Veterans’ delegation','老兵代表'],view:['The veterans want a commander who can keep the peace, but offer no constitutional mandate.','老兵希望有人能维持秩序，但他们不能授予宪制权力。'],effects:{people:2,aristocrats:-1}},
 provinces:{name:['Provincial delegation','行省代表'],view:['The envoys ask that communities beyond Rome be heard before a successor is named.','使者要求在确定继任者之前听取罗马城外各地的意见。'],effects:{people:1,senate:-1,corruption:-1}}
};
export const COUNCIL_CHARTERS={
 election:{name:['Elect a magistrate for one year','选出任期一年的官员'],effects:{people:3,senate:5,aristocrats:-1,corruption:-1,reputation:1}},
 adoption:{name:['Name an adopted successor, subject to a vote','提名养子继承人并交由表决'],effects:{people:1,senate:-2,aristocrats:4,corruption:1,reputation:2}},
 caretaker:{name:['Appoint a temporary military caretaker','任命临时军事摄政者'],effects:{people:4,senate:-4,aristocrats:-3,corruption:3,reputation:-1}}
};
export const COUNCIL_RESPONSES={
 publish:{name:['Publish the charter and objections','公布宪章与反对意见'],effects:{reputation:3,corruption:-1}},
 oversight:{name:['Add a Senate review clause','加入元老院复核条款'],effects:{senate:3,people:-1,corruption:-2}}
};
const stamp=()=>new Date().toISOString();
export function palaceCouncil(profile){return (profile.palaceCouncils||[]).find(x=>x?.id==='succession-charter')||null}
export function conveneCouncil(profile,audience){
 if(!profile.buildings?.includes('palace')||!COUNCIL_AUDIENCES[audience]||palaceCouncil(profile))return {ok:false,reason:'unavailable'};
 if(profile.coins<COUNCIL_COST)return {ok:false,reason:'coins'};
 profile.coins-=COUNCIL_COST;
 const council={id:'succession-charter',status:'consultation',audience,openedAt:stamp(),cost:COUNCIL_COST};
 (profile.palaceCouncils||=[]).push(council);
 return {ok:true,council};
}
export function draftCharter(profile,charter){
 const council=palaceCouncil(profile);
 if(!profile.buildings?.includes('palace')||council?.status!=='consultation'||!COUNCIL_CHARTERS[charter])return {ok:false,reason:'unavailable'};
 council.charter=charter;council.draftedAt=stamp();council.status='objection';
 return {ok:true,council};
}
export function settleCouncil(profile,response){
 const council=palaceCouncil(profile);
 if(!profile.buildings?.includes('palace')||council?.status!=='objection'||!COUNCIL_RESPONSES[response]||!COUNCIL_AUDIENCES[council.audience]||!COUNCIL_CHARTERS[council.charter])return {ok:false,reason:'unavailable'};
 const effects={};
 for(const source of [COUNCIL_AUDIENCES[council.audience],COUNCIL_CHARTERS[council.charter],COUNCIL_RESPONSES[response]])for(const [key,change] of Object.entries(source.effects))effects[key]=(effects[key]||0)+change;
 for(const [key,change] of Object.entries(effects))profile.politics[key]=Math.max(0,Math.min(100,(profile.politics[key]||0)+change));
 council.status='settled';council.response=response;council.settledAt=stamp();council.effects=effects;
 const awarded=claimReward(profile,'palace:succession-charter',60);
 council.coinsClaimed=awarded?60:0;
 profile.collectibles||=[];
 if(!profile.collectibles.includes('succession-charter'))profile.collectibles.push('succession-charter');
 return {ok:true,coins:council.coinsClaimed,council};
}
