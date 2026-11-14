import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeMail,sendLetter,advanceMail,receivedMail,unreadCount,markRead,archiveLetter,replyToLetter,treatyLetter,warLetters,syncPeaceLetters,chronicleLetters} from '../epistulae.js?v=portraits-hundred-days-1';
import {newGame,diplomacy,tick,upgradeSave,answerPeaceOffer,queueMission} from '../engine.js?v=multipolar-courier-review-1';
import {setWartimePolicy} from '../epistulae-personnel.js?v=portraits-hundred-days-1';
import {initializeMailReports,advanceMailReports} from '../mail-reports.js?v=portraits-hundred-days-1';
import {mailboxHtml} from '../mail-ui.js?v=portraits-hundred-days-1';

const state = () => {
  const factions = Object.fromEntries(['caesar','senate','egypt','parthia'].map(id => [id,{treasury:100}]));
  const places = {caesar:'cisalpine',senate:'roma',egypt:'egypt',parthia:'parthia'};
  const characters = Object.fromEntries(Object.entries({caesar:'caesar',pompey:'senate',cleopatra:'egypt',orodes:'parthia'}).map(([id,faction]) => [id,{id,faction,alive:true,location:places[faction]}]));
  return {year:-49,month:1,seed:57,player:'caesar',factions,regions:Object.entries(places).map(([owner,id])=>({id,owner})),wars:[['caesar','senate']],relations:{},world:{characters,leadership:{caesar:['caesar'],senate:['pompey'],egypt:['cleopatra'],parthia:['orodes']}}};
};
const advance = (s, months, actions={}) => {for(let i=0;i<months;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceMail(s,actions)}};

test('delayed treaty reaches inbox, reply changes state and persists with thread', () => {
  const s=state(),sent=treatyLetter(s,'egypt','caesar');
  assert.equal(sent.ok,true);
  assert.equal(unreadCount(s),0);
  s.month=11; advanceMail(s);
  assert.equal(unreadCount(s),1);
  assert.equal(markRead(s,sent.letter.id),true);
  assert.equal(unreadCount(s),0);
  const agreements=[];
  const result=replyToLetter(s,sent.letter.id,'accept',{proposeAgreement:(_s,actor,target,type)=>{agreements.push([actor,target,type]);return {ok:true}}});
  assert.equal(result.ok,true);
  assert.equal(agreements.length,0);
  advance(s,10,{proposeAgreement:(_s,actor,target,type)=>{agreements.push([actor,target,type]);return {ok:true}}});
  assert.deepEqual(agreements,[['egypt','caesar','non_aggression']]);
  assert.equal(s.mail.messages.filter(m=>m.threadId===sent.letter.threadId).length,3);
  assert.ok(s.mail.messages.some(m=>m.context?.replyTo===sent.letter.id&&m.senderFaction===s.player));
  assert.equal(receivedMail(JSON.parse(JSON.stringify(s))).find(m=>m.id===sent.letter.id).responses[0].choice,'accept');
  assert.equal(archiveLetter(s,sent.letter.id),true);
});

test('war notification follows real war and is only generated once', () => {
  const s=state(),before=s.wars.map(w=>w.slice());
  s.wars.push(['parthia','caesar']);
  warLetters(s,before); warLetters(s,before);
  assert.equal(s.mail.messages.filter(m=>m.context?.kind==='war').length,1);
  assert.equal(receivedMail(s).length,0);
  advance(s,8);
  assert.equal(receivedMail(s).filter(m=>m.priority==='critical').length,1);
});

test('unknown sender is rejected and AI correspondence resolves without player inbox', () => {
  const s=state();
  assert.equal(sendLetter(s,{senderId:'imaginary',senderFaction:'egypt',recipient:'caesar',subject:['x','x'],body:['x','x']}).ok,false);
  s.world.characters.cleopatra.alive=false;
  assert.equal(sendLetter(s,{senderId:'cleopatra',senderFaction:'egypt',recipient:'caesar',subject:['x','x'],body:['x','x']}).ok,false);
  s.world.characters.cleopatra.alive=true;
  const offered=treatyLetter(s,'egypt','parthia');
  assert.equal(offered.ok,true);
  const agreements=[];
  advance(s,20,{proposeAgreement:(_s,a,b,t)=>{agreements.push([a,b,t]);return {ok:true}}});
  assert.equal(offered.letter.responses[0].ai,true);
  assert.deepEqual(agreements.filter(([a,b])=>a==='egypt'&&b==='parthia'),[['egypt','parthia','non_aggression']]);
  assert.equal(offered.letter.recipient,'parthia');
});

