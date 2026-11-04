import {advancePersonalDiplomacy} from './personal-diplomacy.js?v=13';
import {initializeGovernments,advanceGovernments} from './governance.js?v=5';
import {REGIONS, ROUTES, FACTIONS, INITIAL_ARMIES} from './data.js?v=8';
import {initializeWorld,OPENING_LEADERS,CHARACTER_CATALOG} from './characters.js?v=8';
import {queueMission,advanceOperations,advanceAgentRequests,advanceCharacters,advanceDisputes,battlefieldWound,commandFactor,linkCommanders,publicLeaderClaim,addReport,observeArmies} from './character-system.js?v=16';
export {queueMission};

const clone = value => JSON.parse(JSON.stringify(value));
export const region = (s,id) => s.regions.find(r=>r.id===id);
export const army = (s,id) => s.armies.find(a=>a.id===id);
export const adjacent = (id) => ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea'}));
const rnd = s => {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const log = (s,en,zh) => {s.log.unshift({month:s.month,year:s.year,en,zh});s.log=s.log.slice(0,80)};
export const isWar = (s,a,b) => a!==b && s.wars.some(w=>w.includes(a)&&w.includes(b));
export const PLAYABLE = ['caesar','senate','egypt','numidia','mauretania','armenia','parthia'];
const pair = (a,b) => [a,b].sort().join(':');
export const relation = (s,a,b) => s.relations[pair(a,b)] ?? 0;
export const isAllied = (s,a,b) => s.alliances.some(p=>p.includes(a)&&p.includes(b));
const strength = (s,id) => s.armies.filter(a=>a.owner===id).reduce((v,a)=>v+a.men,0);

export function newGame(player='caesar'){
  if(!PLAYABLE.includes(player))throw new Error('Invalid playable faction');
  const s=initializeWorld({version:3,seed:49049,year:-49,month:1,mode:'historical',player,relations:{'caesar:numidia':-30,'caesar:mauretania':20,'caesar:parthia':-10,'numidia:senate':25},alliances:[],
    regions:clone(REGIONS),armies:clone(INITIAL_ARMIES).map(a=>({...a,move:null,siege:null})),
    factions:{
      caesar:{treasury:90,food:65,manpower:22000,stability:58,legitimacy:49,tax:'normal',research:0},
      senate:{treasury:135,food:100,manpower:34000,stability:57,legitimacy:68,tax:'normal',research:0},
      egypt:{treasury:85,food:90,manpower:9000,stability:64,legitimacy:60,tax:'normal',research:0},
      ...Object.fromEntries(['numidia','mauretania','armenia','parthia'].map(id=>[id,{treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0}])),
      rebels:{treasury:10,food:15,manpower:0,stability:50,legitimacy:0,tax:'normal',research:0}
    },wars:[['caesar','senate']],log:[],victory:false,nextArmy:1});
  linkCommanders(s);return initializeGovernments(s);
}

export function upgradeSave(s){
  if(s.version===3)return initializeGovernments(s);
  if(s.version!==2)throw new Error('Unsupported save');
  const old=s.relations||{}, oldAllies=s.alliances||[];
  s.relations=Object.fromEntries(Object.entries(old).map(([id,value])=>[pair('caesar',id),value]));
  s.alliances=oldAllies.map(id=>['caesar',id]);s.version=3;
  return initializeGovernments(s);
}

export function previewMarch(s,armyId,destination){
  const a=army(s,armyId); const target=region(s,destination);
  if(!a||!target||a.men<=0||a.move||a.siege)return {ok:false,reason:'unavailable'};
  const link=adjacent(a.region).find(e=>e.to===destination);
  if(!link)return {ok:false,reason:'adjacent'};
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner))return {ok:false,reason:'peace'};
  const faction=s.factions[a.owner];
  if(link.sea&&faction.treasury<8)return {ok:false,reason:'transport'};
  const months=(link.sea?3:1)+(target.terrain==='hills'?1:0)+(target.terrain==='desert'?1:0);
  return {ok:true,months,sea:!!link.sea,terrain:target.terrain,hostile:target.owner!==a.owner,food:faction.food,supply:target.supply};
}

