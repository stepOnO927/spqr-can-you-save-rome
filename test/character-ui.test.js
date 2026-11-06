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
 set innerHTML(value){this.html=value;this.characters=[...value.matchAll(/data-character="([^"]+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{character:m[1]}}));this.verify=[...value.matchAll(/data-verify-report="(\d+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{verifyReport:m[1]}}));this.focusTheaters=[...value.matchAll(/data-focus-theater="([^"]+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{focusTheater:m[1]}}));if(value.includes('id="person-destination"')){this.elements['#person-destination']=Object.assign(new Element('select'),{value:'epirus'});this.elements['#person-travel']=new Element('button');this.elements['#person-travel-feedback']=new Element()}if(value.includes('id="mission-subject"')){this.elements['#mission-subject']=Object.assign(new Element('select'),{value:'health',options:[...value.matchAll(/<option value="([^"]+)"/g)].map(m=>({value:m[1]})),selectedOptions:[{textContent:'Health'}]});this.elements['#mission-ally']=Object.assign(new Element('select'),{value:''});this.elements['#mission-person']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#mission-feedback']=new Element();this.elements['#mission-records']=new Element();this.missions=['spy','envoy','travelers','audience','exchange'].map(type=>Object.assign(new Element('button'),{dataset:{mission:type},textContent:type}))}if(value.includes('id="release-feedback"')){this.elements['#release-feedback']=new Element();this.releases=[...value.matchAll(/data-release="([^"]+)"/g)].map(m=>Object.assign(new Element('button'),{dataset:{release:m[1]}}))}if(value.includes('id="recognition-state"')){this.elements['#recognition-state']=new Element();this.elements['#recognize-claimant']=new Element('button');this.elements['#withdraw-recognition']=new Element('button');this.elements['#recognition-feedback']=new Element()}if(value.includes('id="claimant-choice"')){this.elements['#claimant-aid']=Object.assign(new Element('select'),{value:'political'});this.elements['#claimant-choice']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#claimant-representative']=Object.assign(new Element('select'),{value:''});this.elements['#claimant-support']=new Element('button');this.elements['#claimant-feedback']=new Element()}if(value.includes('id="meeting-person"')){this.elements['#meeting-person']=Object.assign(new Element('select'),{value:'cicero'});this.elements['#meeting-target']=Object.assign(new Element('select'),{value:'cleopatra'});this.elements['#meeting-request']=new Element('button');this.elements['#meeting-feedback']=new Element();this.elements['#meeting-records']=new Element()}}
 get innerHTML(){return this.html||''}
 querySelector(selector){return this.elements[selector]||null}
 querySelectorAll(selector){return selector==='[data-character]'?this.characters||[]:selector==='[data-mission]'?this.missions||[]:selector==='[data-release]'?this.releases||[]:selector==='[data-verify-report]'?this.verify||[]:selector==='[data-focus-theater]'?this.focusTheaters||[]:[]}
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
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0];assert.match(box.innerHTML,/人物情报对象（已报告人物）/);assert.match(box.innerHTML,/克娄巴特拉七世/);box.querySelector('#mission-person').value='ptolemy';box.missions.find(x=>x.dataset.mission==='spy').onclick();assert.match(box.querySelector('#mission-feedback').textContent,/托勒密十三世/);box.querySelector('#mission-feedback').children[0].onclick();assert.equal(s.operations[0].subjectCharacter,'ptolemy')}finally{globalThis.document=prior}
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
test('foreign office reports are inspectable leads, not assertions of present office or location',()=>{
 const prior=globalThis.document,s=newGame('caesar');s.world.offices={senate:{finance:'cato'}};s.world.characters.cicero.location='syria';addReport(s,'caesar','senate',{kind:'office_finance',value:'cicero',source:'spy',confidence:'unverified'});addReport(s,'caesar','senate',{kind:'office_supply',value:'unknown',source:'spy',confidence:'unverified'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'senate');const box=content.children[0],html=box.querySelector('#mission-records').innerHTML;assert.match(box.innerHTML,language==='zh'?/财务专员（间谍或盟友）/:/Finance officer \(spy or ally\)/);assert.match(html,language==='zh'?/财务专员报告：马尔库斯·图利乌斯·西塞罗/:/Reported finance officer: Marcus Tullius Cicero/);assert.match(html,language==='zh'?/不证明当前位置或现职/:/not proof of current office or location/);assert.match(html,language==='zh'?/粮秣专员报告：没有可靠消息/:/Reported supply officer: No reliable information/);assert.doesNotMatch(html,/小加图|Cato|叙利亚|Syria/);assert.match(html,/data-character="cicero"/)}}finally{globalThis.document=prior}
});
test('intelligence cards explain supporting and conflicting source families in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');for(const [source,value] of [['spy','ill'],['envoy','ill'],['travelers','healthy']])addReport(s,'senate','egypt',{kind:'health',character:'cleopatra',value,source,confidence:'unverified'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/查看判断依据/:/WHY THIS CONFIDENCE/);assert.match(html,language==='zh'?/支持来源：/:/Supporting sources:/);assert.match(html,language==='zh'?/冲突来源：/:/conflicting sources:/);assert.match(html,language==='zh'?/同一来源的重复报告只计算一次/:/Repeated reports from the same source count once/)}}finally{globalThis.document=prior}
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
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'en',inspect:()=>{}});ui.show('cleopatra');const dossier=panel.children.find(x=>x.className==='help-list');assert.match(dossier.innerHTML,/Healthy · Investigated court: Egypt · Envoy/);assert.match(dossier.innerHTML,/Unverified/);assert.doesNotMatch(dossier.innerHTML,/Seriously ill|battle wounds|Illness episodes/);assert.match(panel.innerHTML,/Simulated health<\/span><b>Unknown/);assert.match(dossier.innerHTML,/HISTORICAL ENCYCLOPEDIA \(NOT GAME INTELLIGENCE\)/)}finally{globalThis.document=prior}
});
test('historical reference is opt-in, sourced, and marks dates not yet verified',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).show('cleopatra');const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/<details class="historical-entry">/);assert.match(html,language==='zh'?/不决定模拟人物的寿命/:/does not determine simulated lifespan/);assert.match(html,/70–69/);assert.match(html,language==='zh'?/根据王朝纪年推算/:/estimated from the regnal chronology/);assert.match(html,/trismegistos\.org/);assert.match(html,language==='zh'?/历史卒年: 公元前30年/:/Historical death year: 30 BCE/);assert.match(html,/egyptianmuseum\.org/);assert.match(html,/https:\/\/www\.metmuseum\.org\/toah\/hd\/ptol\/hd_ptol\.htm/)}panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('labienus');assert.match(panel.children.find(x=>x.className==='help-list').innerHTML,/历史出生估计: 约公元前100年，误差范围不明/)}finally{globalThis.document=prior}
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

