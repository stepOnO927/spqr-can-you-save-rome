import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,sendStrategicOffer,advanceStrategicOffers,answerStrategicOffer,replyToLetter,isWar,upgradeSave} from '../engine.js?v=frontier-response-1';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=diplomatic-chronicle-1';
import {buildChessboard} from '../chessboard.js?v=diplomatic-chronicle-1';
import {receivedMail} from '../epistulae.js?v=portraits-hundred-days-1';
import {mailboxHtml} from '../mail-ui.js?v=portraits-hundred-days-1';

function setup(seed){
 const s=newGame('caesar');s.seed=seed;s.wars.push(['egypt','senate']);s.relations['egypt:parthia']=40;
 assert.ok(proposeAgreement(s,'egypt','parthia','trade').ok);observeDiplomacy(s);s.factions.parthia.food=100;s.factions.parthia.treasury=100;s.factions.parthia.stability=80;
 for(const a of s.armies.filter(x=>x.owner==='parthia'))a.men=10000;return s;
}
function advance(s,count){for(let i=0;i<count;i++){s.month++;advanceStrategicOffers(s)}}

test('a coordination letter costs resources, travels and never binds the human',()=>{
 const s=setup(1000),before=s.factions.egypt.treasury;
 assert.equal(sendStrategicOffer(s,'caesar','egypt','senate').reason,'player_decision');
 assert.ok(sendStrategicOffer(s,'egypt','parthia','senate').ok);assert.equal(s.factions.egypt.treasury,before-5);
 assert.equal(sendStrategicOffer(s,'egypt','parthia','senate').reason,'pending');advance(s,1);assert.equal(s.world.strategicOffers[0].status,'pending');assert.equal(isWar(s,'parthia','senate'),false);
});

test('an in-flight offer survives save migration without charging again',()=>{
 let s=setup(1000);assert.ok(sendStrategicOffer(s,'egypt','parthia','senate').ok);advance(s,1);const balance=s.factions.egypt.treasury;
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.strategicOffers[0].remaining,1);assert.equal(s.factions.egypt.treasury,balance);advance(s,3);
 assert.equal(s.world.strategicOffers.length,1);assert.ok(['accepted','refused','no_reply'].includes(s.world.strategicOffers[0].status));assert.equal(s.factions.egypt.treasury,balance);
});

test('recipient decisions vary and remain private until a reply arrives',()=>{
 const outcomes=new Set();for(let seed=0;seed<80;seed++){
  const s=setup(seed*100000+17);assert.ok(sendStrategicOffer(s,'egypt','parthia','senate').ok);advance(s,2);
  const offer=s.world.strategicOffers[0];if(offer.phase==='return'){
   assert.equal(offer.status,'pending');assert.ok(offer.sealed);const board=JSON.stringify(buildChessboard(s,'caesar'));assert.ok(!board.includes('join_war'));
   if(offer.sealed.decision==='accepted')assert.equal(isWar(s,'parthia','senate'),true);
  }
  advance(s,2);outcomes.add(offer.status);if(offer.status==='no_reply')assert.equal(offer.sealed,undefined);
 }
 assert.ok(outcomes.has('accepted'));assert.ok(outcomes.has('refused'));assert.ok(outcomes.has('no_reply'));
});

test('a recipient decides from its own reports, not the target’s hidden forces',()=>{
 const a=setup(123456),b=JSON.parse(JSON.stringify(a));for(const unit of b.armies.filter(x=>x.owner==='senate'))unit.men=999999;b.factions.senate.treasury=-999;b.factions.senate.stability=0;
 assert.ok(sendStrategicOffer(a,'egypt','parthia','senate').ok);assert.ok(sendStrategicOffer(b,'egypt','parthia','senate').ok);advance(a,2);advance(b,2);
 assert.deepEqual(a.world.strategicOffers[0],b.world.strategicOffers[0]);
});

test('an unseen peace after dispatch does not magically change the recipient’s decision',()=>{
 const a=setup(123456),b=JSON.parse(JSON.stringify(a));assert.ok(sendStrategicOffer(a,'egypt','parthia','senate').ok);assert.ok(sendStrategicOffer(b,'egypt','parthia','senate').ok);
 b.wars=b.wars.filter(w=>!(w.includes('egypt')&&w.includes('senate')));advance(a,2);advance(b,2);assert.deepEqual(a.world.strategicOffers[0],b.world.strategicOffers[0]);
});

test('shared-threat links are explicitly estimates from observed wars, not proof of secret coordination',()=>{
 const s=newGame('caesar');s.world.diplomaticKnowledge.caesar={one:{id:'one',kind:'war',status:'active',parties:['egypt','senate'],year:s.year,month:s.month},two:{id:'two',kind:'war',status:'active',parties:['parthia','senate'],year:s.year,month:s.month}};
 const board=buildChessboard(s,'caesar'),link=board.links.find(x=>x.kind==='shared_threat'&&[x.from,x.to].includes('f:egypt')&&[x.from,x.to].includes('f:parthia'));
 assert.ok(link);assert.equal(link.certainty,'estimate');assert.match(link.detail[0],/no coalition or contact is established/);
 s.world.strategicOffers=[{actor:'egypt',recipient:'parthia',target:'senate',kind:'join_war',status:'pending',sealed:{decision:'accepted'}}];assert.deepEqual(buildChessboard(s,'caesar'),board);
});