test('campaign war creates delayed critical mail and mailbox renders in both languages', () => {
  const s=newGame('caesar');
  assert.equal(diplomacy(s,'parthia','caesar','war'),true);
  assert.equal(s.mail.messages.filter(m=>m.context?.kind==='war').length,1);
  assert.equal(unreadCount(s),0);
  for(let i=0;i<8;i++) tick(s);
  assert.ok(receivedMail(s).some(m=>m.context?.kind==='war'));
  assert.match(mailboxHtml(s,{lang:'en'}),/Imperial Mailbox/);
  assert.match(mailboxHtml(s,{lang:'zh'}),/帝国来信/);
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.mail.messages.filter(m=>m.context?.kind==='war').length,1);
});

test('existing fictional courtier sends personal letter and invitation with persistent effects', () => {
  const s=newGame('caesar');
  s.month=4;advanceMail(s);
  const personal=s.mail.messages.find(m=>m.context?.kind==='personal_age');
  assert.ok(personal?.senderId?.startsWith('fictional:'));
  s.month=6;advanceMail(s);
  const trustKey=[personal.senderId,'caesar'].sort().join(':');
  assert.equal(replyToLetter(s,personal.id,'truth',{}).ok,true);
  assert.equal(s.world.personalRelations[trustKey].trust,3);
  s.month=8;advanceMail(s);
  const invite=s.mail.messages.find(m=>m.context?.kind==='banquet');
  assert.ok(invite);
  s.month=10;advanceMail(s);
  assert.equal(replyToLetter(s,invite.id,'accept',{}).ok,true);
  assert.equal(s.mail.events.at(-1).status,'scheduled');
  s.month=11;advanceMail(s);
  assert.equal(s.mail.events.at(-1).status,'held');
  assert.equal(s.world.personalRelations[trustKey].trust,5);
});

test('existing peace inquiry appears once in mailbox and uses real reply route', () => {
  const s=newGame('caesar');
  assert.equal(diplomacy(s,'parthia','caesar','war'),true);
  (s.inquiries ||= []).unshift({actor:'parthia',target:'caesar',subject:'peace',status:'awaiting_decision',duration:4,remaining:6});
  syncPeaceLetters(s);syncPeaceLetters(s);
  const letters=receivedMail(s).filter(m=>m.context?.kind==='peace');
  assert.equal(letters.length,1);
  assert.equal(replyToLetter(s,letters[0].id,'accept',{answerPeaceOffer}).ok,true);
  assert.equal(s.inquiries[0].status,'pending');
  assert.equal(s.inquiries[0].phase,'return');
  assert.equal(s.wars.some(w=>w.includes('parthia')&&w.includes('caesar')),true);
});

test('treasury audit spends real funds and reports measured state after two months', () => {
  const s=newGame('caesar');
  s.year=-48;s.month=1;advanceMail(s);
  const report=s.mail.messages.find(m=>m.eventId==='treasury:-48:caesar');
  assert.ok(report);
  s.month=2;advanceMail(s);
  const before=s.factions.caesar.treasury;
  assert.equal(replyToLetter(s,report.id,'audit',{}).ok,true);
  assert.equal(s.factions.caesar.treasury,before-3);
  s.month=4;advanceMail(s);
  const audit=s.mail.messages.find(m=>m.subject?.[0]==='Requested treasury audit');
  assert.ok(audit);
  assert.ok(audit.body[0].includes(String(before-3)));
  assert.equal(audit.threadId,report.threadId);
});

