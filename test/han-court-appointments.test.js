import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,serialize,loadHanSave,recommendOfficial,tick} from '../han/engine.js';
import {appoint,officeHolder,adminCapacity} from '../han/court.js';
import {OFFICES} from '../han/data.js';
import {isLiuClan} from '../han/dynasty.js';

test('Han court appoints a named official without Roman elections and preserves Liu-only offices',()=>{
 const s=newHanGame('han',{seed:101}),emperor=s.throne.orthodox;
 const candidate=Object.values(s.persons).find(p=>p.alive&&p.faction==='han'&&p.role==='official'&&!p.office&&!p.eunuch&&!isLiuClan(s,p.id));
 assert.ok(candidate);assert.equal(s.court.offices.dasinong,null);
 const result=appoint(s,'dasinong',candidate.id);
 assert.equal(result.ok,true);assert.equal(officeHolder(s,'dasinong').id,candidate.id);
 assert.equal(appoint(s,'zongzheng',candidate.id).reason,'requires_liu_clan');
 assert.equal(s.throne.orthodox,emperor);assert.equal(isLiuClan(s,s.throne.orthodox),true);
 assert.equal(OFFICES.dasinong.name[1],'大司农');
 const restored=loadHanSave(serialize(s));
 assert.equal(restored.court.offices.dasinong,candidate.id);
 assert.equal(restored.throne.orthodox,emperor);
});

test('Han talent recommendation takes resources and time before a separate appointment',()=>{
 const s=newHanGame('han',{seed:211}),before=s.factions.han.treasury;
 const request=recommendOfficial(s,'dasinong');assert.deepEqual({ok:request.ok,cost:request.cost,months:request.months},{ok:true,cost:15,months:3});
 assert.equal(s.factions.han.treasury,before-15);assert.equal(recommendOfficial(s,'dasinong').reason,'pending');
 assert.equal(recommendOfficial(s,'zongzheng').reason,'authority');
 assert.equal(s.court.offices.dasinong,null);
 for(let i=0;i<3;i++)tick(s);
 const record=s.court.recommendations.at(-1);assert.equal(record.status,'arrived');assert.ok(s.persons[record.personId]?.alive);
 assert.equal(s.court.offices.dasinong,null);
 assert.equal(appoint(s,'dasinong',record.personId).ok,true);
 const restored=loadHanSave(serialize(s));assert.equal(restored.court.recommendations.at(-1).personId,record.personId);
 assert.equal(restored.court.offices.dasinong,record.personId);
});

test('Han AI fills a fiscal vacancy with a capable existing minister',()=>{
 let s=newHanGame('kangju',{seed:444,start:'han'});
 const before=adminCapacity(s);
 assert.equal(s.court.offices.dasinong,null);
 tick(s);
 assert.equal(s.court.offices.dasinong,'zhou-kan');
 assert.ok(adminCapacity(s)>before);
 assert.equal(s.persons['zhou-kan'].office,'dasinong');
 assert.equal(Object.keys(s.persons).filter(id=>id.startsWith('gen-')).length,0);
 s=loadHanSave(serialize(s));
 assert.equal(s.court.offices.dasinong,'zhou-kan');
 assert.equal(s.log.some(entry=>entry.who==='zhou-kan'&&entry.kind==='court'),false,'a foreign player is not told of Han appointments instantly');
});

test('Han AI selection responds to minister competence and corruption',()=>{
 const s=newHanGame('kangju',{seed:444,start:'han'});
 s.persons['zhou-kan'].competence=20;s.persons['zhou-kan'].corruption=100;
 tick(s);
 assert.equal(s.court.offices.dasinong,'fictional-liu-ji');
});

test('Han AI generates a replacement only after eligible courtiers are exhausted',()=>{
 const s=newHanGame('kangju',{seed:445,start:'han'});
 for(const p of Object.values(s.persons))if(p.faction==='han'&&!p.office&&p.role==='official')p.alive=false;
 tick(s);
 const id=s.court.offices.dasinong;
 assert.match(id,/^gen-/);
 assert.equal(s.persons[id].office,'dasinong');
 assert.equal(s.persons[id].culture[0],'Han Chinese');
});
