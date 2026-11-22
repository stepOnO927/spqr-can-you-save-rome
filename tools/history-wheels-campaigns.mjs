// Cloud-only diagnostic playthroughs. Report observed state, not invented stories.
import assert from 'node:assert/strict';
import {newGame,tick} from '../engine.js?v=office-age-verified-1';
import {configureStartingDifficulty} from '../difficulty.js?v=office-age-verified-1';
import {chooseAmbition,ambitionStatus} from '../history-wheels.js?v=office-age-verified-1';
import {newHanGame,tick as tickHan} from '../han/engine.js?v=office-age-verified-1';
import {choose as chooseHanAmbition,status as hanAmbitionStatus} from '../han/ambitions.js?v=office-age-verified-1';

const date=s=>s.year*12+s.month;
function roman(side,months,seed,{autoplay=false,difficulty='standard',aiLevel=null}={}){
 const s=configureStartingDifficulty(newGame(side),difficulty);s.seed=seed;s.world.intelSeed=seed;
 chooseAmbition(s,side==='egypt'?'economic':'military');
 const begin=date(s),openingTreasury=s.factions[side].treasury,openingWars=s.wars.length;
 const trace=[];
 for(let i=0;i<months;i++){
  const before=date(s);tick(s,{autoplayPlayer:autoplay,playerDifficulty:aiLevel});
  if(date(s)===before)break;
  if(side==='caesar')trace.push({month:date(s)-begin,regions:s.regions.filter(r=>r.owner===side).length,armies:s.armies.filter(a=>a.owner===side&&a.men>0).length,men:s.armies.filter(a=>a.owner===side).reduce((n,a)=>n+a.men,0),treasury:s.factions[side].treasury,food:s.factions[side].food,battles:(s.battles||[]).length});
  const ids=s.historyWheels.chains.map(c=>c.id);
  assert.equal(new Set(ids).size,ids.length,'causal IDs must remain unique');
  for(const c of s.historyWheels.chains){
   const events=c.events.map(e=>e.id);assert.equal(new Set(events).size,events.length,'event IDs must remain unique');
   if(c.characterId)assert.ok(s.world.characters[c.characterId],'a remembered participant must exist');
  }
  if(s.defeat)break;
 }
 const ownBattles=(s.battles||[]).filter(b=>b.attacker?.owner===side||b.defender?.owner===side);
 return {scenario:side,seed,difficulty,aiLevel,requestedMonths:months,actualMonths:date(s)-begin,autoplay,openingWars,finalWars:s.wars.length,ownBattles:ownBattles.length,ownVictories:ownBattles.filter(b=>b.attacker?.owner===side&&b.attackerWins||b.defender?.owner===side&&!b.attackerWins).length,activeAgreements:(s.agreements||[]).filter(a=>a.status==='active'&&a.parties?.includes(side)).length,foreignAgreements:(s.agreements||[]).filter(a=>!a.parties?.includes(side)).length,foreignMovements:(s.world?.movements||[]).filter(m=>m.parent!==side).length,ownLetters:(s.mail?.messages||[]).filter(m=>m.recipient===side).length,territories:s.regions.filter(r=>r.owner===side).length,treasury:[openingTreasury,s.factions[side].treasury],ambitionReached:!!ambitionStatus(s)?.done,chains:s.historyWheels.chains.map(c=>({type:c.type,status:c.status,events:c.events.length})),defeat:!!s.defeat,trace};
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
