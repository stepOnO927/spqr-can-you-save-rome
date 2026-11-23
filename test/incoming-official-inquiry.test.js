import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,sendInquiry,answerOfficialInquiry,replyToLetter} from '../engine.js?v=dossier-archive-1';
import {receivedMail,syncOfficialInquiryLetters} from '../epistulae.js?v=dossier-archive-1';
import {mailboxHtml} from '../mail-ui.js?v=dossier-archive-1';
const request=s=>s.inquiries.find(x=>x.actor==='egypt'&&x.target==='caesar'&&x.subject==='leaders');
const letters=s=>receivedMail(s).filter(m=>m.context?.kind==='official_inquiry');
function arrived(){for(let i=1;i<=80;i++){const s=newGame('caesar');s.wars=[];assert.equal(sendInquiry(s,'egypt','caesar','leaders').ok,true);assert.equal(letters(s).length,0);assert.equal(answerOfficialInquiry(s,'egypt','leaders','refuse').reason,'unavailable');s.seed=(i*7000013)>>>0;tick(s);if(request(s).status==='awaiting_decision')return s}throw Error('Could not produce delivered inquiry')}
function resolveFrom(base,wanted){for(let i=1;i<=100;i++){const s=upgradeSave(JSON.parse(JSON.stringify(base)));s.seed=(i*7000013)>>>0;tick(s);if(request(s).status===wanted)return s}throw Error('No deterministic courier outcome '+wanted)}
test('arrived inquiry lets the player share a dated statement without premature AI knowledge',()=>{
 let s=arrived(),m=letters(s)[0];assert.equal(letters(s).length,1);assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/告知名义领袖/);const before=s.knowledge.egypt.caesar.reports.length;assert.equal(replyToLetter(s,m.id,'disclose_leaders',{answerOfficialInquiry}).ok,true);assert.equal(request(s).status,'pending');assert.equal(request(s).phase,'return');assert.equal(s.knowledge.egypt.caesar.reports.length,before);assert.equal(replyToLetter(s,m.id,'refuse',{answerOfficialInquiry}).ok,false);s.world.leadership.caesar=[];s=resolveFrom(s,'answered');const result=s.knowledge.egypt.caesar.reports.find(r=>r.source==='official'&&r.kind==='leaders');assert.ok(result);assert.deepEqual(result.leaders,['caesar']);assert.deepEqual(result.peopleNames.caesar,['Gaius Julius Caesar','盖乌斯·尤利乌斯·凯撒']);assert.equal(letters(s).length,1);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(letters(s).length,1);
});
test('refusal, an unclear answer, loss and silence remain distinct',()=>{
 let s=arrived(),m=letters(s)[0];assert.equal(replyToLetter(s,m.id,'refuse',{answerOfficialInquiry}).ok,true);assert.equal(resolveFrom(s,'refused').knowledge.egypt.caesar.reports.filter(r=>r.source==='official').length,0);let lost=resolveFrom(s,'no_reply');assert.equal(lost.knowledge.egypt.caesar.reports.filter(r=>r.source==='official').length,0);
 s=arrived();m=letters(s)[0];assert.equal(replyToLetter(s,m.id,'answer_limited',{answerOfficialInquiry}).ok,true);const answered=resolveFrom(s,'answered'),r=answered.knowledge.egypt.caesar.reports.find(x=>x.source==='official');assert.deepEqual(r.leaders,[]);assert.equal(r.exhaustive,false);
 s=arrived();m=letters(s)[0];assert.equal(replyToLetter(s,m.id,'ignore',{answerOfficialInquiry}).ok,true);for(let i=0;i<6;i++)tick(s);assert.equal(request(s).status,'no_reply');assert.equal(s.knowledge.egypt.caesar.reports.filter(r=>r.source==='official').length,0);assert.doesNotMatch(mailboxHtml(s,{lang:'zh',selected:m.id}),/data-mail-reply="refuse"/);
});
test('AI courts independently send inquiries to human and other AI courts',()=>{
 let human=0,ai=0;for(let seed=1;seed<=80;seed++){const s=newGame('caesar');s.wars=[];s.month=4;s.seed=(seed*931271)>>>0;for(const f of Object.values(s.factions))f.treasury=120;tick(s);for(const r of (s.inquiries||[]).filter(x=>x.subject!=='peace')){if(r.target===s.player)human++;else if(r.actor!==s.player)ai++;assert.equal(r.status,'pending');assert.equal(r.mailId,undefined)}}assert.ok(human>0,'some AI inquiries should target the player');assert.ok(ai>0,'some inquiries should occur between AI courts');
});
test('AI-to-AI inquiries can be answered without a player decision',()=>{
 let answered=false;for(let seed=1;seed<=80&&!answered;seed++){const s=newGame('caesar');s.wars=[];assert.equal(sendInquiry(s,'egypt','parthia','leaders').ok,true);const r=s.inquiries[0];r.remaining=1;s.seed=(seed*7000013)>>>0;tick(s);if(r.status==='answered'){assert.ok(s.knowledge.egypt.parthia.reports.some(x=>x.source==='official'&&x.kind==='leaders'));assert.equal(letters(s).length,0);answered=true}}assert.ok(answered)
});

test('institutional correspondence does not disclose a live hidden Roman leader',()=>{
 const s=newGame('senate');s.world.leadership.caesar=['antony'];s.world.characters.caesar.alive=false;s.world.characters.caesar.health='deceased';(s.inquiries||=[]).push({actor:'caesar',target:'senate',subject:'leaders',status:'awaiting_decision',remaining:6,sentYear:s.year,sentMonth:s.month});syncOfficialInquiryLetters(s);const m=letters(s)[0];assert.ok(m);assert.equal(m.senderId,null);assert.deepEqual(m.senderName,['Caesarian command','凯撒派军队']);assert.doesNotMatch(m.body[1],/盖乌斯|安东尼/);
});
