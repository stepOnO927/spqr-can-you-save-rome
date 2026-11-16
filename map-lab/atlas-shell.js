// IMPERIUM VISUAL — Campaign Atlas shell.
//
// Presentation only. This module decides *where* existing interface pieces live and how a
// character's already-rendered record is arranged. It never reads campaign state: every fact
// in a dossier is a node that character-ui.js produced under its own visibility rules, moved
// (or, for the timeline, copied as text) into a designed layout. Nothing here can reveal a
// value the old side panel did not already print.
import {campaignDate} from '../campaign-date.js?v=calendar-1';
import {FACTIONS} from '../data.js?v=phase-x-1';
import {factionMark} from '../identity.js?v=phase-x-1';

const RAIL=['factions','campaign-government','campaign-focus','campaign-legions','campaign-plans','inventions','chronicle','atlas-mail'];
const courts=new Map();
const homes=new Map();
let options={language:()=>'en',openCourt(){},openFamily(){},onClose(){}};
let rail=null,bar=null,ready=false,dossierTab='overview';

export function rememberCourt(id,faction){if(id&&faction)courts.set(id,faction)}
export function courtOf(id){return courts.get(id)||null}

// compact: territory, city, army, battle (a small inspector beside the map)
// diplomacy: a court file (wide workspace docked right, map stays visible)
// dossier: one person (full workspace)
let settled='compact',pendingKind=null;
export function setWorkspace(kind,meta={}){
 if(typeof document==='undefined'||!document.body)return;
 const body=document.body;
 body.dataset.workspace=kind;
 body.dataset.workspaceOwn=meta.own?'1':'0';
 // A refresh re-inspects (compact) and then re-lays the same workspace in one task. Only the
 // kind that is still set once that task ends counts as a change, so a monthly refresh never
 // replays the entrance or throws away the reader's scroll position.
 if(pendingKind===null)queueMicrotask(()=>{const final=pendingKind;pendingKind=null;if(final===settled)return;settled=final;const panel=document.querySelector('.selection');if(!panel)return;panel.classList.remove('ws-enter');if(final!=='compact'){void panel.offsetWidth;panel.classList.add('ws-enter')}panel.scrollTop=0});
 pendingKind=kind;
}

function home(el){if(el&&!homes.has(el))homes.set(el,{parent:el.parentNode,next:el.nextSibling})}
function goHome(el){const h=homes.get(el);if(!el||!h||!h.parent)return;if(h.next&&h.next.parentNode===h.parent)h.parent.insertBefore(el,h.next);else h.parent.append(el)}

export function initAtlasShell(next={}){
 if(typeof document==='undefined'||ready)return;
 options={...options,...next};ready=true;
 rail=document.createElement('nav');rail.className='atlas-rail';rail.setAttribute('aria-label','Campaign');
 bar=document.createElement('div');bar.className='atlas-commandbar';
 const selection=document.querySelector('.selection');
 document.body.append(rail,bar);
 if(selection){
  const close=document.createElement('button');close.type='button';close.id='workspace-close';close.className='workspace-close';close.textContent='×';close.setAttribute('aria-label','Close');close.onclick=()=>options.onClose();selection.prepend(close);
  const shade=document.createElement('div');shade.className='workspace-shade';shade.onclick=()=>options.onClose();selection.before(shade);
 }
 for(const id of ['campaign-government','campaign-focus','campaign-legions','campaign-plans'])home(document.getElementById(id));
 home(document.querySelector('.time-controls'));
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented)return;
  const kind=document.body.dataset.workspace;if(kind!=='diplomacy'&&kind!=='dossier')return;
  if(document.querySelector('dialog[open]')||/^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName||''))return;
  options.onClose();
 });
}

// The narrow (≤700px) layout keeps the atlas's existing compact menu; the rail and command
// bar are a desktop and tablet arrangement. Called after lab.js has placed its own buttons.
export function syncAtlasShell(compact){
 if(!ready)return;
 document.body.classList.toggle('atlas-shell',!compact);
 const controls=document.querySelector('.time-controls');
 if(compact){
  for(const id of ['campaign-government','campaign-focus','campaign-legions','campaign-plans'])goHome(document.getElementById(id));
  goHome(controls);
  return;
 }
 for(const id of RAIL){const el=document.getElementById(id);if(el)rail.append(el)}
 if(controls)bar.append(controls);
}

