import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=intelligence-archive-1';
import {addReport,reportEvidence,refreshReportConfidence} from '../character-system.js?v=intelligence-archive-1';
import {isDeliveredReport} from '../person-knowledge.js?v=intelligence-archive-1';

test('delivered intelligence is retained beyond the active window and survives save/load',()=>{
 let s=newGame('caesar');for(let i=0;i<45;i++)addReport(s,'caesar','egypt',{kind:'strength',value:1000+i,range:[1000+i,1200+i],source:'spy',marker:i});let k=s.knowledge.caesar.egypt;assert.equal(k.reports.length,30);assert.equal(k.reportArchive.length,15);assert.deepEqual(k.reportArchive.map(r=>r.marker),Array.from({length:15},(_,i)=>i));assert.equal(k.reports[0].marker,44);assert.equal(reportEvidence(s,'caesar','egypt',k.reportArchive[0]).unavailable,true);assert.equal(s.knowledge.senate.egypt.reportArchive,undefined);s=upgradeSave(JSON.parse(JSON.stringify(s)));refreshReportConfidence(s);k=s.knowledge.caesar.egypt;assert.equal(k.reportArchive.length,15);assert.equal(k.reportArchive[0].marker,0);assert.equal(k.reports.length,30);
});
test('undelivered reports remain in active knowledge until their recorded delivery',()=>{
 const s=newGame('caesar'),k=s.knowledge.caesar.egypt,future={kind:'strength',value:999999,source:'spy',year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month};k.reports.push(future);for(let i=0;i<35;i++)addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy',marker:i});assert.equal(k.reports.includes(future),true);assert.equal(k.reportArchive.includes(future),false);assert.equal(isDeliveredReport(s,future),false);s.year++;assert.equal(isDeliveredReport(s,future),true);addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy'});assert.ok(k.reports.includes(future)||k.reportArchive.includes(future));
});