export function moveArmy(s,armyId,destination){
  const estimate=previewMarch(s,armyId,destination);
  if(!estimate.ok)return estimate;
  const a=army(s,armyId),target=region(s,destination),link=adjacent(a.region).find(e=>e.to===destination);
  if(link.sea)s.factions[a.owner].treasury-=8;
  const months=estimate.months;
  a.move={to:destination,remaining:months,sea:link.sea};
  if(a.owner===s.player)log(s,`${a.name[0]} marched toward ${target.name[0]} (${months} month${months>1?'s':''}).`,`${a.name[1]}向${target.name[1]}行军（${months}个月）。`);
  return {ok:true};
}

export function recruit(s,regionId,owner=s.player){
  const r=region(s,regionId),f=s.factions[owner];
  if(!r||r.owner!==owner||f.treasury<24||f.manpower<3000||f.food<6)return false;
  f.treasury-=24;f.manpower-=3000;f.food-=6;
  const id=`levy${s.nextArmy++}`;
  const roman=owner==='caesar'||owner==='senate';
  s.armies.push({id,name:roman?['Newly raised legion','新编军团']:['Newly raised forces','新征召军队'],owner,region:regionId,men:3000,morale:58,skill:1,experience:0,commander:['Unnamed officer','未具名军官'],move:null,siege:null});
  r.loyalty=Math.max(0,r.loyalty-3);
  if(owner===s.player)log(s,`New forces were raised in ${r.name[0]}.`,`在${r.name[1]}征召了新军队。`);
  return true;
}

export function setTax(s,owner,level){
  if(!['low','normal','high'].includes(level)||!s.factions[owner])return false;
  s.factions[owner].tax=level;
  log(s,`${FACTIONS[owner].short[0]} set ${level} taxation.`,`${FACTIONS[owner].short[1]}实行${{low:'低',normal:'标准',high:'高'}[level]}税率。`);
  return true;
}

export function diplomacy(s, actor, target, action){
  if(actor===target || !s.factions[actor] || !s.factions[target] || target==='rebels'||actor==='rebels' || !s.regions.some(r=>r.owner===actor) || !s.regions.some(r=>r.owner===target))return false;
  const key=pair(actor,target);
  if(action==='improve' && !isWar(s,actor,target) && s.factions[actor].treasury>=10){s.factions[actor].treasury-=10;s.relations[key]=Math.min(100,relation(s,actor,target)+15);log(s,`${FACTIONS[actor].short[0]} improved relations with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}改善了与${FACTIONS[target].short[1]}的关系。`);return true}
  if(action==='alliance' && !isWar(s,actor,target) && relation(s,actor,target)>=30 && !isAllied(s,actor,target) && !s.wars.some(w=>(w.includes(actor)&&isAllied(s,target,w.find(x=>x!==actor)))||(w.includes(target)&&isAllied(s,actor,w.find(x=>x!==target))))){s.alliances.push([actor,target]);log(s,`${FACTIONS[actor].short[0]} allied with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}结盟。`);return true}
  if(action==='break' && isAllied(s,actor,target)){s.alliances=s.alliances.filter(p=>!(p.includes(actor)&&p.includes(target)));s.relations[key]=relation(s,actor,target)-20;log(s,`${FACTIONS[actor].short[0]} broke its alliance with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}解除了与${FACTIONS[target].short[1]}的同盟。`);return true}
  if(action==='war' && !isWar(s,actor,target)){
    if(isAllied(s,actor,target))return false;
    s.wars.push([actor,target]);
    for(const p of s.alliances.filter(p=>p.includes(target))){const ally=p.find(x=>x!==target);if(ally!==actor&&!isWar(s,ally,actor)&&!isAllied(s,ally,actor))s.wars.push([ally,actor])}
    for(const p of s.alliances.filter(p=>p.includes(actor))){const ally=p.find(x=>x!==actor);if(ally!==target&&!isWar(s,ally,target)&&!isAllied(s,ally,target))s.wars.push([ally,target])}
    s.relations[key]=-60;
    s.factions[actor].legitimacy=Math.max(0,s.factions[actor].legitimacy-5);
    log(s,`${FACTIONS[actor].short[0]} declared war on ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}向${FACTIONS[target].short[1]}宣战。`);
    return true;
  }
  if(action==='peace' && isWar(s,actor,target)){
    // The responding government knows its own forces, but judges the sender by its reports.
    if(estimatedStrength(s,target,actor)<strength(s,target)*.6 && s.factions[target].stability>35)return false;
    s.wars=s.wars.filter(w=>!(w.includes(actor)&&w.includes(target)));
    s.relations[key]=-20;
    for(const a of s.armies.filter(a=>a.owner===actor||a.owner===target)){
      const other=a.owner===actor?target:actor;
      if(a.move && region(s,a.move.to).owner===other)a.move=null;
      if(a.siege && region(s,a.siege.region).owner===other)a.siege=null;
    }
    log(s,`${FACTIONS[actor].short[0]} and ${FACTIONS[target].short[0]} made peace; current control remains.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}议和，维持现有控制。`);
    return true;
  }
  return false;
}

