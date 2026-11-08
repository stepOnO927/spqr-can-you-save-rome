// These are optional simulated policy traditions, not historical doctrines.
// The existing faction research field remains the single research balance.
export const NATIONAL_IDEAS={
 civic_compromise:{name:['Civic compromise','公民妥协'],description:['Public opposition grows 10% more slowly; grievances remain real.','公开反对运动的支持增长降低10%；实际诉求仍然存在。']},
 oversight:{name:['Institutional oversight','制度监督'],description:['Reduces the chance that an eligible personal network begins plotting.','降低符合条件的人物开始策划政治阴谋的概率。']},
 diplomacy:{name:['Diplomatic custom','外交惯例'],description:['Adds four points to how recipients assess a treaty proposal.','对方评估条约提议时增加4点。']},
 tolerance:{name:['Civic tolerance','公民宽容'],description:['Negotiation or tolerance policies improve institutional relations by two additional points.','协商或宽容政策额外改善2点机构关系。']}
};
export function hasNationalIdea(s,actor,id){return !!s.world?.nationalIdeas?.[actor]?.includes(id)}
export function adoptNationalIdea(s,actor,id){
 const f=s.factions?.[actor];if(!f||!NATIONAL_IDEAS[id]||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 s.world.nationalIdeas||={};const ideas=s.world.nationalIdeas[actor]||=[];
 if(ideas.includes(id))return {ok:false,reason:'existing'};if(ideas.length>=2)return {ok:false,reason:'limit'};
 if((f.research||0)<8||f.treasury<12)return {ok:false,reason:'resources'};
 f.research-=8;f.treasury-=12;ideas.push(id);return {ok:true};
}
export function advanceNationalIdeas(s){
 if(s.month%3!==0)return;
 for(const [actor,f] of Object.entries(s.factions)){
  if(actor==='rebels'||!s.regions.some(r=>r.owner===actor))continue;f.research=(Number.isFinite(f.research)?f.research:0)+1;
  if(actor===s.player||s.month!==12||f.research<8||f.treasury<35)continue;
  const own=s.world.nationalIdeas?.[actor]||[],institution=(s.world.religiousInstitutions||[]).find(o=>s.regions.some(r=>r.id===o.region&&r.owner===actor)&&(o.relations[actor]??0)<0);
  const options=f.stability<45?['civic_compromise','oversight','tolerance','diplomacy']:institution?['tolerance','diplomacy','oversight','civic_compromise']:['diplomacy','oversight','civic_compromise','tolerance'];
  const choice=options.find(id=>!own.includes(id));if(choice)adoptNationalIdea(s,actor,choice);
 }
}
