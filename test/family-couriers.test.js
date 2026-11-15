import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=meeting-name-1';
import {createFictionalPerson,offerForeignMarriage,offerFamilyAccord,requestClaimantAsylum,advanceDynasties} from '../dynasties.js?v=meeting-name-1';
import {syncAsylumReplies,syncFamilyReplies,receivedMail} from '../epistulae.js?v=meeting-name-1';
import {mailboxHtml} from '../mail-ui.js?v=meeting-name-1';

function scenario(kind,seed){
 const s=newGame('caesar');let request,person;
 if(kind==='marriage'){
  person=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,sex:'male'});
  s.world.characters[person].loyalty=100;s.world.characters.cleopatra.loyalty=100;
  request=offerForeignMarriage(s,person,'cleopatra','egypt').offer;
 }else if(kind==='asylum'){
  person=createFictionalPerson(s,{name:['Claimant','竞争者'],faction:'egypt',birthYear:-75,location:'egypt'});
  s.world.claimants.egypt=[person];s.knowledge.caesar.egypt.reports.push({kind:'claimants',leaders:[person],year:s.year,month:s.month});
  request=requestClaimantAsylum(s,person,'egypt').request;
 }else{
  person=createFictionalPerson(s,{name:['Ward','受监护者'],faction:'caesar',birthYear:-57,location:'cisalpine'});
  request=offerFamilyAccord(s,kind,'cleopatra','egypt',kind==='wardship'?person:null).accord;
 }
 assert.ok(request);request.courierSeed=seed;return {s,request,person};
}
function advance(s,months){for(let i=0;i<months;i++){s.month++;s.world.dynasties.seed=0;advanceDynasties(s)}}

for(const [kind,seeds,months] of [['marriage',[15,4],3],['asylum',[5,9],3],['pledge',[0,7],4],['wardship',[0,7],4]]){
 test(`${kind}: lost outbound or return letter produces no agreement and no premature disclosure`,()=>{
  for(const seed of seeds){let {s,request,person}=scenario(kind,seed);const relation=s.relations['caesar:egypt']||0;
   advance(s,months-1);assert.equal(request.status,'pending');assert.equal(s.world.characters[person].spouse,null);assert.equal(s.world.characters[person].asylumHost,undefined);
   s=upgradeSave(structuredClone(s));advance(s,1);request=kind==='marriage'?s.world.dynasties.marriageOffers[0]:kind==='asylum'?s.world.dynasties.asylumRequests[0]:s.world.dynasties.familyAccords[0];
   assert.equal(request.status,'no_reply');assert.equal(s.world.characters[person].spouse,null);assert.equal(s.world.characters[person].asylumHost,undefined);assert.equal(s.world.characters[person].diplomaticGuardian,undefined);assert.equal(s.relations['caesar:egypt']||0,relation);assert.match(s.log[0].en,/lost/);
  }
 });
}
test('an old pending family agreement without a courier seed resolves consistently across saves',()=>{
 let {s,request}=scenario('pledge',1);delete request.courierSeed;const first=upgradeSave(structuredClone(s)),second=upgradeSave(structuredClone(s));advance(first,4);advance(second,4);assert.equal(first.world.dynasties.familyAccords[0].status,second.world.dynasties.familyAccords[0].status);
});

test('asylum replies distinguish acceptance, delivered refusal and no reply after the journey',()=>{
 const outcomes=new Map();
 for(let seed=1;seed<=100&&outcomes.size<3;seed++){
  let {s,request,person}=scenario('asylum',(seed*1000003)>>>0);const before=s.relations['caesar:egypt']||0;
  for(let i=0;i<2;i++){s.month++;s.world.dynasties.seed=(seed*7000013)>>>0;advanceDynasties(s);assert.equal(request.status,'pending');assert.equal(s.world.characters[person].asylumHost,undefined)}
  s=upgradeSave(structuredClone(s));s.month++;s.world.dynasties.seed=(seed*7000013)>>>0;advanceDynasties(s);request=s.world.dynasties.asylumRequests[0];syncAsylumReplies(s);syncAsylumReplies(s);
  const replies=receivedMail(s).filter(m=>m.context?.kind==='asylum_result');assert.equal(replies.length,request.status==='no_reply'?0:1);if(replies.length){assert.equal(replies[0].sentDateKnown,false);assert.match(mailboxHtml(s,{lang:'zh',selected:replies[0].id}),/寄出 日期未记录/)}
  if(!outcomes.has(request.status))outcomes.set(request.status,{s,person,before});
 }
 for(const status of ['accepted','declined','no_reply'])assert.ok(outcomes.has(status),`missing ${status}`);
 for(const status of ['declined','no_reply']){const {s,person,before}=outcomes.get(status);assert.equal(s.world.characters[person].asylumHost,undefined);assert.equal(s.relations['caesar:egypt']||0,before);assert.match(s.log[0].en,status==='declined'?/declined/:/No asylum reply/)}
 const accepted=outcomes.get('accepted');assert.equal(accepted.s.world.characters[accepted.person].asylumHost,'caesar');assert.equal(accepted.s.relations['caesar:egypt'],accepted.before-6);
});

