import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,forecastEconomy} from '../engine.js?v=peace-cursus-1';
import {appointOffice,officeEffects} from '../office-system.js?v=succession-ui-recovery-1';
import {initializeCursus,officeEligibility,changeObedience,supportCandidate,investigateCandidate,resolveElection,advanceCursus,investigateGovernment,governmentReport,officialKnowledge,knownForeignOfficial,contactOfficial,cultivateOfficial,proposeCooperation,searchTalent,requestRecommendation,retainOfficial,reviewApplicant,appointmentApplicationStatus,offerEmployment,obedience,institutionalBalance,campaignPhase,campaignFor,campaignEstimate,senateAssessment,seekSenatorEndorsement,proposeMeasure} from '../cursus-honorum.js?v=cursus-strategic-1';

test('fictional candidates are persistent people; Roman consuls require an assembly election',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.ok(id.startsWith('fictional:'));assert.equal(s.world.characters[id].faction,'senate');
 assert.equal(c.applicants.find(x=>x.id===id).senatorialSupport,80);
 assert.equal(c.magistrates.consul.length,0);assert.equal(officeEligibility(s,id,'consul').ok,true);
 for(const office of ['praetor','quaestor','aedile','tribune'])assert.ok(c.applicants.filter(x=>x.office===office&&x.faction==='senate').length>=2);
 const treasury=s.factions.senate.treasury,before=obedience(s,id);
 assert.equal(supportCandidate(s,id,'support').ok,true);
 assert.equal(s.factions.senate.treasury,treasury-8);
 assert.ok(obedience(s,id)>before);assert.ok(c.applicants.find(x=>x.id===id).senatorialSupport>80);assert.equal(c.magistrates.consul.length,0);
 assert.equal(supportCandidate(s,id,'oppose').ok,true);
 s.month=10;const election=resolveElection(s,'consul');
 assert.equal(election.ok,true);assert.equal(election.result.body,'centuriate');
 assert.equal(election.result.elected.length,2);
 assert.equal(election.result.candidates.length,4);
 assert.equal(c.magistrates.consul.length,0);
 s.year++;s.month=1;advanceCursus(s);
 assert.equal(c.magistrates.consul.length,2);
 assert.deepEqual(c.magistrates.consul.map(x=>x.id),election.result.elected);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(restored.world.cursus.varroId,id);
 assert.deepEqual(restored.world.cursus.elections[0].elected,election.result.elected);
});
test('obstructive competence differs from loyalty and institutional support',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 c.obedience[id].value=20;s.world.characters[id].education=95;s.world.characters[id].loyalty=90;
 assert.equal(obedience(s,id),20);
 assert.equal(appointOffice(s,'finance',id).ok,true);
 s.world.characters[id].education=20;const low=forecastEconomy(s).treasury;
 s.world.characters[id].education=95;const competent=forecastEconomy(s).treasury;
 c.obedience[id].value=95;const cooperative=forecastEconomy(s).treasury;
 assert.ok(competent>low);assert.ok(cooperative>competent);
 const b=institutionalBalance(s);
 assert.ok(Number.isFinite(b.magistrate));assert.ok(Number.isFinite(b.senate));assert.ok(Number.isFinite(b.assembly));
 s.regions.find(r=>r.id==='roma').owner='caesar';
 assert.equal(supportCandidate(s,id,'support').reason,'rome');
 assert.equal(officeEligibility(s,id,'dictator').ok,false);
});
test('dated Parthian office reports, two contact routes and negotiated employment',()=>{
 const s=newGame('senate'),c=initializeCursus(s),target='parthia',official=c.foreignPosts.parthia.administration;
 assert.equal(governmentReport(s,target),null);
 for(let stage=1;stage<=3;stage++){
  assert.equal(investigateGovernment(s,target).ok,true);
  for(let i=0;i<2+stage;i++)advanceCursus(s);
 }
 const report=governmentReport(s,target);
 assert.equal(report.stage,3);assert.ok(report.reports.at(-1).people.includes(official));
 assert.equal(report.reports.at(-1).confidence,'estimate');
 assert.equal(contactOfficial(s,target,official,'formal').ok,true);
 assert.equal(contactOfficial(s,target,official,'merchant').ok,false);
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.contacts.at(-1).status,'open');
 const armies=s.armies.length,regions=s.regions.length,forecastBefore=forecastEconomy(s).treasury,relationBefore=s.relations['parthia:senate']||0;
 assert.equal(offerEmployment(s,target,official).ok,true);
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.offers.at(-1).status,'accepted');
 assert.equal(s.world.characters[official].faction,'senate');
 assert.ok(c.advisers.some(x=>x.id===official&&x.actor==='senate'));
 assert.equal(s.relations['parthia:senate'],relationBefore-6);
 assert.equal(forecastEconomy(s).treasury,forecastBefore+1);
 assert.equal(s.armies.length,armies);assert.equal(s.regions.length,regions);
 assert.equal(c.foreignPosts.parthia.administration,undefined);
 const referred=c.referrals.senate?.[0];assert.ok(referred);assert.equal(s.world.characters[referred].faction,'parthia');
 assert.equal(contactOfficial(s,target,referred,'introduction').ok,true);
 const restored=upgradeSave(structuredClone(s));assert.equal(restored.world.cursus.offers.at(-1).status,'accepted');
});
test('Senate consultation, assembly voting and administration remain separate',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 s.month=2;c.magistrates.consul=[{id,faction:'senate',startYear:s.year,endYear:s.year}];
 c.senate.senate=25;assert.equal(proposeMeasure(s,'public_works').ok,true);
 advanceCursus(s);assert.equal(c.proposals.at(-1).status,'opposed');
 c.senate.senate=70;c.assemblies.tribal=20;assert.equal(proposeMeasure(s,'public_works').ok,true);
 advanceCursus(s);assert.equal(c.proposals.at(-1).status,'voting');
 advanceCursus(s);assert.equal(c.proposals.at(-1).status,'rejected');
 c.assemblies.tribal=75;const before=s.factions.senate.stability;
 assert.equal(proposeMeasure(s,'public_works').ok,true);
 for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.proposals.at(-1).status,'implemented');
 assert.equal(s.factions.senate.stability,before+2);
});
test('240 monthly political turns retain identities, elections and bounded applications',()=>{
 const s=newGame('senate'),id=initializeCursus(s).varroId;
 for(let i=0;i<240;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceCursus(s)}
 assert.equal(s.world.cursus.varroId,id);
 assert.ok(s.world.cursus.elections.length>=20);
 assert.ok(s.world.cursus.applicants.length<100);
 assert.ok(s.world.cursus.intel.egypt?.parthia?.stage>=1);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.varroId,id);
});