// ---------- Dossier ----------
const TABS=[
 ['overview','Overview','概览'],
 ['career','Career','履历'],
 ['family','Family','家族'],
 ['power','Offices & power','官职与权力'],
 ['relations','Relations','政治关系'],
 ['intel','Intelligence','情报'],
 ['actions','Actions','行动'],
 ['history','Historical record','史料']
];
const KIND={health:['Health report','健康报告'],age:['Age estimate','年龄估计'],location:['Location report','所在地报告'],stance:['Public statement','公开表态'],commands:['Reported command','指挥目击'],meetings:['Personal meeting','亲自会面']};
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node};

function splitGroups(box){
 // A help-list is a run of <strong data-dossier> headings, each followed by its paragraphs.
 const groups={};let current=null;
 for(const node of [...box.childNodes]){
  if(node.nodeType===1&&node.matches('strong[data-dossier]')){current=el('section','dossier-group');current.dataset.group=node.dataset.dossier;groups[node.dataset.dossier]=current;current.append(node);continue}
  if(node.nodeType===1&&node.matches('details.historical-entry')){groups.history=node;current=null;continue}
  if(current)current.append(node);
 }
 return groups;
}

function timeline(panel,groups,zh){
 const rows=[];
 for(const [name,group] of Object.entries(groups)){
  if(!KIND[name])continue;
  for(const p of group.querySelectorAll('p[data-when]')){
   const when=Number(p.dataset.when);if(!Number.isFinite(when))continue;
   const copy=p.cloneNode(true);copy.querySelectorAll('button').forEach(b=>b.remove());
   rows.push({when,kind:name,text:copy.textContent.trim()});
  }
 }
 rows.sort((a,b)=>a.when-b.when);
 const list=el('ol','dossier-timeline');
 const anchor=(key,label)=>{const p=panel.querySelector(`[data-hist="${key}"]`);if(!p)return;const li=el('li','is-reference');li.append(el('time',null,label),el('p',null,p.textContent.replace(/^[^:：]*[:：]\s*/,'')));list.append(li)};
 anchor('birth',zh?'出生（史料）':'Born (reference)');
 for(const row of rows){
  const year=Math.floor((row.when-1)/12),month=row.when-year*12,li=el('li');li.dataset.kind=row.kind;
  li.append(el('time',null,campaignDate(month,year,zh?'zh':'en')),el('span','dossier-kind',KIND[row.kind][zh?1:0]),el('p',null,row.text));list.append(li);
 }
 anchor('death',zh?'卒年（史料，非模拟结果）':'Died (historical reference, not this campaign)');
 return {list,dated:rows.length};
}

