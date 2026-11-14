import {ROUTES} from './data.js?v=phase-x-1';
import {reportedControl} from './control-intelligence.js?v=fort-intel-1';
import {activeAgreement} from './agreements.js?v=grand-chessboard-2';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=diplomatic-chronicle-1';

const pair=(a,b)=>[a,b].sort().join(':');
const rel=(s,a,b)=>s.relations[pair(a,b)]??0;
const war=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
const now=s=>s.year*12+s.month;
const ownStrength=(s,a)=>s.armies.filter(x=>x.owner===a).reduce((n,x)=>n+x.men,0);
const near=(s,actor,target)=>s.regions.filter(r=>r.owner===actor).some(r=>ROUTES.some(([a,b])=>{const other=a===r.id?b:b===r.id?a:null;return other&&reportedControl(s,actor,other)?.owner===target}));

// Every six months, preserve only what each observer's own dated control
// reports indicate. A newly received old report is evidence, not omniscience.
export function observeBalanceOfPower(s){
 s.world.balanceOfPower||={};
 for(const [actor,reports] of Object.entries(s.controlKnowledge||{})){
  if(!s.factions[actor])continue;const counts={};for(const r of Object.values(reports||{}))if(r.owner&&r.owner!==actor)counts[r.owner]=(counts[r.owner]||0)+1;
  const records=s.world.balanceOfPower[actor]||={};for(const target of new Set([...Object.keys(counts),...Object.keys(records)])){const count=counts[target]||0;
   const old=records[target];if(!old)records[target]={observedTerritories:count,reportedGrowth:0,year:s.year,month:s.month};
   else if(now(s)-(old.year*12+old.month)>=6)records[target]={observedTerritories:count,reportedGrowth:Math.max(-5,Math.min(5,count-old.observedTerritories)),year:s.year,month:s.month};
  }
 }
}
export function perceivedBalance(s,actor,target,estimateStrength){
 const estimate=estimateStrength(s,actor,target),own=ownStrength(s,actor),border=near(s,actor,target),documents=reportedDiplomacy(s,actor).filter(d=>d.status==='active'&&d.parties.includes(target));
 const network=documents.filter(d=>d.kind==='alliance'||d.kind==='coalition'||d.type==='defensive').length,trade=documents.filter(d=>d.type==='trade').length;
 const history=s.world.balanceOfPower?.[actor]?.[target],growth=Math.max(0,history?.reportedGrowth||0),reports=(s.knowledge?.[actor]?.[target]?.reports||[]).filter(r=>r.kind==='stability'&&['stable','strained','fragile'].includes(r.value)&&now(s)-((r.observationYear??r.year)*12+(r.observationMonth??r.month))>=0&&now(s)-((r.observationYear??r.year)*12+(r.observationMonth??r.month))<=24).sort((a,b)=>((b.observationYear??b.year)*12+(b.observationMonth??b.month))-((a.observationYear??a.year)*12+(a.observationMonth??a.month)));
 const stability=reports[0]?.value||'unknown',objective=s.world.strategicPlans?.[actor]?.goal||'unknown',ratio=estimate/Math.max(1000,own);
 const pressure=ratio*2+(border?2:0)+(rel(s,actor,target)<-15?2:0)+Math.min(2,growth)+Math.min(2,network*.5)+Math.min(1,trade*.25)+(stability==='stable'?.5:stability==='fragile'?-.5:0)+(objective==='defend'?.5:0);
 return {estimate,own,border,ratio,network,trade,reportedGrowth:growth,stability,objective,pressure};
}

