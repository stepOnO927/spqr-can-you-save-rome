import {CHARACTER_CATALOG} from './characters.js?v=faces-empire-2';
import {createFictionalPerson,recordLifeEvent} from './dynasties.js?v=faces-empire-2';

const date=s=>s.year*12+s.month;
const pair=(a,b)=>[a,b].sort().join(':');
const atWar=(s,a,b)=>(s.wars||[]).some(w=>w.includes(a)&&w.includes(b));
const home=(s,id)=>s.regions.find(r=>r.owner===id)?.id||null;
const names={
  caesar:{envoy:['Lucius Marcius Varro','卢修斯·马尔基乌斯·瓦罗'],merchant:['Gaius Fabius Felix','盖乌斯·法比乌斯·费利克斯']},
  senate:{envoy:['Aulus Cornelius Varo','奥卢斯·科尔内利乌斯·瓦罗'],merchant:['Titus Atilius Primus','提图斯·阿提利乌斯·普里穆斯']},
  egypt:{envoy:['Demetrios of Memphis','孟斐斯的德米特里奥斯'],merchant:['Nikanor of Alexandria','亚历山大里亚的尼卡诺尔']},
  parthia:{envoy:['Artabanos of Seleucia','塞琉西亚的阿尔塔巴诺斯'],merchant:['Phraates of Nisibis','尼西比斯的弗拉特斯']},
  armenia:{envoy:['Vahan of Artaxata','阿尔塔沙特的瓦汉'],merchant:['Aram of Tigranocerta','提格兰诺刻尔塔的阿拉姆']},
  numidia:{envoy:['Iarbas of Cirta','基尔塔的亚尔巴斯'],merchant:['Massinissa of Hippo','希波的马西尼萨']},
  mauretania:{envoy:['Mastanes of Tingis','廷吉斯的马斯塔涅斯'],merchant:['Sufax of Iol','伊奥尔的苏法克斯']},
  galatia:{envoy:['Menas of Ancyra','安居拉的梅纳斯'],merchant:['Attalos of Tavium','塔维乌姆的阿塔洛斯']},
  bosporus:{envoy:['Mithrenes of Panticapaeum','潘提卡帕伊翁的米特瑞涅斯'],merchant:['Menodoros of Phanagoria','法纳戈里亚的墨诺多罗斯']}
};
const fallback={envoy:['A court envoy','一名宫廷使者'],merchant:['A traveling merchant','一名商旅']};
const statusAtHost=new Set(['active_mission','trading','returning','awaiting_audience','under_safe_conduct','restricted','ordered_depart','temporarily_detained','assets_frozen']);

