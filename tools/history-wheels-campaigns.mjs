// Cloud-only diagnostic playthroughs. Report observed state, not invented stories.
import assert from 'node:assert/strict';
import {newGame,tick,forecastEconomy,issueMilitaryOrder,recruit,sendInquiry,setTax} from '../engine.js?v=saved-age-consistency-1';
import {configureStartingDifficulty} from '../difficulty.js?v=saved-age-consistency-1';
import {chooseAmbition,ambitionStatus} from '../history-wheels.js?v=saved-age-consistency-1';
import {newHanGame,tick as tickHan} from '../han/engine.js?v=saved-age-consistency-1';
import {choose as chooseHanAmbition,status as hanAmbitionStatus} from '../han/ambitions.js?v=saved-age-consistency-1';

const date=s=>s.year*12+s.month;
function roman(side,months,seed,{autoplay=false,difficulty='standard',aiLevel=null}={}){
 const s=configureStartingDifficulty(newGame(side),difficulty);s.seed=seed;s.world.intelSeed=seed;
 chooseAmbition(s,side==='egypt'?'economic':'military');
 const begin=date(s),openingTreasury=s.factions[side].treasury,openingForecast=forecastEconomy(s,side).treasury,openingWars=s.wars.length;
 const trace=[];
 for(let i=0;i<months;i++){
  const before=date(s);tick(s,{autoplayPlayer:autoplay,playerDifficulty:aiLevel});
  if(date(s)===before)break;
  if(side==='caesar')trace.push({month:date(s)-begin,regions:s.regions.filter(r=>r.owner===side).length,armies:s.armies.filter(a=>a.owner===side&&a.men>0).length,men:s.armies.filter(a=>a.owner===side).reduce((n,a)=>n+a.men,0),treasury:s.factions[side].treasury,food:s.factions[side].food,battles:(s.battles||[]).length,focus:s.world.nationalFocus?.[side]?.active?.id||null,focusPaid:s.world.nationalFocus?.[side]?.active?.paid?.treasury||0,events:seed===1&&i===0?s.log.slice(0,20).map(x=>x.en||x.text||''):undefined});
  const ids=s.historyWheels.chains.map(c=>c.id);
  assert.equal(new Set(ids).size,ids.length,'causal IDs must remain unique');
  for(const c of s.historyWheels.chains){
   const events=c.events.map(e=>e.id);assert.equal(new Set(events).size,events.length,'event IDs must remain unique');
   if(c.characterId)assert.ok(s.world.characters[c.characterId],'a remembered participant must exist');
  }
  if(s.defeat)break;
 }
 const ownBattles=(s.battles||[]).filter(b=>b.attacker?.owner===side||b.defender?.owner===side);
 return {scenario:side,seed,difficulty,aiLevel,requestedMonths:months,actualMonths:date(s)-begin,autoplay,openingForecast,openingWars,finalWars:s.wars.length,ownBattles:ownBattles.length,ownVictories:ownBattles.filter(b=>b.attacker?.owner===side&&b.attackerWins||b.defender?.owner===side&&!b.attackerWins).length,activeAgreements:(s.agreements||[]).filter(a=>a.status==='active'&&a.parties?.includes(side)).length,foreignAgreements:(s.agreements||[]).filter(a=>!a.parties?.includes(side)).length,foreignMovements:(s.world?.movements||[]).filter(m=>m.parent!==side).length,ownLetters:(s.mail?.messages||[]).filter(m=>m.recipient===side).length,territories:s.regions.filter(r=>r.owner===side).length,treasury:[openingTreasury,s.factions[side].treasury],ambitionReached:!!ambitionStatus(s)?.done,chains:s.historyWheels.chains.map(c=>({type:c.type,status:c.status,events:c.events.length})),defeat:!!s.defeat,trace};
}
function han(side,months,seed){
 const s=newHanGame(side,{seed});chooseHanAmbition(s,side==='han'?'dynasty':'independence');
 const begin=date(s),openingTreasury=s.factions[side].treasury;
 for(let i=0;i<months;i++){const before=date(s);tickHan(s);if(date(s)===before)break}
 return {scenario:side,seed,requestedMonths:months,actualMonths:date(s)-begin,territories:s.regions.filter(r=>r.owner===side).length,treasury:[openingTreasury,s.factions[side].treasury],ambitionReached:!!hanAmbitionStatus(s)?.done,activeTreaties:(s.treaties||[]).filter(t=>t.status!=='ended'&&t.parties?.includes(side)).length,finalized:s.finalized?.kind||null};
}

