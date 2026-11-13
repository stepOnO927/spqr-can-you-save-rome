import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,serialize,loadHanSave,recommendOfficial,tick} from '../han/engine.js';
import {appoint,officeHolder} from '../han/court.js';
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
