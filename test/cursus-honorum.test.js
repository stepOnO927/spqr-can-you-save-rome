import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=cursus-1';
import {initializeCursus,officeEligibility,supportCandidate,resolveElection,advanceCursus,investigateGovernment,governmentReport,contactOfficial,offerEmployment,obedience,institutionalBalance} from '../cursus-honorum.js?v=cursus-1';

test('fictional candidates are persistent people; Roman consuls require an assembly election',()=>{
 const s=newGame('senate'),c=initializeCursus(s),id=c.varroId;
 assert.ok(id.startsWith('fictional:'));assert.equal(s.world.characters[id].faction,'senate');
 assert.equal(c.magistrates.consul.length,0);assert.equal(officeEligibility(s,id,'consul').ok,true);
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
 const armies=s.armies.length,regions=s.regions.length;
 assert.equal(offerEmployment(s,target,official).ok,true);
 s.world.intelSeed=0;for(let i=0;i<3;i++)advanceCursus(s);
 assert.equal(c.offers.at(-1).status,'accepted');
 assert.equal(s.world.characters[official].faction,'senate');
 assert.equal(s.armies.length,armies);assert.equal(s.regions.length,regions);
 assert.equal(c.foreignPosts.parthia.administration,undefined);
 const restored=upgradeSave(structuredClone(s));assert.equal(restored.world.cursus.offers.at(-1).status,'accepted');
});
test('120 monthly turns retain identities, elections and bounded applications',()=>{
 const s=newGame('senate'),id=initializeCursus(s).varroId;
 for(let i=0;i<120;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceCursus(s)}
 assert.equal(s.world.cursus.varroId,id);
 assert.ok(s.world.cursus.elections.length>=10);
 assert.ok(s.world.cursus.applicants.length<100);
 assert.equal(upgradeSave(structuredClone(s)).world.cursus.varroId,id);
});
