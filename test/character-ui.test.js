import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {createCharacterUI} from '../map-lab/character-ui.js';
import {addReport} from '../character-system.js';

// A small DOM stub exercises the real handler without requiring a network listener.
// It does not replace a browser or layout test.
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.elements={};this.textContent='';this.value='';this.className=''}
 set innerHTML(value){this.html=value;if(value.includes('id="person-destination"')){this.elements['#person-destination']=Object.assign(new Element('select'),{value:'epirus'});this.elements['#person-travel']=new Element('button');this.elements['#person-travel-feedback']=new Element()}if(value.includes('id="mission-subject"')){this.elements['#mission-subject']=Object.assign(new Element('select'),{value:'health',selectedOptions:[{textContent:'Health'}]});this.elements['#mission-ally']=Object.assign(new Element('select'),{value:''});this.elements['#mission-feedback']=new Element();this.elements['#mission-records']=new Element();this.missions=['spy','envoy','travelers','audience','exchange'].map(type=>Object.assign(new Element('button'),{dataset:{mission:type},textContent:type}))}if(value.includes('id="claimant-choice"')){this.elements['#claimant-choice']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#claimant-support']=new Element('button');this.elements['#claimant-feedback']=new Element()}if(value.includes('id="meeting-person"')){this.elements['#meeting-person']=Object.assign(new Element('select'),{value:'cicero'});this.elements['#meeting-target']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#meeting-request']=new Element('button');this.elements['#meeting-feedback']=new Element();this.elements['#meeting-records']=new Element()}}
 get innerHTML(){return this.html||''}
 querySelector(selector){return this.elements[selector]||null}
 querySelectorAll(selector){return selector==='[data-mission]'?this.missions||[]:[]}
 append(...elements){this.children.push(...elements)}
 prepend(...elements){this.children.unshift(...elements)}
 replaceChildren(...elements){this.children=elements}
}
test('travel confirmation uses the selected route and refreshes resources immediately',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');let refreshed=0;
 globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>refreshed++});ui.show('cicero');const form=panel.children.find(x=>x.className==='mission-box');form.querySelector('#person-travel').onclick();const feedback=form.querySelector('#person-travel-feedback'),confirm=feedback.children[0],treasury=s.factions.senate.treasury;assert.ok(confirm);confirm.onclick();assert.ok(s.world.characters.cicero.travel);assert.ok(s.factions.senate.treasury<treasury);assert.equal(refreshed,1)}finally{globalThis.document=prior}
});
test('intelligence and personal audience confirmations spend treasury and refresh resources',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();let refreshed=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'en',inspect:()=>{},onStateChanged:()=>refreshed++});ui.addMissions(content,'egypt');const [missions,audience]=content.children,spy=missions.missions.find(x=>x.dataset.mission==='spy'),start=s.factions.senate.treasury;spy.onclick();missions.querySelector('#mission-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,start-12);assert.equal(refreshed,1);audience.querySelector('#meeting-request').onclick();audience.querySelector('#meeting-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,start-15);assert.equal(s.meetings[0].status,'pending');assert.equal(refreshed,2)}finally{globalThis.document=prior}
});
test('claimants are identified as reports and source reliability is visible in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element(),ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/报告的竞争者：/:/Reported claimants:/);assert.match(html,language==='zh'?/来源可靠性: 中等/:/Source reliability: Moderate/);assert.match(html,language==='zh'?/未独立核实/:/Not independently corroborated/)}}finally{globalThis.document=prior}
});
test('foreign character profiles show recorded claims without revealing actual health',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cleopatra.health='seriously_ill';addReport(s,'senate','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'en',inspect:()=>{}});ui.show('cleopatra');const dossier=panel.children.find(x=>x.className==='help-list');assert.match(dossier.innerHTML,/Healthy · Envoy/);assert.match(dossier.innerHTML,/Unverified/);assert.doesNotMatch(dossier.innerHTML,/Seriously ill/);assert.match(panel.innerHTML,/Simulated health<\/span><b>Unknown/);assert.match(dossier.innerHTML,/HISTORICAL ENCYCLOPEDIA \(NOT GAME INTELLIGENCE\)/)}finally{globalThis.document=prior}
});
test('own character dossier shows actual game command and political role',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('caesar');globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('caesar');const dossier=panel.children.find(x=>x.className==='help-list');assert.match(dossier.innerHTML,/正式政治领导人/);assert.match(dossier.innerHTML,/第十三军团/);assert.match(dossier.innerHTML,/暂不影响玩法/)}finally{globalThis.document=prior}
});
test('a reported claimant can be contacted through the diplomacy panel',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});let refreshed=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>refreshed++});ui.addMissions(content,'egypt');const box=content.children[2],cash=s.factions.senate.treasury;assert.match(box.innerHTML,/报告可能过时或错误/);box.querySelector('#claimant-support').onclick();box.querySelector('#claimant-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,cash-10);assert.equal(s.operations[0].type,'support');assert.equal(s.operations[0].remaining,4);assert.equal(refreshed,1)}finally{globalThis.document=prior}
});
