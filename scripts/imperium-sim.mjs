import {newGame,tick,upgradeSave} from '../engine.js?v=imperium-1';
import assert from 'node:assert/strict';
// IMPERIUM Grandmaster observation: fully automated campaigns over 36+ months.
// Reports what every AI actually did with focuses, formations and operations,
// with timing and save size. Nothing is forced.
const seeds=Number(process.env.SPQR_SEEDS||4),months=Number(process.env.SPQR_MONTHS||36);
const report={months,seeds,runs:[],alliedFront:[]};
function opening(seed,allied){const s=newGame('caesar');s.difficulty='expert';s.seed=seed;s.world.intelSeed=(seed^0x53a2)>>>0;
 // Fictional allied-front opening: Caesar holds Africa and Sicily; Juba is allied to the
 // Senate and at war with Caesar. Coordination itself is never forced.
 if(allied){for(const id of ['africa','sicilia'])s.regions.find(r=>r.id===id).owner='caesar';s.armies.find(a=>a.id==='viii').region='africa';s.wars.push(['caesar','numidia']);s.alliances.push(['numidia','senate'])}
 return s}
for(const allied of [false,true])for(let i=1;i<=seeds;i++){
 const seed=(Math.imul(i,2654435761)^0x1a2b)>>>0,s=opening(seed,allied);
 const times=[],defeats={},recovered=new Set();
 for(let m=0;m<months;m++){
  const before=Object.fromEntries(s.armies.map(a=>[a.id,a.men]));const t=performance.now();tick(s,{autoplayPlayer:true});times.push(performance.now()-t);
  for(const b of (s.battles||[]).filter(b=>b.year===s.year&&b.month===s.month)){const loser=b.attackerWins?b.defender.owner:b.attacker.owner;defeats[loser]=(defeats[loser]||0)+1}
  for(const a of s.armies)if(a.reorg&&defeats[a.owner])recovered.add(a.owner);
 }
 const plans=s.world.battlePlans,focus=s.world.nationalFocus;
 const run={seed,
  msPerMonth:{mean:Math.round(times.reduce((a,b)=>a+b,0)/times.length*10)/10,max:Math.round(Math.max(...times)*10)/10},
  saveBytes:JSON.stringify(s).length,
  focuses:Object.fromEntries(Object.entries(focus).map(([k,v])=>[k,{completed:v.completed.length,abandoned:v.history.filter(h=>h.event==='abandoned').length,invalidated:v.history.filter(h=>h.event==='invalidated').length}])),
  formations:{templates:Object.keys(s.world.formations.templates).length,organizedArmies:s.armies.filter(a=>a.formation).map(a=>`${a.owner}:${a.formation.name}`),reorganizing:s.armies.filter(a=>a.reorg).length},
  plans:{total:plans.length,byStatus:plans.reduce((o,p)=>(o[p.status]=(o[p.status]||0)+1,o),{}),multiArmy:plans.filter(p=>p.roles.length>=2).length,withRecon:plans.filter(p=>p.roles.some(r=>r.role==='recon')).length,withSupplyGuard:plans.filter(p=>p.roles.some(r=>r.role==='supply_guard')).length,coordinated:plans.filter(p=>p.events.some(e=>e.kind==='coordinated')).length,abandoned:plans.filter(p=>p.status==='cancelled').length},
  reorganizedAfterDefeat:[...recovered].sort(),
  focusReportsSeen:Object.fromEntries(Object.entries(s.world.focusReports||{}).map(([k,v])=>[k,v.length])),
  territories:Object.fromEntries(Object.keys(s.factions).map(f=>[f,s.regions.filter(r=>r.owner===f).length]))};
 upgradeSave(JSON.parse(JSON.stringify(s)));
 (allied?report.alliedFront:report.runs).push(run);
}
assert.ok(report.runs.every(r=>r.msPerMonth.max<300),'monthly simulation must stay bounded');
assert.ok(report.runs.every(r=>Object.values(r.focuses).filter(f=>f.completed>0).length>=6),'AI courts complete focuses');
assert.ok(report.runs.some(r=>r.plans.total>0),'AI courts plan operations');
console.log(JSON.stringify(report,null,1));
