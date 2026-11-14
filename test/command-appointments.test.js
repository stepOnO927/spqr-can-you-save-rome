import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,recruit,upgradeSave,tick,resolveBattle,region,adjacent} from '../engine.js?v=ai-wartime-aid-1';
import {availableCommanders,appointCommander,releaseCommander} from '../command-appointments.js?v=portraits-hundred-days-1';
import {commandFactor,advanceMissingCommanders,advanceCharacters} from '../character-system.js?v=portraits-hundred-days-1';
import {deriveGovernment} from '../governance.js?v=portraits-hundred-days-1';
import {successorFor} from '../characters.js?v=succession-ui-recovery-1';

test('a local friendly person may command a vacant army and the appointment survives saving',()=>{
 let s=newGame('senate');assert.equal(recruit(s,'roma'),true);const unit=s.armies.find(a=>a.id==='levy1');
 assert.ok(availableCommanders(s,unit.id).includes('cato'));assert.ok(!availableCommanders(s,unit.id).includes('pompey'));assert.ok(!availableCommanders(s,unit.id).includes('cleopatra'));
 const base=unit.skill;assert.equal(appointCommander(s,unit.id,'cato').ok,true);assert.equal(unit.skill,base);assert.equal(unit.commander[1],'小加图');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.cato.health='wounded';assert.ok(commandFactor(s,s.armies.find(a=>a.id==='levy1'))<1);tick(s);
 assert.equal(s.armies.find(a=>a.id==='levy1').characterId,'cato');assert.equal(s.world.characters.cato.location,'roma');
});
test('a commander can be replaced or relieved without losing their location',()=>{
 let s=newGame('senate');const army=s.armies.find(a=>a.id==='pompey');assert.ok(availableCommanders(s,army.id).includes('cato'));
 assert.equal(appointCommander(s,army.id,'cato').ok,true);assert.equal(s.world.characters.pompey.location,'roma');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);assert.equal(s.world.characters.pompey.location,'roma');assert.equal(s.armies.find(a=>a.id==='pompey').characterId,'cato');
 assert.equal(releaseCommander(s,'pompey').ok,true);tick(s);assert.equal(s.world.characters.cato.location,'roma');assert.equal(s.armies.find(a=>a.id==='pompey').characterId,null);
 assert.ok(availableCommanders(s,'pompey').includes('pompey'));
});
test('a destroyed army leaves its commander location unknown without claiming death',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),d=s.armies.find(x=>x.id==='pompey'),r=region(s,'roma');a.men=500000;
 for(const edge of adjacent('roma'))region(s,edge.to).owner='caesar';resolveBattle(s,a,d,r);
 assert.ok(!s.armies.some(x=>x.id==='pompey'));assert.equal(s.world.characters.pompey.location,null);assert.equal(s.world.characters.pompey.alive,true);
 tick(s);assert.equal(s.world.characters.pompey.location,null);assert.ok(!s.log.some(e=>e.en.includes("Pompey")&&e.en.includes('location is unknown')));
});
test('a missing leader temporarily cannot govern, then may re-establish contact without informing foreign observers',()=>{
 let s=newGame('senate'),a=s.armies.find(x=>x.id==='xiii'),d=s.armies.find(x=>x.id==='pompey'),r=region(s,'roma');a.men=500000;
 for(const edge of adjacent('roma'))region(s,edge.to).owner='caesar';resolveBattle(s,a,d,r);
 assert.equal(s.world.characters.pompey.location,null);assert.equal(deriveGovernment(s,'senate').kind,'acting_command');assert.deepEqual(s.world.leadership.senate,['pompey']);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<2;i++){s.month++;advanceMissingCommanders(s);assert.equal(s.world.characters.pompey.location,null)}
 s.month++;advanceMissingCommanders(s);assert.ok(s.world.characters.pompey.location);assert.equal(s.world.characters.pompey.missing,undefined);assert.equal(deriveGovernment(s,'senate').kind,'normal');
 assert.ok(s.log.some(x=>x.zh.includes('重新取得联系')));assert.equal(s.knowledge.caesar.senate.reports.length,0);
});
test('a missing person cannot return without controlled territory or be chosen for succession',()=>{
 const s=newGame('caesar');s.world.characters.antony.missing={origin:'cisalpine',remaining:1,year:s.year,month:s.month};s.world.characters.antony.location=null;
 for(const r of s.regions)if(r.owner==='caesar')r.owner='senate';s.world.characters.caesar.alive=false;
 s.month++;advanceMissingCommanders(s);assert.equal(s.world.characters.antony.location,null);assert.equal(s.world.characters.antony.missing.remaining,0);
 assert.equal(deriveGovernment(s,'caesar').kind,'vacant');assert.ok(!successorFor(s,'caesar').includes('antony'));
 region(s,'gaul').owner='caesar';s.month++;advanceMissingCommanders(s);assert.equal(s.world.characters.antony.location,'gaul');
});
test('health events pause while a commander is missing',()=>{
 const s=newGame('senate'),c=s.world.characters.cicero;c.location=null;c.health='dying';c.missing={origin:'roma',remaining:1,year:-50,month:12};s.world.intelSeed=0;
 advanceCharacters(s);assert.equal(c.health,'dying');assert.equal(c.alive,true);assert.ok(!s.log.some(x=>x.en.includes('Cicero')&&x.en.includes('died')));
});
test('normal campaign months advance loss of contact and restore the leader after the third month',()=>{
 const s=newGame('caesar'),person=s.world.characters.caesar,army=s.armies.find(x=>x.id==='xiii');army.characterId=null;army.commander=['Unnamed officer','未具名军官'];person.location=null;person.missing={origin:'cisalpine',remaining:3,year:s.year,month:s.month};
 tick(s);assert.equal(person.location,null);assert.equal(s.world.governments.caesar.kind,'acting_command');tick(s);assert.equal(person.location,null);tick(s);assert.equal(person.missing,undefined);assert.ok(person.location);assert.equal(s.world.governments.caesar.kind,'normal');
});
test('appointments reject remote, occupied, travelling, incapacitated and foreign people without spending resources',()=>{
 const s=newGame('senate');recruit(s,'roma');const unit=s.armies.find(a=>a.id==='levy1'),cash=s.factions.senate.treasury;
 s.world.characters.cato.travel={destination:'epirus'};s.world.characters.scipio.health='seriously_ill';s.world.characters.labienus.location='epirus';
 for(const id of ['cato','scipio','labienus','pompey','cleopatra'])assert.equal(appointCommander(s,unit.id,id).ok,false);
 unit.move={to:'italiaS',remaining:1};assert.deepEqual(availableCommanders(s,unit.id),[]);assert.equal(s.factions.senate.treasury,cash);
});
test('a seriously ill commander is relieved before the army moves or fights',()=>{
 const s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii'),person=s.world.characters.caesar,skill=unit.skill;unit.move={to:'italiaN',remaining:1};person.health='seriously_ill';tick(s);
 assert.equal(unit.characterId,null);assert.deepEqual(unit.commander,['Unnamed officer','未具名军官']);assert.equal(person.location,'cisalpine');assert.equal(unit.skill,skill);assert.equal(s.battles[0].attacker.commander[1],'未具名军官');assert.equal(s.world.governments.caesar.kind,'acting_command');assert.ok(s.log.some(x=>x.zh.includes('重病无法指挥')));
});
test('death leaves the army rating intact and an eligible successor can be assigned',()=>{
 const s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii'),skill=unit.skill;s.world.characters.caesar.health='dying';s.world.intelSeed=1972;advanceCharacters(s);
 assert.equal(s.world.characters.caesar.alive,false);assert.equal(unit.characterId,null);assert.equal(unit.skill,skill);assert.equal(appointCommander(s,unit.id,'antony').ok,true);assert.equal(unit.skill,skill);assert.equal(unit.characterId,'antony');
});
test('a missing commander in an old save is detached without revealing a location',()=>{
 let s=newGame('caesar'),person=s.world.characters.caesar;person.location=null;person.missing={origin:'cisalpine',remaining:3,year:s.year,month:s.month};s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);
 assert.equal(s.world.characters.caesar.location,null);assert.equal(s.armies.find(a=>a.id==='xiii').characterId,null);assert.equal(s.world.governments.caesar.kind,'acting_command');
});
test('unseen foreign illness does not create a public report of a command change',()=>{
 const s=newGame('caesar'),unit=s.armies.find(a=>a.id==='pompey');s.world.characters.pompey.health='seriously_ill';const before=JSON.stringify(s.knowledge.caesar.senate.sightings.pompey);tick(s);
 assert.equal(unit.characterId,null);assert.equal(JSON.stringify(s.knowledge.caesar.senate.sightings.pompey),before);assert.ok(!s.log.some(e=>e.en.includes('simulated illness')&&e.en.includes('Pompey')));
});


