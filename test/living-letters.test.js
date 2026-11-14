import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=strategic-player-offer-1';
import {advanceMail,replyToLetter,receivedMail,unreadCount,sendLetter} from '../epistulae.js?v=living-letters-2';
import {mailboxHtml} from '../mail-ui.js?v=living-letters-2';
import {CHARACTER_CATALOG} from '../characters.js?v=succession-ui-recovery-1';
import {mapPoint} from '../map.js?v=succession-ui-recovery-1';

const at=(s,index)=>{const year=Math.floor((index-1)/12);s.year=year;s.month=index-year*12};

test('invitation has a real venue, map action, calendar, scene, choice, follow-up and saved aftermath',()=>{
 const s=newGame('caesar');s.month=8;advanceMail(s);
 const invite=s.mail.messages.find(m=>m.context?.kind==='banquet');
 assert.ok(invite);
 const event=s.mail.events.find(e=>e.letterId===invite.id);
 const venue=s.mail.venues[event.venueId];
 assert.equal(event.status,'invited');
 assert.equal(event.date,invite.context.eventDate);
 assert.equal(venue.territoryId,event.venue);
 assert.ok(s.regions.some(r=>r.id===venue.territoryId));
 assert.ok(mapPoint(venue.mapAnchor).every(Number.isFinite));
 assert.ok(invite.body[0].includes(venue.name[0]));
 assert.ok(invite.body[1].includes(venue.name[1]));
 assert.ok(invite.body[0].includes(CHARACTER_CATALOG[event.hostId].name[0]));
 assert.ok(invite.body[0].includes(CHARACTER_CATALOG[event.guestId].name[0]));
 assert.ok(invite.context.guestIds.length>=2);
 assert.ok(invite.context.guestIds.every(id=>s.world.characters[id]?.alive&&CHARACTER_CATALOG[id]));
 assert.match(invite.body[0],/bread|meat|wine/);
 at(s,invite.arrival);advanceMail(s);
 assert.ok(unreadCount(s)>0);
 assert.match(mailboxHtml(s,{lang:'en',selected:invite.id}),/VIEW LOCATION/);
 assert.match(mailboxHtml(s,{lang:'zh',selected:invite.id}),/查看地点/);
 assert.match(mailboxHtml(s,{lang:'en',filter:'calendar'}),/Gathering calendar/);
 assert.equal(replyToLetter(s,invite.id,'ask_guests',{}).ok,true);
 assert.equal(event.status,'invited');
 assert.equal(replyToLetter(s,invite.id,'accept',{}).ok,true);
 assert.equal(event.status,'scheduled');
 assert.ok(invite.responses.at(-1).body[0].includes(venue.name[0]));
 at(s,event.date);advanceMail(s);
 assert.equal(event.status,'awaiting_choice');
 const scene=receivedMail(s).find(m=>m.context?.kind==='banquet_scene'&&m.context.eventId===event.id);
 assert.ok(scene);
 assert.ok(scene.options.includes('speak_host'));
 assert.ok(scene.context.region===venue.territoryId);
 const pair=[event.hostId,event.participantId].sort().join(':');
 const before=s.world.personalRelations[pair]?.trust||0;
 assert.equal(replyToLetter(s,scene.id,'speak_host',{}).ok,true);
 assert.equal(event.status,'completed');
 assert.equal(s.world.personalRelations[pair].trust,before+2);
 const follow=s.mail.messages.find(m=>m.context?.kind==='banquet_followup'&&m.context.eventId===event.id);
 assert.ok(follow?.body[0].includes(venue.name[0]));
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(loaded.mail.venues[event.venueId],venue);
 assert.equal(loaded.mail.events.find(e=>e.id===event.id).status,'completed');
 assert.equal(loaded.world.personalRelations[pair].trust,before+2);
});

