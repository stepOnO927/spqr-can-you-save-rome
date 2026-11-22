import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=intelligence-archive-1';
import {addReport} from '../character-system.js?v=intelligence-archive-1';
import {reportedTheaterAdministrators,renderLocalGovernor} from '../map-lab/local-governor-ui.js?v=intelligence-archive-1';
import {createFictionalPerson} from '../dynasties.js?v=intelligence-archive-1';

test('foreign city administration uses dated reports and retains conflicting or unknown claims',()=>{
 let s=newGame('caesar');s.year=-46;s.month=6;s.world.localGovernors={roma:{faction:'senate',person:'cato'}};
 addReport(s,'caesar','senate',{kind:'office_theater:roma',value:'cicero',source:'exchange',originSource:'spy',fromFaction:'egypt',observationYear:-49,observationMonth:2});addReport(s,'caesar','senate',{kind:'office_theater:roma',value:'cato',source:'spy'});addReport(s,'caesar','senate',{kind:'office_theater:roma',value:'unknown',source:'spy'});
 let reports=reportedTheaterAdministrators(s,'roma');assert.deepEqual(reports.map(x=>x.person),[null,'cato','cicero']);assert.equal(reports[2].outdated,true);assert.equal(reports[2].originSource,'spy');assert.equal(reports[2].fromFaction,'egypt');
 s.world.localGovernors.roma.person='scipio';s.world.characters.cicero.location='syria';s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reportedTheaterAdministrators(s,'roma'),reports);assert.deepEqual(reportedTheaterAdministrators(s,'italiaS'),[]);assert.deepEqual(reportedTheaterAdministrators({...s,player:'egypt'},'roma'),[]);
});
test('city displays a sourced dated foreign lead, allows opening it, and hides actual assignments',()=>{
 const s=newGame('caesar');s.world.localGovernors={roma:{faction:'senate',person:'cato'}};addReport(s,'caesar','senate',{kind:'office_theater:roma',value:'cicero',source:'spy'});const previous=globalThis.document;let opened=null,button={dataset:{reportedGovernor:'cicero'}},box={innerHTML:'',querySelectorAll:()=>[button]},panel={children:[],append(x){this.children.push(x)}};globalThis.document={createElement:()=>box};
 try{renderLocalGovernor({panel,state:s,theater:'roma',language:'zh',refresh:()=>{},onShowCharacter:id=>opened=id});assert.match(box.innerHTML,/西塞罗/);assert.match(box.innerHTML,/间谍/);assert.match(box.innerHTML,/不证明现职/);assert.doesNotMatch(box.innerHTML,/小加图/);button.onclick();assert.equal(opened,'cicero');}finally{globalThis.document=previous}
});
test('foreign governor cards and their opened dossier use each report’s recorded name',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['First name','首份姓名'],faction:'senate',birthYear:-75});addReport(s,'caesar','senate',{kind:'office_theater:roma',value:id,source:'spy'});
 s.world.dynasties.catalog[id].name=['Second name','第二份姓名'];s=upgradeSave(structuredClone(s));s.month++;addReport(s,'caesar','senate',{kind:'office_theater:roma',value:id,source:'envoy'});s.world.dynasties.catalog[id].name=['Secret name','秘密姓名'];s=upgradeSave(structuredClone(s));
 const previous=globalThis.document,buttons=[0,1].map(index=>({dataset:{reportedGovernor:id,reportedGovernorIndex:String(index)}})),box={innerHTML:'',querySelectorAll:()=>buttons},panel={append(){}},opened=[];globalThis.document={createElement:()=>box};
 try{renderLocalGovernor({panel,state:s,theater:'roma',language:'zh',refresh:()=>{},onShowCharacter:(person,context)=>opened.push([person,context.reportedName])});assert.match(box.innerHTML,/首份姓名/);assert.match(box.innerHTML,/第二份姓名/);assert.doesNotMatch(box.innerHTML,/秘密姓名/);buttons[0].onclick();buttons[1].onclick();assert.deepEqual(opened,[[id,['Second name','第二份姓名']],[id,['First name','首份姓名']]]);
  for(const report of s.knowledge.caesar.senate.reports)delete report.peopleNames;assert.deepEqual(reportedTheaterAdministrators(s,'roma').map(r=>r.personName),[['Unrecorded name','姓名未记录'],['Unrecorded name','姓名未记录']]);
 }finally{globalThis.document=previous}
});
