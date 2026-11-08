import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=multipolar-2';
import {FACTIONS} from '../data.js?v=phase-x-1';
import {advanceMovements,respondToMovement,reportedMovements,offerMovementSupport,recognizeMovement} from '../movements.js?v=multipolar-2';
import {newRevolutionScenario} from '../scenarios.js?v=multipolar-2';
import {plotFormationChance} from '../conspiracies.js?v=dynasty-id-3';

function crisis(){const s=newGame('caesar'),r=s.regions.find(x=>x.id==='gaul'),f=s.factions.caesar;r.loyalty=5;r.population.satisfaction=10;f.stability=20;f.legitimacy=25;f.tax='high';return {s,r,f}}
function month(s){s.month++;if(s.month>12){s.month=1;s.year++}advanceMovements(s)}
function organize(s){for(let i=0;i<3;i++)month(s);return s.world.movements.find(x=>x.region==='gaul'&&x.parent==='caesar')}
function arm(s,m){for(let i=0;i<80&&m.stage!=='armed';i++)month(s);assert.equal(m.stage,'armed')}
test('several grievances develop into an organized movement rather than an immediate rebellion',()=>{
 const {s,r}=crisis();month(s);assert.equal(r.owner,'caesar');assert.equal(s.world.movements.length,0);month(s);assert.equal(s.world.movements.length,0);month(s);
 const m=s.world.movements.find(x=>x.region==='gaul');assert.ok(m);assert.equal(m.stage,'dissatisfaction');assert.equal(m.objective,'replace_leadership');assert.equal(m.leader,null);
 for(let i=0;i<8;i++)month(s);assert.ok(m.leader);assert.ok(s.world.characters[m.leader]);assert.ok(m.supporters>0&&m.supporters<=r.population.total);assert.equal(r.owner,'caesar');
});
test('negotiation and substantive reform can resolve a movement peacefully and have real costs',()=>{
 const {s,r,f}=crisis();f.legitimacy=60;const m=organize(s),cash=f.treasury,wealth=r.population.householdWealth;assert.equal(m.objective,'reduce_tax');
 assert.ok(respondToMovement(s,'caesar',m.id,'reform').ok);assert.equal(m.stage,'settled');assert.equal(f.treasury,cash-18);assert.equal(f.tax,'normal');assert.equal(r.loyalty,17);assert.equal(r.population.satisfaction,22);assert.equal(r.population.householdWealth,wealth);assert.equal(s.wars.some(w=>w.includes(m.force)),false);
 const t=crisis(),other=organize(t.s),before=t.f.treasury;const outcome=respondToMovement(t.s,'caesar',other.id,'negotiate');assert.ok(outcome.settled);assert.equal(t.f.treasury,before-8);assert.equal(other.outcome,'negotiated');
});
test('a crisis can recruit from the actual population and fight with its own army and faction',()=>{
 let {s,r,f}=crisis();const m=organize(s),beforePeople=r.population.total,beforeFood=f.food;arm(s,m);const army=s.armies.find(a=>a.owner===m.force);
 assert.ok(army);assert.equal(army.men,3000);assert.equal(beforePeople-r.population.total,3000);assert.equal(beforeFood-f.food,8);assert.equal(r.owner,m.force);assert.ok(s.wars.some(w=>w.includes(m.force)&&w.includes('caesar')));assert.ok(s.factions[m.force].treasury>=8);assert.ok(s.world.characters[m.leader].alive);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const restored=s.world.movements.find(x=>x.id===m.id);assert.ok(FACTIONS[restored.force]);assert.equal(s.armies.find(a=>a.owner===restored.force).men,3000);assert.equal(s.world.characters[restored.leader].faction,restored.force);
});
test('victory changes the real government and defeat removes the independent force',()=>{
 const a=crisis(),m=organize(a.s);arm(a.s,m);for(const r of a.s.regions.filter(x=>x.owner==='caesar'))r.owner=m.force;a.s.armies=a.s.armies.filter(x=>x.owner!=='caesar');month(a.s);
 assert.equal(m.stage,'victorious');assert.deepEqual(a.s.world.leadership.caesar,[m.leader]);assert.equal(a.s.factions[m.force],undefined);assert.equal(a.r.owner,'caesar');
 const b=crisis(),n=organize(b.s);arm(b.s,n);b.r.owner='caesar';b.s.armies=b.s.armies.filter(x=>x.owner!==n.force);month(b.s);assert.equal(n.stage,'defeated');assert.equal(b.s.factions[n.force],undefined);assert.equal(b.s.world.characters[n.leader].faction,'caesar');
});
test('a movement can establish a new government even if its first leader dies',()=>{
 const {s}=crisis(),m=organize(s);arm(s,m);const fallen=m.leader;s.world.characters[fallen].alive=false;for(const r of s.regions.filter(x=>x.owner==='caesar'))r.owner=m.force;s.armies=s.armies.filter(x=>x.owner!=='caesar');month(s);
 assert.equal(m.stage,'victorious');assert.notEqual(m.leader,fallen);assert.ok(s.world.characters[m.leader].alive);assert.deepEqual(s.world.leadership.caesar,[m.leader]);
});
test('a negotiated end preserves field troops, and foreign wars are inherited after victory',()=>{
 const peaceful=crisis(),m=organize(peaceful.s);arm(peaceful.s,m);m.radicalism=8;const unit=peaceful.s.armies.find(a=>a.owner===m.force),men=unit.men;
 assert.ok(respondToMovement(peaceful.s,'caesar',m.id,'negotiate').settled);assert.equal(unit.owner,'caesar');assert.equal(unit.men,men);assert.equal(peaceful.r.owner,'caesar');assert.equal(peaceful.s.factions[m.force],undefined);
 const conflict=crisis(),n=organize(conflict.s);arm(conflict.s,n);conflict.s.alliances.push(['caesar','egypt']);conflict.s.wars.push([n.force,'egypt']);
 const funds=conflict.f.treasury;assert.equal(respondToMovement(conflict.s,'caesar',n.id,'negotiate').reason,'foreign_war');assert.equal(conflict.f.treasury,funds);
 for(const r of conflict.s.regions.filter(x=>x.owner==='caesar'))r.owner=n.force;conflict.s.armies=conflict.s.armies.filter(a=>a.owner!=='caesar');month(conflict.s);
 assert.equal(n.stage,'victorious');assert.ok(conflict.s.wars.some(w=>w.includes('caesar')&&w.includes('egypt')));assert.ok(!conflict.s.alliances.some(a=>a.includes('caesar')&&a.includes('egypt')));
});
test('constitutional reform changes oversight, but deeply radicalized opposition may reject it',()=>{
 const {s,f}=crisis(),m=organize(s),before=plotFormationChance(s,'antony');m.radicalism=25;const result=respondToMovement(s,'caesar',m.id,'reform');assert.equal(result.settled,false);assert.ok(s.world.constitutionalOversight.caesar);assert.ok(plotFormationChance(s,'antony')<before);assert.equal(f.stability,25);assert.notEqual(m.stage,'settled');
});
test('a religious institution can support peaceful reform without automatically backing war',()=>{
 const s=newGame('senate'),r=s.regions.find(x=>x.id==='roma'),o=s.world.religiousInstitutions.find(x=>x.region==='roma');r.loyalty=5;r.population.satisfaction=10;s.factions.senate.stability=20;s.factions.senate.tax='high';o.relations.senate=-40;
 for(let i=0;i<20;i++)month(s);const m=s.world.movements.find(x=>x.region==='roma');assert.ok(m.organizations.includes(o.id));assert.equal(m.leader,o.leader);assert.ok(o.wealth<12);assert.notEqual(m.stage,'armed');
});
test('a discontented but institutionally loyal organization can stay outside an opposition movement',()=>{
 const s=newGame('senate'),r=s.regions.find(x=>x.id==='roma'),o=s.world.religiousInstitutions.find(x=>x.region==='roma');r.loyalty=5;r.population.satisfaction=10;s.factions.senate.stability=20;s.factions.senate.tax='high';o.relations.senate=-40;o.institutionalLoyalty=90;
 for(let i=0;i<20;i++)month(s);const m=s.world.movements.find(x=>x.region==='roma');assert.ok(m);assert.ok(!m.organizations.includes(o.id));assert.notEqual(m.leader,o.leader);
});
test('sustained internal disagreement can fragment real supporters and return part of their funds',()=>{
 const {s,r}=crisis(),m=organize(s);m.supporters=5000;m.funds=10;m.cohesion=10;m.radicalism=15;m.negotiations=1;const wealth=r.population.householdWealth;
 for(let i=0;i<3;i++)month(s);const event=m.history.find(h=>h.event==='fragmented');assert.ok(event);assert.ok(event.supporters>0);assert.ok(event.returned>0);assert.ok(r.population.householdWealth>=wealth);assert.equal(m.internalFactions.moderate+m.internalFactions.hardline,100);assert.ok(m.supporters<5000+3*Math.floor(r.population.total*.005));
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))).world.movements.find(x=>x.id===m.id);assert.equal(restored.history.some(h=>h.event==='fragmented'),true);assert.equal(restored.cohesion,35);
});
test('foreign reports are dated observations and do not track hidden subsequent changes',()=>{
 const s=newGame('caesar'),r=s.regions.find(x=>x.id==='italiaN'),f=s.factions.senate;r.loyalty=5;r.population.satisfaction=10;f.stability=20;f.legitimacy=25;f.tax='high';f.treasury=0;
 for(let i=0;i<12;i++)month(s);const m=s.world.movements.find(x=>x.region===r.id);const report=reportedMovements(s,'caesar').find(x=>x.id===m.id);assert.ok(report);assert.ok(report.leader);assert.equal(reportedMovements(s,'egypt').some(x=>x.id===m.id),false);
 s.regions.find(x=>x.id==='cisalpine').owner='senate';m.supporters+=9000;m.stage='crisis';month(s);assert.deepEqual(reportedMovements(s,'caesar').find(x=>x.id===m.id),report);
});
test('foreign financing requires reported contact, takes time, spends actual treasury and never gives control',()=>{
 let s=newGame('caesar'),r=s.regions.find(x=>x.id==='italiaN'),f=s.factions.senate;r.loyalty=5;r.population.satisfaction=10;f.stability=20;f.legitimacy=25;f.tax='high';f.treasury=0;
 for(let i=0;i<12;i++)month(s);const m=s.world.movements.find(x=>x.region===r.id),report=reportedMovements(s,'caesar').find(x=>x.id===m.id);s.world.personalRelations[['antony',report.leader].sort().join(':')]={trust:30,meetings:1};
 const before=s.factions.caesar.treasury,funds=m.funds;assert.ok(offerMovementSupport(s,'caesar',m.id,'antony').ok);assert.equal(s.factions.caesar.treasury,before-10);assert.equal(m.funds,funds);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<4;i++)month(s);const restored=s.world.movements.find(x=>x.id===m.id);assert.equal(s.world.movementContacts[0].status,'accepted');assert.ok(restored.funds>=funds+8);assert.equal(restored.parent,'senate');assert.equal(restored.foreignSupport[0].actor,'caesar');
});
test('an outdated report permits an offer without disclosing that the movement has collapsed',()=>{
 const s=newGame('caesar'),r=s.regions.find(x=>x.id==='italiaN'),f=s.factions.senate;r.loyalty=5;r.population.satisfaction=10;f.stability=20;f.legitimacy=25;f.tax='high';f.treasury=0;
 for(let i=0;i<12;i++)month(s);const m=s.world.movements.find(x=>x.region===r.id),report=reportedMovements(s,'caesar').find(x=>x.id===m.id);s.world.personalRelations[['antony',report.leader].sort().join(':')]={trust:30,meetings:1};m.stage='collapsed';
 assert.ok(offerMovementSupport(s,'caesar',m.id,'antony').ok);assert.equal(s.world.movementContacts[0].status,'pending');for(let i=0;i<4;i++)month(s);assert.equal(s.world.movementContacts[0].status,'no_reply');
});
test('public recognition changes relations and movement support without giving control',()=>{
 const s=newGame('caesar'),r=s.regions.find(x=>x.id==='italiaN'),f=s.factions.senate;r.loyalty=5;r.population.satisfaction=10;f.stability=20;f.legitimacy=25;f.tax='high';f.treasury=0;
 for(let i=0;i<12;i++)month(s);const m=s.world.movements.find(x=>x.region===r.id),cash=s.factions.caesar.treasury,relations=s.relations['caesar:senate']??0;
 assert.ok(recognizeMovement(s,'caesar',m.id).ok);assert.equal(s.factions.caesar.treasury,cash-5);assert.equal(s.relations['caesar:senate'],relations-8);assert.ok(m.recognizedBy.includes('caesar'));assert.equal(m.parent,'senate');
 const recognized=JSON.parse(JSON.stringify(s)),unrecognized=JSON.parse(JSON.stringify(s));unrecognized.world.movements.find(x=>x.id===m.id).recognizedBy=[];month(recognized);month(unrecognized);assert.ok(recognized.world.movements.find(x=>x.id===m.id).supporters>unrecognized.world.movements.find(x=>x.id===m.id).supporters);
 assert.ok(recognizeMovement(s,'caesar',m.id,false).ok);assert.ok(!m.recognizedBy.includes('caesar'));assert.equal(s.relations['caesar:senate'],relations-5);
});
test('the playable crisis scenario creates opposition through normal simulation and permits peaceful reform',()=>{
 for(const side of ['caesar','senate']){let s=newRevolutionScenario(side),id=side==='senate'?'sicilia':'gaul';assert.equal(s.scenario,'revolution');for(let i=0;i<3;i++)tick(s);const m=s.world.movements.find(x=>x.region===id&&x.parent===side);assert.ok(m);assert.equal(s.regions.find(x=>x.id===id).owner,side);assert.ok(respondToMovement(s,side,m.id,'reform').settled);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.scenario,'revolution');assert.equal(s.world.movements.find(x=>x.id===m.id).outcome,'reform')}
});
