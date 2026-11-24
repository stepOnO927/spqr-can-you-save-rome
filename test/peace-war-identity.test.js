import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,sendInquiry,diplomacy,hasPendingInquiry,upgradeSave,tick,isWar,answerPeaceOffer,replyToLetter} from '../engine.js?v=dossier-archive-1';
import {peaceWarIsCurrent,canSettlePeaceTerms} from '../peace-terms.js?v=territorial-peace-1';
import {syncPeaceLetters,receivedMail} from '../epistulae.js?v=dossier-archive-1';
import {mailboxHtml} from '../mail-ui.js?v=dossier-archive-1';
function setup(seed=1000003){const s=newGame('caesar');s.seed=seed;s.difficulty='beginner';for(const a of s.armies.filter(a=>a.owner!=='caesar')){a.men=500;a.move=null;a.siege=null}s.factions.senate.treasury=30;s.factions.senate.manpower=0;return s}
function reopen(s){assert.ok(diplomacy(s,'caesar','senate','peace',{acceptedByPlayer:true}));assert.ok(diplomacy(s,'caesar','senate','war'))}
test('ordinary peace offers bind to the current war and a stale offer does not block a fresh letter',()=>{
 let s=setup();assert.ok(sendInquiry(s,'caesar','senate','peace').ok);const old=s.inquiries[0];assert.equal(old.peaceWarGeneration,0);reopen(s);
 assert.equal(peaceWarIsCurrent(s,old),false);assert.equal(canSettlePeaceTerms(s,old),false);assert.equal(hasPendingInquiry(s,'caesar','senate'),false);
 assert.ok(sendInquiry(s,'caesar','senate','peace').ok);assert.equal(s.inquiries[0].peaceWarGeneration,1);assert.equal(peaceWarIsCurrent(s,s.inquiries[0]),true);assert.equal(hasPendingInquiry(s,'caesar','senate'),true);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.inquiries[0].peaceWarGeneration,1);assert.equal(s.inquiries[1].peaceWarGeneration,0);
});
test('a delivered old acceptance cannot end a newly declared war',()=>{
 let delivered=false;
 for(let seed=1;seed<=80&&!delivered;seed++){
  let s=setup(seed*100003);assert.ok(sendInquiry(s,'caesar','senate','peace').ok);const old=s.inquiries[0];old.remaining=1;old.sealed={status:'answered',year:s.year,month:s.month,claim:['The peace offer is accepted.','接受议和提议。']};reopen(s);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);const result=s.inquiries.find(l=>l.actor==='caesar'&&l.subject==='peace');assert.ok(isWar(s,'caesar','senate'));
  if(result.status==='answered'){delivered=true;assert.equal(result.peaceSettlement,'not_concluded');assert.ok(s.mail.messages.some(m=>m.context?.kind==='inquiry_result'&&/未能生效/.test(m.body[1])))}
 }
 assert.ok(delivered);
});
test('a stale received letter cannot answer a newer request from the same court',()=>{
 const s=setup();assert.ok(sendInquiry(s,'senate','caesar','peace').ok);const old=s.inquiries[0];old.status='awaiting_decision';old.phase='at_court';old.remaining=6;syncPeaceLetters(s);const oldMail=old.mailId;reopen(s);
 assert.ok(sendInquiry(s,'senate','caesar','peace').ok);const current=s.inquiries[0];current.status='awaiting_decision';current.phase='at_court';current.remaining=6;syncPeaceLetters(s);
 assert.equal(replyToLetter(s,oldMail,'accept',{answerPeaceOffer}).ok,false);assert.equal(current.status,'awaiting_decision');assert.equal(old.status,'awaiting_decision');
 const html=mailboxHtml(s,{lang:'zh',selected:oldMail});assert.match(html,/属于已结束的战争/);assert.doesNotMatch(html,/data-mail-reply="accept"/);
 assert.ok(replyToLetter(s,current.mailId,'accept',{answerPeaceOffer}).ok);assert.equal(current.phase,'return');assert.equal(old.phase,'at_court');
});
test('an automated court dismisses a stale request instead of waiting forever',()=>{
 const s=setup();assert.ok(sendInquiry(s,'senate','caesar','peace').ok);const old=s.inquiries[0];old.status='awaiting_decision';old.remaining=6;reopen(s);tick(s,{autoplayPlayer:true});assert.equal(old.status,'no_reply');assert.ok(isWar(s,'caesar','senate'));
});
test('legacy letters without a recorded war identity retain their existing compatibility',()=>{
 const s=setup();const old={actor:'senate',target:'caesar',subject:'peace',status:'awaiting_decision',remaining:6};s.inquiries=[old];syncPeaceLetters(s);assert.ok(receivedMail(s).some(m=>m.id===old.mailId));assert.equal(peaceWarIsCurrent(s,old),true);assert.ok(answerPeaceOffer(s,'senate','refuse').ok);
});
test('a fulfilled peace proposal is not mislabeled as a failed stale offer',()=>{
 let completed=false;
 for(let i=1;i<=80&&!completed;i++){
  const s=setup(i*100003);assert.ok(sendInquiry(s,'senate','caesar','peace').ok);const l=s.inquiries[0];l.status='awaiting_decision';l.remaining=6;syncPeaceLetters(s);assert.ok(answerPeaceOffer(s,'senate','accept').ok);tick(s);
  if(l.peaceSettlement==='concluded'){completed=true;assert.doesNotMatch(mailboxHtml(s,{lang:'zh',selected:l.mailId}),/属于已结束的战争/)}
 }
 assert.ok(completed);
});
test('a new war does not discard an unrelated unanswered official inquiry',()=>{
 const s=setup();assert.ok(sendInquiry(s,'caesar','senate','leaders').ok);reopen(s);assert.equal(hasPendingInquiry(s,'caesar','senate'),true);assert.equal(sendInquiry(s,'caesar','senate','peace').reason,'pending');
});