for(const kind of ['marriage','pledge','wardship'])test(`${kind} delivers one inbox reply only when an answer arrives`,()=>{
 const outcomes=new Set(),duration=kind==='marriage'?3:4;
 for(let seed=1;seed<=150&&outcomes.size<3;seed++){
  let {s,request}=scenario(kind,(seed*1000003)>>>0);
  for(let i=0;i<duration-1;i++){s.month++;s.world.dynasties.seed=(seed*7000013)>>>0;advanceDynasties(s);syncFamilyReplies(s);assert.equal(request.status,'pending');assert.equal(receivedMail(s).filter(m=>m.context?.kind?.startsWith('family_')).length,0)}
  s=upgradeSave(structuredClone(s));s.month++;s.world.dynasties.seed=(seed*7000013)>>>0;advanceDynasties(s);request=kind==='marriage'?s.world.dynasties.marriageOffers[0]:s.world.dynasties.familyAccords[0];syncFamilyReplies(s);syncFamilyReplies(s);outcomes.add(request.status);
  const replies=receivedMail(s).filter(m=>m.context?.kind===(kind==='marriage'?'family_marriage_result':'family_accord_result'));assert.equal(replies.length,request.status==='no_reply'?0:1);if(replies.length){assert.equal(replies[0].sentDateKnown,false);assert.match(JSON.stringify(replies[0].body),/Cleopatra/);const saved=upgradeSave(structuredClone(s));syncFamilyReplies(saved);assert.equal(receivedMail(saved).filter(m=>m.context?.kind===replies[0].context.kind).length,1)}
 }
 assert.deepEqual(outcomes,new Set([kind==='marriage'?'accepted':'active','declined','no_reply']));
});

test('a marriage envoy cannot bind a person who has left the sending faction',()=>{
 const {s,request,person}=scenario('marriage',1);s.world.characters[person].faction='senate';for(let i=0;i<3;i++){s.month++;advanceDynasties(s);syncFamilyReplies(s)}assert.equal(request.status,'no_reply');assert.equal(s.world.characters[person].spouse,null);assert.equal(receivedMail(s).some(m=>m.context?.kind==='family_marriage_result'),false);
});

 test('family correspondence and life events retain reported names despite hidden changes and later reports',async()=>{
 const {addReport}=await import('../character-system.js?v=meeting-name-1');
 let accepted=false,declined=false;
 for(let seed=1;seed<100&&(!accepted||!declined);seed++){
  let s=newGame('caesar');const own=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,sex:'male'}),foreign=createFictionalPerson(s,{name:['Reported name','报告姓名'],faction:'egypt',birthYear:-78,sex:'female'});
  s.world.characters[own].loyalty=100;s.world.characters[foreign].loyalty=100;addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'spy'});s.world.dynasties.catalog[foreign].name=['Secret name','秘密姓名'];
  const result=offerForeignMarriage(s,own,foreign,'egypt');assert.equal(result.ok,true);assert.deepEqual(result.offer.reportedName,['Reported name','报告姓名']);assert.match(JSON.stringify(s.world.dynasties.lives[own]),/报告姓名/);assert.doesNotMatch(JSON.stringify(s.world.dynasties.lives[own]),/秘密姓名/);
  s=upgradeSave(structuredClone(s));const offer=s.world.dynasties.marriageOffers[0];offer.courierSeed=(seed*1000003)>>>0;s.month++;addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'envoy',peopleNames:{[foreign]:['Later name','后续姓名']},observationYear:s.year,observationMonth:s.month});
  for(let i=0;i<3;i++){s.month++;s.world.dynasties.seed=(seed*1000003)>>>0;advanceDynasties(s)}
  const text=JSON.stringify([s.world.dynasties.lives[own],s.log]);assert.doesNotMatch(text,/秘密姓名|后续姓名/);if(offer.status==='accepted'){accepted=true;assert.match(text,/报告姓名/);const {finalizeCampaign}=await import('../legacy.js?v=meeting-name-1');s.victory=true;const archive=finalizeCampaign(s).archive;assert.deepEqual(archive.marriages[0].names[1],['Reported name','报告姓名']);assert.deepEqual(archive.marriageOffers[0].foreignName,['Reported name','报告姓名'])}if(offer.status==='declined'){declined=true;assert.match(text,/报告姓名/)}
 }
 assert.ok(accepted,'some letters must be accepted');assert.ok(declined,'some letters must be declined');
});

