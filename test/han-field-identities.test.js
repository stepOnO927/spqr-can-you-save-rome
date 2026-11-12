import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=han-1';
import {recruit,templatesFor} from '../han/military.js?v=han-1';
import {fieldCulture,ensureFieldCommanders} from '../han/field-identities.js';
import {birthRecordValid} from '../han/dynasty.js?v=han-1';

test('every opening eastern army has a saved person and distinct cultural identity',()=>{
 let s=newHanGame('han',{seed:17});
 const ids=new Set();
 for(const army of s.armies){
  assert.ok(army.commander,`${army.owner} army lacks commander`);
  const person=s.persons[army.commander];assert.ok(person?.alive);
  assert.equal(person.faction,army.owner);assert.equal(person.record==='historical'||person.record==='fictional',true);
  assert.ok(person.name?.[0]&&person.name?.[1]);assert.equal(birthRecordValid(s,person.id),true);
  assert.equal(ids.has(army.commander),false);ids.add(army.commander);
 }
 assert.equal(fieldCulture('wusun'),'wusun');assert.equal(fieldCulture('kangju'),'kangju');
 assert.equal(fieldCulture('sogd_samarkand'),'sogdian');assert.equal(fieldCulture('yuezhi'),'yuezhi');
 assert.equal(fieldCulture('gandhara_saka'),'saka');assert.equal(fieldCulture('parthia'),'parthian');
 const snapshots=s.armies.map(a=>[a.id,a.commander,s.persons[a.commander].name]);
 s=loadHanSave(serialize(s));ensureFieldCommanders(s);
 assert.deepEqual(s.armies.map(a=>[a.id,a.commander,s.persons[a.commander].name]),snapshots);
});

test('recruitment immediately assigns a persistent officer and never replaces an existing commander',()=>{
 const s=newHanGame('han',{seed:29}),template=templatesFor(s,'han')[0];
 const result=recruit(s,'han','changan',template.id,{men:500});assert.equal(result.ok,true);
 const army=s.armies.find(a=>a.id===result.id),id=army.commander;
 assert.match(id,/^field:\d+$/);assert.equal(s.persons[id].profession,'general');
 assert.equal(s.persons[id].homeland,'changan');assert.equal(birthRecordValid(s,id),true);
 ensureFieldCommanders(s);assert.equal(army.commander,id);
 assert.equal(loadHanSave(serialize(s)).armies.find(a=>a.id===result.id).commander,id);
});
