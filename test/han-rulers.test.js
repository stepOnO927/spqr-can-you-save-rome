import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize,tick} from '../han/engine.js';
import {advanceForeignRulers,rulerPortrait,rulerMilitaryJudgment} from '../han/rulers.js';
import {ownRulerHtml} from '../han/ruler-ui.js';
import {birthRecordValid} from '../han/dynasty.js';

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

test('loading an older save creates missing ruler links without replacing its dated rulers',()=>{
 const s=newHanGame('wusun',{seed:80});const old=s.rulers.parthia;
 delete s.rulers.wusun;delete s.persons['orodes-ii'];
 const restored=loadHanSave(serialize(s));
 assert.equal(restored.rulers.parthia.id,old.id);
 assert.equal(restored.rulers.wusun.id,'xingmi');
 assert.equal(restored.persons['orodes-ii'].name[0],'Orodes II');
});
