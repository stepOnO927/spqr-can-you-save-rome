import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateStrategicPlan,assessAttack,strategicPersonality,observeAttackPattern} from '../strategic-planning.js?v=multipolar-2';
import {newGame,tick,upgradeSave} from '../engine.js?v=player-aid-letter-1';
// These tests pin pre-IMPERIUM subsystem behaviour with engineered random seeds;
// they run with the expansion's AI layer switched off (world.imperium.enabled=false).
const legacyIsolated=g=>{g.world.imperium={enabled:false};return g};

test('planner balances crisis, supplies and observed threats',()=>{
 const base={treasury:50,food:50,stability:70,ownStrength:10000,enemies:[]};
 assert.equal(evaluateStrategicPlan(base).goal,'diplomacy');
 assert.equal(evaluateStrategicPlan({...base,stability:10}).goal,'stabilize');
 assert.equal(evaluateStrategicPlan({...base,food:-30}).goal,'recover');
 assert.equal(evaluateStrategicPlan({...base,enemies:[{estimatedStrength:30000}]}).goal,'defend');
});

test('higher difficulty weighs reported forces, terrain and supplies before attacking',()=>{
 const base={ownMen:8000,morale:75,food:50,estimatedTotal:5000,reportedTheaters:3,sightings:0,terrain:'plain',fort:0,difficulty:'expert'};
 assert.equal(assessAttack(base).favorable,true);
 assert.equal(assessAttack({...base,sightings:2,terrain:'hills',fort:2}).favorable,false);
 assert.equal(assessAttack({...base,food:0,sightings:1,terrain:'urban',fort:2}).favorable,false);
});

test('private personality biases bounded planning without overriding an acute crisis',()=>{
 const reformer=strategicPersonality({ambition:10,influence:40,education:100,loyalty:70});assert.equal(reformer,'reformer');
 const plan=evaluateStrategicPlan({treasury:5,food:-30,stability:70,ownStrength:10000,enemies:[],personality:'conqueror'});
 assert.equal(plan.goal,'recover');assert.equal(plan.operational,'rebuild_reserves');assert.equal(plan.longTerm,'strengthen_position');assert.equal(plan.candidates.length,5);
});

test('a cautious army concentrates real troops at the frontier instead of marching back and forth',()=>{
 const s=legacyIsolated(newGame('senate'));s.difficulty='expert';tick(s);const unit=s.armies.find(a=>a.id==='xiii');
 tick(s);assert.equal(unit.region,'italiaN');assert.equal(unit.move,null);const men=unit.men+s.armies.find(a=>a.id==='viii').men;
 tick(s);assert.equal(unit.region,'italiaN');assert.equal(unit.move.to,'roma');assert.equal(unit.men,men);assert.deepEqual(unit.mergedFrom,['viii']);assert.ok(!s.armies.some(a=>a.id==='viii'));
});
test('a limited feint moves a real army between visible frontiers and returns it',()=>{
 const s=legacyIsolated(newGame('senate'));s.difficulty='expert';s.month=9;const unit=s.armies.find(a=>a.id==='viii'),reserve=s.armies.find(a=>a.id==='xiii');unit.region='cisalpine';s.armies=[unit,reserve,...s.armies.filter(a=>a!==unit&&a!==reserve)];const men=unit.men;
 tick(s);assert.equal(unit.move.to,'narbo');assert.equal(s.world.aiFeints.caesar.army,unit.id);tick(s);tick(s);
 assert.equal(unit.region,'narbo');assert.equal(unit.move.to,'cisalpine');assert.equal(unit.men,men);assert.equal(s.knowledge.senate.caesar.sightings[unit.id].region,'narbo');assert.equal(s.world.aiFeints.caesar,undefined);
});
test('a feint is abandoned if its real army no longer exists',()=>{
 const s=newGame('senate');s.difficulty='expert';s.world.aiFeints={caesar:{army:'missing',origin:'cisalpine',destination:'narbo',returnAt:0}};tick(s);assert.equal(s.world.aiFeints.caesar,undefined);
});

test('strategic memory survives saves and does not depend on unobserved enemy strength',()=>{
 const a=newGame('caesar');a.difficulty='expert';
 const b=JSON.parse(JSON.stringify(a));
 for(const army of b.armies.filter(x=>x.owner==='caesar')) army.men=999999;
 // Plan before observations change: reported intelligence is identical.
 // Hide the altered armies outside the Senate's observed frontier.
 for(const s of [a,b]) for(const army of s.armies.filter(x=>x.owner==='caesar')) army.region='egypt';
 tick(a);tick(b);
 assert.deepEqual(a.world.strategicPlans.senate,b.world.strategicPlans.senate);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(a)));
 assert.deepEqual(loaded.world.strategicPlans,a.world.strategicPlans);
});
test('standard AI uses a slower bounded planning cycle while beginner has no strategic planner',()=>{
 const standard=newGame('caesar');standard.difficulty='standard';tick(standard);const first=standard.world.strategicPlans.senate.date;
 for(let i=0;i<3;i++)tick(standard);assert.equal(standard.world.strategicPlans.senate.date,first);
 const beginner=newGame('caesar');beginner.difficulty='beginner';tick(beginner);assert.equal(beginner.world.strategicPlans,undefined);
});
test('adaptation remembers only own witnessed attacks and forgets stale patterns',()=>{
 const s=newGame('caesar');s.battles=[{id:'a',year:s.year,month:s.month,region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'}},{id:'b',year:s.year,month:s.month,region:'roma',attacker:{owner:'caesar'},defender:{owner:'senate'}},{id:'hidden',year:s.year,month:s.month,region:'egypt',attacker:{owner:'caesar'},defender:{owner:'egypt'}}];
 assert.equal(observeAttackPattern(s,'senate'),'roma');assert.equal(s.world.aiAdaptation.senate.attacks.length,2);s.world.strategicPlans={caesar:{secret:'other frontier'}};assert.equal(observeAttackPattern(s,'senate'),'roma');assert.equal(s.world.aiAdaptation.senate.attacks.length,2);
 s.year+=3;assert.equal(observeAttackPattern(s,'senate'),null);
});
test('automated player orders are restricted to explicit simulation runs',()=>{
 const normal=newGame('caesar'),simulated=newGame('caesar');tick(normal);tick(simulated,{autoplayPlayer:true});
 assert.equal(normal.armies.find(a=>a.id==='xiii').move,null);assert.ok(simulated.armies.find(a=>a.id==='xiii').move);
 const fixed=newGame('caesar');fixed.difficulty='expert';tick(fixed,{autoplayPlayer:true,playerDifficulty:'beginner'});assert.equal(fixed.difficulty,'expert');assert.ok(fixed.world.strategicPlans.senate);assert.equal(fixed.world.strategicPlans.caesar,undefined);
});
