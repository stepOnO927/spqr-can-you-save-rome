import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,tick,army,region,adjacent,moveArmy,previewMarch,trainArmy} from '../engine.js';
import {assessment,sendScouts,probePositions,delayAttack,latestRecon,requestReinforcements} from '../reconnaissance.js';
import {afterActionHtml} from '../recon-ui.js';
import {campaignEndingHtml} from '../achievement-ui.js';
import {campaignTurn} from '../campaign-reports.js';
import {endCampaign,revealedAchievements} from '../achievement-system.js';

// A cautious Senate player: investigate Caesar's Italian approach, reinforce,
// move Pompey forward, then decide whether to take the reported risk.
let s=newGrandGame('senate');
const journal=[];
const seenBattles=new Set();
const order=(name,result)=>{if(result?.ok)journal.push(`${s.year}/${s.month} ${name}`);return !!result?.ok};
assert.equal(assessment(s,'italy','cisalpine').risk,'high uncertainty');
assert.equal(order('scouts cisalpine',sendScouts(s,'italy','cisalpine')),true);
tick(s);
assert.ok(latestRecon(s,'senate','cisalpine'));
assert.equal(order('reinforce levies',requestReinforcements(s,'italy')),true);
tick(s);
assert.equal(order('Pompey to Italian front',moveArmy(s,'pompey','t011')),true);
const front=army(s,'italy');
if(front?.region==='t011'&&region(s,'italiaN').owner==='caesar')order('scouts north Italy',sendScouts(s,'italy','italiaN'));

