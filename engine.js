import {REGIONS, ROUTES, FACTIONS, INITIAL_ARMIES} from './data.js';

const clone = value => JSON.parse(JSON.stringify(value));
export const region = (s,id) => s.regions.find(r=>r.id===id);
export const army = (s,id) => s.armies.find(a=>a.id===id);
export const adjacent = (id) => ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea'}));
const rnd = s => {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const log = (s,en,zh) => {s.log.unshift({month:s.month,year:s.year,en,zh});s.log=s.log.slice(0,80)};
export const isWar = (s,a,b) => a!==b && s.wars.some(w=>w.includes(a)&&w.includes(b));

export function newGame(){
  return {version:2,seed:49049,year:-49,month:1,mode:'historical',player:'caesar',relations:{egypt:0,numidia:-30,mauretania:20,armenia:0,parthia:-10},alliances:[],
    regions:clone(REGIONS),armies:clone(INITIAL_ARMIES).map(a=>({...a,move:null,siege:null})),
    factions:{
      caesar:{treasury:90,food:65,manpower:22000,stability:58,legitimacy:49,tax:'normal',research:0},
      senate:{treasury:135,food:100,manpower:34000,stability:57,legitimacy:68,tax:'normal',research:0},
      egypt:{treasury:85,food:90,manpower:9000,stability:64,legitimacy:60,tax:'normal',research:0},
      ...Object.fromEntries(['numidia','mauretania','armenia','parthia'].map(id=>[id,{treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0}])),
      rebels:{treasury:10,food:15,manpower:0,stability:50,legitimacy:0,tax:'normal',research:0}
    },wars:[['caesar','senate']],log:[],victory:false,nextArmy:1};
}

export function moveArmy(s,armyId,destination){
  const a=army(s,armyId); const target=region(s,destination);
  if(!a||!target||a.men<=0||a.move||a.siege)return {ok:false,reason:'unavailable'};
  const link=adjacent(a.region).find(e=>e.to===destination);
  if(!link)return {ok:false,reason:'adjacent'};
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner))return {ok:false,reason:'peace'};
  const faction=s.factions[a.owner];
  if(link.sea&&faction.treasury<8)return {ok:false,reason:'transport'};
  if(link.sea)faction.treasury-=8;
  const months=(link.sea?3:1)+(target.terrain==='hills'?1:0)+(target.terrain==='desert'?1:0);
  a.move={to:destination,remaining:months,sea:link.sea};
  log(s,`${a.name[0]} marched toward ${target.name[0]} (${months} month${months>1?'s':''}).`,`${a.name[1]}向${target.name[1]}行军（${months}个月）。`);
  return {ok:true};
}

export function recruit(s,regionId,owner=s.player){
  const r=region(s,regionId),f=s.factions[owner];
  if(!r||r.owner!==owner||f.treasury<24||f.manpower<3000||f.food<6)return false;
  f.treasury-=24;f.manpower-=3000;f.food-=6;
  const id=`levy${s.nextArmy++}`;
  s.armies.push({id,name:['Newly raised legion','新编军团'],owner,region:regionId,men:3000,morale:58,skill:1,experience:0,commander:['Unnamed officer','未具名军官'],move:null,siege:null});
  r.loyalty=Math.max(0,r.loyalty-3);
  log(s,`A new legion was raised in ${r.name[0]}.`,`在${r.name[1]}组建了新军团。`);
  return true;
}

export function setTax(s,owner,level){
  if(!['low','normal','high'].includes(level)||!s.factions[owner])return false;
  s.factions[owner].tax=level;
  log(s,`${FACTIONS[owner].short[0]} set ${level} taxation.`,`${FACTIONS[owner].short[1]}实行${{low:'低',normal:'标准',high:'高'}[level]}税率。`);
  return true;
}

