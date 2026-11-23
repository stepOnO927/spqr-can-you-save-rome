import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength} from '../engine.js?v=official-inquiries-1';
import {formCoalition} from '../coalitions.js?v=official-inquiries-1';
import {proposeCoalitionMotion} from '../coalition-motions.js?v=official-inquiries-1';
import {coalitionCouncilHtml} from '../coalition-council-ui.js?v=official-inquiries-1';
import {campaignDate} from '../campaign-date.js?v=official-inquiries-1';

test('council displays the correct BCE ballot deadline and only known nominees',()=>{
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 const formed=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(formed.ok);formed.coalition.leader='egypt';
 s.world.diplomaticKnowledge.caesar||={};s.world.diplomaticKnowledge.caesar.armenia={id:'contact',kind:'agreement',status:'active',parties:['caesar','armenia'],year:s.year,month:s.month};
 const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;'),name=id=>id;
 let html=coalitionCouncilHtml(s,'en',name,esc,campaignDate);
 assert.match(html,/Nominate member/);assert.match(html,/armenia/);assert.doesNotMatch(html,/mauretania/);
 const motion=proposeCoalitionMotion(s,formed.coalition.id,'caesar','admission','armenia');assert.ok(motion.ok);
 html=coalitionCouncilHtml(s,'en',name,esc,campaignDate);
 assert.match(html,/Closes 5\/49 BCE/);assert.match(html,/Member nomination/);
});
