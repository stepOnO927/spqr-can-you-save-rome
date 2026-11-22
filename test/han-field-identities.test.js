import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=faces-name-disagreement-1';
import {recruit,templatesFor} from '../han/military.js?v=han-1';
import {fieldCulture,ensureFieldCommanders,createMarketMerchant} from '../han/field-identities.js';
import {birthRecordValid} from '../han/dynasty.js?v=han-1';
import {ensureForeignRulers} from '../han/rulers.js';

test('opening Central Asian field people use saved geographic bynames instead of serial numbers',()=>{
 let s=newHanGame('han',{seed:1});
 const fictional=Object.values(s.persons).filter(person=>person.record==='fictional');
 assert.ok(fictional.length>=60);
 assert.equal(fictional.filter(person=>/\(\d+\)$/.test(person.name[0])).length,0);
 const army=s.armies.find(unit=>unit.owner==='shache'),id=army.commander,name=s.persons[id].name;
 assert.match(name[0],/ of Shache$/);assert.match(name[1],/^莎车的/);
 const merchantId=createMarketMerchant(s,'shanshan','kangju'),merchant=s.persons[merchantId];
 assert.match(merchant.name[0],/ of Wuni$/);
 assert.equal(merchant.homeland,'shanshan');assert.equal(merchant.location,'kangju');
 s=loadHanSave(serialize(s));
 assert.deepEqual(s.persons[id].name,name);assert.deepEqual(s.persons[merchantId].name,merchant.name);
 // Migration keeps an older campaign's already recorded name unchanged.
 s.persons[id].name=['Kava (19)','卡瓦（19）'];
 assert.deepEqual(loadHanSave(serialize(s)).persons[id].name,['Kava (19)','卡瓦（19）']);
});

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

test('Han civil war, loyalist and uprising commanders retain Han identity without inventing a rebel king',()=>{
 let s=newHanGame('han',{seed:41});
 s.factions.han_loyalist={id:'han_loyalist',treasury:60,grain:100,manpower:1000,horses:0,stability:50};
 s.factions.rival_court={id:'rival_court',treasury:60,grain:100,manpower:1000,horses:0,stability:50};
 s.factions.rebels={id:'rebels',treasury:0,grain:20,manpower:0,horses:0,stability:30};
 const armies=['han_loyalist','rival_court','rebels'].map((owner,i)=>({id:`civil-${i}`,owner,region:'changan',men:600,morale:50,supply:70,commander:null}));
 assert.equal(fieldCulture('usurper-fictional-pang-chong'),'han');
 s.armies.push(...armies);
 s.rulers.rebels={id:'old-rebel-king',personId:'old-rebel-king',name:['Old rebel king','旧叛王']};
 s.persons['old-rebel-king']={id:'old-rebel-king',name:['Old rebel king','旧叛王'],faction:'rebels',record:'fictional',alive:true};
 const legacy=loadHanSave(serialize(s));
 assert.equal(legacy.rulers.rebels,undefined);
 assert.ok(legacy.persons['old-rebel-king']);
 ensureForeignRulers(s);ensureFieldCommanders(s);
 assert.equal(s.rulers.rebels,undefined);
 assert.ok(s.persons['old-rebel-king']);
 for(const army of armies){
  const person=s.persons[army.commander];
  assert.equal(fieldCulture(army.owner),'han');
  assert.deepEqual(person.culture,['Han Chinese','汉']);
  assert.equal(person.faction,army.owner);
  assert.equal(birthRecordValid(s,person.id),true);
 }
 const saved=armies.map(army=>[army.commander,s.persons[army.commander].name]);
 s=loadHanSave(serialize(s));
 assert.equal(s.rulers.rebels,undefined);
 assert.deepEqual(armies.map(army=>[s.armies.find(a=>a.id===army.id).commander,s.persons[army.commander].name]),saved);
});

test('a merchant hired abroad keeps an owned homeland distinct from the hiring market',()=>{
 let s=newHanGame('han',{seed:42});
 const id=createMarketMerchant(s,'han','kangju'),person=s.persons[id];
 assert.equal(person.location,'kangju');
 assert.equal(s.regions.find(r=>r.id===person.homeland)?.owner,'han');
 assert.equal(person.history[0].region,'kangju');
 s=loadHanSave(serialize(s));
 assert.equal(s.persons[id].homeland,person.homeland);
 assert.equal(s.persons[id].location,'kangju');
});
