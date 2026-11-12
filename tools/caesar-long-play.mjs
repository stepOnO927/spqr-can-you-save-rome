import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,tick,army,region,moveArmy,previewMarch,recruit,reserveFleet,nationalBudget} from '../engine.js';
import {assessment,sendScouts,delayAttack,latestRecon,requestReinforcements} from '../reconnaissance.js';
import {afterActionHtml} from '../recon-ui.js';
import {revealedAchievements} from '../achievement-system.js';

// A player-like Caesarian route: gather a dated report, prepare the XIII,
// advance through Italy when the available evidence justifies the risk, and
// keep Rome supplied if it falls. Decisions never inspect concealed armies.
let s=newGrandGame('caesar');
const journal=[],snapshots=[],seen=new Set(),corridor=['cisalpine','italiaN','t013','t012','t014','roma'];
const record=(label,result)=>{if(result?.ok)journal.push(`${s.year}/${s.month} ${label}`);return !!result?.ok};
assert.equal(record('reserve Adriatic fleet',reserveFleet(s,'caesar','caesar-adriatic')),true);
assert.equal(assessment(s,'xiii','italiaN').risk,'high uncertainty');
assert.equal(record('scout northern Italy',sendScouts(s,'xiii','italiaN')),true);
tick(s);
const openingReport=latestRecon(s,'caesar','italiaN');
assert.ok(openingReport&&openingReport.source==='scouts');
assert.equal(openingReport.observationMonth,1);
assert.equal(openingReport.arrivalMonth,2);
assert.deepEqual(revealedAchievements(s),[]);

for(let month=1;month<48&&!s.achievementState.finalized;month++){
 const legion=army(s,'xiii'),f=s.factions.caesar;
 const ready=legion&&legion.men>=600&&!legion.move&&!legion.siege&&!legion.reconPending&&!legion.trainingRemaining;
 if(ready&&region(s,legion.region)?.owner==='caesar'){
  const index=corridor.indexOf(legion.region),next=index>=0&&index<corridor.length-1?corridor[index+1]:null;
  if(next&&previewMarch(s,legion.id,next).ok){
   const target=region(s,next),intel=target.owner!=='caesar'?assessment(s,legion.id,next):null,report=intel?.report;
   if(!intel)record(`march ${next}`,moveArmy(s,legion.id,next));
   else if(!report||report.age>3)record(`scout ${next}`,sendScouts(s,legion.id,next));
   else if(report.max!=null&&report.max<=legion.men*1.2&&legion.morale>=45)record(`attack ${next} (${intel.risk})`,moveArmy(s,legion.id,next));
   else if(legion.men<7200&&f.treasury>=24&&f.food>=10)record('reinforce XIII',requestReinforcements(s,legion.id));
   else if(month%3===0&&legion.men>=4500)record(`accept uncertain risk at ${next}`,moveArmy(s,legion.id,next));
   else record(`delay ${next}`,delayAttack(s,legion.id,next));
  }
  if(legion.region==='roma'&&region(s,'roma').owner==='caesar'&&!s.armies.some(a=>a.owner==='caesar'&&a.id!==legion.id&&a.region==='roma')&&f.treasury>=24&&f.food>=9&&f.manpower>=3000)record('raise Roman garrison',recruit(s,'roma','caesar')?{ok:true}:{ok:false});
 }
 tick(s);
 if(month%6===5)snapshots.push({date:`${s.year}/${s.month}`,treasury:s.factions.caesar.treasury,food:s.factions.caesar.food,projectedNet:nationalBudget(s,'caesar').projectedNet,foodNet:nationalBudget(s,'caesar').foodNet,territories:s.regions.filter(r=>r.owner==='caesar').length,field:s.armies.filter(a=>a.owner==='caesar').reduce((n,a)=>n+a.men,0)});
 for(const b of s.battles||[])if(!seen.has(b.id)){
  seen.add(b.id);
  if(b.attacker.owner==='caesar'||b.defender.owner==='caesar'){
   for(const language of ['en','zh'])assert.match(afterActionHtml(b,'caesar',language),language==='en'?/AFTER-ACTION REVIEW/:/战后复盘/);
   journal.push(`${b.year}/${b.month} battle ${b.region}: ${b.attackerWins?b.attacker.owner:b.defender.owner} won`);
  }
 }
 assert.equal(s.regions.length,120);
 assert.ok(s.armies.every(a=>Number.isFinite(a.men)&&a.men>=0));
 assert.ok(Object.values(s.factions).every(x=>[x.treasury,x.food,x.manpower].every(Number.isFinite)));
 if([11,23,35].includes(month)&&!s.achievementState.finalized){
  const before={date:`${s.year}/${s.month}`,report:latestRecon(s,'caesar','italiaN'),battles:seen.size,outcome:s.campaignOutcome};
  s=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual({date:`${s.year}/${s.month}`,report:latestRecon(s,'caesar','italiaN'),battles:seen.size,outcome:s.campaignOutcome},before);
  journal.push(`${s.year}/${s.month} reload`);
 }
 if(!s.achievementState.finalized)assert.deepEqual(revealedAchievements(s),[]);
}
assert.ok(journal.some(x=>x.includes('scout')));
console.log(JSON.stringify({date:`${s.year}/${s.month}`,result:s.achievementState.result||s.campaignOutcome?.winner||'ongoing',rome:region(s,'roma').owner,caesarTerritories:s.regions.filter(r=>r.owner==='caesar').length,treasury:s.factions.caesar.treasury,food:s.factions.caesar.food,field:s.armies.filter(a=>a.owner==='caesar').reduce((n,a)=>n+a.men,0),armies:s.armies.filter(a=>a.owner==='caesar').map(a=>({id:a.id,men:a.men,region:a.region,morale:a.morale})),battles:seen.size,snapshots,journal},null,2));
