import {OFFICES,COURT_FACTIONS} from './data.js';
import {knownAttributes,DISASTERS,DISASTER_RESPONSES,COURT_PROFILE_IDS} from './court.js';
import {yearsBetween,isLiuClan} from './dynasty.js';
import {dateLabel} from './util.js';
import {courtPortraitSrc} from './court-portrait.js';

const ROLE_NAMES={official:['Official','朝官'],general:['General','将领'],envoy:['Envoy','使者']};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const label=(value,lang)=>Array.isArray(value)?value[lang]??value[0]:value;
const term=(lang,en,zh)=>lang?zh:en;
function courtPeople(s){
 const ids=new Set(COURT_PROFILE_IDS);
 for(const id of Object.values(s.court?.offices||{}))if(id)ids.add(id);
 for(const request of s.court?.recommendations||[])if(request.status==='arrived'&&request.personId)ids.add(request.personId);
 for(const person of Object.values(s.persons))if(person.faction==='han'&&person.career?.some(entry=>entry.kind==='court'&&entry.office))ids.add(person.id);
 return [...ids].map(id=>s.persons[id]).filter(person=>person&&person.faction==='han');
}

export function hanCourtHtml(s,lang=0,selected=COURT_PROFILE_IDS[0]){
 const people=courtPeople(s),person=s.persons[selected]&&people.some(p=>p.id===selected)?s.persons[selected]:people[0];
 if(!person)return '';
 const known=knownAttributes(s,person.id),office=person.office&&s.court.offices[person.office]===person.id?OFFICES[person.office]:null;
 const career=Array.isArray(person.career)?person.career:s.log.filter(entry=>entry.who===person.id||entry.who2===person.id);
 const recent=career.slice(-5).reverse(),opening=career[0]?.kind==='opening_service'&&!recent.includes(career[0])?career[0]:null;
 const activity=opening?[...recent,opening]:recent;
 const careerText=e=>String(label(e.text,lang)||'').replaceAll('%NAME2%',label(s.persons[e.who2]?.name,lang)||'').replaceAll('%NAME%',label(s.persons[e.who]?.name,lang)||label(person.name,lang));
 const status=person.alive?term(lang,'Serving','在世'):term(lang,'Deceased in this campaign','本战役中已故');
 const years=person.birth==null?null:yearsBetween(person.birth,person.alive?s.year:person.death??s.year);
 const ageText=years==null?term(lang,'Not recorded','未记载'):person.birthApprox?term(lang,`about ${years}`,`约${years}岁`):term(lang,`${years}`,`${years}岁`);
 const relatives=[person.father,person.mother,...(person.spouse||[])].filter(id=>id&&s.persons[id]).map(id=>label(s.persons[id].name,lang));
 const familyText=relatives.length?relatives.join(lang?'、':', '):term(lang,'No named relatives recorded','未记载具名亲属');
 const options=Object.entries(OFFICES).filter(([id])=>(!OFFICES[id].requiresLiu||isLiuClan(s,person.id))&&!(['chengxiang','yushi','dasima'].includes(id)&&person.eunuch)).map(([id,data])=>`<option value="${esc(id)}" ${office&&person.office===id?'selected':''}>${esc(label(data.name,lang))}</option>`).join('');
 const portraitSrc=courtPortraitSrc(person),portrait=portraitSrc?`<img src="${esc(portraitSrc)}" alt="" width="128" height="128">`:`<span class="court-silhouette" aria-hidden="true"></span>`;
 const observed=known?.competence==null?term(lang,'Not yet assessed','尚未评估'):String(known.competence);
 const evidence=known?.corruption==='proven'?term(lang,`Misconduct proven · evidence ${s.court.knowledge[person.id].evidence||0}`,`已证实失职 · 证据${s.court.knowledge[person.id].evidence||0}`):known?.corruption==='no_evidence'?term(lang,'No evidence found in the latest audit','最近稽查未发现证据'):term(lang,'No finding','尚无结论');
 const disaster=s.court.pendingDisaster,site=disaster&&s.regions.find(r=>r.id===disaster.region);
 const disasterHtml=disaster?`<section class="court-disaster"><h3>${term(lang,'Court must respond','朝廷须应对灾异')}</h3><p>${esc(label(DISASTERS[disaster.type]?.name,lang)||disaster.type)} · ${esc(label(site?.name,lang)||disaster.region)} · ${term(lang,`${disaster.deadline} months to respond`,`应对期限${disaster.deadline}个月`)}</p><label>${term(lang,'Faction to hold responsible','归责派系')}<select id="court-blame-faction">${Object.entries(COURT_FACTIONS).map(([id,data])=>`<option value="${esc(id)}" ${id==='ru'?'selected':''}>${esc(label(data.name,lang))}</option>`).join('')}</select></label>${Object.entries(DISASTER_RESPONSES).map(([id,data])=>{const cost=Object.entries(data.cost).map(([resource,amount])=>`${amount} ${term(lang,resource,({grain:'粮食',treasury:'国库'})[resource]||resource)}`).join(', ');const unavailable=(data.cost.grain||0)>s.factions.han.grain||(data.cost.treasury||0)>s.factions.han.treasury;return `<button class="action" data-court-disaster="${esc(id)}" ${unavailable?'disabled':''}>${esc(label(data.name,lang))}${cost?` · ${esc(cost)}`:''}</button>`}).join('')}</section>`:'';
 return `<h2>${term(lang,'Han court','大汉朝廷')}</h2>${disasterHtml}<p class="muted">${term(lang,'Select a minister to inspect their current simulated role. Historical portraits are artistic reconstructions; original people use game artwork.','选择朝臣查看当前模拟职务。历史人物肖像为艺术复原，原创人物使用游戏画像。')}</p>
 <div class="court-roster">${people.map(p=>{const src=courtPortraitSrc(p,64);return `<button data-court-person="${esc(p.id)}" aria-pressed="${p.id===person.id}">${src?`<img src="${esc(src)}" alt="" width="36" height="36">`:'<span class="court-silhouette" aria-hidden="true"></span>'}<span>${esc(label(p.name,lang))}</span></button>`}).join('')}</div>
 <article class="court-profile" data-person="${esc(person.id)}"><div class="court-head">${portrait}<div><h3>${esc(label(person.name,lang))}</h3><small>${esc(status)} · ${esc(office?label(office.name,lang):label(ROLE_NAMES[person.role],lang)||term(lang,'No current office','当前无官职'))}</small></div></div>
 <dl><dt>${term(lang,'Stable ID','固定编号')}</dt><dd>${esc(person.id)}</dd><dt>${term(lang,'Approximate age','约略年龄')}</dt><dd>${esc(ageText)}</dd><dt>${term(lang,'Known family','已知家族')}</dt><dd>${esc(familyText)}</dd><dt>${term(lang,'Court group','朝廷派系')}</dt><dd>${esc(label(COURT_FACTIONS[person.courtFaction]?.name,lang)||'—')}</dd><dt>${term(lang,'Loyalty','忠诚')}</dt><dd>${esc(person.loyalty??'—')}</dd><dt>${term(lang,'Skill assessment','能力评估')}</dt><dd>${esc(observed)}</dd><dt>${term(lang,'Audit finding','稽查结论')}</dt><dd>${esc(evidence)}</dd><dt>${term(lang,'Ambition','野心')}</dt><dd>${esc(known?.ambition==='exposed'?term(lang,'Exposed by a scheme','因阴谋暴露'):term(lang,'Unknown','未知'))}</dd></dl>
 <h3>${term(lang,'Current responsibilities','当前职责')}</h3><p>${esc(office?label(office.gloss,lang):term(lang,'No office is currently assigned.','当前未任官职。'))}</p>
 ${person.note?`<p>${esc(label(person.note,lang))}</p>`:''}<p class="muted">${person.record==='fictional'?term(lang,'This is an original campaign person. Their portrait is game artwork.','此人为战役原创人物，肖像为游戏创作。'):term(lang,'Birth dates may be approximate; deaths and health in this campaign are simulated. The image is not a documented likeness.','生年可能仅为约数；本战役中的死亡与健康属于模拟。画像并非史载容貌。')}</p>
 <h3>${term(lang,'Career in this campaign','本战役履历')}</h3>${activity.map(e=>`<p class="court-event">${esc(dateLabel(e.year,e.month,lang))} · ${esc(careerText(e))}</p>`).join('')||`<p class="muted">${term(lang,'No recorded court event yet.','尚无朝廷事件记录。')}</p>`}
 ${person.alive?`<label class="court-appoint">${term(lang,'Appoint to an office','任命官职')}<select id="court-office">${options}</select></label><button id="court-appoint" class="action">${term(lang,'Make appointment','正式任命')}</button><button id="court-recommend" class="action" ${s.factions.han.treasury<15?'disabled':''}>${term(lang,'Seek a new official · 15 treasury · 3 months','察举新官 · 15国库 · 3个月')}</button><p id="court-recommend-status" class="muted">${(s.court.recommendations||[]).filter(x=>x.status==='pending').map(x=>`${esc(label(OFFICES[x.office]?.name,lang))} · ${term(lang,`${x.remaining} months remaining`,`剩余${x.remaining}个月`)}`).join(' · ')}</p><button id="court-audit" class="action" ${s.court.audits.some(a=>a.target===person.id&&a.status==='open')||s.factions.han.treasury<15?'disabled':''}>${term(lang,'Open audit · 15 treasury','启动稽查 · 国库15')}</button>`:''}</article>`;
}

