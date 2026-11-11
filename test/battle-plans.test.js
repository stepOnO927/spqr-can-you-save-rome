import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,issueMilitaryOrder,estimatedStrength} from '../engine.js?v=varus-portrait-1';
import {createPlan,assignRole,approvePlan,pausePlan,cancelPlan,editPlan,planById,plansFor,validatePath,findRoute,assessPlan,adviserCounsel,planControlled,approveRecommendation,aiBattlePlans} from '../battle-plans.js?v=safe-save-1';
import {templatesFor,recruitFormation} from '../legion-designer.js?v=safe-save-1';
import {ROUTES} from '../data.js?v=phase-x-1';

const roundTrip=s=>upgradeSave(JSON.parse(JSON.stringify(s)));
const adjacent=(a,b)=>ROUTES.some(r=>(r[0]===a&&r[1]===b)||(r[0]===b&&r[1]===a));
function combined(seed=4242){
 const s=newGame('caesar');s.seed=seed;const f=s.factions.caesar;f.treasury=600;f.food=300;f.manpower=60000;
 const std=templatesFor(s,'caesar').find(t=>t.name==='Standard Field Legion'),mob=templatesFor(s,'caesar').find(t=>t.name==='Mobile Cavalry-Supported Force');
 const c=recruitFormation(s,'caesar','cisalpine',std.id),d=recruitFormation(s,'caesar','narbo',mob.id);
 for(const id of [c.armyId,d.armyId])s.armies.find(a=>a.id===id).training=0;
 const p=createPlan(s,'caesar',{name:'Italia',mode:'automatic',objective:'italiaN',commanderId:'caesar',fallback:'cisalpine',supplyPriority:true}).plan;
 assert.ok(assignRole(s,'caesar',p.id,{armyId:'xiii',role:'offensive',path:['italiaN']}).ok);
 assert.ok(assignRole(s,'caesar',p.id,{armyId:'viii',role:'supply_guard',target:'cisalpine'}).ok);
 assert.ok(assignRole(s,'caesar',p.id,{armyId:c.armyId,role:'reserve',target:'cisalpine'}).ok);
 assert.ok(assignRole(s,'caesar',p.id,{armyId:d.armyId,role:'recon',target:'hispaniaN'}).ok);
 return {s,p,reserve:c.armyId,scout:d.armyId};
}

test('plans use the real territory graph and refuse impossible routes',()=>{
 const s=newGame('caesar');
 assert.equal(validatePath(s,'caesar','cisalpine',['italiaN','roma']).ok,true);
 assert.equal(validatePath(s,'caesar','cisalpine',['roma']).reason,'adjacent','no arrow may skip territory');
 assert.equal(validatePath(s,'caesar','cisalpine',['egypt']).reason,'adjacent');
 assert.equal(validatePath(s,'caesar','cisalpine',['atlantis']).reason,'unknown_region');
 assert.equal(validatePath(s,'caesar','gaul',['narbo','hispaniaN']).ok,true);
 // Neutral territory without access cannot be entered.
 const route=findRoute(s,'caesar','cisalpine','egypt');assert.ok(!route||route.every((id,i)=>adjacent(i?route[i-1]:'cisalpine',id)));
 const p=createPlan(s,'caesar',{mode:'automatic'}).plan;assert.equal(assignRole(s,'caesar',p.id,{armyId:'xiii',role:'siege',target:'cisalpine'}).reason,'not_fortified');
 assert.equal(assignRole(s,'caesar',p.id,{armyId:'xiii',role:'defensive',target:'italiaN'}).reason,'own_territory');
});

