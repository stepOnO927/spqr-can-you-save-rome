import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission} from '../engine.js?v=coalition-courier-1';
import {knownLeaders} from '../characters.js?v=succession-ui-recovery-1';
import {advanceOperations,availableAgents} from '../character-system.js?v=portraits-hundred-days-1';
import {advanceConspiracies,reassurePerson,politicalAmbition,potentialConspirators} from '../conspiracies.js?v=succession-ui-recovery-1';
import {supportSuccessor} from '../governance.js?v=portraits-hundred-days-1';
import {resolveDynasticWars} from '../civil-war.js?v=succession-ui-recovery-1';
import {createFictionalPerson} from '../dynasties.js?v=portraits-hundred-days-1';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function unrest(s){s.factions.senate.stability=30;s.world.characters.cato.loyalty=25;}

test('a private plot needs real supporters, resources, preparation and a crisis to change government',()=>{
 const s=newGame('caesar');unrest(s);s.factions.senate.stability=20;s.world.characters.cato.ambition=100;s.world.characters.cato.wealth=50;
 for(const id of ['scipio','cicero']){s.world.characters[id].loyalty=25;s.world.characters[id].ambition=20}
 s.month=3;s.world.intelSeed=seedFor(.2,.21);advanceConspiracies(s);
 assert.equal(s.world.conspiracies.senate.person,'cato');assert.ok(!s.log.some(e=>/plot|阴谋/.test(e.en+e.zh)));assert.deepEqual(knownLeaders(s,'caesar','senate'),['pompey']);
 s.world.conspiracies.senate.remaining=1;advanceConspiracies(s);assert.deepEqual(s.world.leadership.senate,['pompey']);
 for(let i=0;i<35&&s.world.conspiracies.senate;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceConspiracies(s)}
 assert.deepEqual(s.world.leadership.senate,['cato']);assert.ok(s.world.characters.cato.wealth<50);assert.deepEqual(knownLeaders(s,'caesar','senate'),['pompey']);assert.equal(s.world.conspiracies.senate,undefined);
});
test('internal investigation takes time and reports only to its sender',()=>{
 let s=newGame('senate');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:6}};const start=s.factions.senate.treasury;
 assert.equal(queueMission(s,'senate','senate','counter','conspiracy').ok,true);assert.equal(s.factions.senate.treasury,start-8);assert.equal(availableAgents(s,'senate'),2);
 advanceOperations(s);advanceOperations(s);assert.equal(s.operations[0].status,'pending');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');assert.equal(s.knowledge.senate.senate.reports[0].character,'cato');assert.equal(s.knowledge.senate.senate.reports[0].verified,false);assert.equal(s.knowledge.caesar.senate.reports.length,0);assert.equal(availableAgents(s,'senate'),3);
});
test('unrest can generate a false accusation, and no reliable information does not disprove a plot',()=>{
 const s=newGame('senate');unrest(s);queueMission(s,'senate','senate','counter','conspiracy');s.world.intelSeed=seedFor(.4,.45);for(let i=0;i<3;i++)advanceOperations(s);
 assert.equal(s.knowledge.senate.senate.reports[0].character,'cato');assert.equal(s.world.conspiracies?.senate,undefined);
 const q=newGame('senate');unrest(q);q.world.conspiracies={senate:{person:'cato',remaining:6}};queueMission(q,'senate','senate','counter','conspiracy');q.world.intelSeed=seedFor(.2,.22);for(let i=0;i<3;i++)advanceOperations(q);
 assert.equal(q.knowledge.senate.senate.reports[0].value,'unknown');assert.equal(q.world.conspiracies.senate.person,'cato');
});
test('a foreign spy may learn a plot without automatic disclosure to other factions',()=>{
 const s=newGame('caesar');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:6}};assert.equal(queueMission(s,'caesar','senate','spy','conspiracy').ok,true);s.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.senate.reports[0].character,'cato');assert.equal(s.knowledge.egypt.senate.reports.length,0);
});
test('reassurance costs resources, can calm a plot and does not reveal whether one exists',()=>{
 const s=newGame('senate');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:6}};const cash=s.factions.senate.treasury;
 assert.equal(reassurePerson(s,'cato').ok,true);assert.equal(s.factions.senate.treasury,cash-8);assert.equal(s.world.characters.cato.loyalty,40);advanceConspiracies(s);assert.equal(s.world.conspiracies.senate,undefined);
 assert.equal(reassurePerson(s,'cleopatra').reason,'unavailable');assert.equal(queueMission(s,'senate','senate','spy','conspiracy').reason,'unavailable');assert.equal(queueMission(s,'senate','egypt','counter','conspiracy').reason,'unavailable');
});


test('simulated ambition affects political risk and persists without disclosing a secret plot',()=>{
 function setup(ambition){const s=newGame('senate');unrest(s);s.world.characters.cato.ambition=ambition;s.month=3;s.world.intelSeed=seedFor(.26,.27);return s}
 const low=setup(10),high=setup(90);advanceConspiracies(low);advanceConspiracies(high);assert.equal(low.world.conspiracies.senate,undefined);assert.equal(high.world.conspiracies.senate.person,'cato');assert.equal(high.knowledge.senate.senate.reports.length,0);
 let s=newGame('senate');delete s.world.characters.cato.ambition;const initial=politicalAmbition(s,'cato');assert.ok(initial>=35&&initial<=65);assert.equal(supportSuccessor(s,'cato').ok,true);assert.equal(s.world.characters.cato.ambition,initial+5);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(politicalAmbition(s,'cato'),initial+5);
});
test('among similarly disloyal officers, greater ambition increases their priority',()=>{
 const s=newGame('senate');s.world.characters.cato.loyalty=25;s.world.characters.scipio.loyalty=25;s.world.characters.cato.ambition=20;s.world.characters.scipio.ambition=80;assert.equal(potentialConspirators(s,'senate')[0],'scipio');
});