// Each court assesses the danger using its own strength and its own reports.
// The calling simulation supplies the same estimate function used by AI orders.
export function coalitionInterest(s,actor,target,estimateStrength){
 if(!s.factions[actor]||!s.factions[target]||actor===target)return {interested:false,reason:'unavailable'};
 const balance=perceivedBalance(s,actor,target,estimateStrength),enemy=war(s,actor,target);
 const perceivedThreat=enemy||balance.border&&(rel(s,actor,target)<-15||balance.estimate>balance.own*1.35||balance.ratio>1&&balance.pressure>=6.5);
 return {interested:perceivedThreat&&!activeAgreement(s,actor,target,'non_aggression'),border:balance.border,enemy,estimate:balance.estimate,balance};
}
export function formCoalition(s,leader,members,target,estimateStrength,{allowPlayer=false}={}){
 const parties=[...new Set([leader,...members])];
 if(parties.length<3||parties.length>5||parties.includes(target)||typeof estimateStrength!=='function')return {ok:false,reason:'members'};
 if(!allowPlayer&&leader!==s.player&&parties.includes(s.player))return {ok:false,reason:'player_decision'};
 if(parties.some(id=>!s.factions[id]||!s.regions.some(r=>r.owner===id)||s.factions[id].treasury<5))return {ok:false,reason:'resources'};
 if(!s.factions[target]||parties.some((id,i)=>parties.slice(i+1).some(other=>war(s,id,other))||s.alliances.some(a=>a.includes(id)&&a.includes(target))))return {ok:false,reason:'conflict'};
 if(parties.some(id=>id!==leader&&(rel(s,id,leader)<15||rel(s,id,leader)-(100-(s.diplomaticCredibility?.[leader]??100))*.4<15)))return {ok:false,reason:'relations'};
 if(parties.some(id=>!coalitionInterest(s,id,target,estimateStrength).interested))return {ok:false,reason:'interest'};
 s.coalitions||=[];
 if(s.coalitions.some(c=>c.status==='active'&&c.target===target&&c.parties.some(id=>parties.includes(id))))return {ok:false,reason:'existing'};
 for(const id of parties)s.factions[id].treasury-=5;
 let fundingAssigned=false;const contributions=Object.fromEntries(parties.map(id=>{const f=s.factions[id];let policy;if(f.food<10)policy='diplomacy';else if(id===leader)policy='military';else if(!fundingAssigned&&f.treasury>50){policy='funding';fundingAssigned=true}else policy=f.food>40?'supplies':f.treasury>50?'funding':'military';return [id,{policy,paid:0,supplies:0}]}));
 const trust=Object.fromEntries(parties.flatMap((a,i)=>parties.slice(i+1).map(b=>[pair(a,b),Math.round((rel(s,a,b)+100)/2)])));
 const c={id:`coalition:${s.nextCoalitionId||1}`,leader,parties,target,objective:'defend_against_threat',start:{year:s.year,month:s.month},expiresAt:now(s)+36,status:'active',cohesion:70,trust,contributions,departures:[],obligations:['defend_members'],jointPlan:{target,kind:'coordinate_defense'},disagreements:[]};
 s.nextCoalitionId=(s.nextCoalitionId||1)+1;s.coalitions.push(c);return {ok:true,coalition:c};
}
export function leaveCoalition(s,id,actor){
 const c=(s.coalitions||[]).find(x=>x.id===id&&x.status==='active');if(!c||!c.parties.includes(actor))return {ok:false,reason:'unavailable'};
 c.parties=c.parties.filter(x=>x!==actor);c.departures.push({actor,year:s.year,month:s.month});s.diplomaticCredibility||={};s.diplomaticCredibility[actor]=Math.max(0,(s.diplomaticCredibility[actor]??100)-15);
 for(const other of c.parties){const k=pair(actor,other);s.relations[k]=Math.max(-100,rel(s,actor,other)-15);rememberPoliticalEvent(s,other,actor,'coalition_departure',-8)}
 if(c.leader===actor)c.leader=c.parties[0];if(c.parties.length<3)c.status='dissolved';return {ok:true};
}
export function advanceCoalitions(s){
 for(const c of s.coalitions||[]){
  if(c.status!=='active')continue;
  if(now(s)>=c.expiresAt||!s.factions[c.target]){c.status='expired';continue}
  c.parties=c.parties.filter(id=>s.factions[id]);if(c.parties.length<3){c.status='dissolved';continue}if(!c.parties.includes(c.leader))c.leader=c.parties[0];
  c.trust||={};const scores=[];for(let i=0;i<c.parties.length;i++)for(let j=i+1;j<c.parties.length;j++){const a=c.parties[i],b=c.parties[j],relation=rel(s,a,b);scores.push(relation);c.trust[pair(a,b)]=Math.round((relation+100)/2)}
  const average=scores.reduce((a,b)=>a+b,0)/Math.max(1,scores.length);
  c.cohesion=Math.max(0,Math.min(100,Math.round(c.cohesion+(average<0?-3:average>30?1:0))));
  c.disagreements=average<0?['rival_members']:[];
  if(c.cohesion<15){c.status='fractured';continue}
  if(s.month%3===0&&s.factions[c.leader])for(const id of c.parties){const f=s.factions[id],p=c.contributions[id];if(id===c.leader||!f||!p)continue;if(p.policy==='funding'&&f.treasury>35){f.treasury--;s.factions[c.leader].treasury++;p.paid++}else if(p.policy==='supplies'&&f.food>25){f.food-=2;s.factions[c.leader].food+=2;p.supplies=(p.supplies||0)+2}else if(p.policy==='diplomacy'){const k=pair(id,c.leader);s.relations[k]=Math.min(100,rel(s,id,c.leader)+1)}}
 }
}

// Members pursuing a military contribution retain their own armies and
// information. The shared threat only affects which known enemy they weigh
// first; it does not give the coalition control over their orders.
export function coalitionMilitaryObjective(s,actor){
 const c=(s.coalitions||[]).find(c=>c.status==='active'&&c.parties.includes(actor)&&c.contributions?.[actor]?.policy==='military'&&war(s,actor,c.target));
 return c?.target||null;
}