export function renderHanCourtPanel({root,state,lang=0,selected,onSelect,onAppoint,onRecommend,onAudit,onDisaster}){
 root.innerHTML=hanCourtHtml(state,lang,selected);
 const roster=root.querySelector('.court-roster'),active=roster?.querySelector('[aria-pressed="true"]');
 if(active){const a=active.getBoundingClientRect(),r=roster.getBoundingClientRect();roster.scrollTop+=a.top-r.top-(r.height-a.height)/2}
 root.querySelectorAll('[data-court-person]').forEach(button=>button.onclick=()=>onSelect(button.dataset.courtPerson));
 const person=root.querySelector('.court-profile')?.dataset.person;
 const appoint=root.querySelector('#court-appoint'),officeSelect=root.querySelector('#court-office');
 if(appoint&&officeSelect){
  const recommend=root.querySelector('#court-recommend');
  const sync=()=>{appoint.disabled=state.persons[person]?.office===officeSelect.value&&state.court.offices[officeSelect.value]===person;if(recommend)recommend.disabled=state.factions.han.treasury<15||OFFICES[officeSelect.value]?.requiresLiu||(state.court.recommendations||[]).some(x=>x.office===officeSelect.value&&x.status==='pending')};
  officeSelect.addEventListener('change',sync);sync();
  appoint.onclick=()=>onAppoint(person,officeSelect.value);
  if(recommend)recommend.onclick=()=>onRecommend(officeSelect.value);
 }
 const audit=root.querySelector('#court-audit');if(audit)audit.onclick=()=>onAudit(person);
 root.querySelectorAll('[data-court-disaster]').forEach(button=>button.onclick=()=>onDisaster(button.dataset.courtDisaster,button.dataset.courtDisaster==='blame_faction'?root.querySelector('#court-blame-faction').value:null));
}
