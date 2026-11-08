import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,tick,army,region,moveArmy,diplomacy,previewMarch,armySupply} from '../engine.js';
import {sendScouts,probePositions,latestRecon,requestReinforcements} from '../reconnaissance.js';

// A human-like independent-command route: occupy the frontier, start a war,
// assess the next operation, reinforce, fight, and reload during the campaign.
let state=newGrandGame('egypt');
const actions=[];
const knowledgeAgreementsSeen=new Set(),knowledgeOffersSeen=new Set();
assert.equal(moveArmy(state,'egyptguard','t112').ok,true);
actions.push('march-to-pelusium');
for(let turn=0;turn<36&&!state.achievementState.finalized;turn++){
 const unit=army(state,'egyptguard');
 if(turn===4){assert.equal(diplomacy(state,'egypt','senate','war'),true);actions.push('war-with-senate')}
 if(turn>=4&&unit&&unit.region==='t112'&&!unit.move&&!unit.siege&&!unit.reconPending&&!actions.includes('scout-syria')){
  const treasury=state.factions.egypt.treasury,result=sendScouts(state,unit.id,'t116');
  if(result.ok){actions.push('scout-syria');assert.ok(state.factions.egypt.treasury<treasury)}
 }
 const report=latestRecon(state,'egypt','t116');
 if(report&&!actions.includes('dated-report')){
  assert.ok(report.age>=0&&report.age<=3);
  if(report.min!=null)assert.ok(report.max>=report.min);
  actions.push('dated-report');
 }
 if(turn>=6&&report?.min==null&&unit&&unit.region==='t112'&&!unit.move&&!unit.siege&&!unit.reconPending&&!actions.includes('probe-syria')){
  if(probePositions(state,unit.id,'t116').ok)actions.push('probe-syria');
 }
 if(turn>=7&&report&&unit&&unit.region==='t112'&&!unit.move&&!unit.siege&&!unit.reconPending&&!actions.includes('reinforce-front')){
  if(requestReinforcements(state,unit.id).ok)actions.push('reinforce-front');
 }
 if(turn>=10&&actions.includes('reinforce-front')&&unit?.men>=600&&!unit.move&&!unit.siege&&!unit.reconPending&&!actions.includes('attack-syria')){
  const target=region(state,'t116');
  if(target?.owner==='senate'&&previewMarch(state,unit.id,target.id).ok&&moveArmy(state,unit.id,target.id).ok)actions.push('attack-syria');
 }
 tick(state);
 for(const agreement of state.knowledgeAgreements||[])knowledgeAgreementsSeen.add([agreement.a,agreement.b].sort().join(':'));
 for(const request of state.development?.egypt?.agreementRequests||[])knowledgeOffersSeen.add(request.partner);
 assert.equal(state.regions.length,120);
 assert.ok(state.armies.every(a=>Number.isFinite(a.men)&&a.men>=0));
 assert.ok(Object.values(state.factions).every(f=>[f.treasury,f.food,f.manpower].every(Number.isFinite)));
 if(turn===11||turn===23){
  const before={date:`${state.year}/${state.month}`,owner:region(state,'t112').owner,men:army(state,'egyptguard')?.men,reports:state.reconReports?.egypt?.length||0};
  state=upgradeSave(JSON.parse(JSON.stringify(state)));
  assert.deepEqual({date:`${state.year}/${state.month}`,owner:region(state,'t112').owner,men:army(state,'egyptguard')?.men,reports:state.reconReports?.egypt?.length||0},before);
  actions.push(`reload-${turn+1}`);
 }
}
assert.ok(actions.includes('war-with-senate'));
assert.ok(actions.includes('scout-syria'));
assert.ok(actions.includes('dated-report'));
assert.ok(actions.includes('reload-12')&&actions.includes('reload-24'));
assert.equal(state.campaignOutcome,undefined);
console.log(JSON.stringify({date:`${state.year}/${state.month}`,actions,territories:state.regions.filter(r=>r.owner==='egypt').length,army:army(state,'egyptguard')?.men??0,frontSupply:army(state,'egyptguard')?armySupply(state,army(state,'egyptguard')):null,treasury:state.factions.egypt.treasury,food:state.factions.egypt.food,battles:state.battles?.length||0,egyptResult:state.achievementState.result||'ongoing',civilWarOutcome:state.civilWarOutcome?.winner||'unresolved',knowledgeAgreementsSeen:[...knowledgeAgreementsSeen],knowledgeOffersSeen:[...knowledgeOffersSeen]}));
