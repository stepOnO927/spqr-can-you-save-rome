import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {newGrandGame,upgradeSave,tick,army,region,adjacent,moveArmy,previewMarch,recruit,holdPosition,orderFleet,reserveFleet,nationalBudget,collectWarContributions,collectEmergencyProvisions,seizeAerarium,researchInnovation,startConstruction,constructionCheck,setTax} from '../engine.js';
import {assessment,sendScouts,probePositions,delayAttack,latestRecon,requestReinforcements} from '../reconnaissance.js';
import {afterActionHtml} from '../recon-ui.js';
import {revealedAchievements} from '../achievement-system.js';

// A player-like Caesarian route: gather a dated report, prepare the XIII,
// advance through Italy when the available evidence justifies the risk, and
// keep Rome supplied if it falls. Decisions never inspect concealed armies.
let s=newGrandGame('caesar');
if(process.env.SPQR_LONG_PLAY_SEED){const seed=Number(process.env.SPQR_LONG_PLAY_SEED);assert.ok(Number.isSafeInteger(seed)&&seed>0);s.seed=seed}
const months=Math.max(48,Math.min(120,Number(process.env.SPQR_LONG_PLAY_MONTHS)||48));
const secondFront=process.env.SPQR_CAESAR_SECOND_FRONT==='1';
const supportItaly=process.env.SPQR_CAESAR_SUPPORT_ITALY==='1';
const combinedInvestment=process.env.SPQR_CAESAR_COMBINED_INVEST==='1';
const investFood=combinedInvestment||process.env.SPQR_CAESAR_INVEST_FOOD==='1';
const investCash=combinedInvestment||process.env.SPQR_CAESAR_INVEST_CASH==='1';
if(investCash&&investFood&&!combinedInvestment)throw new Error('Choose one economic investment strategy per comparison run.');
const warTax=process.env.SPQR_CAESAR_WAR_TAX==='1';
const seekOstia=process.env.SPQR_CAESAR_OSTIA==='1';
const useAerarium=process.env.SPQR_CAESAR_AERARIUM==='1';
const journal=[],snapshots=[],seen=new Set(),grainDeliveries=[],corridor=['cisalpine','italiaN','t013','t012','t014','roma',...(seekOstia?['t016']:[])];
let peakIrrigation=0,everHeldOstia=region(s,'t016').owner==='caesar';
const record=(label,result)=>{if(result?.ok)journal.push(`${s.year}/${s.month} ${label}`);return !!result?.ok};
assert.equal(record('reserve Adriatic fleet',reserveFleet(s,'caesar','caesar-adriatic')),true);
for(const unit of s.armies.filter(a=>a.owner==='caesar'&&a.id!=='xiii'&&!(a.id==='viii'&&(secondFront||supportItaly))))record(`hold ${unit.id}`,holdPosition(s,unit.id));
assert.equal(assessment(s,'xiii','italiaN').risk,'high uncertainty');
assert.equal(record('scout northern Italy',sendScouts(s,'xiii','italiaN')),true);
tick(s);
const openingReport=latestRecon(s,'caesar','italiaN');
assert.ok(openingReport&&openingReport.source==='scouts');
assert.equal(openingReport.observationMonth,1);
assert.equal(openingReport.arrivalMonth,2);
assert.deepEqual(revealedAchievements(s),[]);

