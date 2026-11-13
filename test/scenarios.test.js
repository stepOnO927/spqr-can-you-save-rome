import test from 'node:test';
import assert from 'node:assert/strict';
import {newScenario} from '../scenarios.js?v=court-portraits-1';
import {tick,upgradeSave} from '../engine.js?v=court-portraits-1';
import {potentialConspirators} from '../conspiracies.js?v=separate-crowns-1';
import {leaveCoalition} from '../coalitions.js?v=fort-intel-1';
import {fictionalPortraitKey,observedFictionalPortrait} from '../portrait-registry.js?v=court-portraits-1';
import {advancePersonalPlans} from '../personal-plans.js?v=multipolar-2';

test('both Roman sides can start and reload each required scenario',()=>{
 for(const player of ['caesar','senate'])for(const kind of ['historical','ambitious_general','three_state_coalition','civic_movement','revolution']){
  let s=newScenario(kind,player);assert.equal(s.player,player);s=upgradeSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<3;i++)tick(s);assert.equal(s.player,player);
 }
});
test('the fictional general has real command and does not revolt merely due to ambition',()=>{
 const s=newScenario('ambitious_general','senate'),person=s.world.characters[s.scenarioGeneral],army=s.armies.find(a=>a.characterId===person.id);
 assert.ok(army&&army.men>0);assert.equal(army.skill,5);assert.equal(person.ambition,95);assert.ok(!potentialConspirators(s,'senate').includes(person.id));assert.ok(Object.keys(s.world.personalRelations).filter(k=>k.includes(person.id)).length>=3);
});
test('the scenario general keeps a unique portrait without crossing save identities',()=>{
 for(const player of ['caesar','senate']){let s=newScenario('ambitious_general',player),id=s.scenarioGeneral;assert.equal(fictionalPortraitKey(s,id),'fictional-varus');s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(fictionalPortraitKey(s,id),'fictional-varus');const other=newScenario('historical',player);other.scenarioGeneral=id;assert.equal(fictionalPortraitKey(other,id),null);s.world.dynasties.catalog[id].name=['Another person','另一个人物'];assert.equal(fictionalPortraitKey(s,id),null);}
 const s=newScenario('ambitious_general','senate'),id=s.scenarioGeneral;s.player='caesar';assert.equal(observedFictionalPortrait(s,id),null);s.meetings.push({actor:'caesar',target:id,status:'met',portraitKey:'fictional-varus',resolvedYear:s.year,resolvedMonth:s.month});assert.equal(observedFictionalPortrait(s,id),'fictional-varus');s.player='egypt';assert.equal(observedFictionalPortrait(s,id),null);
});
test('the ambitious general builds influence, cultivates allies in a crisis, and can return to a loyal plan',()=>{
 let s=newScenario('ambitious_general','senate'),id=s.scenarioGeneral,general=s.world.characters[id],before=general.influence,wealth=general.wealth;s.month=3;advancePersonalPlans(s);
 assert.equal(s.world.personalPlans[id].focus,'cultivate_influence');assert.equal(general.influence,before+1);assert.equal(general.wealth,wealth-1);assert.equal(s.world.conspiracies?.senate,undefined);const personality=s.world.personalities[id];assert.ok(personality);
 general.loyalty=30;s.factions.senate.stability=25;s.month=9;advancePersonalPlans(s);assert.equal(s.world.personalPlans[id].focus,'build_network');s.month=12;advancePersonalPlans(s);assert.ok(s.world.personalPlans[id].contactsMade>0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters[id].loyalty=80;s.year++;s.month=3;advancePersonalPlans(s);assert.equal(s.world.personalPlans[id].focus,'cultivate_influence');assert.equal(s.world.personalities[id],personality);assert.deepEqual(s.world.leadership.senate,['pompey']);
});
test('the coalition is an actual independent agreement with consequences for leaving',()=>{
 const s=newScenario('three_state_coalition','caesar'),c=s.coalitions[0];assert.deepEqual(c.parties,['armenia','galatia','bosporus']);assert.ok(c.jointPlan&&c.obligations.length);const before=s.relations['armenia:galatia'];
 assert.equal(c.contributions.armenia.policy,'military');assert.equal(c.contributions.galatia.policy,'funding');assert.equal(c.contributions.bosporus.policy,'supplies');
 assert.ok(leaveCoalition(s,c.id,'galatia').ok);assert.ok(s.relations['armenia:galatia']<before);assert.equal(c.status,'dissolved');
});
test('the civic scenario begins with a real local organization, grievance and no forced violence',()=>{
 for(const player of ['caesar','senate']){const s=newScenario('civic_movement',player),o=s.world.religiousInstitutions.find(x=>x.id===s.scenarioInstitution),region=s.regions.find(r=>r.id===o.region);assert.equal(region.owner,player);assert.ok(o.council.length>=2);assert.ok(region.population.satisfaction<35);assert.equal(s.world.movements.some(m=>m.stage==='armed'),false);}
});

test('civic scenario portraits use identity and seat, surviving saves without leaking into other campaigns',()=>{
 let s=newScenario('civic_movement','caesar');const [a,b]=s.world.religiousInstitutions.find(i=>i.id==='scenario_civic').council;assert.equal(fictionalPortraitKey(s,a),'fictional-sennius');assert.equal(fictionalPortraitKey(s,b),'fictional-mara');s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(fictionalPortraitKey(s,a),'fictional-sennius');assert.equal(fictionalPortraitKey(s,b),'fictional-mara');s.world.dynasties.catalog[a].name=['Different person','另一个人物'];assert.equal(fictionalPortraitKey(s,a),null);s.player='senate';assert.equal(observedFictionalPortrait(s,b),null);s.meetings.push({actor:'senate',target:b,status:'met',portraitKey:'fictional-mara',resolvedYear:s.year,resolvedMonth:s.month});assert.equal(observedFictionalPortrait(s,b),'fictional-mara');s.player='egypt';assert.equal(observedFictionalPortrait(s,b),null);
});
