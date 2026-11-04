import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
import {createCharacterUI} from '../map-lab/character-ui.js';
import {addReport} from '../character-system.js';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js';

// A small DOM stub exercises the real handler without requiring a network listener.
// It does not replace a browser or layout test.
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.elements={};this.textContent='';this.value='';this.className=''}
 set innerHTML(value){this.html=value;if(value.includes('id="person-destination"')){this.elements['#person-destination']=Object.assign(new Element('select'),{value:'epirus'});this.elements['#person-travel']=new Element('button');this.elements['#person-travel-feedback']=new Element()}if(value.includes('id="mission-subject"')){this.elements['#mission-subject']=Object.assign(new Element('select'),{value:'health',selectedOptions:[{textContent:'Health'}]});this.elements['#mission-ally']=Object.assign(new Element('select'),{value:''});this.elements['#mission-feedback']=new Element();this.elements['#mission-records']=new Element();this.missions=['spy','envoy','travelers','audience','exchange'].map(type=>Object.assign(new Element('button'),{dataset:{mission:type},textContent:type}))}if(value.includes('id="release-feedback"')){this.elements['#release-feedback']=new Element();this.releases=[...value.matchAll(/data-release="([^"]+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{release:m[1]}}))}if(value.includes('id="claimant-choice"')){this.elements['#claimant-choice']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#claimant-support']=new Element('button');this.elements['#claimant-feedback']=new Element()}if(value.includes('id="meeting-person"')){this.elements['#meeting-person']=Object.assign(new Element('select'),{value:'cicero'});this.elements['#meeting-target']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#meeting-request']=new Element('button');this.elements['#meeting-feedback']=new Element();this.elements['#meeting-records']=new Element()}}
 get innerHTML(){return this.html||''}
 querySelector(selector){return this.elements[selector]||null}
 querySelectorAll(selector){return selector==='[data-mission]'?this.missions||[]:selector==='[data-release]'?this.releases||[]:[]}
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
test('mission confirmation explains spy consequences and gives a specific unmet requirement',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.addMissions(content,'egypt');const missions=content.children[0],spy=missions.missions.find(x=>x.dataset.mission==='spy'),out=missions.querySelector('#mission-feedback'),cash=s.factions.senate.treasury;spy.onclick();assert.match(out.textContent,/关系降低10/);assert.match(out.textContent,/可能被捕/);assert.equal(s.factions.senate.treasury,cash);s.factions.senate.treasury=0;spy.onclick();assert.match(out.textContent,/国库不足/);assert.equal(s.operations.length,0)}finally{globalThis.document=prior}
});
test('claimants are identified as reports and source reliability is visible in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element(),ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/报告的竞争者：/:/Reported claimants:/);assert.match(html,language==='zh'?/来源可靠性: 中等/:/Source reliability: Moderate/);assert.match(html,language==='zh'?/未独立核实/:/Not independently corroborated/)}}finally{globalThis.document=prior}
});
test('political stability reports display only the recorded estimate in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');s.factions.egypt.stability=20;
 addReport(s,'senate','egypt',{kind:'stability',value:'stable',source:'spy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element(),ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/政治稳定度估计：稳定/:/Political stability estimate: Stable/);assert.doesNotMatch(html,/>20</)}}finally{globalThis.document=prior}
});
test('foreign character profiles show recorded claims without revealing actual health',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cleopatra.health='seriously_ill';addReport(s,'senate','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'en',inspect:()=>{}});ui.show('cleopatra');const dossier=panel.children.find(x=>x.className==='help-list');assert.match(dossier.innerHTML,/Healthy · Envoy/);assert.match(dossier.innerHTML,/Unverified/);assert.doesNotMatch(dossier.innerHTML,/Seriously ill|battle wounds|Illness episodes/);assert.match(panel.innerHTML,/Simulated health<\/span><b>Unknown/);assert.match(dossier.innerHTML,/HISTORICAL ENCYCLOPEDIA \(NOT GAME INTELLIGENCE\)/)}finally{globalThis.document=prior}
});
test('foreign dossier and intelligence panel show a dated age estimate rather than current certainty',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate'),content=new Element();
 addReport(s,'senate','egypt',{kind:'age',character:'cleopatra',value:[19,21],source:'audience',confidence:'unverified',reliability:'low'});
 globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('cleopatra');const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/会面时的年龄估计/);assert.match(html,/19–21/);assert.match(html,/并非当前年龄或已核实身份/);ui.addMissions(content,'egypt');assert.match(content.children[0].querySelector('#mission-records').innerHTML,/会面时年龄估计/)}finally{globalThis.document=prior}
});
test('a personal meeting is visible only to its sender and never proves current foreign authority',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cicero.location='egypt';s.world.intelSeed=1000;
 assert.equal(requestPersonalMeeting(s,'cicero','cleopatra').ok,true);advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);assert.equal(s.meetings[0].status,'met');
 s.world.leadership.egypt=['ptolemy'];s.world.characters.cleopatra.health='seriously_ill';
 globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){panel.children=[];const ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.show('cleopatra');const dossier=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(dossier,language==='zh'?/亲自会面记录/:/PERSONAL MEETING RECORDS/);assert.match(dossier,language==='zh'?/不能证明此人目前的身份、职权或健康/:/does not prove current identity, authority or health/);assert.doesNotMatch(dossier,/Seriously ill|重病/)}
 s.player='caesar';panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=> 'en',inspect:()=>{}}).show('cleopatra');assert.doesNotMatch(panel.children.find(x=>x.className==='help-list').innerHTML,/PERSONAL MEETING RECORDS/)
 }finally{globalThis.document=prior}
});
test('own character dossier shows actual game command and political role',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('caesar');globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('caesar');const dossier=panel.children.find(x=>x.className==='help-list');assert.match(dossier.innerHTML,/正式政治领导人/);assert.match(dossier.innerHTML,/第十三军团/);assert.match(dossier.innerHTML,/影响默认继任与代行顺序/)}finally{globalThis.document=prior}
});
test('a reported claimant can be contacted through the diplomacy panel',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});let refreshed=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>refreshed++});ui.addMissions(content,'egypt');const box=content.children[2],cash=s.factions.senate.treasury;assert.match(box.innerHTML,/报告可能过时或错误/);box.querySelector('#claimant-support').onclick();box.querySelector('#claimant-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,cash-10);assert.equal(s.operations[0].type,'support');assert.equal(s.operations[0].remaining,4);assert.equal(refreshed,1)}finally{globalThis.document=prior}
});
test('a held agent can be sent a release request from the diplomacy panel',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();s.world.captives.push({id:'p1',owner:'senate',holder:'egypt',state:'held'});let refreshed=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>refreshed++});ui.addMissions(content,'egypt');const box=content.children[3],cash=s.factions.senate.treasury;assert.match(box.innerHTML,/未具名被俘人员/);box.releases[0].onclick();box.querySelector('#release-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,cash-8);assert.equal(s.releaseRequests[0].remaining,4);assert.equal(refreshed,1)}finally{globalThis.document=prior}
});
test('foreign leadership cards use reported arrangements rather than hidden leadership',()=>{
 const prior=globalThis.document,s=newGame('caesar'),panel=new Element();globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});s.world.leadership.egypt=['ptolemy'];ui.addLeaders(panel,'egypt');assert.match(panel.children[0].innerHTML,/共同统治者/);addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'envoy',confidence:'unverified'});const newer=new Element();ui.addLeaders(newer,'egypt');assert.match(newer.children[0].innerHTML,/统治者/);assert.doesNotMatch(newer.children[0].innerHTML,/共同统治者/);const mauretania=new Element();ui.addLeaders(mauretania,'mauretania');assert.match(mauretania.children[0].innerHTML,/各王国统治者/)}finally{globalThis.document=prior}
});
