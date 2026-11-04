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
 set innerHTML(value){this.html=value;this.verify=[...value.matchAll(/data-verify-report="(\d+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{verifyReport:m[1]}}));if(value.includes('id="person-destination"')){this.elements['#person-destination']=Object.assign(new Element('select'),{value:'epirus'});this.elements['#person-travel']=new Element('button');this.elements['#person-travel-feedback']=new Element()}if(value.includes('id="mission-subject"')){this.elements['#mission-subject']=Object.assign(new Element('select'),{value:'health',options:[...value.matchAll(/<option value="([^"]+)"/g)].map(m=>({value:m[1]})),selectedOptions:[{textContent:'Health'}]});this.elements['#mission-ally']=Object.assign(new Element('select'),{value:''});this.elements['#mission-person']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#mission-feedback']=new Element();this.elements['#mission-records']=new Element();this.missions=['spy','envoy','travelers','audience','exchange'].map(type=>Object.assign(new Element('button'),{dataset:{mission:type},textContent:type}))}if(value.includes('id="release-feedback"')){this.elements['#release-feedback']=new Element();this.releases=[...value.matchAll(/data-release="([^"]+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{release:m[1]}}))}if(value.includes('id="claimant-choice"')){this.elements['#claimant-choice']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#claimant-representative']=Object.assign(new Element('select'),{value:''});this.elements['#claimant-support']=new Element('button');this.elements['#claimant-feedback']=new Element()}if(value.includes('id="meeting-person"')){this.elements['#meeting-person']=Object.assign(new Element('select'),{value:'cicero'});this.elements['#meeting-target']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#meeting-request']=new Element('button');this.elements['#meeting-feedback']=new Element();this.elements['#meeting-records']=new Element()}}
 get innerHTML(){return this.html||''}
 querySelector(selector){return this.elements[selector]||null}
 querySelectorAll(selector){return selector==='[data-mission]'?this.missions||[]:selector==='[data-release]'?this.releases||[]:selector==='[data-verify-report]'?this.verify||[]:[]}
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
test('health inquiry selection names only reported leaders and is captured at confirmation',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();s.world.leadership.egypt=['ptolemy'];globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0];assert.match(box.innerHTML,/健康调查对象（已报告人物）/);assert.match(box.innerHTML,/克娄巴特拉七世/);box.querySelector('#mission-person').value='ptolemy';box.missions.find(x=>x.dataset.mission==='spy').onclick();assert.match(box.querySelector('#mission-feedback').textContent,/托勒密十三世/);box.querySelector('#mission-feedback').children[0].onclick();assert.equal(s.operations[0].subjectCharacter,'ptolemy')}finally{globalThis.document=prior}
});
test('health selection includes reported claimants without reading the real court',()=>{
 const prior=globalThis.document,s=newGame('senate');s.knowledge.senate.egypt.reportedLeaders=['cleopatra'];s.world.claimants.egypt=['ptolemy'];globalThis.document={createElement:tag=>new Element(tag)};
 try{let content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');assert.doesNotMatch(content.children[0].innerHTML,/<option value="ptolemy">/);addReport(s,'senate','egypt',{kind:'claimants',leaders:['ptolemy'],source:'travelers',confidence:'rumor'});content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');assert.match(content.children[0].innerHTML,/<option value="ptolemy">托勒密十三世<\/option>/)}finally{globalThis.document=prior}
});
test('personal audiences list reported claimants without exposing hidden claimants',()=>{
 const prior=globalThis.document,s=newGame('senate');s.knowledge.senate.egypt.reportedLeaders=['cleopatra'];s.world.claimants.egypt=['ptolemy'];globalThis.document={createElement:tag=>new Element(tag)};
 try{let content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');assert.doesNotMatch(content.children[1].innerHTML,/托勒密十三世/);addReport(s,'senate','egypt',{kind:'claimants',leaders:['ptolemy'],source:'spy',confidence:'rumor'});content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');assert.match(content.children[1].innerHTML,/托勒密十三世 · 报告的竞争者/);assert.match(content.children[1].innerHTML,/克娄巴特拉七世 · 报告的领袖/)}finally{globalThis.document=prior}
});
test('mission confirmation explains spy consequences and gives a specific unmet requirement',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.addMissions(content,'egypt');const missions=content.children[0],spy=missions.missions.find(x=>x.dataset.mission==='spy'),out=missions.querySelector('#mission-feedback'),cash=s.factions.senate.treasury;spy.onclick();assert.match(out.textContent,/关系降低10/);assert.match(out.textContent,/可能被捕/);assert.equal(s.factions.senate.treasury,cash);s.factions.senate.treasury=0;spy.onclick();assert.match(out.textContent,/国库不足/);assert.equal(s.operations.length,0)}finally{globalThis.document=prior}
});
test('claimants are identified as reports and source reliability is visible in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element(),ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/报告的竞争者：/:/Reported claimants:/);assert.match(html,language==='zh'?/来源可靠性: 中等/:/Source reliability: Moderate/);assert.match(html,language==='zh'?/未独立核实/:/Not independently corroborated/)}}finally{globalThis.document=prior}
});
test('covert contact reports show a reported sponsor without disclosing the true operation list',()=>{
 const prior=globalThis.document,s=newGame('senate');addReport(s,'senate','egypt',{kind:'contacts',value:'caesar',source:'spy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/秘密接触报告：凯撒/:/Covert contact report: Caesar/);assert.match(html,language==='zh'?/未经核实/:/UNVERIFIED/);assert.match(content.children[0].innerHTML,/value="contacts"/)}}finally{globalThis.document=prior}
});
test('checking a report selects the recorded subject without spending money or revealing hidden facts',()=>{
 const prior=globalThis.document,s=newGame('senate');s.world.characters.cleopatra.health='seriously_ill';addReport(s,'senate','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'exchange',originSource:'spy',confidence:'unverified'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0],cash=s.factions.senate.treasury;box.querySelector('#mission-subject').value='leaders';box.querySelector('#mission-person').value='ptolemy';box.querySelector('#mission-records').querySelectorAll('[data-verify-report]')[0].onclick();assert.equal(box.querySelector('#mission-subject').value,'health');assert.equal(box.querySelector('#mission-person').value,'cleopatra');assert.match(box.querySelector('#mission-feedback').textContent,language==='zh'?/同一来源不会构成独立核实/:/same source does not independently verify/);assert.doesNotMatch(box.querySelector('#mission-feedback').textContent,/seriously|重病/);assert.equal(s.factions.senate.treasury,cash);assert.equal(s.operations.length,0)}}finally{globalThis.document=prior}
});
test('political stability reports display only the recorded estimate in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');s.factions.egypt.stability=20;
 addReport(s,'senate','egypt',{kind:'stability',value:'stable',source:'spy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element(),ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/政治稳定度估计：稳定/:/Political stability estimate: Stable/);assert.doesNotMatch(html,/>20</)}}finally{globalThis.document=prior}
});
test('an unknown succession report does not reveal the actual candidate',()=>{
 const prior=globalThis.document,s=newGame('senate');s.world.leadership.egypt=['ptolemy'];s.world.successionPlans.egypt='cleopatra';addReport(s,'senate','egypt',{kind:'succession',value:'unknown',source:'envoy',confidence:'unverified',reliability:'moderate'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element(),ui=createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}});ui.addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/继任安排报告：没有可靠消息/:/Reported succession plan: No reliable information/);assert.doesNotMatch(html,/Cleopatra|克娄巴特拉/)}}finally{globalThis.document=prior}
});
test('foreign character profiles show recorded claims without revealing actual health',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cleopatra.health='seriously_ill';addReport(s,'senate','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'en',inspect:()=>{}});ui.show('cleopatra');const dossier=panel.children.find(x=>x.className==='help-list');assert.match(dossier.innerHTML,/Healthy · Envoy/);assert.match(dossier.innerHTML,/Unverified/);assert.doesNotMatch(dossier.innerHTML,/Seriously ill|battle wounds|Illness episodes/);assert.match(panel.innerHTML,/Simulated health<\/span><b>Unknown/);assert.match(dossier.innerHTML,/HISTORICAL ENCYCLOPEDIA \(NOT GAME INTELLIGENCE\)/)}finally{globalThis.document=prior}
});
test('historical reference is opt-in, sourced, and marks dates not yet verified',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).show('cleopatra');const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/<details class="historical-entry">/);assert.match(html,language==='zh'?/不决定模拟人物的寿命/:/does not determine simulated lifespan/);assert.match(html,/70–69/);assert.match(html,language==='zh'?/待进一步核实/:/further verification needed/);assert.match(html,language==='zh'?/本项目尚未收录可核验资料/:/no verified entry in this catalog/);assert.match(html,/https:\/\/www\.metmuseum\.org\/toah\/hd\/ptol\/hd_ptol\.htm/)}panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('labienus');assert.match(panel.children.find(x=>x.className==='help-list').innerHTML,/出生年份（待进一步核实）: 未收录/)}finally{globalThis.document=prior}
});
test('foreign commander dossier shows dated observations, not an unseen reassignment',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.armies.find(x=>x.id==='xiii').characterId='antony';globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('caesar');const dossier=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(dossier,/指挥官目击记录/);assert.match(dossier,/第十三军团/);assert.match(dossier,/不证明目前的职务或位置/);assert.doesNotMatch(dossier,/安东尼/)}finally{globalThis.document=prior}
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
test('a missing friendly character does not expose their current health or loyalty',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cicero.missing={origin:'roma',remaining:2,year:s.year,month:s.month};s.world.characters.cicero.location=null;s.world.characters.cicero.health='seriously_ill';s.world.characters.cicero.loyalty=23;
 globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('cicero');assert.match(panel.innerHTML,/游戏健康<\/span><b>未知/);assert.match(panel.innerHTML,/模拟忠诚<\/span><b>未知/);assert.doesNotMatch(panel.innerHTML,/重病|23%/);assert.match(panel.children.find(x=>x.className==='help-list').innerHTML,/战后失联/);assert.ok(!panel.children.some(x=>x.className==='mission-box'))}finally{globalThis.document=prior}
});
test('a reported claimant can be contacted through the diplomacy panel',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});let refreshed=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>refreshed++});ui.addMissions(content,'egypt');const box=content.children[2],cash=s.factions.senate.treasury;assert.match(box.innerHTML,/报告可能过时或错误/);box.querySelector('#claimant-support').onclick();box.querySelector('#claimant-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,cash-10);assert.equal(s.operations[0].type,'support');assert.equal(s.operations[0].remaining,4);assert.equal(refreshed,1)}finally{globalThis.document=prior}
});
test('claimant support exposes only the player’s established personal contacts',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra','ptolemy'],source:'spy',confidence:'unverified'});s.world.personalRelations['cicero:cleopatra']={trust:15,meetings:3};s.world.personalRelations['antony:cleopatra']={trust:50,meetings:1};globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[2],choice=box.querySelector('#claimant-choice'),representative=box.querySelector('#claimant-representative');assert.match(representative.innerHTML,/西塞罗 · 信任 15/);assert.doesNotMatch(representative.innerHTML,/安东尼/);choice.value='ptolemy';choice.onchange();assert.doesNotMatch(representative.innerHTML,/西塞罗/);choice.value='cleopatra';choice.onchange();representative.value='cicero';box.querySelector('#claimant-support').onclick();box.querySelector('#claimant-feedback').children[0].onclick();assert.equal(s.operations[0].representative,'cicero');assert.equal(s.operations[0].remaining,4)}finally{globalThis.document=prior}
});
test('a held agent can be sent a release request from the diplomacy panel',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();s.world.captives.push({id:'p1',owner:'senate',holder:'egypt',state:'held'});let refreshed=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>refreshed++});ui.addMissions(content,'egypt');const box=content.children[3],cash=s.factions.senate.treasury;assert.match(box.innerHTML,/未具名被俘人员/);box.releases[0].onclick();box.querySelector('#release-feedback').children[0].onclick();assert.equal(s.factions.senate.treasury,cash-8);assert.equal(s.releaseRequests[0].remaining,4);assert.equal(refreshed,1)}finally{globalThis.document=prior}
});
test('foreign leadership cards use reported arrangements rather than hidden leadership',()=>{
 const prior=globalThis.document,s=newGame('caesar'),panel=new Element();globalThis.document={createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});s.world.leadership.egypt=['ptolemy'];ui.addLeaders(panel,'egypt');assert.match(panel.children[0].innerHTML,/共同统治者/);addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'envoy',confidence:'unverified'});const newer=new Element();ui.addLeaders(newer,'egypt');assert.match(newer.children[0].innerHTML,/统治者/);assert.doesNotMatch(newer.children[0].innerHTML,/共同统治者/);const mauretania=new Element();ui.addLeaders(mauretania,'mauretania');assert.match(mauretania.children[0].innerHTML,/各王国统治者/)}finally{globalThis.document=prior}
});
