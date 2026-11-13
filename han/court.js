// THE HAN IMPERIAL COURT 大汉朝廷 — offices, factions, imperial authority,
// edicts that take time and support, audits based on evidence, the Mandate
// as a political judgement, disasters and their interpretation, succession.
//
// Hidden attributes (corruption, true ambition) are never shown to the player
// without evidence: knowledge lives in s.court.knowledge and is only filled
// by audits, long service in office, or exposed schemes.
import {OFFICES,COURT_FACTIONS,REGIONS as STATIC_REGIONS} from './data.js?v=han-1';
import {crown,eligibility,isLiuClan,claimStrength,recognition,establishRegency,deposeAndReplace,seizeThrone,addClaimant,yearsBetween,enforceDynasticInvariants} from './dynasty.js?v=han-1';
import {roll,clamp,log,name} from './util.js?v=han-1';
import {PERSON} from './people.js?v=han-1';

const alive=(s,id)=>!!s.persons[id]?.alive;
export const COURT_PROFILE_IDS=['shi-gao','xiao-wangzhi','hong-gong','yu-dingguo','chen-wannian','liu-xiang','zhou-kan','shi-xian','feng-fengshi','gan-yanshou','chen-tang','feng-liao'];
export function ensureCourtCareers(s,{opening=false}={}){
 for(const id of COURT_PROFILE_IDS){
  const person=s.persons?.[id];if(!person)continue;
  const canonical=PERSON[id],matches=canonical&&person.birth===canonical.birth&&person.name?.[0]===canonical.name[0];
  if(Array.isArray(person.career)){
   if(!matches)person.career=person.career.filter(entry=>entry.kind!=='opening_service');
   continue;
  }
  person.career=[];
  if(matches&&Number.isInteger(s.stats?.startMonth)){
   const start=s.stats.startMonth,year=Math.floor((start-1)/12),month=start-year*12;
   const office=opening&&s.court?.offices?.[person.office]===id?OFFICES[person.office]:null;
   const text=office?[`At campaign opening, %NAME% serves as ${office.name[0]}.`,`战役开始时，%NAME%任${office.name[1]}。`]:['At campaign opening, %NAME% is in Han service.','战役开始时，%NAME%在汉廷任事。'];
   person.career.push({year,month,kind:'opening_service',who:id,text});
  }
  for(const entry of s.log||[])if(entry.who===id||entry.who2===id)person.career.push({...entry});
 }
}
export const age=(s,id)=>yearsBetween(s.persons[id]?.birth??s.year,s.year);
const officials=s=>Object.values(s.persons).filter(p=>p.alive&&p.faction===govFaction(s)&&['official','general','consort','dowager','envoy'].includes(p.role));
export const govFaction=s=>'han';

export function initCourt(s,offices){
 s.court={offices:{...offices},factions:Object.fromEntries(Object.keys(COURT_FACTIONS).map(k=>[k,{influence:20}])),control:{},favor:{},knowledge:{},edicts:[],audits:[],enmity:{},pendingDisaster:null,debates:[],nextId:1,schemes:[],implemented:[]};
 for(const [office,id] of Object.entries(offices))if(id&&s.persons[id]){s.persons[id].office=office;s.persons[id].officeSince??={year:s.year,month:s.month}}
 recomputeInfluence(s);ensureCourtCareers(s,{opening:true});return s.court;
}

// ---------- authority & capacity ----------
export function emperorAuthority(s){
 const e=s.throne.orthodox;if(!e)return 0;const p=s.persons[e];
 let a=25+(p.competence||40)*0.5+(s.court.favorBase||0);
 if(age(s,e)<15)a-=30;if(s.throne.regent&&s.throne.regent!==e)a-=25;if(s.throne.puppet===e)a-=20;
 const dominant=Math.max(...Object.values(s.court.control));if(dominant>55)a-=(dominant-55)*0.6;
 return Math.round(clamp(a));
}
export function adminCapacity(s){
 const c=s.court.offices.chengxiang,f=s.court.offices.dasinong;
 const comp=id=>id&&alive(s,id)?(s.persons[id].competence||40):25;
 const corr=Object.values(s.court.offices).filter(Boolean).reduce((a,id)=>a+(s.persons[id]?.corruption||0),0)/Math.max(1,Object.values(s.court.offices).filter(Boolean).length);
 return Math.round(clamp(20+comp(c)*0.4+comp(f)*0.25+(s.court.reformLevel||0)*4-corr*0.25+emperorAuthority(s)*0.1));
}
export function recomputeInfluence(s){
 const base=Object.fromEntries(Object.keys(COURT_FACTIONS).map(k=>[k,10]));
 for(const [office,id] of Object.entries(s.court.offices)){if(!id||!alive(s,id))continue;const p=s.persons[id];if(p.courtFaction)base[p.courtFaction]+=OFFICES[office].rank*1.5}
 for(const p of officials(s))if(p.courtFaction)base[p.courtFaction]+=1+(s.court.favor[p.id]||0)*0.08;
 for(const k of Object.keys(base))s.court.factions[k].influence=Math.round(s.court.factions[k].influence*0.6+base[k]*0.4);
 // personal control of government: offices held, faction strength, favor
 const total=Object.values(s.court.factions).reduce((a,f)=>a+f.influence,0)||1;
 s.court.control={};
 for(const p of officials(s)){
  let c=0;if(p.office)c+=OFFICES[p.office].rank*3;if(p.office==='dasima')c+=12;
  if(p.courtFaction)c+=s.court.factions[p.courtFaction].influence/total*40;
  c+=(s.court.favor[p.id]||0)*0.2;if(s.throne.regent===p.id)c+=20;
  s.court.control[p.id]=Math.round(clamp(c))}
}

