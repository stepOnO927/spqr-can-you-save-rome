import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=diplomatic-chronicle-1';
import {assignSuccession,knownLeaders,CHARACTER_CATALOG} from '../characters.js?v=succession-ui-recovery-1';
import {advanceGovernments,deriveGovernment} from '../governance.js?v=portraits-hundred-days-1';
import {queueMission,advanceOperations,reportedHealthSubjects} from '../character-system.js?v=portraits-hundred-days-1';
import {createFictionalPerson} from '../dynasties.js?v=portraits-hundred-days-1';
const states={armenia:'artavasdes',numidia:'juba',galatia:'deiotarus',bosporus:'pharnaces'};
const high=Array.from({length:100000},(_,i)=>i).find(i=>((Math.imul(i,1664525)+1013904223)>>>0)/4294967296>.98);
function setup(faction){const s=newGame('caesar'),id=states[faction];s.wars=[];s.world.characters[id].alive=false;s.world.characters[id].health='deceased';assignSuccession(s,faction);s.factions[faction].treasury=100;s.factions[faction].stability=60;s.world.dynasties.seed=1;return s}
function step(s,n=1){for(let i=0;i<n;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceGovernments(s)}}
test('regional courts may recover after a delay using explicitly fictional nominees and real funds',()=>{
 for(const [faction,original] of Object.entries(states)){
  const s=setup(faction);assert.equal(deriveGovernment(s,faction).kind,'vacant');const balance=s.factions[faction].treasury;step(s,6);assert.deepEqual(s.world.leadership[faction],[]);assert.equal(s.factions[faction].treasury,balance);
  step(s);const id=s.world.leadership[faction][0],person=s.world.characters[id];assert.match(id,/^fictional:/);assert.equal(CHARACTER_CATALOG[id].fictional,true);assert.match(CHARACTER_CATALOG[id].name[0],/^Fictional /);assert.deepEqual(person.parents,[]);assert.deepEqual(person.adoptiveParents,[]);assert.equal(s.factions[faction].treasury,balance-5);assert.equal(deriveGovernment(s,faction).kind,'normal');
  const life=s.world.dynasties.lives[id];assert.ok(life.some(x=>/fictional court nominee/.test(x.en)));assert.ok(!life.some(x=>x.en==='Born in the simulated campaign.'));
  assert.deepEqual(knownLeaders(s,'caesar',faction),[original]);assert.ok(!reportedHealthSubjects(s,'caesar',faction).includes(id));assert.ok(!s.log.some(x=>x.en.includes(CHARACTER_CATALOG[id].name[0])));
 }
});
test('a saved vacancy continues without paying twice and a report is required to learn of the nominee',()=>{
 let s=setup('armenia');step(s,3);const started=s.world.courtVacancies.armenia.started;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.courtVacancies.armenia.started,started);step(s,4);const id=s.world.leadership.armenia[0],balance=s.factions.armenia.treasury;assert.ok(id);step(s,4);assert.equal(s.factions.armenia.treasury,balance);assert.deepEqual(s.world.leadership.armenia,[id]);
 const op=queueMission(s,'caesar','armenia','spy','leaders');assert.equal(op.ok,true);for(let i=0;i<op.duration-1;i++){s.month++;advanceOperations(s)}s.world.intelSeed=1000;s.month++;advanceOperations(s);assert.deepEqual(knownLeaders(s,'caesar','armenia'),[id]);assert.equal(s.knowledge.senate.armenia.reports.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(CHARACTER_CATALOG[id].fictional,true);assert.deepEqual(s.world.leadership.armenia,[id]);
});
test('failed deliberation, insufficient funds and living claimants do not force a new ruler',()=>{
 const s=setup('numidia');s.world.dynasties.seed=high;step(s,7);assert.deepEqual(s.world.leadership.numidia,[]);assert.equal(s.world.courtVacancies.numidia.attempts,1);
 s.factions.numidia.treasury=4;s.world.dynasties.seed=1;step(s,3);assert.deepEqual(s.world.leadership.numidia,[]);assert.equal(s.factions.numidia.treasury,4);
 s.factions.numidia.treasury=100;s.world.claimants.numidia=['juba'];s.world.characters.juba.alive=true;step(s,6);assert.deepEqual(s.world.leadership.numidia,[]);
 delete s.world.claimants.numidia;step(s,1);assert.equal(s.world.leadership.numidia.length,1);
});
test('existing legitimate candidates are preferred and lost territory cancels the vacancy clock',()=>{
 const s=setup('galatia');step(s,2);s.regions.find(r=>r.id==='galatia').owner='armenia';step(s);assert.equal(s.world.courtVacancies.galatia,undefined);
 s.regions.find(r=>r.id==='galatia').owner='galatia';step(s);assert.equal(s.world.courtVacancies.galatia.attempts,0);assert.deepEqual(s.world.leadership.galatia,[]);
 const other=setup('galatia'),balance=other.factions.galatia.treasury,candidate=createFictionalPerson(other,{name:['Existing candidate','已有人选'],faction:'galatia',birthYear:other.year-30,location:'galatia'});
 step(other);assert.deepEqual(other.world.leadership.galatia,[candidate]);assert.equal(other.factions.galatia.treasury,balance);assert.equal(other.world.courtVacancies.galatia,undefined);
});
test('a human-controlled court is never assigned an unrequested nominee',()=>{
 const s=newGame('armenia');s.world.characters.artavasdes.alive=false;s.world.characters.artavasdes.health='deceased';assignSuccession(s,'armenia');s.factions.armenia.treasury=100;s.world.dynasties.seed=1;
 step(s,18);assert.deepEqual(s.world.leadership.armenia,[]);assert.equal(s.factions.armenia.treasury,100);assert.equal(s.world.courtVacancies?.armenia,undefined);
});