test('foreign age estimates identify direct and forwarded sources and their age',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{addReport(s,'senate','egypt',{kind:'age',character:'cleopatra',value:[19,21],source:'meeting',confidence:'unverified'});addReport(s,'senate','egypt',{kind:'age',character:'cleopatra',value:[18,20],source:'exchange',originSource:'audience',fromFaction:'parthia',observationYear:-52,observationMonth:1,confidence:'unverified'});createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onShowCharacter:()=>{}}).show('cleopatra');const dossier=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(dossier,/个人会面/);assert.match(dossier,/盟友转交/);assert.match(dossier,/使者会面/);assert.match(dossier,/情报过期/);assert.match(dossier,/未经核实/)}finally{globalThis.document=prior}
});

test('foreign health dossiers show the investigated court, forwarded origin, and both dates',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cleopatra.health='dying';
 globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{
  s.month=5;addReport(s,'senate','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'exchange',originSource:'spy',fromFaction:'parthia',observationYear:-49,observationMonth:2,reliability:'low'});
  addReport(s,'senate','parthia',{kind:'health',character:'cleopatra',value:'unknown',source:'travelers',reliability:'unknown'});
  for(const language of ['zh','en']){panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).show('cleopatra');const html=panel.children.find(x=>x.className==='help-list').innerHTML;
   assert.match(html,language==='zh'?/调查档案: 埃及/:/Investigated court: Egypt/);
   assert.match(html,language==='zh'?/转交方: 帕提亚/:/Forwarded by: Parthia/);
   assert.match(html,language==='zh'?/原始来源: 间谍/:/Original source: Spy/);
   assert.match(html,language==='zh'?/观察 2\/49 BCE · 收到 5\/49 BCE/:/Observed 2\/49 BCE · Received 5\/49 BCE/);
   assert.match(html,language==='zh'?/来源可靠性: 低/:/Source reliability: Low/);
   assert.doesNotMatch(html,language==='zh'?/垂危/:/Dying/);
  }
 }finally{globalThis.document=prior}
});

