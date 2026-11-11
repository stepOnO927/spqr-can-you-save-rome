import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=varus-portrait-1';
import {addReport} from '../character-system.js?v=succession-feedback-1';
import {leadershipIntelligence} from '../map-lab/intelligence-summary.js';

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