// Official letters are simulated per sender and persist in compatible saves.
const courtReports={
 caesar:['Julius Caesar, military and political leader','尤利乌斯·凯撒，政治与军事领袖'],
 senate:['Pompey, commander aligned with the Senate','庞培，元老院方面军事统帅'],
 egypt:['Cleopatra VII and Ptolemy XIII, joint rulers','克娄巴特拉七世与托勒密十三世，共同统治者'],
 numidia:['Juba I, king','朱巴一世，国王'],mauretania:['Bocchus II and Bogud, rulers of separate kingdoms','博库斯二世与博古德，各自统治不同王国'],
 armenia:['Artavasdes II, king','阿尔塔瓦兹德二世，国王'],parthia:['Orodes II, king','奥罗德二世，国王']
};
const letterMonths={senate:2,caesar:2,egypt:4,numidia:3,mauretania:4,armenia:5,parthia:5};
export function sendInquiry(s,actor,target,subject='leaders'){
 if(!['leaders','successor','availability','representative'].includes(subject))return {ok:false,reason:'subject'};
 if(actor===target||!s.factions[actor]||!courtReports[target]||!s.regions.some(r=>r.owner===actor)||!s.regions.some(r=>r.owner===target))return {ok:false,reason:'unavailable'};
 if(s.factions[actor].treasury<3)return {ok:false,reason:'treasury'};
 if((s.inquiries||[]).some(x=>x.actor===actor&&x.target===target&&x.status==='pending'))return {ok:false,reason:'pending'};
 const duration=letterMonths[target]||4;s.factions[actor].treasury-=3;
 (s.inquiries||=[]).unshift({actor,target,sentYear:s.year,sentMonth:s.month,remaining:duration,duration,subject,status:'pending',source:'official court',confidence:'unverified'});
 log(s,`A letter was sent to ${FACTIONS[target].short[0]}; a reply may take ${duration} months.`,`已向${FACTIONS[target].short[1]}寄信；等待回信约需${duration}个月。`);
 return {ok:true,duration};
}
function resolveInquiries(s){
 for(const letter of s.inquiries||[]){
  if(letter.status!=='pending'||--letter.remaining>0)continue;
  const roll=rnd(s),hostile=isWar(s,letter.actor,letter.target),rel=relation(s,letter.actor,letter.target);
  if(roll<.18||!s.regions.some(r=>r.owner===letter.target)){letter.status='no_reply';log(s,`No reply has arrived from ${FACTIONS[letter.target].short[0]}; the letter or answer may have been lost.`,`来自${FACTIONS[letter.target].short[1]}的回信尚未到达；书信或回信可能遗失。`)}
  else if(roll<(hostile?.65:rel<0?.46:.34)){letter.status='refused';log(s,`A reply from ${FACTIONS[letter.target].short[0]} declined to answer.`,`${FACTIONS[letter.target].short[1]}回信表示不愿回答。`)}
  else{letter.status='answered';const current=s.world.leadership[letter.target]||[],opening=OPENING_LEADERS[letter.target]||[];const conceal=isWar(s,letter.actor,letter.target)&&opening.some(id=>!current.includes(id));const stated=conceal?opening:current;const claimants=s.world.claimants[letter.target]||[],subject=letter.subject||'leaders';letter.claim=subject==='successor'?(claimants.length?[`Reported claimant(s): ${claimants.map(id=>CHARACTER_CATALOG[id].name[0]).join(', ')}`,`对方报告的竞争者：${claimants.map(id=>CHARACTER_CATALOG[id].name[1]).join('、')}`]:['No successor was named in the reply.','回信没有指明继承人。']):subject==='availability'?['The court has made no binding commitment to a meeting.','宫廷尚未就会面作出承诺。']:subject==='representative'?['An unnamed official may represent the court.','一名未具名官员可代表宫廷。']:stated.length?[stated.map(id=>CHARACTER_CATALOG[id].name[0]).join(', '),stated.map(id=>CHARACTER_CATALOG[id].name[1]).join('、')]:['Authority uncertain','执政者不明'];letter.reportYear=s.year;letter.reportMonth=s.month;if(subject==='leaders')addReport(s,letter.actor,letter.target,{kind:'leaders',leaders:[...stated],source:'official',confidence:'unverified',reliability:'unknown'});log(s,`An unverified official response arrived from ${FACTIONS[letter.target].short[0]}.`,`收到${FACTIONS[letter.target].short[1]}的官方答复，内容尚未经独立核实。`)}
 }
}

