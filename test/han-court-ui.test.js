import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js';
import {hanCourtHtml} from '../han/court-ui.js';

const MINISTERS=['shi-gao','xiao-wangzhi','hong-gong','yu-dingguo','chen-wannian'];

test('five opening ministers have individual portraits and a bilingual profile without hidden attributes',()=>{
 const state=newHanGame('han',{seed:7});
 assert.equal(new Set(MINISTERS.map(id=>state.persons[id].portrait)).size,MINISTERS.length);
 for(const id of MINISTERS){
  const person=state.persons[id];
  for(const size of ['master','128','64'])assert.ok(readFileSync(new URL(`../assets/portraits/${person.portrait}-${size}.jpg`,import.meta.url)).length>1000);
  const en=hanCourtHtml(state,0,id),zh=hanCourtHtml(state,1,id);
  assert.match(en,new RegExp(`data-person="${id}"`));
  assert.ok(en.includes(person.name[0]));assert.ok(zh.includes(person.name[1]));
  assert.ok(en.includes(`${person.portrait}-128.jpg`));
  assert.match(en,/Approximate age/);assert.match(zh,/约略年龄/);
  assert.match(en,/Current responsibilities/);assert.match(zh,/当前职责/);
  assert.match(en,/No finding/);assert.match(en,/Unknown/);
  assert.ok(!en.includes(`>${person.corruption}<`),'unproven corruption must not be displayed');
 }
 assert.ok(!hanCourtHtml(state,0,'hong-gong').includes('<option value="chengxiang"'));
 assert.match(hanCourtHtml(state,0,'yu-dingguo'),/about 56/);
 assert.match(hanCourtHtml(state,0,'yu-dingguo'),/Head of the outer administration/);
});

test('older save gains a portrait only when the saved historical identity matches',()=>{
 const old=newHanGame('han',{seed:9});
 for(const id of MINISTERS)delete old.persons[id].portrait;
 old.persons['chen-wannian'].name=['Another Chen','别的陈某'];
 const loaded=loadHanSave(serialize(old));
 for(const id of MINISTERS.filter(id=>id!=='chen-wannian'))assert.equal(loaded.persons[id].portrait,`han-${id}`);
 assert.equal(loaded.persons['chen-wannian'].portrait,undefined);
 assert.doesNotMatch(hanCourtHtml(loaded,0,'chen-wannian'),/han-chen-wannian-128.jpg/);
});

test('opening and legacy appointments reveal assessed skill only after a year of observed service',()=>{
 const fresh=newHanGame('han',{seed:10});
 assert.deepEqual(fresh.persons['yu-dingguo'].officeSince,{year:-49,month:1});
 assert.match(hanCourtHtml(fresh,0,'yu-dingguo'),/Not yet assessed/);
 fresh.year=-48;fresh.month=1;
 assert.match(hanCourtHtml(fresh,0,'yu-dingguo'),/<dt>Skill assessment<\/dt><dd>70<\/dd>/);
 const old=newHanGame('han',{seed:11});delete old.persons['yu-dingguo'].officeSince;
 old.year=-46;old.month=5;
 const migrated=loadHanSave(serialize(old));
 assert.deepEqual(migrated.persons['yu-dingguo'].officeSince,{year:-46,month:5});
 assert.match(hanCourtHtml(migrated,0,'yu-dingguo'),/Not yet assessed/);
 migrated.year=-45;assert.match(hanCourtHtml(migrated,0,'yu-dingguo'),/<dt>Skill assessment<\/dt><dd>70<\/dd>/);
});

test('a pending disaster offers executable bilingual responses with real resource checks',()=>{
 const s=newHanGame('han',{seed:12});s.court.pendingDisaster={id:8,type:'flood',region:'changan',deadline:2,readings:[]};
 s.factions.han.grain=20;
 const en=hanCourtHtml(s,0),zh=hanCourtHtml(s,1);
 assert.match(en,/Court must respond/);assert.match(zh,/朝廷须应对灾异/);
 assert.match(zh,/黄河决溢/);assert.match(zh,/40 粮食/);
 assert.match(zh,/data-court-disaster="relief" disabled/);
 assert.match(en,/data-court-disaster="blame_faction"/);
});