test('allied exchanges confirm and remember the selected reported person',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();s.alliances.push(['senate','parthia']);globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0];box.querySelector('#mission-subject').value='age';box.querySelector('#mission-person').value='ptolemy';box.querySelector('#mission-ally').value='parthia';box.missions.find(x=>x.dataset.mission==='exchange').onclick();assert.match(box.querySelector('#mission-feedback').textContent,/托勒密十三世/);box.querySelector('#mission-feedback').children[0].onclick();assert.equal(s.operations[0].subjectCharacter,'ptolemy');assert.equal(s.operations[0].partner,'parthia')}finally{globalThis.document=prior}
});

test('authority reports show only attributed claims, including an unknown result',()=>{
 const prior=globalThis.document,s=newGame('caesar');s.world.characters.orodes.health='seriously_ill';globalThis.document={createElement:tag=>new Element(tag)};
 try{let content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'parthia');assert.doesNotMatch(content.children[0].innerHTML,/帕科鲁斯一世/);addReport(s,'caesar','parthia',{kind:'authority',value:'unknown',source:'travelers',confidence:'rumor'});addReport(s,'caesar','parthia',{kind:'authority',value:{kind:'regency',actors:['pacorus']},source:'spy',confidence:'unverified'});content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'parthia');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,/摄政／临时代行政务 · 帕科鲁斯一世/);assert.match(html,/代行政务报告：没有可靠消息/);assert.match(content.children[1].innerHTML,/帕科鲁斯一世 · 其他已报告人物/)}finally{globalThis.document=prior}
});

test('a reported Mauretanian vacancy identifies separate administration without exposing hidden changes',()=>{
 const prior=globalThis.document,s=newGame('caesar');globalThis.document={createElement:tag=>new Element(tag)};
 try{addReport(s,'caesar','mauretania',{kind:'authority',value:{kind:'constituent_vacant',actors:['bogud']},source:'spy'});
  for(const language of ['zh','en']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'mauretania');const html=content.children[0].querySelector('#mission-records').innerHTML;
   assert.match(html,language==='zh'?/一个独立王国没有具名统治者，由未具名官员管理/:/One separate kingdom has no named ruler; an unnamed authority administers it/);
   assert.match(html,language==='zh'?/博古德/:/Bogud/);assert.match(html,language==='zh'?/未经核实/:/UNVERIFIED/);
  }
 }finally{globalThis.document=prior}
});

test('reported acting authorities open their own dossier without revealing current health or location',()=>{
 const prior=globalThis.document,s=newGame('caesar'),panel=new Element();s.world.characters.pacorus.health='seriously_ill';s.world.characters.pacorus.location='parthia';globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{let content=new Element();const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.addMissions(content,'parthia');assert.equal(content.children[0].querySelector('#mission-records').querySelectorAll('[data-character]').length,0);addReport(s,'caesar','parthia',{kind:'authority',value:{kind:'regency',actors:['pacorus']},source:'spy',confidence:'unverified'});content=new Element();ui.addMissions(content,'parthia');const cards=content.children[0].querySelector('#mission-records').querySelectorAll('[data-character]');assert.equal(cards.length,1);assert.equal(cards[0].dataset.character,'pacorus');cards[0].onclick();assert.match(panel.innerHTML,/帕科鲁斯一世/);assert.match(panel.innerHTML,/游戏健康<\/span><b>未知/);assert.match(panel.innerHTML,/所在战区<\/span><b>未知/);assert.doesNotMatch(panel.innerHTML,/重病/)}finally{globalThis.document=prior}
});

