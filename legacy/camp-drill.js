import {claimReward} from './legacy-core.js?v=25';

// A fictional civic exercise about evidence, provisions and duty of care.
// It grants no advantage in the war campaign.
export const CAMP_DRILL_STAGES=[
 {title:['A dated route report','有日期的路线报告'],text:['The camp has a three-month-old account of a blocked road. The next march is still being planned.','军营收到一份三个月前的道路受阻报告，而下一次行程仍在筹划。'],choices:[
  {label:['Request a fresh check and mark the old account uncertain','重新核查，并把旧报告标为不确定'],result:['The plan waits for a dated observation.','计划等待有日期的新观察。'],points:2},
  {label:['Keep the report as a clue but plan a flexible departure','保留线索，同时安排可调整的出发时间'],result:['The uncertainty stays visible to the quartermaster.','军需官仍能看到不确定性。'],points:1},
  {label:['Record the road as certainly blocked today','把道路记为今天确定受阻'],result:['An old account was mistaken for a current fact.','旧报告被误当成了当前事实。'],points:0}
 ]},
 {title:['The provisions ledger','粮秣账簿'],text:['The ledger shows that provisions will not cover the whole planned exercise.','账簿显示，现有粮秣不足以完成原定演练。'],choices:[
  {label:['Shorten the exercise and obtain supplies before extending it','缩短演练，补足物资后再延长'],result:['The revised schedule fits the recorded stores.','调整后的日程与库存相符。'],points:2},
  {label:['Use the available stores and review the schedule tomorrow','按现有库存执行，明日复核日程'],result:['The immediate shortage is watched, but the plan remains fragile.','短缺受到监测，但计划仍很脆弱。'],points:1},
  {label:['Keep the full schedule and leave the shortage out of the report','照旧执行全部日程，不把短缺写进报告'],result:['The command record hides a real constraint.','指挥记录隐瞒了真实约束。'],points:0}
 ]},
 {title:['After the march','行程结束后'],text:['Several participants report fatigue. The camp must decide what to record before the next exercise.','数名参加者报告疲劳。军营需要决定如何为下一次演练记录情况。'],choices:[
  {label:['Record the fatigue and rotate duties before the next session','记录疲劳，并在下次演练前轮换任务'],result:['The next plan accounts for the people who must carry it out.','下一次计划考虑了实际执行任务的人。'],points:2},
  {label:['Record it and ask for another review at the next assembly','记录情况，留待下次集会复核'],result:['The evidence survives, though the response is delayed.','证据得到保存，但处理有所延迟。'],points:1},
  {label:['Erase the complaints to keep the record tidy','为保持记录整洁而删去抱怨'],result:['A neat ledger now conceals the condition of the camp.','整齐的账簿掩盖了军营的实际状况。'],points:0}
 ]}
];

export const CAMP_DRILL_GRADES={
 careful:{name:['Careful stewardship','审慎管理'],summary:['The camp kept uncertain reports, stores and people in view.','军营同时顾及不确定的报告、库存与人员。']},
 mixed:{name:['Uneven preparation','准备参差'],summary:['Some constraints were recorded, while others were left unresolved.','部分约束得到了记录，另一些仍悬而未决。']},
 poor:{name:['Unreliable record','记录失真'],summary:['The exercise exposed gaps in the camp ledger and its decisions.','演练暴露了账簿和决策中的缺漏。']}
};

export function beginCampDrill(profile){
 if(!profile.buildings?.includes('camp'))return {ok:false,reason:'building'};
 if(profile.campDrill?.status==='active')return {ok:false,reason:'active'};
 profile.campDrill={status:'active',stage:0,answers:[],startedAt:new Date().toISOString()};
 profile.campDrillRuns=(profile.campDrillRuns||0)+1;
 return {ok:true};
}

export function answerCampDrill(profile,choice){
 const drill=profile.campDrill,scene=CAMP_DRILL_STAGES[drill?.stage];
 if(!profile.buildings?.includes('camp')||drill?.status!=='active'||!scene||!Number.isInteger(choice)||!scene.choices[choice])return {ok:false,reason:'unavailable'};
 drill.answers.push(choice);drill.stage++;
 if(drill.stage<CAMP_DRILL_STAGES.length)return {ok:true,complete:false,stage:drill.stage};
 const score=drill.answers.reduce((total,answer,index)=>total+CAMP_DRILL_STAGES[index].choices[answer].points,0);
 const grade=score>=5?'careful':score>=3?'mixed':'poor';
 const awarded=claimReward(profile,'camp:drill',50);
 if(awarded)profile.politics.reputation=Math.min(100,profile.politics.reputation+(grade==='careful'?3:grade==='mixed'?1:0));
 profile.campDrillBest=Math.max(profile.campDrillBest||0,score);
 Object.assign(drill,{status:'complete',score,grade,coinsClaimed:awarded?50:0,completedAt:new Date().toISOString()});
 return {ok:true,complete:true,score,grade,coins:drill.coinsClaimed};
}
