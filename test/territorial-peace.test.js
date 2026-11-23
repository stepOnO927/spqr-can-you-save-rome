import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,sendInquiry,inquiryCost,upgradeSave,diplomacy,isWar,answerPeaceOffer,previewMarch,forecastEconomy} from '../engine.js?v=dossier-archive-1';
import {peaceOfferRegions,makePeaceTerms,peaceConcessionCredit,canSettlePeaceTerms,peaceTermsText} from '../peace-terms.js?v=territorial-peace-1';
import {syncPeaceLetters,receivedMail} from '../epistulae.js?v=dossier-archive-1';
import {addReport} from '../character-system.js?v=dossier-archive-1';

function setup(seed=1000003){
 const s=newGame('caesar');s.seed=seed;s.difficulty='beginner';
 for(const a of s.armies.filter(a=>a.owner!=='caesar')){a.men=500;a.move=null;a.siege=null}
 s.factions.senate.treasury=0;s.factions.senate.manpower=0;
 return s;
}
function offer(s){assert.ok(sendInquiry(s,'caesar','senate','peace',{offerRegion:'narbo'}).ok);return s.inquiries[0]}
test('a concession can offer only an owned, reported frontier, never a core or last theater',()=>{
 const s=setup(),before=s.factions.caesar.treasury;
 assert.ok(peaceOfferRegions(s,'caesar','senate').some(r=>r.id==='narbo'));
 for(const id of ['cisalpine','roma','egypt','gaul'])assert.equal(sendInquiry(s,'caesar','senate','peace',{offerRegion:id}).reason,'terms');
 assert.equal(s.factions.caesar.treasury,before);
 const t=setup();for(const r of t.regions)if(r.owner==='caesar'&&r.id!=='narbo')r.owner='senate';assert.equal(makePeaceTerms(t,'caesar','senate','narbo'),null);
});
test('sending and loading terms costs only the existing letter fee and does not transfer control',()=>{
 let s=setup(),before=s.factions.caesar.treasury;const letter=offer(s);
 assert.equal(s.factions.caesar.treasury,before-inquiryCost(s,'caesar'));assert.equal(s.regions.find(r=>r.id==='narbo').owner,'caesar');
 assert.equal(letter.peaceTerms.region,'narbo');assert.ok(isWar(s,'caesar','senate'));s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(s.inquiries[0].peaceTerms,letter.peaceTerms);assert.equal(s.factions.caesar.treasury,before-inquiryCost(s,'caesar'));
 assert.match(peaceTermsText(s.inquiries[0],'zh'),/纳博讷高卢.*有效回信送达前/);
});
test('accepted, refused and lost replies produce different actual territorial outcomes',()=>{
 const outcomes=new Set();
 for(let seed=1;seed<=100;seed++){
  const s=setup(seed*100003),letter=offer(s);tick(s);assert.equal(s.regions.find(r=>r.id==='narbo').owner,'caesar');tick(s);outcomes.add(letter.status);
  if(letter.status==='answered'){assert.equal(letter.peaceSettlement,'concluded');assert.equal(s.regions.find(r=>r.id==='narbo').owner,'senate');assert.equal(isWar(s,'caesar','senate'),false);assert.equal(letter.peaceTransfer.region,'narbo');assert.equal(s.armies.find(a=>a.id==='viii').owner,'caesar');assert.equal(s.armies.find(a=>a.id==='viii').region,'narbo');assert.ok(previewMarch(s,'viii','gaul').ok);const restored=structuredClone(s);restored.regions.find(r=>r.id==='narbo').owner='caesar';assert.ok(forecastEconomy(restored,'caesar').treasury>forecastEconomy(s,'caesar').treasury)}
  else{assert.ok(['refused','no_reply'].includes(letter.status));assert.equal(s.regions.find(r=>r.id==='narbo').owner,'caesar');assert.equal(isWar(s,'caesar','senate'),true);assert.equal(letter.peaceTransfer,undefined)}
  if(outcomes.size===3)break;
 }
 assert.deepEqual([...outcomes].sort(),['answered','no_reply','refused']);
});
test('recipient assessment does not inspect undisclosed foreign ownership or forces',()=>{
 const s=setup(),letter=offer(s),copy=structuredClone(s),other=copy.inquiries[0];
 copy.regions.find(r=>r.id==='narbo').owner='mauretania';for(const a of copy.armies.filter(a=>a.owner==='caesar'))a.men=999999;
 assert.equal(peaceConcessionCredit(copy,other),peaceConcessionCredit(s,letter));assert.equal(canSettlePeaceTerms(copy,other),false);
});
test('changed control, a new war or replacement court invalidates a dated concession',()=>{
 for(const change of [s=>{s.regions.find(r=>r.id==='narbo').owner='mauretania'},s=>{diplomacy(s,'caesar','senate','peace',{acceptedByPlayer:true});diplomacy(s,'caesar','senate','war')},s=>{s.world.dynasticGenerations||={};s.world.dynasticGenerations.senate=1}]){
  const s=setup(),letter=offer(s);change(s);assert.equal(canSettlePeaceTerms(s,letter),false);
 }
});
test('a delivered acceptance cannot take land from a third party after circumstances change',()=>{
 let found=false;
 for(let seed=1;seed<=80&&!found;seed++){
  const s=setup(seed*100003),letter=offer(s);letter.remaining=1;letter.sealed={status:'answered',year:s.year,month:s.month,claim:['The peace offer is accepted.','接受议和提议。']};
  s.regions.find(r=>r.id==='narbo').owner='mauretania';tick(s);
  assert.equal(s.regions.find(r=>r.id==='narbo').owner,'mauretania');assert.ok(isWar(s,'caesar','senate'));
  if(letter.status==='answered'){found=true;assert.equal(letter.peaceSettlement,'not_concluded');assert.equal(letter.peaceTransfer,undefined)}
 }
 assert.ok(found);
});
test('a human recipient sees the territory and decides without immediate transfer',()=>{
 const s=setup();s.factions.senate.treasury=30;assert.ok(sendInquiry(s,'senate','caesar','peace',{offerRegion:'hispaniaN'}).ok);const l=s.inquiries[0];l.status='awaiting_decision';l.remaining=6;syncPeaceLetters(s);
 const mail=receivedMail(s).find(m=>m.id===l.mailId);assert.match(mail.body[1],/近西班牙.*有效回信送达前/);
 assert.ok(answerPeaceOffer(s,'senate','accept').ok);assert.equal(s.regions.find(r=>r.id==='hispaniaN').owner,'senate');assert.ok(isWar(s,'caesar','senate'));
 assert.equal(l.phase,'return');assert.equal(l.sealed.status,'answered');
});
test('a threatened AI can itself offer a frontier while the Roman player is passive or automated',()=>{
 for(const autoplayPlayer of [false,true]){
  const s=setup();s.month=11;s.wars.push(['egypt','parthia']);s.regions.find(r=>r.id==='syria').owner='egypt';s.factions.egypt.stability=25;
  addReport(s,'egypt','parthia',{kind:'strength',value:100000,source:'scout',confidence:'confirmed'});tick(s,{autoplayPlayer});
  assert.ok(s.inquiries.some(l=>l.actor==='egypt'&&l.target==='parthia'&&l.peaceTerms?.region==='syria'));
 }
});

