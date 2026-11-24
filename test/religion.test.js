import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=dossier-archive-1';
import {initializeReligion,religiousPolicy,advanceReligion,religiousTaxCost,populationFactor} from '../religion.js?v=dossier-archive-1';
import {CHARACTER_CATALOG} from '../characters.js?v=dossier-archive-1';
import {createFictionalPerson} from '../dynasties.js?v=dossier-archive-1';

test('49 BCE institutions use existing characters and populations, without an anachronistic church',()=>{
 const s=newGame('senate'),list=s.world.religiousInstitutions;
 assert.equal(list.length,3);assert.ok(list.every(o=>s.world.characters[o.leader]&&s.world.characters[o.leader].institutionalOnly));
 assert.ok(list.every(o=>o.followers>0&&o.followers<=s.regions.find(r=>r.id===o.region).population.total));
 assert.ok(list.every(o=>!JSON.stringify(o).toLowerCase().match(/church|bishop|papacy/)));assert.equal(CHARACTER_CATALOG[list[0].leader].fictional,true);
 const first=JSON.stringify(list);initializeReligion(s);assert.equal(JSON.stringify(list),first);
});
test('old saves acquire population and institutions once without resetting people, regions or resources',()=>{
 let s=newGame('senate');const leader=s.world.leadership.senate[0];s.world.characters[leader].ambition=88;s.factions.senate.treasury=17;s.regions.find(r=>r.id==='roma').population.total=123456;
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters[leader].ambition,88);assert.equal(s.factions.senate.treasury,17);assert.equal(s.regions.find(r=>r.id==='roma').population.total,123456);const ids=s.world.religiousInstitutions.map(o=>o.id);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.world.religiousInstitutions.map(o=>o.id),ids);
 const old=newGame('caesar');delete old.world.religiousInstitutions;delete old.world.religionSeeded;for(const r of old.regions)delete r.population;const loyalty=old.regions[0].loyalty;const loaded=upgradeSave(JSON.parse(JSON.stringify(old)));assert.ok(loaded.regions.every(r=>r.population.total>0));assert.equal(loaded.regions[0].loyalty,loyalty);
});
test('sponsorship transfers real treasury, privileges change taxes, and policy affects population',()=>{
 const s=newGame('senate'),o=s.world.religiousInstitutions.find(x=>x.id==='roman_college'),r=s.regions.find(x=>x.id==='roma'),cash=s.factions.senate.treasury,wealth=o.wealth;
 assert.ok(religiousPolicy(s,'senate',o.id,'sponsor').ok);assert.equal(s.factions.senate.treasury,cash-10);assert.equal(o.wealth,wealth+10);
 assert.ok(religiousPolicy(s,'senate',o.id,'privilege').ok);assert.equal(religiousTaxCost(s,'senate'),1);
 const satisfaction=r.population.satisfaction,relation=o.relations.senate;assert.ok(religiousPolicy(s,'senate',o.id,'restrict').ok);assert.ok(r.population.satisfaction<satisfaction);assert.equal(o.relations.senate,relation-20);
 const parallel=JSON.parse(JSON.stringify(s));parallel.world.religiousInstitutions.find(x=>x.id===o.id).privilegedBy=[];tick(s);tick(parallel);assert.equal(s.factions.senate.treasury,parallel.factions.senate.treasury-1);assert.equal(o.wealth,wealth+11);
});
test('institutions grow from local population, spend their own funds and can change leadership peacefully',()=>{
 const s=newGame('senate'),o=s.world.religiousInstitutions.find(x=>x.id==='roman_college'),r=s.regions.find(x=>x.id==='roma');r.population.satisfaction=40;o.relations.senate=-10;o.factions.civic=64;o.factions.traditional=36;const followers=o.followers,leader=o.leader;s.month=6;
 advanceReligion(s);assert.ok(o.followers>followers);assert.ok(o.followers<=r.population.total);assert.ok(r.population.satisfaction>40);assert.notEqual(o.leader,leader);assert.equal(o.leader,o.council[1]);assert.ok(o.history.some(x=>x.action==='relief'));
});
test('a privilege can be revoked and a deceased institutional leader leaves a real vacancy or successor',()=>{
 const s=newGame('senate'),o=s.world.religiousInstitutions.find(x=>x.id==='roman_college');assert.ok(religiousPolicy(s,'senate',o.id,'privilege').ok);const relation=o.relations.senate;assert.ok(religiousPolicy(s,'senate',o.id,'revoke').ok);assert.equal(religiousTaxCost(s,'senate'),0);assert.equal(o.relations.senate,relation-8);
 s.world.characters[o.leader].alive=false;advanceReligion(s);assert.equal(o.leader,o.council[1]);s.world.characters[o.leader].alive=false;advanceReligion(s);assert.equal(o.leader,null);
});
test('population hardship affects subsequent tax potential and investigation is delayed and uncertain',()=>{
 const s=newGame('senate'),o=s.world.religiousInstitutions.find(x=>x.id==='roman_college'),r=s.regions.find(x=>x.id==='roma');assert.equal(populationFactor(r),1);
 assert.ok(religiousPolicy(s,'senate',o.id,'investigate').ok);assert.equal(s.world.religionReports.senate,undefined);s.factions.senate.food=-1;s.month=11;advanceReligion(s);s.month=12;advanceReligion(s);assert.ok(r.population.total<r.population.baseline);assert.ok(populationFactor(r)<1);s.month=1;s.year++;advanceReligion(s);assert.ok(['suspected','no_evidence'].includes(s.world.religionReports.senate[0].value));assert.equal(s.world.religionReports.senate[0].confidence,'unverified');
});
test('hardship causes bounded migration along a friendly land route without creating people or wealth',()=>{
 let s=newGame('caesar'),from=s.regions.find(r=>r.id==='gaul'),to=s.regions.find(r=>r.id==='narbo');
 for(const r of s.regions)r.population.satisfaction=65;
 from.population.satisfaction=10;to.population.satisfaction=90;s.factions.caesar.food=100;s.month=12;
 const fromBefore=from.population.total,toBefore=to.population.total,wealthBefore=from.population.householdWealth+to.population.householdWealth;
 advanceReligion(s);
 const record=s.world.populationMigrations.find(x=>x.from==='gaul');assert.ok(record);
 assert.equal(record.to,'narbo');assert.ok(record.count>0&&record.count<=800);
 assert.equal(from.population.total,Math.round(fromBefore*.998)-record.count);
 assert.equal(to.population.total,Math.round(toBefore*1.002)+record.count);
 assert.equal(from.population.householdWealth+to.population.householdWealth,wealthBefore+Math.floor(from.food/2)+Math.floor(to.food/2));
 assert.match(s.log[0].en,/people moved from Further Gaul to Narbonensis/);
 s=upgradeSave(structuredClone(s));assert.deepEqual(s.world.populationMigrations.find(x=>x.from==='gaul'),record);
});
test('population does not migrate across a sea link or an unfriendly border',()=>{
 const s=newGame('senate'),island=s.regions.find(r=>r.id==='sicilia');
 for(const r of s.regions)r.population.satisfaction=90;
 island.population.satisfaction=10;s.month=12;advanceReligion(s);
 assert.ok(!(s.world.populationMigrations||[]).some(x=>x.from==='sicilia'));
 const border=s.regions.find(r=>r.id==='italiaN'),neighbor=s.regions.find(r=>r.id==='cisalpine');border.population.satisfaction=10;neighbor.population.satisfaction=90;s.month=12;advanceReligion(s);
 assert.ok(!(s.world.populationMigrations||[]).some(x=>x.from==='italiaN'&&x.to==='cisalpine'));
});
test('36 monthly population updates keep gradual migration recorded across three years',()=>{
 let s=newGame('caesar');for(const r of s.regions)r.population.satisfaction=65;
 s.regions.find(r=>r.id==='gaul').population.satisfaction=10;s.regions.find(r=>r.id==='narbo').population.satisfaction=90;s.factions.caesar.food=100;
 for(let i=0;i<36;i++){s.year=-49+Math.floor(i/12);s.month=i%12+1;advanceReligion(s);if(i===17)s=upgradeSave(structuredClone(s))}
 const records=s.world.populationMigrations.filter(x=>x.from==='gaul');assert.equal(records.length,3);
 assert.ok(records.every(x=>x.to==='narbo'&&x.month===12&&x.count>0&&x.count<=800));
 assert.ok(records[0].count>=records[2].count,'movement should shrink as the origin loses population');
});
test('a restrictive policy can cause actual relocation when local conditions cross the hardship threshold',()=>{
 const setup=()=>{const s=newGame('senate');for(const r of s.regions)r.population.satisfaction=65;s.regions.find(r=>r.id==='roma').population.satisfaction=45;s.regions.find(r=>r.id==='italiaN').population.satisfaction=90;s.factions.senate.food=100;s.month=12;return s};
 const control=setup(),restricted=setup(),college=restricted.world.religiousInstitutions.find(o=>o.id==='roman_college');
 assert.ok(religiousPolicy(restricted,'senate',college.id,'restrict').ok);
 advanceReligion(control);advanceReligion(restricted);
 assert.ok(!(control.world.populationMigrations||[]).some(x=>x.from==='roma'));
 assert.ok(restricted.world.populationMigrations.some(x=>x.from==='roma'&&x.to==='italiaN'));
 assert.ok(restricted.regions.find(r=>r.id==='roma').population.total<control.regions.find(r=>r.id==='roma').population.total);
});
test('new campaigns do not inherit fictional people created in another campaign',()=>{
 const first=newGame('caesar'),id=createFictionalPerson(first,{name:'Prior campaign only',faction:'senate',birthYear:-80,location:'roma'});assert.ok(first.world.characters[id]);
 const second=newGame('caesar');assert.equal(second.world.characters[id],undefined);assert.equal(second.world.religiousInstitutions.length,3);
});
test('splitting an old theater preserves an existing population rather than duplicating it',()=>{
 const s=newGame('caesar');s.regions=s.regions.filter(r=>r.id!=='egyptUpper');const parent=s.regions.find(r=>r.id==='egypt');parent.population={total:180000,baseline:180000,satisfaction:60};
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),parts=restored.regions.filter(r=>['egypt','egyptUpper'].includes(r.id));assert.equal(parts.reduce((n,r)=>n+r.population.total,0),180000);assert.equal(parts.reduce((n,r)=>n+r.population.baseline,0),180000);
 const institution=restored.world.religiousInstitutions.find(o=>o.region==='egyptUpper');assert.ok(institution.followers<=parts.find(r=>r.id==='egyptUpper').population.total);
});
test('AI governments can spend treasury to address religious tensions in their own territory',()=>{
 const s=newGame('caesar'),o=s.world.religiousInstitutions.find(x=>x.id==='roman_college');s.month=6;o.relations.senate=-30;s.factions.senate.treasury=100;
 tick(s);assert.equal(o.relations.senate,-22);assert.ok(o.history.some(x=>x.actor==='senate'&&x.action==='tolerance'));
});
test('different institutions spend their own money on real local education or infrastructure',()=>{
 const s=newGame('senate'),college=s.world.religiousInstitutions.find(o=>o.id==='roman_college'),temple=s.world.religiousInstitutions.find(o=>o.id==='theban_temples'),upper=s.regions.find(r=>r.id==='egyptUpper');
 const pupil=createFictionalPerson(s,{name:'Local pupil',faction:'senate',birthYear:-65,location:'roma'});college.wealth=30;temple.wealth=30;const capacity=upper.supply;s.month=12;advanceReligion(s);
 assert.equal(s.world.characters[pupil].education,6);assert.ok(college.history.some(h=>h.action==='education'&&h.person===pupil));assert.ok(college.wealth<30);
 assert.equal(upper.supply,capacity+1);assert.equal(temple.works,1);assert.ok(temple.history.some(h=>h.action==='infrastructure'));assert.ok(temple.wealth<30);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.world.religiousInstitutions.find(o=>o.id===temple.id).works,1);assert.equal(restored.regions.find(r=>r.id==='egyptUpper').supply,capacity+1);
});
test('a religious official earns a bounded negotiation benefit through completed local works',()=>{
 let s=newGame('senate');const college=s.world.religiousInstitutions.find(o=>o.id==='roman_college'),r=s.regions.find(x=>x.id==='roma'),leader=college.leader;
 college.wealth=30;college.relations.senate=0;r.population.satisfaction=20;
 s.month=6;advanceReligion(s);s.month=12;advanceReligion(s);
 assert.equal(s.world.characters[leader].religiousWorks,2);
 assert.equal(college.history.filter(h=>h.action==='relief'&&h.authority===leader).length,2);
 const beforeRelation=college.relations.senate,beforeSatisfaction=r.population.satisfaction;
 assert.equal(religiousPolicy(s,'senate',college.id,'negotiate').ok,true);
 assert.equal(college.relations.senate,beforeRelation+10);
 assert.equal(r.population.satisfaction,beforeSatisfaction+3);
 assert.equal(college.history.at(-1).authority,leader);
 assert.match(s.log[0].en,/Aulus Fabius helped negotiate/);
 assert.match(s.log[0].zh,/奥卢斯·法比乌斯协助商谈/);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 const saved=s.world.religiousInstitutions.find(o=>o.id==='roman_college'),person=s.world.characters[leader];
 assert.equal(person.religiousWorks,2);assert.equal(saved.history.at(-1).authority,leader);
 person.alive=false;s.year++;s.month=1;advanceReligion(s);assert.equal(saved.leader,saved.council[1]);
 const relation=saved.relations.senate,satisfaction=s.regions.find(x=>x.id==='roma').population.satisfaction;
 assert.equal(religiousPolicy(s,'senate',saved.id,'negotiate').ok,true);
 assert.equal(saved.relations.senate,relation+8);
 assert.equal(s.regions.find(x=>x.id==='roma').population.satisfaction,satisfaction+2);
 assert.equal(saved.history.at(-1).authority,undefined);
});
