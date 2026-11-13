import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=gathering-presence-1';
import {sendLetter,replyToLetter,advanceMail,receivedMail} from '../epistulae.js?v=gathering-presence-1';
import {mailboxHtml} from '../mail-ui.js?v=gathering-presence-1';

function invitation(){
 const s=newGame('caesar'),host=s.world.characters['fictional:1'],guest=s.world.characters.caesar;
 host.location=guest.location='cisalpine';s.wars=[];
 const result=sendLetter(s,{senderId:host.id,senderFaction:'caesar',recipient:'caesar',category:'invitations',subject:['Gathering','聚会'],body:['Please come','请出席'],options:['accept','representative'],context:{kind:'banquet',leader:guest.id}});
 result.letter.delivery='received';return {s,host,guest,letter:result.letter};
}
function advanceTo(s,date){s.year=Math.floor((date-1)/12);s.month=date-s.year*12;advanceMail(s)}

test('a real gathering happens only when both participants are able and present',()=>{
 const fixture=invitation(),{s,host,guest,letter}=fixture;assert.match(mailboxHtml(s,{lang:'zh',selected:letter.id}),/不会自动移动人物/);assert.equal(replyToLetter(s,letter.id,'accept',{}).ok,true);
 const event=s.mail.events.at(-1);advanceTo(s,event.date);assert.equal(event.status,'held');
 const bond=s.world.personalRelations[[host.id,guest.id].sort().join(':')];assert.equal(bond.meetings,1);assert.equal(bond.trust,2);
});

test('illness, absence, movement or defection prevents a fictional meeting and produces a result letter',()=>{
 const scenarios=[
  ({host})=>host.health='seriously_ill',({guest})=>guest.health='dying',
  ({host})=>host.missing={origin:'cisalpine',remaining:2},({guest})=>guest.travel={destination:'gaul',legs:[],remaining:1},
  ({s,guest})=>{s.armies.find(a=>a.characterId===guest.id).move={to:'italiaN',remaining:1}},
  ({host})=>host.faction='senate',({guest})=>guest.location='gaul'
 ];
 for(const change of scenarios){
  let f=invitation();assert.equal(replyToLetter(f.s,f.letter.id,'accept',{}).ok,true);change(f);
  const eventId=f.s.mail.events.at(-1).id;f.s=upgradeSave(JSON.parse(JSON.stringify(f.s)));const event=f.s.mail.events.find(e=>e.id===eventId);advanceTo(f.s,event.date);
  assert.equal(event.status,'missed');assert.equal(f.s.world.personalRelations[[f.host.id,f.guest.id].sort().join(':')],undefined);
  const notice=f.s.mail.messages.find(m=>m.context?.kind==='invitation_result');assert.ok(notice,'a missed event produces a report even if the host left');
  if(f.s.world.characters[f.host.id].faction!=='caesar')assert.equal(notice.senderInstitution,'caesar');
  advanceTo(f.s,notice.arrival);assert.ok(receivedMail(f.s).some(m=>m.id===notice.id));
 }
});

test('a representative must be available, present, and distinct from the host',()=>{
 const {s,host,guest,letter}=invitation();for(const p of Object.values(s.world.characters))if(p.faction==='caesar'&&p.id!==guest.id&&p.id!==host.id)p.location=null;
 assert.equal(replyToLetter(s,letter.id,'representative',{}).reason,'representative','the host cannot be their own guest');
 const delegate=s.world.characters.lepidus;delegate.location=guest.location;delegate.health='seriously_ill';assert.equal(replyToLetter(s,letter.id,'representative',{}).reason,'representative');
 delegate.health='healthy';assert.equal(replyToLetter(s,letter.id,'representative',{}).ok,true);assert.equal(s.mail.events.at(-1).participantId,delegate.id);
});
