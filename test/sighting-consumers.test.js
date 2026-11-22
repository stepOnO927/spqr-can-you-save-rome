import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave,sendInquiry} from '../engine.js?v=archived-leads-1';
import {buildChessboard} from '../chessboard.js?v=archived-leads-1';
import {createPlan,assignRole,assessPlan} from '../battle-plans.js?v=archived-leads-1';
import {reportedFrontierThreats} from '../frontier-response.js?v=archived-leads-1';
import {scoreFocus,focusReportsFor,legitimateFocusView} from '../national-focus.js?v=archived-leads-1';
import {templatesFor,evaluateTemplate} from '../legion-designer.js?v=archived-leads-1';

function setup(){const s=newGame('caesar');s.difficulty='expert';for(const k of Object.values(s.knowledge.caesar))k.sightings={};s.factions.caesar.treasury=600;s.factions.caesar.food=300;
 const p=createPlan(s,'caesar',{name:'Test',mode:'manual',objective:'italiaN'}).plan;assert.ok(assignRole(s,'caesar',p.id,{armyId:'xiii',role:'offensive',path:['italiaN']}).ok);
 return {s,p};}
function sighting(s){return {id:'future-unit',owner:'senate',region:'italiaN',year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month,profile:'cavalry',strengthBand:[6000,12000]}}

test('unreceived sightings stay out of the chessboard, planning and AI choices',()=>{
 const {s,p}=setup(),x=sighting(s),focus={ai:{base:10,threat:10},effects:[],cost:{treasury:0}},template=templatesFor(s,'caesar')[0];
 const before={board:buildChessboard(s),plan:assessPlan(s,'caesar',p.id),focus:scoreFocus(s,'caesar',focus),template:evaluateTemplate(s,'caesar',template)};
 s.knowledge.caesar.senate.sightings[x.id]=x;
 assert.deepEqual(buildChessboard(s),before.board);assert.deepEqual(assessPlan(s,'caesar',p.id),before.plan);assert.equal(scoreFocus(s,'caesar',focus),before.focus);assert.equal(evaluateTemplate(s,'caesar',template),before.template);
 x.receivedYear=s.year;const board=buildChessboard(s),plan=assessPlan(s,'caesar',p.id);assert.notDeepEqual(board,before.board);assert.ok(plan.known.some(r=>r.id===x.id));assert.ok(scoreFocus(s,'caesar',focus)>before.focus);assert.notEqual(evaluateTemplate(s,'caesar',template),before.template);
 delete x.strengthBand;assert.ok(assessPlan(s,'caesar',p.id).known.some(r=>r.id===x.id));x.strengthBand=[6000,12000];
 x.observationYear=s.year-3;x.observationMonth=s.month;assert.deepEqual(buildChessboard(s),before.board);assert.deepEqual(assessPlan(s,'caesar',p.id),before.plan);assert.equal(scoreFocus(s,'caesar',focus),before.focus);assert.equal(evaluateTemplate(s,'caesar',template),before.template);
});

test('frontier responses wait for delivery and retain observation date',()=>{
 let s=newGame('caesar');s.relations['armenia:parthia']=-40;s.knowledge.armenia.parthia.sightings={x:{id:'x',owner:'parthia',region:'parthia',year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month,strengthBand:[4000,8000]}};let x=s.knowledge.armenia.parthia.sightings.x;assert.deepEqual(reportedFrontierThreats(s,'armenia'),[]);
 s=upgradeSave(structuredClone(s));x=s.knowledge.armenia.parthia.sightings.x;assert.deepEqual(reportedFrontierThreats(s,'armenia'),[]);x.receivedYear=s.year;x.observationYear=s.year-1;x.observationMonth=s.month;assert.deepEqual(reportedFrontierThreats(s,'armenia'),[]);x.observationYear=s.year;assert.ok(reportedFrontierThreats(s,'armenia').length);
});

test('a future claimant sighting cannot unlock an inquiry before it is known',()=>{
 const s=newGame('caesar');s.knowledge.caesar.egypt_claimant={reportedLeaders:[],reports:[],sightings:{x:{id:'x',owner:'egypt_claimant',region:'egypt',year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month}}};
 assert.equal(sendInquiry(s,'caesar','egypt_claimant').reason,'unavailable');s.knowledge.caesar.egypt_claimant.sightings.x.receivedYear=s.year;assert.ok(sendInquiry(s,'caesar','egypt_claimant').ok);
});

test('unreceived policy reports do not affect focus scores or foreign focus views',()=>{
 const s=newGame('caesar');s.difficulty='expert';for(const k of Object.values(s.knowledge.caesar))k.sightings={};const focus={ai:{base:10,threat:10},effects:[],cost:{treasury:0}},before=scoreFocus(s,'caesar',focus);
 s.world.focusReports={};s.world.focusReports.caesar=[{actor:'egypt',focus:'SECRET_FOCUS',threat:true,year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month}];
 assert.equal(scoreFocus(s,'caesar',focus),before);assert.deepEqual(focusReportsFor(s,'caesar'),[]);assert.deepEqual(legitimateFocusView(s,'caesar','egypt').completed,[]);
 s.world.focusReports.caesar[0].receivedYear=s.year;assert.ok(scoreFocus(s,'caesar',focus)>before);assert.deepEqual(legitimateFocusView(s,'caesar','egypt').completed,['SECRET_FOCUS']);
});