export function layoutDossier(panel,meta={}){
 if(typeof document==='undefined'||!panel)return;
 const card=panel.querySelector(':scope>.character-card');if(!card)return;
 const zh=meta.language==='zh',L=(en,cn)=>zh?cn:en;
 setWorkspace('dossier',{own:!!meta.friendly});

 const grid=panel.querySelector(':scope>.detail-grid'),note=panel.querySelector(':scope>p.battle-note'),source=panel.querySelector(':scope>a');
 const boxes=[...panel.querySelectorAll(':scope>.help-list')],travel=[...panel.querySelectorAll(':scope>.mission-box')].find(b=>b.dossierRole==='travel')||null;
 const relations=boxes.find(b=>b.dossierRole==='relations')||null;
 let groups={};for(const box of boxes)if(box!==relations)Object.assign(groups,splitGroups(box));

 // Portrait: the card stays the card (same node, same click behaviour); only its image is
 // upgraded to the full-size file when one exists.
 const img=card.querySelector('img');
 if(img&&/-128\.jpg$/.test(img.getAttribute('src')||'')){const small=img.getAttribute('src'),base=small.replace(/-128\.jpg$/,'');const tries=[base+'.jpg',base+'-master.jpg',small];let i=0;img.onerror=()=>{i+=1;if(i<tries.length)img.src=tries[i];else img.onerror=null};img.src=tries[0]}

 const name=card.querySelector('strong')?.textContent||'',role=card.querySelector('small')?.textContent||'';
 const court=meta.friendly?meta.player:courtOf(meta.id),faction=court&&FACTIONS[court];
 const article=el('article','dossier');article.dataset.own=meta.friendly?'1':'0';

 const side=el('aside','dossier-side');
 const frame=el('div','dossier-portrait');frame.append(card);side.append(frame);
 if(grid){grid.classList.add('dossier-vitals');side.append(grid)}
 if(note)side.append(note);

 const main=el('div','dossier-main');
 const head=el('header','dossier-head');
 const title=el('div','dossier-title');
 title.append(el('small','dossier-status',meta.reported?L('Reported identity','报告身份'):meta.friendly?L('Your faction','本方人物'):L('Foreign person · known only through reports','外国人物 · 仅凭报告了解')));
 title.append(el('h3',null,name));
 title.append(el('p','dossier-role',role.trim()));
 head.append(title);
 if(faction){
  const banner=el('button','dossier-court');banner.type='button';banner.innerHTML=factionMark(court,'banner');
  const text=el('span');text.append(el('small',null,meta.friendly?L('Serves','效力于'):L('On file under (as reported)','档案归属（据报告）')),el('strong',null,faction.short?.[zh?1:0]||faction.name?.[zh?1:0]||''));banner.append(text);
  banner.onclick=()=>options.openCourt(court,'diplomacy');head.append(banner);
 }
 main.append(head);

 const sections={};const add=(key,...nodes)=>{const real=nodes.filter(Boolean);if(!real.length)return;(sections[key]=sections[key]||el('section','dossier-section')).append(...real)};
 const heading=text=>el('h4',null,text);

 // Overview: who this is, in one paragraph, plus what the faction itself records.
 const bio=panel.querySelector('[data-hist="bio"]'),culture=panel.querySelector('[data-hist="culture"]');
 if(bio)add('overview',el('p','dossier-lede',bio.textContent));
 if(culture)add('overview',el('p','dossier-culture',culture.textContent));
 if(!bio&&!culture)add('overview',el('p','dossier-lede',meta.friendly?L('A member of your faction created for this campaign. There is no historical entry.','本方的模拟人物，没有对应的历史条目。'):L('Nothing is recorded about this person beyond the reports your faction holds.','除本方持有的报告外，没有关于此人的其他记录。')));

 // Career
 const line=timeline(panel,groups,zh);
 add('career',heading(L('Dated record','按日期排列的记录')),line.list);
 if(!line.dated)add('career',el('p','dossier-empty',meta.friendly?L('Your own people do not generate intelligence reports; their service is listed under Offices & power.','本方人物不产生情报报告；其任职见“官职与权力”。'):L('No dated reports about this person have reached you yet.','尚未收到关于此人的带日期报告。')));
 add('career',el('p','dossier-caveat',L('Reference dates come from the historical catalogue. Dated entries are reports as they reached you and may be wrong or out of date.','史料日期来自历史目录；带日期的条目是送达本方的报告，可能有误或已过时。')));

 // Family
 const family=panel.querySelector('[data-hist="family"]');
 if(family){const list=el('ul','dossier-kin');for(const part of family.innerHTML.replace(/^[^:：]*[:：]\s*/,'').split(/;\s*/)){const li=el('li');li.innerHTML=part;list.append(li)}add('family',heading(L('Historical family','历史家族关系')),list,el('p','dossier-caveat',L('Family ties are historical reference. They say nothing about trust, office or succession in this campaign.','家族关系是历史资料，不代表本局中的信任、职权或继承。')))}
 if(meta.friendly){const open=el('button','dossier-action',L('Open family tree and succession','打开家谱与继承'));open.type='button';open.onclick=()=>options.openFamily();add('family',heading(L('Household and succession','家族与继承')),el('p',null,L('Marriages, heirs and succession plans are managed in Government & Families.','婚姻、继承人与继任安排在“政府与家族”中管理。')),open)}

 // Offices and power
 if(groups.service)add('power',heading(L('Service in this campaign','本局任职')),groups.service);
 if(groups.commands)add('power',groups.commands);

 // Relations
 if(relations)add('relations',heading(L('Personal trust','个人信任')),relations);
 if(groups.meetings)add('relations',groups.meetings);

 // Intelligence
 for(const key of ['health','age','location','stance'])if(groups[key])add('intel',groups[key]);
 if(sections.intel)sections.intel.prepend(el('p','dossier-caveat',L('Each line names its source, date and confidence. Outdated or disputed reports are kept, not hidden.','每条都注明来源、日期与可信度；过时或有争议的报告会保留，不会隐藏。')));

 // Actions
 if(travel)add('actions',heading(L('Travel','出行')),travel);
 if(faction&&!meta.friendly){
  const audience=el('button','dossier-action',L('Request an audience or send an envoy','请求会面或派遣使者'));audience.type='button';audience.onclick=()=>options.openCourt(court,'intelligence');
  const letters=el('button','dossier-action',L('Open diplomacy with this court','打开与该宫廷的外交'));letters.type='button';letters.onclick=()=>options.openCourt(court,'diplomacy');
  add('actions',heading(L('Diplomacy and contact','外交与接触')),el('p',null,L('Audiences, envoys and investigations are addressed to the court this person is reported under.','会面、使者与调查均通过此人据报所属的宫廷办理。')),audience,letters);
 }
 if(meta.friendly){
  const appoint=el('button','dossier-action',L('Appointments and offices','任命与官职'));appoint.type='button';appoint.onclick=()=>options.openCourt(meta.player,'diplomacy');
  add('actions',heading(L('Appointment','任命')),el('p',null,L('Deputies, administrators and succession are assigned from your own court file.','代行人、行政官与继任安排在本方宫廷档案中指定。')),appoint);
 }

 // Historical record: the encyclopaedia entry, kept whole and clearly separate.
 if(groups.history){groups.history.open=true;add('history',groups.history)}
 if(source)add('history',source);

 // At a glance: one tile per part of the record that has something in it, so the first screen
 // is a summary of the person rather than a single sentence.
 const glance=el('div','dossier-glance');
 for(const [key,en,cn] of TABS){
  if(key==='overview'||key==='history'||!sections[key])continue;
  const first=[...sections[key].querySelectorAll('.dossier-timeline li p, .dossier-kin li, .dossier-group p, .help-list p, .mission-box p, p')].find(node=>!node.classList.contains('dossier-caveat')&&node.textContent.trim());
  const text=(first?.textContent||'').replace(/\s+/g,' ').trim(),count=sections[key].querySelectorAll('p[data-when], .dossier-kin li, .dossier-timeline li:not(.is-reference)').length;
  const tile=el('button','dossier-tile');tile.type='button';tile.dataset.goto=key;
  tile.append(el('small',null,L(en,cn)+(count?' · '+count:'')),el('span',null,text.length>120?text.slice(0,118)+'…':text||L('Open','查看')));
  glance.append(tile);
 }
 if(glance.children.length)add('overview',heading(L('At a glance','概要')),glance);
 const nav=el('nav','dossier-tabs');nav.setAttribute('role','tablist');
 const present=TABS.filter(([key])=>sections[key]);
 if(!present.some(([key])=>key===dossierTab))dossierTab=present[0]?.[0]||'overview';
 const body=el('div','dossier-body');
 const select=key=>{dossierTab=key;for(const b of nav.children){const on=b.dataset.tab===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')}for(const [k,node] of Object.entries(sections))node.hidden=k!==key;body.scrollTop=0};
 for(const [key,en,cn] of present){const b=el('button',null,L(en,cn));b.type='button';b.dataset.tab=key;b.setAttribute('role','tab');b.onclick=()=>select(key);nav.append(b);sections[key].dataset.section=key;body.append(sections[key])}
 main.append(nav,body);
 glance.querySelectorAll('[data-goto]').forEach(tile=>tile.onclick=()=>select(tile.dataset.goto));
 article.append(side,main);
 // Anything not recognised stays, in its original order, under the record. Nothing is dropped.
 const rest=[...panel.childNodes];
 panel.replaceChildren(article);
 const leftovers=rest.filter(node=>node.nodeType===1&&!article.contains(node)&&node.childNodes.length);
 if(leftovers.length){const extra=el('section','dossier-section dossier-extra');extra.append(...leftovers);body.append(extra)}
 select(dossierTab);
}