test('domestic trust responds to support and reassurance, survives saves, and lowers plot risk',()=>{
 let s=newGame('senate');const key='cato:pompey';assert.equal(supportSuccessor(s,'cato').ok,true);assert.equal(s.world.personalRelations[key].trust,5);assert.equal(s.world.personalRelations[key].meetings,0);s.world.characters.cato.loyalty=25;assert.equal(reassurePerson(s,'cato').ok,true);assert.equal(s.world.personalRelations[key].trust,10);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.personalRelations[key].trust,10);
 function trial(trust){const x=newGame('senate');unrest(x);x.world.characters.cato.ambition=50;x.world.personalRelations[key]={trust,meetings:0};x.month=3;x.world.intelSeed=seedFor(.25,.26);advanceConspiracies(x);return x}
 assert.equal(trial(0).world.conspiracies.senate.person,'cato');const trusted=trial(100);assert.equal(trusted.world.conspiracies.senate,undefined);assert.equal(trusted.knowledge.caesar.senate.reports.length,0);
});
test('reassurance without a living leader does not invent a relationship',()=>{
 const s=newGame('senate');s.world.characters.cato.loyalty=25;s.world.characters.pompey.alive=false;assert.equal(reassurePerson(s,'cato').ok,true);assert.deepEqual(s.world.personalRelations,{});
});
test('a loyal general with maximum ambition can remain loyal and old countdowns cannot create a coup',()=>{
 let s=newGame('senate');const general=s.world.characters.cato;general.ambition=100;general.loyalty=90;s.factions.senate.stability=20;s.month=3;s.armies.find(a=>a.id==='italy').characterId='cato';
 assert.ok(!potentialConspirators(s,'senate').includes('cato'));for(let i=0;i<24;i++){s.month=s.month%12+1;if(s.month===1)s.year++;advanceConspiracies(s)}assert.deepEqual(s.world.leadership.senate,['pompey']);
 s=newGame('senate');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:1}};s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceConspiracies(s);assert.deepEqual(s.world.leadership.senate,['pompey']);assert.deepEqual(s.world.conspiracies.senate.participants,['cato']);
});
test('an organized general can take an existing army into civil war and victory changes government',()=>{
 const s=newGame('senate');s.factions.senate.stability=20;for(const id of ['cato','scipio','cicero']){s.world.characters[id].loyalty=20;s.world.characters[id].influence=70}
 s.world.characters.cato.ambition=100;const unit=s.armies.find(a=>a.id==='italy'),men=unit.men;unit.characterId='cato';
 s.world.conspiracies={senate:{person:'cato',participants:['cato','scipio','cicero'],funds:5,progress:70,months:20,idle:0,phase:'planning'}};advanceConspiracies(s);
 assert.equal(unit.owner,'senate_claimant');assert.equal(unit.men,men);assert.equal(s.regions.find(r=>r.id==='italiaN').owner,'senate_claimant');assert.equal(s.world.disputes.senate.war.origin,'political_network');
 for(const r of s.regions.filter(r=>r.owner==='senate'))r.owner='senate_claimant';s.armies=s.armies.filter(a=>a.owner!=='senate');resolveDynasticWars(s);
 assert.deepEqual(s.world.leadership.senate,['cato']);assert.equal(s.armies.find(a=>a.id==='italy').owner,'senate');assert.equal(s.factions.senate_claimant,undefined);
});
test('a non-Roman court can develop and investigate its own political network',()=>{
 const s=newGame('egypt');s.factions.egypt.stability=20;s.world.characters.arsinoe.loyalty=20;s.world.characters.arsinoe.ambition=100;s.world.characters.arsinoe.wealth=50;
 for(const name of ['Courtier A','Courtier B']){const id=createFictionalPerson(s,{name,faction:'egypt',birthYear:-80,location:'egypt'});s.world.characters[id].loyalty=20;s.world.characters[id].ambition=10;s.world.characters[id].influence=70}
 s.month=3;s.world.intelSeed=seedFor(.2,.21);advanceConspiracies(s);assert.equal(s.world.conspiracies.egypt.person,'arsinoe');
 assert.ok(queueMission(s,'egypt','egypt','counter','conspiracy').ok);
 for(let i=0;i<40&&s.world.conspiracies.egypt;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceConspiracies(s)}
 assert.deepEqual(s.world.leadership.egypt,['arsinoe']);
});
test('a stalled network returns unspent funds and cannot recruit a marching commander from a stale location',()=>{
 const s=newGame('senate');unrest(s);const cato=s.world.characters.cato;cato.wealth=0;s.month=3;
 s.world.characters.scipio.loyalty=20;const unit=s.armies.find(a=>a.id==='pompey');unit.characterId='scipio';unit.move={to:'italiaS',remaining:1};
 s.world.conspiracies={senate:{person:'cato',participants:['cato'],funds:4,progress:0,months:1,idle:0,phase:'organizing'}};advanceConspiracies(s);
 assert.deepEqual(s.world.conspiracies.senate.participants,['cato']);
 s.world.conspiracies.senate.funds=1;s.world.conspiracies.senate.idle=21;advanceConspiracies(s);
 assert.equal(s.world.conspiracies.senate,undefined);assert.equal(cato.wealth,1);assert.equal(s.world.politicalNetworkHistory[0].outcome,'abandoned');
});
