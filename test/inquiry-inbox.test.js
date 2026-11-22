import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,sendInquiry} from '../engine.js?v=world-kings-regional-density-1';
import {receivedMail} from '../epistulae.js?v=world-kings-regional-density-1';
import {advanceMailReports} from '../mail-reports.js?v=world-kings-regional-density-1';
const replies=s=>receivedMail(s).filter(m=>m.context?.kind==='inquiry_result');
function trial(sealed,desired){const start=newGame('caesar');start.wars=[];sendInquiry(start,'caesar','egypt','successor');start.inquiries[0].remaining=1;start.inquiries[0].sealed=sealed;for(let i=1;i<100;i++){const s=upgradeSave(JSON.parse(JSON.stringify(start)));s.seed=(i*7000013)>>>0;tick(s);if(s.inquiries[0].status===desired)return s}throw Error('No deterministic outcome: '+desired)}
test('a received official response is a dated unverified letter that survives save/load',()=>{
 const s=trial({status:'answered',year:-49,month:1,claim:['An old statement','一份旧说法'],report:{kind:'succession',value:'unknown'}},'answered'),m=replies(s)[0];assert.ok(m);assert.match(m.body[1],/一份旧说法/);assert.match(m.body[1],/未经独立核实/);assert.equal(m.confidence,'unverified');assert.deepEqual(m.created,{year:-49,month:1});assert.equal(m.delivery,'received');advanceMailReports(s);const reloaded=upgradeSave(JSON.parse(JSON.stringify(s)));advanceMailReports(reloaded);assert.equal(replies(reloaded).length,1);
});
test('a refusal is a letter, while a lost request or reply produces no letter',()=>{
 const refused=trial({status:'refused',year:-49,month:1},'refused');assert.match(replies(refused)[0].body[1],/不愿回答/);assert.deepEqual(replies(refused)[0].created,{year:-49,month:1});
 const lost=trial({status:'answered',year:-49,month:1,claim:['SECRET','秘密内容']},'no_reply');assert.equal(replies(lost).length,0);assert.equal(lost.inquiries[0].claim,undefined);
});
test('pending and unrelated old records never fabricate an inbox reply',()=>{
 const s=newGame('caesar');sendInquiry(s,'caesar','egypt','leaders');s.inquiries.push({actor:'caesar',target:'egypt',status:'answered',claim:['Old','旧答复']});advanceMailReports(s);assert.equal(replies(s).length,0);assert.equal(s.inquiries[0].status,'pending');
});
