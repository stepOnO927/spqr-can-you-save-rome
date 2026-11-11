import {REGIONS,INITIAL_ARMIES} from './data.js';
import {GRAND_GROUPS} from './grand-map-data.js';

const roman=id=>id==='caesar'||id==='senate';
const rival=id=>id==='caesar'?'senate':'caesar';
const opening=(s,id)=>({territories:REGIONS.filter(r=>r.owner===id).reduce((n,r)=>n+(s.grandMap?(GRAND_GROUPS[r.id]?.length||1):1),0),troops:INITIAL_ARMIES.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0)});
const holdings=(s,id)=>s.regions.filter(r=>r.owner===id).length;
const troops=(s,id)=>s.armies.filter(a=>a.owner===id&&a.men>0).reduce((n,a)=>n+a.men,0);
const strategic=(s,id)=>s.regions.some(r=>r.owner===id&&(r.id===(id==='caesar'?'roma':'cisalpine')||r.macro===(id==='caesar'?'roma':'cisalpine')));
const battleWon=(s,id)=>s.battles?.some(b=>(b.attackerWins?b.attacker?.owner:b.defender?.owner)===id&&[b.attacker?.owner,b.defender?.owner].includes(rival(id)));

export function militaryResult(s,id){
 if(!roman(id)||!s.factions[id])return null;
 const enemy=rival(id),base=opening(s,enemy),remaining=holdings(s,enemy),field=troops(s,enemy);
 const collapsed=remaining===0&&field<500;
 const decisive=strategic(s,id)&&(id!=='senate'||s.regions.find(r=>r.id==='roma')?.owner==='senate')&&battleWon(s,id)&&remaining<=Math.floor(base.territories*.35)&&field<=Math.floor(base.troops*.25)&&troops(s,id)>=1000;
 return collapsed||decisive?{kind:'military',winner:id,loser:enemy,year:s.year,month:s.month,enemyTerritories:remaining,enemyFieldStrength:field}:null;
}

// This is a proposal to end the Roman civil war, distinct from an ordinary peace.
// The acceptance test uses the responding faction's actual state; the UI never
// discloses these figures as intelligence.
export function settlementEligible(s,actor,target){
 if(!roman(actor)||target!==rival(actor)||!s.wars?.some(w=>w.includes(actor)&&w.includes(target))||!strategic(s,actor))return false;
 if(actor==='senate'&&s.regions.find(r=>r.id==='roma')?.owner!=='senate')return false;
 const base=opening(s,target),lost=base.territories-holdings(s,target);
 return lost>=Math.max(2,Math.ceil(base.territories*.12))&&troops(s,target)<=base.troops*.7&&troops(s,actor)>=troops(s,target)*1.4&&s.factions[actor].legitimacy>=35&&s.factions[actor].stability>=30;
}

export function setCampaignOutcome(s,outcome){
 if(roman(outcome.winner)&&roman(outcome.loser)&&!roman(s.player)){
  if(s.civilWarOutcome)return false;
  s.civilWarOutcome=outcome;
  return true;
 }
 if(s.campaignOutcome)return false;
 s.campaignOutcome=outcome;s.victory=outcome.winner===s.player;
 if(outcome.loser===s.player)s.terminalResult='defeat';
 return true;
}
