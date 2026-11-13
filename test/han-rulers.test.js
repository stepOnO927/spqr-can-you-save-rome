import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize,tick} from '../han/engine.js';
import {advanceForeignRulers,rulerPortrait,rulerMilitaryJudgment,rulerGovernanceFactor} from '../han/rulers.js';
import {ownRulerHtml} from '../han/ruler-ui.js';
import {birthRecordValid,recordBirth,eligibility,crown} from '../han/dynasty.js';
import {courtPortraitSrc} from '../han/court-portrait.js';

test('an original Liu heir gains a persistent portrait when legitimately crowned',()=>{
 let s=newHanGame('han',{seed:412});
 const id='simulated-liu-heir',father='liu-shi';
 s.persons[id]={id,name:['Liu Yi','刘翊'],surname:'Liu',birthSurname:'Liu',sex:'m',birth:-60,father,mother:null,record:'simulated',faction:'han',role:'prince',alive:true,spouse:[]};
 assert.equal(recordBirth(s,{id,father,birthSurname:'Liu',birth:-60,sex:'m'}).ok,true);
 assert.equal(eligibility(s,id).ok,true);
 s.throne.support[id]=Object.fromEntries(Object.keys(s.court.factions).map(f=>[f,80]));
 s=loadHanSave(serialize(s));
 const image=courtPortraitSrc(s.persons[id]);assert.match(image,/^data:image\/svg\+xml,/);
 assert.equal(crown(s,id,'court_selection').ok,true);
 assert.match(ownRulerHtml(s,0),/Liu Yi/);
 assert.match(ownRulerHtml(s,0),/Original campaign character/);
 assert.ok(ownRulerHtml(s,0).includes(image));
 assert.match(ownRulerHtml(s,1),/刘翊/);
 assert.match(ownRulerHtml(s,1),/汉皇帝/);
 s=loadHanSave(serialize(s));
 assert.equal(s.throne.orthodox,id);
 assert.equal(courtPortraitSrc(s.persons[id]),image);
 assert.ok(ownRulerHtml(s,0).includes(image));
 assert.equal(crown(s,'shi-gao','court_selection').ok,false);
});

test('foreign rulers keep historical identities and unknown opening names distinct',()=>{
 const s=newHanGame('parthia',{seed:112});
 assert.equal(s.rulers.parthia.id,'orodes-ii');
 assert.equal(s.rulers.armenia.id,'artavasdes-ii');
 assert.equal(s.rulers.commagene.id,'antiochus-i-commagene');
 assert.equal(s.rulers.kangju.id,'kangju-king');
 assert.equal(s.persons['kangju-king'].titleOnly,true);
 assert.match(ownRulerHtml(s,0),/King of Kings/);
 assert.match(ownRulerHtml(s,1),/万王之王/);
 assert.match(ownRulerHtml(s,1),/艺术复原/);
});

test('undocumented opening rulers remain unnamed until an actual succession',()=>{
 const s=newHanGame('gumo',{seed:112});
 for(const f of ['gumo','sogd_samarkand','atropatene']){
  const ruler=s.rulers[f],person=s.persons[ruler.personId];
  assert.equal(person.titleOnly,true,f);assert.equal(person.record,'reconstruction',f);
  assert.match(person.name[0],/^Unnamed ruler of /,f);
 }
 assert.equal(s.rulers.parthia.id,'orodes-ii');
 assert.match(ownRulerHtml(s,0),/personal name is unrecorded/);
 assert.match(ownRulerHtml(s,1),/史料未载此时王名/);
 const missingPerson=structuredClone(s);delete missingPerson.persons[missingPerson.rulers.gumo.personId];
 const migrated=loadHanSave(serialize(missingPerson));
 assert.equal(migrated.persons[migrated.rulers.gumo.personId].titleOnly,true);
 assert.match(ownRulerHtml(migrated,0),/personal name is unrecorded/);
 const old=s.rulers.gumo;s.persons[old.personId].alive=false;s.persons[old.personId].death=s.year;
 advanceForeignRulers(s);
 const next=s.rulers.gumo,person=s.persons[next.personId];
 assert.equal(person.record,'fictional');assert.equal(person.titleOnly,undefined);
 assert.equal(next.predecessor,old.id);
 const restored=loadHanSave(serialize(s));
 assert.deepEqual(restored.rulers.gumo,next);
 assert.deepEqual(restored.persons[next.personId].name,person.name);
});

