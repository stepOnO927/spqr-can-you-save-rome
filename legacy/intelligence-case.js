import {claimReward} from './legacy-core.js?v=8';

export const HARBOR_DOSSIER='harbor-seal';
export const HARBOR_COSTS={registry:20,informant:30,corroboration:15};
const verdictEffects={
 audit:{checked:{people:3,reputation:3,corruption:-3},unchecked:{people:1,reputation:-2,corruption:-1}},
 accuse:{checked:{people:4,aristocrats:-3,reputation:-1},unchecked:{people:2,aristocrats:-4,reputation:-5}},
 close:{checked:{aristocrats:2,people:-3,reputation:-3,corruption:2},unchecked:{aristocrats:2,people:-2,reputation:1,corruption:2}}
};
const now=()=>new Date().toISOString();
export function harborDossier(profile){return (profile.intelligenceDossiers||[]).find(item=>item?.id===HARBOR_DOSSIER)||null}

export function beginHarborDossier(profile,route){
 const cost=HARBOR_COSTS[route];
 if(!profile.buildings?.includes('intelligence')||!cost||harborDossier(profile))return {ok:false,reason:'unavailable'};
 if(profile.coins<cost)return {ok:false,reason:'coins'};
 profile.coins-=cost;
 const dossier={id:HARBOR_DOSSIER,status:'open',route,startedAt:now(),evidence:[route==='registry'?'registry-copy':'dockhand-claim'],corroborated:false};
 (profile.intelligenceDossiers||=[]).push(dossier);
 return {ok:true,cost,dossier};
}

export function corroborateHarborDossier(profile){
 const dossier=harborDossier(profile);
 if(!dossier||dossier.status!=='open'||dossier.corroborated||!profile.buildings?.includes('intelligence'))return {ok:false,reason:'unavailable'};
 if(profile.coins<HARBOR_COSTS.corroboration)return {ok:false,reason:'coins'};
 profile.coins-=HARBOR_COSTS.corroboration;
 dossier.corroborated=true;dossier.corroboratedAt=now();
 dossier.evidence.push(dossier.route==='registry'?'dockhand-claim':'registry-copy');
 return {ok:true,cost:HARBOR_COSTS.corroboration,dossier};
}

export function closeHarborDossier(profile,verdict){
 const dossier=harborDossier(profile),outcomes=verdictEffects[verdict];
 if(!dossier||dossier.status!=='open'||!outcomes||!profile.buildings?.includes('intelligence'))return {ok:false,reason:'unavailable'};
 const effects=outcomes[dossier.corroborated?'checked':'unchecked'];
 for(const [key,change] of Object.entries(effects))profile.politics[key]=Math.max(0,Math.min(100,(profile.politics[key]||0)+change));
 dossier.status='closed';dossier.verdict=verdict;dossier.closedAt=now();dossier.effects={...effects};
 const awarded=claimReward(profile,`dossier:${HARBOR_DOSSIER}`,50);
 dossier.coinsClaimed=awarded?50:0;
 profile.collectibles||=[];
 if(!profile.collectibles.includes('harbor-seal-dossier'))profile.collectibles.push('harbor-seal-dossier');
 return {ok:true,coins:dossier.coinsClaimed,dossier};
}
