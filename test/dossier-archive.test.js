import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {addReport} from '../character-system.js?v=dossier-archive-1';
import {dossierReports} from '../map-lab/character-ui.js?v=dossier-archive-1';

test('dossiers retain delivered archived person reports without revealing future or other factions records',()=>{
 let s=newGame('caesar');for(const [kind,value] of [['health','ill'],['age',[19,25]],['location','parthia'],['stance','guarded']])addReport(s,'caesar','egypt',{kind,character:'ptolemy',value,source:'spy',observationYear:s.year-3,observationMonth:s.month});
 for(let i=0;i<35;i++)addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy'});
 const k=s.knowledge.caesar.egypt;assert.equal(k.reportArchive.filter(x=>x.character==='ptolemy').length,4);
 k.reportArchive.push({kind:'health',character:'ptolemy',value:'dying',source:'spy',year:s.year+1,month:s.month});addReport(s,'senate','egypt',{kind:'health',character:'ptolemy',value:'wounded',source:'spy'});
 s=upgradeSave(structuredClone(s));for(const [kind,value] of [['health','ill'],['age',[19,25]],['location','parthia'],['stance','guarded']]){const records=dossierReports(s,'ptolemy',kind);assert.equal(records.length,1);assert.deepEqual(records[0].value,value);assert.equal(records[0].reportTarget,'egypt')}
});

test('dossier selection prefers recent dated observations and remains limited to four',()=>{
 const s=newGame('caesar'),k=s.knowledge.caesar.egypt;k.reportArchive=[];for(let i=0;i<6;i++)k.reportArchive.push({kind:'health',character:'ptolemy',value:i,year:s.year-i,month:s.month});k.reportArchive.push({kind:'health',character:'ptolemy',value:'undated'});k.reports.unshift({kind:'health',character:'ptolemy',value:'future',year:s.year,month:s.month,receivedYear:s.year+1,receivedMonth:s.month});
 assert.deepEqual(dossierReports(s,'ptolemy','health').map(r=>r.value),[0,1,2,3]);
});
