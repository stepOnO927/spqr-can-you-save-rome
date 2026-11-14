import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,moveArmy,tick,upgradeSave} from '../engine.js?v=diplomatic-chronicle-1';
import {captureOwnOrders,ownOrderUpdates,formatOwnOrder,controlReportChanges,formatControlReport} from '../map-lab/turn-report.js?v=fort-intel-1';
import {reportedControl} from '../control-intelligence.js?v=fort-intel-1';
import {FACTIONS} from '../data.js';

test('a delayed control report retains its observation date and does not reveal later hidden changes',()=>{
 const s=newGame('caesar'),before=Object.fromEntries(s.regions.map(r=>[r.id,reportedControl(s,'caesar',r.id)?.owner]));
 s.month=5;s.regions.find(r=>r.id==='parthia').owner='rebels';
 s.controlKnowledge.caesar.parthia={owner:'egypt',year:-49,month:3,source:'travelers'};
 const reports=controlReportChanges(s,before,FACTIONS);assert.equal(reports.length,1);
 assert.equal(reports[0].month,3);assert.equal(reports[0].source,'travelers');
 assert.match(formatControlReport(reports[0],'zh'),/埃及.*商旅.*3\/49 BCE.*可能过时或有误/);
 assert.match(formatControlReport(reports[0],'en'),/Egypt.*travelers.*3\/49 BCE.*outdated or mistaken/);
 assert.doesNotMatch(JSON.stringify(reports),/rebels/);
 assert.match(formatControlReport({name:['Old','旧'],owner:['Egypt','埃及']},'zh'),/观察时间和来源未保存/);
});

test('monthly reports describe own march and siege progress without exposing enemy orders',()=>{
 const s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii');unit.move={to:'italiaN',remaining:3};s.armies.find(a=>a.id==='italy').move={to:'cisalpine',remaining:3};
 const before=captureOwnOrders(s);tick(s);const updates=ownOrderUpdates(before,s);
 assert.equal(updates.length,1);assert.equal(updates[0].kind,'marching');assert.equal(updates[0].remaining,2);assert.match(formatOwnOrder(updates[0],'zh'),/剩余2个月/);assert.match(formatOwnOrder(updates[0],'en'),/2 month/);assert.ok(!JSON.stringify(updates).includes('Italian levies'));
 const again=captureOwnOrders(s);unit.move=null;unit.siege={region:'italiaN',remaining:3};assert.equal(ownOrderUpdates(again,s)[0].kind,'siege');
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(ownOrderUpdates(captureOwnOrders(saved),saved)[0].remaining,3);
});
test('a march stopped by peace is explained in the log and order status',()=>{
 const s=newGame('caesar');assert.equal(moveArmy(s,'xiii','italiaN').ok,true);s.armies.find(a=>a.id==='xiii').move.remaining=1;const before=captureOwnOrders(s);s.wars=s.wars.filter(w=>!(w.includes('caesar')&&w.includes('senate')));tick(s);
 assert.ok(s.log.some(e=>e.zh.includes('停止行军')&&e.zh.includes('不能进入')));const update=ownOrderUpdates(before,s)[0];assert.equal(update.kind,'ended');assert.match(formatOwnOrder(update,'zh'),/命令已结束/);
});