export function initializePersonnel(s){
  s.mail||={};
  s.mail.personnel||=[];
  s.mail.nextPersonnelId||=1;
  s.mail.warPolicies||={};
  s.mail.personnelIncidents||=[];
  s.mail.tradeSuspensions||=[];
  s.mail.accessRestrictions||={};
  return s.mail.personnel;
}
export function wartimePolicy(s,faction){
  initializePersonnel(s);
  return s.mail.warPolicies[faction]||{envoys:'safe_departure',merchants:'restrict'};
}
export function setWartimePolicy(s,faction,kind,policy){
  if(faction!==s.player||!s.factions[faction]||!['envoys','merchants'].includes(kind))return {ok:false,reason:'authority'};
  if(!(kind==='envoys'?['safe_departure','detain','execute']:['restrict','depart','freeze']).includes(policy))return {ok:false,reason:'policy'};
  const current=wartimePolicy(s,faction);
  s.mail.warPolicies[faction]={...current,[kind]:policy};
  for(const war of s.wars.filter(w=>w.includes(faction)))applyWarPersonnel(s,war,`policy:${date(s)}:${faction}:${kind}:${policy}`);
  return {ok:true};
}
function commissionedName(s,faction,kind){
  const base=names[faction]?.[kind]||fallback[kind],n=s.mail.personnel.filter(p=>p.homeFaction===faction&&p.kind===kind).length;
  return n ? [`${base[0]} (${n+1})`,`${base[1]}（${n+1}）`] : base;
}
export function registerMissionPersonnel(s,operation){
  if(!['envoy','travelers'].includes(operation.type)||!s.factions[operation.actor]||!s.factions[operation.target])return null;
  const people=initializePersonnel(s),kind=operation.type==='envoy'?'envoy':'merchant',actor=operation.actor,target=operation.target;
  let entry=operation.agentId&&people.find(p=>p.characterId===operation.agentId);
  if(!entry&&operation.agentId&&s.world.characters[operation.agentId]?.alive){
    entry={id:'personnel:'+s.mail.nextPersonnelId++,characterId:operation.agentId,kind,homeFaction:actor,status:'at_home',safeConduct:false,history:[]};
    people.push(entry);
  }
  if(!entry)entry=people.find(p=>p.homeFaction===actor&&p.kind===kind&&p.status==='at_home'&&s.world.characters[p.characterId]?.alive);
  if(!entry){
    const role=kind==='envoy'?['Fictional diplomatic envoy','虚构外交使者']:['Fictional traveling merchant','虚构商旅'];
    const characterId=createFictionalPerson(s,{name:commissionedName(s,actor,kind),faction:actor,birthYear:s.year-35,location:home(s,actor),role,wealth:kind==='merchant'?12:5});
    // The person entered the campaign as an adult; a new birth event would be false.
    const life=s.world.dynasties.lives[characterId];
    if(life?.at(-1)?.en==='Born in the simulated campaign.')life.pop();
    recordLifeEvent(s,characterId,'Entered service in the simulated campaign.','在模拟战役中开始任职。');
    entry={id:'personnel:'+s.mail.nextPersonnelId++,characterId,kind,homeFaction:actor,status:'at_home',safeConduct:false,history:[]};
    people.push(entry);
  }
  operation.personnelId=entry.characterId;
  entry.operationId=operation.id||null;entry.hostFaction=target;entry.status='traveling';entry.safeConduct=false;
  entry.arrival=date(s)+Math.max(1,Math.ceil((operation.duration||3)/2));entry.returnAt=null;
  entry.history.push({status:'traveling',year:s.year,month:s.month,hostFaction:target});
  return entry;
}
export function advancePersonnel(s){
  const people=initializePersonnel(s),now=date(s);
  for(const p of people){
    const person=s.world.characters[p.characterId];
    if(!person?.alive){p.status='deceased';continue}
    const operation=(s.operations||[]).find(o=>o.id===p.operationId);
    if(p.status==='traveling'&&p.arrival<=now){
      if(atWar(s,p.homeFaction,p.hostFaction)){p.status='recalled';p.returnAt=now+2}
      else{p.status=p.kind==='envoy'?'active_mission':'trading';person.location=home(s,p.hostFaction)}
      p.history.push({status:p.status,year:s.year,month:s.month,hostFaction:p.hostFaction});
    }
    if(['active_mission','trading'].includes(p.status)&&operation&&operation.status!=='pending'&&operation.status!=='awaiting_decision'){
      p.status='returning';p.returnAt=now+Math.max(1,Math.ceil((operation.duration||3)/2));
      p.history.push({status:'returning',year:s.year,month:s.month});
    }
    if(['recalled','ordered_depart','returning'].includes(p.status)&&p.returnAt!==null&&p.returnAt<=now){
      p.status='at_home';p.hostFaction=null;p.operationId=null;p.safeConduct=false;p.returnAt=null;person.location=home(s,p.homeFaction);
      p.history.push({status:'at_home',year:s.year,month:s.month});
    }
  }
}
function incident(s,p,policy,eventId){
  const person=s.world.characters[p.characterId],host=p.hostFaction,origin=p.homeFaction,key=pair(host,origin);
  if(policy==='safe_departure'){
    p.status='ordered_depart';p.safeConduct=true;p.returnAt=date(s)+2;
  }else if(policy==='detain'){
    p.status='temporarily_detained';
    s.relations[key]=Math.max(-100,(s.relations[key]||0)-12);
    s.diplomaticCredibility||={};s.diplomaticCredibility[host]=Math.max(0,(s.diplomaticCredibility[host]??100)-8);
  }else{
    p.status='deceased';person.alive=false;person.health='deceased';person.location=null;
    s.relations[key]=Math.max(-100,(s.relations[key]||0)-40);
    s.diplomaticCredibility||={};s.diplomaticCredibility[host]=Math.max(0,(s.diplomaticCredibility[host]??100)-35);
    s.factions[host].stability=Math.max(0,s.factions[host].stability-5);
    s.mail.accessRestrictions[host]=Math.max(s.mail.accessRestrictions[host]??-Infinity,date(s)+36);
    for(const id of Object.keys(s.factions).filter(id=>id!==host&&id!==origin&&id!=='rebels')){
      const k=pair(host,id);s.relations[k]=Math.max(-100,(s.relations[k]||0)-5);
    }
  }
  p.history.push({status:p.status,year:s.year,month:s.month,eventId});
  s.mail.personnelIncidents.push({eventId,characterId:p.characterId,kind:'envoy',policy,host,origin,year:s.year,month:s.month});
  if(host===s.player||origin===s.player){
    const who=CHARACTER_CATALOG[p.characterId]?.name||[p.characterId,p.characterId];
    const words=policy==='safe_departure'?[info=>`${info} received safe conduct to depart.`,info=>`${info}获准安全离境。`]
      :policy==='detain'?[info=>`${info} was temporarily detained in a diplomatic incident.`,info=>`${info}在外交事件中被暂时扣留。`]
      :[info=>`${info} was killed under an explicitly chosen harsh envoy policy.`,info=>`${info}因明确选择的严厉使者政策而遇害。`];
    s.log.unshift({year:s.year,month:s.month,en:words[0](who[0]),zh:words[1](who[1]),characterId:p.characterId,other:host===s.player?origin:host});
    s.log=s.log.slice(0,80);
  }
}
export function applyWarPersonnel(s,war,eventId){
  const people=initializePersonnel(s);
  for(const p of people){
    if(!war.includes(p.homeFaction)||!war.includes(p.hostFaction))continue;
    const host=p.hostFaction,policy=wartimePolicy(s,host),person=s.world.characters[p.characterId];
    if(!person?.alive)continue;
    if(p.status==='traveling'){
      p.status='recalled';p.returnAt=date(s)+2;p.history.push({status:'recalled',year:s.year,month:s.month,eventId});
      continue;
    }
    if(!statusAtHost.has(p.status))continue;
    if(!s.regions.some(r=>r.id===person.location&&r.owner===host))continue;
    const op=(s.operations||[]).find(o=>o.id===p.operationId);
    if(op?.status==='pending'){op.status='recalled';op.resolvedYear=s.year;op.resolvedMonth=s.month}
    if(p.kind==='envoy'){
      if(p.safeConduct)continue;
      incident(s,p,policy.envoys,eventId);
    }else{
      const choice=policy.merchants;
      if(choice==='depart'){p.status='ordered_depart';p.returnAt=date(s)+2}
      else if(choice==='freeze'){p.status='assets_frozen';p.assetsFrozen=true}
      else p.status='restricted';
      p.history.push({status:p.status,year:s.year,month:s.month,eventId});
      s.mail.personnelIncidents.push({eventId,characterId:p.characterId,kind:'merchant',policy:choice,host,origin:p.homeFaction,year:s.year,month:s.month});
    }
  }
  for(const t of s.agreements||[]){
    if(t.status!=='active'||!t.parties?.includes(war[0])||!t.parties?.includes(war[1]))continue;
    t.status='ended_by_war';t.ended={year:s.year,month:s.month};
    if(t.type==='trade')s.mail.tradeSuspensions.push({agreementId:t.id,eventId,year:s.year,month:s.month});
  }
}

export function reconcilePeacePersonnel(s){
  const now=date(s);
  for(const p of initializePersonnel(s)){
    if(!p.hostFaction||atWar(s,p.homeFaction,p.hostFaction))continue;
    if(!['temporarily_detained','restricted','assets_frozen'].includes(p.status))continue;
    p.status='returning';p.returnAt=now+2;p.assetsFrozen=false;
    p.history.push({status:'returning',year:s.year,month:s.month,reason:'peace'});
  }
}