test('a public campaign promise has an ID, deadline and accountable outcome',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.equal(supportCandidate(s,id,'promise').ok,true);
 const candidate=c.applicants.find(x=>x.id===id),promise=candidate.promises[0];
 assert.match(promise.id,/^promise:/);assert.equal(promise.requiredAction,'public_works');
 candidate.support=1000;s.month=10;const election=resolveElection(s,'consul');assert.ok(election.result.elected.includes(id));
 assert.equal(promise.status,'pending');
 c.magistrates.consul=[{id,faction:'senate',startYear:s.year,endYear:s.year}];c.senate.senate=80;c.assemblies.tribal=80;
 assert.equal(proposeMeasure(s,'public_works').ok,true);
 for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(promise.status,'fulfilled');assert.ok(promise.fulfilled);
});

test('seven non-Roman courts expose stable officials through staged inquiry',()=>{
 const s=newGame('senate'),c=initializeCursus(s),foreign=['egypt','numidia','mauretania','armenia','parthia','galatia','bosporus'];
 for(const faction of foreign){
  if(!s.regions.some(r=>r.owner===faction))continue;
  const posts=c.foreignPosts[faction];assert.ok(posts?.administration);assert.ok(posts?.scholar);
  for(const id of Object.values(posts)){const p=s.world.characters[id];assert.equal(p.faction,faction);assert.ok(s.regions.some(r=>r.id===p.location));}
 }
 const saved=upgradeSave(structuredClone(s));assert.deepEqual(saved.world.cursus.foreignPosts,c.foreignPosts);
});
test('foreign contact routes have distinct access requirements and costs',()=>{
 const s=newGame('senate'),c=initializeCursus(s),target='numidia',official=c.foreignPosts.numidia.administration,scholar=c.foreignPosts.numidia.scholar;
 s.factions.senate.treasury=500;
 assert.equal(contactOfficial(s,target,official,'embassy').ok,false);
 for(let stage=1;stage<=4;stage++){assert.equal(investigateGovernment(s,target).ok,true);for(let i=0;i<2+stage;i++)advanceCursus(s)}
 assert.equal(contactOfficial(s,target,official,'scholarly').reason,'intelligence');
 const embassy=contactOfficial(s,target,official,'embassy');assert.deepEqual({ok:embassy.ok,cost:embassy.cost,months:embassy.months},{ok:true,cost:12,months:2});
 const invitation=contactOfficial(s,target,scholar,'scholarly');assert.deepEqual({ok:invitation.ok,cost:invitation.cost,months:invitation.months},{ok:true,cost:6,months:4});
 assert.equal(contactOfficial(s,target,scholar,'professional').reason,'representative');
 const rep=c.varroId;s.world.characters[rep].education=90;assert.equal(appointOffice(s,'finance',rep).ok,true);
 for(let i=0;i<4;i++)advanceCursus(s);
 const professional=contactOfficial(s,target,scholar,'professional');assert.equal(professional.ok,true);assert.equal(professional.cost,8);
 const covert=contactOfficial(s,target,official,'intelligence');assert.equal(covert.ok,true);assert.equal(covert.cost,9);
});