export function resolveBattle(s,attacker,defender,target){
  const terrain={plain:1,hills:1.2,forest:1.12,urban:1.25,desert:1.06}[target.terrain];
  const supplyA=Math.min(1,Math.max(.65,s.factions[attacker.owner].food/20));
  const supplyD=Math.min(1,Math.max(.65,s.factions[defender.owner].food/20));
  linkCommanders(s);const powerA=attacker.men*(.65+attacker.morale/200+attacker.skill*.055+attacker.experience*.025)*supplyA*commandFactor(s,attacker);
  const powerD=defender.men*(.65+defender.morale/200+defender.skill*.055+defender.experience*.025)*terrain*(1+target.fort*.12)*supplyD*commandFactor(s,defender);
  const roll=.85+rnd(s)*.3;
  const attackerWins=powerA*roll>powerD;
  const lossA=Math.min(attacker.men,Math.round(defender.men*(attackerWins?.19:.31)*(powerD/powerA)**.25));
  const lossD=Math.min(defender.men,Math.round(attacker.men*(attackerWins?.34:.19)*(powerA/powerD)**.25));
  const report={year:s.year,month:s.month,region:target.id,attacker:{name:[...attacker.name],commander:[...attacker.commander],owner:attacker.owner,men:attacker.men,morale:attacker.morale,food:s.factions[attacker.owner].food,power:Math.round(powerA)},defender:{name:[...defender.name],commander:[...defender.commander],owner:defender.owner,men:defender.men,morale:defender.morale,food:s.factions[defender.owner].food,power:Math.round(powerD)},terrain:target.terrain,fort:target.fort,roll,attackerWins,lossA,lossD};
  (s.battles ||= []).unshift(report);s.battles=s.battles.slice(0,20);
  attacker.men-=lossA;defender.men-=lossD;battlefieldWound(s,attacker);battlefieldWound(s,defender);
  attacker.morale=Math.max(20,attacker.morale+(attackerWins?7:-16));
  defender.morale=Math.max(20,defender.morale+(attackerWins?-16:7));
  if(attackerWins){
    defender.region=adjacent(target.id).map(e=>region(s,e.to)).find(r=>r.owner===defender.owner)?.id||target.id;
    if(defender.region===target.id)defender.men=0;
    const remaining=s.armies.some(other=>other.id!==attacker.id&&other.id!==defender.id&&other.men>0&&other.region===target.id&&!other.move&&isWar(s,attacker.owner,other.owner));
    if(!remaining){attacker.region=target.id;target.owner=attacker.owner;target.loyalty=38}
  } else {
    attacker.region=adjacent(target.id).map(e=>region(s,e.to)).find(r=>r.owner===attacker.owner)?.id||attacker.region;
  }
  attacker.move=null;attacker.experience=Math.min(5,attacker.experience+1);
  defender.experience=Math.min(5,defender.experience+1);
  if(attacker.owner===s.player||defender.owner===s.player){const ownLoss=attacker.owner===s.player?lossA:lossD;log(s,`${FACTIONS[attacker.owner].short[0]} ${attackerWins?'won':'lost'} at ${target.name[0]}. Casualties: own ${ownLoss.toLocaleString()}; enemy unknown.`,`${FACTIONS[attacker.owner].short[1]}在${target.name[1]}${attackerWins?'获胜':'战败'}。己方伤亡：${ownLoss.toLocaleString()}；敌方伤亡未知。`)}
  s.armies=s.armies.filter(a=>a.men>0);
  return attackerWins;
}

