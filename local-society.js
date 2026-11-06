import {grandAdjacent} from './grand-operations.js';

const traditionFor=owner=>({caesar:'roman-cults',senate:'roman-cults',egypt:'egyptian-cults',galatia:'local-cults',bosporus:'hellenic-cults',parthia:'local-cults',armenia:'local-cults',numidia:'local-cults',mauretania:'local-cults'})[owner]||'local-cults';
export function provinceFaith(region){
 const dominant=({egypt:'egyptian-cults',achaia:'hellenic-cults',epirus:'hellenic-cults',anatolia:'hellenic-cults',bosporus:'hellenic-cults'})[region.macro]||(['parthia','armenia','galatia','africa','numidia','mauretania'].includes(region.macro)?'local-cults':'roman-cults');
 const minority=dominant==='roman-cults'?'local-cults':dominant==='egyptian-cults'?'hellenic-cults':'roman-cults';
 return [{id:dominant,share:70},{id:minority,share:30}];
}
export function initializeLocalSociety(state){if(!state.grandMap)return state;state.religion ||= {};for(const owner of Object.keys(state.factions))state.religion[owner] ||= {policy:'customary',transition:null};for(const r of state.regions){r.faiths ||= provinceFaith(r);r.initialPopulation ||= r.population;r.civicSatisfaction ??= r.loyalty;r.integration ??= 55;r.priesthood ||= {tradition:r.faiths[0].id,influence:40}}return state}
export function setReligiousPolicy(state,owner,policy){
 initializeLocalSociety(state);const record=state.religion?.[owner],f=state.factions[owner];
 if(!record||!['customary','local-rites','civic-patronage'].includes(policy)||record.policy===policy||record.transition)return {ok:false,reason:'policy'};
 if(f.treasury<18)return {ok:false,reason:'treasury'};
 f.treasury-=18;f.stability=Math.max(0,f.stability-2);record.transition={policy,remaining:3};return {ok:true,months:3,cost:18};
}
export function advanceReligion(state){
 if(!state.grandMap)return;initializeLocalSociety(state);
 for(const [owner,record] of Object.entries(state.religion)){
  if(record.transition&&--record.transition.remaining<=0){record.policy=record.transition.policy;record.transition=null}
  if(record.policy==='civic-patronage'&&state.factions[owner]?.treasury>0){state.factions[owner].treasury-=1;state.factions[owner].legitimacy=Math.min(100,state.factions[owner].legitimacy+1)}
 }
 if(state.month%3!==0)return;
 for(const r of state.regions){if(!r.priesthood)continue;const policy=state.religion[r.owner]?.policy||'customary',aligned=r.priesthood.tradition===traditionFor(r.owner);
  r.priesthood.influence=Math.max(15,Math.min(80,r.priesthood.influence+(policy==='civic-patronage'?(aligned?2:-2):policy==='local-rites'?1:0)));
 }
}
export function faithSatisfaction(state,region){
 if(!state.grandMap||state.month%3!==0)return 0;
 const accommodation=state.development?.[region.owner]?.slots?.culture?.includes('cultural-accommodation'),policy=state.religion?.[region.owner]?.policy||'customary',aligned=region.faiths?.[0]?.id===traditionFor(region.owner);
 if(policy==='local-rites')return !aligned||accommodation?1:0;
 if(policy==='civic-patronage')return aligned?1:accommodation?0:-2;
 if(accommodation)return region.integration<85?1:0;
 return region.integration<65&&!aligned?-1:0;
}
export function religionPanel(state,lang){
 if(!state.grandMap)return '';initializeLocalSociety(state);const zh=lang==='zh',record=state.religion[state.player],f=state.factions[state.player],label={'customary':zh?'沿用地方旧制':'Customary balance','local-rites':zh?'承认地方祭仪':'Recognize local rites','civic-patronage':zh?'资助城邦祭仪':'Civic patronage'};
 const policy=['customary','local-rites','civic-patronage'].map(id=>'<button data-religion-policy="'+id+'" '+(record.policy===id||record.transition||f.treasury<18?'disabled':'')+'>'+label[id]+' · 18¤ / 3'+(zh?'月':'m')+'</button>').join('');
 const mismatched=state.regions.filter(r=>r.owner===state.player&&r.faiths?.[0]?.id!==traditionFor(state.player)).length;
 return '<section class="dev-category religion-panel"><h3>'+(zh?'地方宗教与祭司团':'PROVINCIAL RITES & PRIESTHOODS')+'</h3><p>'+(zh?'这是公元前49年的地方祭仪政策，不是后世的国教制度。政策与各省主要信仰、祭司团影响及人口迁移互动。':'These are local rites in 49 BCE, not a later state religion. Policy interacts with provincial traditions, priesthood influence and migration.')+'</p><p>'+(zh?'当前政策':'Current policy')+': '+label[record.policy]+' · '+(zh?'主要信仰与本国习俗不同的领土':'territories with a different dominant tradition')+' '+mismatched+'</p>'+(record.transition?'<p class="dev-status">'+(zh?'政策过渡中':'Transition underway')+' · '+record.transition.remaining+(zh?'月':'m')+'</p>':'')+policy+'</section>';
}
export function advanceDemography(state){
 if(!state.grandMap)return;
 const changes=[];
 for(const r of state.regions){const faction=state.factions[r.owner];if(!faction||r.owner==='rebels')continue;const population=r.population||0;if(faction.food<0){r.population=Math.max(1000,Math.round(population*.998));r.civicSatisfaction=Math.max(0,r.civicSatisfaction-1)}else if(r.civicSatisfaction>65)r.population=Math.round(population*1.0003);
  if(r.civicSatisfaction>=35)continue;
  const destination=grandAdjacent(r.id).map(e=>state.regions.find(x=>x.id===e.to)).filter(x=>x?.owner===r.owner&&x.civicSatisfaction>r.civicSatisfaction+20).sort((a,b)=>b.civicSatisfaction-a.civicSatisfaction)[0];
  if(destination)changes.push({from:r,to:destination,people:Math.min(150,Math.floor(population*.002))});
 }
 for(const {from,to,people} of changes){if(from.population-people<1000)continue;const previous=to.population,total=previous+people,faiths=new Map();for(const item of to.faiths||[])faiths.set(item.id,(faiths.get(item.id)||0)+previous*item.share/100);for(const item of from.faiths||[])faiths.set(item.id,(faiths.get(item.id)||0)+people*item.share/100);to.faiths=[...faiths].map(([id,count])=>({id,share:Math.round(count/total*100)})).filter(x=>x.share>0).sort((a,b)=>b.share-a.share);from.population-=people;to.population=total}
}
