import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=diplomatic-chronicle-1';
import {sendLetter,advanceMail,replyToLetter,receivedMail} from '../epistulae.js?v=portraits-hundred-days-1';
import {mailboxHtml} from '../mail-ui.js?v=portraits-hundred-days-1';

const send=(s,from,to,context,options=[])=>sendLetter(s,{senderInstitution:from,senderFaction:from,recipient:to,category:'diplomatic',subject:['Letter','信'],body:['A message','消息'],context,options}).letter;
const advanceTo=(s,n,actions={})=>{s.year=Math.floor((n-1)/12);s.month=n-s.year*12;advanceMail(s,actions)};

test('couriers can be lost or arrive, while legacy in-flight letters continue to arrive',()=>{
 const results=new Set();
 for(let seed=0;seed<100;seed++){
  const s=newGame('caesar');s.seed=seed;const m=send(s,'egypt','caesar',{kind:'greeting'});
  advanceTo(s,m.arrival);results.add(m.delivery);
  assert.equal(receivedMail(s).some(x=>x.id===m.id),m.delivery==='received');
  if(m.delivery==='lost')assert.doesNotMatch(mailboxHtml(s),/A message/);
 }
 assert.deepEqual(results,new Set(['received','lost']));
 const s=newGame('caesar');s.seed=0;const old=send(s,'egypt','caesar',{kind:'greeting'});delete old.courierSeed;delete old.courierRisk;
 advanceTo(s,old.arrival);assert.equal(old.delivery,'received');
});

test('a lost reply never applies a treaty and its outcome stays hidden',()=>{
 const outcomes=new Set();
 for(let seed=0;seed<100;seed++){
  const s=newGame('caesar');s.seed=seed;const incoming=send(s,'egypt','caesar',{kind:'treaty',treatyType:'non_aggression'},['accept']);incoming.delivery='received';
  let calls=0;const actions={proposeAgreement:()=>{calls++;return {ok:true}}};
  assert.equal(replyToLetter(s,incoming.id,'accept',actions).ok,true);
  const reply=incoming.responses[0],outgoing=s.mail.messages.find(m=>m.id===reply.replyMailId);
  assert.equal(calls,0);assert.equal(outgoing.delivery,'traveling');
  advanceTo(s,reply.arrival,actions);outcomes.add(reply.outcome);
  assert.equal(calls,reply.outcome==='accept'?1:0);
  assert.equal(outgoing.delivery,reply.outcome==='lost'?'lost':'received');
  if(reply.outcome==='lost')assert.doesNotMatch(mailboxHtml(s,{filter:'sent',selected:outgoing.id}),/Letter was lost|信件已丢失/);
 }
 assert.ok(outcomes.has('lost'));assert.ok(outcomes.has('accept'));
});

test('ignoring a diplomatic letter sends no answer and has no foreign effect',()=>{
 const s=newGame('caesar'),m=send(s,'egypt','caesar',{kind:'complaint'},['ignore']);m.delivery='received';
 const before=JSON.stringify(s.relations),count=s.mail.messages.length;
 assert.equal(replyToLetter(s,m.id,'ignore',{}).ok,true);
 assert.equal(s.mail.messages.length,count);assert.equal(JSON.stringify(s.relations),before);
 advanceTo(s,s.year*12+s.month+12);assert.equal(JSON.stringify(s.relations),before);
});