function arrive(s,a){
  const target=region(s,a.move.to);
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner)){a.move=null;return}
  const enemy=s.armies.find(other=>other.id!==a.id&&other.region===target.id&&other.owner!==a.owner&&isWar(s,a.owner,other.owner)&&!other.move);
  if(enemy){resolveBattle(s,a,enemy,target);return}
  a.region=target.id;a.move=null;
  if(target.owner!==a.owner){
    if(target.fort>0){a.siege={region:target.id,remaining:target.fort*2};if(a.owner===s.player||target.owner===s.player)log(s,`${a.name[0]} began a siege at ${target.name[0]}.`,`${a.name[1]}开始围攻${target.name[1]}。`)}
    else {const witnessed=a.owner===s.player||target.owner===s.player;target.owner=a.owner;target.loyalty=38;if(witnessed)log(s,`${FACTIONS[a.owner].short[0]} occupied ${target.name[0]}.`,`${FACTIONS[a.owner].short[1]}占领了${target.name[1]}。`)}
  }
}

function economy(s){
  for(const [id,f] of Object.entries(s.factions)){
    const owned=s.regions.filter(r=>r.owner===id);
    const troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0);
    const rate={low:.65,normal:1,high:1.4}[f.tax];
    f.treasury+=Math.round(owned.reduce((n,r)=>n+r.tax*rate*(r.loyalty/100),0)-troops/1100);
    f.food+=Math.round(owned.reduce((n,r)=>n+r.food,0)-troops/1200-owned.length*2);
    f.manpower+=owned.length*170;
    if(f.treasury<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.morale=Math.max(20,a.morale-4))}
    if(f.food<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.men=Math.max(1,Math.round(a.men*.96)))}
    f.treasury=Math.max(-100,Math.round(f.treasury));f.food=Math.max(-100,Math.round(f.food));
    owned.forEach(r=>{r.loyalty=Math.max(0,Math.min(100,r.loyalty+({low:1,normal:0,high:-2}[f.tax])+(f.food<0?-2:0)))});
  }
}

function rebellion(s){
  const candidate=s.regions.find(r=>r.owner!=='rebels'&&r.loyalty<25&&s.factions[r.owner].stability<60&&!s.armies.some(a=>a.region===r.id&&a.owner===r.owner));
  if(!candidate)return;
  const previousOwner=candidate.owner;
  candidate.owner='rebels';candidate.loyalty=45;
  s.armies.push({id:`rebel${s.nextArmy++}`,name:['Provincial uprising','行省起义军'],owner:'rebels',region:candidate.id,men:2400,morale:59,skill:1,experience:0,commander:['Local leaders','地方首领'],move:null,siege:null});
  if(!isWar(s,'rebels',previousOwner))s.wars.push(['rebels',previousOwner]);
  log(s,`${candidate.name[0]} has risen in rebellion and formed an armed faction.`,`${candidate.name[1]}爆发叛乱，形成了武装派系。`);
}

function shortestStep(s,start,goal,owner){
  const queue=[[start,null]],seen=new Set([start]);
  while(queue.length){const [id,first]=queue.shift();if(id===goal)return first;
    for(const e of adjacent(id)){if(seen.has(e.to))continue;const r=region(s,e.to);if(r.owner!==owner&&!isWar(s,owner,r.owner))continue;seen.add(e.to);queue.push([e.to,first||e.to])}}
  return null;
}