test('disputed historical years render as ranges with sources without changing the game state',()=>{
 const prior=globalThis.document,s=newGame('caesar'),panel=new Element();globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{for(const language of ['zh','en']){panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).show('lepidus');const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,language==='zh'?/公元前13–12年（断代有争议）/:/13–12 BCE \(dating disputed\)/);assert.match(html,/onlinelibrary\.wiley\.com/);assert.equal(s.world.characters.lepidus.alive,true)}}finally{globalThis.document=prior}
});

test('foreign age remains unknown until an observation despite a sourced historical birth estimate',()=>{
 const prior=globalThis.document,s=newGame('caesar'),panel=new Element();globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('ptolemy');assert.match(panel.innerHTML,/年龄<\/span><b>未知/);const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/历史出生估计: 公元前62–61年（估计）/);assert.match(html,/trismegistos\.org/);assert.match(html,/历史百科（非游戏情报）/);assert.doesNotMatch(html,/会面时的年龄估计/)}finally{globalThis.document=prior}
});

test('birth disagreements and later Greek name forms stay in the historical encyclopedia',()=>{
 const prior=globalThis.document,s=newGame('senate'),panel=new Element();globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('caesar');assert.match(panel.innerHTML,/年龄<\/span><b>未知/);let html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/前100年较常用/);assert.match(html,/cambridge\.org/);
  panel.children=[];ui.show('cleopatra');html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/历史名称形式: ΚΛΕΟΠΑΤΡΑ/);assert.match(html,/统治后期钱币/);assert.match(html,/metmuseum\.org/);assert.match(panel.innerHTML,/年龄<\/span><b>未知/);
 }finally{globalThis.document=prior}
});

test('reports without identifiable names explicitly do not establish absence',()=>{
 const prior=globalThis.document,s=newGame('caesar');globalThis.document={createElement:tag=>new Element(tag)};
 try{addReport(s,'caesar','egypt',{kind:'claimants',leaders:[],source:'spy',confidence:'unverified'});for(const language of ['zh','en']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/未获得可核实姓名；不代表不存在/:/No identifiable names; this does not prove absence/);assert.doesNotMatch(html,language==='zh'?/已独立核实/:/>Independently corroborated</)}}finally{globalThis.document=prior}
});


test('only a friendly dossier shows simulated ambition, without claiming a plot exists',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cleopatra.ambition=91;globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('cato');const own=panel.children.find(x=>x.className==='help-list');assert.match(own.innerHTML,/模拟政治野心/);assert.match(own.innerHTML,/不代表此人正在密谋/);panel.children=[];ui.show('cleopatra');const foreign=panel.children.find(x=>x.className==='help-list');assert.doesNotMatch(foreign.innerHTML,/模拟政治野心|91/)}finally{globalThis.document=prior}
});



test('friendly commander experience is shown as game history without exposing foreign experience',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cato.battlesCommanded=2;s.world.characters.cleopatra.battlesCommanded=37;globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('cato');const own=panel.children.find(x=>x.className==='help-list');assert.match(own.innerHTML,/游戏指挥战斗次数: 2/);assert.match(own.innerHTML,/最多10%/);panel.children=[];ui.show('cleopatra');const foreign=panel.children.find(x=>x.className==='help-list');assert.doesNotMatch(foreign.innerHTML,/游戏指挥战斗次数|37/)}finally{globalThis.document=prior}
});


