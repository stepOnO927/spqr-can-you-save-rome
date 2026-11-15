import {ROUTES} from './data.js?v=world-kings-trade-1';
import {SUBJECT_TYPES} from './suzerainty.js?v=world-kings-trade-1';
// Read-only startup and deep state checks. Never migrates or mutates a save.
export function inspectState(s,{mode=s?.dlc?'han':'roman',isLiuClan}={}){
 const findings=[],add=(severity,code,path,detail)=>findings.push({severity,code,path,detail});
 if(!s||typeof s!=='object'){add('fatal','missing-state','$','No campaign state');return findings}
 if(!s.factions||typeof s.factions!=='object'||!Object.keys(s.factions).length)add('fatal','missing-factions','factions','No faction registry');
 if(!Array.isArray(s.regions)||!s.regions.length)add('fatal','missing-regions','regions','No playable territories');
 if(!Array.isArray(s.armies))add('fatal','missing-armies','armies','Army list is unavailable');
 if(findings.some(x=>x.severity==='fatal'))return findings;
 const factionIds=new Set(Object.keys(s.factions)),regionIds=new Set(),armyIds=new Set();
 if(s.player!=null&&!factionIds.has(s.player))add('fatal','invalid-player','player',String(s.player));
 for(const [i,r] of s.regions.entries()){
  if(!r?.id||regionIds.has(r.id))add('fatal','duplicate-region',`regions[${i}]`,String(r?.id));else regionIds.add(r.id);
  if(!(mode==='han'&&r.owner==null)&&!factionIds.has(r.owner))add('fatal','invalid-owner',`regions[${i}].owner`,String(r.owner));
 }
 for(const [i,a] of s.armies.entries()){
  if(!a?.id||armyIds.has(a.id))add('fatal','duplicate-army',`armies[${i}]`,String(a?.id));else armyIds.add(a.id);
  if(!factionIds.has(a.owner))add('fatal','invalid-army-owner',`armies[${i}].owner`,String(a.owner));
  if(!regionIds.has(a.region))add('warning','invalid-army-location',`armies[${i}].region`,String(a.region));
  if(!Number.isFinite(a.men)||a.men<0)add('fatal','invalid-troops',`armies[${i}].men`,String(a.men));
  if(a.expeditionSupply&&(!['full','partial','depot','village_support','local_purchase','cut_off'].includes(a.expeditionSupply.status)||!Number.isInteger(a.expeditionSupply.strainMonths)||a.expeditionSupply.strainMonths<0))add('warning','invalid-expedition-supply',`armies[${i}].expeditionSupply`,String(a.expeditionSupply.status));
  if(a.expedition){const order=a.expedition;if(!Array.isArray(order.nodes)||order.nodes.length<2||order.nodes.some(id=>!regionIds.has(id))||order.nodes.at(-1)!==order.destination||!Number.isInteger(order.nextIndex)||order.nextIndex<1||order.nextIndex>=order.nodes.length||!['active','paused','cancelled','completed'].includes(order.status))add('warning','invalid-expedition-order',`armies[${i}].expedition`,String(order.destination))}
 }
 for(const [id,f] of Object.entries(s.factions))for(const key of ['treasury',mode==='han'?'grain':'food','manpower']){
  if(f[key]!==undefined&&!Number.isFinite(f[key]))add('fatal','invalid-resource',`factions.${id}.${key}`,String(f[key]));
  if(key==='manpower'&&f[key]<0)add('warning','negative-manpower',`factions.${id}.manpower`,String(f[key]));
 }
 for(const [i,war] of (s.wars||[]).entries())if(!Array.isArray(war)||war.some(id=>!factionIds.has(id)))add('warning','invalid-war',`wars[${i}]`,JSON.stringify(war));
 if(mode==='roman'){
  const subjects=new Map();
  for(const [i,treaty] of (s.agreements||[]).entries()){
   if(!SUBJECT_TYPES.includes(treaty?.type)||treaty.status!=='active')continue;
   const terms=treaty.terms?.subject,base=`agreements[${i}]`,client=treaty.type==='client_kingdom';
   if(!terms||!factionIds.has(terms.suzerain)||!factionIds.has(terms.subject)||terms.suzerain===terms.subject||treaty.parties?.[0]!==terms.suzerain||treaty.parties?.[1]!==terms.subject||!Number.isInteger(terms.established?.year)||!Number.isInteger(terms.established?.month)||terms.established.month<1||terms.established.month>12||terms.tribute?.treasury!==(client?2:0)||terms.tribute?.everyMonths!==3||terms.militaryObligation?.defensiveProtection!==true||terms.militaryObligation?.aidOnRequest!==client||terms.diplomaticAutonomy!==(client?'limited':'independent')||terms.internalAutonomy!==(client?'broad':'full')||terms.militaryAccess!==(client?'suzerain_into_subject':'none')||terms.commercialPrivileges!==(client?'suzerain_into_subject':'none')||!Number.isInteger(terms.politicalLoyalty)||terms.politicalLoyalty<0||terms.politicalLoyalty>100||!Number.isInteger(terms.independenceAspiration)||terms.independenceAspiration<0||terms.independenceAspiration>100)add('fatal','invalid-subject-treaty',base,String(treaty?.id));
   if(terms?.subject){if(subjects.has(terms.subject))add('fatal','multiple-suzerains',base,terms.subject);subjects.set(terms.subject,terms.suzerain)}
  }
  for(const [subject] of subjects){const seen=new Set();for(let current=subject;subjects.has(current);current=subjects.get(current)){if(seen.has(current)){add('fatal','circular-suzerainty','agreements',subject);break}seen.add(current)}}
  const aidIds=new Set();
  for(const [i,shipment] of (s.subjectAidShipments||[]).entries()){
   const base=`subjectAidShipments[${i}]`,path=shipment?.path;
   if(!shipment?.id||aidIds.has(shipment.id))add('fatal','duplicate-subject-aid',base,String(shipment?.id));else aidIds.add(shipment.id);
   if(!factionIds.has(shipment?.suzerain)||!factionIds.has(shipment?.subject)||!s.agreements?.some(t=>t.id===shipment.treatyId&&SUBJECT_TYPES.includes(t.type))||!Array.isArray(path)||path.length!==2||path.some(id=>!regionIds.has(id))||!ROUTES.some(edge=>edge[0]===path[0]&&edge[1]===path[1]||edge[1]===path[0]&&edge[0]===path[1])||!Number.isInteger(shipment?.manpower)||shipment.manpower<1||!Number.isInteger(shipment?.food)||shipment.food<1||!Number.isInteger(shipment?.remaining)||shipment.remaining<0||!Number.isInteger(shipment?.blockedMonths)||shipment.blockedMonths<0||!['transit','delivered','lost'].includes(shipment?.status))add('warning','invalid-subject-aid',base,String(shipment?.id));
  }
  const tradeIds=new Set();
  for(const [i,cargo] of (s.tradeCargo||[]).entries()){
   const base=`tradeCargo[${i}]`,route=cargo?.path;
   if(!cargo?.id||tradeIds.has(cargo.id))add('fatal','duplicate-trade-cargo',base,String(cargo?.id));else tradeIds.add(cargo.id);
   if(!factionIds.has(cargo?.from)||!factionIds.has(cargo?.to)||!s.agreements?.some(t=>t.id===cargo.agreementId&&t.type==='trade'&&t.parties.includes(cargo.from)&&t.parties.includes(cargo.to))||!['transit','delivered','lost'].includes(cargo?.status)||!Number.isInteger(cargo?.value)||cargo.value<1||!Number.isInteger(cargo?.leg)||cargo.leg<0||!Number.isInteger(cargo?.remaining)||cargo.remaining<0||!Number.isInteger(cargo?.blockedMonths)||cargo.blockedMonths<0||!Number.isInteger(cargo?.legStarted?.year)||!Number.isInteger(cargo?.legStarted?.month)||cargo.legStarted.month<1||cargo.legStarted.month>12)add('warning','invalid-trade-cargo',base,String(cargo?.id));
   if(!Array.isArray(route)||route.length<2||route.some(id=>!regionIds.has(id))||route.some((id,j)=>j>0&&!ROUTES.some(edge=>edge[0]===id&&edge[1]===route[j-1]||edge[1]===id&&edge[0]===route[j-1]))||cargo.leg>=route.length)add('warning','invalid-trade-route',`${base}.path`,String(cargo?.id));
  }
  const borderIds=new Set();
  for(const [i,incident] of (s.borderIncidents||[]).entries()){
   const base=`borderIncidents[${i}]`;
   if(!incident?.id||borderIds.has(incident.id))add('fatal','duplicate-border-incident',base,String(incident?.id));else borderIds.add(incident.id);
   if(!factionIds.has(incident?.attacker)||!factionIds.has(incident?.defender)||!regionIds.has(incident?.territory)||incident?.origin&&!regionIds.has(incident.origin))add('warning','invalid-border-incident',base,String(incident?.territory));
   if(!Number.isFinite(incident?.attackerLoss)||incident.attackerLoss<0||!Number.isFinite(incident?.defenderLoss)||incident.defenderLoss<0)add('warning','invalid-border-loss',base,String(incident?.attackerLoss));
  }
  const localIds=new Set();
  for(const [i,r] of s.regions.entries())for(const [j,entity] of (r.localEntities||[]).entries()){
   const base=`regions[${i}].localEntities[${j}]`;
   if(!entity?.id||localIds.has(entity.id))add('fatal','duplicate-local-entity',base,String(entity?.id));else localIds.add(entity.id);
   if(entity?.theater!==r.id||!Array.isArray(entity.coordinates)||entity.coordinates.length!==2||entity.coordinates.some(value=>!Number.isFinite(value)))add('fatal','invalid-local-geography',base,String(entity?.theater));
   if(!['city_state','roman_town','microstate','tribe','strongman','village','wilderness','nomadic'].includes(entity?.type))add('fatal','invalid-local-type',base,String(entity?.type));
   if(entity?.ruler&&(!entity.ruler.id||!Array.isArray(entity.ruler.name)||entity.ruler.name.length!==2||entity.ruler.name.some(name=>typeof name!=='string'||!name)))add('warning','invalid-local-ruler',`${base}.ruler`,String(entity.ruler?.id));
   if(entity?.controller!==entity?.id&&!factionIds.has(entity?.controller))add('fatal','invalid-local-controller',`${base}.controller`,String(entity?.controller));
   if(!Number.isFinite(entity?.militia)||entity.militia<0)add('fatal','invalid-local-militia',`${base}.militia`,String(entity?.militia));
   if(entity.resistance!=null&&(!Number.isFinite(entity.resistance)||entity.resistance<0||entity.resistance>100))add('fatal','invalid-local-resistance',`${base}.resistance`,String(entity.resistance));
   if(entity.type==='village'){
    const v=entity.village,level=(key,max)=>Number.isInteger(v?.[key])&&v[key]>=0&&v[key]<=max;
    if(!v||!Number.isInteger(v.population)||v.population<0||!Number.isFinite(v.storedFood)||v.storedFood<0||!level('granary',2)||!level('irrigation',2)||!level('agriculture',2)||['market','well','road','wall','shrine'].some(key=>!level(key,1))||!Number.isFinite(v.marketAccess)||v.marketAccess<0||v.marketAccess>100||!Number.isFinite(v.satisfaction)||v.satisfaction<0||v.satisfaction>100||!Number.isFinite(v.security)||v.security<0||v.security>100)add('fatal','invalid-village',`${base}.village`,String(entity.id));
    if(v?.project&&(!['granary','irrigation','market','well','road','wall','shrine','agriculture'].includes(v.project.kind)||!Number.isInteger(v.project.remaining)||v.project.remaining<1))add('warning','invalid-village-project',`${base}.village.project`,String(v.project.kind));
   }
   if(entity?.siege&&(!armyIds.has(entity.siege.armyId)||!factionIds.has(entity.siege.actor)))add('warning','invalid-local-siege',`${base}.siege`,String(entity.siege.armyId));
   if(entity?.foothold){const foothold=entity.foothold;if(!factionIds.has(foothold.owner)||!Number.isInteger(foothold.level)||foothold.level<0||foothold.level>4||!Number.isFinite(foothold.stockFood)||foothold.stockFood<0||foothold.stockFood>foothold.level*12)add('warning','invalid-foothold',`${base}.foothold`,String(foothold.level));if(foothold.project&&(foothold.project.actor!==foothold.owner||!Number.isInteger(foothold.project.targetLevel)||foothold.project.targetLevel<=foothold.level||!Number.isFinite(foothold.project.remaining)||foothold.project.remaining<1))add('warning','invalid-foothold-project',`${base}.foothold.project`,String(foothold.project.targetLevel))}
   if(entity?.foothold?.shipments){const shipments=entity.foothold.shipments;if(!Array.isArray(shipments))add('warning','invalid-foothold-shipments',`${base}.foothold.shipments`,'Not a shipment list');else{let committed=0;for(const [k,shipment] of shipments.entries()){const path=`${base}.foothold.shipments[${k}]`;if(shipment?.owner!==entity.foothold.owner||!Number.isInteger(shipment.food)||shipment.food<1||!Number.isInteger(shipment.remaining)||shipment.remaining<1||!Array.isArray(shipment.route)||!shipment.route.length||shipment.route.at(-1)!==entity.theater||shipment.route.some(id=>!regionIds.has(id))||!Number.isInteger(shipment.blockedMonths)||shipment.blockedMonths<0||shipment.blockedMonths>2)add('warning','invalid-foothold-shipment',path,String(shipment?.id));committed+=Number.isFinite(shipment?.food)?shipment.food:0}if(entity.foothold.stockFood+committed>entity.foothold.level*12)add('warning','foothold-overcommitted',`${base}.foothold.shipments`,String(committed))}}
  }
  for(const [viewer,records] of Object.entries(s.localDiscovery||{})){
   if(!factionIds.has(viewer)||!records||typeof records!=='object'||Array.isArray(records)){add('warning','invalid-local-discovery',`localDiscovery.${viewer}`,'Invalid viewer or record list');continue}
   for(const [id,record] of Object.entries(records))if(!localIds.has(id)||!Number.isInteger(record?.level)||record.level<1||record.level>5||!Number.isInteger(record?.year)||!Number.isInteger(record?.month)||record.month<1||record.month>12||typeof record.source!=='string')add('warning','invalid-local-discovery',`localDiscovery.${viewer}.${id}`,String(record?.level));
  }
  if(!s.world?.characters)add('fatal','missing-characters','world.characters','Roman character registry is missing');
  else{
   for(const [id,c] of Object.entries(s.world.characters))if(c?.id!==id)add('warning','unstable-character-id',`world.characters.${id}`,String(c?.id));
   for(const [i,a] of s.armies.entries())if(a.characterId&&!s.world.characters[a.characterId])add('warning','invalid-commander',`armies[${i}].characterId`,String(a.characterId));
  }
  for(const [i,entry] of (s.chronicle?.entries||[]).entries())if(entry.region&&!regionIds.has(entry.region))add('warning','invalid-chronicle-region',`chronicle.entries[${i}].region`,String(entry.region));
 }else{
  if(!s.persons||!s.throne)add('fatal','missing-han-court','throne','Han court state is missing');
  const ruler=s.throne?.orthodox;
  if(ruler&&(!s.persons?.[ruler]||!isLiuClan?.(s,ruler)))add('fatal','non-liu-orthodox','throne.orthodox',String(ruler));
  for(const [id,p] of Object.entries(s.persons||{}))if(p.id!==id)add('warning','unstable-person-id',`persons.${id}`,String(p.id));
 }
 // Han frontier territories can be unclaimed (owner === null).
 // Treasury and food/grain may be negative under the modeled debt and famine
 // rules. This is deliberate; no generic nonnegative assertion is applied.
 return findings;
}
export function startupDiagnostics(s,configuration){
 const findings=inspectState(s,configuration);
 return {fatal:findings.filter(x=>x.severity==='fatal'),warnings:findings.filter(x=>x.severity==='warning'),findings};
}
