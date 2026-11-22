import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission} from '../engine.js?v=world-kings-sea-1';
import {addReport,advanceOperations,visiblePersonName} from '../character-system.js?v=world-kings-sea-1';
import {createFictionalPerson} from '../dynasties.js?v=world-kings-sea-1';

test('a general mission can discover a usable name without tracking later hidden renames',()=>{
 let base=newGame('caesar');const id=createFictionalPerson(base,{name:['Observed person','发现的人物'],faction:'egypt',birthYear:-73,location:'egypt'});
 base.world.leadership.egypt=[id];base.knowledge.caesar.egypt.reportedLeaders=[];base.knowledge.caesar.egypt.reports=[];
 assert.equal(queueMission(base,'caesar','egypt','spy','health',null,'').ok,true);let found=false;
 for(let seed=1;seed<=100&&!found;seed++){
  let s=upgradeSave(JSON.parse(JSON.stringify(base)));s.world.intelSeed=seed*100000+17;
  for(let i=0;i<4;i++)advanceOperations(s);
  const report=s.knowledge.caesar.egypt.reports.find(r=>r.kind==='health'&&r.character===id);
  if(!report)continue;assert.equal(report.identityObserved,true);assert.deepEqual(visiblePersonName(s,'caesar',id),['Observed person','发现的人物']);
  s.world.dynasties.catalog[id].name=['Hidden new name','秘密新姓名'];s=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(visiblePersonName(s,'caesar',id),['Observed person','发现的人物']);found=true;
 }
 assert.ok(found,'a general mission should discover the court figure in at least one seeded outcome');
});

test('only delivered observations can establish a new name; targeted and legacy labels cannot',()=>{
 const s=newGame('caesar'),id=createFictionalPerson(s,{name:['Secret','秘密姓名'],faction:'egypt',birthYear:-73});
 addReport(s,'caesar','egypt',{kind:'health',character:id,value:'ill',source:'spy',peopleNames:{[id]:['Old request','旧请求称呼']}});
 assert.deepEqual(visiblePersonName(s,'caesar',id),['Unrecorded name','姓名未记录']);
 s.knowledge.caesar.egypt.reports.unshift({kind:'location',character:id,value:'egypt',identityObserved:true,peopleNames:{[id]:['Future name','未来姓名']},year:s.year,month:s.month+1});
 assert.deepEqual(visiblePersonName(s,'caesar',id),['Unrecorded name','姓名未记录']);
 addReport(s,'caesar','egypt',{kind:'location',character:id,value:'egypt',source:'spy',identityObserved:true,peopleNames:{[id]:['Observed','观察姓名']}});
 assert.deepEqual(visiblePersonName(s,'caesar',id),['Observed','观察姓名']);
 assert.deepEqual(visiblePersonName(s,'parthia',id),['Unrecorded name','姓名未记录']);
});

test('an ally forwards its observed identity only after the reply arrives',()=>{
 let base=newGame('caesar');const id=createFictionalPerson(base,{name:['Observed abroad','盟友所见'],faction:'egypt',birthYear:-73});
 base.alliances.push(['caesar','parthia']);base.knowledge.caesar.egypt.reportedLeaders=[];base.knowledge.caesar.egypt.reports=[];
 addReport(base,'parthia','egypt',{kind:'health',character:id,value:'healthy',source:'spy',identityObserved:true,peopleNames:{[id]:['Observed abroad','盟友所见']}});
 assert.equal(queueMission(base,'caesar','egypt','exchange','health','parthia','').ok,true);let found=false;
 for(let seed=1;seed<=100&&!found;seed++){
  let s=upgradeSave(JSON.parse(JSON.stringify(base)));s.world.intelSeed=seed*100000+17;
  for(let i=0;i<2;i++){s.month++;advanceOperations(s)}
  assert.deepEqual(visiblePersonName(s,'caesar',id),['Unrecorded name','姓名未记录']);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));s.month++;advanceOperations(s);
  if(s.operations[0].status!=='complete')continue;
  const report=s.knowledge.caesar.egypt.reports.find(r=>r.character===id);assert.equal(report.identityObserved,true);assert.deepEqual(visiblePersonName(s,'caesar',id),['Observed abroad','盟友所见']);found=true;
 }
 assert.ok(found,'a forwarded observation should arrive in at least one seeded outcome');
});
