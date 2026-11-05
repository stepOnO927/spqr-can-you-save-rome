import {adjacent, army, region, isWar} from './engine.js';

const draw=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const turn=s=>s.year*12+s.month;
export function latestRecon(s,owner,regionId){
 return (s.militaryRecon||[]).find(r=>r.owner===owner&&r.regionId===regionId)||null;
}
export function assessment(s,armyId,regionId){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!unit||!target||unit.owner!==s.player)return null;
 const report=latestRecon(s,unit.owner,regionId);
 const age=report?Math.max(0,turn(s)-(report.year*12+report.month)):null;
 const known=report&&age<=6?report:null;
 const sighting=Object.values(s.knowledge?.[unit.owner]?.[target.owner]?.sightings||{}).find(x=>x.region===regionId);
 const confidence=known?(age>2?'low':known.confidence):sighting?'low':'none';
 return {friendly:unit.men,morale:unit.morale,commander:[...unit.commander],terrain:target.terrain,fort:target.fort,
  regionId,owner:target.owner,report:known?{...known,age,confidence}:null,sighting:sighting?{year:sighting.year,month:sighting.month,region:sighting.region}:null,
  risk:!known||age>2||confidence==='low'||confidence==='none'?'high uncertainty':known.max>unit.men?'high':'uncertain',
  food:s.factions[unit.owner].food};
}
function available(s,unit,target){return !!(unit&&target&&unit.owner===s.player&&!unit.move&&!unit.siege&&!unit.reconPending&&unit.men>0&&adjacent(unit.region,s).some(x=>x.to===target.id)&&isWar(s,unit.owner,target.owner));}
export function sendScouts(s,armyId,regionId){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!available(s,unit,target))return {ok:false,reason:'unavailable'};
 if(s.factions[unit.owner].treasury<4||s.factions[unit.owner].food<2)return {ok:false,reason:'resources'};
 s.factions[unit.owner].treasury-=4;s.factions[unit.owner].food-=2;
 unit.reconPending={regionId,remaining:1,kind:'scouts'};
 return {ok:true,months:1};
}
export function probePositions(s,armyId,regionId){
 const unit=army(s,armyId),target=region(s,regionId);
 if(!available(s,unit,target))return {ok:false,reason:'unavailable'};
 if(s.factions[unit.owner].food<3)return {ok:false,reason:'resources'};
 s.factions[unit.owner].food-=3;
 const enemy=s.armies.filter(a=>a.region===regionId&&a.owner!==unit.owner&&!a.move&&a.men>0),count=enemy.reduce((n,a)=>n+a.men,0);
 const observed=draw(s)<(count?.72:.32),enemyDetected=count>0&&draw(s)<.55,loss=Math.min(unit.men-1,Math.round((count?unit.men*.012:unit.men*.003)*draw(s)));
 unit.men-=Math.max(0,loss);unit.morale=Math.max(20,unit.morale-(loss>0?2:0));
 if(enemyDetected)(s.militaryAlerts||=[]).push({owner:target.owner,regionId,observedFrom:unit.region,year:s.year,month:s.month});
 // A probe is limited contact, not a full battle or free movement.
 unit.reconPending={regionId,remaining:1,kind:'probe'};
 const report=makeReport(s,unit,target,'probe',count,observed,enemy);
 return {ok:true,loss,enemyDetected,report};
}
export function requestReinforcements(s,armyId){
 const unit=army(s,armyId),site=unit&&region(s,unit.region),f=unit&&s.factions[unit.owner];
 if(!unit||unit.owner!==s.player||!site||site.owner!==unit.owner||unit.move||unit.siege||unit.reconPending)return {ok:false,reason:'unavailable'};
 if(f.treasury<24||f.food<6||f.manpower<3000)return {ok:false,reason:'resources'};
 f.treasury-=24;f.food-=6;f.manpower-=3000;site.loyalty=Math.max(0,site.loyalty-3);
 unit.reconPending={kind:'reinforce',remaining:1,regionId:site.id};
 return {ok:true,months:1};
}
function makeReport(s,unit,target,source,count,detected,enemy){
 const error=(draw(s)-.5)*(source==='probe'?.55:1.1),misinformation=draw(s)<(source==='probe'?.13:.25);
 const observed=misinformation?Math.round(count*(.35+draw(s)*1.6)):count;
 const estimate=detected?Math.max(0,Math.round(observed*(1+error)/500)*500):null;
 const spread=source==='probe'?.32:.55;
 const report={owner:unit.owner,armyId:unit.id,regionId:target.id,year:s.year,month:s.month,source,
  min:estimate==null?null:Math.max(0,Math.floor(estimate*(1-spread)/500)*500),max:estimate==null?null:Math.max(500,Math.ceil(estimate*(1+spread)/500)*500),
  confidence:detected?(source==='probe'?'medium':'low'):'low',positions:detected?(enemy.length?'enemy formations suspected in theater':'no formation found on observed route'):'positions unconfirmed',
  misinformationRisk:source==='probe'?'moderate':'high'};
 (s.militaryRecon||=[]).unshift(report);s.militaryRecon=s.militaryRecon.slice(0,80);
 return report;
}
export function advanceRecon(s){
 for(const unit of s.armies){if(!unit.reconPending)continue;unit.reconPending.remaining--;
  if(unit.reconPending.remaining>0)continue;
  const {kind,regionId}=unit.reconPending;unit.reconPending=null;
  if(kind==='reinforce'){if(region(s,regionId)?.owner===unit.owner){unit.men+=3000;unit.morale=Math.round((unit.morale*(unit.men-3000)+58*3000)/unit.men);if(unit.owner===s.player)s.log.unshift({year:s.year,month:s.month,en:`Reinforcements joined ${unit.name[0]}.`,zh:`增援已加入${unit.name[1]}。`})}continue}
  if(kind!=='scouts')continue;
  const target=region(s,regionId);if(!target)continue;
  const enemy=s.armies.filter(a=>a.region===regionId&&a.owner!==unit.owner&&!a.move&&a.men>0);
  const count=enemy.reduce((n,a)=>n+a.men,0),detected=draw(s)<(count?.65:.42);
  makeReport(s,unit,target,'scouts',count,detected,enemy);
  if(unit.owner===s.player)s.log.unshift({year:s.year,month:s.month,en:`Scouts returned from ${target.name[0]}; their estimate is uncertain.`,zh:`斥候从${target.name[1]}返回；估计仍有不确定性。`});
 }
}