test('old family letters never reconstruct a missing fictional correspondent name',async()=>{
 const {storedCorrespondentName}=await import('../person-knowledge.js?v=meeting-name-1');const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Hidden','隐藏姓名'],faction:'egypt',birthYear:-75});
 assert.deepEqual(storedCorrespondentName(id,undefined),['Unrecorded name','姓名未记录']);assert.deepEqual(storedCorrespondentName('cleopatra',undefined),['Cleopatra VII','克娄巴特拉七世']);
});

test('wardship, family guarantees and asylum keep the named correspondent from dispatch',async()=>{
 const {addReport}=await import('../character-system.js?v=meeting-name-1');let accepted=false;
 for(let seed=1;seed<100&&!accepted;seed++){
  let s=newGame('caesar');const ward=createFictionalPerson(s,{name:['Ward','受监护者'],faction:'caesar',birthYear:-57}),foreign=createFictionalPerson(s,{name:['Reported','已报告姓名'],faction:'egypt',birthYear:-75});s.world.claimants.egypt=[foreign];addReport(s,'caesar','egypt',{kind:'claimants',leaders:[foreign],source:'spy'});s.world.dynasties.catalog[foreign].name=['Secret','秘密姓名'];
  const asylum=requestClaimantAsylum(s,foreign,'egypt'),pledge=offerFamilyAccord(s,'pledge',foreign,'egypt'),wardship=offerFamilyAccord(s,'wardship',foreign,'egypt',ward);for(const item of [asylum.request,pledge.accord,wardship.accord])assert.deepEqual(item.reportedName,['Reported','已报告姓名']);
  s=upgradeSave(structuredClone(s));const active=s.world.dynasties.familyAccords.find(x=>x.kind==='wardship');active.courierSeed=(seed*1000003)>>>0;for(let i=0;i<4;i++){s.month++;s.world.dynasties.seed=(seed*1000003)>>>0;advanceDynasties(s)}if(active.status==='active'){accepted=true;assert.match(JSON.stringify(s.world.dynasties.lives[ward]),/已报告姓名/);assert.doesNotMatch(JSON.stringify(s.world.dynasties.lives[ward]),/秘密姓名/)}
 }
 assert.ok(accepted,'wardship must sometimes be accepted');
});

test('final archive preserves each letter name and leaves old unnamed correspondents anonymous',async()=>{
 const {addReport}=await import('../character-system.js?v=meeting-name-1'),{finalizeCampaign}=await import('../legacy.js?v=meeting-name-1');const s=newGame('caesar'),own=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,sex:'male'}),foreign=createFictionalPerson(s,{name:['Reported','报告姓名'],faction:'egypt',birthYear:-78,sex:'female'});s.world.claimants.egypt=[foreign];addReport(s,'caesar','egypt',{kind:'claimants',leaders:[foreign],source:'spy'});s.world.dynasties.catalog[foreign].name=['Secret','秘密姓名'];assert.ok(offerForeignMarriage(s,own,foreign,'egypt').ok);assert.ok(offerFamilyAccord(s,'pledge',foreign,'egypt').ok);assert.ok(requestClaimantAsylum(s,foreign,'egypt').ok);s.world.dynasties.marriageOffers.push({...s.world.dynasties.marriageOffers[0],id:'old',reportedName:undefined});s.victory=true;
 const archive=finalizeCampaign(s).archive;assert.deepEqual(archive.marriageOffers[0].foreignName,['Reported','报告姓名']);assert.deepEqual(archive.marriageOffers[1].foreignName,['Unrecorded name','姓名未记录']);assert.deepEqual(archive.familyAccords[0].contactName,['Reported','报告姓名']);assert.deepEqual(archive.asylumRequests[0].claimantName,['Reported','报告姓名']);
});