const results=[roman('egypt',24,49),roman('caesar',24,50,{autoplay:true}),roman('senate',24,52,{autoplay:true}),roman('caesar',36,51,{autoplay:true}),roman('caesar',36,51,{autoplay:true,difficulty:'travel'}),roman('caesar',36,51),roman('caesar',36,51,{autoplay:true,aiLevel:'hard'}),roman('senate',36,52,{autoplay:true}),han('han',36,53),han('shanshan',36,54),roman('egypt',120,55),roman('egypt',120,137),han('han',120,55),han('han',120,137)];
assert.equal(results[0].actualMonths,24,'peacetime campaign must actually advance 24 months');
assert.equal(results[2].actualMonths,24,'war campaign must actually advance 24 months');
assert.equal(results[8].actualMonths,36,'Han campaign must actually advance 36 months');
assert.equal(results[10].actualMonths,120,'long Roman world must actually advance 120 months');
assert.equal(results[12].actualMonths,120,'long Han world must actually advance 120 months');
console.log(JSON.stringify(results,null,2));

// Diagnostic sample: identical deterministic seeds for both Roman courts.
const survivalSweep={};
for(const side of ['caesar','senate']){
 survivalSweep[side]=Array.from({length:20},(_,i)=>{
  const run=roman(side,36,i+1,{autoplay:true});
  return {seed:run.seed,months:run.actualMonths,defeat:run.defeat,territories:run.territories,battles:run.ownBattles,victories:run.ownVictories,treasury:run.treasury[1],openingForecast:run.openingForecast,firstMonth:run.trace[0]||null};
 });
}
console.log('WHEELS_ROMAN_SURVIVAL_SWEEP '+JSON.stringify(survivalSweep));