// ---------- appointments ----------
export function appoint(s,office,personId,{actor='emperor',logFn=null}={}){
 const o=OFFICES[office],p=s.persons[personId];if(!o||!p||!p.alive)return {ok:false,reason:'invalid'};
 if(p.faction!==govFaction(s))return {ok:false,reason:'foreign'};
 if(o.requiresLiu&&!isLiuClan(s,personId))return {ok:false,reason:'requires_liu_clan'};
 if(p.eunuch&&['chengxiang','yushi','dasima'].includes(office))return {ok:false,reason:'eunuch_bar'};
 if(s.court.offices[office]===personId&&p.office===office)return {ok:false,reason:'already'};
 if(p.office&&p.office!==office)s.court.offices[p.office]=null;
 const prev=s.court.offices[office];
 // the court reacts: the displaced official's faction resents the change
 if(prev&&prev!==personId&&alive(s,prev)){s.persons[prev].office=null;const pf=s.persons[prev].courtFaction;s.court.enmity[prev]=(s.court.enmity[prev]||0)+15;if(pf)s.court.factions[pf].influence=Math.max(5,s.court.factions[pf].influence-4);log(s,['%NAME% is replaced as '+o.name[0]+'.','%NAME%卸任'+o.name[1]+'。'],{who:prev,kind:'court'})}
 s.court.offices[office]=personId;p.office=office;s.court.favor[personId]=(s.court.favor[personId]||0)+10;p.officeSince={year:s.year,month:s.month};
 recomputeInfluence(s);
 log(s,['%NAME% appointed '+o.name[0]+'.','%NAME%任'+o.name[1]+'。'],{who:personId,kind:'court'});
 return {ok:true,displaced:prev||null};
}
export function dismiss(s,office){const id=s.court.offices[office];if(!id)return {ok:false};s.court.offices[office]=null;if(s.persons[id]){s.persons[id].office=null;s.court.enmity[id]=(s.court.enmity[id]||0)+20}recomputeInfluence(s);log(s,['%NAME% is dismissed as '+OFFICES[office].name[0]+'.','%NAME%被免去'+OFFICES[office].name[1]+'。'],{who:id,kind:'court'});return {ok:true,id}}
export const officeHolder=(s,office)=>{const id=s.court.offices[office];return id&&alive(s,id)?s.persons[id]:null};

// ---------- edicts: orders take time and need support ----------
export const EDICTS={
 tax_relief:{name:['Remit land tax','减免田租'],months:2,cost:{treasury:0},favours:['ru'],harms:['haoqiang'],effect:'tax_relief'},
 granary:{name:['Build ever-normal granaries','置常平仓'],months:5,cost:{treasury:60},favours:['ru'],harms:[],effect:'granary'},
 irrigation:{name:['Repair irrigation works','修治水利'],months:6,cost:{treasury:80,grain:20},favours:[],harms:['haoqiang'],effect:'irrigation'},
 frontier_levy:{name:['Levy for the frontier commands','征发戍边'],months:3,cost:{treasury:40},favours:['frontier'],harms:['ru'],effect:'frontier_levy'},
 appointment_reform:{name:['Reform recommendations for office','改革察举'],months:8,cost:{treasury:30},favours:['ru'],harms:['waiqi','huanguan'],effect:'appointment_reform'},
 curb_secretariat:{name:['Curb the Palace Secretariat','抑制中书'],months:4,cost:{},favours:['ru'],harms:['huanguan'],effect:'curb_secretariat'},
 salt_iron_review:{name:['Review salt and iron policy','议盐铁'],months:6,cost:{treasury:20},favours:['ru'],harms:['haoqiang'],effect:'salt_iron'},
 ritual_reform:{name:['Reform the imperial ancestral rites','议宗庙礼制'],months:6,cost:{treasury:30},favours:['ru'],harms:['waiqi'],effect:'ritual'}
};
export function edictSupport(s,type){
 const e=EDICTS[type];let sup=0,tot=0;
 for(const [k,f] of Object.entries(s.court.factions)){tot+=f.influence;sup+=f.influence*(e.favours.includes(k)?85:e.harms.includes(k)?15:50)}
 return Math.round(sup/Math.max(1,tot)*0.7+emperorAuthority(s)*0.3);
}
export function issueEdict(s,type,{region=null,owner='han'}={}){
 const e=EDICTS[type],f=s.factions[owner];if(!e)return {ok:false,reason:'unknown'};
 if(s.court.edicts.some(x=>x.type===type&&x.status==='implementing'))return {ok:false,reason:'already'};
 if((e.cost.treasury||0)>f.treasury||(e.cost.grain||0)>f.grain)return {ok:false,reason:'cost'};
 f.treasury-=e.cost.treasury||0;f.grain-=e.cost.grain||0;
 const support=edictSupport(s,type),cap=adminCapacity(s);
 const needed=Math.max(1,Math.round(e.months*(1.6-cap/100)));
 const ed={id:s.court.nextId++,type,region,support,needed,progress:0,status:'implementing',start:{year:s.year,month:s.month}};
 s.court.edicts.push(ed);log(s,['Edict issued: '+e.name[0]+'. Implementation needs court support ('+support+'%).','下诏：'+e.name[1]+'。推行需朝廷支持（'+support+'%）。'],{kind:'court'});
 return {ok:true,edict:ed};
}
function applyEdict(s,ed){
 const f=s.factions.han,regions=s.regions.filter(r=>r.owner==='han');
 const target=ed.region?s.regions.find(r=>r.id===ed.region):null;
 switch(EDICTS[ed.type].effect){
  case 'tax_relief':s.taxRelief=12;for(const r of regions)r.loyalty=clamp(r.loyalty+6);break;
  case 'granary':for(const r of (target?[target]:regions.filter(r=>r.grain>=7).slice(0,4)))r.granary=Math.min(3,(r.granary||0)+1);break;
  case 'irrigation':for(const r of (target?[target]:regions.filter(r=>r.river).slice(0,3)))r.irrigation=Math.min(3,(r.irrigation||0)+1);break;
  case 'frontier_levy':for(const r of regions.filter(r=>r.frontier))r.fort=Math.min(5,r.fort+1);f.manpower+=4000;break;
  case 'appointment_reform':s.court.reformLevel=(s.court.reformLevel||0)+1;break;
  case 'curb_secretariat':s.court.factions.huanguan.influence=Math.max(5,s.court.factions.huanguan.influence-12);break;
  case 'salt_iron':s.saltIron=(s.saltIron||0)+1;f.stability=clamp(f.stability+3);break;
  case 'ritual':s.mandateRitual=(s.mandateRitual||0)+4;break;
 }
 s.court.implemented.push({type:ed.type,year:s.year,month:s.month});
}
function advanceEdicts(s){
 for(const ed of s.court.edicts.filter(x=>x.status==='implementing')){
  ed.support=Math.round(ed.support*0.7+edictSupport(s,ed.type)*0.3);
  if(ed.support<30&&roll(s,'edict'+ed.id)<0.25){ed.status='stalled';log(s,['Officials obstruct the edict “'+EDICTS[ed.type].name[0]+'”; it stalls.','百官阻挠诏令“'+EDICTS[ed.type].name[1]+'”，推行停滞。'],{kind:'court'});continue}
  ed.progress+=ed.support>=50?1:0.5;
  if(ed.progress>=ed.needed){ed.status='done';applyEdict(s,ed);log(s,['Edict implemented: '+EDICTS[ed.type].name[0]+'.','诏令推行完毕：'+EDICTS[ed.type].name[1]+'。'],{kind:'court'})}
 }
}

