import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=faces-name-disagreement-1';
import {sendLetter} from '../epistulae.js?v=faces-name-disagreement-1';
import {mailboxHtml} from '../mail-ui.js?v=faces-name-disagreement-1';
function letter(s,sender,recipient,thread,body){return sendLetter(s,{senderInstitution:sender,senderFaction:sender,recipient,category:'diplomatic',subject:['Notice','来信'],body:[body,body],threadId:thread,options:['accept','reject'],context:{kind:'treaty',treatyType:'non_aggression'}}).letter}
test('undelivered letters do not expose their sender or contents through the thread or filter',()=>{
 const s=newGame('caesar'),first=letter(s,'senate','caesar',null,'visible');first.delivery='received';
 const future=letter(s,'egypt','caesar',first.threadId,'SECRET_IN_TRANSIT');future.senderName=['HIDDEN_SENDER','隐藏发件人'];
 let html=mailboxHtml(s,{lang:'zh',selected:first.id});assert.doesNotMatch(html,/SECRET_IN_TRANSIT|隐藏发件人/);
 future.delivery='received';html=mailboxHtml(s,{lang:'zh',selected:first.id});assert.match(html,/SECRET_IN_TRANSIT/);assert.match(html,/隐藏发件人/);
});
test('the sender cannot see foreign decisions or delivery status before a reply arrives',()=>{
 const s=newGame('caesar'),outgoing=letter(s,'caesar','egypt',null,'ordinary message');outgoing.delivery='received';outgoing.responses.push({choice:'accept',ai:true,resolved:false,arrival:s.year*12+s.month+3});
 let html=mailboxHtml(s,{lang:'zh',filter:'sent',selected:outgoing.id});assert.doesNotMatch(html,/接受协定|received|traveling/);assert.match(html,/已寄出/);
 outgoing.responses[0].resolved=true;outgoing.responses[0].arrival=s.year*12+s.month;html=mailboxHtml(s,{lang:'zh',filter:'sent',selected:outgoing.id});assert.match(html,/接受协定/);
 outgoing.responses[0].outcome='lost';html=mailboxHtml(s,{lang:'zh',filter:'sent',selected:outgoing.id});assert.doesNotMatch(html,/接受协定/);
});
test('a recipient sees their own answer but not its undisclosed outcome',()=>{
 const s=newGame('caesar'),incoming=letter(s,'egypt','caesar',null,'visible');incoming.delivery='received';incoming.responses.push({choice:'accept',resolved:true,outcome:'SECRET_OUTCOME'});
 const html=mailboxHtml(s,{lang:'en',selected:incoming.id});assert.match(html,/Accept accord/);assert.doesNotMatch(html,/SECRET_OUTCOME/);
});

test('a faction and a person with the same ID remain distinct mailbox senders',()=>{
 const s=newGame('senate'),institution=sendLetter(s,{senderInstitution:'caesar',senderFaction:'caesar',recipient:'senate',category:'diplomatic',subject:['Institution','机构来信'],body:['institutional message','机构消息']}).letter,person=sendLetter(s,{senderId:'caesar',senderFaction:'caesar',recipient:'senate',category:'diplomatic',subject:['Person','个人来信'],body:['personal message','个人消息']}).letter;institution.delivery=person.delivery='received';assert.deepEqual(institution.senderName,['Caesarian command','凯撒派军队']);assert.equal(institution.senderId,null);assert.deepEqual(person.senderName,['Gaius Julius Caesar','盖乌斯·尤利乌斯·凯撒']);assert.equal(person.senderId,'caesar');const all=mailboxHtml(s,{lang:'zh'});assert.match(all,/value="faction:caesar"/);assert.match(all,/value="person:caesar"/);const f=mailboxHtml(s,{lang:'zh',sender:'faction:caesar'}),p=mailboxHtml(s,{lang:'zh',sender:'person:caesar'});assert.match(f,/机构来信/);assert.doesNotMatch(f,/个人来信/);assert.match(p,/个人来信/);assert.doesNotMatch(p,/机构来信/);
});
test('institutional agreement and coalition letters name factions rather than a hidden person',()=>{
 const s=newGame('senate');s.world.leadership.caesar=['antony'];s.world.characters.caesar.alive=false;s.world.agreementLetters=[{id:1,actor:'caesar',target:'senate',type:'trade',status:'pending',phase:'awaiting_player',remaining:6,sent:{year:s.year,month:s.month}}];s.world.coalitionInvitations=[{id:1,leader:'caesar',target:'egypt',members:['caesar','senate','parthia'],humanRecipient:'senate',status:'pending',phase:'awaiting_player',remaining:6,sent:{year:s.year,month:s.month}}];syncAgreementLetters(s);syncCoalitionLetters(s);for(const m of receivedMail(s).filter(x=>['agreement_offer','coalition_offer'].includes(x.context?.kind))){assert.equal(m.senderId,null);assert.deepEqual(m.senderName,['Caesarian command','凯撒派军队']);assert.match(m.body[1],/凯撒派军队/);assert.doesNotMatch(m.body[1],/盖乌斯|安东尼/)}assert.equal(receivedMail(s).filter(x=>['agreement_offer','coalition_offer'].includes(x.context?.kind)).length,2);
});