// Player-directed opening alternatives. No local simulation: GitHub Actions runs this file.
function caesarPlayerStrategy(seed,plan){
 const s=configureStartingDifficulty(newGame('caesar'),plan.includes('travel')?'travel':'standard');s.seed=seed;s.world.intelSeed=seed;
 chooseAmbition(s,'military');
 const begin=date(s),opening={treasury:s.factions.caesar.treasury,armies:s.armies.filter(a=>a.owner==='caesar').map(a=>({id:a.id,region:a.region,men:a.men}))};
 const actions=[];
 if(plan.includes('tax')){const ok=setTax(s,'caesar','high');actions.push({month:0,kind:'tax',ok})}
 if(plan.includes('peace')){const result=sendInquiry(s,'caesar','senate','peace');actions.push({month:0,kind:'peace',ok:result.ok,reason:result.reason||null})}
 if(plan.includes('levy')){
  const region=s.regions.find(r=>r.id==='cisalpine'&&r.owner==='caesar')||s.regions.find(r=>r.owner==='caesar'&&s.armies.some(a=>a.owner==='caesar'&&a.region===r.id));
  if(region){const ok=recruit(s,region.id);actions.push({month:0,kind:'levy',region:region.id,ok})}
 }
 if(plan.includes('push')||plan.includes('feint')){
  for(const [armyId,kind,target] of [['xiii','attack','italiaN'],['viii',plan.includes('guard')?'guard':'move',plan.includes('guard')?null:'cisalpine']]){
   const result=issueMilitaryOrder(s,armyId,kind,target);actions.push({month:0,kind,army:armyId,target,ok:result.ok,reason:result.reason||null});
  }
 }
 if(plan.includes('muster')){
  for(const [armyId,kind,target] of [['xiii','guard',null],['viii','move','cisalpine']]){
   const result=issueMilitaryOrder(s,armyId,kind,target);actions.push({month:0,kind,army:armyId,target,ok:result.ok,reason:result.reason||null});
  }
 }
 if(plan.includes('guard')){
  for(const a of s.armies.filter(a=>a.owner==='caesar'&&a.men>0&&!a.move&&a.order?.kind!=='guard')){
   const result=issueMilitaryOrder(s,a.id,'guard');actions.push({month:0,kind:'guard',army:a.id,region:a.region,ok:result.ok,reason:result.reason||null});
  }
 }
 const trace=[],battleTrace=[];
 for(let i=0;i<36;i++){
  const battlesBefore=s.battles?.length||0,regionsBefore=Object.fromEntries(s.regions.map(r=>[r.id,r.owner]));
  if(plan.includes('feint')&&i===1){
   const a=s.armies.find(a=>a.id==='xiii');
   if(a?.region==='italiaN'&&s.regions.find(r=>r.id==='cisalpine')?.owner==='caesar'){
    const result=issueMilitaryOrder(s,'xiii','retreat','cisalpine');actions.push({month:1,kind:'retreat',army:'xiii',target:'cisalpine',ok:result.ok,reason:result.reason||null});
   }
  }
  if(plan.includes('feint')&&i===2){
   const a=s.armies.find(a=>a.id==='xiii');
   if(a?.region==='cisalpine'&&!a.move){const result=issueMilitaryOrder(s,'xiii','guard');actions.push({month:2,kind:'guard',army:'xiii',ok:result.ok,reason:result.reason||null})}
  }
  if(plan.includes('muster')&&i===1)for(const a of s.armies.filter(a=>a.owner==='caesar'&&a.region==='cisalpine'&&a.men>0)){
   const result=issueMilitaryOrder(s,a.id,'attack','italiaN');actions.push({month:1,kind:'attack',army:a.id,target:'italiaN',ok:result.ok,reason:result.reason||null});
  }
  if(plan.includes('replenish'))for(const a of s.armies.filter(a=>a.owner==='caesar'&&a.men>0&&a.men<8000&&s.regions.some(r=>r.id===a.region&&r.owner==='caesar'))){
   const result=issueMilitaryOrder(s,a.id,'reinforce');if(result.ok)actions.push({month:i,kind:'reinforce',army:a.id,menBefore:a.men-1000});
  }
  const before=date(s);tick(s);if(date(s)===before)break;
  if(seed===1&&['guard','muster','travel_guard'].includes(plan))battleTrace.push({month:date(s)-begin,territory:s.regions.filter(r=>regionsBefore[r.id]!==r.owner).map(r=>({region:r.id,from:regionsBefore[r.id],to:r.owner})),battles:(s.battles||[]).slice(0,(s.battles?.length||0)-battlesBefore).map(b=>({region:b.region,attacker:b.attacker.owner,attackerId:b.attacker.id,attackerMen:b.attacker.men,defender:b.defender.owner,defenderId:b.defender.id,defenderMen:b.defender.men,attackerWins:b.attackerWins,lossA:b.lossA,lossD:b.lossD,powerA:b.attacker.power,powerD:b.defender.power})),caesarMen:s.armies.filter(a=>a.owner==='caesar').reduce((n,a)=>n+a.men,0),senateMen:s.armies.filter(a=>a.owner==='senate').reduce((n,a)=>n+a.men,0),senateArmies:s.armies.filter(a=>a.owner==='senate'&&a.men>0).length});
  if(i<3||i%6===5||s.defeat)trace.push({month:date(s)-begin,regions:s.regions.filter(r=>r.owner==='caesar').length,armies:s.armies.filter(a=>a.owner==='caesar'&&a.men>0).length,men:s.armies.filter(a=>a.owner==='caesar').reduce((n,a)=>n+a.men,0),treasury:s.factions.caesar.treasury,food:s.factions.caesar.food,wars:s.wars.filter(w=>w.includes('caesar')).length});
  if(s.defeat)break;
 }
 return {seed,plan,opening,months:date(s)-begin,defeat:!!s.defeat,actions,trace,...(battleTrace.length?{battleTrace}:{})};
}
const playerStrategySweep={};
for(const plan of ['guard','levy_guard','peace_guard','tax_guard','tax_levy_guard','replenish_guard','replenish_levy_guard','push','push_levy','muster','muster_levy','push_guard','feint_guard','feint_replenish_guard','feint_levy_guard','travel_guard','travel_push_guard','travel_feint_guard']){
 playerStrategySweep[plan]=Array.from({length:6},(_,i)=>caesarPlayerStrategy(i+1,plan));
}
console.log('WHEELS_CAESAR_PLAYER_STRATEGIES '+JSON.stringify(playerStrategySweep));
for(const plan of ['levy_guard','travel_guard']){
 const runs=playerStrategySweep[plan];
 assert.ok(runs.every(run=>run.months===36&&!run.defeat&&run.trace.at(-1).regions>=1&&run.trace.at(-1).armies>=1&&run.trace.at(-1).treasury>=0&&run.trace.at(-1).food>=0),`${plan} should preserve a supplied Roman command across all six 36-month cloud seeds`);
}
