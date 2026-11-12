import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=mission-discount-1';
import {initializeReligion,religiousPolicy,advanceReligion,religiousTaxCost,populationFactor} from '../religion.js?v=safe-save-1';
import {CHARACTER_CATALOG} from '../characters.js?v=safe-save-1';
import {createFictionalPerson} from '../dynasties.js?v=safe-save-1';

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