test('declining removes marker eligibility and an absent guest cannot attend',()=>{
 const s=newGame('caesar');s.month=8;advanceMail(s);
 const invite=s.mail.messages.find(m=>m.context?.kind==='banquet'),event=s.mail.events.find(e=>e.letterId===invite.id);
 at(s,invite.arrival);advanceMail(s);
 assert.equal(replyToLetter(s,invite.id,'decline',{}).ok,true);
 assert.equal(event.status,'declined');
 const second=newGame('caesar');second.month=8;advanceMail(second);
 const letter=second.mail.messages.find(m=>m.context?.kind==='banquet'),scheduled=second.mail.events.find(e=>e.letterId===letter.id);
 at(second,letter.arrival);advanceMail(second);
 assert.equal(replyToLetter(second,letter.id,'accept',{}).ok,true);
 second.world.characters[scheduled.participantId].travel={to:'roma',remaining:2};
 at(second,scheduled.date);advanceMail(second);
 assert.equal(scheduled.status,'missed');
 assert.ok(!second.mail.messages.some(m=>m.context?.kind==='banquet_scene'&&m.context.eventId===scheduled.id));
});

test('an unanswered event scene closes without a relationship reward',()=>{
 const s=newGame('caesar');s.month=8;advanceMail(s);
 const invite=s.mail.messages.find(m=>m.context?.kind==='banquet'),event=s.mail.events.find(e=>e.letterId===invite.id);
 at(s,invite.arrival);advanceMail(s);assert.equal(replyToLetter(s,invite.id,'accept',{}).ok,true);
 at(s,event.date);advanceMail(s);assert.equal(event.status,'awaiting_choice');
 const key=[event.hostId,event.participantId].sort().join(':'),before=s.world.personalRelations[key]?.trust||0;
 at(s,event.date+3);advanceMail(s);
 assert.equal(event.status,'completed');
 assert.equal(event.choice,'no_reply');
 assert.equal(s.world.personalRelations[key]?.trust||0,before);
});

test('genre writing uses verified war and treasury state across 100 letters',()=>{
 const s=newGame('caesar'),cultures=['caesar','senate','egypt','parthia','armenia','numidia'];
 const kinds=['personal_flavor','treasury','greeting','treaty','complaint','aid_request','banquet_followup'];
 const texts=new Set();
 for(let i=0;i<100;i++){
  const kind=kinds[i%kinds.length],faction=cultures[i%cultures.length],author=s.world.leadership[faction][0];
  const result=sendLetter(s,{senderId:author,senderFaction:faction,recipient:'caesar',category:faction==='caesar'?'personal':'diplomatic',
   subject:['A dispatch','来函'],body:['A measured matter.','一件有据之事。'],context:{kind,treatyType:'trade',officeName:['finance assignment','财务职务']},options:['acknowledge']});
  assert.equal(result.ok,true);
  assert.ok(result.letter.body[0].includes(CHARACTER_CATALOG[author].name[0])||result.letter.body[0].includes('A measured matter'));
  assert.ok(result.letter.body[1]);
  texts.add(result.letter.body[0]);
 }
 assert.ok(texts.size>=15);
 const ledger=s.mail.messages.find(m=>m.context?.kind==='treasury');
 assert.ok(ledger.body[0].includes(String(s.factions.caesar.treasury)));
});

test('a real candidate may request a simulated appointment and receive it',()=>{
 const s=newGame('caesar');s.world.characters['fictional:1'].ambition=80;s.month=7;advanceMail(s);
 const request=s.mail.messages.find(m=>m.context?.kind==='appointment_request');
 assert.ok(request?.body[0].includes('finance assignment'));
 at(s,request.arrival);advanceMail(s);
 assert.equal(replyToLetter(s,request.id,'ask_qualifications',{}).ok,true);
 const before=s.factions.caesar.treasury;
 assert.equal(replyToLetter(s,request.id,'appoint',{}).ok,true);
 assert.equal(s.world.offices.caesar.finance,request.senderId);
 assert.equal(s.factions.caesar.treasury,before-5);
 assert.ok(request.responses.at(-1).body[0].includes('appointment'));
});
