import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-stops-1';
import {createFictionalPerson} from '../dynasties.js?v=world-kings-stops-1';
import {audiencePublicRecord} from '../personal-diplomacy.js?v=world-kings-stops-1';

test('meeting history distinguishes the addressed and observed names without revealing a future outcome',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Private','秘密姓名'],faction:'egypt',birthYear:-75});
 const m={target:id,status:'met',year:s.year,month:s.month,resolvedYear:s.year,resolvedMonth:s.month+1,reportedName:['Addressed','寄信称呼'],observedName:['Observed','会面姓名']};
 s.meetings.push(m);let view=audiencePublicRecord(s,m);assert.equal(view.status,'pending');assert.deepEqual(view.requestName,['Addressed','寄信称呼']);assert.equal(view.observedName,null);assert.equal(view.remaining,null);
 s.month++;s=upgradeSave(JSON.parse(JSON.stringify(s)));view=audiencePublicRecord(s,s.meetings.at(-1));assert.equal(view.status,'met');assert.deepEqual(view.observedName,['Observed','会面姓名']);assert.deepEqual(view.requestName,['Addressed','寄信称呼']);
 s.world.dynasties.catalog[id].name=['Changed','后来秘密姓名'];assert.deepEqual(audiencePublicRecord(s,s.meetings.at(-1)).observedName,['Observed','会面姓名']);
});
test('legacy and unanswered meetings do not invent an observed name or expose absence',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Private','秘密姓名'],faction:'egypt',birthYear:-75});
 const base={target:id,year:s.year,month:s.month,reportedName:['Addressed','寄信称呼']};
 assert.equal(audiencePublicRecord(s,{...base,status:'met'}).observedName,null);
 assert.equal(audiencePublicRecord(s,{...base,status:'no_contact'}).status,'no_reply');
 assert.equal(audiencePublicRecord(s,{...base,status:'declined',resolvedYear:s.year,resolvedMonth:s.month+1}).status,'pending');
 assert.deepEqual(audiencePublicRecord(s,{...base,status:'met',reportedName:undefined}).requestName,['Unrecorded name','姓名未记录']);
});