export function diplomacy(s, actor, target, action){
  if(actor===target || !s.factions[actor] || !s.factions[target] || target==='rebels')return false;
  if(action==='improve' && actor==='caesar' && !isWar(s,actor,target) && s.factions[actor].treasury>=10){s.factions[actor].treasury-=10;s.relations[target]=Math.min(100,(s.relations[target]||0)+15);log(s,`Relations improved with ${FACTIONS[target].short[0]}.`,`与${FACTIONS[target].short[1]}的关系改善。`);return true}
  if(action==='alliance' && actor==='caesar' && !isWar(s,actor,target) && (s.relations[target]||0)>=30 && !s.alliances.includes(target)){s.alliances.push(target);log(s,`An alliance was formed with ${FACTIONS[target].short[0]}.`,`与${FACTIONS[target].short[1]}结盟。`);return true}
  if(action==='break' && actor==='caesar' && s.alliances.includes(target)){s.alliances=s.alliances.filter(x=>x!==target);s.relations[target]-=20;return true}
  if(action==='war' && !isWar(s,actor,target)){
    if(actor==='caesar' && s.alliances.includes(target))return false;
    s.wars.push([actor,target]);
    if(actor==='caesar')for(const ally of s.alliances){if(ally!==target&&!isWar(s,ally,target))s.wars.push([ally,target])}
    s.factions[actor].legitimacy=Math.max(0,s.factions[actor].legitimacy-5);
    log(s,`${FACTIONS[actor].short[0]} declared war on ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}向${FACTIONS[target].short[1]}宣战。`);
    return true;
  }
  if(action==='peace' && isWar(s,actor,target)){
    s.wars=s.wars.filter(w=>!(w.includes(actor)&&w.includes(target)));
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

export function resolveBattle(s,attacker,defender,target){
  const terrain={plain:1,hills:1.2,forest:1.12,urban:1.25,desert:1.06}[target.terrain];
  const supplyA=Math.min(1,Math.max(.65,s.factions[attacker.owner].food/20));
  const supplyD=Math.min(1,Math.max(.65,s.factions[defender.owner].food/20));
  const powerA=attacker.men*(.65+attacker.morale/200+attacker.skill*.055+attacker.experience*.025)*supplyA;
  const powerD=defender.men*(.65+defender.morale/200+defender.skill*.055+defender.experience*.025)*terrain*(1+target.fort*.12)*supplyD;
  const roll=.85+rnd(s)*.3;
  const attackerWins=powerA*roll>powerD;
  const lossA=Math.min(attacker.men,Math.round(defender.men*(attackerWins?.19:.31)*(powerD/powerA)**.25));
  const lossD=Math.min(defender.men,Math.round(attacker.men*(attackerWins?.34:.19)*(powerA/powerD)**.25));
  attacker.men-=lossA;defender.men-=lossD;
  attacker.morale=Math.max(20,attacker.morale+(attackerWins?7:-16));
  defender.morale=Math.max(20,defender.morale+(attackerWins?-16:7));
  if(attackerWins){
    defender.region=adjacent(target.id).map(e=>region(s,e.to)).find(r=>r.owner===defender.owner)?.id||target.id;
    if(defender.region===target.id)defender.men=0;
    attacker.region=target.id;
    target.owner=attacker.owner;
    target.loyalty=38;
  } else {
    attacker.region=adjacent(target.id).map(e=>region(s,e.to)).find(r=>r.owner===attacker.owner)?.id||attacker.region;
  }
  attacker.move=null;attacker.experience=Math.min(5,attacker.experience+1);
  defender.experience=Math.min(5,defender.experience+1);
  log(s,`${FACTIONS[attacker.owner].short[0]} ${attackerWins?'won':'lost'} at ${target.name[0]}. Casualties: ${lossA.toLocaleString()} / ${lossD.toLocaleString()}.`,`${FACTIONS[attacker.owner].short[1]}在${target.name[1]}${attackerWins?'获胜':'战败'}。伤亡：${lossA.toLocaleString()} / ${lossD.toLocaleString()}。`);
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
    if(target.fort>0){a.siege={region:target.id,remaining:target.fort*2};log(s,`${a.name[0]} began a siege at ${target.name[0]}.`,`${a.name[1]}开始围攻${target.name[1]}。`)}
    else {target.owner=a.owner;target.loyalty=38;log(s,`${FACTIONS[a.owner].short[0]} occupied ${target.name[0]}.`,`${FACTIONS[a.owner].short[1]}占领了${target.name[1]}。`)}
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

function aiTurn(s,owner){
  const f=s.factions[owner],owned=s.regions.filter(r=>r.owner===owner);
  if(!owned.length)return;
  const enemies=s.regions.filter(r=>isWar(s,owner,r.owner));
  const available=s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&a.men>1200);
  for(const a of available){
    const targets=enemies.map(r=>({r,d:Math.hypot(r.x-region(s,a.region).x,r.y-region(s,a.region).y)})).sort((x,y)=>x.d-y.d);
    for(const {r} of targets){const step=shortestStep(s,a.region,r.id,owner);if(step&&step!==a.region){moveArmy(s,a.id,step);break}}
  }
  if(f.treasury>65&&f.manpower>5500&&s.month%4===0){
    const border=owned.find(r=>adjacent(r.id).some(e=>isWar(s,owner,region(s,e.to).owner)));
    if(border)recruit(s,border.id,owner);
  }
  if(f.stability<45&&f.treasury>25){f.treasury-=10;f.stability+=3}
}

export function tick(s){
  s.month++;if(s.month>12){s.month=1;s.year++}
  economy(s);
  // Travel and sieges resolve before new AI orders.
  for(const a of [...s.armies]){
    if(a.move){a.move.remaining--;if(a.move.remaining<=0)arrive(s,a)}
    else if(a.siege){a.siege.remaining--;if(a.siege.remaining<=0){const r=region(s,a.siege.region);r.owner=a.owner;r.loyalty=36;a.siege=null;log(s,`${r.name[0]} surrendered after a siege.`,`${r.name[1]}在围攻后投降。`)}}
  }
  rebellion(s);
  for(const owner of Object.keys(s.factions).filter(id=>id!==s.player))aiTurn(s,owner);
  if(!s.victory&&s.regions.every(r=>r.owner!=='senate')){s.victory=true;log(s,'The Pompeian command has collapsed. The campaign continues.','庞培派势力瓦解。战役仍可继续。')}
  return s;
}