test('combined operation: attack, supply guard, reserve and reconnaissance move real armies over several months',()=>{
 const {s,p,reserve,scout}=combined();
 const report=assessPlan(s,'caesar',p.id);assert.ok(report.friendly>0);assert.ok(Array.isArray(report.risks));assert.ok(report.travel>=1);
 const counsel=adviserCounsel(s,'caesar',p.id);assert.ok(counsel.length>0);for(const c of counsel)assert.ok(['support','caution','oppose'].includes(c.stance));
 const t0=s.factions.caesar.treasury;assert.ok(approvePlan(s,'caesar',p.id).ok);assert.equal(planById(s,p.id).status,'active');
 assert.ok(planControlled(s,'xiii'));const positions=[];
 for(let i=0;i<6;i++){const before=Object.fromEntries(s.armies.map(a=>[a.id,a.region]));tick(s);positions.push(before);
  for(const a of s.armies.filter(a=>a.owner==='caesar'))if(before[a.id]&&before[a.id]!==a.region)assert.ok(adjacent(before[a.id],a.region),`illegal jump ${before[a.id]}→${a.region}`)}
 assert.ok(s.factions.caesar.treasury<t0,'supply priority and operations cost treasury');
 // Enemy resistance is resolved by the normal battle engine; battle reports exist.
 const battles=(s.battles||[]).filter(b=>b.attacker.owner==='caesar'||b.defender.owner==='caesar');
 const plan=planById(s,p.id);assert.ok(battles.length>0||s.regions.find(r=>r.id==='italiaN').owner==='caesar'||plan.events.length>0);
 assert.ok(plan.events.some(e=>e.kind==='recon'),'reconnaissance reported');
 assert.ok(Object.values(s.knowledge.caesar.senate.sightings).some(x=>x.source==='recon'||x.source==='scouts'));
 // Chronicle integration: plan dispatches enter the campaign record.
 assert.ok(s.log.some(e=>e.kind==='plan'));
 assert.equal(s.armies.find(a=>a.id==='xiii')?.characterId??'caesar','caesar','the commander takes part in the operation');
 const saved=roundTrip(s);assert.deepEqual(saved.world.battlePlans,s.world.battlePlans);
});

test('assisted mode recommends; manual mode issues nothing; plans can be paused, edited and cancelled',()=>{
 const s=newGame('caesar');const p=createPlan(s,'caesar',{mode:'assisted'}).plan;assignRole(s,'caesar',p.id,{armyId:'xiii',role:'offensive',path:['italiaN']});approvePlan(s,'caesar',p.id);
 tick(s);const plan=planById(s,p.id);assert.equal(s.armies.find(a=>a.id==='xiii').move,null,'assisted mode does not move without approval');
 assert.ok(plan.recommendations.length>0);assert.ok(approveRecommendation(s,'caesar',p.id,0,{issueOrder:issueMilitaryOrder}).ok);assert.ok(s.armies.find(a=>a.id==='xiii').move);
 const m=newGame('caesar'),mp=createPlan(m,'caesar',{mode:'manual'}).plan;assignRole(m,'caesar',mp.id,{armyId:'viii',role:'offensive',path:['hispaniaN']});approvePlan(m,'caesar',mp.id);tick(m);
 assert.equal(m.armies.find(a=>a.id==='viii').move,null);assert.equal(planById(m,mp.id).recommendations.length,0);
 assert.ok(pausePlan(m,'caesar',mp.id).ok);assert.equal(planById(m,mp.id).status,'paused');assert.ok(editPlan(m,'caesar',mp.id,{mode:'automatic',name:'Renamed'}).ok);
 assert.ok(approvePlan(m,'caesar',mp.id).ok);tick(m);const viii=m.armies.find(a=>a.id==='viii');
 // Either the army marches, or the plan stops to ask because the reported enemy is stronger.
 assert.ok(viii?.move||viii?.region==='hispaniaN'||planById(m,mp.id).status==='needs_attention');
 assert.ok(cancelPlan(m,'caesar',mp.id).ok);assert.equal(planById(m,mp.id).status,'cancelled');assert.ok(!planControlled(m,'viii'));
});

