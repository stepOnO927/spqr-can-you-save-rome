import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,diplomacy,answerPeaceOffer,replyToLetter,upgradeSave,isWar,sendInquiry} from '../engine.js?v=office-intel-privacy-1';
import {syncPeaceLetters,receivedMail,advanceMail,sendLetter} from '../epistulae.js?v=office-intel-privacy-1';
import {mailboxHtml} from '../mail-ui.js?v=office-intel-privacy-1';

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
test('a delivered acceptance remains a reply when changed conditions prevent a new settlement',()=>{
 let delivered=false,lost=false;
 for(let seed=1;seed<=100&&!(delivered&&lost);seed++){
  let s=newGame('caesar');assert.ok(sendInquiry(s,'caesar','senate','peace').ok);const original=s.inquiries[0];
  original.remaining=1;original.sealed={status:'answered',year:s.year,month:s.month,claim:['Peace accepted; the war has ended.','议和获接受；战争结束。']};
  s.wars=[];s.seed=seed*100000+17;s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);
  const inquiry=s.inquiries.find(x=>x.actor==='caesar'&&x.target==='senate'&&x.subject==='peace');
  const mail=receivedMail(s).filter(m=>m.context?.kind==='inquiry_result'&&m.context.subject==='peace');
  if(inquiry.status==='answered'){
   delivered=true;assert.equal(inquiry.peaceSettlement,'not_concluded');assert.deepEqual(inquiry.claim,['The peace offer is accepted.','接受议和提议。']);
   assert.equal(mail.length,1);assert.match(mail[0].body[1],/回信已送达.*未能生效/);assert.ok(s.log.some(x=>x.zh.includes('回信已送达')&&x.zh.includes('未能生效')));
   s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.inquiries.find(x=>x.actor==='caesar'&&x.target==='senate'&&x.subject==='peace').peaceSettlement,'not_concluded');
  }else if(inquiry.status==='no_reply'){lost=true;assert.equal(inquiry.peaceSettlement,undefined);assert.equal(mail.length,0)}
 }
 assert.ok(delivered);assert.ok(lost);
});
test('a delivered player acceptance is not marked lost when the war ended in transit',()=>{
 let found=false;for(let seed=1;seed<=100&&!found;seed++){
  let {s,mail}=arrival(seed*100000+17);assert.ok(replyToLetter(s,mail.id,'accept',{answerPeaceOffer}).ok);s.wars=[];
  s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);const inquiry=s.inquiries.find(x=>x.actor==='parthia'&&x.subject==='peace'),reply=s.mail.messages.find(m=>m.id===inquiry.replyMailId);
  if(inquiry.status==='answered'){found=true;assert.equal(inquiry.peaceSettlement,'not_concluded');assert.equal(reply.delivery,'received');assert.ok(s.log.some(x=>x.zh.includes('回信已送达')&&x.zh.includes('未能生效')))}
 }
 assert.ok(found);
});
test('mailbox dates use the historical calendar and local language',()=>{
 const s=newGame('caesar'),m=sendLetter(s,{senderInstitution:'egypt',senderFaction:'egypt',recipient:'caesar',subject:['Test','测试'],body:['Text','正文']}).letter;m.delivery='received';m.created={year:0,month:1};
 assert.match(mailboxHtml(s,{lang:'en',selected:m.id}),/1\/1 CE/);assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/公元1年1月/);assert.doesNotMatch(mailboxHtml(s,{lang:'en',selected:m.id}),/0 CE/);
 m.created={year:-1,month:12};assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/公元前1年12月/);
});

test('unsigned peace letters do not reveal hidden changes in the sending court',()=>{
 function build(changed){const s=newGame('senate');if(changed){s.world.leadership.caesar=['antony'];s.world.characters.caesar.alive=false;s.world.characters.caesar.health='deceased'}(s.inquiries||=[]).push({actor:'caesar',target:'senate',subject:'peace',status:'awaiting_decision',duration:2,remaining:6,sentYear:s.year,sentMonth:s.month});syncPeaceLetters(s);const m=receivedMail(s).find(x=>x.context?.kind==='peace');assert.ok(m);return {s,m}}
 const first=build(false),second=build(true);assert.equal(first.m.senderId,null);assert.equal(second.m.senderId,null);assert.equal(second.m.senderPortrait,null);assert.deepEqual(first.m.senderName,['Caesarian command','凯撒派军队']);assert.deepEqual(second.m.senderName,first.m.senderName);assert.deepEqual(second.m.body,first.m.body);assert.doesNotMatch(second.m.body[1],/盖乌斯|安东尼/);
 const saved=upgradeSave(JSON.parse(JSON.stringify(second.s))),restored=receivedMail(saved).find(x=>x.id===second.m.id);assert.deepEqual(restored.senderName,second.m.senderName);assert.equal(restored.senderId,null);
});
test('a previously created peace letter keeps its recorded signature after hidden changes',()=>{
 const s=newGame('caesar');const result=sendLetter(s,{senderId:'orodes',senderFaction:'parthia',recipient:'caesar',category:'diplomatic',subject:['Peace proposal','议和提议'],body:['A proposal','一份提议'],context:{kind:'peace'}});assert.equal(result.ok,true);const m=result.letter;m.delivery='received';(s.inquiries||=[]).push({actor:'parthia',target:'caesar',subject:'peace',status:'awaiting_decision',remaining:6,mailId:m.id});const previous=[...m.senderName];s.world.leadership.parthia=['pacorus'];s.world.characters.orodes.alive=false;syncPeaceLetters(s);assert.deepEqual(m.senderName,previous);assert.equal(m.senderId,'orodes');
});
test('a dispatched institutional peace letter can arrive after the sender vanishes',()=>{
 const s=newGame('senate');(s.inquiries||=[]).push({actor:'caesar',target:'senate',subject:'peace',status:'awaiting_decision',remaining:6,sentYear:s.year,sentMonth:s.month});delete s.factions.caesar;syncPeaceLetters(s);const m=receivedMail(s).find(x=>x.context?.kind==='peace');assert.ok(m);assert.deepEqual(m.senderName,['Caesarian command','凯撒派军队']);
});
