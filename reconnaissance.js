import {adjacent, army, region, isWar} from './engine.js';
import {activeEffects} from './development.js?v=17';

const draw=s=>{s.reconSeed??=((s.seed??1)^0x9e3779b9)>>>0;s.reconSeed=(Math.imul(s.reconSeed,1664525)+1013904223)>>>0;return s.reconSeed/4294967296};
const turn=s=>s.year*12+s.month;
const observedAt=r=>(r.observationYear??r.year)*12+(r.observationMonth??r.month);
const scoutBonus=(s,owner)=>Math.min(.2,Math.max(0,activeEffects(s,owner).scoutReliability||0));
export function reconReports(s,owner,regionId){
 const reports=(s.militaryRecon||[]).filter(r=>r.owner===owner&&r.regionId===regionId).sort((a,b)=>((b.arrivalYear??b.year)*12+(b.arrivalMonth??b.month))-((a.arrivalYear??a.year)*12+(a.arrivalMonth??a.month)));
 return reports.map(report=>{
  const age=Math.max(0,turn(s)-observedAt(report));
  const other=reports.find(r=>r!==report&&r.source!==report.source&&Math.abs(observedAt(r)-observedAt(report))<=2&&r.min!=null&&report.min!=null);
  const corroborated=!!other&&Math.max(report.min,other.min)<=Math.min(report.max,other.max),disputed=!!other&&!corroborated;
  const confidence=age>6?'outdated':report.source==='battle'?(age<=1?'confirmed':'highly credible'):disputed?'disputed':report.min==null?'rumor':corroborated?'highly credible':'unverified';
  return {...report,observationYear:report.observationYear??report.year,observationMonth:report.observationMonth??report.month,arrivalYear:report.arrivalYear??report.year,arrivalMonth:report.arrivalMonth??report.month,age,confidence,corroborated,disputed,reliability:report.reliability??(report.source==='probe'?'medium':'low')};
 });
}
export function latestRecon(s,owner,regionId){
 return reconReports(s,owner,regionId)[0]||null;
}
export function assessment(s,armyId,regionId,plan=null){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!unit||!target||unit.owner!==s.player)return null;
 const reports=reconReports(s,unit.owner,regionId),report=reports[0]||null;
 const sighting=Object.values(s.knowledge?.[unit.owner]?.[target.owner]?.sightings||{}).find(x=>x.region===regionId);
 const confidence=report?.confidence||(sighting?'rumor':'unknown'),food=s.factions[unit.owner].food;
 return {friendly:unit.men,morale:unit.morale,commander:[...unit.commander],terrain:target.terrain,fort:report?.defensive?.fort??null,
  regionId,owner:target.owner,report,sighting:sighting?{year:sighting.year,month:sighting.month,region:sighting.region}:null,
  risk:!report||['unknown','rumor','disputed','outdated'].includes(confidence)?'high uncertainty':report.max>unit.men?'high':'uncertain',
  food,supply:Math.round(100*Math.min(1,Math.max(.65,food/20))*(unit.operationalSupply??1)),travelMonths:plan?.months??1,landing:!!(plan?.path?.at(-1)?.sea??plan?.sea),reinforcementRisk:'possible',reports:reports.slice(0,4)};
}
function available(s,unit,target){return !!(unit&&target&&!unit.move&&!unit.siege&&!unit.reconPending&&unit.men>0&&adjacent(unit.region,s).some(x=>x.to===target.id)&&isWar(s,unit.owner,target.owner));}
export function sendScouts(s,armyId,regionId,actor=s.player){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!unit||unit.owner!==actor||!available(s,unit,target))return {ok:false,reason:'unavailable'};
 if(s.factions[unit.owner].treasury<4||s.factions[unit.owner].food<2)return {ok:false,reason:'resources'};
 s.factions[unit.owner].treasury-=4;s.factions[unit.owner].food-=2;
 const observedEnemy=s.armies.filter(a=>a.region===regionId&&a.owner!==unit.owner&&!a.move&&a.men>0);
 unit.reconPending={regionId,remaining:1,kind:'scouts',observationYear:s.year,observationMonth:s.month,observedCount:observedEnemy.reduce((n,a)=>n+a.men,0),observedPresence:observedEnemy.length>0,observedFort:target.fort,scoutBonus:scoutBonus(s,unit.owner)};
 return {ok:true,months:1};
}
export function probePositions(s,armyId,regionId,actor=s.player){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!unit||unit.owner!==actor||!available(s,unit,target))return {ok:false,reason:'unavailable'};
 if(s.factions[unit.owner].food<3)return {ok:false,reason:'resources'};
 s.factions[unit.owner].food-=3;
 const enemy=s.armies.filter(a=>a.region===regionId&&a.owner!==unit.owner&&!a.move&&a.men>0),count=enemy.reduce((n,a)=>n+a.men,0);
 const bonus=scoutBonus(s,unit.owner),observed=draw(s)<(count?.72+bonus:.32+bonus),enemyDetected=count>0&&draw(s)<.55,loss=Math.min(unit.men-1,Math.round((count?unit.men*.012:unit.men*.003)*draw(s)));
 unit.men-=Math.max(0,loss);unit.morale=Math.max(20,unit.morale-(loss>0?2:0));
 if(enemyDetected)(s.militaryAlerts||=[]).push({owner:target.owner,regionId,observedFrom:unit.region,year:s.year,month:s.month});
 // A probe is limited contact, not a full battle or free movement.
 unit.reconPending={regionId,remaining:1,kind:'probe'};
 const report=makeReport(s,unit,target,'probe',count,observed,enemy,{scoutBonus:bonus});
 return {ok:true,loss,enemyDetected,report};
}
export function delayAttack(s,armyId,regionId,actor=s.player){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!unit||unit.owner!==actor||!available(s,unit,target))return {ok:false,reason:'unavailable'};
 unit.delayedTarget={regionId,year:s.year,month:s.month};return {ok:true,months:1};
}
export function markReconRegion(s,armyId,regionId,actor=s.player){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!unit||unit.owner!==actor||!target||!adjacent(unit.region,s).some(x=>x.to===regionId))return {ok:false,reason:'unavailable'};
 s.warCouncilMarks||=[];const key=`${actor}:${regionId}`,at=s.warCouncilMarks.findIndex(x=>x.key===key);
 if(at>=0)s.warCouncilMarks.splice(at,1);else s.warCouncilMarks.push({key,owner:actor,regionId,year:s.year,month:s.month});
 return {ok:true,marked:at<0};
}
export function requestReinforcements(s,armyId,actor=s.player){
 const unit=army(s,armyId),site=unit&&region(s,unit.region),f=unit&&s.factions[unit.owner];
 if(!unit||unit.owner!==actor||!site||site.owner!==unit.owner||unit.move||unit.siege||unit.reconPending||unit.men<=0)return {ok:false,reason:'unavailable'};
 if(f.treasury<24||f.food<6||f.manpower<3000)return {ok:false,reason:'resources'};
 f.treasury-=24;f.food-=6;f.manpower-=3000;site.loyalty=Math.max(0,site.loyalty-3);
 unit.reconPending={kind:'reinforce',remaining:1,regionId:site.id};
 return {ok:true,months:1};
}
function makeReport(s,unit,target,source,count,detected,enemy,observed=null){
 const bonus=Math.min(.2,Math.max(0,observed?.scoutBonus||0));
 const error=(draw(s)-.5)*(source==='probe'?.55:1.1)*(1-bonus),misinformation=draw(s)<Math.max(.04,(source==='probe'?.13:.25)-bonus*.6);
 const observedCount=misinformation?Math.round(count*(.35+draw(s)*1.6)):count;
 const estimate=detected?Math.max(0,Math.round(observedCount*(1+error)/500)*500):null;
 const spread=(source==='probe'?.32:.55)-bonus*.5;
 const report={owner:unit.owner,armyId:unit.id,regionId:target.id,year:s.year,month:s.month,source,
  observationYear:observed?.observationYear??s.year,observationMonth:observed?.observationMonth??s.month,arrivalYear:s.year,arrivalMonth:s.month,
  min:estimate==null?null:Math.max(0,Math.floor(estimate*(1-spread)/500)*500),max:estimate==null?null:Math.max(500,Math.ceil(estimate*(1+spread)/500)*500),
  confidence:detected?'unverified':'rumor',reliability:source==='probe'?'medium':'low',positions:detected?(enemy.length?'enemy formations suspected in theater':'no formation found on observed route'):'positions unconfirmed',
  defensive:source==='probe'&&detected?{fort:Math.max(0,(observed?.observedFort??target.fort)+(draw(s)<.7?0:draw(s)<.5?-1:1))}:null,
  misinformationRisk:source==='probe'?'moderate':'high'};
 (s.militaryRecon||=[]).unshift(report);s.militaryRecon=s.militaryRecon.slice(0,80);
 return report;
}
export function advanceRecon(s){
 for(const unit of s.armies){if(!unit.reconPending)continue;unit.reconPending.remaining--;
  if(unit.reconPending.remaining>0)continue;
  const {kind,regionId,observationYear,observationMonth,observedCount,observedPresence,observedFort,scoutBonus=0}=unit.reconPending;unit.reconPending=null;
  if(kind==='reinforce'){if(region(s,regionId)?.owner===unit.owner){unit.men+=3000;unit.morale=Math.round((unit.morale*(unit.men-3000)+58*3000)/unit.men);if(unit.owner===s.player)s.log.unshift({year:s.year,month:s.month,en:`Reinforcements joined ${unit.name[0]}.`,zh:`增援已加入${unit.name[1]}。`})}continue}
  if(kind!=='scouts')continue;
  const target=region(s,regionId);if(!target)continue;
  const enemy=observedCount==null?s.armies.filter(a=>a.region===regionId&&a.owner!==unit.owner&&!a.move&&a.men>0):observedPresence?[{}]:[];
  const count=observedCount??enemy.reduce((n,a)=>n+a.men,0),detected=draw(s)<(count?.65+scoutBonus:.42+scoutBonus);
  makeReport(s,unit,target,'scouts',count,detected,enemy,{observationYear,observationMonth,observedFort,scoutBonus});
  if(unit.owner===s.player)s.log.unshift({year:s.year,month:s.month,en:`Scouts returned from ${target.name[0]}; their estimate is uncertain.`,zh:`斥候从${target.name[1]}返回；估计仍有不确定性。`});
 }
}