test('war applies separate policies only to foreign personnel actually in the host territory',()=>{
  const s=newGame('caesar');
  assert.equal(queueMission(s,'egypt','caesar','envoy','relations').ok,true);
  assert.equal(queueMission(s,'egypt','caesar','travelers','leaders').ok,true);
  for(let i=0;i<3;i++)tick(s);
  const envoy=s.mail.personnel.find(p=>p.kind==='envoy'),merchant=s.mail.personnel.find(p=>p.kind==='merchant');
  assert.equal(envoy.status,'active_mission');
  assert.equal(merchant.status,'returning');
  assert.equal(setWartimePolicy(s,'caesar','envoys','detain').ok,true);
  assert.equal(setWartimePolicy(s,'caesar','merchants','freeze').ok,true);
  const unrelated=s.world.characters.caesar;
  assert.equal(diplomacy(s,'egypt','caesar','war'),true);
  assert.equal(envoy.status,'temporarily_detained');
  assert.equal(merchant.status,'assets_frozen');
  assert.equal(s.world.characters[envoy.characterId].alive,true);
  assert.equal(unrelated.alive,true);
  const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.mail.personnel.find(p=>p.kind==='envoy').status,'temporarily_detained');
  assert.equal(loaded.mail.personnel.find(p=>p.kind==='merchant').status,'assets_frozen');
});

test('default war policy grants an envoy safe departure without affecting merchants',()=>{
  const s=newGame('caesar');
  assert.equal(queueMission(s,'egypt','caesar','envoy','relations').ok,true);
  for(let i=0;i<3;i++)tick(s);
  const envoy=s.mail.personnel.find(p=>p.kind==='envoy');
  assert.equal(diplomacy(s,'egypt','caesar','war'),true);
  assert.equal(envoy.status,'ordered_depart');
  assert.equal(envoy.safeConduct,true);
  assert.equal(s.world.characters[envoy.characterId].alive,true);
});

test('an explicitly selected extreme envoy policy carries lasting diplomatic costs',()=>{
  const s=newGame('caesar');
  assert.equal(queueMission(s,'egypt','caesar','envoy','relations').ok,true);
  for(let i=0;i<3;i++)tick(s);
  const envoy=s.mail.personnel.find(p=>p.kind==='envoy'),stable=s.factions.caesar.stability;
  assert.equal(setWartimePolicy(s,'caesar','envoys','execute').ok,true);
  assert.equal(diplomacy(s,'egypt','caesar','war'),true);
  assert.equal(envoy.status,'deceased');
  assert.equal(s.world.characters[envoy.characterId].alive,false);
  assert.equal(s.world.characters.caesar.alive,true);
  assert.ok(s.diplomaticCredibility.caesar<=65);
  assert.ok(s.factions.caesar.stability<stable);
  assert.ok(s.mail.accessRestrictions.caesar>s.year*12+s.month);
});

test('war suspends a real trade accord and peace releases detained visitors',()=>{
  const s=newGame('caesar');
  assert.equal(queueMission(s,'egypt','caesar','envoy','relations').ok,true);
  for(let i=0;i<3;i++)tick(s);
  const envoy=s.mail.personnel.find(p=>p.kind==='envoy');
  s.agreements.push({id:'agreement:test-trade',type:'trade',parties:['egypt','caesar'],status:'active'});
  setWartimePolicy(s,'caesar','envoys','detain');
  assert.equal(diplomacy(s,'egypt','caesar','war'),true);
  assert.equal(s.agreements.at(-1).status,'ended_by_war');
  assert.equal(s.mail.tradeSuspensions.at(-1).agreementId,'agreement:test-trade');
  assert.equal(envoy.status,'temporarily_detained');
  assert.equal(diplomacy(s,'egypt','caesar','peace',{acceptedByPlayer:true}),true);
  assert.equal(envoy.status,'returning');
  for(let i=0;i<2;i++)tick(s);
  assert.equal(envoy.status,'at_home');
});

