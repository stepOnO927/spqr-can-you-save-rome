import {newGame,tick} from '../engine.js?v=faces-empire-2';
import assert from 'node:assert/strict';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {warningLedger} from '../warning-ledger.js?v=warning-privacy-1';

// Identical unforced openings, different seeded random streams; both the
// fully automated world and an ordinary passive Roman player are exercised.
const seeds=Number(process.env.SPQR_SEEDS||6),months=Number(process.env.SPQR_MONTHS||24),actors=['caesar','egypt','parthia','armenia'];
if(!Number.isInteger(seeds)||seeds<2||!Number.isInteger(months)||months<1)throw Error('Invalid simulation dimensions');
function simulate(seed,autoplayPlayer,regionalTension=false,alliedFrontier=false){
 const s=newGame('caesar');s.difficulty='expert';s.seed=seed;s.world.intelSeed=(seed^0x53a2)>>>0;s.world.dynasties.seed=(seed^0xd3c1)>>>0;const histories=new Set(),wars=new Set(),agreements=new Set(),operations=new Set(),goals=new Set(),offers=new Set();
 // A second fictional opening changes incentives, not diplomatic outcomes:
 // the existing Roman war is unchanged and no new war or alliance is forced.
 if(regionalTension){s.relations['parthia:senate']=-45;s.factions.parthia.food=100;s.factions.parthia.treasury=100;s.factions.parthia.stability=80;for(const a of s.armies.filter(x=>x.owner==='parthia'))a.men=15000;Object.assign(s.world.characters.orodes,{ambition:95,influence:85})}
 // A third fictional opening: Armenia and the Senate are friendly and the Senate
 // is already at war with a prepared Parthia. Warnings, their delivery and every
 // recipient decision remain unforced.
 if(alliedFrontier){s.relations['armenia:senate']=40;assert.ok(proposeAgreement(s,'armenia','senate','defensive').ok);s.wars.push(['parthia','senate']);s.factions.parthia.food=100;s.factions.parthia.treasury=100;for(const a of s.armies.filter(x=>x.owner==='parthia'))a.men=15000}
 let elapsedMonths=0;
 for(let i=0;i<months;i++){
  const before=s.year*12+s.month;tick(s,{autoplayPlayer});
  if(s.year*12+s.month===before)break;
  elapsedMonths++;
  for(const [actor,p] of Object.entries(s.world.multipolarPlans||{})){histories.add(actor);if(p.lastAction)goals.add(`${actor}:${p.lastAction.kind}:${p.lastAction.target}`)}
  for(const w of s.wars)wars.add([...w].sort().join(':'));
  for(const t of s.agreements||[])agreements.add(`${t.type}:${t.parties.slice().sort().join(':')}`);
  for(const o of s.operations||[])operations.add(`${o.actor}:${o.type}:${o.target}:${o.status}`);
  for(const o of s.world.strategicOffers||[])offers.add(`${o.actor}:${o.recipient}:${o.target}:${o.status}`);
 }
 for(const actor of actors.filter(x=>autoplayPlayer||x!==s.player))assert.ok(histories.has(actor),`${actor} did not review the situation`);
 const letters=s.warningLetters||[];for(const l of letters)assert.equal(warningLedger(s,l.threat).filter(x=>x.id===l.id).length,0,'the sighted court must not learn of a warning');
 const warnings=letters.map(l=>`${l.from}>${l.to}:${l.threat}@${l.near}:${l.status}:${l.decision?.kind||'-'}`).sort();
 if(autoplayPlayer)assert.equal(elapsedMonths,months,'AI-only simulation stopped before the requested duration');
 return {seed,elapsedMonths,endedInDefeat:!!s.defeat,warnings,reviewed:[...histories].sort(),wars:[...wars].sort(),agreements:[...agreements].sort(),operations:[...operations].sort(),offers:[...offers].sort(),decisions:[...goals].sort(),peaceLetters:(s.inquiries||[]).filter(x=>x.subject==='peace').map(x=>`${x.actor}:${x.target}:${x.status}`).sort()};
}
const report={months,seeds,automated:[],passiveRome:[],regionalTension:[],alliedFrontier:[]};for(let i=1;i<=seeds;i++){const seed=(Math.imul(i,2654435761)^49049)>>>0;report.automated.push(simulate(seed,true));report.passiveRome.push(simulate(seed,false));report.regionalTension.push(simulate(seed,true,true));report.alliedFrontier.push(simulate(seed,true,false,true))}
assert.ok(new Set(report.automated.map(x=>JSON.stringify([x.wars,x.agreements,x.operations,x.offers,x.decisions,x.peaceLetters]))).size>1,'different seeds must not yield identical outcomes');
if(seeds>=6&&months>=24){assert.ok(report.regionalTension.some(x=>x.decisions.some(d=>d.startsWith('parthia:opportunistic_war:'))),'a prepared court should sometimes exploit a reported war');assert.ok(report.regionalTension.some(x=>!x.decisions.some(d=>d.startsWith('parthia:opportunistic_war:'))),'exploitation must not be inevitable')}
// The same seed must reproduce the same warnings and decisions.
assert.deepEqual(simulate(report.alliedFrontier[0].seed,true,false,true),report.alliedFrontier[0],'warning outcomes must be deterministic per seed');
if(seeds>=6&&months>=24){const all=report.alliedFrontier.flatMap(x=>x.warnings);assert.ok(all.length>0,'friendly courts should sometimes forward a scout warning');assert.ok(all.some(w=>w.endsWith(':responded:heeded')),'some recipients should act on a warning');assert.ok(all.some(w=>!w.endsWith(':responded:heeded')),'acting on a warning must not be inevitable')}
console.log(JSON.stringify(report,null,2));