test('electoral inquiry needs public evidence and can disqualify a candidate before assembly vote',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId,candidate=c.applicants.find(x=>x.id===id);
 s.month=5;assert.equal(investigateCandidate(s,id).reason,'evidence');
 assert.equal(supportCandidate(s,id,'improper').ok,true);
 assert.ok(candidate.support>=3);assert.ok(candidate.irregularity);
 candidate.irregularity.public=true;candidate.irregularity.evidence=100;candidate.allegation={public:true,source:'witness',year:s.year,month:s.month};
 assert.equal(investigateCandidate(s,id).ok,true);assert.equal(investigateCandidate(s,id).reason,'pending');
 s.world.intelSeed=0;advanceCursus(s);advanceCursus(s);
 assert.equal(c.investigations.at(-1).status,'proved');assert.equal(candidate.status,'disqualified');
 s.month=10;const election=resolveElection(s,'consul');assert.equal(election.ok,true);assert.ok(!election.result.elected.includes(id));
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.investigations.at(-1).status,'proved');
});

test('AI must discover a Roman officeholder before contact, and defection clears the post',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId,actor='caesar';
 s.factions.caesar.treasury=500;s.month=2;
 assert.equal(appointOffice(s,'finance',id).ok,true);
 assert.equal(knownForeignOfficial(s,'senate',id,actor),false);
 assert.equal(contactOfficial(s,'senate',id,'formal',actor).ok,false);
 for(let stage=1;stage<=3;stage++){assert.equal(investigateGovernment(s,'senate',actor).ok,true);for(let i=0;i<2+stage;i++)advanceCursus(s)}
 assert.equal(knownForeignOfficial(s,'senate',id,actor),true);
 assert.equal(governmentReport(s,'senate',actor).reports.at(-1).people.includes(id),true);
 assert.equal(contactOfficial(s,'senate',id,'formal',actor).ok,true);
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.contacts.at(-1).status,'open');
 const armies=s.armies.length,regions=s.regions.length;
 assert.equal(offerEmployment(s,'senate',id,actor).ok,true);
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.offers.at(-1).status,'accepted');
 assert.equal(s.world.offices.senate.finance,undefined);
 assert.equal(s.world.characters[id].faction,actor);
 assert.equal(s.armies.length,armies);assert.equal(s.regions.length,regions);
});

