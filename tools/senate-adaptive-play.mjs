import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,tick,region,adjacent,moveArmy,previewMarch,recruit,holdPosition,isWar,nationalBudget,researchInnovation,constructionCheck,startConstruction,collectWarContributions,collectEmergencyProvisions} from '../engine.js';
import {assessment,sendScouts,requestReinforcements} from '../reconnaissance.js';
import {afterActionHtml} from '../recon-ui.js';
import {revealedAchievements} from '../achievement-system.js';
import {orderFleet,queueShip} from '../naval.js';

// A player-directed Senate route using only public control, own resources and
// the same dated military assessment that the player sees. This is a repeatable
// stress path, not a substitute for a long human browser campaign.
let s=newGrandGame('senate');
const seed=Number(process.env.SPQR_SENATE_SEED||s.seed),months=Math.max(36,Math.min(120,Number(process.env.SPQR_SENATE_MONTHS)||120));
const posture=process.env.SPQR_SENATE_POSTURE||'cautious';
const investEconomy=process.env.SPQR_SENATE_INVEST==='1';
const commandNavy=process.env.SPQR_SENATE_NAVAL==='1';
assert.ok(Number.isSafeInteger(seed)&&seed>0&&['cautious','bold'].includes(posture));
s.seed=seed;
const log=[],snapshots=[],seenBattles=new Set(),waited=new Map();
let firstCivilResult=null;
const our=id=>region(s,id)?.owner==='senate';
const active=()=>s.armies.filter(a=>a.owner==='senate'&&a.men>=600);
const canAct=a=>a&&!a.move&&!a.siege&&!a.reconPending&&!a.trainingRemaining&&our(a.region);
const act=(label,result)=>{if(result?.ok){log.push(`${s.year}/${s.month} ${label}`);return true}return false};
const route=(from,to)=>{
 const frontier=[[from,[]]],seen=new Set([from]);
 for(let i=0;i<frontier.length;i++){
  const [at,path]=frontier[i];if(at===to)return path;
  for(const edge of adjacent(at,s)){
   if(edge.sea||seen.has(edge.to))continue;
   const owner=region(s,edge.to)?.owner;if(owner!=='senate'&&!isWar(s,'senate',owner))continue;
   seen.add(edge.to);frontier.push([edge.to,[...path,edge.to]]);
  }
 }
 return null;
};
const objective=a=>{
 if(a.id==='pompey'&&our('roma')&&our('italiaN'))return 'italiaN';
 if(a.id==='spain'&&region(s,'t044')?.owner==='caesar')return 't044';
 if(a.id==='italy'&&region(s,'cisalpine')?.owner==='caesar')return 'cisalpine';
 const hostile=s.regions.filter(r=>r.owner==='caesar').map(r=>({r,path:route(a.region,r.id)})).filter(x=>x.path);
 return hostile.sort((a,b)=>a.path.length-b.path.length)[0]?.r.id||null;
};
function command(a){
 if(!canAct(a))return;
 const goal=objective(a),path=goal&&route(a.region,goal),next=path?.[0];
 if(!next){act(`${a.id} holds ${a.region}`,holdPosition(s,a.id));return}
 const target=region(s,next),plan=previewMarch(s,a.id,next);
 if(!plan.ok){act(`${a.id} holds while march is unavailable`,holdPosition(s,a.id));return}
 if(target.owner==='senate'){act(`${a.id} repositions to ${next}`,moveArmy(s,a.id,next));return}
 const view=assessment(s,a.id,next),report=view?.report,age=report?.age??Infinity;
 if(age>4||report?.max==null){
  if(act(`${a.id} scouts ${next}`,sendScouts(s,a.id,next)))return;
  act(`${a.id} holds for intelligence`,holdPosition(s,a.id));return;
 }
 const support=active().filter(other=>other.id!==a.id&&canAct(other)&&other.region===a.region&&previewMarch(s,other.id,next).ok);
 const readyMen=a.men+support.reduce((men,other)=>men+other.men,0),limit=posture==='bold'?1.05:0.82;
 if(report.max>readyMen*limit||a.morale<(posture==='bold'?42:52)){
  if(a.men<8000&&s.factions.senate.treasury>=40&&act(`${a.id} reinforces before ${next}`,requestReinforcements(s,a.id)))return;
  const key=`${a.id}:${next}`,prior=waited.get(key)||0;waited.set(key,prior+1);
  if(posture==='bold'&&prior>=2&&readyMen>=5000&&a.morale>=50){
   act(`${a.id} accepts reported risk at ${next}`,moveArmy(s,a.id,next));return;
  }
  act(`${a.id} holds against reported strength at ${next}`,holdPosition(s,a.id));return;
 }
 for(const unit of [a,...support])act(`${unit.id} attacks ${next} after dated report`,moveArmy(s,unit.id,next));
 waited.delete(`${a.id}:${next}`);
}
function invest(){
 const f=s.factions.senate,b=nationalBudget(s,'senate'),known=s.development.senate.knownMaterial;
 const foodWork=s.regions.filter(r=>r.owner==='senate'&&(r.buildings.includes('irrigation')||r.construction?.buildingId==='irrigation')).length;
 const cashWork=s.regions.filter(r=>r.owner==='senate'&&(r.buildings.includes('workshop')||r.construction?.buildingId==='workshop')).length;
 const foodNeed=b.foodNet<8&&foodWork<2,cashNeed=(b.projectedNet<5||investEconomy)&&cashWork<2;
 const research=foodNeed&&!known.includes('water-control')?'water-control':cashNeed&&!known.includes('craft-workshops')?'craft-workshops':null;
 if(research&&!s.development.senate.research&&f.treasury>=90)act(`research ${research}`,researchInnovation(s,'senate','material',research));
 const building=foodNeed&&known.includes('water-control')?'irrigation':cashNeed&&known.includes('craft-workshops')?'workshop':null;
 if(building&&f.treasury>=95){
  const sites=s.regions.filter(r=>r.owner==='senate'&&r.loyalty>=55).sort((a,b)=>b.loyalty-a.loyalty);
  const site=sites.find(r=>constructionCheck(s,'senate',r.id,building).ok);
  if(site)act(`build ${building} at ${site.id}`,startConstruction(s,'senate',site.id,building));
 }
}
function manageNavy(elapsed){
 if(!commandNavy)return;
 const fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');if(!fleet||!fleet.ships||fleet.reserve)return;
 const trade=s.naval.routes.find(r=>r.id==='adriatic-commerce'),last=trade?.last;
 if(!fleet.port&&(fleet.supply<45||fleet.hull<55)&&our('italiaS')){
  act('Adriatic squadron returns for repair and provisions',orderFleet(s,'senate',fleet.id,'return','italiaS'));
  return;
 }
 if(fleet.port==='italiaS'&&!fleet.order&&fleet.supply>=70&&fleet.hull>=70&&(elapsed<6||['piracy','raid'].includes(last?.reason))){
  act('Adriatic squadron patrols reported-risk waters',orderFleet(s,'senate',fleet.id,'patrol','adriatic'));
 }
 if(['piracy','raid'].includes(last?.reason)&&(fleet.ships.trireme||0)<4&&s.factions.senate.treasury>=160&&!s.naval.queues.some(q=>q.owner==='senate'&&q.port==='italiaS')){
  act('Italy builds a patrol trireme after a recorded trade loss',queueShip(s,'senate','italiaS','trireme'));
 }
}
for(let elapsed=0;elapsed<months&&!s.achievementState.finalized;elapsed++){
 const f=s.factions.senate,b=nationalBudget(s,'senate');
 if(f.treasury<35&&b.projectedNet<0)act('collect war contributions',collectWarContributions(s,'senate'));
 if(f.food<18&&b.foodNet<0)act('collect emergency provisions',collectEmergencyProvisions(s,'senate'));
 invest();
 manageNavy(elapsed);
 if(our('roma')&&!active().some(a=>a.region==='roma'||a.region==='italiaN'&&a.men>=4500)&&f.treasury>=55&&f.food>=15&&f.manpower>=3000){
  if(recruit(s,'roma','senate'))log.push(`${s.year}/${s.month} recruits a Roman reserve`);
 }
 for(const a of active().sort((a,b)=>Number(b.id==='pompey')-Number(a.id==='pompey')||b.men-a.men))command(a);
 tick(s);
 const warResult=s.campaignOutcome||s.civilWarOutcome;
 if(!firstCivilResult&&warResult)firstCivilResult={date:`${s.year}/${s.month}`,kind:warResult.kind,winner:warResult.winner};
 if(!s.achievementState.finalized)assert.deepEqual(revealedAchievements(s),[],'a continued campaign keeps achievements private');
 for(const battle of s.battles||[])if(!seenBattles.has(battle.id)){
  seenBattles.add(battle.id);
  if([battle.attacker.owner,battle.defender.owner].includes('senate')){
   for(const language of ['en','zh'])assert.match(afterActionHtml(battle,'senate',language),language==='zh'?/战后复盘/:/AFTER-ACTION REVIEW/);
   log.push(`${battle.year}/${battle.month} battle ${battle.region}: ${battle.attackerWins?battle.attacker.owner:battle.defender.owner} won`);
  }
 }
 assert.equal(s.regions.length,121);
 assert.ok(s.armies.every(a=>Number.isFinite(a.men)&&a.men>=0));
 assert.ok(Object.values(s.factions).every(faction=>[faction.treasury,faction.food,faction.manpower].every(Number.isFinite)));
 if(elapsed%6===5||s.achievementState.finalized)snapshots.push({date:`${s.year}/${s.month}`,territories:s.regions.filter(r=>r.owner==='senate').length,rome:region(s,'roma').owner,treasury:f.treasury,food:f.food,field:active().reduce((men,a)=>men+a.men,0),battles:seenBattles.size});
 if([11,35,71].includes(elapsed)&&!s.achievementState.finalized){
  const evidence=()=>({date:`${s.year}/${s.month}`,armies:s.armies.filter(a=>a.owner==='senate').map(a=>[a.id,a.region,a.men,a.move?.to]),battles:(s.battles||[]).map(b=>b.id),fleet:s.naval.fleets.filter(f=>f.owner==='senate').map(f=>[f.id,f.port,f.zone,f.hull,f.supply,f.order?.kind]),navalReports:s.naval.reports.map(r=>r.id)});
  const before=evidence();
  s=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(evidence(),before);
  log.push(`${s.year}/${s.month} reload`);
 }
}
const navalReports=s.naval.reports.filter(r=>r.owner==='senate'||r.participants?.includes('senate-adriatic'));
const result={seed,months,posture,investEconomy,commandNavy,date:`${s.year}/${s.month}`,outcome:s.campaignOutcome?.winner||s.civilWarOutcome?.winner||'ongoing',firstCivilResult,territories:s.regions.filter(r=>r.owner==='senate').length,rome:region(s,'roma').owner,treasury:s.factions.senate.treasury,food:s.factions.senate.food,field:active().reduce((men,a)=>men+a.men,0),battles:seenBattles.size,navalReports:navalReports.length,navalReportKinds:Object.fromEntries([...new Set(navalReports.map(r=>r.kind))].map(kind=>[kind,navalReports.filter(r=>r.kind===kind).length])),finalSquadron:(()=>{const f=s.naval.fleets.find(f=>f.id==='senate-adriatic');return f&&{port:f.port,zone:f.zone,hull:f.hull,supply:f.supply,ships:f.ships}})(),actions:{scouts:log.filter(x=>x.includes(' scouts ')).length,reinforcements:log.filter(x=>x.includes(' reinforces ')).length,attacks:log.filter(x=>x.includes(' attacks ')||x.includes(' accepts reported risk ')).length,construction:log.filter(x=>x.includes(' build ')).length,navalOrders:log.filter(x=>x.includes('Adriatic squadron')).length,shipbuilding:log.filter(x=>x.includes('patrol trireme')).length,reloads:log.filter(x=>x.endsWith(' reload')).length}};
console.log(JSON.stringify(process.env.SPQR_SENATE_SUMMARY==='1'?result:{...result,snapshots,log:process.env.SPQR_SENATE_VERBOSE==='1'?log:log.slice(-20)},null,2));
