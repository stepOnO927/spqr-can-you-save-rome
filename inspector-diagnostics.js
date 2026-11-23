import {ROUTES,FACTIONS} from './data.js?v=archived-exchange-1';
import {SUBJECT_TYPES} from './suzerainty.js?v=archived-exchange-1';
import {LOCAL_GENERATION_BANDS,VILLAGE_GENERATION_BANDS} from './local-generation.js?v=archived-exchange-1';
import {footholdStorageCapacity} from './foothold.js';
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
  if(a.expedition){const order=a.expedition;if(!Array.isArray(order.nodes)||order.nodes.length<2||order.nodes.some(id=>!regionIds.has(id))||order.nodes.at(-1)!==order.destination||!Number.isInteger(order.nextIndex)||order.nextIndex<1||order.nextIndex>=order.nodes.length||!['active','paused','cancelled','completed'].includes(order.status))add('warning','invalid-expedition-order',`armies[${i}].expedition`,String(order.destination));if(order.localObjectiveId){const goal=s.regions.flatMap(r=>r.localEntities||[]).find(entity=>entity.id===order.localObjectiveId);if(!goal||goal.type!=='roman_town'||goal.theater!==order.destination)add('warning','invalid-expedition-objective',`armies[${i}].expedition.localObjectiveId`,String(order.localObjectiveId))}}
 }
 for(const [id,f] of Object.entries(s.factions))for(const key of ['treasury',mode==='han'?'grain':'food','manpower']){
  if(f[key]!==undefined&&!Number.isFinite(f[key]))add('fatal','invalid-resource',`factions.${id}.${key}`,String(f[key]));
  if(key==='manpower'&&f[key]<0)add('warning','negative-manpower',`factions.${id}.manpower`,String(f[key]));
 }
 for(const [i,war] of (s.wars||[]).entries())if(!Array.isArray(war)||war.some(id=>!factionIds.has(id)))add('warning','invalid-war',`wars[${i}]`,JSON.stringify(war));
 const guide=mode==='han'?s.experience:s.experience?.guide,lessonCount=mode==='han'?(s.player==='han'?8:7):8;
 if(guide?.running||guide?.guided){
  if(!Number.isInteger(guide.step)||guide.step<0||guide.step>lessonCount)add('warning','invalid-tutorial-step','experience',String(guide.step));
  if(!s.regions.some(r=>r.owner===s.player))add('warning','tutorial-no-territory','regions','No owned territory is available for the first lesson');
  if(!s.armies.some(a=>a.owner===s.player&&a.men>0)&&guide.step<4)add('warning','tutorial-no-army','armies','A friendly army is unavailable for an early lesson');
  if(!s.experience?.actions||typeof s.experience.actions!=='object')add('warning','tutorial-actions-missing','experience.actions','Tutorial progress cannot be verified');
 }
 if(mode==='roman'){
  for(const [i,c] of (s.coalitions||[]).entries())for(const [j,peace] of (c.separatePeaces||[]).entries()){
   const base=`coalitions[${i}].separatePeaces[${j}]`;
   if(!factionIds.has(peace?.member)||peace?.target!==c.target||!c.foundingMembers?.includes(peace.member)&&!c.parties?.includes(peace.member)||!Number.isInteger(peace?.year)||!Number.isInteger(peace?.month)||peace.month<1||peace.month>12||!Number.isInteger(peace?.until)||peace.until<=peace.year*12+peace.month||!Array.isArray(peace?.remainingBelligerents)||peace.remainingBelligerents.some(id=>!factionIds.has(id)||id===peace.member))add('warning','invalid-coalition-separate-peace',base,String(peace?.member));
  }
  const defenseCallIds=new Set();
  for(const [i,call] of (s.world?.coalitionDefenseCalls||[]).entries()){
   const base=`world.coalitionDefenseCalls[${i}]`,coalition=(s.coalitions||[]).find(c=>c.id===call?.coalitionId),sentAt=call?.sent?.year*12+call?.sent?.month;
   if(!Number.isInteger(call?.id)||defenseCallIds.has(call.id))add('warning','invalid-coalition-defense-call',base,String(call?.id));else defenseCallIds.add(call.id);
   if(!coalition||!Object.hasOwn(FACTIONS,call?.defender)||!Object.hasOwn(FACTIONS,call?.aggressor)||!Object.hasOwn(FACTIONS,call?.member)||call.member===call.defender||call.aggressor!==coalition.target||!['travelling','awaiting_player','accepted','refused','lapsed','already_fighting'].includes(call?.status)||!Number.isInteger(call?.sent?.year)||!Number.isInteger(call?.sent?.month)||call.sent.month<1||call.sent.month>12||!Number.isInteger(call?.arrivesAt)||call.arrivesAt<sentAt+1||!Number.isInteger(call?.expiresAt)||call.expiresAt<=call.arrivesAt||call.mailId!=null&&typeof call.mailId!=='string')add('warning','invalid-coalition-defense-call',base,String(call?.coalitionId));
  }
  const admissionIds=new Set();
  for(const [i,invitation] of (s.world?.coalitionAdmissions||[]).entries()){
   const base=`world.coalitionAdmissions[${i}]`,coalition=(s.coalitions||[]).find(c=>c.id===invitation?.coalitionId);
   if(!Number.isInteger(invitation?.id)||admissionIds.has(invitation.id))add('warning','invalid-coalition-admission',base,String(invitation?.id));else admissionIds.add(invitation.id);
   if(!coalition||!factionIds.has(invitation?.leader)||!factionIds.has(invitation?.target)||invitation?.introducedBy&&!factionIds.has(invitation.introducedBy)||invitation?.courierPayer&&!factionIds.has(invitation.courierPayer)||invitation?.leader===invitation?.target||!['pending','accepted','refused','no_reply','lapsed'].includes(invitation?.status)||!['outbound','awaiting_player','return','confirmation','delivered'].includes(invitation?.phase)||!Number.isInteger(invitation?.remaining)||invitation.remaining<0||!Number.isInteger(invitation?.sent?.year)||!Number.isInteger(invitation?.sent?.month)||invitation.sent.month<1||invitation.sent.month>12)add('warning','invalid-coalition-admission',base,String(invitation?.coalitionId));
  }
  const motionIds=new Set();
  for(const [i,motion] of (s.world?.coalitionMotions||[]).entries()){
   const base=`world.coalitionMotions[${i}]`,coalition=(s.coalitions||[]).find(c=>c.id===motion?.coalitionId),electorate=motion?.electorate;
   if(!Number.isInteger(motion?.id)||motionIds.has(motion.id))add('warning','invalid-coalition-motion',base,String(motion?.id));else motionIds.add(motion.id);
   if(!coalition||!['leadership','expulsion','admission','contribution','dissolution'].includes(motion?.kind)||!['voting','passed','rejected','lapsed'].includes(motion?.status)||!factionIds.has(motion?.sponsor)||!factionIds.has(motion?.target)||motion?.kind==='contribution'&&!['military','funding','supplies','diplomacy'].includes(motion.policy)||motion?.kind==='admission'&&(!Number.isInteger(motion.courierEscrow)||motion.courierEscrow<0||motion.courierEscrow>3)||!Array.isArray(electorate)||electorate.length<3||new Set(electorate).size!==electorate.length||electorate.some(id=>!factionIds.has(id))||!motion?.votes||Object.entries(motion.votes).some(([id,vote])=>!electorate.includes(id)||!['yes','no','abstain'].includes(vote))||!Number.isInteger(motion?.noticeAt)||!Number.isInteger(motion?.closesAt)||motion.closesAt<=motion.noticeAt)add('warning','invalid-coalition-motion',base,String(motion?.coalitionId));
  }
  const coalitionAidIds=new Set();
  for(const [i,request] of (s.world?.coalitionAidRequests||[]).entries()){
   const base=`world.coalitionAidRequests[${i}]`,coalition=(s.coalitions||[]).find(c=>c.id===request?.coalitionId);
   if(!Number.isInteger(request?.id)||coalitionAidIds.has(request.id))add('warning','invalid-coalition-aid',base,String(request?.id));else coalitionAidIds.add(request.id);
   if(!coalition||!factionIds.has(request?.requester)||!factionIds.has(request?.recipient)||request.requester===request.recipient||!['pending','accepted','refused','no_reply','lapsed'].includes(request?.status)||!['outbound','awaiting_player','return','delivered'].includes(request?.phase)||!Number.isInteger(request?.remaining)||request.remaining<0||!Number.isInteger(request?.sent?.year)||!Number.isInteger(request?.sent?.month)||request.sent.month<1||request.sent.month>12||request.sealedAid&&(request.sealedAid.treasury!==8||request.sealedAid.food!==6)||request.deliveredAid&&(request.deliveredAid.treasury!==8||request.deliveredAid.food!==6))add('warning','invalid-coalition-aid',base,String(request?.coalitionId));
  }
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
  const localIds=new Set(),localRulerIds=new Set();let generatedCount=0,generatedVillageCount=0,generatedIndependentVillageCount=0,generatedStrongmanCount=0,generatedNomadCount=0,generatedWildernessCount=0;
  for(const [i,r] of s.regions.entries())for(const [j,entity] of (r.localEntities||[]).entries()){
   const base=`regions[${i}].localEntities[${j}]`;
   if(!entity?.id||localIds.has(entity.id))add('fatal','duplicate-local-entity',base,String(entity?.id));else localIds.add(entity.id);
   if(entity?.theater!==r.id||!Array.isArray(entity.coordinates)||entity.coordinates.length!==2||entity.coordinates.some(value=>!Number.isFinite(value)))add('fatal','invalid-local-geography',base,String(entity?.theater));
   if(!['city_state','roman_town','microstate','tribe','strongman','village','wilderness','nomadic'].includes(entity?.type))add('fatal','invalid-local-type',base,String(entity?.type));
   if(entity?.ruler&&(!entity.ruler.id||!Array.isArray(entity.ruler.name)||entity.ruler.name.length!==2||entity.ruler.name.some(name=>typeof name!=='string'||!name)))add('warning','invalid-local-ruler',`${base}.ruler`,String(entity.ruler?.id));
   if(entity?.ruler?.id){
    const ruler=s.world?.localRulers?.[entity.ruler.id];
    if(localRulerIds.has(entity.ruler.id)||!ruler||ruler.polityId!==entity.id||JSON.stringify(ruler.name)!==JSON.stringify(entity.ruler.name)||ruler.alive!==true||entity.procedural&&(!Number.isInteger(ruler.birthYear)||!ruler.fictional))add('warning','invalid-local-ruler-registry',`${base}.ruler`,String(entity.ruler.id));
    localRulerIds.add(entity.ruler.id);
   }
   if(entity?.controller!==entity?.id&&!factionIds.has(entity?.controller)&&!(entity?.proceduralVillage&&entity.controller===entity.sponsor&&r.localEntities?.some(site=>site.id===entity.sponsor&&site.type==='strongman'))&&!(entity?.proceduralWilderness&&entity.controller===null))add('fatal','invalid-local-controller',`${base}.controller`,String(entity?.controller));
   if(!Number.isFinite(entity?.militia)||entity.militia<0)add('fatal','invalid-local-militia',`${base}.militia`,String(entity?.militia));
   if(entity?.procedural&&!entity.proceduralVillage&&!entity.proceduralNomad&&!entity.proceduralWilderness){generatedCount++;if(entity.type==='strongman')generatedStrongmanCount++;if(entity.historical!==false||entity.spatialAccuracy!=='fictional_approximate_point'||!Array.isArray(entity.name)||entity.name.length!==2||entity.name.some(name=>typeof name!=='string'||!name)||!entity.ruler?.id||!Number.isInteger(entity.population)||entity.population<100||entity.militia>entity.population/4||!Number.isFinite(entity.treasury)||entity.treasury<0||!Number.isFinite(entity.food)||entity.food<0||!Number.isInteger(entity.strategy)||entity.strategy<1||entity.strategy>5||entity.type==='strongman'&&(!factionIds.has(entity.legalSovereign)||entity.claimedSovereignty!==false||entity.government!=='personal_following'))add('warning','invalid-generated-polity',base,String(entity.id))}
   if(entity?.type==='strongman'&&entity.recognizedBy&&(!factionIds.has(entity.recognizedBy)||!Number.isInteger(entity.titleRecognizedAt?.year)||!Number.isInteger(entity.titleRecognizedAt?.month)||entity.titleRecognizedAt.month<1||entity.titleRecognizedAt.month>12))add('warning','invalid-local-recognition',`${base}.titleRecognizedAt`,String(entity.id));
   if(entity?.type==='strongman'&&entity.localCharter){const charter=entity.localCharter,date=charter.granted,payment=charter.lastPayment;if(!factionIds.has(charter.host)||typeof charter.active!=='boolean'||!Number.isInteger(date?.year)||!Number.isInteger(date?.month)||date.month<1||date.month>12||!Number.isInteger(charter.arrears)||charter.arrears<0||charter.arrears>2||payment&&(!Number.isInteger(payment.year)||!Number.isInteger(payment.month)||payment.month<1||payment.month>12))add('warning','invalid-local-charter',`${base}.localCharter`,String(entity.id))}
   if(entity?.npcCharterOffer&&(entity.type!=='strongman'||!entity.procedural||entity.npcCharterOffer.host===s.player||!Object.hasOwn(FACTIONS,entity.npcCharterOffer.host)||!Number.isInteger(entity.npcCharterOffer.remaining)||entity.npcCharterOffer.remaining<1||entity.npcCharterOffer.remaining>2||!Number.isInteger(entity.npcCharterOffer.sentYear)||!Number.isInteger(entity.npcCharterOffer.sentMonth)||entity.npcCharterOffer.sentMonth<1||entity.npcCharterOffer.sentMonth>12||!Number.isInteger(entity.npcCharterOffer.lastAdvancedAt)))add('warning','invalid-local-npc-charter-offer',`${base}.npcCharterOffer`,String(entity.id));
   if(entity?.lastNpcCharterAt&&(!Number.isInteger(entity.lastNpcCharterAt.year)||!Number.isInteger(entity.lastNpcCharterAt.month)||entity.lastNpcCharterAt.month<1||entity.lastNpcCharterAt.month>12))add('warning','invalid-local-npc-charter-date',`${base}.lastNpcCharterAt`,String(entity.id));
   if(entity?.lastNpcCharterOutcome&&(!Object.hasOwn(FACTIONS,entity.lastNpcCharterOutcome.host)||typeof entity.lastNpcCharterOutcome.accepted!=='boolean'||!Number.isInteger(entity.lastNpcCharterOutcome.year)||!Number.isInteger(entity.lastNpcCharterOutcome.month)||entity.lastNpcCharterOutcome.month<1||entity.lastNpcCharterOutcome.month>12))add('warning','invalid-local-npc-charter-outcome',`${base}.lastNpcCharterOutcome`,String(entity.id));
   if(entity?.proceduralNomad){generatedNomadCount++;const camps=entity.seasonalRange,point=camps?.[entity.rangeIndex];if(entity.type!=='nomadic'||entity.historical!==false||entity.spatialAccuracy!=='fictional_approximate_point'||entity.claimedSovereignty!==false||!factionIds.has(entity.legalSovereign)||entity.administrativeStatus!=='seasonal_camp'||!entity.ruler?.id||!Array.isArray(camps)||camps.length<2||camps.some(camp=>!regionIds.has(camp.theater)||!Array.isArray(camp.coordinates)||camp.coordinates.length!==2||camp.coordinates.some(value=>!Number.isFinite(value)))||!Number.isInteger(entity.rangeIndex)||!point||point.theater!==r.id||JSON.stringify(point.coordinates)!==JSON.stringify(entity.coordinates)||!Number.isInteger(entity.herds)||entity.herds<0||!Number.isInteger(entity.waterSecurity)||entity.waterSecurity<0||entity.waterSecurity>100||!Number.isInteger(entity.population)||entity.population<100||entity.militia>entity.population/4||!Number.isInteger(entity.strategy)||entity.strategy<1||entity.strategy>5||!entity.pastureRights||typeof entity.pastureRights!=='object'||Array.isArray(entity.pastureRights))add('warning','invalid-generated-nomad',base,String(entity.id))}
   if(entity?.proceduralWilderness){generatedWildernessCount++;const w=entity.wilderness;if(entity.type!=='wilderness'||entity.historical!==false||entity.spatialAccuracy!=='fictional_approximate_point'||entity.controller!==null||!factionIds.has(entity.legalSovereign)||entity.administrativeStatus!=='unadministered_land'||!w||!['forest_interior','highland_valley','remote_hills','dry_frontier','desert_margin','mountain_barrier'].includes(w.kind)||!['difficult','seasonal','impassable'].includes(w.passability)||!['limited','camp_only','none'].includes(w.settlement)||!['sparse','seasonal','unknown'].includes(w.occupancy)||!Number.isInteger(w.populationEstimate)||w.populationEstimate<0||!w.surveyedBy||typeof w.surveyedBy!=='object'||Array.isArray(w.surveyedBy)||w.passability==='impassable'&&entity.maxFootholdLevel!==0||w.settlement==='none'&&entity.maxFootholdLevel!==0||w.settlement!=='none'&&entity.maxFootholdLevel!==1)add('warning','invalid-generated-wilderness',base,String(entity.id));if(w?.surveyProject&&(!factionIds.has(w.surveyProject.actor)||!Number.isInteger(w.surveyProject.remaining)||w.surveyProject.remaining<1||w.surveyProject.remaining>2))add('warning','invalid-wilderness-survey',base,String(entity.id))}
   if(entity?.proceduralVillage){
    if(entity.proceduralIndependentVillage){generatedIndependentVillageCount++;if(entity.sponsor||entity.type!=='village'||entity.historical!==false||entity.spatialAccuracy!=='fictional_approximate_point'||!factionIds.has(entity.controller)||!factionIds.has(entity.legalSovereign)||!Array.isArray(entity.name)||entity.name.length!==2||!entity.village||!Number.isInteger(entity.village.population)||entity.village.population<100||entity.village.foodProduction<entity.village.foodNeed)add('warning','invalid-generated-village',base,String(entity.id))}
    else{generatedVillageCount++;const patron=r.localEntities?.find(site=>site.id===entity.sponsor&&site.type==='strongman');if(!patron||entity.type!=='village'||entity.historical!==false||entity.spatialAccuracy!=='fictional_approximate_point'||!factionIds.has(entity.legalSovereign)||!factionIds.has(entity.lastHostOwner)||entity.lastPatronController!==patron.controller||!Array.isArray(entity.name)||entity.name.length!==2||!entity.village||entity.village.population>patron.population||entity.village.foodProduction<entity.village.foodNeed)add('warning','invalid-generated-village',base,String(entity.id))}
   }
   if(entity.resistance!=null&&(!Number.isFinite(entity.resistance)||entity.resistance<0||entity.resistance>100))add('fatal','invalid-local-resistance',`${base}.resistance`,String(entity.resistance));
   if(entity.tradeRights&&(typeof entity.tradeRights!=='object'||Array.isArray(entity.tradeRights)||Object.entries(entity.tradeRights).some(([actor,until])=>!factionIds.has(actor)||!Number.isInteger(until))))add('warning','invalid-local-trade-rights',`${base}.tradeRights`,String(entity.id));
   if(entity.pending?.proposal==='supplies'&&(!['city_state','microstate','tribe'].includes(entity.type)||!factionIds.has(entity.pending.actor)||entity.pending.escrow!==10||!Number.isInteger(entity.pending.remaining)||entity.pending.remaining<1||entity.pending.remaining>2||!Number.isInteger(entity.pending.sentYear)||!Number.isInteger(entity.pending.sentMonth)||entity.pending.sentMonth<1||entity.pending.sentMonth>12||!Number.isInteger(entity.pending.lastAdvancedAt)))add('warning','invalid-local-supply-request',`${base}.pending`,String(entity.id));
   if(entity.lastOutcome?.proposal==='supplies'&&(typeof entity.lastOutcome.accepted!=='boolean'||entity.lastOutcome.food!==(entity.lastOutcome.accepted?6:0)||entity.lastOutcome.price!==(entity.lastOutcome.accepted?10:0)||!Number.isInteger(entity.lastOutcome.refunded)||entity.lastOutcome.refunded<0||entity.lastOutcome.refunded>10))add('warning','invalid-local-supply-outcome',`${base}.lastOutcome`,String(entity.id));
   if((entity.lastTradePetitionAt||entity.tradePetitionMailId)&&(!entity.procedural||!['city_state','microstate','tribe'].includes(entity.type)||!Number.isInteger(entity.lastTradePetitionAt?.year)||!Number.isInteger(entity.lastTradePetitionAt?.month)||entity.lastTradePetitionAt.month<1||entity.lastTradePetitionAt.month>12||!s.mail?.messages?.some(mail=>mail.id===entity.tradePetitionMailId&&mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id)))add('warning','invalid-local-trade-petition',`${base}.lastTradePetitionAt`,String(entity.id));
   if(entity.tradePetitionReply&&(!['city_state','microstate','tribe'].includes(entity.type)||entity.tradePetitionReply.letterId!==entity.tradePetitionMailId||typeof entity.tradePetitionReply.accepted!=='boolean'||!Number.isInteger(entity.tradePetitionReply.remaining)||entity.tradePetitionReply.remaining<1||entity.tradePetitionReply.remaining>12||!Number.isInteger(entity.tradePetitionReply.sentYear)||!Number.isInteger(entity.tradePetitionReply.sentMonth)||entity.tradePetitionReply.sentMonth<1||entity.tradePetitionReply.sentMonth>12||!Number.isInteger(entity.tradePetitionReply.lastAdvancedAt)||!Object.hasOwn(FACTIONS,entity.tradePetitionReply.host)))add('warning','invalid-local-trade-reply',`${base}.tradePetitionReply`,String(entity.id));
   if(entity.npcTradeOffer&&(!entity.procedural||!['city_state','microstate','tribe'].includes(entity.type)||entity.npcTradeOffer.host===s.player||!Object.hasOwn(FACTIONS,entity.npcTradeOffer.host)||!Number.isInteger(entity.npcTradeOffer.remaining)||entity.npcTradeOffer.remaining<1||entity.npcTradeOffer.remaining>2||!Number.isInteger(entity.npcTradeOffer.sentYear)||!Number.isInteger(entity.npcTradeOffer.sentMonth)||entity.npcTradeOffer.sentMonth<1||entity.npcTradeOffer.sentMonth>12||!Number.isInteger(entity.npcTradeOffer.lastAdvancedAt)))add('warning','invalid-local-npc-trade-offer',`${base}.npcTradeOffer`,String(entity.id));
   if(entity.npcProtectorateOffer&&(!entity.procedural||!['city_state','microstate','tribe'].includes(entity.type)||entity.npcProtectorateOffer.host===s.player||!Object.hasOwn(FACTIONS,entity.npcProtectorateOffer.host)||!Number.isInteger(entity.npcProtectorateOffer.remaining)||entity.npcProtectorateOffer.remaining<1||entity.npcProtectorateOffer.remaining>3||!Number.isInteger(entity.npcProtectorateOffer.sentYear)||!Number.isInteger(entity.npcProtectorateOffer.sentMonth)||entity.npcProtectorateOffer.sentMonth<1||entity.npcProtectorateOffer.sentMonth>12||!Number.isInteger(entity.npcProtectorateOffer.lastAdvancedAt)))add('warning','invalid-local-npc-protectorate-offer',`${base}.npcProtectorateOffer`,String(entity.id));
   if(entity.lastNpcProtectorateAt&&(!Number.isInteger(entity.lastNpcProtectorateAt.year)||!Number.isInteger(entity.lastNpcProtectorateAt.month)||entity.lastNpcProtectorateAt.month<1||entity.lastNpcProtectorateAt.month>12))add('warning','invalid-local-npc-protectorate-date',`${base}.lastNpcProtectorateAt`,String(entity.id));
   if(entity.lastNpcProtectorateOutcome&&(!Object.hasOwn(FACTIONS,entity.lastNpcProtectorateOutcome.host)||typeof entity.lastNpcProtectorateOutcome.accepted!=='boolean'||!Number.isInteger(entity.lastNpcProtectorateOutcome.year)||!Number.isInteger(entity.lastNpcProtectorateOutcome.month)||entity.lastNpcProtectorateOutcome.month<1||entity.lastNpcProtectorateOutcome.month>12))add('warning','invalid-local-npc-protectorate-outcome',`${base}.lastNpcProtectorateOutcome`,String(entity.id));
   if(entity.lastNpcTradeOfferAt&&(!Number.isInteger(entity.lastNpcTradeOfferAt.year)||!Number.isInteger(entity.lastNpcTradeOfferAt.month)||entity.lastNpcTradeOfferAt.month<1||entity.lastNpcTradeOfferAt.month>12))add('warning','invalid-local-npc-trade-date',`${base}.lastNpcTradeOfferAt`,String(entity.id));
   if(entity.lastNpcTradeOutcome&&(!Object.hasOwn(FACTIONS,entity.lastNpcTradeOutcome.host)||typeof entity.lastNpcTradeOutcome.accepted!=='boolean'||!Number.isInteger(entity.lastNpcTradeOutcome.year)||!Number.isInteger(entity.lastNpcTradeOutcome.month)||entity.lastNpcTradeOutcome.month<1||entity.lastNpcTradeOutcome.month>12))add('warning','invalid-local-npc-trade-outcome',`${base}.lastNpcTradeOutcome`,String(entity.id));
   if(entity.lastTrade&&(!factionIds.has(entity.lastTrade.actor)||!Number.isInteger(entity.lastTrade.year)||!Number.isInteger(entity.lastTrade.month)||entity.lastTrade.month<1||entity.lastTrade.month>12||!Number.isInteger(entity.lastTrade.food)||entity.lastTrade.food<1||!Number.isInteger(entity.lastTrade.price)||entity.lastTrade.price<1))add('warning','invalid-local-trade',`${base}.lastTrade`,String(entity.id));
   if(entity.lastCivicBudget&&(!Number.isInteger(entity.lastCivicBudget.year)||!Number.isInteger(entity.lastCivicBudget.month)||entity.lastCivicBudget.month<1||entity.lastCivicBudget.month>12||['production','harvest','civilianNeed','guardNeed','tax','upkeep','storageCap','spoilage','foodShortfall','payShortfall'].some(key=>!Number.isInteger(entity.lastCivicBudget[key])||entity.lastCivicBudget[key]<0)))add('warning','invalid-local-civic-budget',`${base}.lastCivicBudget`,String(entity.id));
   if(entity.civicOfficers&&(['steward','captain'].some(role=>{
      const officer=entity.civicOfficers[role];return !officer||officer.id!==`local-officer:${entity.theater}:${role}`||!Array.isArray(officer.name)||officer.name.length!==2||officer.name.some(name=>typeof name!=='string'||!name.trim())||!Number.isInteger(officer.skill)||officer.skill<1||officer.skill>5||officer.fictional!==true;
   })||entity.civicOfficers.steward?.name?.[0]===entity.civicOfficers.captain?.name?.[0]))add('warning','invalid-local-civic-officers',`${base}.civicOfficers`,String(entity.id));
   if(entity.lastCivicBudget&&['stewardBenefit','captainBenefit'].some(key=>entity.lastCivicBudget[key]!=null&&(!Number.isInteger(entity.lastCivicBudget[key])||entity.lastCivicBudget[key]<0||entity.lastCivicBudget[key]>2)))add('warning','invalid-local-civic-budget',`${base}.lastCivicBudget`,String(entity.id));
   if(entity.type==='village'){
    const v=entity.village,level=(key,max)=>Number.isInteger(v?.[key])&&v[key]>=0&&v[key]<=max;
    if(!v||!Number.isInteger(v.population)||v.population<0||!Number.isFinite(v.storedFood)||v.storedFood<0||!level('granary',2)||!level('irrigation',2)||!level('agriculture',2)||['market','well','road','wall','shrine'].some(key=>!level(key,1))||!Number.isFinite(v.marketAccess)||v.marketAccess<0||v.marketAccess>100||!Number.isFinite(v.satisfaction)||v.satisfaction<0||v.satisfaction>100||!Number.isFinite(v.security)||v.security<0||v.security>100)add('fatal','invalid-village',`${base}.village`,String(entity.id));
    if(v?.project&&(!['granary','irrigation','market','well','road','wall','shrine','agriculture'].includes(v.project.kind)||!Number.isInteger(v.project.remaining)||v.project.remaining<1))add('warning','invalid-village-project',`${base}.village.project`,String(v.project.kind));
    if(v?.lastEvent&&(!['harvest','tax_complaint','merchants','festival','road_request'].includes(v.lastEvent.kind)||!Number.isInteger(v.lastEvent.year)||!Number.isInteger(v.lastEvent.month)||v.lastEvent.month<1||v.lastEvent.month>12))add('warning','invalid-village-event',`${base}.village.lastEvent`,String(v.lastEvent.kind));
    if(v?.eventSeed!=null&&(!Number.isInteger(v.eventSeed)||v.eventSeed<0||v.eventSeed>0xffffffff))add('warning','invalid-village-event-seed',`${base}.village.eventSeed`,String(v.eventSeed));
   }
   if(entity?.siege&&(!armyIds.has(entity.siege.armyId)||!factionIds.has(entity.siege.actor)))add('warning','invalid-local-siege',`${base}.siege`,String(entity.siege.armyId));
   if(entity?.foothold){const foothold=entity.foothold;if(!factionIds.has(foothold.owner)||!Number.isInteger(foothold.level)||foothold.level<0||foothold.level>4||!Number.isFinite(foothold.stockFood)||foothold.stockFood<0||foothold.stockFood>footholdStorageCapacity(entity))add('warning','invalid-foothold',`${base}.foothold`,String(foothold.level));if(foothold.project&&(foothold.project.actor!==foothold.owner||!Number.isInteger(foothold.project.targetLevel)||foothold.project.targetLevel<=foothold.level||!Number.isFinite(foothold.project.remaining)||foothold.project.remaining<1))add('warning','invalid-foothold-project',`${base}.foothold.project`,String(foothold.project.targetLevel))}
   if(entity?.foothold?.shipments){const shipments=entity.foothold.shipments;if(!Array.isArray(shipments))add('warning','invalid-foothold-shipments',`${base}.foothold.shipments`,'Not a shipment list');else{let committed=0;for(const [k,shipment] of shipments.entries()){const path=`${base}.foothold.shipments[${k}]`;if(shipment?.owner!==entity.foothold.owner||!Number.isInteger(shipment.food)||shipment.food<1||!Number.isInteger(shipment.remaining)||shipment.remaining<1||!Array.isArray(shipment.route)||!shipment.route.length||shipment.route.at(-1)!==entity.theater||shipment.route.some(id=>!regionIds.has(id))||!Number.isInteger(shipment.blockedMonths)||shipment.blockedMonths<0||shipment.blockedMonths>2)add('warning','invalid-foothold-shipment',path,String(shipment?.id));committed+=Number.isFinite(shipment?.food)?shipment.food:0}if(entity.foothold.stockFood+committed>footholdStorageCapacity(entity))add('warning','foothold-overcommitted',`${base}.foothold.shipments`,String(committed))}}
  }
  const assignedSettlementOfficials=new Set();
  for(const [entityId,post] of Object.entries(s.world?.localAdministrators||{})){
   const entity=s.regions.flatMap(region=>region.localEntities||[]).find(site=>site.id===entityId),person=s.world?.characters?.[post?.person],key=`${post?.faction}:${post?.person}`;
   const villageInvalid=entity?.type==='village'&&(!entity.village||s.regions.find(region=>region.id===entity.theater)?.owner!==post.faction||entity.foothold?.owner!==post.faction||!Number.isInteger(entity.foothold.level)||entity.foothold.level<1);
   if(!entity||['nomadic','wilderness'].includes(entity.type)||villageInvalid||!factionIds.has(post?.faction)||entity.controller!==post.faction||!person||person.faction!==post.faction||assignedSettlementOfficials.has(key))add('warning','invalid-local-administrator',`world.localAdministrators.${entityId}`,String(post?.person));
   assignedSettlementOfficials.add(key);
  }
  const generation=s.world?.localGeneration;
  if(generation&&(!Number.isInteger(generation.seed)||generation.seed<0||generation.seed>0xffffffff||!LOCAL_GENERATION_BANDS[generation.difficulty]||!Number.isInteger(generation.count)||generation.count!==generatedCount))add('warning','invalid-local-generation','world.localGeneration',String(generation?.count));
  if(generation&&generatedVillageCount!==generatedStrongmanCount)add('warning','invalid-generated-village-count','world.localGeneration',String(generatedVillageCount));
  if(generation&&((generation.independentVillageCount??0)!==generatedIndependentVillageCount||generation.version>=4&&(!VILLAGE_GENERATION_BANDS[generation.difficulty]||generatedIndependentVillageCount<VILLAGE_GENERATION_BANDS[generation.difficulty][0]||generatedIndependentVillageCount>VILLAGE_GENERATION_BANDS[generation.difficulty][1])))add('warning','invalid-independent-village-count','world.localGeneration',String(generatedIndependentVillageCount));
  if(generation&&(generation.nomadCount??0)!==generatedNomadCount)add('warning','invalid-generated-nomad-count','world.localGeneration',String(generatedNomadCount));
  if(generation&&(generation.wildernessCount??0)!==generatedWildernessCount)add('warning','invalid-generated-wilderness-count','world.localGeneration',String(generatedWildernessCount));
  for(const [viewer,records] of Object.entries(s.localDiscovery||{})){
   if(!factionIds.has(viewer)||!records||typeof records!=='object'||Array.isArray(records)){add('warning','invalid-local-discovery',`localDiscovery.${viewer}`,'Invalid viewer or record list');continue}
   for(const [id,record] of Object.entries(records)){const entity=s.regions.flatMap(region=>region.localEntities||[]).find(site=>site.id===id);if(!localIds.has(id)||!Number.isInteger(record?.level)||record.level<1||record.level>5||!Number.isInteger(record?.year)||!Number.isInteger(record?.month)||record.month<1||record.month>12||typeof record.source!=='string'||entity?.type==='nomadic'&&(!record.seenTheater||!entity.seasonalRange?.some(camp=>camp.theater===record.seenTheater)))add('warning','invalid-local-discovery',`localDiscovery.${viewer}.${id}`,String(record?.level))}
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


// A read-only check for the active lesson. UI callers can pass the real DOM
// after rendering; cloud browser tests can then catch missing or hidden targets.
export function inspectTutorial({steps=[],index=0,document:doc=null,available=()=>true}={}){
 const findings=[],add=(code,path,detail)=>findings.push({severity:'warning',code,path,detail}),keys=new Set();
 if(!Array.isArray(steps)||!steps.length){add('tutorial-no-lessons','steps','No lessons defined');return findings}
 if(!Number.isInteger(index)||index<0||index>steps.length)add('tutorial-invalid-index','index',String(index));
 for(const [i,step] of steps.entries()){
  const key=step?.key??step?.[0],title=step?.title??[step?.[1],step?.[2]],target=step?.target??step?.[3];
  if(!key||keys.has(key))add('tutorial-duplicate-action',`steps[${i}]`,String(key));keys.add(key);
  if(!Array.isArray(title)||title.some(value=>typeof value!=='string'||!value.trim()))add('tutorial-missing-translation',`steps[${i}].title`,String(key));
  if(!target||typeof target!=='string')add('tutorial-missing-target',`steps[${i}].target`,String(key));
 }
 if(index<steps.length){const step=steps[index],target=step?.target??step?.[3],key=step?.key??step?.[0];
  if(!available(key))add('tutorial-action-unavailable',`steps[${index}]`,String(key));
  if(doc&&target?.startsWith('#')){let element;try{element=doc.querySelector(target)}catch{add('tutorial-invalid-selector',`steps[${index}].target`,target)}
   if(!element)add('tutorial-target-missing',`steps[${index}].target`,target);
   else if(element.hidden||element.closest?.('[hidden]')||element.getClientRects?.().length===0)add('tutorial-target-hidden',`steps[${index}].target`,target);
  }
 }
 return findings;
}