test('twenty years of full monthly turns preserve elected careers and saves', {timeout:180000},()=>{
 const s=newGame('senate'),c=initializeCursus(s),varro=c.varroId,start=s.year*12+s.month;
 for(const region of s.regions){region.owner='senate';region.loyalty=90}
 s.armies=s.armies.filter(a=>a.owner==='senate');s.wars=[];
 Object.assign(s.factions.senate,{treasury:100000,food:100000,manpower:100000,stability:90,tax:'low'});
 for(let i=0;i<240;i++)tick(s);
 assert.equal(s.year*12+s.month,start+240);
 assert.equal(s.world.cursus.varroId,varro);
 assert.ok(s.world.cursus.elections.length>=20);
 assert.ok(s.world.cursus.applicants.length<150);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.varroId,varro);
});

test('named official relationships grow only through paid monthly contact',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 c.contacts.push({actor:'senate',target:'parthia',id,route:'formal',status:'open',trust:20});
 const before=s.factions.senate.treasury;
 const first=cultivateOfficial(s,'parthia',id,'senate');
 assert.equal(first.ok,true);assert.equal(first.cost,6);assert.ok(first.trust>20);
 assert.equal(s.factions.senate.treasury,before-6);
 assert.equal(cultivateOfficial(s,'parthia',id,'senate').reason,'cooldown');
 s.month+=1;const next=cultivateOfficial(s,'parthia',id,'senate');
 assert.equal(next.ok,true);assert.ok(next.trust>first.trust);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.contacts.at(-1).trust,next.trust);
});

test('named senators endorse candidates but collective century votes choose consuls',()=>{
 const s=newGame('senate'),c=initializeCursus(s),varro=c.varroId,senator=c.senators[0];
 assert.equal(c.senators.length,12);assert.equal(new Set(c.senators.map(x=>x.id)).size,12);
 assert.equal(s.world.characters[varro].education,96);assert.equal(obedience(s,varro),34);
 assert.equal(senateAssessment(s,'senate').votes.length,12);
 assert.equal(campaignPhase(s,'consul'),'registration');
 const before=s.factions.senate.treasury;
 assert.equal(seekSenatorEndorsement(s,senator.id,varro).ok,true);
 assert.equal(s.factions.senate.treasury,before-5);
 assert.equal(seekSenatorEndorsement(s,senator.id,varro).reason,'pending');
 s.world.intelSeed=0;advanceCursus(s);advanceCursus(s);
 assert.equal(c.endorsements.at(-1).status,'accepted');
 s.month=10;const result=resolveElection(s,'consul').result;
 assert.equal(result.body,'centuriate');assert.equal(result.elected.length,2);
 assert.equal(result.ballots.length,386);
 assert.equal(result.ballots.filter(x=>x.seat===1).length,193);
 assert.equal(result.candidates.reduce((n,x)=>n+x.votes,0),386);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.endorsements.at(-1).status,'accepted');
});
test('career advancement and annual political review use actual elections',()=>{
 const s=newGame('senate'),c=initializeCursus(s);
 s.month=12;const election=resolveElection(s,'quaestor').result,holder=election.elected[0];
 assert.ok(holder);s.world.characters[holder].birthYear=s.year-41;
 advanceCursus(s);assert.ok(c.politicalReviews.at(-1).elected.some(x=>x.id===holder&&x.office==='quaestor'));
 s.year++;s.month=1;advanceCursus(s);
 assert.ok(c.careers[holder].some(x=>x.office==='quaestor'&&x.source==='election'));
 assert.ok(c.applicants.some(x=>x.id===holder&&x.office==='praetor'&&x.year===s.year));
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.politicalReviews.at(-1).year,s.year-1);
});
test('campaign actions have a monthly limit while political candidates act independently',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.equal(supportCandidate(s,id,'support').ok,true);
 assert.equal(supportCandidate(s,id,'support').reason,'cooldown');
 const wealth=s.world.characters[id].wealth;
 s.month=4;advanceCursus(s);
 assert.ok(c.campaignActions.some(x=>x.actor===id&&x.action==='independent canvass'));
 assert.equal(s.world.characters[id].wealth,wealth-3);
});