test('name reports distinguish incomplete lists from a source claiming completeness in both languages',()=>{
 const prior=globalThis.document,s=newGame('caesar');addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra'],exhaustive:true,source:'official'});addReport(s,'caesar','egypt',{kind:'claimants',leaders:['ptolemy'],source:'spy'});globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['zh','en']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,language==='zh'?/来源声称名单完整；仍可能有误/:/Source claims the list is complete; it may be wrong/);assert.match(html,language==='zh'?/名单可能不完整/:/List may be incomplete/)}}finally{globalThis.document=prior}
});

test('a missing friendly character does not disclose a stale saved location',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');s.world.characters.cicero.missing={origin:'roma',remaining:2};
 globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('cicero');assert.match(panel.innerHTML,/所在战区<\/span><b>未知<\/b>/);assert.doesNotMatch(panel.innerHTML,/所在战区<\/span><b>罗马<\/b>/)}finally{globalThis.document=prior}
});

test('sourced historical kinship remains separate from simulated trust and foreign intelligence',()=>{
 const prior=globalThis.document,s=newGame('senate'),panel=new Element();globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('cleopatra');let html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/历史家族关系: 托勒密十三世 · 弟弟及早期共同统治者/);assert.match(html,/不代表游戏中的信任、当前职权或已获情报/);assert.match(html,/metmuseum\.org/);assert.deepEqual(s.knowledge.senate.egypt.reports,[]);assert.deepEqual(s.world.personalRelations,{});
 panel.children=[];ui.show('pacorus');html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/奥罗德二世 · 父亲/);assert.match(html,/iranicaonline\.org/);assert.deepEqual(s.knowledge.senate.parthia.reports,[]);
 }finally{globalThis.document=prior}
});

test('Parthian intelligence offers covert contact investigations in both languages',()=>{
 const prior=globalThis.document,s=newGame('senate');globalThis.document={createElement:tag=>new Element(tag)};
 try{for(const language of ['en','zh']){const content=new Element();createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).addMissions(content,'parthia');assert.match(content.children[0].innerHTML,/value="contacts"/);assert.match(content.children[0].innerHTML,language==='zh'?/埃及或帕提亚竞争者/:/Egyptian or Parthian claimant/)}}finally{globalThis.document=prior}
});

test('completed mission records show the resolution date without hidden reasons',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();s.operations.push({actor:'senate',target:'egypt',type:'spy',status:'failed',resolvedYear:-49,resolvedMonth:4});globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,/间谍 · 失败 · 结束 4\/49 BCE/);assert.doesNotMatch(html,/宫廷已不存在/)}finally{globalThis.document=prior}
});

test('a friendly commander in transit is shown marching rather than present in the origin theater',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate'),unit=s.armies.find(a=>a.characterId==='pompey');unit.move={to:'italiaS',remaining:2};globalThis.document={querySelector:selector=>selector==='#command-detail'?panel:null,createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('pompey');assert.match(panel.innerHTML,/所在战区<\/span><b>随军行军中<\/b>/)}finally{globalThis.document=prior}
});

test('strength ranges and compatible evidence are explained in the intelligence interface',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'strength',value:10000,range:[8000,12000],source:'spy'});addReport(s,'senate','egypt',{kind:'strength',value:12000,range:[10000,14000],source:'envoy'});globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,/军力估计：8000–12000（不保证准确）/);assert.match(html,/部分重叠的军力估计/);assert.doesNotMatch(html,/可能并存的人名报告/)}finally{globalThis.document=prior}
});

test('envoy relation missions explain the delayed diplomatic benefit before confirmation',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0],subject=box.querySelector('#mission-subject');assert.match(box.innerHTML,/改善关系（仅使者）/);subject.value='relations';box.missions.find(x=>x.dataset.mission==='envoy').onclick();const feedback=box.querySelector('#mission-feedback');assert.match(feedback.textContent,/双方关系最多提高8/);assert.match(feedback.textContent,/可能拒绝/);feedback.children[0].onclick();assert.equal(s.operations[0].subject,'relations');assert.equal(s.operations[0].type,'envoy');assert.ok(s.operations[0].remaining>=3)}finally{globalThis.document=prior}
});

