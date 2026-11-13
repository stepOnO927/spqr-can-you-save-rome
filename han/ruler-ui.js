import {rulerPortrait,rulerTitle,rulerGovernanceFactor,foreignRegent,regentPortrait} from './rulers.js';
import {courtPortraitSrc} from './court-portrait.js';
import {statusOf,STATUS_NAMES} from './dynasty.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=(x,lang)=>Array.isArray(x)?x[lang]||x[0]:x;
export function ownRulerHtml(s,lang=0){
 const f=s.player,r=s.rulers?.[f],p=f==='han'?s.persons[s.throne?.orthodox||s.throne?.occupant]:s.persons[r?.personId||r?.id];
 if(!p)return `<p class="muted">${lang?'当前君主未详。':'Current ruler uncertain.'}</p>`;
 const title=f==='han'?(s.throne?.orthodox===p.id?(lang?'汉皇帝':'Han emperor'):label(STATUS_NAMES[statusOf(s,p.id)]||['Ruler of another dynasty','别朝统治者'],lang)):label(r?.title||rulerTitle(f),lang);
 const portrait=f==='han'?courtPortraitSrc(p):rulerPortrait(s,f);
 const origin=['fictional','simulated'].includes(p.record)?(lang?'本战役原创人物；姓名和肖像均为游戏创作。':'Original campaign character; name and portrait are game artwork.'):
  p.titleOnly?(lang?'史料未载此时王名；仅以王号称之。肖像为游戏创作。':'The contemporary personal name is unrecorded; the title is shown. Portrait is game artwork.'):
  (lang?'历史人物；肖像为艺术复原，生死由战役模拟。':'Historical person; portrait is an artistic reconstruction and campaign events are simulated.');
 const kin=p.father&&s.persons[p.father]?`${lang?'父':'Father'}: ${label(s.persons[p.father].name,lang)}`:p.mother&&s.persons[p.mother]?`${lang?'母':'Mother'}: ${label(s.persons[p.mother].name,lang)}`:p.politicalPredecessor&&s.persons[p.politicalPredecessor]?`${lang?'前任':'Predecessor'}: ${label(s.persons[p.politicalPredecessor].name,lang)}`:lang?'亲属未详':'Kinship unrecorded';
 const regent=f==='han'?null:foreignRegent(s,f),regentImage=regent&&regentPortrait(s,f),governor=regent||p;
 const regency=regent?`<div class="ruler-card-head" data-regent="${esc(regent.id)}">${regentImage?`<img src="${esc(regentImage)}" alt="" width="48" height="48">`:''}<div><strong>${esc(label(regent.name,lang))}</strong><small>${lang?'宫廷摄政；君主成年前行使政务与军务权力。原创人物与肖像为游戏创作。':'Court regent; exercises civil and military authority until the ruler comes of age. Original person and portrait are game artwork.'}</small></div></div>`:'';
 return `<article class="ruler-card" data-ruler="${esc(p.id)}"><div class="ruler-card-head">${portrait?`<img src="${esc(portrait)}" alt="" width="72" height="72">`:''}<div><strong>${esc(label(p.name,lang))}</strong><small>${esc(title)}</small></div></div><p>${esc(kin)}</p><p class="muted">${esc(origin)}</p>${regency}${f==='han'?'':`<p>${lang?'税务治理效果（模拟）':'Tax administration (simulated)'}: ×${rulerGovernanceFactor(s,f).toFixed(2)}</p>`}${governor.record==='fictional'?`<p>${lang?'军事判断':'Military judgment'}: ${governor.military??'—'} · ${lang?'政务能力':'Governance'}: ${governor.competence??'—'}</p>`:''}</article>`;
}
