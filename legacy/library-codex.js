import {MATERIALS,IDEAS,IDEA_CATEGORIES,BUILDINGS} from '../development.js?v=72';
import {CHARACTER_CATALOG} from '../characters.js';
import {techIllustration} from '../tech-art.js?v=22';

const all=[...MATERIALS,...IDEAS];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const name=(pair,zh)=>pair?.[zh?1:0]||'';
const label=(zh,en,cn)=>zh?cn:en;
const scholarIds=['varro','cicero','mamurra'];

export function libraryCodexHtml(lang,branch='material',selectedId='roadmaking'){
 const zh=lang==='zh',entries=branch==='idea'?IDEAS:MATERIALS,selected=entries.find(item=>item.id===selectedId)||entries[0];
 const category=selected.category?IDEA_CATEGORIES.find(item=>item.id===selected.category)?.name:undefined;
 const building=BUILDINGS.find(item=>item.id===selected.building);
 const prerequisites=(selected.prerequisites||[]).map(id=>all.find(item=>item.id===id)).filter(Boolean);
 const source=selected.source?.url?.startsWith('https://')?selected.source:null;
 return `<div class="panel-head"><span>BIBLIOTHECA · ACADEMIA</span><h2>${label(zh,'Library & Academy','图书馆与学院')}</h2><p>${label(zh,`Explore ${all.length} illustrated research records, their historical evidence, and the scholars behind the age. These entries explain the campaign tree; they do not grant campaign knowledge.`,`浏览${all.length}项带图的研究记录、史料依据与这一时代的学者。馆藏解释战役科技树，不会授予战役知识。`)}</p></div>
 <div class="library-tabs" role="tablist" aria-label="${label(zh,'Research branches','研究分支')}"><button type="button" role="tab" aria-selected="${branch==='material'}" data-library-branch="material">${label(zh,'Material inventions','物质发明')} · ${MATERIALS.length}</button><button type="button" role="tab" aria-selected="${branch==='idea'}" data-library-branch="idea">${label(zh,'Institutions & ideas','制度与理念')} · ${IDEAS.length}</button></div>
 <div class="library-layout"><aside class="library-index"><label for="library-search">${label(zh,'Search the codex','搜索馆藏')}</label><input id="library-search" type="search" placeholder="${label(zh,'Name or historical context','名称或历史背景')}" autocomplete="off"><small id="library-count" aria-live="polite">${entries.length} ${label(zh,'records','项记录')}</small><div class="library-index-list">${entries.map(item=>`<button type="button" data-library-entry="${esc(item.id)}" data-search="${esc([item.name[0],item.name[1],item.context[0],item.context[1]].join(' ').toLocaleLowerCase())}" class="${item.id===selected.id?'selected':''}"><span>${techIllustration(item)}</span><b>${esc(name(item.name,zh))}</b><small>${esc(name(item.name,!zh))}</small></button>`).join('')}</div><p id="library-empty" hidden>${label(zh,'No matching records.','没有匹配的记录。')}</p></aside>
 <article class="library-detail" id="library-detail"><div class="library-hero">${techIllustration(selected)}<div><small>${esc(category?name(category,zh):label(zh,'Material invention','物质发明'))}</small><h3>${esc(name(selected.name,zh))}</h3><p>${esc(name(selected.name,!zh))}</p></div></div><h4>${label(zh,'Historical record','史料记载')}</h4><p>${esc(name(selected.context,zh))}</p>${prerequisites.length?`<p class="library-related"><b>${label(zh,'Related earlier work','相关先期研究')}:</b> ${prerequisites.map(item=>`<button type="button" data-library-related="${esc(item.id)}">${esc(name(item.name,zh))}</button>`).join('')}</p>`:''}${building?`<p class="library-related"><b>${label(zh,'Campaign building','战役建筑')}:</b> ${esc(name(building.name,zh))}</p>`:''}<p class="library-boundary">${label(zh,'The illustration and research timing are game interpretations. Check the cited source for historical evidence.','插画和研究所需时间属于游戏诠释。历史依据请查阅所引史料。')}</p>${source?`<a class="library-source" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${label(zh,'Read historical source','阅读历史来源')} ↗ <span>${esc(source.title)}</span></a>`:''}</article></div>
 <section class="library-scholars"><h3>${label(zh,'Scholars and specialists','学者与技术专家')}</h3><p>${label(zh,'Historical people in the campaign. Their assignments and bonuses are game interpretations.','战役中出现的历史人物。其任职与加成属于游戏诠释。')}</p><div>${scholarIds.map(id=>{const person=CHARACTER_CATALOG[id];return `<article><h4>${esc(name(person.name,zh))}</h4><p>${esc(name(person.role,zh))}</p><a href="${esc(person.source)}" target="_blank" rel="noopener noreferrer">${label(zh,'Biographical source','人物资料')} ↗</a></article>`}).join('')}</div></section>`;
}

export function bindLibraryCodex(root,{onBranch,onSelect}){
 root.querySelectorAll('[data-library-branch]').forEach(button=>button.addEventListener('click',()=>onBranch(button.dataset.libraryBranch)));
 root.querySelectorAll('[data-library-entry],[data-library-related]').forEach(button=>button.addEventListener('click',()=>onSelect(button.dataset.libraryEntry||button.dataset.libraryRelated)));
 const input=root.querySelector('#library-search'),cards=[...root.querySelectorAll('[data-library-entry]')],count=root.querySelector('#library-count'),empty=root.querySelector('#library-empty');
 input?.addEventListener('input',()=>{const query=input.value.trim().toLocaleLowerCase();let shown=0;for(const card of cards){card.hidden=!card.dataset.search.includes(query);if(!card.hidden)shown++}count.textContent=`${shown} / ${cards.length}`;empty.hidden=shown>0});
}