test('chronicle dispatch creates one state-backed bilingual military letter',()=>{
  const s=newGame('caesar'),region=s.regions.find(r=>r.owner==='caesar');
  const entry={id:901,year:s.year,month:s.month,kind:'siege',priority:'major',faction:s.player,
    region:region.id,place:region.name,armyId:'test',armyName:['Field army','野战军'],remaining:2};
  chronicleLetters(s,[entry]);chronicleLetters(s,[entry]);
  const letters=s.mail.messages.filter(m=>m.eventId==='chronicle:901');
  assert.equal(letters.length,1);
  assert.equal(letters[0].category,'military');
  assert.match(letters[0].body[0],/besieging/);
  assert.match(letters[0].body[1],/围攻/);
  assert.ok(letters[0].options.includes('war_council'));
});

test('government and military dispatches follow measured changes without invented events',()=>{
  const s=newGame('caesar'),r=s.regions.find(x=>x.owner===s.player);
  initializeMailReports(s);s.month=2;
  s.factions.caesar.tax='high';s.factions.caesar.food=-3;
  r.loyalty=25;r.fort++;r.buildings.push('granaries');
  advanceMailReports(s);advanceMailReports(s);
  const ids=s.mail.messages.map(m=>m.eventId).filter(Boolean);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(s.mail.messages.some(m=>m.subject[0]==='Tax policy changed'));
  assert.ok(s.mail.messages.some(m=>m.subject[0]==='Food shortage'&&m.body[0].includes('-3')));
  assert.ok(s.mail.messages.some(m=>m.subject[0]==='Provincial unrest'&&m.context.region===r.id));
  assert.ok(s.mail.messages.some(m=>m.subject[0]==='Construction completed'&&m.body[0].includes('Granary')));
  assert.ok(s.mail.messages.some(m=>m.subject[0]==='Frontier fortification improved'&&m.category==='military'));
});

test('alliance and aid requests resolve only after the reply courier returns',()=>{
  const s=state();s.wars=[];
  const alliance=sendLetter(s,{senderId:'cleopatra',senderFaction:'egypt',recipient:'caesar',category:'diplomatic',
    subject:['Alliance','结盟'],body:['Join our court.','请与本朝结盟。'],options:['accept','reject'],context:{kind:'full_alliance'}}).letter;
  advance(s,10);
  assert.equal(replyToLetter(s,alliance.id,'accept',{}).ok,true);
  let joined=0;advance(s,10,{diplomacy:()=>{joined++;return true}});
  assert.equal(joined,1);
  assert.equal(alliance.responses[0].outcome,'accept');
  const aid=sendLetter(s,{senderId:'cleopatra',senderFaction:'egypt',recipient:'caesar',category:'diplomatic',
    subject:['Aid','援助'],body:['Support requested.','请求援助。'],options:['send_aid','decline'],context:{kind:'aid_request'}}).letter;
  advance(s,10);
  const caesarBefore=s.factions.caesar.treasury,egyptBefore=s.factions.egypt.treasury;
  assert.equal(replyToLetter(s,aid.id,'send_aid',{}).ok,true);
  assert.equal(s.factions.caesar.treasury,caesarBefore-5);
  assert.equal(s.factions.egypt.treasury,egyptBefore);
  advance(s,10);assert.equal(s.factions.egypt.treasury,egyptBefore+5);
});

test('five-year campaign keeps message identities, categories and delivery state bounded',()=>{
  const s=newGame('egypt');
  for(let i=0;i<60;i++)tick(s);
  const ids=s.mail.messages.map(m=>m.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.length>20&&ids.length<500);
  assert.ok(s.mail.messages.every(m=>m.senderId?s.world.characters[m.senderId]:m.senderInstitution));
  assert.ok(s.mail.messages.every(m=>['traveling','received','lost'].includes(m.delivery)));
  assert.ok(s.mail.messages.some(m=>m.category==='government'));
  assert.ok(s.mail.messages.some(m=>m.category==='personal'));
  const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.mail.messages.length,s.mail.messages.length);
  assert.deepEqual(loaded.mail.reportSnapshot,s.mail.reportSnapshot);
  assert.match(mailboxHtml(loaded,{lang:'zh'}),/帝国来信/);
});
