import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=marriage-economy-merge-1';
import {createFictionalPerson,reportedDynasticContacts,requestClaimantAsylum} from '../dynasties.js?v=marriage-economy-merge-1';
import {addReport,reportedClaimants,reportedHealthSubjects,visiblePersonName,refreshReportConfidence,reportEvidence} from '../character-system.js?v=marriage-economy-merge-1';
import {isDeliveredReport} from '../person-knowledge.js?v=mutual-audience-1';

test('future observations and deliveries cannot create contacts, claimant actions or names',()=>{
 let s=newGame('caesar'),id=createFictionalPerson(s,{name:['Hidden','隐藏姓名'],faction:'egypt',birthYear:-75});const k=s.knowledge.caesar.egypt;
 const future={kind:'claimants',leaders:[id],year:s.year,month:s.month,observationYear:s.year+1,observationMonth:s.month,peopleNames:{[id]:['Future','未来姓名']}};k.reports.unshift(future);
 assert.equal(isDeliveredReport(s,future),false);assert.equal(reportedDynasticContacts(s).some(x=>x.id===id),false);assert.ok(!reportedClaimants(s,'caesar','egypt').includes(id));assert.ok(!reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.equal(requestClaimantAsylum(s,id,'egypt').reason,'unknown');assert.deepEqual(visiblePersonName(s,'caesar',id),['Unrecorded name','姓名未记录']);
 s=upgradeSave(structuredClone(s));assert.equal(reportedDynasticContacts(s).some(x=>x.id===id),false);s.year++;assert.ok(reportedDynasticContacts(s).some(x=>x.id===id));assert.ok(reportedClaimants(s,'caesar','egypt').includes(id));assert.deepEqual(visiblePersonName(s,'caesar',id),['Future','未来姓名']);
});

test('future received records neither change leader cache nor corroborate current reports',()=>{
 const s=newGame('caesar'),k=s.knowledge.caesar.egypt,old=[...k.reportedLeaders];const current=addReport(s,'caesar','egypt',{kind:'stability',value:'fragile',source:'spy'});const future={kind:'stability',value:'fragile',source:'envoy',year:s.year+1,month:s.month,observationYear:s.year,observationMonth:s.month};k.reports.unshift(future);refreshReportConfidence(s);assert.equal(current.confidence,'unverified');assert.equal(reportEvidence(s,'caesar','egypt',future).unavailable,true);assert.deepEqual(k.reportedLeaders,old);
 const leader=addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'exchange',observationYear:s.year+1,observationMonth:s.month});assert.equal(isDeliveredReport(s,leader),false);assert.deepEqual(k.reportedLeaders,old);
});

test('undated legacy records remain available but malformed or future dates do not',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Legacy','旧人物'],faction:'egypt',birthYear:-75});s.knowledge.caesar.egypt.reports.push({kind:'claimants',leaders:[id]});assert.ok(reportedDynasticContacts(s).some(x=>x.id===id));assert.ok(reportedClaimants(s,'caesar','egypt').includes(id));assert.equal(isDeliveredReport(s,{year:s.year+1,month:s.month}),false);assert.equal(isDeliveredReport(s,{year:s.year,month:13}),false);assert.equal(isDeliveredReport(s,{}),true);
});

test('a hidden change of faction does not erase a delivered claimant lead',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Reported claimant','已报告竞争者'],faction:'egypt',birthYear:-75});addReport(s,'caesar','egypt',{kind:'claimants',leaders:[id],source:'spy'});const before=reportedClaimants(s,'caesar','egypt');s.world.characters[id].faction='parthia';s.world.dynasties.catalog[id].faction='parthia';upgradeSave(s);assert.deepEqual(reportedClaimants(s,'caesar','egypt'),before);assert.ok(reportedClaimants(s,'caesar','egypt').includes(id));
});

test('AI planning ignores reports not yet delivered and never consults a claimant’s hidden faction',async()=>{
 const {estimatedStrength,aiClaimantChoice}=await import('../engine.js?v=marriage-economy-merge-1'),{assessOpportunities,opportunityEvidenceSignature}=await import('../multipolar.js?v=mutual-audience-1');const s=newGame('caesar'),other=upgradeSave(structuredClone(s)),k=other.knowledge.parthia.armenia;
 k.reports.unshift({kind:'strength',value:999999,source:'spy',year:s.year+1,month:s.month,observationYear:s.year,observationMonth:s.month},{kind:'stability',value:'fragile',source:'spy',year:s.year+1,month:s.month,observationYear:s.year,observationMonth:s.month});assert.equal(estimatedStrength(s,'parthia','armenia'),estimatedStrength(other,'parthia','armenia'));assert.equal(opportunityEvidenceSignature(s,'parthia'),opportunityEvidenceSignature(other,'parthia'));assert.deepEqual(assessOpportunities(s,'parthia',estimatedStrength),assessOpportunities(other,'parthia',estimatedStrength));
 const id=createFictionalPerson(other,{name:['Claimant','竞争者'],faction:'egypt',birthYear:-75});addReport(other,'parthia','egypt',{kind:'claimants',leaders:[id],source:'spy'});assert.equal(aiClaimantChoice(other,'parthia','egypt'),id);other.world.characters[id].faction='armenia';other.world.dynasties.catalog[id].faction='armenia';upgradeSave(other);assert.equal(aiClaimantChoice(other,'parthia','egypt'),id);
});