// ---------- audits & corruption (evidence only) ----------
export function startAudit(s,targetId,{owner='han'}={}){
 const t=s.persons[targetId];if(!t||!t.alive||t.faction!==owner)return {ok:false,reason:'invalid'};
 if(s.court.audits.some(a=>a.target===targetId&&a.status==='open'))return {ok:false,reason:'already'};
 const cost=15;if(s.factions[owner].treasury<cost)return {ok:false,reason:'cost'};s.factions[owner].treasury-=cost;
 const a={id:s.court.nextId++,target:targetId,evidence:0,months:0,status:'open',interfered:false};s.court.audits.push(a);
 log(s,['An investigation of %NAME% begins.','开始稽查%NAME%。'],{who:targetId,kind:'audit'});return {ok:true,audit:a};
}
function advanceAudits(s){
 const inspector=officeHolder(s,'yushi');const skill=inspector?inspector.competence:30;
 for(const a of s.court.audits.filter(x=>x.status==='open')){
  const t=s.persons[a.target];if(!t?.alive){a.status='closed';continue}
  a.months++;
  const corr=t.corruption||0;
  // a powerful corrupt official interferes
  if(corr>40&&(s.court.control[t.id]||0)>40&&roll(s,'interfere'+a.id)<0.3){a.interfered=true;a.evidence=Math.max(0,a.evidence-10);log(s,['The investigation of %NAME% meets obstruction: witnesses withdraw.','稽查%NAME%受阻：证人翻供。'],{who:t.id,kind:'audit'})}
  a.evidence+=Math.round(skill/12+corr/8*(0.5+roll(s,'ev'+a.id)));
  if(a.months>=4){
   if(corr>=35&&a.evidence>=30){a.status='proven';const recovered=Math.round(corr*0.8);s.factions.han.treasury+=recovered;
    s.court.knowledge[t.id]={...(s.court.knowledge[t.id]||{}),corruption:'proven',evidence:a.evidence};t.corruption=Math.round(corr*0.4);
    if(t.courtFaction)s.court.factions[t.courtFaction].influence=Math.max(5,s.court.factions[t.courtFaction].influence-8);
    log(s,['Audit proves misconduct by %NAME%; '+recovered+' recovered.','稽查证实%NAME%贪渎，追回'+recovered+'。'],{who:t.id,kind:'audit'})}
   else{a.status='unfounded';s.court.knowledge[t.id]={...(s.court.knowledge[t.id]||{}),corruption:'no_evidence'};s.court.enmity[t.id]=(s.court.enmity[t.id]||0)+25;t.loyalty=clamp((t.loyalty||50)-15);
    if(t.courtFaction)s.court.factions[t.courtFaction].influence+=3;
    log(s,['The case against %NAME% is unfounded; he becomes an enemy of the accusers.','对%NAME%的指控查无实据，其人因此结怨。'],{who:t.id,kind:'audit'})}
  }
 }
}
// What the player may see about a person. Competence becomes known after a
// year in office; corruption and ambition only through evidence.
export function knownAttributes(s,id,viewer='han'){
 const p=s.persons[id];if(!p)return null;const k=s.court.knowledge[id]||{};
 const served=p.officeSince?(s.year*12+s.month)-(p.officeSince.year*12+p.officeSince.month):0;
 return {competence:served>=12||p.historicalReputation?p.competence:null,corruption:k.corruption||'unknown',ambition:k.ambition||(p.scheme?'exposed':'unknown')};
}

