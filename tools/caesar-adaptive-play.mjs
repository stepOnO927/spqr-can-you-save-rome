import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {newGrandGame,upgradeSave,tick,army,region,adjacent,moveArmy,previewMarch,recruit,holdPosition,reserveFleet,nationalBudget,collectWarContributions,collectEmergencyProvisions,seizeAerarium,diplomacy,respondCivilSettlement,researchInnovation,constructionCheck,startConstruction} from '../engine.js';
import {assessment,sendScouts,probePositions,requestReinforcements} from '../reconnaissance.js';
import {afterActionHtml} from '../recon-ui.js';
import {campaignEndingHtml} from '../achievement-ui.js';
import {endCampaign,revealedAchievements} from '../achievement-system.js';
import {normalizeProfile,recordCampaign} from '../legacy/legacy-core.js';
import {publicSettlementTerms} from '../campaign-outcome.js';

// A changing-orders Caesar stress test. Every decision uses the public
// political map, own armies/resources, or the same dated report a player sees.
// This is an automated player path, not evidence of human-play balance.
// SPQR_ADAPTIVE_PRIORITY=cash compares workshop-first investment with the
// default food-first route while preserving the same military orders and seed.
let s=newGrandGame('caesar');
const selectedSeed=Number(process.env.SPQR_ADAPTIVE_SEED||s.seed);
assert.ok(Number.isSafeInteger(selectedSeed)&&selectedSeed>0);
s.seed=selectedSeed;
const limit=Math.max(36,Math.min(120,Number(process.env.SPQR_ADAPTIVE_MONTHS)||120));
const front=process.env.SPQR_ADAPTIVE_FRONT||'west';
assert.ok(['west','italy'].includes(front));
const invest=process.env.SPQR_ADAPTIVE_INVEST==='1';
const priority=process.env.SPQR_ADAPTIVE_PRIORITY||'food';
assert.ok(['food','cash'].includes(priority));
const log=[],snapshots=[],seenBattles=new Set(),orders=new Map(),goals=new Map();
let lastRecruitTurn=-Infinity,groupedAssaultBattles=0;
const act=(label,result)=>{if(result?.ok){log.push(`${s.year}/${s.month} ${label}`);return true}return false};
const owner=id=>region(s,id)?.owner;
const ours=()=>s.armies.filter(unit=>unit.owner==='caesar'&&unit.men>=600);
const fieldMen=()=>s.armies.filter(unit=>unit.owner==='caesar').reduce((total,unit)=>total+unit.men,0);
const ready=unit=>unit&&!unit.move&&!unit.siege&&!unit.reconPending&&!unit.trainingRemaining&&owner(unit.region)==='caesar';
const savedEvidence=state=>({date:`${state.year}/${state.month}`,battleIds:(state.battles||[]).map(battle=>battle.id),armies:state.armies.filter(unit=>unit.owner==='caesar').map(unit=>({id:unit.id,region:unit.region,men:unit.men,move:unit.move,siege:unit.siege,reconPending:unit.reconPending})),reports:(state.militaryRecon||[]).filter(report=>report.owner==='caesar').map(report=>({regionId:report.regionId,source:report.source,observationYear:report.observationYear,observationMonth:report.observationMonth,min:report.min,max:report.max})),outcome:state.campaignOutcome?.winner||state.civilWarOutcome?.winner||null});
const routeDistance=(from,to)=>{
 const queue=[[from,0]],seen=new Set([from]);
 for(let i=0;i<queue.length;i++){
  const [at,depth]=queue[i];if(at===to)return depth;
  for(const edge of adjacent(at,s))if(!edge.sea&&!seen.has(edge.to)){seen.add(edge.to);queue.push([edge.to,depth+1])}
 }
 return Infinity;
};
const nearestHostile=from=>s.regions.filter(site=>site.owner==='senate').sort((a,b)=>routeDistance(from,a.id)-routeDistance(from,b.id))[0]?.id;
function objectiveFor(unit){
 if(unit.id==='xiii'&&owner('roma')!=='caesar')return 'roma';
 if(unit.id==='xiii'&&owner('t016')!=='caesar')return 't016';
 if(unit.id==='viii'&&front==='italy'&&owner('roma')!=='caesar')return 'roma';
 if(unit.id==='viii'&&front==='west'&&owner('hispaniaN')!=='caesar')return 'hispaniaN';
 const held=goals.get(unit.id);
 if(held&&owner(held)==='senate')return held;
 const next=nearestHostile(unit.region);
 if(next)goals.set(unit.id,next);
 return next;
}
function nextStep(unit,goal){
 if(!goal||goal===unit.region)return null;
 const current=routeDistance(unit.region,goal),options=adjacent(unit.region,s).filter(edge=>!edge.sea).map(edge=>region(s,edge.to)).filter(site=>site&&['caesar','senate','rebels'].includes(site.owner)&&routeDistance(site.id,goal)<current&&previewMarch(s,unit.id,site.id).ok);
 return options.sort((a,b)=>routeDistance(a.id,goal)-routeDistance(b.id)||Number(b.owner==='caesar')-Number(a.owner==='caesar'))[0]||null;
}
function command(unit){
 if(!ready(unit))return;
 const goal=objectiveFor(unit),target=nextStep(unit,goal);
 if(!target){if(unit.stance!=='hold')act(`${unit.id} holds ${unit.region}`,holdPosition(s,unit.id));return}
 if(target.owner==='caesar'){act(`${unit.id} repositions ${target.id}`,moveArmy(s,unit.id,target.id));return}
 const partners=ours().filter(other=>other.id!==unit.id&&ready(other)&&other.region===unit.region&&previewMarch(s,other.id,target.id).ok);
 const combined=[unit,...partners],combinedMen=combined.reduce((total,member)=>total+member.men,0);
 const attackTogether=label=>{for(const member of combined)act(`${member.id} ${label} ${target.id}`,moveArmy(s,member.id,target.id))};
 const intel=assessment(s,unit.id,target.id),report=intel?.report;
 if(!report||report.age>3){
  if(ours().some(other=>other.id!==unit.id&&other.reconPending?.kind==='scouts'&&other.reconPending.regionId===target.id))return;
  if(act(`${unit.id} scouts ${target.id}`,sendScouts(s,unit.id,target.id)))return;
  if(act(`${unit.id} probes ${target.id}`,probePositions(s,unit.id,target.id)))return;
  if(combinedMen>=6000&&combined.every(member=>member.morale>=45))attackTogether('accepts combined unscouted risk');
  else if(unit.men>=4500&&unit.morale>=50)act(`${unit.id} accepts unscouted risk ${target.id}`,moveArmy(s,unit.id,target.id));
  return;
 }
 if(report.max!=null&&report.max>unit.men*.95&&unit.men<7500&&s.factions.caesar.treasury>=24&&s.factions.caesar.food>=12){
  if(act(`${unit.id} reinforces near ${target.id}`,requestReinforcements(s,unit.id)))return;
 }
 const waited=orders.get(`${unit.id}:${target.id}`)||0;
 if(report.max!=null&&report.max<=combinedMen*1.15&&combined.every(member=>member.morale>=42)||waited>=2&&combinedMen>=5000&&combined.every(member=>member.morale>=55)){
  attackTogether(`attacks (${intel.risk})`);orders.delete(`${unit.id}:${target.id}`);
 }else orders.set(`${unit.id}:${target.id}`,waited+1);
}
function maintainEconomy(){
 if(!invest)return;
 const faction=s.factions.caesar,knowledge=s.development.caesar,budget=nationalBudget(s,'caesar');
 const foodWorks=s.regions.filter(site=>site.owner==='caesar'&&['irrigation','grain-mill'].some(id=>site.buildings.includes(id)||site.construction?.buildingId===id)).length;
 const craftWorks=s.regions.filter(site=>site.owner==='caesar'&&(site.buildings.includes('workshop')||site.construction?.buildingId==='workshop')).length;
 const needFood=budget.foodNet<1&&foodWorks<3;
 const needCash=budget.projectedNet<-2&&craftWorks<4;
 const cashFirst=priority==='cash'&&needCash;
 const research=cashFirst&&!knowledge.knownMaterial.includes('craft-workshops')?'craft-workshops':needFood&&!knowledge.knownMaterial.includes('water-control')?'water-control':!needFood&&needCash&&!knowledge.knownMaterial.includes('craft-workshops')?'craft-workshops':null;
 if(research&&!knowledge.research&&faction.treasury>=70)act(`research ${research}`,researchInnovation(s,'caesar','material',research));
 const building=cashFirst&&knowledge.knownMaterial.includes('craft-workshops')?'workshop':needFood&&knowledge.knownMaterial.includes('water-control')?'irrigation':!needFood&&needCash&&knowledge.knownMaterial.includes('craft-workshops')?'workshop':null;
 if(!building||faction.treasury<60)return;
 const safety=site=>Math.min(12,routeDistance(site.id,nearestHostile(site.id)));
 const sites=s.regions.filter(site=>site.owner==='caesar'&&site.loyalty>=50).sort((a,b)=>safety(b)-safety(a)||b.loyalty-a.loyalty);
 const site=sites.find(candidate=>constructionCheck(s,'caesar',candidate.id,building).ok);
 if(site)act(`build ${building} ${site.id}`,startConstruction(s,'caesar',site.id,building));
}

