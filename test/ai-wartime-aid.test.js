import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,tick,sendStrategicOffer,advanceStrategicOffers,upgradeSave} from '../engine.js?v=ai-wartime-aid-1';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=diplomatic-chronicle-1';
import {buildChessboard} from '../chessboard.js?v=diplomatic-chronicle-1';
function setup(seed){const s=newGame('caesar');s.seed=seed;s.wars.push(['egypt','senate']);s.relations['egypt:parthia']=40;assert.ok(proposeAgreement(s,'egypt','parthia','trade').ok);observeDiplomacy(s);s.factions.parthia.treasury=100;s.factions.parthia.food=100;return s}
function advance(s,n){for(let i=0;i<n;i++){s.month++;advanceStrategicOffers(s)}}
test('aid requests hide foreign reserves, take time and do not bind a human recipient',()=>{
 const a=setup(37),b=setup(37);b.factions.parthia.treasury=0;
 assert.deepEqual(sendStrategicOffer(a,'egypt','parthia','senate',{kind:'request_aid'}),sendStrategicOffer(b,'egypt','parthia','senate',{kind:'request_aid'}));
 assert.equal(sendStrategicOffer(a,'egypt','caesar','senate',{kind:'request_aid'}).reason,'player_decision');
 const balance=a.factions.egypt.treasury;advance(a,1);advance(b,1);assert.equal(a.world.strategicOffers[0].status,'pending');assert.equal(b.world.strategicOffers[0].status,'pending');assert.equal(a.factions.egypt.treasury,balance);
 advance(a,1);advance(b,1);assert.equal(a.world.strategicOffers[0].status,'pending');assert.equal(b.world.strategicOffers[0].status,'pending');
});
test('a request created during full AI simulation cannot turn into a misleading player war invitation',()=>{
 const s=setup(37);s.world.diplomaticKnowledge.egypt.contact={id:'contact',kind:'agreement',status:'active',parties:['egypt','caesar'],year:s.year,month:s.month};assert.ok(sendStrategicOffer(s,'egypt','caesar','senate',{kind:'request_aid',autoplayPlayer:true}).ok);const treasury=s.factions.caesar.treasury;advance(s,2);
 assert.ok(['no_reply'].includes(s.world.strategicOffers[0].status));assert.equal(s.factions.caesar.treasury,treasury);
});
test('an undiscovered AI aid request and sealed answer do not appear in the player network',()=>{
 const s=setup(123),other=structuredClone(s);assert.ok(sendStrategicOffer(s,'egypt','parthia','senate',{kind:'request_aid'}).ok);advance(s,2);advance(other,2);assert.deepEqual(buildChessboard(s,'caesar'),buildChessboard(other,'caesar'));
});
test('accepted aid consumes real donor resources and arrives only with the return courier',()=>{
 const results=new Set();let success=false;
 for(let seed=1;seed<=60;seed++){
  let s=setup(seed*100000+17),beforeDonor=s.factions.parthia.treasury,beforeFood=s.factions.parthia.food;
  assert.ok(sendStrategicOffer(s,'egypt','parthia','senate',{kind:'request_aid'}).ok);const beforeSender=s.factions.egypt.treasury,food=s.factions.egypt.food;
  advance(s,2);if(s.world.strategicOffers[0].sealed?.decision==='accepted'){assert.equal(s.factions.parthia.treasury,beforeDonor-12);assert.equal(s.factions.parthia.food,beforeFood-8);assert.equal(s.factions.egypt.treasury,beforeSender)}
  s=upgradeSave(structuredClone(s));advance(s,2);const offer=s.world.strategicOffers[0];results.add(offer.status);
  if(offer.status==='accepted'){success=true;assert.equal(s.factions.egypt.treasury,beforeSender+12);assert.equal(s.factions.egypt.food,food+8);assert.deepEqual(offer.deliveredAid,{treasury:12,food:8})}
 }
 assert.ok(success);assert.ok(results.has('refused'));assert.ok(results.has('no_reply'));
});
test('a Roman-Egyptian war prompts some autonomous Egyptian aid requests without forcing a response',()=>{
 for(const autoplayPlayer of [true,false]){const statuses=new Set();for(let seed=1;seed<=10;seed++){const s=newGame('caesar');s.difficulty='expert';s.seed=seed;s.wars.push(['caesar','egypt']);for(let month=0;month<24;month++)tick(s,{autoplayPlayer});for(const offer of s.world.strategicOffers||[])if(offer.actor==='egypt'&&offer.kind==='request_aid'){statuses.add(offer.status);if(!autoplayPlayer)assert.notEqual(offer.recipient,s.player)}}
  assert.ok(statuses.has('accepted'));assert.ok(statuses.has('refused'));assert.ok(statuses.size>1);
 }
});
