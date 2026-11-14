import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newHanGame,loadHanSave,serialize,generateOfficial} from '../han/engine.js';
import {hanCourtHtml} from '../han/court-ui.js';
import {courtPortraitSrc} from '../han/court-portrait.js';
import {appoint,dismiss,startAudit} from '../han/court.js';
import {log} from '../han/util.js';

const MINISTERS=['shi-gao','xiao-wangzhi','hong-gong','yu-dingguo','chen-wannian','liu-xiang','zhou-kan','shi-xian','feng-fengshi','gan-yanshou','chen-tang','feng-liao'];

test('twelve opening officials have individual portraits and bilingual profiles without hidden attributes',()=>{
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
  assert.match(en,/<dt>Audit finding<\/dt><dd>No finding<\/dd>/);
  assert.match(en,/<dt>Ambition<\/dt><dd>Unknown<\/dd>/);
 }
 assert.ok(!hanCourtHtml(state,0,'hong-gong').includes('<option value="chengxiang"'));
 assert.ok(!hanCourtHtml(state,0,'shi-xian').includes('<option value="chengxiang"'));
 assert.ok(hanCourtHtml(state,0,'liu-xiang').includes('<option value="zongzheng"'));
 assert.match(hanCourtHtml(state,0,'feng-liao'),/Envoy/);
 assert.match(hanCourtHtml(state,1,'feng-liao'),/使者/);
 assert.match(hanCourtHtml(state,0,'yu-dingguo'),/about 56/);
 assert.match(hanCourtHtml(state,0,'yu-dingguo'),/Head of the outer administration/);
});

test('opening court careers and later decisions survive chronicle trimming and save reload',()=>{
 let s=newHanGame('han',{seed:26});
 for(const id of MINISTERS){
  const career=s.persons[id].career;
  assert.equal(career[0].kind,'opening_service');
  assert.deepEqual([career[0].year,career[0].month],[-49,1]);
  assert.match(hanCourtHtml(s,0,id),/At campaign opening/);
  assert.match(hanCourtHtml(s,1,id),/战役开始时/);
 }
 assert.equal(appoint(s,'dasinong','shi-gao').ok,true);
 const firstFavor=s.court.favor['shi-gao'],firstSince={...s.persons['shi-gao'].officeSince},firstLog=s.log.length;
 assert.deepEqual(appoint(s,'dasinong','shi-gao'),{ok:false,reason:'already'});
 assert.equal(s.court.favor['shi-gao'],firstFavor);
 assert.deepEqual(s.persons['shi-gao'].officeSince,firstSince);
 assert.equal(s.log.length,firstLog);
 assert.equal(appoint(s,'dasinong','chen-wannian').ok,true);
 assert.match(hanCourtHtml(s,0,'shi-gao'),/replaced as Grand Minister of Agriculture/);
 assert.equal(dismiss(s,'dasinong').ok,true);
 assert.match(hanCourtHtml(s,0,'chen-wannian'),/dismissed as Grand Minister of Agriculture/);
 assert.equal(startAudit(s,'shi-gao').ok,true);
 for(let i=0;i<410;i++)log(s,['A background court event.','朝廷日常事务。'],{kind:'court'});
 assert.equal(s.log.some(e=>e.who==='shi-gao'),false,'the shared chronicle has been trimmed');
 s=loadHanSave(serialize(s));
 assert.match(hanCourtHtml(s,0,'shi-gao'),/investigation of Shi Gao begins/);
 assert.match(hanCourtHtml(s,0,'shi-gao'),/replaced as Grand Minister of Agriculture/);
 assert.match(hanCourtHtml(s,1,'shi-gao'),/战役开始时/);
 assert.equal(s.persons['shi-gao'].career.length,4);
});

test('legacy Han saves rebuild only identity-matched court careers from retained events',()=>{
 const old=newHanGame('han',{seed:27});
 for(const id of MINISTERS)delete old.persons[id].career;
 assert.equal(appoint(old,'dasinong','shi-gao').ok,true);
 old.persons['chen-wannian'].name=['Another Chen','别的陈某'];
 const loaded=loadHanSave(serialize(old));
 assert.match(hanCourtHtml(loaded,0,'shi-gao'),/appointed Grand Minister of Agriculture/);
 assert.match(hanCourtHtml(loaded,0,'shi-gao'),/At campaign opening/);
 assert.equal(loaded.persons['chen-wannian'].career.some(e=>e.kind==='opening_service'),false);
});

