import {newScenario} from '../scenarios.js?v=succession-ui-recovery-1';
import {tick,diplomacy,isWar} from '../engine.js?v=succession-ui-recovery-1';

// Paired seeds give each difficulty the same initial state and random streams.
// The player is passive, so these are comparable simulations, not matches
// between independently controlled AI players.
const scenarios=['historical','ambitious_general','three_state_coalition','civic_movement','revolution'];
const difficulties=['standard','hard','expert'],seeds=Number(process.env.SPQR_SEEDS||20),months=Number(process.env.SPQR_MONTHS||24),autoplay=process.env.SPQR_AUTOPLAY==='1';
if(!Number.isInteger(seeds)||seeds<1||!Number.isInteger(months)||months<1)throw Error('Invalid benchmark dimensions');
const mean=(xs)=>xs.reduce((a,b)=>a+b,0)/xs.length;
function run(kind,difficulty,seed,ai){
 // Configure the scenario for the measured side, then let the other Roman
 // side be the passive player so the configured side actually receives AI turns.
 const s=newScenario(kind,ai);s.player=ai==='senate'?'caesar':'senate';s.difficulty=difficulty;s.seed=seed;s.world.intelSeed=(seed^0x53a2)>>>0;s.world.religionSeed=(seed^0xb841)>>>0;s.world.dynasties.seed=(seed^0xd3c1)>>>0;
 // Scenario C injects the same declared attack on Armenia in every run so the
 // three actual coalition members have a chance to exercise their obligations.
 const initialCoalition=kind==='three_state_coalition'?s.coalitions[0]:null,coalitionMembers=initialCoalition?[...initialCoalition.parties]:[],coalitionLand=new Set(s.regions.filter(r=>coalitionMembers.includes(r.owner)).map(r=>r.id));
 if(initialCoalition&&!diplomacy(s,'senate','armenia','war'))throw Error('Could not initiate coalition benchmark attack');
 const coalitionJoined=initialCoalition?coalitionMembers.filter(id=>isWar(s,id,initialCoalition.target)).length:0;
 let lostTheaters=0,shortSupply=0,deficit=0,crisisMonths=0,recoveries=0,wasCrisis=false,losses=0,unfavorable=0,attacks=0,coalitionBattles=0;const battles=new Set();
 for(let i=0;i<months;i++){
  const held=new Set(s.regions.filter(r=>r.owner===ai).map(r=>r.id));tick(s,{autoplayPlayer:autoplay,playerDifficulty:autoplay?'standard':null});
  lostTheaters+=[...held].filter(id=>s.regions.find(r=>r.id===id)?.owner!==ai).length;
  const f=s.factions[ai];if(!f)break;
  if(f.food<20)shortSupply++;if(f.treasury<0)deficit++;
  const crisis=f.food<20||f.stability<35||f.treasury<0;if(crisis)crisisMonths++;if(wasCrisis&&!crisis)recoveries++;wasCrisis=crisis;
  for(const b of s.battles||[]){if(battles.has(b.id))continue;battles.add(b.id);if(b.attacker.owner===ai){losses+=b.lossA;attacks++;if(b.attacker.power<b.defender.power*.8)unfavorable++}if(b.defender.owner===ai)losses+=b.lossD;if(initialCoalition&&[b.attacker.owner,b.defender.owner].includes(initialCoalition.target)&&[b.attacker.owner,b.defender.owner].some(id=>coalitionMembers.includes(id)))coalitionBattles++}
 }
 const f=s.factions[ai],active=(s.coalitions||[]).filter(c=>c.parties.includes(ai)&&c.status==='active').length+(s.agreements||[]).filter(t=>t.parties.includes(ai)&&t.status==='active'&&['defensive','offensive'].includes(t.type)).length;
 const coalitionRetained=initialCoalition?[...coalitionLand].filter(id=>coalitionMembers.includes(s.regions.find(r=>r.id===id)?.owner)).length:0,coalitionFunding=initialCoalition?Object.values(initialCoalition.contributions).reduce((n,c)=>n+(c.paid||0),0):0,coalitionSupplies=initialCoalition?Object.values(initialCoalition.contributions).reduce((n,c)=>n+(c.supplies||0),0):0;
 return {objectives:(f.food>=40?1:0)+(f.stability>=60?1:0)+(f.treasury>=0?1:0),losses,shortSupply,deficit,activeCommitments:active,lostTheaters,unfavorable,attacks,stability:f.stability,crisisMonths,recoveries,coalitionJoined,coalitionBattles,coalitionRetained,coalitionFunding,coalitionSupplies};
}
const output={seeds,months,player:autoplay?'opposing Roman side (automated orders, standard difficulty)':'opposing Roman side (passive)',coalitionShock:'Senate declares war on Armenia at the start of the three-state scenario',observedAI:['caesar','senate'],economicHandicap:false,scenarios:{}};
for(const scenario of scenarios){output.scenarios[scenario]={};for(const ai of ['caesar','senate']){output.scenarios[scenario][ai]={};for(const difficulty of difficulties){const runs=Array.from({length:seeds},(_,i)=>run(scenario,difficulty,(Math.imul(i+1,2654435761)^49049)>>>0,ai));const keys=Object.keys(runs[0]);output.scenarios[scenario][ai][difficulty]=Object.fromEntries(keys.map(k=>[k,Number(mean(runs.map(r=>r[k])).toFixed(2))]))}}}
console.log(JSON.stringify(output,null,2));