test('AI courts initiate coordination independently while Rome is human or automated',()=>{
 for(const autoplayPlayer of [false,true]){
  const outcomes=Array.from({length:18},(_,i)=>{const s=setup(i*100000+17);s.difficulty='expert';s.month=6;tick(s,{autoplayPlayer});return s});
  assert.ok(outcomes.some(s=>(s.world.strategicOffers||[]).some(x=>x.actor==='egypt'&&x.recipient==='parthia'&&x.target==='senate')));
  if(!autoplayPlayer)assert.ok(outcomes.every(s=>(s.world.strategicOffers||[]).every(x=>x.actor!=='caesar')));
 }
});

function playerOffer(){
 for(let seed=1;seed<200;seed++){
  const s=newGame('caesar');s.seed=seed;s.wars.push(['egypt','parthia']);s.relations['caesar:egypt']=40;assert.ok(proposeAgreement(s,'egypt','caesar','trade').ok);observeDiplomacy(s);
  assert.ok(sendStrategicOffer(s,'egypt','caesar','parthia').ok);advance(s,2);
  if(s.world.strategicOffers[0].status==='awaiting_decision')return s;
 }
 throw Error('no player offer delivered');
}
test('a delivered AI offer appears once in the player mailbox and needs a real decision',()=>{
 let s=playerOffer();const offer=s.world.strategicOffers[0],m=receivedMail(s).find(x=>x.context?.offerId===offer.id);
 assert.ok(m);assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/请求军事协作/);assert.match(mailboxHtml(s,{lang:'zh',selected:m.id}),/立即宣战/);assert.equal(isWar(s,'caesar','parthia'),false);
 assert.deepEqual(m.created,{year:offer.year,month:offer.month});m.created={year:s.year,month:s.month};
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(receivedMail(s).filter(x=>x.context?.offerId===offer.id).length,1);
 assert.deepEqual(receivedMail(s).find(x=>x.id===m.id).created,{year:offer.year,month:offer.month});
 assert.equal(replyToLetter(s,m.id,'join_war',{answerStrategicOffer}).ok,true);assert.equal(isWar(s,'caesar','parthia'),true);
 assert.equal(s.world.strategicOffers[0].phase,'return');assert.equal(s.world.strategicOffers[0].status,'pending');assert.equal(replyToLetter(s,m.id,'join_war',{answerStrategicOffer}).ok,false);
 const sent=s.mail.messages.find(x=>x.context?.kind==='strategic_reply');assert.ok(sent);assert.equal(sent.delivery,'traveling');advance(s,1);assert.equal(sent.delivery,'traveling');advance(s,1);
 assert.ok(['accepted','no_reply'].includes(s.world.strategicOffers[0].status));assert.equal(sent.delivery,s.world.strategicOffers[0].status==='accepted'?'received':'lost');
});
test('player may decline, ignore, or let the offer expire without starting a war',()=>{
 for(const choice of ['refuse','ignore','expired']){const s=playerOffer(),offer=s.world.strategicOffers[0],m=receivedMail(s).find(x=>x.context?.offerId===offer.id);
  if(choice==='expired'){advance(s,6);assert.equal(offer.status,'no_reply');assert.equal(replyToLetter(s,m.id,'join_war',{answerStrategicOffer}).ok,false)}
  else {assert.equal(replyToLetter(s,m.id,choice,{answerStrategicOffer}).ok,true);if(choice==='refuse'){assert.equal(offer.status,'pending');advance(s,2);assert.ok(['refused','no_reply'].includes(offer.status))}else assert.equal(offer.status,'no_reply')}
  assert.equal(isWar(s,'caesar','parthia'),false);
 }
});
test('an existing non-aggression treaty prevents accepting a war request',()=>{
 const s=playerOffer(),offer=s.world.strategicOffers[0],m=receivedMail(s).find(x=>x.context?.offerId===offer.id);s.relations['caesar:parthia']=40;assert.ok(proposeAgreement(s,'caesar','parthia','non_aggression').ok);
 assert.equal(replyToLetter(s,m.id,'join_war',{answerStrategicOffer}).ok,false);assert.equal(isWar(s,'caesar','parthia'),false);assert.equal(offer.status,'awaiting_decision');
});
test('outbound requests may be lost and never appear before arrival',()=>{
 const outcomes=new Set();for(let seed=1;seed<=80;seed++){
  const s=newGame('caesar');s.seed=seed;s.wars.push(['egypt','parthia']);s.relations['caesar:egypt']=40;assert.ok(proposeAgreement(s,'egypt','caesar','trade').ok);observeDiplomacy(s);
  assert.ok(sendStrategicOffer(s,'egypt','caesar','parthia').ok);advance(s,1);assert.equal(receivedMail(s).some(x=>x.context?.kind==='strategic_offer'),false);
  advance(s,1);const offer=s.world.strategicOffers[0];outcomes.add(offer.status);assert.equal(receivedMail(s).some(x=>x.context?.kind==='strategic_offer'),offer.status==='awaiting_decision');
 }
 assert.ok(outcomes.has('no_reply'));assert.ok(outcomes.has('awaiting_decision'));
});
test('an AI court can independently initiate an offer to the human player',()=>{
 let found=false;for(let seed=1;seed<=50&&!found;seed++){
  const s=newGame('caesar');s.seed=seed*100003;s.difficulty='expert';s.month=6;s.wars.push(['egypt','parthia']);s.relations['caesar:egypt']=80;s.factions.egypt.treasury=100;
  for(const id of ['senate','armenia','parthia','numidia','mauretania','galatia','bosporus'])s.relations[[id,'egypt'].sort().join(':')]=0;
  assert.ok(proposeAgreement(s,'egypt','caesar','trade').ok);observeDiplomacy(s);tick(s);
  found=(s.world.strategicOffers||[]).some(o=>o.actor==='egypt'&&o.recipient==='caesar'&&o.target==='parthia');
 }
 assert.ok(found,'the autonomous decision cycle should sometimes write to the player');
});