test('foreign knowledge and relationship dimensions remain distinct',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 assert.equal(officialKnowledge(s,'parthia',id).level,'unknown');
 for(let stage=1;stage<=3;stage++){assert.equal(investigateGovernment(s,'parthia').ok,true);for(let i=0;i<2+stage;i++)advanceCursus(s)}
 assert.equal(officialKnowledge(s,'parthia',id).level,'identified');
 c.contacts.push({actor:'senate',target:'parthia',id,route:'formal',status:'open',trust:35,relationship:{familiarity:40,trust:35,respect:40,professional:20,alignment:30,obligation:0,rivalry:0,willingness:25}});
 assert.equal(officialKnowledge(s,'parthia',id).level,'connected');
 const before=c.contacts.at(-1).relationship;
 const result=cultivateOfficial(s,'parthia',id,'senate','professional');
 assert.equal(result.ok,true);assert.ok(before.professional>20);assert.equal(before.alignment,30);
 assert.equal(cultivateOfficial(s,'parthia',id,'senate','political').reason,'cooldown');
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.contacts.at(-1).relationship.professional,before.professional);
});
test('regional talent search costs money, takes time and never repeats freely',()=>{
 const s=newGame('senate'),c=initializeCursus(s),before=s.factions.senate.treasury;
 assert.equal(searchTalent(s,'roma','provincial').ok,true);
 assert.equal(s.factions.senate.treasury,before-10);
 assert.equal(searchTalent(s,'roma','scholarly').reason,'annual_limit');
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.talentSearches.at(-1).status,'found');
 const id=c.talentSearches.at(-1).id;assert.equal(s.world.characters[id].faction,'senate');
 assert.equal(c.talents.at(-1).id,id);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.talents.at(-1).id,id);
});
test('limited cooperation and competing offers preserve the official agency',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 for(const actor of ['senate','egypt'])c.contacts.push({actor,target:'parthia',id,route:'formal',status:'open',trust:60,relationship:{familiarity:65,trust:60,respect:70,professional:75,alignment:40,obligation:0,rivalry:0,willingness:55}});
 assert.equal(proposeCooperation(s,'parthia',id,'professional').ok,true);
 s.world.intelSeed=0;advanceCursus(s);advanceCursus(s);
 assert.equal(c.cooperations.at(-1).status,'active');assert.equal(s.world.characters[id].faction,'parthia');
 assert.equal(offerEmployment(s,'parthia',id,'senate').ok,true);
 assert.equal(offerEmployment(s,'parthia',id,'egypt').ok,true);
 const armies=s.armies.length,regions=s.regions.length;
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.offers.filter(x=>x.id===id&&x.status==='accepted').length,1);
 assert.equal(s.armies.length,armies);assert.equal(s.regions.length,regions);
 assert.ok(['senate','egypt'].includes(s.world.characters[id].faction));
});
test('a recruited commander changes allegiance personally without transferring an army',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration,army=s.armies.find(a=>a.owner==='parthia');
 army.characterId=id;c.intel.senate={parthia:{stage:3,reports:[{stage:3,people:[id],commanders:[id],observed:{year:s.year,month:s.month}}]}};c.contacts.push({actor:'senate',target:'parthia',id,route:'formal',status:'open',trust:70,relationship:{familiarity:75,trust:70,respect:70,professional:30,alignment:60,obligation:0,rivalry:0,willingness:75}});
 assert.equal(offerEmployment(s,'parthia',id,'senate','military').ok,true);
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.offers.at(-1).status,'accepted');assert.equal(army.owner,'parthia');assert.equal(army.characterId,null);
 assert.equal(s.world.characters[id].faction,'senate');
});
test('AI governments seek talent from their own territories',()=>{
 const s=newGame('senate'),c=initializeCursus(s);s.year=-48;s.month=2;advanceCursus(s);
 assert.ok(c.talentSearches.some(x=>x.actor==='caesar'&&x.status==='pending'));
});