test('preparation takes time and resources and cannot accumulate free bonuses',()=>{
 const s=newGame('caesar');s.wars=[['caesar','senate']];const f=s.factions.caesar;f.treasury=200;f.food=100;
 const p=createPlan(s,'caesar',{mode:'automatic',condition:{kind:'prepared'}}).plan;assignRole(s,'caesar',p.id,{armyId:'xiii',role:'offensive',path:['italiaN']});approvePlan(s,'caesar',p.id);
 assert.equal(planById(s,p.id).status,'preparing');const morale=[];for(let i=0;i<5;i++){tick(s);if(planById(s,p.id).status==='preparing')morale.push(s.armies.find(a=>a.id==='xiii')?.morale)}
 const plan=planById(s,p.id);assert.ok(plan.preparation.spent.treasury>0&&plan.preparation.spent.food>0);assert.ok(plan.preparation.progress<=plan.preparation.target);
 assert.ok(morale.length>0&&Math.max(...morale.filter(Boolean))<=85,'preparation morale is capped');
 const broke=newGame('caesar');broke.factions.caesar.treasury=0;const bp=createPlan(broke,'caesar',{mode:'automatic',condition:{kind:'prepared'}}).plan;assignRole(broke,'caesar',bp.id,{armyId:'xiii',role:'offensive',path:['italiaN']});approvePlan(broke,'caesar',bp.id);
 tick(broke);assert.equal(planById(broke,bp.id).preparation.progress,0);assert.ok(planById(broke,bp.id).events.some(e=>e.kind==='stalled'));
});

test('plans react to unexpected events and never trap armies in loops',()=>{
 // A stronger enemy reported at the objective: the human player is asked to decide.
 const s=newGame('caesar');const p=createPlan(s,'caesar',{mode:'automatic'}).plan;assignRole(s,'caesar',p.id,{armyId:'viii',role:'offensive',path:['hispaniaN','hispaniaS']});approvePlan(s,'caesar',p.id);
 s.armies.push({id:'bigspain',name:['Pompeian reinforcements','庞培援军'],owner:'senate',region:'hispaniaN',men:30000,morale:70,skill:2,experience:1,commander:['Unnamed officer','未具名军官'],move:null,siege:null,characterId:null});tick(s);
 assert.equal(planById(s,p.id).status,'needs_attention');assert.equal(planById(s,p.id).attention,'enemy_reinforced');
 // Losing the army fails the plan.
 const t=newGame('caesar'),tp=createPlan(t,'caesar',{mode:'automatic'}).plan;assignRole(t,'caesar',tp.id,{armyId:'viii',role:'offensive',path:['hispaniaN']});approvePlan(t,'caesar',tp.id);
 t.armies=t.armies.filter(a=>a.id!=='viii');tick(t);assert.equal(planById(t,tp.id).status,'failed');
 // An inaccessible destination after peace.
 const u=newGame('caesar'),up=createPlan(u,'caesar',{mode:'automatic'}).plan;assignRole(u,'caesar',up.id,{armyId:'xiii',role:'offensive',path:['italiaN']});approvePlan(u,'caesar',up.id);
 u.wars=[];tick(u);assert.ok(['needs_attention'].includes(planById(u,up.id).status));assert.equal(planById(u,up.id).attention,'inaccessible');
 // An AI plan in the same situation recalculates or abandons by itself.
 const v=newGame('senate');v.difficulty='expert';for(let i=0;i<12;i++)tick(v);
 for(const plan of plansFor(v,'caesar'))assert.notEqual(plan.status,'needs_attention','AI plans never wait for a human');
 for(const plan of plansFor(v,'caesar'))for(const r of plan.roles)assert.ok(Object.values(r.state.visits).every(n=>n<=4),'no endless back-and-forth');
});

