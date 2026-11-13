import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,forecastEconomy} from '../engine.js?v=cursus-crowns-1';
import {appointOffice} from '../office-system.js?v=fort-intel-1';
import {initializeCursus,officeEligibility,supportCandidate,investigateCandidate,resolveElection,advanceCursus,investigateGovernment,governmentReport,knownForeignOfficial,contactOfficial,cultivateOfficial,offerEmployment,obedience,institutionalBalance,proposeMeasure} from '../cursus-honorum.js?v=cursus-crowns-1';

test('fictional candidates are persistent people; Roman consuls require an assembly election',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.ok(id.startsWith('fictional:'));assert.equal(s.world.characters[id].faction,'senate');
 assert.equal(c.magistrates.consul.length,0);assert.equal(officeEligibility(s,id,'consul').ok,true);
 for(const office of ['praetor','quaestor','aedile','tribune'])assert.ok(c.applicants.filter(x=>x.office===office&&x.faction==='senate').length>=2);
 const treasury=s.factions.senate.treasury,before=obedience(s,id);
 assert.equal(supportCandidate(s,id,'support').ok,true);
 assert.equal(s.factions.senate.treasury,treasury-8);
 assert.ok(obedience(s,id)>before);assert.equal(c.magistrates.consul.length,0);
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
 assert.equal(contactOfficial(s,target,official,'scholarly').reason,'profession');
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