test('twenty-year government simulation preserves elections, careers, intelligence and save state',()=>{
 const s=newGame('senate'),c=initializeCursus(s);s.wars=[];
 for(const f of Object.values(s.factions))f.treasury=10000;
 for(let i=0;i<240;i++){advanceCursus(s);if(s.month===12){s.year++;s.month=1}else s.month++}
 const consuls=c.elections.filter(x=>x.office==='consul');
 assert.equal(consuls.length,20);assert.ok(consuls.every(x=>x.body==='centuriate'&&x.ballots.length===386));
 assert.equal(c.politicalReviews.length,20);
 assert.ok(c.careers&&Object.values(c.careers).some(h=>h.some(x=>x.source==='election')));
 assert.ok(c.intel.caesar?.senate?.reports?.length>0);
 assert.ok(c.talentSearches.some(x=>x.actor==='caesar'));
 const saved=upgradeSave(structuredClone(s));assert.equal(saved.world.cursus.elections.length,c.elections.length);
 assert.equal(saved.world.cursus.politicalReviews.length,20);
});

test('campaign phases allow distinct actions while withdrawn candidates leave the ballot',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId,app=campaignFor(s,id);
 const start=s.factions.senate.treasury;
 assert.equal(supportCandidate(s,id,'speech').ok,true);
 assert.ok(app.support>0);assert.equal(s.factions.senate.treasury,start-4);
 assert.equal(supportCandidate(s,id,'family').ok,true);
 assert.ok(app.promises.some(x=>x.kind==='patronage'));
 assert.equal(supportCandidate(s,id,'games').reason,'authority');
 assert.equal(supportCandidate(s,id,'negotiate').ok,true);
 assert.ok(['completed','refused'].includes(c.campaignActions.at(-1).outcome));
 const aedile=c.applicants.find(x=>x.office==='aedile'&&x.faction==='senate');
 assert.equal(supportCandidate(s,aedile.id,'games').ok,true);
 const rival=c.applicants.find(x=>x.office==='consul'&&x.faction==='senate'&&x.id!==id);
 rival.status='withdrawn';s.month=10;
 const election=resolveElection(s,'consul').result;
 assert.ok(!election.candidates.some(x=>x.id===rival.id));
});

test('campaign estimate reports uncertainty without predicting the ballot',()=>{
 const s=newGame('senate'),c=initializeCursus(s),estimate=campaignEstimate(s,c.varroId);
 assert.ok(['strong_lead','narrow_lead','competitive','trailing','uncertain'].includes(estimate.tier));
 assert.ok(['low','moderate'].includes(estimate.certainty));
 assert.equal(estimate.observed.year,s.year);
 assert.equal(estimate.ballots,undefined);
});

test('distinct official contact routes enforce delivered evidence and real networks',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 s.factions.senate.treasury=1000;
 c.intel.senate={parthia:{stage:3,reports:[{stage:3,people:[id],officeholders:{administration:id},commanders:[id],observed:{year:s.year,month:s.month}}]}};
 c.networks[c.varroId]=[id];
 for(const route of ['banquet','provincial_visit','military_visit','family','ceremony']){
  const result=contactOfficial(s,'parthia',id,route);
  assert.equal(result.ok,true,route);assert.ok(result.cost>0&&result.months>0);
  c.contacts.at(-1).status='refused';
 }
 const senator=c.senators.find(x=>x.faction==='caesar');
 c.intel.senate.caesar={stage:3,reports:[{stage:3,people:[senator.id],senators:[senator.id],observed:{year:s.year,month:s.month}}]};
 assert.equal(contactOfficial(s,'caesar',senator.id,'senatorial').ok,true);
 const unknown=c.foreignPosts.egypt.administration;
 assert.equal(contactOfficial(s,'egypt',unknown,'banquet').reason,'unknown');
});

