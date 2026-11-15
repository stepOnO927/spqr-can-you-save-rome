import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=official-name-snapshots-1';
import {initializeCursus,investigateGovernment,governmentReport,reportedOfficialName,advanceCursus} from '../cursus-honorum.js?v=official-name-snapshots-1';
function setup(){const s=newGame('caesar'),c=initializeCursus(s);s.month=3;s.factions.caesar.treasury=500;c.intel.caesar={parthia:{stage:2,reports:[]}};return {s,c,id:c.foreignPosts.parthia.administration}}
function step(s){s.world.intelSeed=1000;s.month++;advanceCursus(s)}
test('a foreign official name is recorded at observation and remains dated after a hidden rename or deletion',()=>{
 let {s,c,id}=setup();const original=[...s.world.dynasties.catalog[id].name];assert.ok(investigateGovernment(s,'parthia').ok);step(s);step(s);step(s);
 assert.deepEqual(c.intel.caesar.parthia.pending.sealed.record.peopleNames[id],original);assert.equal(governmentReport(s,'parthia').pending.sealed,undefined);
 s.world.dynasties.catalog[id].name=['Hidden new name','隐藏的新名字'];delete s.world.characters[id];s=upgradeSave(structuredClone(s));step(s);step(s);
 const report=governmentReport(s,'parthia').reports.at(-1);assert.deepEqual(report.peopleNames[id],original);assert.deepEqual(reportedOfficialName(s,'parthia',id),original);assert.notDeepEqual(reportedOfficialName(s,'parthia',id),['Hidden new name','隐藏的新名字']);
});
test('legacy fictional records without a saved name do not recover it from current secret state',()=>{
 const {s,c,id}=setup();c.intel.caesar.parthia.reports.push({stage:3,people:[id],observed:{year:s.year,month:s.month}});s.world.dynasties.catalog[id].name=['Secret renamed person','秘密改名'];
 assert.deepEqual(reportedOfficialName(s,'parthia',id),['Unrecorded name','姓名未记录']);assert.deepEqual(reportedOfficialName(s,'parthia',id,'caesar',c.intel.caesar.parthia.reports[0]),['Unrecorded name','姓名未记录']);
});
test('a later delivered name may update the list without rewriting an earlier report',()=>{
 const {s,c,id}=setup(),old={stage:3,people:[id],peopleNames:{[id]:['Earlier','旧名']},observed:{year:s.year,month:s.month}};c.intel.caesar.parthia.reports.push(old);s.month++;
 c.intel.caesar.parthia.reports.push({stage:4,people:[id],peopleNames:{[id]:['Later','新报告名']},observed:{year:s.year,month:s.month}});
 assert.deepEqual(reportedOfficialName(s,'parthia',id),['Later','新报告名']);assert.deepEqual(reportedOfficialName(s,'parthia',id,'caesar',old),['Earlier','旧名']);
});
test('a future or unrelated name field is not treated as delivered evidence',()=>{
 const {s,c,id}=setup();c.intel.caesar.parthia.reports.push({stage:3,people:[],peopleNames:{[id]:['Unrelated','不相关']},observed:{year:s.year,month:s.month}},{stage:3,people:[id],peopleNames:{[id]:['Future','未来']},observed:{year:s.year+1,month:s.month}});
 assert.deepEqual(reportedOfficialName(s,'parthia',id),['Unrecorded name','姓名未记录']);assert.deepEqual(reportedOfficialName(s,'parthia',id,'caesar',c.intel.caesar.parthia.reports[1]),['Unrecorded name','姓名未记录']);
});
