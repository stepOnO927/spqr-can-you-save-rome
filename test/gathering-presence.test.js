import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=gathering-delegate-1';
import {sendLetter,replyToLetter,advanceMail,receivedMail,gatheringPlan} from '../epistulae.js?v=gathering-delegate-1';
import {mailboxHtml} from '../mail-ui.js?v=gathering-delegate-1';
import {createFictionalPerson} from '../dynasties.js?v=succession-ui-recovery-1';
import {banquetInvitation} from '../living-letters.js?v=living-letters-1';

function invitation(){
 const s=newGame('caesar'),host=s.world.characters['fictional:1'],guest=s.world.characters.caesar;
 host.location=guest.location='cisalpine';s.wars=[];
 const invitation=banquetInvitation(s,host.id,guest.id);
 const result=sendLetter(s,{senderId:host.id,senderFaction:'caesar',recipient:'caesar',category:'invitations',subject:['Gathering','聚会'],body:invitation.body,options:['accept','representative'],context:{kind:'banquet',leader:guest.id,region:invitation.region,venueId:invitation.venue.id,eventDate:invitation.date,day:invitation.day,time:invitation.time,guestIds:invitation.guestIds,invitation}});
 result.letter.delivery='received';return {s,host,guest,letter:result.letter};
}
function advanceTo(s,date){s.year=Math.floor((date-1)/12);s.month=date-s.year*12;advanceMail(s)}

test('a real gathering happens only when both participants are able and present',()=>{
 const fixture=invitation(),{s,host,guest,letter}=fixture;assert.match(mailboxHtml(s,{lang:'zh',selected:letter.id}),/接受邀请时会检查路程/);assert.equal(replyToLetter(s,letter.id,'accept',{}).ok,true);
 const event=s.mail.events.at(-1);advanceTo(s,event.date);assert.equal(event.status,'awaiting_choice');
 const scene=receivedMail(s).find(m=>m.context?.kind==='banquet_scene');assert.ok(scene);
 assert.equal(replyToLetter(s,scene.id,'speak_host',{}).ok,true);
 const bond=s.world.personalRelations[[host.id,guest.id].sort().join(':')];assert.equal(bond.meetings,1);assert.equal(bond.trust,2);
});

test('illness, absence, movement or defection prevents a fictional meeting and produces a result letter',()=>{
 const scenarios=[
  ({host})=>host.health='seriously_ill',({guest})=>guest.health='dying',
  ({host})=>host.missing={origin:'cisalpine',remaining:2},({guest})=>guest.travel={destination:'gaul',legs:[],remaining:1},
  ({s,guest})=>{s.armies.find(a=>a.characterId===guest.id).move={to:'italiaN',remaining:1}},
  ({host})=>host.faction='senate',({guest})=>guest.location='gaul'
 ];
 for(const change of scenarios){
  let f=invitation();assert.equal(replyToLetter(f.s,f.letter.id,'accept',{}).ok,true);change(f);
  const eventId=f.s.mail.events.at(-1).id;f.s=upgradeSave(JSON.parse(JSON.stringify(f.s)));const event=f.s.mail.events.find(e=>e.id===eventId);advanceTo(f.s,event.date);
  assert.equal(event.status,'missed');assert.equal(f.s.world.personalRelations[[f.host.id,f.guest.id].sort().join(':')],undefined);
  const notice=f.s.mail.messages.find(m=>m.context?.kind==='invitation_result');assert.ok(notice,'a missed event produces a report even if the host left');
  if(f.s.world.characters[f.host.id].faction!=='caesar')assert.equal(notice.senderInstitution,'caesar');
  advanceTo(f.s,notice.arrival);assert.ok(receivedMail(f.s).some(m=>m.id===notice.id));
 }
});

test('a representative must be available, present, and distinct from the host',()=>{
 const {s,host,guest,letter}=invitation();for(const p of Object.values(s.world.characters))if(p.faction==='caesar'&&p.id!==guest.id&&p.id!==host.id)p.location=null;
 assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:host.id}).reason,'representative','the host cannot be their own guest');
 const delegate=s.world.characters.lepidus;delegate.location=guest.location;delegate.health='seriously_ill';assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:delegate.id}).reason,'representative');
 delegate.health='healthy';assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:delegate.id}).ok,true);assert.equal(s.mail.events.at(-1).participantId,delegate.id);
});