test('foreign portrait presentation changes only with the viewer’s identity evidence',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}});ui.show('pacorus');assert.match(panel.innerHTML,/游戏身份未知；肖像未获得/);assert.doesNotMatch(panel.innerHTML,/pacorus-128\.jpg/);for(const source of ['spy','envoy','travelers'])addReport(s,'senate','parthia',{kind:'claimants',leaders:['pacorus'],source});s.world.characters.pacorus.health='dying';s.world.leadership.parthia=['orodes'];panel.children=[];ui.show('pacorus');assert.match(panel.innerHTML,/pacorus-128\.jpg/);assert.match(panel.innerHTML,/报告姓名经多方印证，不证明现职；肖像为艺术复原/);assert.match(panel.innerHTML,/游戏健康<\/span><b>未知/);s.year+=3;panel.children=[];ui.show('pacorus');assert.match(panel.innerHTML,/报告身份未经证实；肖像为艺术复原/)}finally{globalThis.document=prior}
});

test('claimant recognition requires confirmation and shows only the player’s stated policy',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'rumor'});let updates=0;globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onStateChanged:()=>updates++}).addMissions(content,'egypt');const box=content.children[2],funds=s.factions.senate.treasury;assert.match(box.innerHTML,/不能证明其实际执政/);box.querySelector('#recognize-claimant').onclick();const feedback=box.querySelector('#recognition-feedback');assert.match(feedback.textContent,/花费5国库/);assert.equal(s.factions.senate.treasury,funds);feedback.children[0].onclick();assert.equal(s.world.recognitions.senate.egypt.claimant,'cleopatra');assert.match(box.querySelector('#recognition-state').textContent,/克娄巴特拉七世/);assert.equal(updates,1);box.querySelector('#withdraw-recognition').onclick();box.querySelector('#recognition-feedback').children.at(-2).onclick();assert.equal(s.world.recognitions.senate.egypt,undefined)}finally{globalThis.document=prior}
});

test('diplomatic statements display the source and warn they do not prove private intentions',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'stance',character:'cleopatra',value:'receptive',source:'meeting',confidence:'unverified'});globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0],html=box.querySelector('#mission-records').innerHTML;assert.match(box.innerHTML,/公开外交表态（使者或盟友转交）/);assert.match(html,/公开外交表态：克娄巴特拉七世 · 愿意接触（不保证真实意图或未来行动）/);assert.match(html,/个人会面/);assert.match(html,/未经核实/)}finally{globalThis.document=prior}
});

test('foreign dossiers show only recorded statements, with date and uncertainty',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');addReport(s,'senate','egypt',{kind:'stance',character:'cleopatra',value:'guarded',source:'meeting',observationYear:-50,observationMonth:2});addReport(s,'caesar','egypt',{kind:'stance',character:'cleopatra',value:'receptive',source:'meeting'});globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).show('cleopatra');const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/已记录的公开表态/);assert.match(html,/谨慎戒备 · 个人会面 · 2\/50 BCE · 未经核实/);assert.match(html,/不证明私下意图或未来行动/);assert.doesNotMatch(html,/愿意接触/)}finally{globalThis.document=prior}
});

