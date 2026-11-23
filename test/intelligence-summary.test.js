import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-name-disagreement-1';
import {addReport} from '../character-system.js?v=faces-name-disagreement-1';
import {leadershipIntelligence} from '../map-lab/intelligence-summary.js?v=faces-name-disagreement-1';

test('leadership summary uses only the viewer’s reports, including their observation dates',()=>{
 const s=newGame('caesar');
 assert.deepEqual(leadershipIntelligence(s,'caesar','egypt'),{confidence:'unverified',observed:null,lastVerified:null});
 for(const source of ['spy','envoy','travelers'])addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source,confidence:'unverified'});
 assert.deepEqual(leadershipIntelligence(s,'caesar','egypt'),{confidence:'confirmed',observed:{year:-49,month:1},lastVerified:{year:-49,month:1}});
 assert.equal(leadershipIntelligence(s,'senate','egypt').lastVerified,null);
 s.world.leadership.egypt=['cleopatra'];assert.equal(leadershipIntelligence(s,'caesar','egypt').confidence,'confirmed');
 s.year=-46;assert.equal(leadershipIntelligence(s,'caesar','egypt').confidence,'outdated');
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra'],source:'spy',confidence:'unverified'});
 assert.deepEqual(leadershipIntelligence(s,'caesar','egypt'),{confidence:'unverified',observed:{year:-46,month:1},lastVerified:{year:-49,month:1}});
});

test('a forwarded old report does not masquerade as the date of a newer belief',()=>{
 const s=newGame();s.month=6;addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});
 s.month=7;addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra'],source:'exchange',originSource:'court',observationYear:-49,observationMonth:2,confidence:'unverified'});
 assert.deepEqual(leadershipIntelligence(s,'caesar','egypt').observed,{year:-49,month:6});
 assert.equal(leadershipIntelligence(s,'caesar','egypt').confidence,'unverified');
});
test('archival preserves the historical verification date without retaining current corroboration',()=>{
 let s=newGame('caesar');for(const source of ['spy','envoy','travelers'])addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source});
 for(let i=0;i<35;i++)addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy'});
 s=upgradeSave(structuredClone(s));assert.deepEqual(leadershipIntelligence(s,'caesar','egypt'),{confidence:'unverified',observed:{year:-49,month:1},lastVerified:{year:-49,month:1}});
 assert.equal(leadershipIntelligence(s,'senate','egypt').lastVerified,null);s.year+=3;assert.equal(leadershipIntelligence(s,'caesar','egypt').confidence,'outdated');
 s.knowledge.caesar.egypt.reportArchive.push({kind:'leaders',leaders:['ptolemy'],source:'spy',verified:true,confidence:'confirmed',year:s.year+1,month:s.month});assert.deepEqual(leadershipIntelligence(s,'caesar','egypt').lastVerified,{year:-49,month:1});
});
test('undated legacy records cannot invent an observation or verification date',()=>{
 const s=newGame('caesar');s.knowledge.caesar.egypt.reportArchive=[{kind:'leaders',leaders:['cleopatra','ptolemy'],verified:true,confidence:'confirmed'}];assert.deepEqual(leadershipIntelligence(s,'caesar','egypt'),{confidence:'unverified',observed:null,lastVerified:null});
});