for(let month=2;month<48&&!s.achievementState.finalized;month++){
 const levies=army(s,'italy'),pompey=army(s,'pompey');
 const canOrder=u=>u&&u.men>=600&&!u.move&&!u.siege&&!u.reconPending&&!u.trainingRemaining;
 if(month===4&&canOrder(levies)&&region(s,'italiaN').owner==='caesar')order('probe north Italy',probePositions(s,'italy','italiaN'));
 if(month===5&&canOrder(levies)&&region(s,'italiaN').owner==='caesar')order('delay for Pompey',delayAttack(s,'italy','italiaN'));
 if(month===6&&canOrder(pompey)&&pompey.region==='t011'&&region(s,'italiaN').owner==='caesar'){
  const intel=assessment(s,'pompey','italiaN');
  journal.push(`${s.year}/${s.month} attack decision: ${intel?.risk}, report ${intel?.report?.min??'?'}-${intel?.report?.max??'?'}, ${pompey.men} friendly`);
  order('Pompey attacks north Italy',moveArmy(s,'pompey','italiaN'));
 }
 if(month>6&&month%4===0){
  // Preserve the fog boundary: only ownership, our army state, and dated
  // reconnaissance influence orders; never read hidden enemy army numbers.
  const leader=[pompey,levies].find(u=>canOrder(u)&&region(s,u.region)?.owner==='senate');
  const target=leader&&adjacent(leader.region,s).map(edge=>region(s,edge.to)).find(r=>r?.owner==='caesar'&&previewMarch(s,leader.id,r.id).ok);
  if(leader&&target){const intel=assessment(s,leader.id,target.id),report=intel?.report;
   if(report?.max!=null&&report.age<=3&&report.max<leader.men*.85&&leader.morale>=50)order(`attack ${target.id}`,moveArmy(s,leader.id,target.id));
   else if(!report||report.age>3)order(`scouts ${target.id}`,sendScouts(s,leader.id,target.id));
   else if(leader.morale<50&&leader.experience<5)order(`train ${leader.id}`,trainArmy(s,leader.id));
   else if(leader.men<6000)order(`reinforce ${leader.id}`,requestReinforcements(s,leader.id));
   else order(`delay ${target.id}`,delayAttack(s,leader.id,target.id));
  }
 }
 tick(s);
 for(const battle of s.battles||[])if(!seenBattles.has(battle.id)){seenBattles.add(battle.id);if(['senate','caesar'].includes(battle.attacker.owner)&&['senate','caesar'].includes(battle.defender.owner))journal.push(`${battle.year}/${battle.month} battle ${battle.region}: ${battle.attackerWins?battle.attacker.owner:battle.defender.owner} won, losses ${battle.lossA}/${battle.lossD}`)}
 assert.equal(s.regions.length,120);
 assert.ok(s.armies.every(a=>Number.isFinite(a.men)&&a.men>=0));
 assert.ok(Object.values(s.factions).every(f=>[f.treasury,f.food,f.manpower].every(Number.isFinite)));
 if([11,23,35].includes(month)){
  const before={date:`${s.year}/${s.month}`,battleIds:(s.battles||[]).map(b=>b.id),reports:(s.militaryRecon||[]).map(r=>`${r.source}:${r.observationYear}/${r.observationMonth}`),result:s.campaignOutcome?.winner||null};
  s=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual({date:`${s.year}/${s.month}`,battleIds:(s.battles||[]).map(b=>b.id),reports:(s.militaryRecon||[]).map(r=>`${r.source}:${r.observationYear}/${r.observationMonth}`),result:s.campaignOutcome?.winner||null},before);
  journal.push(`${s.year}/${s.month} reload`);
 }
}
assert.ok(campaignTurn(s.year,s.month)-campaignTurn(-49,1)>=36,'the player route must cover at least 36 monthly turns');
for(const decision of ['probe north Italy','delay for Pompey','Pompey attacks north Italy','reload'])assert.ok(journal.some(entry=>entry.includes(decision)),`${decision} must occur in the long play`);
assert.ok((s.battles?.length||0)>=4,'the simulation must produce genuine battlefield outcomes');
for(const battle of s.battles||[])if(battle.attacker.owner==='senate'||battle.defender.owner==='senate')for(const language of ['en','zh'])assert.match(afterActionHtml(battle,'senate',language),language==='en'?/AFTER-ACTION REVIEW/:/战后复盘/);
if(s.achievementState.finalized){
 assert.equal(s.achievementState.result,'defeat');assert.equal(s.campaignOutcome?.winner,'caesar');
 for(const [language,title,summary] of [['en','Defeat','CAMPAIGN SUMMARY'],['zh','战败','战役总览']]){
  assert.match(campaignEndingHtml(s,language),new RegExp(title));
  assert.match(campaignEndingHtml(s,language),new RegExp(summary));
 }
 const revealed=revealedAchievements(s),restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(revealedAchievements(restored).map(x=>x.id),revealed.map(x=>x.id));
 assert.equal(endCampaign(restored,'defeat').ok,false,'reloading a final result cannot finalize it again');
}else{
 assert.equal(`${s.year}/${s.month}`,'-45/1');
 assert.deepEqual(revealedAchievements(s),[],'an unfinished campaign must not reveal achievements');
}
console.log(JSON.stringify({date:`${s.year}/${s.month}`,finalized:s.achievementState.finalized,senateTerritories:s.regions.filter(r=>r.owner==='senate').length,caesarTerritories:s.regions.filter(r=>r.owner==='caesar').length,rome:region(s,'roma').owner,senateTreasury:s.factions.senate.treasury,senateFood:s.factions.senate.food,senateManpower:s.factions.senate.manpower,outcome:s.campaignOutcome?.winner||s.achievementState.result||'ongoing',battles:s.battles?.length||0,armies:s.armies.filter(a=>a.owner==='senate').map(a=>({id:a.id,region:a.region,men:a.men,morale:a.morale,move:a.move?.to})),battleHistory:(s.battles||[]).map(b=>({id:b.id,date:`${b.year}/${b.month}`,region:b.region,winner:b.attackerWins?b.attacker.owner:b.defender.owner,attacker:b.attacker.owner,defender:b.defender.owner})),journal},null,2));