test('future reports do not leak through identity, local government, chessboard or coalition pressure',async()=>{
 const {identityKnowledge}=await import('../map-lab/identity-knowledge.js?v=mutual-audience-1'),{leadershipIntelligence}=await import('../map-lab/intelligence-summary.js?v=mutual-audience-1'),{reportedTheaterAdministrators}=await import('../map-lab/local-governor-ui.js?v=marriage-economy-merge-1'),{buildChessboard}=await import('../chessboard.js?v=marriage-economy-merge-1'),{perceivedBalance}=await import('../coalitions.js?v=mutual-audience-1'),{canMediate}=await import('../civil-war.js?v=mutual-audience-1'),{estimatedStrength}=await import('../engine.js?v=marriage-economy-merge-1');
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Unknown','未知人物'],faction:'egypt',birthYear:-75}),other=upgradeSave(structuredClone(s)),future={year:s.year+1,month:s.month,observationYear:s.year,observationMonth:s.month,source:'spy',confidence:'confirmed',verified:true};
 other.knowledge.caesar.egypt.reports.unshift({...future,kind:'claimants',leaders:[id]},{...future,kind:'leaders',leaders:[...other.knowledge.caesar.egypt.reportedLeaders]},{...future,kind:'conspiracy',character:id,value:'plot'},{...future,kind:'clashes',value:'reported'});other.knowledge.caesar.senate.reports.unshift({...future,kind:'office_theater:roma',value:'cicero'});other.knowledge.parthia.armenia.reports.unshift({...future,kind:'stability',value:'fragile'});
 assert.equal(identityKnowledge(other,id).kind,'unknown');assert.deepEqual(leadershipIntelligence(other,'caesar','egypt'),leadershipIntelligence(s,'caesar','egypt'));assert.deepEqual(reportedTheaterAdministrators(other,'roma'),reportedTheaterAdministrators(s,'roma'));assert.deepEqual(buildChessboard(other),buildChessboard(s));assert.deepEqual(perceivedBalance(other,'parthia','armenia',estimatedStrength),perceivedBalance(s,'parthia','armenia',estimatedStrength));assert.equal(canMediate(other,'caesar','egypt'),canMediate(s,'caesar','egypt'));
});

test('future sightings cannot expose identities or open a political contact',async()=>{
 const {identityKnowledge}=await import('../map-lab/identity-knowledge.js?v=mutual-audience-1'),{reportedArmies}=await import('../character-system.js?v=marriage-economy-merge-1'),{offerPoliticalContact}=await import('../political-contacts.js?v=mutual-audience-1');const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Unseen','未见人物'],faction:'egypt',birthYear:-75}),k=s.knowledge.caesar.egypt;k.sightings['future']={commanderId:id,year:s.year+1,month:s.month};s.world.personalRelations[[id,'caesar'].sort().join(':')]={trust:10,meetings:1};s.meetings.push({actor:'caesar',targetFaction:'egypt',person:'caesar',target:id,status:'met',year:s.year+1,month:s.month,contactCredit:2});assert.equal(identityKnowledge(s,id).kind,'unknown');assert.ok(!reportedArmies(s,'caesar').some(x=>x.commanderId===id));assert.ok(!reportedHealthSubjects(s,'caesar','egypt').includes(id));assert.equal(offerPoliticalContact(s,'caesar','egypt',id,'caesar').reason,'unavailable');s.year++;assert.equal(identityKnowledge(s,id).kind,'met');assert.ok(reportedArmies(s,'caesar').some(x=>x.commanderId===id));assert.equal(offerPoliticalContact(s,'caesar','egypt',id,'caesar').ok,true);
});

test('a partner cannot forward an intelligence report before receiving it',async()=>{
 const {queueMission,advanceOperations}=await import('../character-system.js?v=marriage-economy-merge-1');const s=newGame('caesar');s.alliances.push(['caesar','egypt']);s.knowledge.egypt.parthia.reports.unshift({kind:'strength',value:99999,source:'spy',year:s.year+1,month:s.month,observationYear:s.year,observationMonth:s.month});const result=queueMission(s,'caesar','parthia','exchange','strength','egypt');assert.equal(result.ok,true);const op=s.operations[0];while(!op.exchangeSealed){s.month++;advanceOperations(s)}assert.equal(op.exchangeSealed.available,false);
});