// ---------- the Mandate (a political judgement, not a supernatural meter) ----------
export function computeMandate(s){
 const f=s.factions.han,hanRegions=s.regions.filter(r=>r.owner==='han');
 const avgLoyalty=hanRegions.reduce((a,r)=>a+r.loyalty,0)/Math.max(1,hanRegions.length);
 const c={
  administration:adminCapacity(s)*0.18,
  succession:(s.throne.orthodox?(s.throne.heir?10:6):0)-(s.throne.claimants.length*4),
  court:emperorAuthority(s)*0.08,
  order:(avgLoyalty-50)*0.3,
  grain:f.grain>0?Math.min(8,f.grain/60):-10,
  taxation:s.taxRelief>0?3:s.taxLevel==='high'?-5:0,
  military:clamp(s.militaryRecord||0,-10,10),
  disasters:-Math.min(12,(s.recentDisasters||0)*2.5),
  corruption:-Object.values(s.court.offices).filter(Boolean).reduce((a,id)=>a+(s.persons[id]?.corruption||0),0)/60,
  ritual:Math.min(8,s.mandateRitual||0),
  omens:(s.omenBalance||0)
 };
 const value=Math.round(clamp(40+Object.values(c).reduce((a,b)=>a+b,0)));
 s.mandate={value,components:Object.fromEntries(Object.entries(c).map(([k,v])=>[k,Math.round(v*10)/10]))};
 return s.mandate;
}

// ---------- disasters and their interpretation ----------
export const DISASTERS={
 flood:{name:['Yellow River flood','黄河决溢'],where:r=>r.yellow,grain:-4,loyalty:-8,pop:-2},
 drought:{name:['Drought','旱灾'],where:r=>['plain','hills'].includes(r.terrain),grain:-3,loyalty:-5,pop:-1},
 locusts:{name:['Locusts','蝗灾'],where:r=>r.terrain==='plain',grain:-3,loyalty:-4,pop:0},
 earthquake:{name:['Earthquake','地震'],where:r=>['hills','mountain'].includes(r.terrain)||r.id==='changan',grain:-1,loyalty:-4,pop:-1},
 frontier_supply:{name:['Frontier supply crisis','边郡粮运不继'],where:r=>r.frontier,grain:-2,loyalty:-6,pop:0}
};
const INTERPRETERS={
 ru:{stance:'reform',text:['Classicists read the calamity as Heaven’s warning against extravagance and urge reform.','儒臣以灾异为天谴，请节俭改制。']},
 huanguan:{stance:'blame',text:['The Secretariat blames the classicist ministers for misgovernment.','中书归咎于儒臣施政失当。']},
 waiqi:{stance:'blame_chancellor',text:['Consort relatives say precedent demands the chancellor’s dismissal.','外戚言依故事当免丞相。']},
 frontier:{stance:'relief',text:['The frontier generals ask that relief not strip the garrisons.','边将请赈灾勿夺戍粮。']},
 haoqiang:{stance:'relief',text:['Magnates offer grain — at a price in local influence.','豪强愿出粮赈济，但求地方权柄。']}
};
function rollDisasters(s){
 for(const r of s.regions.filter(r=>r.owner==='han')){
  for(const [k,d] of Object.entries(DISASTERS)){
   if(!d.where(r))continue;const chance=k==='flood'?0.004*(r.irrigation?0.5:1):0.002;
   if(roll(s,'dis'+k+r.id)>=chance)continue;
   r.grain=Math.max(1,r.grain+d.grain);r.loyalty=clamp(r.loyalty+d.loyalty);r.pop=Math.max(1,r.pop+d.pop);r.disaster={type:k,months:6};
   s.recentDisasters=(s.recentDisasters||0)+1;
   const readings=Object.entries(INTERPRETERS).filter(([f])=>s.court.factions[f].influence>12).map(([f,v])=>({faction:f,...v}));
   s.court.pendingDisaster={id:s.court.nextId++,type:k,region:r.id,readings,deadline:2};
   log(s,[d.name[0]+' strikes %REGION%. The court debates its meaning.',d.name[1]+'袭%REGION%，朝议纷纷。'],{region:r.id,kind:'disaster'});
   return;
  }
 }
}
export const DISASTER_RESPONSES={
 relief:{name:['Open the granaries','开仓赈济'],cost:{grain:40}},
 self_reproach:{name:['Edict of self-reproach and remission','下罪己诏并减租'],cost:{treasury:20}},
 dismiss_chancellor:{name:['Dismiss the chancellor (precedent)','依故事免丞相'],cost:{}},
 blame_faction:{name:['Accept the blame placed on a faction','归咎于某派'],cost:{}},
 magnates:{name:['Accept the magnates’ grain','受豪强出粮'],cost:{}}
};
export function respondToDisaster(s,response,{faction=null}={}){
 const d=s.court.pendingDisaster;if(!d)return {ok:false,reason:'none'};const opt=DISASTER_RESPONSES[response];if(!opt)return {ok:false,reason:'unknown'};
 const blamed=response==='blame_faction'?(faction??((d.readings||[]).some(x=>x.stance==='blame')?'ru':'huanguan')):null;
 if(blamed!==null&&!Object.hasOwn(s.court.factions,blamed))return {ok:false,reason:'invalid_faction'};
 const f=s.factions.han;if((opt.cost.grain||0)>f.grain||(opt.cost.treasury||0)>f.treasury)return {ok:false,reason:'cost'};
 f.grain-=opt.cost.grain||0;f.treasury-=opt.cost.treasury||0;const r=s.regions.find(x=>x.id===d.region);
 const F=s.court.factions;
 switch(response){
  case 'relief':r.loyalty=clamp(r.loyalty+10);r.pop+=1;break;
  case 'self_reproach':s.omenBalance=(s.omenBalance||0)+2;s.taxRelief=Math.max(s.taxRelief||0,6);F.ru.influence+=4;r.loyalty=clamp(r.loyalty+5);break;
  case 'dismiss_chancellor':{const c=s.court.offices.chengxiang;if(c){dismiss(s,'chengxiang');s.omenBalance=(s.omenBalance||0)+1;F.waiqi.influence+=4}break}
  case 'blame_faction':{F[blamed].influence=Math.max(5,F[blamed].influence-10);const blamer=blamed==='ru'?'huanguan':'ru';F[blamer].influence+=6;break}
  case 'magnates':r.loyalty=clamp(r.loyalty+6);F.haoqiang.influence+=8;s.court.reformLevel=Math.max(0,(s.court.reformLevel||0)-0.5);break;
 }
 log(s,['Response to the calamity: '+opt.name[0]+'.','应对灾异：'+opt.name[1]+'。'],{kind:'disaster'});
 s.court.pendingDisaster=null;recomputeInfluence(s);return {ok:true};
}