test('the chosen delegate is explicit, revalidated, and persists with the scheduled venue',()=>{
 let {s,host,guest,letter}=invitation();const antony=s.world.characters.antony,lepidus=s.world.characters.lepidus;antony.location=lepidus.location=guest.location;
 let plan=gatheringPlan(s,letter);assert.ok(plan.candidates.includes(antony.id));assert.ok(plan.candidates.includes(lepidus.id));assert.equal(plan.venue,host.location);
 assert.equal(replyToLetter(s,letter.id,'representative',{}).reason,'representative');
 lepidus.travel={destination:'gaul',legs:[],remaining:2};assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:lepidus.id}).reason,'representative');assert.equal(s.mail.events.length,0);
 delete lepidus.travel;assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:lepidus.id}).ok,true);
 const id=letter.id;s=upgradeSave(JSON.parse(JSON.stringify(s)));letter=receivedMail(s).find(m=>m.id===id);let event=s.mail.events.find(e=>e.letterId===id);
 assert.equal(event.participantId,lepidus.id);assert.equal(letter.responses[0].representativeId,lepidus.id);assert.equal(letter.responses[0].representativeName[1],'马尔库斯·埃米利乌斯·雷必达');
 const html=mailboxHtml(s,{lang:'zh',selected:id});assert.match(html,/约定安排/);assert.match(html,/代表: 马尔库斯·埃米利乌斯·雷必达/);
 advanceTo(s,event.date);assert.equal(event.status,'awaiting_choice');const scene=s.mail.messages.find(m=>m.context?.kind==='banquet_scene');assert.match(scene.body[1],/雷必达/);
 delete event.representativeName;delete letter.responses[0].representativeName;const legacy=mailboxHtml(s,{lang:'zh',selected:id});assert.match(legacy,/旧记录未保存姓名/);assert.doesNotMatch(legacy,/representativeId/);
});

test('representative choices never disclose unknown locations or unavailable people',()=>{
 const {s,host,guest,letter}=invitation();guest.missing={origin:guest.location,remaining:2};assert.equal(gatheringPlan(s,letter),null);
 assert.doesNotMatch(mailboxHtml(s,{lang:'zh',selected:letter.id}),/预计安排/);assert.equal(replyToLetter(s,letter.id,'accept',{}).reason,'location');delete guest.missing;host.travel={destination:'gaul',legs:[],remaining:2};assert.equal(gatheringPlan(s,letter),null);
});

test('a delegate with another appointment is not silently substituted or double-booked',()=>{
 const {s,letter,guest}=invitation(),candidate=s.world.characters.lepidus;candidate.location=guest.location;
 const date=gatheringPlan(s,letter).date;s.mail.events.push({id:'other',participantId:candidate.id,date,status:'scheduled'});
 assert.ok(!gatheringPlan(s,letter).candidates.includes(candidate.id));assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:candidate.id}).reason,'representative');
 assert.equal(letter.responses.length,0);assert.equal(s.mail.events.length,1);
});

test('an old save with a missing fictional identity does not invent a delegate name',()=>{
 let {s,letter}=invitation();const id='fictional:2';s.world.characters[id].location='cisalpine';delete s.world.dynasties.catalog[id];
 s=upgradeSave(JSON.parse(JSON.stringify(s)));letter=receivedMail(s).find(m=>m.context?.kind==='banquet');assert.ok(!gatheringPlan(s,letter).candidates.includes(id));
 assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:id}).reason,'representative');
});

test('children and fictional people with unknown ages are not sent as political representatives',()=>{
 const {s,letter}=invitation(),child=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:s.year-8,location:'cisalpine'}),unknown=createFictionalPerson(s,{name:['Age unknown','年龄未知'],faction:'caesar',birthYear:s.year-30,location:'cisalpine'});
 s.world.characters[unknown].birthYear=null;s.world.dynasties.catalog[unknown].birth=null;s.world.characters.lepidus.location='cisalpine';
 const candidates=gatheringPlan(s,letter).candidates;assert.ok(!candidates.includes(child));assert.ok(!candidates.includes(unknown));assert.ok(candidates.includes('lepidus'),'a historical officer with no recorded birth year is not assigned a fictional age');
 assert.equal(replyToLetter(s,letter.id,'representative',{},{representativeId:child}).reason,'representative');
});