test('older save gains a portrait only when the saved historical identity matches',()=>{
 const old=newHanGame('han',{seed:9});
 for(const id of MINISTERS)delete old.persons[id].portrait;
 old.persons['chen-wannian'].name=['Another Chen','别的陈某'];
 const loaded=loadHanSave(serialize(old));
 for(const id of MINISTERS.filter(id=>id!=='chen-wannian'))assert.equal(loaded.persons[id].portrait,`han-${id}`);
 assert.equal(loaded.persons['chen-wannian'].portrait,undefined);
 assert.doesNotMatch(hanCourtHtml(loaded,0,'chen-wannian'),/han-chen-wannian-128.jpg/);
 assert.equal(loaded.persons['chen-wannian'].career.some(e=>e.kind==='opening_service'),false);
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

test('appointed original official remains selectable with the same portrait and career after dismissal and reload',()=>{
 let s=newHanGame('han',{seed:64});
 const person=generateOfficial(s,'dasinong'),id=person.id;
 assert.deepEqual(person.culture,['Han Chinese','汉']);
 assert.equal(s.regions.find(r=>r.id===person.homeland)?.owner,'han');
 assert.equal(person.location,'changan');
 assert.equal(person.profession,'official');
 assert.equal(person.career[0].kind,'entered_service');
 assert.ok(Number.isSafeInteger(person.appearanceSeed));
 assert.match(courtPortraitSrc(person),/^data:image\/svg\+xml,/);
 assert.equal(appoint(s,'dasinong',id).ok,true);
 for(const lang of [0,1]){
  const html=hanCourtHtml(s,lang,id);
  assert.ok(html.includes(`data-court-person="${id}"`));
  assert.ok(html.includes(`data-person="${id}"`));
  assert.ok(html.includes(person.name[lang]));
  assert.ok(html.includes('data:image/svg+xml,'));
  assert.ok(html.includes(person.culture[lang]));
  assert.ok(html.includes(s.regions.find(r=>r.id===person.homeland).name[lang]));
 }
 assert.match(hanCourtHtml(s,0,id),/appointed Grand Minister of Agriculture/);
 const originalSrc=courtPortraitSrc(person);
 assert.equal(dismiss(s,'dasinong').ok,true);
 assert.match(hanCourtHtml(s,0,id),/dismissed as Grand Minister of Agriculture/);
 assert.ok(hanCourtHtml(s,0).includes(`data-court-person="${id}"`));
 s=loadHanSave(serialize(s));
 assert.equal(courtPortraitSrc(s.persons[id]),originalSrc);
 assert.equal(s.persons[id].homeland,person.homeland);
 assert.equal(s.persons[id].location,person.location);
 assert.equal(s.persons[id].career[0].kind,'entered_service');
 assert.match(hanCourtHtml(s,1,id),/游戏创作/);
 assert.match(hanCourtHtml(s,0,id),/dismissed as Grand Minister of Agriculture/);
 delete s.persons[id].appearanceSeed;
 s=loadHanSave(serialize(s));
 assert.equal(courtPortraitSrc(s.persons[id]),originalSrc,'older saves regenerate a stable portrait');
});

test('legacy generated officials keep their names and unknown origins on load',()=>{
 const s=newHanGame('han',{seed:91}),person=generateOfficial(s,'dasinong'),id=person.id;
 assert.equal(appoint(s,'dasinong',id).ok,true);
 const originalName=[...person.name];
 for(const key of ['culture','homeland','location','profession','career'])delete person[key];
 const loaded=loadHanSave(serialize(s)),restored=loaded.persons[id];
 assert.deepEqual(restored.name,originalName);
 assert.deepEqual(restored.culture,['Han Chinese','汉']);
 assert.equal(restored.homeland,null);
 assert.equal(restored.location,null);
 assert.equal(restored.profession,'official');
 assert.ok(restored.career.some(entry=>entry.kind==='court'&&entry.office==='dasinong'));
 assert.match(hanCourtHtml(loaded,0,id),/<dt>Recorded origin<\/dt><dd>Not recorded<\/dd>/);
 assert.match(hanCourtHtml(loaded,1,id),/<dt>记载的出身地<\/dt><dd>未记载<\/dd>/);
});
