import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,tick} from '../han/engine.js?v=faces-name-disagreement-1';
import {ensureRegionalAdministrators,regionalAdministrationFactor} from '../han/field-identities.js';
import {courtPortraitSrc} from '../han/court-portrait.js';
import {applyEffects,focusById} from '../han/focus.js?v=han-1';
import {appoint,startAudit} from '../han/court.js?v=han-1';

test('Han commanderies begin with distinct saved original administrators and portraits',()=>{
 const s=newHanGame('han',{seed:49}),sites=s.regions.filter(r=>r.owner==='han'&&r.kind==='commandery');
 assert.ok(sites.length>15);
 const people=sites.map(site=>s.persons[site.administratorId]);
 assert.equal(new Set(people.map(person=>person.id)).size,sites.length);
 assert.equal(new Set(people.map(person=>person.name[0])).size,sites.length);
 for(const [index,person] of people.entries()){
  assert.equal(person.record,'fictional');assert.equal(person.homeland,sites[index].id);
  assert.equal(person.regionalOffice,sites[index].id);assert.ok(person.career.some(event=>event.kind==='regional_appointment'&&event.region===sites[index].id));
  assert.match(courtPortraitSrc(person,128,s),/data-station%3D%22official%22/);
 }
 const loaded=loadHanSave(JSON.parse(JSON.stringify(s)));
 for(const site of sites){const saved=loaded.regions.find(r=>r.id===site.id);assert.equal(saved.administratorId,site.administratorId);assert.deepEqual(loaded.persons[saved.administratorId].name,s.persons[site.administratorId].name)}
});

test('regional competence changes real Han tax income and an audit spends treasury',()=>{
 const source=newHanGame('han',{seed:49}),low=loadHanSave(JSON.parse(JSON.stringify(source))),high=loadHanSave(JSON.parse(JSON.stringify(source))),site=low.regions.find(r=>r.id==='hongnong'),other=high.regions.find(r=>r.id==='hongnong');
 for(const state of [low,high]){for(const region of state.regions.filter(r=>r.owner==='han'))region.tax=0;state.regions.find(r=>r.id==='hongnong').tax=1000}
 low.persons[site.administratorId].competence=0;high.persons[other.administratorId].competence=100;
 assert.ok(regionalAdministrationFactor(high,other)>regionalAdministrationFactor(low,site));
 tick(low);tick(high);assert.ok(high.factions.han.treasury>low.factions.han.treasury);
 const before=high.factions.han.treasury,result=startAudit(high,other.administratorId);
 assert.equal(result.ok,true);assert.equal(high.factions.han.treasury,before-15);assert.equal(result.audit.target,other.administratorId);
});

test('a converted kingdom gets a named administrator and conquest ends that appointment',()=>{
 const s=newHanGame('han',{seed:49}),site=s.regions.find(r=>r.id==='zhao');
 assert.equal(site.kind,'kingdom');assert.equal(site.administratorId,undefined);
 applyEffects(s,'han',focusById('han','han_f3'));
 assert.equal(site.kind,'commandery');const first=site.administratorId;assert.ok(s.persons[first]?.alive);
 assert.equal(s.log.at(-1).who,first);assert.equal(s.persons[first].career[0].region,site.id);
 site.owner='wusun';ensureRegionalAdministrators(s);
 assert.equal(site.administratorId,null);assert.equal(s.persons[first].regionalOffice,null);assert.ok(s.persons[first].career.some(event=>event.kind==='regional_service_ended'));
 site.owner='han';ensureRegionalAdministrators(s);
 assert.ok(site.administratorId&&site.administratorId!==first);assert.equal(s.persons[first].alive,true);
 const second=site.administratorId;s.persons[second].alive=false;ensureRegionalAdministrators(s);
 assert.ok(site.administratorId!==second&&s.persons[site.administratorId].alive);
});

test('a regional administrator promoted to court leaves a real vacancy',()=>{
 const s=newHanGame('han',{seed:49}),site=s.regions.find(r=>r.id==='hongnong'),id=site.administratorId;
 const result=appoint(s,'dasinong',id);
 assert.equal(result.ok,true);assert.equal(site.administratorId,null);assert.equal(s.persons[id].regionalOffice,null);assert.equal(s.persons[id].office,'dasinong');
 ensureRegionalAdministrators(s);assert.ok(site.administratorId&&site.administratorId!==id);
 assert.equal(s.persons[site.administratorId].regionalOffice,site.id);
});

test('a regional review cannot reimburse an audit it did not open',()=>{
 const s=newHanGame('han',{seed:49}),officials=Object.values(s.persons).filter(person=>person.alive&&person.faction==='han'&&person.regionalOffice);
 const target=officials[((s.year*7+s.month)%officials.length+officials.length)%officials.length];
 assert.equal(startAudit(s,target.id).ok,true);const before=s.factions.han.treasury;
 applyEffects(s,'han',focusById('han','han_b5'));
 assert.equal(s.factions.han.treasury,before);
 assert.equal(s.court.audits.filter(audit=>audit.target===target.id&&audit.status==='open').length,1);
});

test('a regional review selects a real administrator in a BCE year',()=>{
 const s=newHanGame('han',{seed:49}),before=s.factions.han.treasury;
 applyEffects(s,'han',focusById('han','han_b5'));
 assert.equal(s.court.audits.length,1);
 const target=s.persons[s.court.audits[0].target];
 assert.ok(target?.regionalOffice);
 assert.equal(s.factions.han.treasury,before,'the focus pays exactly the audit cost');
});