// ---------- unrest: reform or rebellion ----------
function unrest(s){
 for(const r of s.regions.filter(r=>r.owner==='han')){
  const hungry=s.factions.han.grain<0||r.disaster;
  if(r.loyalty<30&&hungry){
   r.unrest=(r.unrest||0)+1;
   if(r.unrest===2){ // the court must answer: reform or force
    s.court.debates.push({id:s.court.nextId++,kind:'unrest',region:r.id,options:['reform','suppress'],deadline:2});
    log(s,['Unrest in %REGION%: memorials demand reform; generals offer force.','%REGION%民变将起：奏章请改制，将领请镇压。'],{region:r.id,kind:'unrest'})}
   if(r.unrest>=5&&s.mandate.value<40){spawnRebellion(s,r);r.unrest=0}
  }else r.unrest=Math.max(0,(r.unrest||0)-1);
 }
}
export const DEBATE_NAMES={unrest:['Unrest: reform or suppression','民变：宽政或镇压'],court_reform:['Court reform proposal','朝政改革之议'],steppe_policy:['Long-term steppe policy','长久御边之策'],western_garrison:['Western garrisons and oasis autonomy','西域屯戍与诸国自主']};
export const DEBATE_OPTIONS={reform:['Reform','行宽政'],suppress:['Suppress','镇压'],enact:['Enact','施行'],shelve:['Shelve','搁置'],accommodation:['Accommodation','怀柔'],pressure:['Pressure','施压'],reassure:['Reassure the oasis rulers','安抚诸国'],press:['Press the Protectorate’s demands','坚持都护之令']};
export function answerDebate(s,id,choice){
 const d=s.court.debates.find(x=>x.id===id);if(!d||!d.options.includes(choice))return {ok:false};const r=s.regions.find(x=>x.id===d.region);
 if(d.kind!=='unrest'){
  const rel=(a,b,v)=>{const k=[a,b].sort().join(':');s.relations[k]=clamp((s.relations[k]||0)+v,-100,100)};
  if(choice==='enact'){const sup=edictSupport(s,'appointment_reform');if(sup>=45){s.court.reformLevel=(s.court.reformLevel||0)+1;log(s,['The court accepts the reform.','朝议通过改革。'],{kind:'court'})}else{s.court.factions.ru.influence=Math.max(5,s.court.factions.ru.influence-4);log(s,['The reform fails in court debate ('+sup+'% support).','改革在朝议中失败（支持'+sup+'%）。'],{kind:'court'})}}
  if(choice==='accommodation'){rel('han','huhanye',10);s.factions.han.treasury-=20}
  if(choice==='pressure'){s.court.factions.frontier.influence+=4;rel('han','zhizhi',-10);rel('han','huhanye',-4)}
  if(choice==='reassure'||choice==='press')for(const st of Object.values(s.protectorate.oasis)){if(choice==='reassure'){st.concern=clamp(st.concern-15);st.han=clamp(st.han+2)}else{st.concern=clamp(st.concern+5);st.han=clamp(st.han-4);st.xiongnu=clamp(st.xiongnu+3)}}
  s.court.debates=s.court.debates.filter(x=>x.id!==id);return {ok:true};
 }
 if(choice==='reform'){r.loyalty=clamp(r.loyalty+15);r.unrest=0;s.court.factions.ru.influence+=4;s.taxRelief=Math.max(s.taxRelief||0,6);log(s,['Reform granted in %REGION%: rents remitted, officials replaced.','%REGION%行宽政：减租易吏。'],{region:r.id,kind:'unrest'})}
 else{r.loyalty=clamp(r.loyalty-5);r.unrest=Math.max(0,r.unrest-2);s.court.factions.frontier.influence+=3;s.militaryRecord=(s.militaryRecord||0)-1;log(s,['Troops suppress the unrest in %REGION%; resentment remains.','发兵镇压%REGION%，怨气未消。'],{region:r.id,kind:'unrest'})}
 s.court.debates=s.court.debates.filter(x=>x.id!==id);return {ok:true};
}
function spawnRebellion(s,r){
 s.factions.rebels||={id:'rebels',treasury:0,grain:20,manpower:0,horses:0,stability:30};
 r.owner='rebels';r.loyalty=40;s.armies.push({id:`a${s.nextArmy=(s.nextArmy||100)+1}`,owner:'rebels',region:r.id,men:6000,morale:55,training:10,supply:80,template:{id:'rebels',name:['Rebel bands','起事民众'],mix:{caiguan:100}},commander:null,move:null});
 s.wars.push(['han','rebels']);log(s,['Rebellion breaks out in %REGION%.','%REGION%爆发民变。'],{region:r.id,kind:'unrest'});
}

