import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=audience-mail-1';
import {requestAgentRelease,advanceAgentRequests,answerAgentRelease} from '../character-system.js?v=meeting-name-1';
import {syncAgentReleaseLetters,receivedMail,replyToLetter} from '../epistulae.js?v=audience-mail-1';
import {mailboxHtml} from '../mail-ui.js?v=audience-mail-1';
const actions={answerAgentRelease};
function setup(seed){const s=newGame('caesar');s.world.captives.push({id:'agent1',owner:'senate',holder:'caesar',state:'held'});assert.equal(requestAgentRelease(s,'senate','agent1').ok,true);advanceAgentRequests(s);s.world.intelSeed=seed;advanceAgentRequests(s);syncAgentReleaseLetters(s);return s}
const letters=s=>receivedMail(s).filter(m=>m.context?.kind==='agent_release_request');
test('only a delivered incoming request appears and survives migration without duplication',()=>{
 const lost=setup(1972);assert.equal(lost.releaseRequests[0].status,'no_reply');assert.equal(letters(lost).length,0);
 let s=setup(1000);assert.equal(s.releaseRequests[0].status,'awaiting_decision');assert.equal(letters(s).length,1);syncAgentReleaseLetters(s);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(letters(s).length,1);assert.match(mailboxHtml(s,{lang:'zh'}),/同意交接/);
});
test('inbox approval starts exactly one delayed handover and loss does not free the agent',()=>{
 for(const [seed,expected] of [[1000,'released'],[1972,'no_reply']]){
  const s=setup(1000),m=letters(s)[0];assert.equal(replyToLetter(s,m.id,'release_agent',actions).ok,true);assert.equal(s.releaseRequests[0].status,'returning');assert.equal(s.world.captives[0].state,'held');assert.equal(s.mail.messages.filter(x=>x.threadId===m.threadId).length,1);advanceAgentRequests(s);s.world.intelSeed=seed;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,expected);assert.equal(s.world.captives[0].state,expected==='released'?'released':'held');
 }
});
test('a decision from the security panel closes the same letter, and an old request cannot answer a later one',()=>{
 const s=setup(1000),old=letters(s)[0];assert.equal(answerAgentRelease(s,'agent1','refuse').ok,true);assert.doesNotMatch(mailboxHtml(s,{lang:'zh',selected:old.id}),/data-mail-reply="release_agent"/);advanceAgentRequests(s);s.world.intelSeed=1000;advanceAgentRequests(s);
 assert.equal(requestAgentRelease(s,'senate','agent1').ok,true);advanceAgentRequests(s);s.world.intelSeed=1000;advanceAgentRequests(s);syncAgentReleaseLetters(s);assert.equal(letters(s).length,2);assert.equal(replyToLetter(s,old.id,'release_agent',actions).ok,false);assert.equal(s.releaseRequests[0].status,'awaiting_decision');assert.equal(replyToLetter(s,letters(s).find(x=>x.id!==old.id).id,'refuse',actions).ok,true);
});
test('ignoring a delivered request sends no response and it eventually expires',()=>{
 const s=setup(1000),m=letters(s)[0];assert.equal(replyToLetter(s,m.id,'ignore',actions).ok,true);assert.equal(s.releaseRequests[0].status,'awaiting_decision');assert.equal(s.mail.messages.filter(x=>x.threadId===m.threadId).length,1);for(let i=0;i<6;i++)advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'no_reply');assert.equal(s.world.captives[0].state,'held');
});