test('battle experience follows a commander between armies, persists, and is distinct from army experience',()=>{
 let s=newGame('senate');assert.equal(recruit(s,'roma'),true);let first=s.armies.find(a=>a.id==='levy1');assert.equal(appointCommander(s,first.id,'cato').ok,true);const enemy=s.armies.find(a=>a.id==='xiii'),base=first.skill;first.men=100000;resolveBattle(s,enemy,first,region(s,'roma'));assert.equal(s.world.characters.cato.battlesCommanded,1);assert.equal(first.skill,base);s.world.characters.cato.health='healthy';assert.equal(commandFactor(s,first),1.02);assert.equal(releaseCommander(s,first.id).ok,true);assert.equal(commandFactor(s,first),1);
 assert.equal(recruit(s,'roma'),true);const second=s.armies.find(a=>a.id==='levy2');assert.equal(appointCommander(s,second.id,'cato').ok,true);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters.cato.battlesCommanded,1);assert.equal(commandFactor(s,s.armies.find(a=>a.id==='levy2')),1.02);s.world.characters.cato.battlesCommanded=20;assert.equal(commandFactor(s,s.armies.find(a=>a.id==='levy2')),1.10);
});
test('a foreign commander’s campaign experience is not disclosed by an unseen battle',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),d=s.armies.find(x=>x.id==='pompey');resolveBattle(s,a,d,region(s,'roma'));assert.equal(s.world.characters.pompey.battlesCommanded,1);assert.equal(s.knowledge.caesar.senate.reports.length,0);assert.equal(s.knowledge.caesar.senate.sightings.pompey?.battlesCommanded,undefined);
});
