import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=guardian-age-1';
import {recruit,templatesFor} from '../han/military.js?v=guardian-age-1';
import {fieldCulture,ensureFieldCommanders,createMarketMerchant} from '../han/field-identities.js';
import {birthRecordValid} from '../han/dynasty.js?v=guardian-age-1';

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
 assert.ok(Number.isSafeInteger(s.persons[id].appearanceSeed));
 ensureFieldCommanders(s);assert.equal(army.commander,id);
 const loaded=loadHanSave(serialize(s));
 assert.equal(loaded.armies.find(a=>a.id===result.id).commander,id);
 assert.equal(loaded.persons[id].appearanceSeed,s.persons[id].appearanceSeed);
});

test('Chorasmian and Caucasian originals retain distinct reconstructed cultures after load',()=>{
 let s=newHanGame('han',{seed:31});
 const courts=[['chorasmia','chorasmian'],['caucasian_iberia','caucasian_iberian'],['caucasian_albania','caucasian_albanian']];
 const people=courts.map(([court,culture])=>{
  assert.equal(fieldCulture(court),culture);
  const person=s.persons[createMarketMerchant(s,court,court)];
  assert.ok(person.name[0]&&person.name[1]);
  assert.match(person.culture[0],/game reconstruction/);
  assert.equal(person.homeland,court);
  return [person.id,person.name,person.culture,person.appearanceSeed];
 });
 assert.equal(new Set(people.map(([,name])=>name[0])).size,people.length);
 assert.equal(new Set(people.map(([, ,culture])=>culture[0])).size,people.length);
 s=loadHanSave(serialize(s));
 assert.deepEqual(people.map(([id])=>[id,s.persons[id].name,s.persons[id].culture,s.persons[id].appearanceSeed]),people);
});