test('annual review records real administrative appointments without inventing opening assignments',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.equal(c.appointmentHistory.length,0);
 assert.equal(appointOffice(s,'finance',id).ok,true);
 s.month=12;advanceCursus(s);
 const review=c.politicalReviews.at(-1);
 assert.ok(review.appointed.some(x=>x.id===id&&x.office==='finance'&&x.faction==='senate'));
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.appointmentHistory.at(-1).id,id);
});

test('campaign promises retain their public policy and separate enactment cost',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.equal(supportCandidate(s,id,'promise','senate','grain_relief').ok,true);
 const promise=campaignFor(s,id).promises.at(-1);
 assert.equal(promise.kind,'grain_relief');assert.equal(promise.requiredAction,'grain_relief');assert.equal(promise.cost,10);
 assert.equal(promise.status,'offered');assert.equal(upgradeSave(structuredClone(s)).world.cursus.applicants.find(x=>x.id===id).promises.at(-1).kind,'grain_relief');
});

test('institutional blockage differs from abandoning a campaign promise',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId,app=campaignFor(s,id);
 app.status='elected';app.promises.push({id:'promise:test:blocked',by:'senate',year:s.year,month:1,kind:'public_works',requiredAction:'public_works',deadlineYear:s.year,status:'pending'});
 c.proposals.push({actor:'senate',kind:'public_works',status:'opposed',remaining:0,year:s.year,month:2});
 s.year++;s.month=1;advanceCursus(s);
 assert.equal(app.promises.at(-1).status,'blocked');
 assert.equal(app.promises.at(-1).resolved.reason,'blocked');
});

test('past applications and commitments remain in saved political history',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.equal(supportCandidate(s,id,'promise').ok,true);
 for(let i=0;i<3;i++){s.year++;s.month=1;advanceCursus(s)}
 assert.ok(c.applicationHistory.some(x=>x.id===id&&x.promises.some(p=>p.kind==='public_works')));
 assert.ok(upgradeSave(structuredClone(s)).world.cursus.applicationHistory.some(x=>x.id===id));
});

test('Lucius Varro can lose a real assembly ballot and remain a political character',()=>{
 const s=newGame('senate'),c=initializeCursus(s),varro=campaignFor(s,c.varroId);
 varro.support=0;varro.opposition=150;
 for(const rival of c.applicants.filter(x=>x.year===s.year&&x.office==='consul'&&x.faction==='senate'&&x.id!==c.varroId))rival.support=80;
 s.month=10;const result=resolveElection(s,'consul').result;
 assert.equal(result.body,'centuriate');assert.equal(result.ballots.length,386);
 assert.ok(!result.elected.includes(c.varroId));assert.equal(varro.status,'lost');
 assert.ok(s.world.characters[c.varroId].alive);
});

test('a stale scholar report permits an uncertain contact without revealing the current office',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.scholar;
 c.intel.senate={parthia:{stage:4,reports:[{stage:4,people:[id],officeholders:{scholar:id},observed:{year:s.year-1,month:1}}]}};
 delete c.foreignPosts.parthia.scholar;
 const result=contactOfficial(s,'parthia',id,'scholarly');
 assert.equal(result.ok,true);assert.equal(result.months,4);
 assert.equal(c.contacts.at(-1).status,'pending');
});

test('plebeian aediles are elected by the Plebeian Council in paired seats',()=>{
 const s=newGame('senate'),c=initializeCursus(s);
 const pool=c.applicants.filter(x=>x.year===s.year&&x.faction==='senate'&&x.office==='plebeian_aedile');
 assert.ok(pool.length>=3);assert.ok(pool.every(x=>officeEligibility(s,x.id,'plebeian_aedile').ok));
 s.month=12;const result=resolveElection(s,'plebeian_aedile').result;
 assert.equal(result.body,'plebeian');assert.equal(result.elected.length,2);
 assert.equal(result.ballots.length,16);
});

