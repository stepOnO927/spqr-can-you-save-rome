import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,diplomacy,answerPeaceOffer,replyToLetter,upgradeSave,isWar} from '../engine.js?v=peace-mail-courier-1';
import {syncPeaceLetters,receivedMail,advanceMail,sendLetter} from '../epistulae.js?v=peace-mail-courier-1';
import {mailboxHtml} from '../mail-ui.js?v=peace-mail-courier-1';

function arrival(seed){
 const s=newGame('caesar');s.seed=seed;assert.ok(diplomacy(s,'parthia','caesar','war'));
 (s.inquiries||=[]).unshift({actor:'parthia',target:'caesar',subject:'peace',status:'awaiting_decision',duration:2,remaining:6,sentYear:s.year,sentMonth:s.month});
 s.month+=2;syncPeaceLetters(s);const inquiry=s.inquiries[0],mail=receivedMail(s).find(m=>m.id===inquiry.mailId);return {s,inquiry,mail};
}
test('an incoming peace letter records when it was sent, expires and survives old saves',()=>{
 let {s,inquiry,mail}=arrival(1);assert.deepEqual(mail.created,{year:inquiry.sentYear,month:inquiry.sentMonth});assert.equal(mail.expires,s.year*12+s.month+5);
 const text=mailboxHtml(s,{lang:'zh',selected:mail.id});assert.match(text,/寄出/);assert.match(text,/收到/);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));syncPeaceLetters(s);assert.equal(receivedMail(s).filter(m=>m.context?.kind==='peace').length,1);
 const old=newGame('caesar');(old.inquiries||=[]).push({actor:'senate',target:'caesar',subject:'peace',status:'awaiting_decision',remaining:6});syncPeaceLetters(old);assert.deepEqual(receivedMail(old).find(m=>m.context?.kind==='peace').created,{year:old.year,month:old.month});
});
test('older in-flight replies reconnect to the diplomatic courier on load',()=>{
 let {s,mail}=arrival(1);assert.ok(replyToLetter(s,mail.id,'refuse',{answerPeaceOffer}).ok);const inquiry=s.inquiries[0],reply=s.mail.messages.find(m=>m.id===inquiry.replyMailId);
 delete inquiry.replyMailId;reply.context.kind='reply';reply.delivery='received';mail.created={year:s.year,month:s.month};
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const restored=s.inquiries[0],out=s.mail.messages.find(m=>m.id===restored.replyMailId),received=receivedMail(s).find(m=>m.id===mail.id);
 assert.ok(out);assert.equal(out.context.kind,'peace_reply');assert.equal(out.delivery,'traveling');assert.deepEqual(received.created,{year:restored.sentYear,month:restored.sentMonth});
});
test('an offer answered in diplomacy is not still actionable in the mailbox',()=>{
 const {s,mail}=arrival(1);assert.ok(answerPeaceOffer(s,'parthia','refuse').ok);
 const html=mailboxHtml(s,{lang:'zh',selected:mail.id});assert.match(html,/已在外交界面答复/);assert.doesNotMatch(html,/data-mail-reply="accept"/);
});
test('peace reply and diplomacy use the same courier result after saving',()=>{
 const outcomes=new Set();for(let seed=1;seed<=100;seed++){
  let {s,mail}=arrival(seed*100000+17);assert.ok(replyToLetter(s,mail.id,'accept',{answerPeaceOffer}).ok);let inquiry=s.inquiries[0],reply=s.mail.messages.find(m=>m.id===inquiry.replyMailId);
  assert.ok(reply);assert.equal(reply.delivery,'traveling');assert.equal(isWar(s,'parthia','caesar'),true);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));inquiry=s.inquiries[0];reply=s.mail.messages.find(m=>m.id===inquiry.replyMailId);
  // Mail processing alone cannot independently deliver or lose the reply.
  const oldArrival=reply.arrival;reply.arrival=s.year*12+s.month;advanceMail(s);assert.equal(reply.delivery,'traveling');reply.arrival=oldArrival;
  tick(s);outcomes.add(inquiry.status);assert.equal(reply.delivery,inquiry.status==='answered'?'received':'lost');assert.equal(isWar(s,'parthia','caesar'),inquiry.status!=='answered');
  if(outcomes.has('answered')&&outcomes.has('no_reply'))break;
 }
 assert.ok(outcomes.has('answered'));assert.ok(outcomes.has('no_reply'));
});
test('mailbox dates use the historical calendar and local language',()=>{
 const s=newGame('caesar'),m=sendLetter(s,{senderInstitution:'egypt',senderFaction:'egypt',recipient:'caesar',subject:['Test','测试'],body:['Text','正文']}).letter;m.delivery='received';m.created={year:0,month:1};
 assert.match(mailboxHtml(s,{lang:'en',selected:m.id}),/1\/1 CE/);assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/公元1年1月/);assert.doesNotMatch(mailboxHtml(s,{lang:'en',selected:m.id}),/0 CE/);
 m.created={year:-1,month:12};assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/公元前1年12月/);
});
