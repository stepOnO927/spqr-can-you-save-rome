import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=reported-contact-1';
import {createFictionalPerson} from '../dynasties.js?v=reported-contact-1';
import {addReport} from '../character-system.js?v=reported-contact-1';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=reported-contact-1';
import {advanceMailReports} from '../mail-reports.js?v=reported-contact-1';
import {receivedMail} from '../epistulae.js?v=reported-contact-1';
const replies=s=>receivedMail(s).filter(m=>m.context?.kind==='personal_audience_result');
function fixture(seed,away=false){
 const s=newGame('caesar');s.wars=[];s.world.characters['fictional:1'].location='egypt';
 const id=createFictionalPerson(s,{name:['Old name','旧报告姓名'],faction:'egypt',birthYear:-75,location:'egypt'});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});
 assert.ok(requestPersonalMeeting(s,'fictional:1',id,'egypt').ok);s.world.dynasties.catalog[id].name=['Meeting name','会面时姓名'];s.world.dynasties.catalog['fictional:1'].name=['Own name at meeting','我方会面姓名'];if(away)s.world.characters[id].location='parthia';s.world.intelSeed=seed;
 s.month=2;advancePersonalDiplomacy(s);advanceMailReports(s);assert.equal(replies(s).length,0);s.month=3;advancePersonalDiplomacy(s);return {s,id};
}
test('an actual meeting creates one local record with names observed at the time',()=>{
 let {s,id}=fixture(1000);assert.equal(s.meetings[0].status,'met');s.world.dynasties.catalog[id].name=['Later hidden name','后来秘密姓名'];s.world.dynasties.catalog['fictional:1'].name=['Later own name','后来我方姓名'];advanceMailReports(s);
 const m=replies(s)[0];assert.ok(m);assert.equal(m.senderFaction,'caesar');assert.match(m.body[1],/会面时姓名/);assert.match(m.body[1],/我方会面姓名/);assert.doesNotMatch(m.body[1],/后来秘密姓名|后来我方姓名/);
 advanceMailReports(s);s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceMailReports(s);assert.equal(replies(s).length,1);
});
test('a delivered refusal is a letter, but silence or failed contact is not',()=>{
 for(const [seed,away,status,count] of [[0,false,'declined',1],[1972,false,'no_reply',0],[1972,true,'no_reply',0],[1000,true,'no_contact',0]]){const {s,id}=fixture(seed,away);assert.equal(s.meetings[0].status,status);s.world.dynasties.catalog[id].name=['Hidden name','秘密姓名'];if(status==='declined')delete s.factions.egypt;advanceMailReports(s);const mail=replies(s);assert.equal(mail.length,count);if(count){assert.match(mail[0].body[1],/旧报告姓名.*拒绝/);assert.doesNotMatch(mail[0].body[1],/秘密姓名/);assert.equal(mail[0].sentDateKnown,false)}}
});