act('reserve Adriatic fleet',reserveFleet(s,'caesar','caesar-adriatic'));
for(let elapsed=0;elapsed<limit&&!s.achievementState.finalized;elapsed++){
 if(s.pendingCivilSettlement){
  assert.deepEqual(revealedAchievements(s),[]);
  assert.equal(respondCivilSettlement(s,false).ok,true,'the active Caesar route declines a proposed surrender and continues');
  log.push(`${s.year}/${s.month} rejects Senate settlement offer`);
 }
 const f=s.factions.caesar,budget=nationalBudget(s,'caesar');
 if(f.treasury<35&&budget.projectedNet<0)act('collect war contributions',collectWarContributions(s,'caesar'));
 if(f.food<18&&budget.foodNet<0)act('collect emergency provisions',collectEmergencyProvisions(s,'caesar'));
 if(owner('roma')==='caesar'&&!s.aerariumSeizure&&f.treasury<55)act('take the Aerarium',seizeAerarium(s,'caesar'));
 maintainEconomy();
 const turn=s.year*12+s.month;
 if(fieldMen()<5000&&f.treasury>=24&&f.food>=12&&f.manpower>=3000&&turn-lastRecruitTurn>=6){
  const sites=s.regions.filter(site=>site.owner==='caesar'&&site.loyalty>=45&&site.food>0).sort((a,b)=>{
   const aFront=nearestHostile(a.id),bFront=nearestHostile(b.id);
   return (b.loyalty+b.food*3-(bFront?routeDistance(b.id,bFront)*4:0))-(a.loyalty+a.food*3-(aFront?routeDistance(a.id,aFront)*4:0));
  });
  for(const site of sites)if(recruit(s,site.id,'caesar')){lastRecruitTurn=turn;log.push(`${s.year}/${s.month} recruit a replacement at ${site.id}`);break}
 }
 const terms=publicSettlementTerms(s,'caesar','senate');
 if(elapsed%3===0&&terms?.strategicReady&&terms.initial-terms.held>=terms.requiredLosses&&f.treasury>=4&&f.legitimacy>=35&&f.stability>=30){
  const accepted=diplomacy(s,'caesar','senate','settlement');
  log.push(`${s.year}/${s.month} settlement offered: ${accepted?'accepted':'refused'}`);
 }
 for(const unit of ours().sort((a,b)=>Number(b.id==='xiii')-Number(a.id==='xiii')||Number(b.id==='viii')-Number(a.id==='viii')||b.men-a.men))command(unit);
 tick(s);
 for(const battle of s.battles||[])if(!seenBattles.has(battle.id)){
  seenBattles.add(battle.id);
  if(battle.attacker.owner==='caesar'&&battle.attacker.formations?.length>1)groupedAssaultBattles++;
  if([battle.attacker.owner,battle.defender.owner].includes('caesar')){
   for(const language of ['en','zh'])assert.match(afterActionHtml(battle,'caesar',language),language==='zh'?/战后复盘/:/AFTER-ACTION REVIEW/);
   log.push(`${battle.year}/${battle.month} battle ${battle.region}: ${battle.attackerWins?battle.attacker.owner:battle.defender.owner} won`);
  }
 }
 assert.equal(s.regions.length,121);
 assert.ok(s.armies.every(unit=>Number.isFinite(unit.men)&&unit.men>=0));
 assert.ok(Object.values(s.factions).every(faction=>[faction.treasury,faction.food,faction.manpower].every(Number.isFinite)));
 if(elapsed%6===5||s.achievementState.finalized)snapshots.push({date:`${s.year}/${s.month}`,territories:s.regions.filter(site=>site.owner==='caesar').length,rome:owner('roma'),treasury:f.treasury,food:f.food,net:nationalBudget(s,'caesar').projectedNet,foodNet:nationalBudget(s,'caesar').foodNet,field:fieldMen(),battles:seenBattles.size,armies:['xiii','viii'].map(id=>{const unit=army(s,id);return unit?{id,region:unit.region,siteOwner:owner(unit.region),men:unit.men,move:unit.move?.to||null,siege:unit.siege?.regionId||null,recon:!!unit.reconPending,training:unit.trainingRemaining||0}:null})});
 if([11,35,71].includes(elapsed)&&!s.achievementState.finalized){
  const before=savedEvidence(s);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(savedEvidence(s),before);
  log.push(`${s.year}/${s.month} reload`);
 }
 if(!s.achievementState.finalized)assert.deepEqual(revealedAchievements(s),[]);
}
const result={seed:selectedSeed,front,invest,priority,date:`${s.year}/${s.month}`,finalized:s.achievementState.finalized,outcome:s.campaignOutcome?.winner||s.achievementState.result||'ongoing',civilWarKind:s.campaignOutcome?.kind||s.civilWarOutcome?.kind||null,territories:s.regions.filter(site=>site.owner==='caesar').length,rome:owner('roma'),treasury:s.factions.caesar.treasury,food:s.factions.caesar.food,field:fieldMen(),battles:seenBattles.size,groupedAssaultBattles,snapshots,log};
if(process.env.SPQR_ADAPTIVE_FINALIZE==='1'&&s.victory&&!s.achievementState.finalized){
 assert.deepEqual(revealedAchievements(s),[],'continuing after victory must keep achievements private');
 const finished=endCampaign(s,'retired');assert.equal(finished.ok,true);
 assert.equal(s.achievementState.result,'victory');
 const earned=revealedAchievements(s),englishEnding=campaignEndingHtml(s,'en'),chineseEnding=campaignEndingHtml(s,'zh');
 assert.match(englishEnding,/History in Your Hands/);
 assert.match(chineseEnding,/执掌历史/);
 for(const {definition} of earned){
  assert.ok(englishEnding.includes(definition.name[0]),`English ending omits ${definition.id}`);
  assert.ok(chineseEnding.includes(definition.name[1]),`Chinese ending omits ${definition.id}`);
 }
 const profile=normalizeProfile({}),awarded=recordCampaign(profile,s),coins=profile.coins;
 assert.ok(awarded.includes('victory'));
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(endCampaign(restored,'retired').ok,false);
 assert.deepEqual(recordCampaign(profile,restored),[]);
 assert.equal(profile.coins,coins);
 result.continuedUnfinalized=true;
 result.finalized=true;
 result.finalReview={revealed:revealedAchievements(restored).map(item=>item.id),coinsClaimed:coins-150,repeatClaim:0};
}
if(process.env.SPQR_ADAPTIVE_OUTPUT)writeFileSync(process.env.SPQR_ADAPTIVE_OUTPUT,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
