// Completed milestones stay in the campaign save until formal finalization.
// This module never writes to the permanent Legacy profile or the campaign log.
export const ACHIEVEMENTS=[
 {id:'survive:12',category:'ordinary',name:['One Year of War','烽火一年'],description:['Your command endured twelve campaign months.','你的阵营度过了十二个战役月份。'],coins:60},
 {id:'survive:24',category:'ordinary',name:['The Long Campaign','持久战役'],description:['Your command endured twenty-four campaign months.','你的阵营度过了二十四个战役月份。'],coins:90},
 {id:'survive:36',category:'ordinary',name:['Three Years Under Arms','披甲三年'],description:['Your command endured thirty-six campaign months.','你的阵营度过了三十六个战役月份。'],coins:150,collectible:'laurel-coin'},
 {id:'objective',category:'ordinary',name:['A Campaign Objective','战役目标'],description:['A campaign objective was completed.','完成了一项战役目标。'],coins:80},
 {id:'control:40',category:'hidden',name:['Forty Standards','四十面军旗'],description:['Your command held forty territories at one time.','你的阵营曾同时控制四十处领土。'],coins:120,collectible:'captured-standard'},
 {id:'first-recon',category:'hidden',name:['Eyes Across the Frontier','边境之眼'],description:['Your command gathered military reconnaissance.','你的阵营取得了军事侦察情报。'],coins:75},
 {id:'victory',category:'legendary',name:['History in Your Hands','执掌历史'],description:['Your command prevailed in the civil war.','你的阵营在内战中获胜。'],coins:500,collectible:'victory-map'},
 {id:'challenge',category:'legendary',name:['Against the Chronicle','改写编年史'],description:['An alternate-history scenario ended in victory.','你赢得了一场架空历史情景战役。'],coins:200}
];
export const achievementDefinition=id=>ACHIEVEMENTS.find(a=>a.id===(id.startsWith('objective:')?'objective':id));
const turn=s=>Math.max(0,(s.year-(s.startYear??-49))*12+s.month-(s.startMonth??1));
const stamp=s=>({year:s.year,month:s.month,turn:turn(s)});
export function initializeAchievements(s){s.achievementState||={version:1,completed:{},finalized:false,result:null,endedAt:null};s.achievementState.completed||={};return s.achievementState}
export function evaluateAchievements(s){
 const a=initializeAchievements(s);if(a.finalized||!s.factions?.[s.player])return a;
 const mark=(id,evidence)=>{if(!a.completed[id])a.completed[id]={...stamp(s),evidence}};
 for(const months of [12,24,36])if(turn(s)>=months)mark(`survive:${months}`,{months:turn(s)});
 for(const [goal,progress] of Object.entries(s.objectiveProgress||{}))if(progress?.status==='completed'&&progress.changedTurn>0)mark(`objective:${goal}`,{goal,completedTurn:progress.changedTurn});
 const territories=s.regions.filter(r=>r.owner===s.player).length;if(territories>=40)mark('control:40',{territories});
 if((s.militaryRecon||[]).some(r=>r.owner===s.player&&['scouts','probe'].includes(r.source)))mark('first-recon',{source:'military reconnaissance'});
 if(s.victory&&['caesar','senate'].includes(s.player)){mark('victory',{territories,battles:s.battles?.length||0});if(s.legacyScenario)mark('challenge',{scenario:s.legacyScenario})}
 return a;
}
export function campaignSummary(s){
 const own=s.player,battles=(s.battles||[]).filter(b=>[b.attacker?.owner,b.defender?.owner].includes(own)),wins=battles.filter(b=>(b.attackerWins?b.attacker?.owner:b.defender?.owner)===own).length;
 const casualties=battles.reduce((n,b)=>n+(b.attacker?.owner===own?b.lossA:b.lossD||0),0);
 const warKeys=new Set(['caesar','senate'].includes(own)?['caesar:senate']:[]);
 for(const war of s.wars||[])if(war.includes(own))warKeys.add([...war].sort().join(':'));
 for(const event of s.campaignEvents||[])if(event.type==='diplomacy'&&event.action==='war'&&[event.factionId,event.targetFactionId].includes(own))warKeys.add([event.factionId,event.targetFactionId].sort().join(':'));
 const commanders=[...new Map(battles.flatMap(b=>[b.attacker,b.defender].filter(side=>side?.owner===own).map(side=>side.commander).filter(Boolean)).map(name=>[JSON.stringify(name),name])).values()].slice(0,8);
 return {winner:s.campaignOutcome?.winner||null,method:s.campaignOutcome?.kind||null,civilWarOutcome:s.civilWarOutcome||null,duration:turn(s),year:s.year,month:s.month,rulers:[...(s.world?.leadership?.[own]||[])],territories:s.regions.filter(r=>r.owner===own).length,wars:warKeys.size,battles:battles.length,wins,losses:battles.length-wins,casualties,commanders,politics:(s.campaignEvents||[]).filter(e=>['diplomacy','objective','rebellion'].includes(e.type)).slice(0,12).map(e=>({id:e.id,type:e.type,action:e.action||e.objectiveStatus||null,year:e.year,month:e.month})),economy:{treasury:s.factions[own]?.treasury??0,food:s.factions[own]?.food??0,manpower:s.factions[own]?.manpower??0,stability:s.factions[own]?.stability??0,legitimacy:s.factions[own]?.legitimacy??0},settlement:s.civilSettlement||null};
}
export function endCampaign(s,result){const a=evaluateAchievements(s);if(a.finalized)return {ok:false,reason:'finalized',state:a};const noCommand=!s.regions.some(r=>r.owner===s.player)&&!s.armies.some(unit=>unit.owner===s.player&&unit.men>0);const chosen=result==='defeat'||!s.victory&&noCommand?'defeat':s.victory?'victory':'retired';a.finalized=true;a.result=chosen;a.endedAt=stamp(s);a.summary=campaignSummary(s);return {ok:true,state:a,achievements:Object.entries(a.completed).map(([id,record])=>({id,...record}))}}
export function revealedAchievements(s){const a=initializeAchievements(s);return a.finalized?Object.entries(a.completed).map(([id,record])=>({id,...record,definition:achievementDefinition(id)})).filter(x=>x.definition):[]}
