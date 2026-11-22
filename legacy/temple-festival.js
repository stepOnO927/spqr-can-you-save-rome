import {claimReward} from './legacy-core.js';

export const FESTIVAL_PLANS={
 modest:{name:['Modest neighborhood rite','朴素的街区祭仪'],cost:20},
 grand:{name:['Grand civic procession','盛大的城邦游行'],cost:45}
};
export const FESTIVAL_COUNSELS={
 consult:{name:['Hear the local priests and residents','听取地方祭司与居民意见']},
 direct:{name:['Let the magistrates set the program','由官员直接安排活动']}
};
export const FESTIVAL_PRIORITIES={
 provisions:{name:['Reserve food for participants','为参加者预留食物']},
 display:{name:['Spend the remainder on spectacle','把剩余经费用于表演']}
};
const now=()=>new Date().toISOString();
const change=(profile,effects)=>{for(const [key,amount] of Object.entries(effects))profile.politics[key]=Math.max(0,Math.min(100,(profile.politics[key]||0)+amount))};

export function beginTempleFestival(profile,plan){
 const terms=FESTIVAL_PLANS[plan];
 if(!profile.buildings?.includes('temple')||!terms||profile.templeFestival)return {ok:false,reason:'unavailable'};
 if(profile.coins<terms.cost)return {ok:false,reason:'coins'};
 profile.coins-=terms.cost;
 profile.templeFestival={status:'planning',plan,spent:terms.cost,openedAt:now()};
 return {ok:true,cost:terms.cost};
}

export function counselTempleFestival(profile,counsel){
 const record=profile.templeFestival;
 if(!profile.buildings?.includes('temple')||record?.status!=='planning'||!FESTIVAL_COUNSELS[counsel])return {ok:false,reason:'unavailable'};
 record.counsel=counsel;record.counseledAt=now();record.status='ready';
 return {ok:true};
}

export function settleTempleFestival(profile,priority){
 const record=profile.templeFestival;
 if(!profile.buildings?.includes('temple')||record?.status!=='ready'||!FESTIVAL_PRIORITIES[priority])return {ok:false,reason:'unavailable'};
 const effects={people:priority==='provisions'?5:2,reputation:1};
 if(record.plan==='grand'){effects.aristocrats=priority==='display'?3:1;effects.corruption=priority==='display'?2:0}
 else effects.senate=1;
 if(record.counsel==='consult'){effects.reputation+=3;effects.people+=1}
 else {effects.senate=(effects.senate||0)+2;effects.people-=2}
 change(profile,effects);
 record.priority=priority;record.effects=effects;record.status='complete';record.settledAt=now();
 const awarded=claimReward(profile,'temple:rite',50);
 record.coinsClaimed=awarded?50:0;
 profile.collectibles||=[];
 if(!profile.collectibles.includes('festival-programme'))profile.collectibles.push('festival-programme');
 return {ok:true,coins:record.coinsClaimed,effects};
}
