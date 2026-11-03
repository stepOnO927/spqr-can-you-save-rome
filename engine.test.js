import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,moveArmy,recruit,setTax,diplomacy,resolveBattle,region,army,adjacent,isWar} from './engine.js';

test('49 BCE opens with opposing Roman commands and independent Egypt',()=>{
  const s=newGame();
  assert.equal(s.year,-49);assert.equal(s.month,1);
  assert.equal(region(s,'cisalpine').owner,'caesar');assert.equal(region(s,'roma').owner,'senate');assert.equal(region(s,'egypt').owner,'egypt');
  assert.equal(army(s,'xiii').commander[0],'Julius Caesar');
  assert.equal(army(s,'pompey').region,'roma');
  assert.ok(isWar(s,'caesar','senate'));
});

test('movement uses connected routes, time, and sea transport cost',()=>{
  const s=newGame();
  assert.equal(moveArmy(s,'xiii','egypt').ok,false);
  assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
  assert.equal(army(s,'xiii').region,'cisalpine');
  tick(s);
  assert.equal(army(s,'xiii')?.region,'italiaN');
  const italy=s.armies.find(a=>a.id==='xiii');
  assert.ok(italy.men<7200);
  assert.ok(s.log.some(e=>e.en.includes('Casualties')));
  assert.ok(adjacent('italiaS').some(e=>e.to==='sicilia'&&e.sea));
});

test('recruitment spends actual resources and creates an army',()=>{
  const s=newGame(),initial=s.armies.length;
  assert.equal(recruit(s,'cisalpine'),true);
  assert.equal(s.armies.length,initial+1);
  assert.equal(s.factions.caesar.treasury,66);
  assert.equal(s.factions.caesar.manpower,19000);
  assert.equal(recruit(s,'roma'),false);
});

test('battles inflict casualties and the victor controls the theater',()=>{
  const s=newGame(),a=army(s,'xiii'),d=army(s,'italy'),target=region(s,'italiaN');
  a.men=15000;d.men=1000;
  assert.equal(resolveBattle(s,a,d,target),true);
  assert.equal(target.owner,'caesar');
  assert.ok(a.men<15000);
  assert.ok(s.armies.every(x=>x.id!=='italy'||x.men<1000));
});

test('tax pressure causes an actual territorial rebellion',()=>{
  const s=newGame();s.factions.caesar.stability=40;
  region(s,'gaul').loyalty=25;
  setTax(s,'caesar','high');
  tick(s);
  assert.equal(region(s,'gaul').owner,'rebels');
  assert.ok(s.armies.some(a=>a.owner==='rebels'&&a.region==='gaul'));
  assert.ok(isWar(s,'caesar','rebels'));
});

test('AI issues real movement orders after a monthly update',()=>{
  const s=newGame();tick(s);
  assert.ok(s.armies.some(a=>a.owner==='senate'&&a.move));
});

test('complete state is JSON serializable for local save slots',()=>{
  const s=newGame();recruit(s,'gaul');tick(s);
  const restored=JSON.parse(JSON.stringify(s));
  assert.deepEqual(restored,s);
  assert.equal(restored.version,2);
});

test('neighboring alliances join declared wars and remain independent factions',()=>{
  const s=newGame();
  assert.equal(diplomacy(s,'caesar','mauretania','improve'),true);
  assert.equal(diplomacy(s,'caesar','mauretania','alliance'),true);
  assert.equal(diplomacy(s,'caesar','numidia','war'),true);
  assert.ok(isWar(s,'mauretania','numidia'));
  tick(s);
  assert.ok(s.armies.some(a=>a.owner==='mauretania'&&a.move));
});

test('Egyptian diplomacy changes access and peace cancels only relevant hostile orders',()=>{
  const s=newGame();
  assert.equal(diplomacy(s,'caesar','egypt','war'),true);
  assert.ok(isWar(s,'caesar','egypt'));
  assert.equal(s.factions.caesar.legitimacy,44);
  army(s,'xiii').move={to:'italiaN',remaining:1};
  army(s,'egyptguard').move={to:'syria',remaining:1};
  assert.equal(diplomacy(s,'caesar','egypt','peace'),true);
  assert.equal(isWar(s,'caesar','egypt'),false);
  assert.ok(army(s,'xiii').move);
  assert.ok(army(s,'egyptguard').move);
});