test('low obedience impedes political coordination without erasing professional routine work',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.equal(appointOffice(s,'finance',id).ok,true);
 const routine=officeEffects(s,'senate').treasury,before=institutionalBalance(s).magistrate;
 assert.equal(routine,2);
 changeObedience(s,id,-15,'disputed instructions');
 assert.equal(officeEffects(s,'senate').treasury,routine);
 assert.ok(institutionalBalance(s).magistrate<before);
});

test('foreign offices vacate on death while the old report stays stale until reinvestigation',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 c.intel.senate={parthia:{stage:3,reports:[{stage:3,people:[id],officeholders:{administration:id},observed:{year:s.year,month:s.month}}]}};
 s.world.characters[id].alive=false;s.world.characters[id].health='deceased';
 advanceCursus(s);
 assert.equal(c.foreignPosts.parthia.administration,undefined);
 assert.equal(governmentReport(s,'parthia').reports.at(-1).officeholders.administration,id);
 assert.equal(officialKnowledge(s,'parthia',id).level,'identified');
 const attempt=contactOfficial(s,'parthia',id,'formal');assert.equal(attempt.ok,true);
 for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.contacts.at(-1).status,'refused');
});

test('stale employment contact spends time before a lapsed offer is known',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
 c.contacts.push({actor:'senate',target:'parthia',id,route:'formal',status:'open',trust:45});
 s.world.characters[id].faction='egypt';
 const before=s.factions.senate.treasury;
 assert.equal(offerEmployment(s,'parthia',id).ok,true);
 assert.equal(s.factions.senate.treasury,before-18);
 for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.offers.at(-1).status,'lapsed');
});

test('appointed applicants can be interviewed, postponed and then appointed through one office system',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 c.talents.push({actor:'senate',id,field:'provincial',regionId:'roma',year:s.year,month:s.month});
 const start=s.factions.senate.treasury;
 assert.equal(reviewApplicant(s,id,'interview').ok,true);
 assert.equal(s.factions.senate.treasury,start-3);
 advanceCursus(s);
 const report=c.applicationReviews.at(-1).report;
 assert.ok(['strong','credible','uncertain'].includes(report.qualification));
 assert.equal(report.education,undefined);
 s.month=2;assert.equal(reviewApplicant(s,id,'postpone').ok,true);
 assert.equal(appointmentApplicationStatus(s,id).reason,'postponed');
 assert.equal(appointOffice(s,'finance',id).reason,'postponed');
 s.month=5;assert.equal(appointOffice(s,'finance',id).ok,true);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.applicationReviews[0].report.source,'interview');
});
test('rejecting an application preserves the person and expires next year',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 c.talents.push({actor:'senate',id,field:'provincial',regionId:'roma',year:s.year,month:s.month});
 assert.equal(reviewApplicant(s,id,'reject').ok,true);
 assert.equal(appointOffice(s,'finance',id).reason,'rejected');
 assert.ok(s.world.characters[id].alive);
 s.year++;s.month=1;assert.equal(appointmentApplicationStatus(s,id).ok,true);
});

test('the Curiate Assembly handles formal imperium without replacing a consular election',()=>{
 const s=newGame('senate'),c=initializeCursus(s);s.month=10;
 const result=resolveElection(s,'consul').result;assert.equal(result.elected.length,2);
 s.year++;s.month=1;advanceCursus(s);
 assert.equal(c.curiateFormalities.filter(x=>x.year===s.year&&x.status==='pending').length,2);
 c.assemblies.curiate=10;s.month=2;advanceCursus(s);
 assert.ok(c.curiateFormalities.filter(x=>x.year===s.year).every(x=>x.status==='contested'));
 assert.deepEqual(c.elections.find(x=>x.office==='consul'&&x.year===result.year).elected,result.elected);
});
