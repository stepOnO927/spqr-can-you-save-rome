import {CHARACTER_CATALOG,ageRange,assignSuccession} from './characters.js?v=dynasty-id-3';
import {reportedControl} from './control-intelligence.js?v=phase-x-1';

// Alternate-history claimant commands use real game theaters and armies.
// The setup is a simulation, not a reconstruction of a historical campaign.
const CONFIG={egypt:{rival:'egypt_claimant',theater:'egyptUpper'},parthia:{rival:'parthia_claimant',theater:'media'},caesar:{rival:'caesar_claimant'},senate:{rival:'senate_claimant'}};

// A political commander's uprising transfers an existing army and theater;
// unlike a generated event it cannot fabricate troops or replace a live war.
export function startPoliticalWar(s,parent,plot){
 const cfg=CONFIG[parent],person=s.world.characters?.[plot.person],base=s.factions[parent],unit=s.armies.find(a=>a.owner===parent&&a.characterId===plot.person&&a.men>=1000&&!a.move&&!a.siege),home=unit&&s.regions.find(r=>r.id===unit.region&&r.owner===parent);
 if(!['caesar','senate'].includes(parent)||!cfg||!base||!person?.alive||!home||s.factions[cfg.rival]||s.world.disputes?.[parent]||plot.participants.length<3||plot.funds<3)return false;
 const commands=s.armies.filter(a=>a.owner===parent&&a.region===home.id&&a.men>0&&!a.move&&!a.siege),defectors=commands.filter(a=>plot.participants.includes(a.characterId));
 if(!defectors.includes(unit)||commands.some(a=>!defectors.includes(a)))return false;
 const food=Math.min(12,Math.max(0,base.food));base.food-=food;
 s.world.dynasticGenerations||={};s.world.dynasticGenerations[cfg.rival]=(s.world.dynasticGenerations[cfg.rival]||0)+1;
 s.factions[cfg.rival]={treasury:plot.funds,food,manpower:0,stability:45,legitimacy:35,tax:'normal',research:0};plot.funds=0;
 for(const a of defectors){a.owner=cfg.rival;a.order=null}
 for(const id of plot.participants){const c=s.world.characters[id],command=s.armies.find(a=>a.characterId===id);if(c&&(!command||defectors.includes(command)))c.faction=cfg.rival}
 home.owner=cfg.rival;home.loyalty=45;s.world.leadership[cfg.rival]=[plot.person];
 s.world.claimants[parent]||=[];if(!s.world.claimants[parent].includes(plot.person))s.world.claimants[parent].push(plot.person);
 s.world.disputes[parent]={months:0,war:{rival:cfg.rival,claimant:plot.person,startedYear:s.year,startedMonth:s.month,origin:'political_network'}};
 s.wars.push([parent,cfg.rival]);
 for(const targets of Object.values(s.knowledge))if(!targets[cfg.rival])targets[cfg.rival]={reportedLeaders:[],reports:[],sightings:{}};
 s.knowledge[cfg.rival]||=Object.fromEntries(Object.keys(s.factions).map(id=>[id,{reportedLeaders:[],reports:[],sightings:{}}]));
 if(s.controlKnowledge)s.controlKnowledge[cfg.rival]=structuredClone(s.controlKnowledge[parent]||{});
 s.world.disputeHistory||=[];s.world.disputeHistory.unshift({faction:parent,claimant:plot.person,outcome:'civil_war',year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);
 return true;
}

// A remembered control report or unit sighting is a lead, not proof the
// government still exists. Do not inspect the live faction list here.
export function knownDynasticFactions(s,viewer){
 return Object.values(CONFIG).map(x=>x.rival).filter(id=>s.regions.some(r=>reportedControl(s,viewer,r.id)?.owner===id)||Object.keys(s.knowledge[viewer]?.[id]?.sightings||{}).length>0||s.knowledge[viewer]?.[id]?.reportedLeaders?.length>0);
}

export function startDynasticWar(s,parent,claimant){
 const cfg=CONFIG[parent],dispute=s.world.disputes?.[parent],person=s.world.characters?.[claimant],base=s.factions[parent],home=cfg?.theater?s.regions.find(r=>r.id===cfg.theater):s.regions.find(r=>r.owner===parent&&r.id!=='roma'&&!s.armies.some(a=>a.region===r.id&&a.men>0));
 if(!cfg||!dispute||dispute.war||s.factions[cfg.rival]||!person?.alive||person.missing||person.travel||person.asylumHost||!base||!home||home.owner!==parent||!(s.world.claimants[parent]||[]).includes(claimant)||s.armies.some(a=>a.characterId===claimant)||s.armies.some(a=>a.region===home.id&&a.men>0))return false;
 const guard=s.armies.find(a=>a.owner===parent&&a.men>0&&!a.move&&!a.siege),defectors=guard?Math.min(1000,Math.floor(guard.men*.2)):0,recruits=Math.min(1000,Math.max(0,base.manpower));
 if(defectors+recruits<500)return false;
 if(guard)guard.men-=defectors;base.manpower-=recruits;
 const treasury=Math.min(15,Math.max(0,base.treasury)),food=Math.min(12,Math.max(0,base.food));base.treasury-=treasury;base.food-=food;
 // A later rebellion reuses the public faction slot but is a different court.
 // Pending messages sent to an earlier incarnation must not reach the new one.
 s.world.dynasticGenerations||={};s.world.dynasticGenerations[cfg.rival]=(s.world.dynasticGenerations[cfg.rival]||0)+1;
 s.factions[cfg.rival]={treasury,food,manpower:0,stability:45,legitimacy:35,tax:'normal',research:0};
 person.faction=cfg.rival;person.location=home.id;home.owner=cfg.rival;home.loyalty=45;
 s.world.leadership[cfg.rival]=[claimant];
 const aid=dispute.militaryAid?.[claimant]||0;
 const age=ageRange(claimant,s.year),minor=age!==null&&age[0]<16;
 // A claimant who may be a minor is a political figurehead; an unnamed officer leads.
 s.armies.push({id:`${cfg.rival}_${s.nextArmy++}`,name:parent==='egypt'?['Egyptian claimant forces','埃及竞争者军队']:parent==='parthia'?['Parthian claimant forces','帕提亚竞争者军队']:['Rival imperial court forces','帝国竞争宫廷军队'],owner:cfg.rival,region:home.id,men:defectors+recruits+aid,morale:60,skill:2,experience:0,commander:minor?['Unnamed officer','未具名军官']:[...CHARACTER_CATALOG[claimant].name],characterId:minor?null:claimant,move:null,siege:null});
 if(dispute.militaryAid)delete dispute.militaryAid[claimant];
 s.wars.push([parent,cfg.rival]);dispute.war={rival:cfg.rival,claimant,startedYear:s.year,startedMonth:s.month};
 // New diplomatic records contain no foreign reports; no uninvolved observer
 // automatically learns that the rival government exists.
 for(const [viewer,targets] of Object.entries(s.knowledge))if(!targets[cfg.rival])targets[cfg.rival]={reportedLeaders:[],reports:[],sightings:{}};
 s.knowledge[cfg.rival]||=Object.fromEntries(Object.keys(s.factions).map(id=>[id,{reportedLeaders:[],reports:[],sightings:{}}]));
 if(s.controlKnowledge)s.controlKnowledge[cfg.rival]=structuredClone(s.controlKnowledge[parent]||{});
 s.world.disputeHistory.unshift({faction:parent,claimant,outcome:'civil_war',year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);
 return true;
}

// Keep backing for other surviving claimants when one war concludes.
function continueRemainingDispute(s,parent,previous){
 const claimants=s.world.claimants[parent]||[];if(!claimants.length){delete s.world.disputes[parent];return}
 const next={months:0};for(const key of ['support','militaryAid']){const entries=Object.entries(previous?.[key]||{}).filter(([id])=>claimants.includes(id));if(entries.length)next[key]=Object.fromEntries(entries)}s.world.disputes[parent]=next;
}

// Defeat requires both territory and field forces to be lost. The winner is
// folded back into the preexisting realm, preserving known figures and reports.
export function resolveDynasticWars(s){
 for(const [parent,cfg] of Object.entries(CONFIG)){
  const dispute=s.world.disputes?.[parent],war=dispute?.war;if(!war)continue;
  const alive=id=>s.regions.some(r=>r.owner===id)||s.armies.some(a=>a.owner===id&&a.men>0);
  // A leader's death leaves an unnamed authority; the military conflict does
  // not vanish while that side still holds land or fields troops.
  const person=s.world.characters[war.claimant],rivalAlive=alive(cfg.rival),baseAlive=alive(parent);
  if(baseAlive&&rivalAlive)continue;
  const rivalWins=rivalAlive&&!baseAlive,oldLeaders=[...(s.world.leadership[parent]||[])];
  if(person){person.faction=parent;if(!person.alive)person.location=null}
  if(rivalWins){
   for(const r of s.regions)if(r.owner===cfg.rival)r.owner=parent;
   for(const a of s.armies)if(a.owner===cfg.rival)a.owner=parent;
   s.world.leadership[parent]=person?.alive?[war.claimant]:[];
   s.world.claimants[parent]=[...new Set([...(s.world.claimants[parent]||[]).filter(id=>id!==war.claimant),...oldLeaders.filter(id=>s.world.characters[id]?.alive&&id!==war.claimant)])];
   if(s.factions[cfg.rival]){s.factions[parent].treasury+=s.factions[cfg.rival].treasury;s.factions[parent].food+=s.factions[cfg.rival].food;s.factions[parent].manpower+=s.factions[cfg.rival].manpower}
  }else{
   for(const r of s.regions)if(r.owner===cfg.rival)r.owner=parent;
   s.armies=s.armies.filter(a=>a.owner!==cfg.rival);
   s.world.claimants[parent]=(s.world.claimants[parent]||[]).filter(id=>id!==war.claimant);
  }
  const inherited=rivalWins?s.wars.filter(w=>w.includes(cfg.rival)).map(w=>w.find(id=>id!==cfg.rival)).filter(id=>id!==parent&&!s.alliances.some(a=>a.includes(parent)&&a.includes(id))):[];
  s.wars=s.wars.filter(w=>!w.includes(cfg.rival));for(const enemy of inherited)if(!s.wars.some(w=>w.includes(parent)&&w.includes(enemy)))s.wars.push([parent,enemy]);
  s.alliances=s.alliances.filter(a=>!a.includes(cfg.rival));
  delete s.factions[cfg.rival];delete s.world.leadership[cfg.rival];delete s.world.governments?.[cfg.rival];
  for(const character of Object.values(s.world.characters))if(character.faction===cfg.rival)character.faction=parent;
  s.world.disputeHistory.unshift({faction:parent,claimant:war.claimant,outcome:rivalWins?'civil_war_victory':'civil_war_defeat',year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);
  continueRemainingDispute(s,parent,dispute);
  // A deceased claimant's supporters can win, but cannot themselves rule.
  // Resolve an uncontested vacancy normally; living rivals still contest it.
  if(rivalWins&&!s.world.leadership[parent].length)assignSuccession(s,parent);
 }
}

// A negotiated settlement preserves both sides' surviving forces. It cannot
// silently create a war between a realm and one of its existing allies.
export function settleDynasticWar(s,parent){
 const cfg=CONFIG[parent],dispute=s.world.disputes?.[parent],war=dispute?.war;if(!cfg||!war||!s.factions[parent]||!s.factions[cfg.rival])return false;
 const enemies=s.wars.filter(w=>w.includes(cfg.rival)).map(w=>w.find(id=>id!==cfg.rival)).filter(id=>id!==parent);
 if(enemies.some(id=>s.alliances.some(a=>a.includes(parent)&&a.includes(id))))return false;
 const person=s.world.characters[war.claimant],leaders=(s.world.leadership[parent]||[]).filter(id=>s.world.characters[id]?.alive);
 for(const a of s.armies.filter(a=>[parent,cfg.rival].includes(a.owner))){
  if(a.move&&[parent,cfg.rival].includes(s.regions.find(r=>r.id===a.move.to)?.owner))a.move=null;
  if(a.siege&&[parent,cfg.rival].includes(s.regions.find(r=>r.id===a.siege.region)?.owner))a.siege=null;
  if(a.owner===cfg.rival)a.owner=parent;
 }
 for(const r of s.regions)if(r.owner===cfg.rival)r.owner=parent;
 if(person){person.faction=parent;if(person.alive&&(parent==='egypt'||!leaders.length))leaders.push(war.claimant)}
 s.world.leadership[parent]=[...new Set(leaders)];s.world.claimants[parent]=(s.world.claimants[parent]||[]).filter(id=>id!==war.claimant);
 const base=s.factions[parent],rival=s.factions[cfg.rival];base.treasury+=rival.treasury;base.food+=rival.food;base.manpower+=rival.manpower;
 s.wars=s.wars.filter(w=>!w.includes(cfg.rival));for(const enemy of enemies)if(!s.wars.some(w=>w.includes(parent)&&w.includes(enemy)))s.wars.push([parent,enemy]);
 s.alliances=s.alliances.filter(a=>!a.includes(cfg.rival));delete s.factions[cfg.rival];delete s.world.leadership[cfg.rival];delete s.world.governments?.[cfg.rival];
 s.world.disputeHistory.unshift({faction:parent,claimant:war.claimant,outcome:'negotiated_settlement',year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);
 continueRemainingDispute(s,parent,dispute);
 return true;
}

const random=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};

// A report can be false or old. The ability to send a proposal depends only
// on the sender's own leads, never on whether the hidden war is still active.
export function canMediate(s,actor,parent){
 const cfg=CONFIG[parent];if(!cfg||!['caesar','senate'].includes(actor)||!s.factions[actor]||!s.regions.some(r=>r.owner===actor))return false;
 return knownDynasticFactions(s,actor).includes(cfg.rival)||(s.knowledge?.[actor]?.[parent]?.reports||[]).some(r=>r.kind==='clashes'&&r.value==='reported');
}
export function requestMediation(s,actor,parent){
 if(!canMediate(s,actor,parent))return {ok:false,reason:'unavailable'};
 s.mediations||=[];if(s.mediations.some(x=>x.actor===actor&&x.parent===parent&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<12)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=12;s.mediations.unshift({actor,parent,status:'pending',remaining:6,duration:6,sentYear:s.year,sentMonth:s.month});
 if(actor===s.player)log(s,'Mediation letters were sent; a response may take six months.','调停书信已寄出；回信可能需要六个月。');return {ok:true,duration:6};
}

export function advanceMediations(s){
 for(const m of s.mediations||[]){if(m.status!=='pending')continue;m.remaining=Math.max(0,m.remaining-1);
  if(!m.sealed&&m.remaining<=3){
   const war=s.world.disputes?.[m.parent]?.war,base=s.factions[m.parent],rival=war&&s.factions[war.rival];let result='no_reply';
   if(war&&base&&rival){const a=random(s),b=random(s),threshold=f=>f.stability<40?.38:.5;
    if(a<.18||b<.18)result='no_reply';else if(a<threshold(base)||b<threshold(rival))result='refused';else result=settleDynasticWar(s,m.parent)?'accepted':'refused';
   }
   m.sealed={result,year:s.year,month:s.month};
  }
  if(m.remaining>0)continue;const reply=m.sealed||{result:'no_reply'},lost=reply.result!=='no_reply'&&random(s)<.15;
  m.status=lost?'no_reply':reply.result;m.responseYear=reply.year;m.responseMonth=reply.month;delete m.sealed;
  if(m.actor===s.player)log(s,m.status==='accepted'?'A reply reports a negotiated settlement; the situation may have changed since it was written.':m.status==='refused'?'A reply declined the mediation proposal.':'No mediation reply arrived; the letters may have been lost.',m.status==='accepted'?'回信称双方达成和解；局势可能在写信后改变。':m.status==='refused'?'回信拒绝了调停提议。':'未收到调停回信；书信可能遗失。');
 }
}
