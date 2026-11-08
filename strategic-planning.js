// A bounded planner. Its input is an actor's own resources and intelligence,
// never the underlying foreign armies or private intentions.
export function evaluateStrategicPlan({treasury, food, stability, ownStrength, enemies,personality='survivor',commitments=0}) {
 const threat = enemies.reduce((n, e) => Math.max(n, e.estimatedStrength), 0);
 const ratio = threat / Math.max(1000, ownStrength);
 const candidates = [
  {goal:'stabilize', score: Math.max(0, 55-stability)*2 + Math.max(0, 15-treasury)},
  {goal:'recover', score: Math.max(0, 20-food)*2 + Math.max(0, 20-treasury)},
  {goal:'defend', score: enemies.length ? 25 + ratio*20 : 0},
  {goal:'campaign', score: enemies.length && food>10 && treasury>15 ? 45-Math.min(50,ratio*20) : 0},
  {goal:'diplomacy', score: enemies.length ? 8 : 30}
 ];
 const preferences={conqueror:{campaign:10,defend:2},diplomat:{diplomacy:12,defend:2},schemer:{diplomacy:8,stabilize:3},reformer:{stabilize:9,recover:5},survivor:{defend:8,recover:4}}[personality]||{};
 for(const candidate of candidates){candidate.score+=preferences[candidate.goal]||0;if(candidate.goal==='diplomacy')candidate.score+=Math.min(6,commitments*2)}
 candidates.sort((a,b)=>b.score-a.score || a.goal.localeCompare(b.goal));
 const goal=candidates[0].goal,operational={stabilize:'restore_order',recover:'rebuild_reserves',defend:'secure_frontier',campaign:'advance_when_favorable',diplomacy:'seek_partners'}[goal];
 return {goal,operational,longTerm:enemies.length?'preserve_command':'strengthen_position',immediate:goal,threat:Math.round(threat),personality,candidates};
}

// Own leaders have private dispositions; these are tendencies rather than
// fixed classes, and the material situation can override their preferences.
export function strategicPersonality(person){
 const ambition=person?.ambition??50,influence=person?.influence??50,education=person?.education??30,loyalty=person?.loyalty??70;
 const scores={conqueror:ambition*.7+influence*.3,diplomat:influence*.65+loyalty*.35,schemer:ambition*.55+education*.35+(100-loyalty)*.1,reformer:education*.6+loyalty*.25+influence*.15,survivor:loyalty*.55+(100-ambition)*.45};
 return Object.entries(scores).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];
}

// Remember only attacks in battles the actor actually fought. No unseen enemy
// orders or positions are consulted, and old patterns stop influencing orders.
export function observeAttackPattern(s,actor){
 s.world.aiAdaptation||={};const state=s.world.aiAdaptation[actor]||={seen:[],attacks:[]},now=s.year*12+s.month,seen=new Set(state.seen);
 for(const battle of (s.battles||[]).slice(0,50))if(!seen.has(battle.id)&&battle.attacker?.owner!==actor&&battle.defender?.owner===actor){
  seen.add(battle.id);state.attacks.push({id:battle.id,opponent:battle.attacker.owner,region:battle.region,year:battle.year,month:battle.month});
 }
 state.seen=[...seen].slice(-100);state.attacks=state.attacks.filter(x=>{const age=now-(x.year*12+x.month);return age>=0&&age<=24}).slice(-24);
 const counts=new Map();for(const x of state.attacks)counts.set(x.region,(counts.get(x.region)||0)+1);
 state.pressure=[...counts].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||null;
 return state.pressure;
}

// A sighting identifies a force and theater, not its hidden headcount. Use a
// cautious per-force estimate and public terrain; never inspect enemy armies.
export function assessAttack({ownMen,morale,skill=0,experience=0,food,estimatedTotal,reportedTheaters,sightings,terrain,fort,difficulty}){
 const local=Math.max(estimatedTotal/Math.max(1,reportedTheaters),sightings*4000);
 const ground=({plain:1,hills:1.2,forest:1.12,urban:1.25,desert:1.06}[terrain]||1)*(1+Math.max(0,fort||0)*.12);
 const ownPower=ownMen*Math.max(.65,Math.min(1,food/20))*(.65+Math.max(0,morale)/200+Math.max(0,skill)*.055+Math.max(0,experience)*.025);
 const caution=difficulty==='expert'?1.35:1.15;
 return {estimatedDefenders:Math.round(local),favorable:ownPower>=local*ground*caution};
}
