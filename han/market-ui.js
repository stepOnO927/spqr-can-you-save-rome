import {COMMODITIES,marketPrice} from '../market-goods.js?v=faces-of-empire-1';
import {easternMarketOffers,placeEasternTrade,quoteEasternTrade} from './markets.js?v=faces-of-empire-1';
import {atWar,propose,treaty} from './frontier.js?v=han-1';
import {FACTIONS} from './data.js?v=han-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=(entry,lang)=>esc(Array.isArray(entry)?entry[lang]||entry[0]:entry);
const treatyAccess=(s,a,b)=>!!(treaty(s,'market',a,b)||treaty(s,'caravan',a,b));
const statusName=(status,lang)=>({traveling:['En route','运输中'],blocked:['Road blocked','道路受阻'],delivered:['Delivered','已送达'],stranded:['Returned after blockade','封路后退回'],lost:['Lost to raiders','遭劫损失']}[status]||[status,status])[lang];
export const marketReasonName=(reason,lang)=>({invalid:['Invalid order','订单无效'],access:['No market agreement','尚无互市协议'],unavailable:['Stock unavailable','货物不足'],route:['Road unavailable','道路不通'],treasury:['Insufficient treasury','国库不足'],price:['Price changed','价格已变']}[reason]||['Order unavailable','订单无法执行'])[lang];

export function renderEasternMarketPanel({root,state:s,lang=0,selected=null,onOrder=()=>{},onProposal=()=>{}}){
 const own=s.regions.filter(r=>r.owner===s.player),location=own.find(r=>r.id===selected)||own[0];
 const offers=easternMarketOffers(s).filter(o=>o.seller!==s.player&&treatyAccess(s,s.player,o.seller)&&!atWar(s,s.player,o.seller));
 const partners=Object.keys(s.factions).filter(id=>id!==s.player&&s.regions.some(r=>r.owner===id)&&!atWar(s,s.player,id)&&!treatyAccess(s,s.player,id)&&Object.hasOwn(s.relations,[s.player,id].sort().join(':')));
 const shipments=s.tradeMarkets.shipments.filter(x=>x.buyer===s.player||x.seller===s.player).slice(-12).reverse();
 const stocks=location?Object.entries(s.tradeMarkets.regions[location.id].goods).map(([good,item])=>`<div class="market-line"><span>${name(COMMODITIES[good]?.name||good,lang)}</span><span>${item.stock} · ${marketPrice(s.tradeMarkets.regions[location.id],good)}</span></div>`).join(''):'';
 root.innerHTML=`<h2>${lang?'关市与商队':'Markets & caravans'}</h2><p class="muted">${lang?'库存按月生产与消耗；报价以批次计，货物到站后才入库。':'Stock is produced and consumed monthly. Quotes are per batch; cargo enters storage only on arrival.'}</p>
 <h3>${lang?'己方库存':'Own stock'}${location?` · ${name(location.name,lang)}`:''}</h3><div class="market-stock">${stocks||`<p>${lang?'暂无领地。':'No owned region.'}</p>`}</div>
 <h3>${lang?'互市协定':'Market agreements'}</h3><div class="market-form">${partners.length?`<label>${lang?'已知对方':'Known court'}<select id="east-market-partner">${partners.map(id=>`<option value="${esc(id)}">${name(FACTIONS[id]?.name||id,lang)}</option>`).join('')}</select></label><button id="east-market-propose">${lang?'提议互市':'Propose market access'}</button>`:`<p class="muted">${lang?'暂无可提议的已知政体；已有协议的货源列于下方。':'No known court needs a new agreement. Existing treaty offers appear below.'}</p>`}</div>
 <h3>${lang?'购买实际货物':'Buy measured goods'}</h3><div class="market-form">${offers.length&&own.length?`<label>${lang?'卖方报价':'Seller offer'}<select id="east-market-offer">${offers.map((o,i)=>`<option value="${i}">${name(FACTIONS[o.seller]?.name||o.seller,lang)} · ${name(s.regions.find(r=>r.id===o.origin)?.name||o.origin,lang)} · ${name(COMMODITIES[o.commodity].name,lang)}${o.resale?` · ${lang?'转售':'resale'}`:''} · ${o.available} @ ${o.price}</option>`).join('')}</select></label><label>${lang?'送往己方战区':'Destination'}<select id="east-market-destination">${own.map(r=>`<option value="${esc(r.id)}" ${r.id===location?.id?'selected':''}>${name(r.name,lang)}</option>`).join('')}</select></label><label>${lang?'批数':'Batches'}<input id="east-market-quantity" type="number" min="1" max="20" value="1"></label><div id="east-market-quote" aria-live="polite"></div><button id="east-market-order">${lang?'派遣商队':'Dispatch merchant'}</button>`:`<p class="muted">${lang?'尚无可购买的协议货源。先与已知政体达成互市。':'No treaty-backed offer is available. Seek market access with a known court.'}</p>`}</div>
 <h3>${lang?'本国商队':'Your shipments'}</h3><div class="market-shipments">${shipments.map(x=>`<div class="market-shipment"><strong>${name(COMMODITIES[x.commodity]?.name||x.commodity,lang)} × ${x.quantity}</strong><span>${esc(statusName(x.status,lang))}</span><small>${name(s.regions.find(r=>r.id===x.origin)?.name||x.origin,lang)} → ${name(s.regions.find(r=>r.id===x.destination)?.name||x.destination,lang)} · ${name(s.persons[x.merchantId]?.name||x.merchantId,lang)}${['traveling','blocked'].includes(x.status)?` · ${lang?'下一段':'next leg'} ${x.remaining}`:''}</small></div>`).join('')||`<p class="muted">${lang?'尚无商队。':'No shipments yet.'}</p>`}</div>`;
 const partner=root.querySelector('#east-market-partner'),proposeButton=root.querySelector('#east-market-propose');
 if(proposeButton)proposeButton.onclick=()=>onProposal(propose(s,s.player,partner.value,'market'));
 const offerSelect=root.querySelector('#east-market-offer'),destinationSelect=root.querySelector('#east-market-destination'),quantityInput=root.querySelector('#east-market-quantity'),quoteText=root.querySelector('#east-market-quote'),orderButton=root.querySelector('#east-market-order');
 if(!offerSelect)return;
 const request=()=>{const o=offers[Number(offerSelect.value)];return {seller:o.seller,buyer:s.player,origin:o.origin,destination:destinationSelect.value,commodity:o.commodity,quantity:Number(quantityInput.value)}};
 const refresh=()=>{const q=quoteEasternTrade(s,request());orderButton.disabled=!q.ok;if(!q.ok){quoteText.textContent=marketReasonName(q.reason,lang);return}quoteText.innerHTML=`<p>${lang?'总价':'Total'} ${q.total} · ${lang?'行程':'Travel'} ${q.months} ${lang?'个月':'months'} · ${lang?'运费':'Transport'} ${q.transport} · ${lang?'过境税':'Tariffs'} ${q.tariffs.reduce((n,t)=>n+t.amount,0)}</p><details><summary>${lang?'查看路线':'Inspect route'}</summary>${q.path.map(id=>name(s.regions.find(r=>r.id===id)?.name||id,lang)).join(' → ')}</details>`};
 for(const control of [offerSelect,destinationSelect,quantityInput])control.addEventListener('change',refresh);
 orderButton.onclick=()=>onOrder(placeEasternTrade(s,request()));refresh();
}
