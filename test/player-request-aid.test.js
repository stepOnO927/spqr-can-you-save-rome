import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,sendStrategicOffer,advanceStrategicOffers,upgradeSave} from '../engine.js';
import {proposeAgreement} from '../agreements.js';
import {observeDiplomacy} from '../diplomatic-knowledge.js';
import {receivedMail} from '../epistulae.js';

function setup(seed){const s=newGame('caesar');s.seed=seed;s.wars.push(['caesar','parthia']);s.factions.caesar.treasury=100;s.factions.caesar.food=100;s.factions.egypt.treasury=200;s.factions.egypt.food=100;s.relations['caesar:egypt']=60;proposeAgreement(s,'egypt','caesar','trade');observeDiplomacy(s);return s}
function advance(s){s.month++;advanceStrategicOffers(s)}
test('player sends aid request, pays courier, and learns no outcome before the reply',()=>{
 let s=setup(1);const r=sendStrategicOffer(s,'caesar','egypt','parthia',{kind:'request_aid'});assert.equal(r.ok,true);assert.equal(s.factions.caesar.treasury,95);
 assert.equal(sendStrategicOffer(s,'caesar','egypt','parthia',{kind:'request_aid'}).ok,false);
 advance(s);advance(s);assert.equal(s.world.strategicOffers[0].status,'pending');assert.equal(receivedMail(s).filter(m=>m.context?.kind==='aid_result').length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));advance(s);assert.equal(s.world.strategicOffers[0].status,'pending');advance(s);
 assert.ok(['accepted','refused','no_reply'].includes(s.world.strategicOffers[0].status));
 assert.equal(s.factions.caesar.treasury,s.world.strategicOffers[0].status==='accepted'?107:95);
 assert.equal(s.factions.caesar.food,s.world.strategicOffers[0].status==='accepted'?108:100);
 assert.equal(receivedMail(s).filter(m=>m.context?.kind==='aid_result').length,s.world.strategicOffers[0].status==='no_reply'?0:1);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(receivedMail(s).filter(m=>m.context?.kind==='aid_result').length,s.world.strategicOffers[0].status==='no_reply'?0:1);
});
test('recipient decides independently and outcomes vary without hidden early failure',()=>{
 const results=new Set();for(let seed=1;seed<=120&&results.size<3;seed++){const s=setup(seed);assert.equal(sendStrategicOffer(s,'caesar','egypt','parthia',{kind:'request_aid'}).ok,true);advance(s);advance(s);assert.equal(s.world.strategicOffers[0].status,'pending');advance(s);advance(s);const status=s.world.strategicOffers[0].status;results.add(status);assert.equal(receivedMail(s).filter(m=>m.context?.kind==='aid_result').length,status==='no_reply'?0:1)}
 assert.ok(results.has('accepted'));assert.ok(results.has('refused'));assert.ok(results.has('no_reply'));
});
test('player cannot use aid requests without a war, funds, or valid known contact',()=>{
 const s=setup(1);s.wars=[];assert.equal(sendStrategicOffer(s,'caesar','egypt','parthia',{kind:'request_aid'}).ok,false);s.wars.push(['caesar','parthia']);s.factions.caesar.treasury=4;assert.equal(sendStrategicOffer(s,'caesar','egypt','parthia',{kind:'request_aid'}).ok,false);
 assert.equal(sendStrategicOffer(s,'caesar','egypt','parthia',{kind:'join_war'}).ok,false);
});
