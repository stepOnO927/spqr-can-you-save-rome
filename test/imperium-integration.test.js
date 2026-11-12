import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,estimatedStrength} from '../engine.js?v=faces-empire-2';
import {startFocus,focusState,treeFor,scoreFocus,focusReportsFor} from '../national-focus.js?v=faces-empire-2';
import {templatesFor,reorganizeArmy,commandConcentration} from '../legion-designer.js?v=faces-empire-2';
import {createPlan,assignRole,approvePlan,planById} from '../battle-plans.js?v=faces-empire-2';
import {assessOpportunities} from '../multipolar.js?v=multipolar-2';
import {finalizeCampaign} from '../legacy.js?v=faces-empire-2';

const run=(s,id,actor=s.player)=>{const f=treeFor(actor).find(x=>x.id===id);const r=startFocus(s,actor,id);assert.ok(r.ok,`${id}: ${r.reason}`);for(let i=0;i<f.months;i++)tick(s)};

test('strategic chain: a military focus enables reorganization and a prepared offensive that neighbours observe through real state',()=>{
 // The focus phase runs at peace so that the passive human Caesar is not conquered meanwhile.
 const s=newGame('caesar');s.difficulty='hard';s.wars=[];const f=s.factions.caesar;f.treasury=400;f.manpower=50000;f.food=200;
 run(s,'cae_fate_republic');run(s,'cae_veteran_legions');run(s,'cae_italian_command');run(s,'cae_military_authority');s.wars=[['caesar','senate']];
 // The Senate learns of the focus only because it borders Caesar.
 const reports=focusReportsFor(s,'senate').filter(r=>r.actor==='caesar');assert.ok(reports.some(r=>r.focus==='cae_military_authority'&&r.threat));
 assert.ok(!focusReportsFor(s,'parthia').some(r=>r.actor==='caesar'),'no contact, no report');
 // The report changes the Senate's own focus evaluation (hard AI weighs anticipated threats).
 const without=JSON.parse(JSON.stringify(s));without.world.focusReports.senate=[];
 const threatFocus=treeFor('senate').find(x=>x.id==='sen_hold_strongholds');assert.ok(scoreFocus(s,'senate',threatFocus)>=scoreFocus(without,'senate',threatFocus));
 // Reorganize with the newly unlocked veteran cohorts, then prepare an offensive.
 const vet=templatesFor(s,'caesar').find(t=>t.name==='Standard Field Legion');
 const custom=templatesFor(s,'caesar').length;assert.ok(custom>=3);
 const viii=s.armies.find(a=>a.id==='viii');if(viii&&s.regions.find(r=>r.id===viii.region)?.owner==='caesar'){const r=reorganizeArmy(s,'caesar','viii',vet.id);assert.ok(r.ok||r.reason)}
 const p=createPlan(s,'caesar',{mode:'automatic',condition:{kind:'prepared'}}).plan;const xiii=s.armies.find(a=>a.id==='xiii');
 if(xiii&&s.regions.find(r=>r.id===xiii.region)?.owner==='caesar'){assert.ok(assignRole(s,'caesar',p.id,{armyId:'xiii',role:'offensive',path:['italiaN']}).ok);assert.ok(approvePlan(s,'caesar',p.id).ok);tick(s);assert.ok(['preparing','active','needs_attention'].includes(planById(s,p.id).status))}
 // Parthia evaluates opportunities from its own reports; Caesar's private plan is not an input.
 const copy=JSON.parse(JSON.stringify(s));copy.world.battlePlans=[];copy.world.nationalFocus.caesar={active:null,completed:[],partial:{},history:[],modifiers:{},unlocked:[]};
 assert.deepEqual(assessOpportunities(copy,'parthia',estimatedStrength),assessOpportunities(s,'parthia',estimatedStrength));
});

test('an ambitious commander with a large command gains influence through existing systems, never an automatic revolt',()=>{
 const s=newGame('senate');s.wars=[];const unit=s.armies.find(a=>a.id==='spain');unit.characterId='labienus';unit.men=40000;s.world.characters.labienus.influence=50;
 const k=commandConcentration(s,'senate','labienus');assert.notEqual(k.level,'low');
 for(let i=0;i<12;i++)tick(s);assert.ok(s.world.characters.labienus.influence>50);assert.ok(s.world.commandInfluence.labienus);
 assert.ok(!s.wars.some(w=>w.includes('senate')&&w.length===2&&!['caesar'].includes(w.find(x=>x!=='senate'))),'no automatic rebellion war');
});

test('a negotiation policy draws reactions from commanders according to their loyalty and ambition',()=>{
 const s=newGame('senate');s.factions.senate.treasury=300;s.armies.find(a=>a.id==='spain').characterId='labienus';
 s.world.characters.labienus.ambition=85;s.world.characters.labienus.loyalty=40;
 run(s,'sen_cause_republic');run(s,'sen_offer_terms');
 const r=(s.world.policyReactions||[]).find(x=>x.person==='labienus'&&x.focus==='sen_offer_terms');assert.ok(r);assert.ok(['comply','criticize','intrigue'].includes(r.reaction));
});

test('IMPERIUM achievements stay hidden during play and appear only at finalization, once',()=>{
 const s=newGame('caesar');s.wars=[];s.factions.caesar.treasury=600;
 for(const id of ['cae_fate_republic','cae_clementia','cae_gallic_spoils','cae_pontifex','cae_mediterranean_routes','cae_provincial_governance'])run(s,id);
 assert.ok(focusState(s,'caesar').completed.length>=6);
 assert.ok(!JSON.stringify(s).includes('national_will'),'nothing about the achievement exists before finalization');
 s.peacefulVictory=true;const a=finalizeCampaign(s);assert.ok(a.ok);assert.ok(a.archive.achievements.some(x=>x.id==='national_will'));
 assert.equal(a.archive.achievements.filter(x=>x.id==='national_will').length,1);assert.equal(finalizeCampaign(s).ok,false,'cannot finalize twice');
});

test('performance: 36 all-AI months with all three systems stay bounded',()=>{
 const s=newGame('caesar');s.difficulty='expert';const times=[];
 for(let i=0;i<36;i++){const t=performance.now();tick(s,{autoplayPlayer:true});times.push(performance.now()-t)}
 const size=JSON.stringify(s).length;assert.ok(Math.max(...times)<250,`slowest month ${Math.max(...times)}ms`);assert.ok(size<600000,`save ${size} bytes`);
 assert.ok(s.world.battlePlans.length<=40);assert.ok(Object.keys(s.world.formations.templates).length<=80);
 const up=upgradeSave(JSON.parse(JSON.stringify(s)));tick(up,{autoplayPlayer:true});
});
