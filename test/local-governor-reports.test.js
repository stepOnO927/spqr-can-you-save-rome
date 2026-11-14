import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=diplomatic-chronicle-1';
import {addReport} from '../character-system.js?v=portraits-hundred-days-1';
import {reportedTheaterAdministrators,renderLocalGovernor} from '../map-lab/local-governor-ui.js?v=portraits-hundred-days-1';

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
