import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=strategic-offers-2';
import {addReport} from '../character-system.js?v=imperium-1';
import {offerPoliticalContact,advancePoliticalContacts} from '../political-contacts.js?v=dynasty-id-3';

const seedFor=(f)=>Array.from({length:10000},(_,i)=>i).find(i=>{const a=(Math.imul(i,1664525)+1013904223)>>>0,b=(Math.imul(a,1664525)+1013904223)>>>0;return f(a/4294967296,b/4294967296)});
function setup(player='caesar'){
 const s=newGame(player);addReport(s,'caesar','senate',{kind:'conspiracy',character:'cato',value:'suspected',source:'spy'});
 s.world.personalRelations['antony:cato']={trust:30,meetings:1};s.world.characters.cato.loyalty=20;s.world.characters.cato.ambition=90;return s;
}
function month(s){s.month++;if(s.month>12){s.month=1;s.year++}advancePoliticalContacts(s,addReport)}
test('an offer requires a reported name, a real personal contact and money without checking hidden current allegiance',()=>{
 const a=setup(),b=setup();b.world.characters.cato.faction='egypt';const cash=a.factions.caesar.treasury;
 assert.equal(offerPoliticalContact(a,'caesar','senate','scipio','antony').ok,false);
 assert.ok(offerPoliticalContact(a,'caesar','senate','cato','antony').ok);assert.ok(offerPoliticalContact(b,'caesar','senate','cato','antony').ok);
 assert.equal(a.factions.caesar.treasury,cash-12);assert.equal(a.world.politicalContacts[0].status,'pending');assert.equal(b.world.politicalContacts[0].status,'pending');
});
test('a genuine contact reports a plot only when personally connected, after a delay and across save/load',()=>{
 let s=setup();s.world.conspiracies={senate:{person:'scipio',participants:['scipio','cato']}};offerPoliticalContact(s,'caesar','senate','cato','antony');s.world.intelSeed=seedFor((a,b)=>a>.25&&b<.5);
 for(let i=0;i<4;i++)month(s);assert.equal(s.world.politicalContacts[0].status,'channel_open');assert.equal(s.world.doubleAgents[0].allegiance,'sponsor');
 assert.equal(s.knowledge.caesar.senate.reports[0].character,'cato');s=upgradeSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<3;i++)month(s);
 const report=s.knowledge.caesar.senate.reports[0];assert.equal(report.character,'scipio');assert.equal(report.confidence,'unverified');assert.equal(report.reliability,'low');assert.equal(s.knowledge.egypt.senate.reports.length,0);
});
test('a misleading contact can send a false known lead and a watch can compromise it',()=>{
 const s=setup('senate');offerPoliticalContact(s,'caesar','senate','cato','antony');s.world.intelSeed=seedFor((a,b)=>a>.25&&b>.9);for(let i=0;i<4;i++)month(s);
 assert.equal(s.world.doubleAgents[0].allegiance,'home');for(let i=0;i<3;i++)month(s);assert.equal(s.knowledge.caesar.senate.reports[0].character,'pompey');
 s.world.securityWatches={senate:{start:s.year*12+s.month,end:s.year*12+s.month+8}};s.world.intelSeed=seedFor((a)=>a<.22);for(let i=0;i<6;i++)month(s);
 assert.equal(s.world.doubleAgents[0].status,'compromised');assert.equal(s.world.politicalContacts[0].status,'lost_contact');assert.ok(s.log.some(x=>/counterintelligence watch uncovered/.test(x.en)));
});
test('a contact can change sides over time without announcing its true allegiance',()=>{
 let s=setup();s.world.politicalContacts=[{actor:'caesar',target:'senate',person:'cato',representative:'antony',status:'channel_open'}];s.world.doubleAgents=[{actor:'caesar',target:'senate',person:'cato',allegiance:'home',status:'active',nextReport:s.year*12+s.month,reassessAt:s.year*12+s.month}];s.world.intelSeed=0;
 advancePoliticalContacts(s,addReport);assert.equal(s.world.doubleAgents[0].allegiance,'sponsor');assert.ok(!s.log.some(e=>/changed sides|改变立场/.test(e.en+e.zh)));
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const agent=s.world.doubleAgents[0];s.world.characters.cato.loyalty=90;s.year++;agent.nextReport=s.year*12+s.month;agent.reassessAt=agent.nextReport;s.world.intelSeed=0;advancePoliticalContacts(s,addReport);assert.equal(agent.allegiance,'home');assert.equal(agent.history.length,2);
});