for(let month=1;month<months&&!s.achievementState.finalized;month++){
 const legion=army(s,'xiii'),f=s.factions.caesar;
 if(warTax){
  const owned=s.regions.filter(r=>r.owner==='caesar'),meanLoyalty=owned.reduce((total,r)=>total+r.loyalty,0)/Math.max(1,owned.length),budget=nationalBudget(s,'caesar');
  if(f.tax==='normal'&&f.treasury<85&&budget.projectedNet<0&&meanLoyalty>=65)record('raise wartime tax',setTax(s,'caesar','high')?{ok:true}:{ok:false});
  else if(f.tax==='high'&&(meanLoyalty<57||f.treasury>115))record('restore normal tax',setTax(s,'caesar','normal')?{ok:true}:{ok:false});
 }
 if(investCash){
  const budget=nationalBudget(s,'caesar'),knowledge=s.development.caesar;
  const foodPriority=combinedInvestment&&budget.foodNet<2&&s.regions.filter(r=>r.owner==='caesar'&&(r.buildings.includes('irrigation')||r.construction?.buildingId==='irrigation')).length<2;
  if(!foodPriority&&budget.projectedNet<0&&!knowledge.knownMaterial.includes('craft-workshops')&&!knowledge.research&&f.treasury>=50)record('study craft workshops',researchInnovation(s,'caesar','material','craft-workshops'));
  if(!foodPriority&&budget.projectedNet<0&&knowledge.knownMaterial.includes('craft-workshops')&&f.treasury>=45){
   const invested=s.regions.filter(r=>r.owner==='caesar'&&(r.buildings.includes('workshop')||r.construction?.buildingId==='workshop')).length;
   if(invested<6){
    const site=s.regions.filter(r=>r.owner==='caesar').sort((a,b)=>b.loyalty-a.loyalty||b.tax-a.tax).find(r=>constructionCheck(s,'caesar',r.id,'workshop').ok);
    if(site)record(`workshop ${site.id}`,startConstruction(s,'caesar',site.id,'workshop'));
   }
  }
 }
 if(investFood){
  const budget=nationalBudget(s,'caesar'),knowledge=s.development.caesar;
  if(budget.foodNet<2&&!knowledge.knownMaterial.includes('water-control')&&!knowledge.research&&f.treasury>=60)record('study water management',researchInnovation(s,'caesar','material','water-control'));
  if(budget.foodNet<2&&knowledge.knownMaterial.includes('water-control')&&f.treasury>=58){
   const invested=s.regions.filter(r=>r.owner==='caesar'&&(r.buildings.includes('irrigation')||r.construction?.buildingId==='irrigation')).length;
   if(invested<4){
    const site=s.regions.find(r=>r.owner==='caesar'&&constructionCheck(s,'caesar',r.id,'irrigation').ok);
    if(site)record(`irrigate ${site.id}`,startConstruction(s,'caesar',site.id,'irrigation'));
   }
  }
 }
 if(f.treasury<30&&nationalBudget(s,'caesar').projectedNet<0)record('collect wartime contributions',collectWarContributions(s,'caesar'));
 if(useAerarium&&f.treasury<40&&region(s,'roma').owner==='caesar'&&!s.aerariumSeizure)record('take Rome public reserve',seizeAerarium(s,'caesar'));
 if(f.food<24&&nationalBudget(s,'caesar').foodNet<0)record('gather emergency provisions',collectEmergencyProvisions(s,'caesar'));
 const adriatic=s.naval.fleets.find(v=>v.id==='caesar-adriatic');
 if(adriatic&&!adriatic.reserve&&!adriatic.order){
  if(adriatic.port&&region(s,adriatic.port)?.owner==='caesar')record('reserve fleet in safe harbor',reserveFleet(s,'caesar',adriatic.id));
  else if(f.treasury<80&&nationalBudget(s,'caesar').projectedNet<0){
   for(const port of s.regions.filter(r=>r.owner==='caesar'&&r.port)){
    if(record(`return fleet to ${port.id}`,orderFleet(s,'caesar',adriatic.id,'return',port.id)))break;
   }
  }
 }
 const ready=legion&&legion.men>=600&&!legion.move&&!legion.siege&&!legion.reconPending&&!legion.trainingRemaining;
 const canFeedReinforcements=()=>{const budget=nationalBudget(s,'caesar');return f.treasury>=24&&f.food>=10&&f.food+6*(budget.foodNet-3)>=12};
 if(supportItaly){
  const supporting=army(s,'viii'),available=supporting&&supporting.men>=600&&!supporting.move&&!supporting.siege&&!supporting.reconPending&&!supporting.trainingRemaining;
  if(available&&region(s,supporting.region)?.owner==='caesar'){
   // Follow XIII's secured corridor one theater at a time. A direct order to
   // friendly Rome can otherwise route VIII through an enemy-held shortcut.
   const supportRoute=['narbo','t049','cisalpine','italiaN','t013','t012','t014','roma'];
   const at=supportRoute.indexOf(supporting.region);
   const destination=at>=0&&at<supportRoute.length-1?supportRoute[at+1]:null;
   if(destination&&region(s,destination).owner==='caesar'&&previewMarch(s,supporting.id,destination).ok)record(`VIII supports Italy at ${destination}`,moveArmy(s,supporting.id,destination));
   else if(supporting.region==='roma'&&supporting.stance!=='hold')record('VIII holds Rome',holdPosition(s,supporting.id));
  }
 }
 if(secondFront){
  const western=army(s,'viii'),available=western&&western.men>=600&&!western.move&&!western.siege&&!western.reconPending&&!western.trainingRemaining;
  if(available&&region(s,western.region)?.owner==='caesar'){
   const target=adjacent(western.region,s).map(edge=>region(s,edge.to)).find(site=>site?.owner==='senate'&&previewMarch(s,western.id,site.id).ok);
   if(target){
    const intel=assessment(s,western.id,target.id),report=intel?.report;
    if(!report||report.age>3)record(`VIII scouts ${target.id}`,sendScouts(s,western.id,target.id));
    else if(report.max!=null&&report.max<=western.men*.9&&western.morale>=50)record(`VIII attacks ${target.id} (${intel.risk})`,moveArmy(s,western.id,target.id));
    else if(western.men<7500&&canFeedReinforcements())record('reinforce VIII',requestReinforcements(s,western.id));
    else record(`VIII delays ${target.id}`,delayAttack(s,western.id,target.id));
   }
  }
 }
 if(ready&&region(s,legion.region)?.owner==='caesar'){
  const index=corridor.indexOf(legion.region),routeNext=index>=0&&index<corridor.length-1?corridor[index+1]:null;
  const romeNeedsGarrison=region(s,'roma').owner!=='caesar'||!s.armies.some(a=>a.owner==='caesar'&&a.id!==legion.id&&a.region==='roma');
  const next=legion.region==='t016'&&romeNeedsGarrison?'roma':legion.region==='roma'&&region(s,'t016').owner==='caesar'?null:routeNext;
  if(next&&previewMarch(s,legion.id,next).ok){
   const target=region(s,next),intel=target.owner!=='caesar'?assessment(s,legion.id,next):null,report=intel?.report;
   if(!intel)record(`march ${next}`,moveArmy(s,legion.id,next));
   else if(!report||report.age>3){
    const scouts=sendScouts(s,legion.id,next);
    if(!record(`scout ${next}`,scouts)){
     const probe=f.food>=12?probePositions(s,legion.id,next):{ok:false,reason:'resources'};
     if(!record(`probe ${next} after scouts unavailable`,probe)){
      if(legion.men>=4500&&legion.morale>=45)record(`attack ${next} without fresh reconnaissance`,moveArmy(s,legion.id,next));
      else record(`delay ${next} until scouts can be supplied`,delayAttack(s,legion.id,next));
     }
    }
   }
   else if(report.max!=null&&report.max<=legion.men*1.2&&legion.morale>=45)record(`attack ${next} (${intel.risk})`,moveArmy(s,legion.id,next));
   else if(legion.men<7200&&canFeedReinforcements())record('reinforce XIII',requestReinforcements(s,legion.id));
   else if(month%3===0&&legion.men>=4500)record(`accept uncertain risk at ${next}`,moveArmy(s,legion.id,next));
   else record(`delay ${next}`,delayAttack(s,legion.id,next));
  }
  const supportApproachingRome=supportItaly&&army(s,'viii')?.owner==='caesar'&&army(s,'viii')?.men>=3000&&['t014','roma'].includes(army(s,'viii')?.region);
  if(legion.region==='roma'&&region(s,'roma').owner==='caesar'&&!supportApproachingRome&&!s.armies.some(a=>a.owner==='caesar'&&a.id!==legion.id&&a.region==='roma')&&f.treasury>=24&&f.food>=9&&f.manpower>=3000)record('raise Roman garrison',recruit(s,'roma','caesar')?{ok:true}:{ok:false});
 }
 tick(s);
 everHeldOstia ||= region(s,'t016').owner==='caesar';
 peakIrrigation=Math.max(peakIrrigation,s.regions.filter(r=>r.owner==='caesar'&&r.buildings.includes('irrigation')).length);
 const grain=s.naval.routes.find(r=>r.id==='egypt-italy')?.last;
 if(grain?.reason==='delivered'&&grain.buyer==='caesar'&&grain.year===s.year&&grain.month===s.month)grainDeliveries.push({date:`${s.year}/${s.month}`,amount:grain.amount,paid:grain.paid});
 if(month%6===5)snapshots.push({date:`${s.year}/${s.month}`,treasury:s.factions.caesar.treasury,food:s.factions.caesar.food,budget:nationalBudget(s,'caesar'),fleet:{port:adriatic?.port,reserve:adriatic?.reserve,order:adriatic?.order?.kind},territories:s.regions.filter(r=>r.owner==='caesar').length,field:s.armies.filter(a=>a.owner==='caesar').reduce((n,a)=>n+a.men,0),legions:['xiii','viii'].map(id=>{const unit=army(s,id);return unit?{id,region:unit.region,men:unit.men,morale:unit.morale,move:unit.move,siege:unit.siege,reconPending:unit.reconPending,trainingRemaining:unit.trainingRemaining}:null}),rome:{owner:region(s,'roma').owner,fort:region(s,'roma').fort},ostiaOrder:army(s,'xiii')?.region==='roma'?previewMarch(s,'xiii','t016'):null});
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
if(!seekOstia){
 assert.ok(journal.some(x=>x.includes('collect wartime contributions'))||warTax&&journal.some(x=>x.includes('raise wartime tax')),'the route must exercise a funded wartime revenue choice');
 assert.ok(journal.some(x=>x.includes('return fleet')));
 assert.ok(journal.some(x=>x.includes('reserve fleet in safe harbor')));
}
else if(months===48)assert.equal(everHeldOstia,true);
if(investFood&&!combinedInvestment){assert.ok(journal.some(x=>x.includes('study water management')));assert.ok(journal.some(x=>x.includes('irrigate ')))}
if(investCash&&!combinedInvestment){assert.ok(journal.some(x=>x.includes('study craft workshops')));assert.ok(journal.some(x=>x.includes('workshop ')))}
assert.ok(grainDeliveries.every(x=>x.amount>0&&x.paid>0));
if(process.env.SPQR_STATE_OUTPUT)writeFileSync(process.env.SPQR_STATE_OUTPUT,JSON.stringify(s));
console.log(JSON.stringify({date:`${s.year}/${s.month}`,result:s.achievementState.result||s.campaignOutcome?.winner||'ongoing',rome:region(s,'roma').owner,ostia:region(s,'t016').owner,everHeldOstia,egyptGrain:s.naval.routes.find(r=>r.id==='egypt-italy')?.last,grainDeliveries,caesarTerritories:s.regions.filter(r=>r.owner==='caesar').length,treasury:s.factions.caesar.treasury,food:s.factions.caesar.food,field:s.armies.filter(a=>a.owner==='caesar').reduce((n,a)=>n+a.men,0),irrigationPeak:peakIrrigation,irrigationHeld:s.regions.filter(r=>r.owner==='caesar'&&r.buildings.includes('irrigation')).length,armies:s.armies.filter(a=>a.owner==='caesar').map(a=>({id:a.id,men:a.men,region:a.region,morale:a.morale})),fleets:s.naval.fleets.filter(f=>f.owner==='caesar').map(f=>({id:f.id,port:f.port,reserve:f.reserve,ships:f.ships,order:f.order?.kind})),battles:seen.size,snapshots,journal},null,2));
if(process.env.SPQR_ECONOMY_AUDIT)console.log(JSON.stringify(s.regions.filter(r=>r.owner==='caesar').map(r=>({id:r.id,macro:r.macro,tax:r.tax,loyalty:r.loyalty,civic:r.civicSatisfaction,food:r.food,population:r.population,initialPopulation:r.initialPopulation,buildings:r.buildings}))));
if(process.env.SPQR_NAVAL_AUDIT)console.log(JSON.stringify({fleets:s.naval.fleets.filter(f=>f.owner==='egypt'),voyages:s.naval.voyages.filter(v=>v.vesselOwner==='egypt'),route:s.naval.routes.find(r=>r.id==='egypt-italy')}));
