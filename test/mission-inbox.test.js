import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,queueMission,upgradeSave} from '../engine.js?v=reported-contact-1';
import {advanceMailReports} from '../mail-reports.js?v=reported-contact-1';
import {receivedMail} from '../epistulae.js?v=reported-contact-1';
import {CHARACTER_CATALOG} from '../characters.js?v=reported-contact-1';

test('only received mission outcomes enter the inbox, once, and survive a save',()=>{
 const s=newGame(),date={resolvedYear:s.year,resolvedMonth:s.month};
 s.operations=[
  {id:'mission:a',actor:s.player,target:'egypt',type:'spy',subject:'health',status:'complete',...date},
  {id:'mission:b',actor:s.player,target:'parthia',type:'envoy',status:'declined',...date},
  {id:'mission:c',actor:s.player,target:'egypt',type:'spy',status:'captured',...date},
  {id:'mission:d',actor:s.player,target:'egypt',type:'envoy',status:'failed',...date},
  {actor:s.player,target:'egypt',type:'support',status:'no_reply',...date},
  {id:'mission:e',actor:s.player,target:'egypt',type:'spy',status:'pending',...date},
  {id:'mission:f',actor:'egypt',target:s.player,type:'spy',status:'complete',...date},
 ];
 advanceMailReports(s);advanceMailReports(s);
 const letters=receivedMail(s).filter(m=>m.context?.kind==='mission_result');
 assert.equal(letters.length,3);
 assert.match(letters.find(m=>m.context.operationId==='mission:a').body[1],/可能有误或已经过时/);
 assert.match(letters.find(m=>m.context.operationId==='mission:b').body[1],/拒绝/);
 assert.match(letters.find(m=>m.context.operationId==='mission:c').body[1],/抓获/);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));advanceMailReports(restored);
 assert.equal(receivedMail(restored).filter(m=>m.context?.kind==='mission_result').length,3);
});

test('a captured or detected named agent appears by name in the received letter',()=>{
 for(const status of ['captured','detected']){
  const s=newGame(),result=queueMission(s,s.player,'egypt','spy','health');assert.equal(result.ok,true);
  const op=s.operations[0],name=CHARACTER_CATALOG[op.agentId]?.name;assert.ok(name?.[0]&&name?.[1]);
  op.status=status;op.resolvedYear=s.year;op.resolvedMonth=s.month;
  advanceMailReports(s);
  const letter=receivedMail(s).find(m=>m.context?.operationId===op.id);
  assert.ok(letter);assert.ok(letter.body[0].includes(name[0]));assert.ok(letter.body[1].includes(name[1]));
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(receivedMail(restored).find(m=>m.context?.operationId===op.id).body,letter.body);
 }
});