// ---------- ambitions: officials act on their own ----------
export function advanceAmbitions(s){
 recomputeInfluence(s);
 const emperor=s.throne.orthodox;const authority=emperorAuthority(s);
 for(const p of officials(s)){
  const control=s.court.control[p.id]||0,amb=p.ambition||30,loy=p.loyalty??60;
  // seek office
  if(!p.office&&amb>50&&roll(s,'seek'+p.id)<0.05){const vacant=Object.keys(OFFICES).find(o=>!s.court.offices[o]&&!(OFFICES[o].requiresLiu&&!isLiuClan(s,p.id)));if(vacant)s.court.schemes.push({who:p.id,kind:'seek_office',office:vacant,month:s.year*12+s.month})}
  // undermine a rival faction (opposing the emperor is not treason)
  if(amb>60&&roll(s,'rival'+p.id)<0.04){const rival=Object.entries(s.court.factions).filter(([k])=>k!==p.courtFaction).sort((a,b)=>b[1].influence-a[1].influence)[0];if(rival){rival[1].influence=Math.max(5,rival[1].influence-3);if(p.courtFaction)s.court.factions[p.courtFaction].influence+=2}}
  // the Ambitionist's choice: a powerful non-Liu prefers to control a Liu emperor
  if(!isLiuClan(s,p.id)&&control>=55&&amb>=75&&emperor){
   const options=ambitionOptions(s,p.id).filter(o=>!(o.kind==='regency'&&s.throne.regent===p.id)&&!(o.kind==='puppet'&&s.throne.puppet&&s.throne.puppet===s.throne.orthodox));const best=options[0];
   p.lastAmbition=best.kind;
   if(best.kind==='regency'&&!s.throne.regent&&roll(s,'reg'+p.id)<0.25)establishRegency(s,p.id,{log:(t,m)=>log(s,t,{...m,kind:'throne'})});
   else if(best.kind==='puppet'&&roll(s,'pup'+p.id)<0.05){const pliant=pliantLiu(s,p.id);if(pliant)deposeAndReplace(s,p.id,pliant,{log:(t,m)=>log(s,t,{...m,kind:'throne'})})}
   else if(best.kind==='usurp'&&roll(s,'usp'+p.id)<0.15){const r=seizeThrone(s,p.id,{log:(t,m)=>log(s,t,{...m,kind:'throne'})});if(r.ok)onUsurpation(s,p.id,r.displaced)}
  }
 }
}
export function ambitionOptions(s,id){
 const p=s.persons[id],control=s.court.control[id]||0,amb=p.ambition||30,mandate=s.mandate?.value??50;
 const loyalism=Object.values(s.court.factions).reduce((a,f)=>a+f.influence,0);
 const opts=[
  {kind:'serve',score:(p.loyalty||50)-amb*0.3},
  {kind:'regency',score:control*0.6+amb*0.3+(s.throne.orthodox&&age(s,s.throne.orthodox)<15?25:0)},
  {kind:'puppet',score:control*0.55+amb*0.35-10-emperorAuthority(s)*0.3},
  {kind:'reform',score:(p.competence||50)*0.4+control*0.2},
  {kind:'usurp',score:amb>=85&&control>=70?control*0.5+amb*0.3-(mandate-30)*0.8-loyalism*0.05-20:-100}
 ];
 return opts.sort((a,b)=>b.score-a.score);
}
function pliantLiu(s,actor){
 const cands=Object.values(s.persons).filter(p=>p.alive&&p.id!==s.throne.orthodox&&eligibility(s,p.id).ok);
 return cands.sort((a,b)=>(a.ambition||50)-(b.ambition||50)+age(s,a.id)*0.5-age(s,b.id)*0.5)[0]?.id||null;
}
// After usurpation: loyalists form a rival government around a Liu claimant.
export function onUsurpation(s,usurper,displaced){
 const claimant=displaced&&alive(s,displaced)?displaced:bestClaimant(s);
 if(!claimant)return;
 addClaimant(s,claimant,{loyalist:true});
 const fief=s.persons[claimant].fief;
 const regions=s.regions.filter(r=>r.owner==='han'&&(r.id===fief||r.kind==='kingdom')).slice(0,3);
 if(!regions.length)return;
 s.factions.han_loyalist={id:'han_loyalist',treasury:80,grain:120,manpower:12000,horses:2000,stability:55,claimant};
 for(const r of regions){r.owner='han_loyalist';r.loyalty=70}
 s.armies.push({id:`a${s.nextArmy=(s.nextArmy||100)+1}`,owner:'han_loyalist',region:regions[0].id,men:12000,morale:70,training:30,supply:100,template:{id:'field',name:['Loyalist army','勤王军'],mix:{caiguan:40,nu:30,qishi:20,houwang:5,zhuanshu:5}},commander:null,move:null});
 s.persons[claimant].faction='han_loyalist';
 s.wars.push(['han','han_loyalist']);
 log(s,['Han loyalists rally to %NAME%.','汉室忠臣拥戴%NAME%勤王。'],{who:claimant,kind:'throne'});
}
export function bestClaimant(s){
 const c=Object.values(s.persons).filter(p=>p.alive&&eligibility(s,p.id).ok).sort((a,b)=>claimStrength(s,b.id)-claimStrength(s,a.id));return c[0]?.id||null;
}

