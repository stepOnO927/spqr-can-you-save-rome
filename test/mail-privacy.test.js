import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=cursus-portraits-1';
import {sendLetter} from '../epistulae.js?v=cursus-portraits-1';
import {mailboxHtml} from '../mail-ui.js?v=cursus-portraits-1';
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
