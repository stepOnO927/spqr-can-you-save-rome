import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,upgradeSave} from '../engine.js?v=roman-vacancy-1';
import {formCoalition,renameCoalition,leaveCoalition} from '../coalitions.js?v=roman-vacancy-1';
import {knownOrganizations,organizationMapColor,organizationsForOwner} from '../map-lab/organization-map.js';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=roman-vacancy-1';

function joined(){
 const s=newGame('caesar');
 s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;
 s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);
 assert.ok(result.ok,JSON.stringify(result));
 return {s,c:result.coalition};
}

test('organizations retain a charter, member sovereignty and a player chosen name across saves',()=>{
 const {s,c}=joined(),before=s.regions.map(r=>r.owner);
 assert.deepEqual(c.foundingMembers,['caesar','egypt','numidia']);
 assert.equal(c.charter.decision,'independent_members');
 assert.equal(renameCoalition(s,c.id,'egypt','Other name').reason,'authority');
 assert.equal(renameCoalition(s,c.id,'caesar',' <unsafe> ').reason,'name');
 assert.ok(renameCoalition(s,c.id,'caesar','League of the Eagle').ok);
 assert.deepEqual(s.regions.map(r=>r.owner),before);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.coalitions[0].name,'League of the Eagle');
 assert.equal(knownOrganizations(saved,'caesar')[0].name,'League of the Eagle');
});

test('third party map uses only a dated report and respects the selected organization',()=>{
 const {s,c}=joined();
 assert.deepEqual(knownOrganizations(s,'armenia'),[]);
 assert.equal(organizationMapColor(['egypt'],null),'#65756d');
 s.world.diplomaticKnowledge.armenia||={};
 s.world.diplomaticKnowledge.armenia[c.id]={id:c.id,kind:'coalition',name:'Reported League',status:'active',parties:['egypt','numidia'],leader:'egypt',target:'senate',year:s.year,month:s.month};
 const report=knownOrganizations(s,'armenia')[0];
 assert.equal(report.name,'Reported League');
 assert.deepEqual(report.parties,['egypt','numidia']);
 assert.equal(report.cohesion,undefined);
 assert.equal(organizationMapColor(['egypt'],report),'#9673b6');
 assert.equal(organizationMapColor(['caesar'],report),'#65756d');
 assert.equal(organizationMapColor(['egypt','numidia'],report),'#b39757');
 assert.deepEqual(organizationsForOwner([report],'egypt'),[report]);
 assert.deepEqual(organizationsForOwner([report],'caesar'),[]);
});

test('old coalition saves gain charter fields; departure removes active membership',()=>{
 const {s,c}=joined();
 delete c.name;delete c.kind;delete c.charter;delete c.foundingMembers;
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),organization=restored.coalitions[0];
 assert.equal(organization.name,'Defensive Coalition 1');
 assert.deepEqual(organization.foundingMembers,['caesar','egypt','numidia']);
 observeDiplomacy(restored);
 assert.ok(leaveCoalition(restored,organization.id,'egypt').ok);
 assert.deepEqual(knownOrganizations(restored,'caesar').filter(x=>x.status==='active'),[]);
});