function estimatedStrength(s,observer,target){const reports=s.knowledge?.[observer]?.[target]?.reports||[],latest=reports.filter(x=>x.kind==='strength'&&Number.isFinite(x.value)).sort((a,b)=>((b.observationYear??b.year)*12+(b.observationMonth??b.month))-((a.observationYear??a.year)*12+(a.observationMonth??a.month)))[0];if(latest)return latest.value;return INITIAL_ARMIES.filter(a=>a.owner===target).reduce((v,a)=>v+a.men,0)}
function aiTurn(s,owner){
  const f=s.factions[owner],owned=s.regions.filter(r=>r.owner===owner);
  if(!owned.length)return;
  const enemies=s.regions.filter(r=>isWar(s,owner,r.owner));
  const available=s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&a.men>1200);
  for(const a of available){
    const targets=enemies.map(r=>({r,d:Math.hypot(r.x-region(s,a.region).x,r.y-region(s,a.region).y)})).sort((x,y)=>x.d-y.d);
    for(const {r} of targets){const step=shortestStep(s,a.region,r.id,owner);if(step&&step!==a.region){const defenderOwner=region(s,step).owner;const defenders=isWar(s,owner,defenderOwner)?estimatedStrength(s,owner,defenderOwner)/Math.max(1,s.regions.filter(x=>x.owner===defenderOwner).length):0;if(defenders>a.men*1.35||f.food<0)continue;moveArmy(s,a.id,step);break}}
  }
  if(f.treasury>65&&f.manpower>5500&&s.month%4===0){
    const border=owned.find(r=>adjacent(r.id).some(e=>isWar(s,owner,region(s,e.to).owner)));
    if(border)recruit(s,border.id,owner);
  }
  if(f.stability<45&&f.treasury>25){f.treasury-=10;f.stability+=3}
  if(owner!=='rebels' && s.month===8 && f.treasury>=25){const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);if(enemy&&enemy!=='rebels')queueMission(s,owner,enemy,'spy','strength')}
  if(owner!=='rebels' && s.month===12){
    const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);
    if(enemy && (f.food<0||f.treasury<0||f.stability<35) && strength(s,owner)>=estimatedStrength(s,owner,enemy)*.6)diplomacy(s,owner,enemy,'peace');
    if(!enemy && f.treasury>35){const neighbor=owned.flatMap(r=>adjacent(r.id).map(e=>region(s,e.to))).find(r=>r.owner!==owner&&r.owner!=='rebels'&&relation(s,owner,r.owner)>=0&&!isAllied(s,owner,r.owner));if(neighbor && rnd(s)<.2)diplomacy(s,owner,neighbor.owner,'improve')}
  }
  if(owner!=='rebels' && s.month%6===0 && f.treasury>40 && f.food>10 && strength(s,owner)>2000){
    const border=owned.flatMap(r=>adjacent(r.id).map(e=>region(s,e.to))).find(r=>r.owner!==owner&&r.owner!=='rebels'&&!isWar(s,owner,r.owner)&&!isAllied(s,owner,r.owner)&&strength(s,owner)>estimatedStrength(s,owner,r.owner)*1.5&&relation(s,owner,r.owner)<0);
    if(border&&rnd(s)<.18)diplomacy(s,owner,border.owner,'war');
  }
}

export function tick(s){
  initializeWorld(s);linkCommanders(s);
  s.month++;if(s.month>12){s.month=1;s.year++}
  economy(s);
  // Travel and sieges resolve before new AI orders.
  for(const a of [...s.armies]){
    if(!s.armies.includes(a))continue;
    if(a.move){a.move.remaining--;if(a.move.remaining<=0)arrive(s,a)}
    else if(a.siege){a.siege.remaining--;if(a.siege.remaining<=0){const r=region(s,a.siege.region),witnessed=a.owner===s.player||r.owner===s.player;r.owner=a.owner;r.loyalty=36;a.siege=null;if(witnessed)log(s,`${r.name[0]} surrendered after a siege.`,`${r.name[1]}在围攻后投降。`)}}
  }
  rebellion(s);
  resolveInquiries(s);advanceOperations(s);advanceAgentRequests(s);advanceCharacters(s);advanceDisputes(s);advanceGovernments(s);linkCommanders(s);advancePersonalDiplomacy(s);
  observeArmies(s);
  for(const owner of Object.keys(s.factions).filter(id=>id!==s.player))aiTurn(s,owner);
  if(!s.victory&&s.player==='caesar'&&s.regions.every(r=>r.owner!=='senate')){s.victory=true;log(s,'The Pompeian command has collapsed. The campaign continues.','庞培派势力瓦解。战役仍可继续。')}
  return s;
}
