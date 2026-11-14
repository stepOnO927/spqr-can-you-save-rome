// The East as Rome knows it: a map coloured from the latest merchant report
// and a panel of dispatches. Nothing here reads the live Han simulation.
import {REGIONS,FACTIONS,ZHOU,THEATERS} from './data.js?v=han-1';
import {drawMap,CAMERAS,MODES} from './map.js?v=succession-ui-recovery-1';
import {romanView,EMBASSY_COST,EMBASSY_MONTHS} from './world.js?v=multipolar-autoplay-1';

const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const colors=Object.fromEntries(Object.entries(FACTIONS).map(([k,v])=>[k,v.color]));colors.rebels='#3c3c3c';colors.rival_court='#d07a3a';
const L=(v,lang)=>Array.isArray(v)?v[lang]:v;
const date=(d,lang)=>d?(lang?`公元前${Math.abs(d.year)}年${d.month}月`:`${d.month}/${Math.abs(d.year)} BCE`):'—';
const facName=(id,lang)=>FACTIONS[id]?L(FACTIONS[id].name,lang):id==='rebels'?(lang?'起事民众':'rebels'):id==='rival_court'?(lang?'宗室敌朝':'rival princely court'):(lang?'未知':'unknown');

export function eastMap(s,{lang=0,selected=null,camera='all',mode='political'}={}){
 const v=romanView(s);if(!v)return '';
 const owners=v.snapshot?.owners||{};
 const view={regions:REGIONS.map(r=>({...r,owner:owners[r.id]??null})),armies:[],silk:{}};
 const svg=drawMap(view,{lang,selected,colors,camera,mode});
 return svg.replace(/data-region=/g,'data-east-region=');
}
export function eastToolbar(lang,{camera,mode}){
 return `<div class="east-tools">${Object.entries(MODES).map(([id,n])=>`<button class="map-mode ${mode===id?'active':''}" data-east-mode="${id}">${esc(L(n,lang))}</button>`).join('')}<span class="east-sep"></span>${Object.entries(CAMERAS).map(([id,c])=>`<button class="map-mode ${camera===id?'active':''}" data-east-camera="${id}">${esc(L(c.name,lang))}</button>`).join('')}</div>`;
}
export function eastPanel(s,{lang=0,selected=null}={}){
 const v=romanView(s);
 if(!v)return `<div class="panel-heading"><span class="eyebrow">SERES</span><h2>${lang?'东方':'The East'}</h2></div><p class="hint">${lang?'本战役未启用文明扩展“天命”。':'The Mandate of Heaven expansion is not enabled for this campaign.'}</p>`;
 const sn=v.snapshot,r=selected&&REGIONS.find(x=>x.id===selected);
 const c=v.conditions;
 return `<div class="panel-heading"><span class="eyebrow">SERES · 赛里斯</span><h2>${lang?'东方传闻':'Reports from the East'}</h2></div>
 <p class="hint">${lang?'罗马对赛里斯（汉朝）一无直接接触。下列消息都由安息与康居商人辗转带来，抵达时已过去数年，可能有误。':'Rome has no direct contact with the Seres (the Han). Everything below came through Parthian and Kangju merchants; it is years old when it arrives and may be wrong.'}</p>
 <p class="hint"><a href="./han/" target="_blank" rel="noopener">${lang?'另开丝路诸国独立战役（单独存档）':'Play an independent Silk Road campaign (separate save)'}</a></p>
 <div class="rule-block"><h3>${lang?'最新的东方概况':'Latest account of the East'}</h3>
 <p>${lang?'所述时间':'Describes'}: <b>${date(sn,lang)}</b> · ${sn?.via==='old'?(lang?'早年流传的商旅旧闻':'an old merchants’ account'):(lang?`商队带回，收到于${date(sn?.received,lang)}`:`brought by caravans, received ${date(sn?.received,lang)}`)}</p>
 <p>${lang?'据称在位者':'Reported ruler'}: <b>${esc(L(sn?.emperorName||['unknown','不明'],lang))}</b> · ${lang?'王朝':'dynasty'} ${esc(L(sn?.dynasty||['?','?'],lang))}${sn&&!sn.dynastyOrthodox?(lang?'（据说是篡位新朝）':' (said to be a usurping dynasty)'):''}</p></div>
 ${r?`<div class="rule-block"><h3>${esc(L(r.name,lang))}</h3><p>${lang?'州部':'Circuit'}: ${esc(L(ZHOU[r.zhou].name,lang))} · ${lang?'战区':'Theatre'}: ${esc(L(THEATERS[r.theater].name,lang))}</p><p>${lang?'据报控制者':'Reported holder'}: ${esc(facName(sn?.owners?.[r.id],lang))} (${date(sn,lang)})</p></div>`:''}
 <h3 class="section-title">${lang?'商旅传闻':'Merchant dispatches'}</h3>
 ${v.dispatches.length?`<ol class="east-dispatches">${v.dispatches.slice(0,25).map(d=>`<li><small>${lang?'事在':'events of'} ${date(d.origin,lang)} · ${lang?'收到':'received'} ${date(d.received,lang)}</small>${esc(lang?d.zh:d.en)}</li>`).join('')}</ol>`:`<p class="hint">${lang?'尚无新的消息传到地中海。从东方到叙利亚的商路要走两年以上。':'No fresh news has reached the Mediterranean yet. The road from the East to Syria takes more than two years.'}</p>`}
 <p>${lang?'经安息运抵的丝绸货批':'Silk cargoes arrived through Parthia'}: ${v.silkCargoes}</p>
 ${v.imports?.length?`<div class="rule-block"><h3>${lang?'本方港口购入':'Purchases at your ports'}</h3>${v.imports.map(x=>`<p>${date(x,lang)} · ${esc(s.regions.find(r=>r.id===x.port)?.name?.[lang]||x.port)} · ${lang?'丝绸':'silk'} × ${x.quantity} · ${lang?'支付':'paid'} ${x.price} ${lang?'国库':'treasury'}</p>`).join('')}</div>`:''}
 <div class="rule-block"><h3>${lang?'遣使赛里斯（架空历史）':'An embassy to the Seres (alternate history)'}</h3>
 ${v.embassy?`<p>${{travelling:lang?'使者在途':'Envoys on the road',arrived:lang?'使者应已抵达，回报尚在路上':'The envoys should have arrived; their report is still on the road',returned:lang?'使者回报已到':'The envoys’ report has arrived'}[v.embassy.status]} · ${lang?'出发于':'sent'} ${date(v.embassy.sent,lang)}</p>`:`<p class="hint">${lang?`需要：已收到东方传闻、安息允许通行、国库至少${EMBASSY_COST}。单程约${EMBASSY_MONTHS}个月。`:`Requires news already flowing, passage through Parthia and ${EMBASSY_COST} treasury. About ${EMBASSY_MONTHS} months each way.`} ${[['reports',lang?'传闻':'news'],['parthia',lang?'安息通行':'Parthia'],['treasury',lang?'国库':'treasury']].map(([k,n])=>`${n} ${c[k]?'✓':'✗'}`).join(' · ')}</p><button class="action" id="east-embassy" ${c.ok?'':'disabled'}>${lang?`遣使 · ${EMBASSY_COST}¤`:`Send envoys · ${EMBASSY_COST}¤`}</button>`}</div>`;
}