test('new sovereign names stay distinct across neighboring courts and dynamic states',()=>{
 const s=newHanGame('han',{seed:123});const courts=['gumo','jingjue','qiemo','xiaowan','ruoqiang','qiule','wensu'];
 for(const f of courts)s.persons[s.rulers[f].personId].alive=false;
 s.factions['new-oasis-court']={id:'new-oasis-court',stability:55,treasury:20};
 advanceForeignRulers(s);
 const people=courts.map(f=>s.persons[s.rulers[f].personId]);
 assert.equal(new Set(people.map(p=>p.name[0])).size,people.length);
 assert.equal(people.every(p=>p.record==='fictional'),true);
 assert.equal(s.persons[s.rulers['new-oasis-court'].personId].record,'fictional');
});

test('a missing legacy ruler counter cannot overwrite an existing person',()=>{
 const s=newHanGame('gumo',{seed:32}),old=s.rulers.gumo;
 s.persons['sim-ruler-gumo-1']={id:'sim-ruler-gumo-1',name:['Earlier person','先前人物'],alive:false,record:'fictional'};
 s.nextRuler=0;s.persons[old.personId].alive=false;
 advanceForeignRulers(s);
 assert.notEqual(s.rulers.gumo.personId,'sim-ruler-gumo-1');
 assert.deepEqual(s.persons['sim-ruler-gumo-1'].name,['Earlier person','先前人物']);
});

test('Parthia, Armenia, Wusun, Kangju and an oasis kingdom gain persistent successors',()=>{
 for(const f of ['parthia','armenia','wusun','kangju','shanshan']){
  const s=newHanGame(f,{seed:700});const old=s.rulers[f],oldPortrait=rulerPortrait(s,f);
  s.persons[old.personId].alive=false;s.persons[old.personId].death=s.year;
  advanceForeignRulers(s);
  const next=s.rulers[f],person=s.persons[next.personId];
  assert.notEqual(next.id,old.id,f);assert.equal(next.record,'fictional',f);
  assert.equal(next.predecessor,old.id,f);assert.equal(person.politicalPredecessor,old.id,f);
  assert.ok(person.alive&&person.military>=35&&person.competence>=35,f);
  assert.ok(birthRecordValid(s,person.id),f);
  assert.notEqual(rulerPortrait(s,f),oldPortrait,f);
  assert.match(ownRulerHtml(s,0),/Original campaign character/,f);
  assert.match(ownRulerHtml(s,1),/本战役原创人物/,f);
  const restored=loadHanSave(serialize(s));
  assert.deepEqual(restored.rulers[f],next,f);
  assert.equal(rulerPortrait(restored,f),rulerPortrait(s,f),f);
  const id=restored.rulers[f].id;tick(restored);assert.equal(restored.rulers[f].id,id,f);
 }
});

test('succession has a simulation cost and ruler judgment affects AI threshold',()=>{
 const s=newHanGame('han',{seed:42}),f='armenia',old=s.rulers[f],before=s.factions[f].stability;
 s.persons[old.personId].alive=false;advanceForeignRulers(s);
 assert.equal(s.factions[f].stability,before-5);
 const p=s.persons[s.rulers[f].personId];p.military=35;const cautious=rulerMilitaryJudgment(s,f);p.military=90;
 assert.ok(rulerMilitaryJudgment(s,f)>cautious);
 assert.equal(s.log.at(-1).kind,'succession');
});

test('the reigning ruler changes actual taxation rather than only the displayed dossier',()=>{
 const base=newHanGame('parthia',{seed:16});for(const r of base.regions)if(r.owner==='parthia')r.tax=100;
 const low=structuredClone(base),high=structuredClone(base),id=base.rulers.parthia.personId;
 low.persons[id].competence=0;high.persons[id].competence=100;
 assert.equal(rulerGovernanceFactor(low,'parthia'),0.9);
 assert.equal(rulerGovernanceFactor(high,'parthia'),1.1);
 tick(low);tick(high);
 assert.ok(high.factions.parthia.treasury>low.factions.parthia.treasury);
 assert.match(ownRulerHtml(high,0),/Tax administration \(simulated\): ×1.10/);
});

test('loading an older save creates missing ruler links without replacing its dated rulers',()=>{
 const s=newHanGame('wusun',{seed:80});const old=s.rulers.parthia;
 delete s.rulers.wusun;delete s.persons['orodes-ii'];
 const restored=loadHanSave(serialize(s));
 assert.equal(restored.rulers.parthia.id,old.id);
 assert.equal(restored.rulers.wusun.id,'xingmi');
 assert.equal(restored.persons['orodes-ii'].name[0],'Orodes II');
});