// ---------- succession ----------
function factionScore(s,faction,id){
 const p=s.persons[id],a=age(s,id);let v=claimStrength(s,id);
 if(faction==='waiqi')v+=s.persons[p.mother]?.courtFaction==='waiqi'||s.persons[p.mother]?.empress?25:0;
 if(faction==='ru')v+=s.throne.heir===id?20:0;
 if(faction==='huanguan')v+=a<16?15:-5;
 if(faction==='frontier')v+=a>=20?10:-10;
 if(faction==='haoqiang')v+=p.fief?10:0;
 return v;
}
export function computeSupport(s,candidates){
 s.throne.support||={};
 for(const f of Object.keys(s.court.factions)){
  const ranked=candidates.map(id=>[id,factionScore(s,f,id)]).sort((a,b)=>b[1]-a[1]);
  ranked.forEach(([id],i)=>{s.throne.support[id]||={};s.throne.support[id][f]=i===0?80:i===1?35:10});
 }
}
export function resolveSuccession(s){
 const candidates=Object.values(s.persons).filter(p=>p.alive&&eligibility(s,p.id).ok).map(p=>p.id);
 if(!candidates.length){log(s,['No eligible Liu remains; the throne is vacant.','无合格刘氏宗室，皇位虚悬。'],{kind:'throne'});return {ok:false,reason:'none'}}
 computeSupport(s,candidates);
 const ranked=candidates.map(id=>[id,recognition(s,id)]).sort((a,b)=>b[1]-a[1]);
 const heir=s.throne.heir&&candidates.includes(s.throne.heir)?s.throne.heir:null;
 const lg=(t,m)=>log(s,t,{...m,kind:'throne'});
 if(heir&&recognition(s,heir)>=35&&(ranked[0][0]===heir||ranked[0][1]-recognition(s,heir)<25))return {ok:true,...crown(s,heir,'accession',{log:lg}),via:'heir'};
 if(ranked[0][1]>=50&&(ranked[1]?.[1]||0)<45)return {ok:true,...crown(s,ranked[0][0],'court_selection',{log:lg}),via:'court'};
 // contested: two Liu princes dispute the throne
 s.throne.claimants=ranked.slice(0,2).map(([id])=>({id,since:{year:s.year,month:s.month}}));s.throne.paralysis=3;
 log(s,['The succession is disputed between %NAME% and %NAME2%. Government stalls.','%NAME%与%NAME2%争位，朝政停摆。'],{who:ranked[0][0],who2:ranked[1]?.[0],kind:'throne'});
 return {ok:true,disputed:true,claimants:s.throne.claimants.map(c=>c.id)};
}
export function advanceDispute(s){
 if(s.throne.orthodox||!s.throne.claimants.length||s.throne.dynasty?.orthodox===false)return;
 s.throne.paralysis=(s.throne.paralysis||0)-1;
 const [a,b]=s.throne.claimants;
 // court support drifts; a decisive lead settles the dispute without war
 if(!b){crown(s,a.id,'court_selection',{log:(t,m)=>log(s,t,{...m,kind:'throne'}),force:recognition(s,a.id)>=30});return}
 const ra=recognition(s,a.id),rb=recognition(s,b.id);
 if(Math.abs(ra-rb)>=25){const w=ra>rb?a.id:b.id;s.throne.claimants=s.throne.claimants.filter(c=>c.id===w);crown(s,w,'court_selection',{log:(t,m)=>log(s,t,{...m,kind:'throne'}),force:true});return}
 if(s.throne.paralysis<=0&&!s.factions.rival_court){startDynasticWar(s,ra>=rb?a.id:b.id,ra>=rb?b.id:a.id)}
}
export function startDynasticWar(s,capitalClaimant,rival){
 const fief=s.persons[rival].fief;
 const regions=s.regions.filter(r=>r.owner==='han'&&(r.id===fief||(r.kind==='kingdom'&&r.loyalty<70))).slice(0,4);
 if(!regions.length)regions.push(...s.regions.filter(r=>r.owner==='han'&&r.kind==='kingdom').slice(0,2));
 s.factions.rival_court={id:'rival_court',treasury:60,grain:100,manpower:10000,horses:1500,stability:50,claimant:rival,name:[`Court of ${s.persons[rival].name[0]}`,`${s.persons[rival].name[1]}之朝`]};
 for(const r of regions)r.owner='rival_court';s.persons[rival].faction='rival_court';
 s.armies.push({id:`a${s.nextArmy=(s.nextArmy||100)+1}`,owner:'rival_court',region:regions[0].id,men:14000,morale:65,training:30,supply:100,template:{id:'field',name:['Princely army','王国兵'],mix:{caiguan:40,nu:30,qishi:20,houwang:5,zhuanshu:5}},commander:null,move:null});
 s.wars.push(['han','rival_court']);s.throne.civilWar={a:capitalClaimant,b:rival,start:{year:s.year,month:s.month}};
 log(s,['Dynastic civil war: %NAME% holds the capital, %NAME2% raises the kingdoms.','宗室内战：%NAME%据京师，%NAME2%起兵诸侯国。'],{who:capitalClaimant,who2:rival,kind:'throne'});
}
// Called monthly; settles civil wars and restorations through crown().
export function settleThroneWars(s){
 const lg=(t,m)=>log(s,t,{...m,kind:'throne'});
 for(const side of ['rival_court','han_loyalist']){
  const f=s.factions[side];if(!f||f.defeated)continue;
  const holds=s.regions.some(r=>r.owner===side),armies=s.armies.some(a=>a.owner===side&&a.men>0);
  const capital=s.regions.find(r=>r.id==='changan').owner;
  if(side==='rival_court'&&s.throne.civilWar){
   const {a,b}=s.throne.civilWar;
   if(!holds&&!armies){f.defeated=true;for(const fac of Object.keys(s.court.factions)){s.throne.support[a]||={};s.throne.support[a][fac]=Math.max(s.throne.support[a][fac]||0,60)}if(alive(s,b))s.persons[b].faction='han';s.persons[b]&&(s.persons[b].deposed=true);s.throne.claimants=s.throne.claimants.filter(c=>c.id===a);crown(s,a,'civil_war_settlement',{log:lg});s.throne.civilWar=null;s.wars=s.wars.filter(w=>!w.includes('rival_court'))}
   else if(capital==='rival_court'){for(const fac of Object.keys(s.court.factions)){s.throne.support[b]||={};s.throne.support[b][fac]=Math.max(s.throne.support[b][fac]||0,55)}
    // the capital changes hands: the rival may be recognised, but only through crown()
    const r=crown(s,b,'civil_war_settlement',{log:lg});if(r.ok){for(const x of s.regions.filter(x=>x.owner==='rival_court'))x.owner='han';for(const x of s.armies.filter(x=>x.owner==='rival_court'))x.owner='han';s.persons[b].faction='han';f.defeated=true;s.throne.civilWar=null;s.wars=s.wars.filter(w=>!w.includes('rival_court'))}}
  }
  if(side==='han_loyalist'){
   const claimant=f.claimant;
   if(capital==='han_loyalist'&&alive(s,claimant)){
    for(const fac of Object.keys(s.court.factions)){s.throne.support[claimant]||={};s.throne.support[claimant][fac]=Math.max(s.throne.support[claimant][fac]||0,60)}
    const usurper=s.throne.occupant;
    const r=crown(s,claimant,'restoration',{log:lg});
    if(r.ok){for(const x of s.regions.filter(x=>x.owner==='han'||x.owner==='han_loyalist'))x.owner='han';for(const x of s.armies.filter(x=>x.owner==='han_loyalist'))x.owner='han';s.persons[claimant].faction='han';
     if(usurper&&s.persons[usurper]){s.persons[usurper].alive=false;s.persons[usurper].death=s.year}
     f.defeated=true;s.wars=s.wars.filter(w=>!w.includes('han_loyalist'));if(s.player==='han_loyalist')s.player='han';
     log(s,['The Han is restored.','汉室再兴。'],{kind:'throne'})}
   }else if(!holds&&!armies){f.defeated=true;s.wars=s.wars.filter(w=>!w.includes('han_loyalist'))}
  }
 }
}

export function advanceCourt(s){
 advanceEdicts(s);advanceAudits(s);advanceAmbitions(s);rollDisasters(s);unrest(s);
 if(s.court.pendingDisaster&&--s.court.pendingDisaster.deadline<=0){const isAI=s.player!=='han';respondToDisaster(s,isAI||s.factions.han.grain>=40?'relief':'self_reproach')}
 for(const d of [...s.court.debates]){if(d.created===undefined){d.created=s.year*12+s.month;continue}if(--d.deadline<=0)answerDebate(s,d.id,d.kind==='unrest'?(s.mandate.value>45?'reform':'suppress'):d.options[0])}
 for(const r of s.regions)if(r.disaster&&--r.disaster.months<=0)delete r.disaster;
 s.recentDisasters=Math.max(0,(s.recentDisasters||0)*0.9-0.02);
 if(s.taxRelief>0)s.taxRelief--;
 advanceDispute(s);settleThroneWars(s);
 enforceDynasticInvariants(s,{log:(t,m)=>log(s,t,{...m,kind:'throne'})});
 computeMandate(s);
}
export {STATIC_REGIONS};
