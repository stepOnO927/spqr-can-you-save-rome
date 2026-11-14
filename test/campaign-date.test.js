import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignYear,campaignDate} from '../campaign-date.js?v=calendar-1';
import {newGame,sendInquiry,tick,upgradeSave} from '../engine.js?v=government-courier-guidance-1';
import {formatChronicleEntry} from '../chronicle.js?v=succession-ui-recovery-1';

test('continuous save years display without a historical year zero',()=>{
 assert.equal(campaignDate(12,-1,'zh'),'公元前1年12月');
 assert.equal(campaignDate(1,0,'zh'),'公元1年1月');
 assert.equal(campaignDate(1,0),'1/1 CE');
 assert.equal(campaignYear(1),'2 CE');
 assert.equal(campaignYear(NaN),'Unknown year');
});

test('letters remain delayed across the era boundary and through a save',()=>{
 let s=newGame('caesar');s.year=-1;s.month=12;
 assert.equal(sendInquiry(s,'caesar','egypt').ok,true);
 tick(s);assert.equal(s.year,0);assert.equal(s.month,1);assert.equal(s.inquiries[0].remaining,3);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));tick(s);
 assert.equal(s.year,0);assert.equal(s.month,2);assert.equal(s.inquiries[0].remaining,2);
});

test('intelligence chronicle dates do not mislabel the new era',()=>{
 const entry={kind:'intelligence',place:['Egypt','埃及'],reportedOwner:['Egypt','埃及'],source:'travelers',observationMonth:1,observationYear:0};
 assert.match(formatChronicleEntry(entry,'en'),/1\/1 CE/);
 assert.doesNotMatch(formatChronicleEntry(entry,'en'),/0 BCE/);
});
