import {rulerPortrait,rulerTitle} from './rulers.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=(x,lang)=>Array.isArray(x)?x[lang]||x[0]:x;
export function ownRulerHtml(s,lang=0){
 const f=s.player,r=s.rulers?.[f],p=f==='han'?s.persons[s.throne?.orthodox||s.throne?.occupant]:s.persons[r?.personId||r?.id];
 if(!p)return `<p class="muted">${lang?'当前君主未详。':'Current ruler uncertain.'}</p>`;
 const title=f==='han'?(lang?'汉皇帝':'Han emperor'):label(r?.title||rulerTitle(f),lang);
 const portrait=f==='han'&&p.portrait?`../assets/portraits/${esc(p.portrait)}-128.jpg`:rulerPortrait(s,f);
 const origin=p.record==='fictional'?(lang?'本战役原创人物；姓名和肖像均为游戏创作。':'Original campaign character; name and portrait are game artwork.'):
  p.titleOnly?(lang?'史料未载此时王名；仅以王号称之。肖像为游戏创作。':'The contemporary personal name is unrecorded; the title is shown. Portrait is game artwork.'):
  (lang?'历史人物；肖像为艺术复原，生死由战役模拟。':'Historical person; portrait is an artistic reconstruction and campaign events are simulated.');
 const kin=p.father&&s.persons[p.father]?`${lang?'父':'Father'}: ${label(s.persons[p.father].name,lang)}`:p.mother&&s.persons[p.mother]?`${lang?'母':'Mother'}: ${label(s.persons[p.mother].name,lang)}`:p.politicalPredecessor&&s.persons[p.politicalPredecessor]?`${lang?'前任':'Predecessor'}: ${label(s.persons[p.politicalPredecessor].name,lang)}`:lang?'亲属未详':'Kinship unrecorded';
 return `<article class="ruler-card" data-ruler="${esc(p.id)}"><div class="ruler-card-head">${portrait?`<img src="${esc(portrait)}" alt="" width="72" height="72">`:''}<div><strong>${esc(label(p.name,lang))}</strong><small>${esc(title)}</small></div></div><p>${esc(kin)}</p><p class="muted">${esc(origin)}</p>${p.record==='fictional'?`<p>${lang?'军事判断':'Military judgment'}: ${p.military??'—'} · ${lang?'政务能力':'Governance'}: ${p.competence??'—'}</p>`:''}</article>`;
}