test('clash reports present uncertainty and do not display another faction’s reports',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'clashes',value:'unknown',source:'travelers',confidence:'rumor'});addReport(s,'caesar','egypt',{kind:'clashes',value:'reported',source:'spy'});globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[0],html=box.querySelector('#mission-records').innerHTML;assert.match(box.innerHTML,/武装冲突报告/);assert.match(html,/未取得武装冲突的可靠消息；不代表局势和平/);assert.doesNotMatch(html,/有地方武装冲突的报告/)}finally{globalThis.document=prior}
});
test('an official denial is shown as a claim, not proof of peace',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'clashes',value:'denied',source:'official'});globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const html=content.children[0].querySelector('#mission-records').innerHTML;assert.match(html,/宫廷否认武装冲突；否认不证明局势和平/);assert.match(html,/官方书信/);assert.match(html,/未经核实/)}finally{globalThis.document=prior}
});
test('foreign location dossier shows only the observer’s dated theater reports',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');addReport(s,'senate','egypt',{kind:'location',character:'cleopatra',value:'egypt',source:'spy',observationYear:-50,observationMonth:2});addReport(s,'caesar','egypt',{kind:'location',character:'cleopatra',value:'parthia',source:'spy'});s.world.characters.cleopatra.location='parthia';globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onShowCharacter:()=>{}});ui.show('cleopatra');const html=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(html,/所在地报告（战区级）/);assert.match(html,/亚历山大战区 · 间谍 · 2\/50 BCE/);assert.match(html,/不代表现在的位置或所在城市/);assert.doesNotMatch(html,/帕提亚 · 间谍/);const content=new Element();ui.addMissions(content,'egypt');assert.match(content.children[0].innerHTML,/人物所在地（战区级）/);assert.match(content.children[0].querySelector('#mission-records').innerHTML,/观察当时，非实时位置/)}finally{globalThis.document=prior}
});
test('reported theater can be located and suggested for meetings without exposing the true location',()=>{
 const prior=globalThis.document,panel=new Element(),s=newGame('senate');addReport(s,'senate','egypt',{kind:'location',character:'cleopatra',value:'egypt',source:'spy',observationYear:-50,observationMonth:2});s.world.characters.cleopatra.location='parthia';let focused=null;globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{const ui=createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{},onFocusTheater:id=>{focused=id}});ui.show('cleopatra');const box=panel.children.find(x=>x.className==='help-list'),buttons=box.querySelectorAll('[data-focus-theater]');assert.equal(buttons.length,1);buttons[0].onclick();assert.equal(focused,'egypt');const content=new Element();ui.addMissions(content,'egypt');assert.match(content.children[1].innerHTML,/线索: 亚历山大战区 2\/50 BCE/);assert.doesNotMatch(content.children[1].innerHTML,/线索: 帕提亚/)}finally{globalThis.document=prior}
});
test('military aid explains the costs and requires confirmation before dispatch',()=>{
 const prior=globalThis.document,s=newGame('senate'),content=new Element();addReport(s,'senate','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy'});globalThis.document={createElement:tag=>new Element(tag)};
 try{createCharacterUI({getState:()=>s,getLanguage:()=> 'zh',inspect:()=>{}}).addMissions(content,'egypt');const box=content.children[2],cash=s.factions.senate.treasury;assert.match(box.innerHTML,/内战爆发前作为储备，爆发后增援其部队或兵源/);assert.match(box.innerHTML,/不退还/);box.querySelector('#claimant-aid').value='military';box.querySelector('#claimant-support').onclick();const feedback=box.querySelector('#claimant-feedback');assert.match(feedback.textContent,/14国库、1000兵源、5粮食/);assert.equal(s.factions.senate.treasury,cash);feedback.children[0].onclick();assert.equal(s.factions.senate.treasury,cash-14);assert.equal(s.operations[0].aid,'military');assert.match(feedback.textContent,/等待回信/)}finally{globalThis.document=prior}
});

test('new Roman birth references appear in the historical encyclopedia with individual sources',()=>{
 const previous=globalThis.document,panel=new Element(),s=newGame('caesar');globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
 try{for(const [id,year,source] of [['pompey','106','museum.classics.cam.ac.uk'],['cicero','106','548206709'],['cato','95','549703663']])for(const language of ['en','zh']){panel.children=[];createCharacterUI({getState:()=>s,getLanguage:()=>language,inspect:()=>{}}).show(id);const dossier=panel.children.find(x=>x.className==='help-list').innerHTML;assert.match(dossier,new RegExp(year));assert.ok(dossier.includes(source));assert.match(dossier,language==='zh'?/历史百科（非游戏情报）/:/HISTORICAL ENCYCLOPEDIA \(NOT GAME INTELLIGENCE\)/)}}finally{globalThis.document=previous}
});
