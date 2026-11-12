import {OFFICES,COURT_FACTIONS} from './data.js';
import {knownAttributes,DISASTERS,DISASTER_RESPONSES} from './court.js';

const FEATURED=['shi-gao','xiao-wangzhi','hong-gong','yu-dingguo','chen-wannian'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const label=(value,lang)=>Array.isArray(value)?value[lang]??value[0]:value;
const term=(lang,en,zh)=>lang?zh:en;

export function hanCourtHtml(s,lang=0,selected=FEATURED[0]){
 const people=FEATURED.map(id=>s.persons[id]).filter(Boolean),person=s.persons[selected]&&people.some(p=>p.id===selected)?s.persons[selected]:people[0];
 if(!person)return '';
 const known=knownAttributes(s,person.id),office=person.office&&s.court.offices[person.office]===person.id?OFFICES[person.office]:null;
 const activity=s.log.filter(entry=>entry.who===person.id).slice(-4).reverse();
 const status=person.alive?term(lang,'Serving','在世'):term(lang,'Deceased in this campaign','本战役中已故');
 const options=Object.entries(OFFICES).filter(([id])=>!OFFICES[id].requiresLiu&&!(['chengxiang','yushi','dasima'].includes(id)&&person.eunuch)).map(([id,data])=>`<option value="${esc(id)}" ${office&&person.office===id?'selected':''}>${esc(label(data.name,lang))}</option>`).join('');
 const portrait=person.portrait?`<img src="../assets/portraits/${esc(person.portrait)}-128.jpg" alt="" width="128" height="128">`:`<span class="court-silhouette" aria-hidden="true"></span>`;
 const observed=known?.competence==null?term(lang,'Not yet assessed','尚未评估'):String(known.competence);
 const evidence=known?.corruption==='proven'?term(lang,`Misconduct proven · evidence ${s.court.knowledge[person.id].evidence||0}`,`已证实失职 · 证据${s.court.knowledge[person.id].evidence||0}`):known?.corruption==='no_evidence'?term(lang,'No evidence found in the latest audit','最近稽查未发现证据'):term(lang,'No finding','尚无结论');
 const disaster=s.court.pendingDisaster,site=disaster&&s.regions.find(r=>r.id===disaster.region);
 const disasterHtml=disaster?`<section class="court-disaster"><h3>${term(lang,'Court must respond','朝廷须应对灾异')}</h3><p>${esc(label(DISASTERS[disaster.type]?.name,lang)||disaster.type)} · ${esc(label(site?.name,lang)||disaster.region)} · ${term(lang,`${disaster.deadline} months to respond`,`应对期限${disaster.deadline}个月`)}</p><label>${term(lang,'Faction to hold responsible','归责派系')}<select id="court-blame-faction">${Object.entries(COURT_FACTIONS).map(([id,data])=>`<option value="${esc(id)}" ${id==='ru'?'selected':''}>${esc(label(data.name,lang))}</option>`).join('')}</select></label>${Object.entries(DISASTER_RESPONSES).map(([id,data])=>{const cost=Object.entries(data.cost).map(([resource,amount])=>`${amount} ${term(lang,resource,({grain:'粮食',treasury:'国库'})[resource]||resource)}`).join(', ');const unavailable=(data.cost.grain||0)>s.factions.han.grain||(data.cost.treasury||0)>s.factions.han.treasury;return `<button class="action" data-court-disaster="${esc(id)}" ${unavailable?'disabled':''}>${esc(label(data.name,lang))}${cost?` · ${esc(cost)}`:''}</button>`}).join('')}</section>`:'';
 return `<h2>${term(lang,'Han court','大汉朝廷')}</h2>${disasterHtml}<p class="muted">${term(lang,'Select a minister to inspect their current simulated role. Portraits are artistic reconstructions.','选择朝臣查看当前模拟职务。肖像均为艺术复原。')}</p>
 <div class="court-roster">${people.map(p=>`<button data-court-person="${esc(p.id)}" aria-pressed="${p.id===person.id}">${p.portrait?`<img src="../assets/portraits/${esc(p.portrait)}-64.jpg" alt="" width="36" height="36">`:'<span class="court-silhouette" aria-hidden="true"></span>'}<span>${esc(label(p.name,lang))}</span></button>`).join('')}</div>
 <article class="court-profile" data-person="${esc(person.id)}"><div class="court-head">${portrait}<div><h3>${esc(label(person.name,lang))}</h3><small>${esc(status)} · ${esc(office?label(office.name,lang):term(lang,'No current office','当前无官职'))}</small></div></div>
 <dl><dt>${term(lang,'Stable ID','固定编号')}</dt><dd>${esc(person.id)}</dd><dt>${term(lang,'Court group','朝廷派系')}</dt><dd>${esc(label(COURT_FACTIONS[person.courtFaction]?.name,lang)||'—')}</dd><dt>${term(lang,'Loyalty','忠诚')}</dt><dd>${esc(person.loyalty??'—')}</dd><dt>${term(lang,'Skill assessment','能力评估')}</dt><dd>${esc(observed)}</dd><dt>${term(lang,'Audit finding','稽查结论')}</dt><dd>${esc(evidence)}</dd><dt>${term(lang,'Ambition','野心')}</dt><dd>${esc(known?.ambition==='exposed'?term(lang,'Exposed by a scheme','因阴谋暴露'):term(lang,'Unknown','未知'))}</dd></dl>
 ${person.note?`<p>${esc(label(person.note,lang))}</p>`:''}<p class="muted">${term(lang,'Dates and health in this campaign are simulated; the image is not a documented likeness.','本战役中的生卒与健康属于模拟；画像并非史载容貌。')}</p>
 <h3>${term(lang,'Career in this campaign','本战役履历')}</h3>${activity.map(e=>`<p class="court-event">${esc(Math.abs(e.year))} ${term(lang,'BCE','年前')} · ${esc(label(e.text,lang).replace('%NAME%',label(person.name,lang)))}</p>`).join('')||`<p class="muted">${term(lang,'No recorded court event yet.','尚无朝廷事件记录。')}</p>`}
 ${person.alive?`<label class="court-appoint">${term(lang,'Appoint to an office','任命官职')}<select id="court-office">${options}</select></label><button id="court-appoint" class="action">${term(lang,'Make appointment','正式任命')}</button><button id="court-audit" class="action" ${s.court.audits.some(a=>a.target===person.id&&a.status==='open')||s.factions.han.treasury<15?'disabled':''}>${term(lang,'Open audit · 15 treasury','启动稽查 · 国库15')}</button>`:''}</article>`;
}

export function renderHanCourtPanel({root,state,lang=0,selected,onSelect,onAppoint,onAudit,onDisaster}){
 root.innerHTML=hanCourtHtml(state,lang,selected);
 root.querySelectorAll('[data-court-person]').forEach(button=>button.onclick=()=>onSelect(button.dataset.courtPerson));
 const person=root.querySelector('.court-profile')?.dataset.person;
 const appoint=root.querySelector('#court-appoint');if(appoint)appoint.onclick=()=>onAppoint(person,root.querySelector('#court-office').value);
 const audit=root.querySelector('#court-audit');if(audit)audit.onclick=()=>onAudit(person);
 root.querySelectorAll('[data-court-disaster]').forEach(button=>button.onclick=()=>onDisaster(button.dataset.courtDisaster,button.dataset.courtDisaster==='blame_faction'?root.querySelector('#court-blame-faction').value:null));
}