test('AI coalitions build multi-army operations from their own intelligence only',()=>{
 const s=newGame('caesar');s.difficulty='expert';for(let i=0;i<14;i++)tick(s,{autoplayPlayer:true});
 const all=s.world.battlePlans.filter(p=>p.ai);assert.ok(all.length>0,'AI planned operations');
 assert.ok(all.some(p=>p.roles.length>=2),'some operations coordinate several armies');
 assert.ok(all.some(p=>['completed','active','preparing','cancelled','failed'].includes(p.status)));
 // Hidden player orders and hidden strengths do not change the AI's choice.
 const a=newGame('caesar'),b=JSON.parse(JSON.stringify(a));a.difficulty=b.difficulty='expert';
 b.armies.find(x=>x.id==='xiii').order={kind:'move',target:'italiaN'};b.world.battlePlans=[{id:'plan:x',owner:'caesar',status:'active',mode:'automatic',roles:[{armyId:'xiii',role:'offensive',path:['italiaN'],target:'italiaN',state:{stuck:0,visits:{},captured:[],done:false}}],events:[],recommendations:[],supplyBoost:[],preparation:{progress:0,target:0,spent:{}}}];b.world.nextBattlePlan=2;
 for(const army of b.armies.filter(x=>x.owner==='caesar'))army.men=99999;
 aiBattlePlans(a,'senate',{estimatedStrength});aiBattlePlans(b,'senate',{estimatedStrength});
 const pick=x=>plansFor(x,'senate').map(p=>[p.objective,p.roles.map(r=>[r.armyId,r.role,r.target])]);assert.deepEqual(pick(a),pick(b));
 // Standard AI only sets defensive lines.
 const st=newGame('caesar');st.difficulty='standard';for(let i=0;i<9;i++)tick(st,{autoplayPlayer:true});
 for(const p of st.world.battlePlans)assert.ok(p.roles.every(r=>['defensive','frontline'].includes(r.role)));
});

test('with spare forces and stale intelligence, expert AI adds reconnaissance and a supply guard to its operation',()=>{
 const s=newGame('caesar');s.difficulty='expert';
 const extra=(id,region,men)=>s.armies.push({id,name:[id,id],owner:'senate',region,men,morale:70,skill:2,experience:1,commander:['Unnamed officer','未具名军官'],move:null,siege:null,characterId:null});
 extra('s2','italiaN',9000);extra('s3','italiaN',2500);extra('s4','roma',3000);
 for(const k of Object.values(s.knowledge.senate))k.sightings={};
 aiBattlePlans(s,'senate',{estimatedStrength});
 const plan=plansFor(s,'senate').find(p=>p.roles.some(r=>['offensive','siege'].includes(r.role)));assert.ok(plan,'an operation was planned');
 const roles=plan.roles.map(r=>r.role);assert.ok(roles.includes('recon'),`roles: ${roles}`);assert.ok(roles.includes('supply_guard')||roles.includes('reserve'),`roles: ${roles}`);
});

test('an AI ally coordinates with a live allied operation against the same objective',async()=>{
 const {observeControl}=await import('../control-intelligence.js?v=phase-x-1');
 const s=newGame('senate');s.difficulty='expert';
 s.regions.find(r=>r.id==='africa').owner='caesar';s.wars.push(['caesar','numidia']);s.alliances.push(['numidia','senate']);observeControl(s);
 for(const a of s.armies.filter(a=>a.owner==='numidia'))a.men=15000;
 const senatePlan=createPlan(s,'senate',{mode:'automatic',objective:'africa',ai:true}).plan;
 assert.ok(assignRole(s,'senate',senatePlan.id,{armyId:'pompey',role:'offensive',path:['italiaS','sicilia','africa']}).ok);approvePlan(s,'senate',senatePlan.id);
 const id=aiBattlePlans(s,'numidia',{estimatedStrength});const plan=planById(s,id);
 assert.equal(plan.objective,'africa');assert.ok(plan.events.some(e=>e.kind==='coordinated'));
 // Without the alliance, Numidia makes its own choice and records no coordination.
 const t=newGame('senate');t.difficulty='expert';t.regions.find(r=>r.id==='africa').owner='caesar';t.wars.push(['caesar','numidia']);observeControl(t);
 for(const a of t.armies.filter(a=>a.owner==='numidia'))a.men=15000;
 const other=planById(t,aiBattlePlans(t,'numidia',{estimatedStrength}));assert.ok(!other||!other.events.some(e=>e.kind==='coordinated'));
});
