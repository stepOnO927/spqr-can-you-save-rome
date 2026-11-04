import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,recruit,upgradeSave,tick,resolveBattle,region,adjacent} from '../engine.js';
import {availableCommanders,appointCommander,releaseCommander} from '../command-appointments.js';
import {commandFactor} from '../character-system.js';

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
test('appointments reject remote, occupied, travelling, incapacitated and foreign people without spending resources',()=>{
 const s=newGame('senate');recruit(s,'roma');const unit=s.armies.find(a=>a.id==='levy1'),cash=s.factions.senate.treasury;
 s.world.characters.cato.travel={destination:'epirus'};s.world.characters.scipio.health='seriously_ill';s.world.characters.labienus.location='epirus';
 for(const id of ['cato','scipio','labienus','pompey','cleopatra'])assert.equal(appointCommander(s,unit.id,id).ok,false);
 unit.move={to:'italiaS',remaining:1};assert.deepEqual(availableCommanders(s,unit.id),[]);assert.equal(s.factions.senate.treasury,cash);
});
