import {CHARACTER_CATALOG,initializeWorld,assignSuccession,ageRange} from './characters.js?v=5';
import {FACTIONS,ROUTES} from './data.js?v=8';
const names=(ids,lang)=>ids.map(id=>CHARACTER_CATALOG[id]?.name[lang]).filter(Boolean).join(lang?'、':', ');
const rand=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const notify=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
const configs={spy:{cost:12,months:4},envoy:{cost:8,months:3},travelers:{cost:4,months:2},audience:{cost:10,months:4},exchange:{cost:6,months:3}};
export const MISSION_RULES=configs;
const sourceFamily=r=>r.originSource||({official:'court',envoy:'court',audience:'court'}[r.source]||r.source);
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
export function addReport(s,actor,target,report){
 initializeWorld(s);const k=s.knowledge[actor]?.[target];if(!k)return;
 const r={...report,year:s.year,month:s.month,verified:false},known=x=>x.value!=='unknown'&&x.value!=null||x.kind==='leaders'||x.kind==='claimants';
 const comparable=known(r)&&reportAge(s,r)<=24?k.reports.filter(x=>known(x)&&x.kind===r.kind&&x.character===r.character&&reportAge(s,x)<=24):[];
 const value=x=>JSON.stringify((x.kind==='leaders'||x.kind==='claimants')?x.leaders:x.value);
 for(const old of comparable){if(value(old)!==value(r)){old.confidence='disputed';old.verified=false;r.confidence='disputed';r.verified=false}else if(sourceFamily(old)!==sourceFamily(r)&&old.confidence!=='disputed'&&r.confidence!=='disputed'){old.confidence='credible';r.confidence='credible'}}
 const agreeing=comparable.filter(old=>value(old)===value(r));if(known(r)&&r.confidence!=='disputed'&&new Set([sourceFamily(r),...agreeing.map(sourceFamily)]).size>=3){r.confidence='confirmed';r.verified=true;for(const old of agreeing){old.confidence='confirmed';old.verified=true}}
 // An older forwarded message may be useful evidence but must not replace a newer report.
 const newerLeader=r.kind==='leaders'&&k.reports.some(x=>x.kind==='leaders'&&reportAge(s,x)<reportAge(s,r));
 k.reports.unshift(r);k.reports=k.reports.slice(0,30);if(r.kind==='leaders'&&r.leaders&&reportAge(s,r)<=24&&!newerLeader)k.reportedLeaders=[...r.leaders];return r
}
export function publicLeaderClaim(s,target){initializeWorld(s);const ids=s.world.leadership[target]||[];return [ids.length?names(ids,0):'Authority uncertain',ids.length?names(ids,1):'执政者不明']}
export function reportedClaimants(s,actor,target){initializeWorld(s);return [...new Set((s.knowledge[actor]?.[target]?.reports||[]).filter(r=>r.kind==='claimants').flatMap(r=>r.leaders||[]).filter(id=>CHARACTER_CATALOG[id]?.faction===target))]}
export function supportClaimant(s,actor,target,claimant){
 initializeWorld(s);if(actor!==s.player||actor===target||target!=='egypt'||!reportedClaimants(s,actor,target).includes(claimant)||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(s.operations.some(o=>o.actor===actor&&o.target===target&&o.type==='support'&&o.status==='pending'))return {ok:false,reason:'pending'};if(s.factions[actor].treasury<10)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=10;s.operations.unshift({actor,target,type:'support',claimant,remaining:4,status:'pending',sentYear:s.year,sentMonth:s.month});notify(s,'An offer of support was sent; a response may take four months.','已寄出支持提议；回信可能需要四个月。');return {ok:true};
}
export function queueMission(s,actor,target,type,subject='health',partnerId=null){
 initializeWorld(s);const cfg=configs[type];if(!cfg||!s.factions[actor]||!s.factions[target]||actor===target||target==='rebels'||!s.regions.some(r=>r.owner===actor)||!s.regions.some(r=>r.owner===target))return {ok:false,reason:'unavailable'};
 if(!['health','leaders','strength','claimants'].includes(subject))return {ok:false,reason:'subject'};
 if(type==='audience'&&subject!=='leaders')return {ok:false,reason:'subject'};
 const partners=s.alliances.filter(x=>x.includes(actor)).map(x=>x.find(id=>id!==actor)).filter(id=>id!==target&&s.factions[id]);
 if(type==='exchange'&&(!partners.length||(partnerId&&!partners.includes(partnerId))))return {ok:false,reason:'alliance'};
 if(s.factions[actor].treasury<cfg.cost)return {ok:false,reason:'treasury'};
 if(s.operations.some(x=>x.actor===actor&&x.target===target&&x.status==='pending'&&x.type===type))return {ok:false,reason:'pending'};
 s.factions[actor].treasury-=cfg.cost;s.operations.unshift({actor,target,type,subject,partner:type==='exchange'?(partnerId||partners[0]):undefined,remaining:cfg.months,status:'pending',sentYear:s.year,sentMonth:s.month});
 if(actor===s.player)notify(s,`${type} mission dispatched; estimated ${cfg.months} months.`,`已派出${({spy:'间谍',envoy:'使者',travelers:'商旅',audience:'会面请求',exchange:'情报交换'})[type]}，预计${cfg.months}个月。`);return {ok:true};
}
export function advanceOperations(s){initializeWorld(s);for(const op of s.operations){if(op.status!=='pending'||--op.remaining>0)continue;const q=rand(s),id=(s.world.leadership[op.target]||[])[0],person=s.world.characters[id];
 if(op.type==='support'){
  const claimant=s.world.characters[op.claimant],valid=s.regions.some(r=>r.owner===op.target)&&claimant?.alive&&(s.world.claimants[op.target]||[]).includes(op.claimant);
  if(!valid||q<.2)op.status='no_reply';else if(q<.45)op.status='declined';else{op.status='complete';const dispute=s.world.disputes[op.target]||={months:0};dispute.support||={};dispute.support[op.claimant]=Math.min(30,(dispute.support[op.claimant]||0)+15);const key=[op.actor,op.target].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]||0)-10)}
  if(op.actor===s.player)notify(s,op.status==='complete'?'The claimant accepted support; relations with the court worsened.':op.status==='declined'?'The claimant declined the offer.':'No reply arrived; the offer or response may have been lost.',op.status==='complete'?'竞争者接受支持；与宫廷的关系恶化。':op.status==='declined'?'竞争者拒绝了提议。':'未收到回信；提议或回信可能遗失。');continue
 }
 if(!s.regions.some(r=>r.owner===op.target)||q<.18){op.status='failed';continue}
 if(op.type==='spy'&&q<.33){op.status=q<.24?'captured':'detected';const k=[op.actor,op.target].sort().join(':');s.relations[k]=(s.relations[k]||0)-10;if(op.actor===s.player||op.target===s.player)notify(s,`A spy from ${FACTIONS[op.actor].short[0]} was discovered by ${FACTIONS[op.target].short[0]}.`,`${FACTIONS[op.actor].short[1]}的间谍被${FACTIONS[op.target].short[1]}发现，双方关系恶化。`);continue}
 if((op.type==='audience'||op.type==='envoy')&&q<.38){op.status='declined';continue}
 if(op.type==='exchange'){
  const partner=op.partner,stillAllied=s.alliances.some(x=>x.includes(op.actor)&&x.includes(partner)),prior=s.knowledge[partner]?.[op.target]?.reports.find(r=>r.kind===op.subject);
  if(!stillAllied||!prior){op.status='failed';continue}
  const copy={kind:prior.kind,character:prior.character,value:prior.value,leaders:prior.leaders?[...prior.leaders]:undefined,source:'exchange',originSource:sourceFamily(prior),fromFaction:partner,observationYear:prior.observationYear??prior.year,observationMonth:prior.observationMonth??prior.month,confidence:prior.confidence==='disputed'?'disputed':prior.confidence==='rumor'?'rumor':'unverified',reliability:prior.reliability||'unknown'};
  addReport(s,op.actor,op.target,copy);op.status='complete';if(op.actor===s.player)notify(s,'An ally forwarded an existing report; its original date and source still matter.','盟友转交了一份既有报告；仍需留意原始日期与来源。');continue
 }
 op.status='complete';const source=op.type,low=op.type==='travelers',hostile=s.wars.some(w=>w.includes(op.actor)&&w.includes(op.target)),contested=(s.world.claimants[op.target]||[]).length>0,concealment=hostile||contested||person?.health==='seriously_ill'||person?.health==='dying',falsehood=q<.45&&concealment;let report;
 if(op.subject==='health'){const value=person?(falsehood?'healthy':person.health):'unknown';report={kind:'health',character:id||null,value,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else if(op.subject==='claimants'){const candidates=falsehood?[]:[...(s.world.claimants[op.target]||[])];report={kind:'claimants',leaders:candidates,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else if(op.subject==='strength'){let count=s.armies.filter(a=>a.owner===op.target).reduce((x,a)=>x+a.men,0);if(falsehood)count=Math.round(count*.65/1000)*1000;else count=Math.round(count/1000)*1000;report={kind:'strength',value:count,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else {const leaders=[...(s.world.leadership[op.target]||[])];report={kind:'leaders',leaders,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 if(op.type==='audience'){op.meeting='envoy';const k=[op.actor,op.target].sort().join(':');s.relations[k]=Math.min(100,(s.relations[k]||0)+3)}addReport(s,op.actor,op.target,report);if(op.actor===s.player)notify(s,`An intelligence report from ${FACTIONS[op.target].short[0]} has arrived.`,`一份来自${FACTIONS[op.target].short[1]}的情报报告已送达。`);
}}
export function contestLeadership(s,faction,claimant){initializeWorld(s);const leaders=s.world.leadership[faction]||[];if(faction!=='egypt'||leaders.length<2||!leaders.includes(claimant)||!s.world.characters[claimant]?.alive)return false;s.world.leadership[faction]=leaders.filter(id=>id!==claimant);const claimants=s.world.claimants[faction]||=[];if(!claimants.includes(claimant))claimants.push(claimant);s.world.disputes[faction]={months:0};if(s.factions[faction])s.factions[faction].stability=Math.max(0,s.factions[faction].stability-5);if(faction===s.player)notify(s,'A leadership dispute has created a rival claimant.','执政权争议产生了一位竞争者。');return true}

// Alternate-history court outcomes use existing characters and never update a foreign observer's reports directly.
export function advanceDisputes(s){
 initializeWorld(s);const faction='egypt',leaders=s.world.leadership[faction]||[],claimants=(s.world.claimants[faction]||[]).filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction&&!leaders.includes(id));s.world.claimants[faction]=claimants;
 if(!claimants.length||!leaders.length||!s.regions.some(r=>r.owner===faction)){delete s.world.disputes[faction];return}
 const dispute=s.world.disputes[faction]||={months:0};if(++dispute.months<6)return;dispute.months=0;
 const claimant=claimants[0],person=s.world.characters[claimant],stability=s.factions[faction].stability,support=dispute.support?.[claimant]||0,q=rand(s);let outcome;
 if(stability>=45&&person.loyalty>=55&&support===0&&q<.12){s.world.leadership[faction]=[...leaders,claimant];s.world.claimants[faction]=claimants.filter(id=>id!==claimant);s.factions[faction].stability=Math.min(100,stability+2);outcome='reconciliation';delete s.world.disputes[faction]}
 else if(q<(stability<45?.22:.08)+support/100){s.world.leadership[faction]=[claimant];s.world.claimants[faction]=[...new Set([...claimants.filter(id=>id!==claimant),...leaders.filter(id=>s.world.characters[id]?.alive)])];s.factions[faction].stability=Math.max(0,stability-4);outcome='takeover';dispute.support={}}
 if(outcome){s.world.disputeHistory.unshift({faction,claimant,outcome,year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);if(faction===s.player)notify(s,outcome==='reconciliation'?'A simulated court settlement restored joint rule.':'A simulated court struggle changed the ruling authority.',outcome==='reconciliation'?'游戏中的宫廷和解恢复了共同统治。':'游戏中的宫廷斗争改变了执政者。')}
}
// Simulation probabilities only; these do not assert historical diagnoses.
export function illnessRisk(s,id){initializeWorld(s);const c=s.world.characters[id];if(!c)return 0;const age=ageRange(id,s.year)?.[0],military=s.armies.some(a=>a.characterId===id),shortage=(s.factions[c.faction]?.food??0)<0;return Math.min(.18,(age>=65?.04:.018)+(military?.01:0)+(shortage?.025:0)+(c.travel?.01:0)+Math.min(.02,c.wounds*.01))}
export function advanceCharacters(s){initializeWorld(s);if(s.month!==1)return;for(const [id,c] of Object.entries(s.world.characters)){if(!c.alive||!c.faction)continue;const r=rand(s),previous=c.health,age=ageRange(id,s.year)?.[0],illChance=illnessRisk(s,id),frailChance=age>=65?.025:0;c.loyalty=Math.max(0,Math.min(100,c.loyalty+(s.factions[c.faction]?.stability<35?-4:1)));if(c.health==='dying'&&r<.45)c.health='deceased';else if(c.health==='seriously_ill'&&r<.22)c.health='dying';else if(c.health==='healthy'&&r<frailChance)c.health='frail';else if(c.health==='healthy'&&r<frailChance+illChance)c.health='ill';else if(c.health==='frail'&&r<.08)c.health='seriously_ill';else if(c.health==='ill'&&r<.22)c.health='seriously_ill';else if((c.health==='ill'||c.health==='wounded')&&r>.45)c.health='recovering';else if(c.health==='recovering'&&r>.25)c.health='healthy';
 if((previous==='healthy'&&c.health==='ill')||(previous==='frail'&&c.health==='seriously_ill'))c.illnessEpisodes++;
 if(c.health==='deceased'){c.alive=false;if(s.factions[c.faction])s.factions[c.faction].stability=Math.max(0,s.factions[c.faction].stability-3);const lead=s.world.leadership[c.faction]||[];if(lead.includes(id))assignSuccession(s,c.faction);for(const a of s.armies.filter(a=>a.characterId===id)){a.characterId=null;a.commander=['Unnamed officer','未具名军官'];a.skill=Math.min(a.skill,1)}if(c.faction===s.player)notify(s,`${CHARACTER_CATALOG[id].name[0]} died in the simulation; leadership was reassigned.`,`${CHARACTER_CATALOG[id].name[1]}在模拟中去世，指挥权已调整。`)}
 else if(previous!==c.health&&c.faction===s.player)notify(s,`${CHARACTER_CATALOG[id].name[0]}: simulated health changed to ${c.health}.`,`${CHARACTER_CATALOG[id].name[1]}的游戏健康状态发生变化。`);
 }if((s.world.leadership.egypt||[]).length>1&&rand(s)<(s.world.characters.cleopatra.loyalty<40?.18:.08))contestLeadership(s,'egypt','cleopatra');}
export function battlefieldWound(s,a){initializeWorld(s);const c=s.world.characters[a.characterId];if(!c?.alive||!['healthy','recovering','frail','wounded'].includes(c.health))return;const risk=Math.min(.14,.07+((s.factions[a.owner]?.food??0)<0?.03:0)+Math.min(.04,c.wounds*.01));if(rand(s)<risk){c.health='wounded';c.wounds++;if(c.faction===s.player)notify(s,`${CHARACTER_CATALOG[c.id].name[0]} was wounded in battle (simulated).`,`${CHARACTER_CATALOG[c.id].name[1]}在游戏战斗中受伤。`)}}
export function commandFactor(s,a){const c=s.world?.characters?.[a.characterId];return !c?1:({healthy:1,recovering:.96,wounded:.9,ill:.9,frail:.88,seriously_ill:.8,dying:.7,deceased:.7}[c.health]||1)}
export function linkCommanders(s){initializeWorld(s);const present=new Set();for(const a of s.armies){if(a.characterId===undefined){a.characterId=a.id==='xiii'?'caesar':a.id==='pompey'?'pompey':null}if(a.characterId&&s.world.characters[a.characterId]){s.world.characters[a.characterId].location=a.region;present.add(a.characterId)}}for(const id of ['caesar','pompey'])if(!present.has(id)&&s.world.characters[id])s.world.characters[id].location=null}

// Local reports update only at a controlled frontier; unseen reports remain stale.
export function observeArmies(s){initializeWorld(s);for(const viewer of Object.keys(s.knowledge)){for(const unit of s.armies){if(unit.owner===viewer||unit.move||!s.knowledge[viewer]?.[unit.owner])continue;const local=s.regions.some(r=>r.owner===viewer&&(r.id===unit.region||ROUTES.some(x=>(x[0]===r.id&&x[1]===unit.region)||(x[1]===r.id&&x[0]===unit.region))));if(local)s.knowledge[viewer][unit.owner].sightings[unit.id]={id:unit.id,name:[...unit.name],owner:unit.owner,region:unit.region,year:s.year,month:s.month}}}}
export function reportedArmies(s,viewer){initializeWorld(s);const result=[];for(const [owner,k] of Object.entries(s.knowledge[viewer]||{})){if(owner===viewer)continue;for(const x of Object.values(k.sightings||{}))result.push({...x,reported:true})}return result}
