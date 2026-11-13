import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeMail,sendLetter,advanceMail,receivedMail,unreadCount,markRead,archiveLetter,replyToLetter,treatyLetter,warLetters,syncPeaceLetters} from '../epistulae.js';
import {newGame,diplomacy,tick,upgradeSave,answerPeaceOffer} from '../engine.js';
import {mailboxHtml} from '../mail-ui.js';

const state = () => {
  const factions = Object.fromEntries(['caesar','senate','egypt','parthia'].map(id => [id,{treasury:100}]));
  const places = {caesar:'cisalpine',senate:'roma',egypt:'egypt',parthia:'parthia'};
  const characters = Object.fromEntries(Object.entries({caesar:'caesar',pompey:'senate',cleopatra:'egypt',orodes:'parthia'}).map(([id,faction]) => [id,{id,faction,alive:true,location:places[faction]}]));
  return {year:-49,month:1,player:'caesar',factions,regions:Object.entries(places).map(([owner,id])=>({id,owner})),wars:[['caesar','senate']],relations:{},world:{characters,leadership:{caesar:['caesar'],senate:['pompey'],egypt:['cleopatra'],parthia:['orodes']}}};
};
const advance = (s, months, actions={}) => {for(let i=0;i<months;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceMail(s,actions)}};

test('delayed treaty reaches inbox, reply changes state and persists with thread', () => {
  const s=state(),sent=treatyLetter(s,'egypt','caesar');
  assert.equal(sent.ok,true);
  assert.equal(unreadCount(s),0);
  s.month=11; advanceMail(s);
  assert.equal(unreadCount(s),1);
  assert.equal(markRead(s,sent.letter.id),true);
  assert.equal(unreadCount(s),0);
  const agreements=[];
  const result=replyToLetter(s,sent.letter.id,'accept',{proposeAgreement:(_s,actor,target,type)=>{agreements.push([actor,target,type]);return {ok:true}}});
  assert.equal(result.ok,true);
  assert.equal(agreements.length,0);
  advance(s,10,{proposeAgreement:(_s,actor,target,type)=>{agreements.push([actor,target,type]);return {ok:true}}});
  assert.deepEqual(agreements,[['egypt','caesar','non_aggression']]);
  assert.equal(s.mail.messages.filter(m=>m.threadId===sent.letter.threadId).length,2);
  assert.equal(receivedMail(JSON.parse(JSON.stringify(s))).find(m=>m.id===sent.letter.id).responses[0].choice,'accept');
  assert.equal(archiveLetter(s,sent.letter.id),true);
});

test('war notification follows real war and is only generated once', () => {
  const s=state(),before=s.wars.map(w=>w.slice());
  s.wars.push(['parthia','caesar']);
  warLetters(s,before); warLetters(s,before);
  assert.equal(s.mail.messages.filter(m=>m.context?.kind==='war').length,1);
  assert.equal(receivedMail(s).length,0);
  advance(s,8);
  assert.equal(receivedMail(s).filter(m=>m.priority==='critical').length,1);
});

test('unknown sender is rejected and AI correspondence resolves without player inbox', () => {
  const s=state();
  assert.equal(sendLetter(s,{senderId:'imaginary',senderFaction:'egypt',recipient:'caesar',subject:['x','x'],body:['x','x']}).ok,false);
  const offered=treatyLetter(s,'egypt','parthia');
  assert.equal(offered.ok,true);
  const agreements=[];
  advance(s,20,{proposeAgreement:(_s,a,b,t)=>{agreements.push([a,b,t]);return {ok:true}}});
  assert.equal(offered.letter.responses[0].ai,true);
  assert.deepEqual(agreements.filter(([a,b])=>a==='egypt'&&b==='parthia'),[['egypt','parthia','non_aggression']]);
  assert.equal(offered.letter.recipient,'parthia');
});

test('campaign war creates delayed critical mail and mailbox renders in both languages', () => {
  const s=newGame('caesar');
  assert.equal(diplomacy(s,'parthia','caesar','war'),true);
  assert.equal(s.mail.messages.filter(m=>m.context?.kind==='war').length,1);
  assert.equal(unreadCount(s),0);
  for(let i=0;i<8;i++) tick(s);
  assert.ok(receivedMail(s).some(m=>m.context?.kind==='war'));
  assert.match(mailboxHtml(s,{lang:'en'}),/Imperial Mailbox/);
  assert.match(mailboxHtml(s,{lang:'zh'}),/帝国来信/);
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.mail.messages.filter(m=>m.context?.kind==='war').length,1);
});

test('existing fictional courtier sends personal letter and invitation with persistent effects', () => {
  const s=newGame('caesar');
  s.month=4;advanceMail(s);
  const personal=s.mail.messages.find(m=>m.context?.kind==='personal_age');
  assert.ok(personal?.senderId?.startsWith('fictional:'));
  s.month=6;advanceMail(s);
  const trustKey=[personal.senderId,'caesar'].sort().join(':');
  assert.equal(replyToLetter(s,personal.id,'truth',{}).ok,true);
  assert.equal(s.world.personalRelations[trustKey].trust,3);
  s.month=8;advanceMail(s);
  const invite=s.mail.messages.find(m=>m.context?.kind==='banquet');
  assert.ok(invite);
  s.month=10;advanceMail(s);
  assert.equal(replyToLetter(s,invite.id,'accept',{}).ok,true);
  assert.equal(s.mail.events.at(-1).status,'scheduled');
  s.month=11;advanceMail(s);
  assert.equal(s.mail.events.at(-1).status,'held');
  assert.equal(s.world.personalRelations[trustKey].trust,5);
});

test('existing peace inquiry appears once in mailbox and uses real reply route', () => {
  const s=newGame('caesar');
  assert.equal(diplomacy(s,'parthia','caesar','war'),true);
  (s.inquiries ||= []).unshift({actor:'parthia',target:'caesar',subject:'peace',status:'awaiting_decision',duration:4,remaining:6});
  syncPeaceLetters(s);syncPeaceLetters(s);
  const letters=receivedMail(s).filter(m=>m.context?.kind==='peace');
  assert.equal(letters.length,1);
  assert.equal(replyToLetter(s,letters[0].id,'accept',{answerPeaceOffer}).ok,true);
  assert.equal(s.inquiries[0].status,'pending');
  assert.equal(s.inquiries[0].phase,'return');
  assert.equal(s.wars.some(w=>w.includes('parthia')&&w.includes('caesar')),true);
});

test('treasury audit spends real funds and reports measured state after two months', () => {
  const s=newGame('caesar');
  s.year=-48;s.month=1;advanceMail(s);
  const report=s.mail.messages.find(m=>m.eventId==='treasury:-48:caesar');
  assert.ok(report);
  s.month=2;advanceMail(s);
  const before=s.factions.caesar.treasury;
  assert.equal(replyToLetter(s,report.id,'audit',{}).ok,true);
  assert.equal(s.factions.caesar.treasury,before-3);
  s.month=4;advanceMail(s);
  const audit=s.mail.messages.find(m=>m.subject?.[0]==='Requested treasury audit');
  assert.ok(audit);
  assert.ok(audit.body[0].includes(String(before-3)));
  assert.equal(audit.threadId,report.threadId);
});
