import {COMMODITIES,marketPrice} from '../market-goods.js?v=faces-of-empire-1';
import {easternMarketOffers,placeEasternTrade,quoteEasternTrade,setEasternTariffPolicy,TARIFF_POLICIES} from './markets.js?v=faces-of-empire-1';
import {atWar,propose,treaty} from './frontier.js?v=han-1';
import {FACTIONS} from './data.js?v=han-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=(entry,lang)=>esc(Array.isArray(entry)?entry[lang]||entry[0]:entry);
const treatyAccess=(s,a,b)=>!!(treaty(s,'market',a,b)||treaty(s,'caravan',a,b));
const statusName=(status,lang)=>({traveling:['En route','运输中'],blocked:['Road blocked','道路受阻'],delivered:['Delivered','已送达'],stranded:['Returned after blockade','封路后退回'],lost:['Lost to raiders','遭劫损失']}[status]||[status,status])[lang];
export const marketReasonName=(reason,lang)=>({invalid:['Invalid order','订单无效'],access:['No market agreement','尚无互市协议'],unavailable:['Stock unavailable','货物不足'],route:['Road unavailable','道路不通'],treasury:['Insufficient treasury','国库不足'],price:['Price changed','价格已变']}[reason]||['Order unavailable','订单无法执行'])[lang];

export function renderEasternMarketPanel({root,state:s,lang=0,selected=null,onOrder=()=>{},onProposal=()=>{},onTariff=()=>{}}){
 const own=s.regions.filter(r=>r.owner===s.player),location=own.find(r=>r.id===selected)||own[0];
 const offers=easternMarketOffers(s).filter(o=>o.seller!==s.player&&treatyAccess(s,s.player,o.seller)&&!atWar(s,s.player,o.seller));
 const partners=Object.keys(s.factions).filter(id=>id!==s.player&&s.regions.some(r=>r.owner===id)&&!atWar(s,s.player,id)&&!treatyAccess(s,s.player,id)&&Object.hasOwn(s.relations,[s.player,id].sort().join(':')));
 const shipments=s.tradeMarkets.shipments.filter(x=>x.buyer===s.player||x.seller===s.player).slice(-12).reverse();
 const stocks=location?Object.entries(s.tradeMarkets.regions[location.id].goods).map(([good,item])=>`<div class="market-line"><span>${name(COMMODITIES[good]?.name||good,lang)}</span><span>${item.stock} · ${marketPrice(s.tradeMarkets.regions[location.id],good)}</span></div>`).join(''):'';
 const currentTariff=s.tradeMarkets.tariffs[s.player]??TARIFF_POLICIES.standard;
 const tariffPolicy=Object.keys(TARIFF_POLICIES).find(key=>TARIFF_POLICIES[key]===currentTariff);
 const transactions=s.tradeMarkets.transactions.filter(x=>x.status!=='lost'&&x.status!=='stranded'&&(x.buyer===s.player||x.seller===s.player)).slice(-5).reverse();
 const receipt=x=>{
  const shipment=s.tradeMarkets.shipments.find(y=>y.id===x.shipment),origin=x.origin||shipment?.origin,destination=x.destination||shipment?.destination;
  const place=id=>name(s.regions.find(r=>r.id===id)?.name||id||'?',lang);
  const party=id=>id==='external'?(lang?'境外商人':'Outside merchants'):name(FACTIONS[id]?.name||id||'?',lang);
  const customs=(x.tariffs||[]).reduce((sum,t)=>sum+t.amount,0),total=(x.price||0)+(x.transport||0)+customs;
  return `<p><strong>${x.month}/${x.year} · ${name(COMMODITIES[x.commodity]?.name||x.commodity,lang)} × ${x.quantity}</strong> · ${place(origin)} → ${place(destination)}<br><small>${party(x.seller)} → ${party(x.buyer)} · ${lang?'货价':'Goods'} ${x.price} · ${lang?'运费':'Transport'} ${x.transport} · ${lang?'过境税':'Tariffs'} ${customs} · ${lang?'总计':'Total'} ${total} · ${lang?'已入库':'Delivered into'} ${place(destination)}</small></p>`;
 };
 root.innerHTML=`<h2>${lang?'关市与商队':'Markets & caravans'}</h2><p class="muted">${lang?'库存按月生产与消耗；报价以批次计，货物到站后才入库。':'Stock is produced and consumed monthly. Quotes are per batch; cargo enters storage only on arrival.'}</p>
 <h3>${lang?'己方库存':'Own stock'}${location?` · ${name(location.name,lang)}`:''}</h3><div class="market-stock">${stocks||`<p>${lang?'暂无领地。':'No owned region.'}</p>`}</div>
 <h3>${lang?'过境关税':'Transit customs'}</h3><div class="market-form"><label>${lang?'本国过境税率':'Your transit duty'} <select id="east-market-tariff">${!tariffPolicy?`<option value="custom" selected disabled>${lang?'旧存档税率':'Saved rate'} ${Math.round(currentTariff*100)}%</option>`:''}${Object.entries(TARIFF_POLICIES).map(([key,rate])=>`<option value="${key}" ${key===tariffPolicy?'selected':''}>${({low:['Low','低'],standard:['Standard','标准'],high:['High','高']}[key])[lang]} · ${Math.round(rate*100)}%</option>`).join('')}</select></label><small>${lang?'新订单按当前税率报价；已出发商队沿用原报价。高关税会使途经本国的商路更昂贵。':'New orders use the current rate; caravans already en route keep their quoted cost. Higher duties make routes through your land more expensive.'}</small></div>
 <h3>${lang?'互市协定':'Market agreements'}</h3><div class="market-form">${partners.length?`<label>${lang?'已知对方':'Known court'}<select id="east-market-partner">${partners.map(id=>`<option value="${esc(id)}">${name(FACTIONS[id]?.name||id,lang)}</option>`).join('')}</select></label><button id="east-market-propose">${lang?'提议互市':'Propose market access'}</button>`:`<p class="muted">${lang?'暂无可提议的已知政体；已有协议的货源列于下方。':'No known court needs a new agreement. Existing treaty offers appear below.'}</p>`}</div>
 <h3>${lang?'购买实际货物':'Buy measured goods'}</h3><div class="market-form">${offers.length&&own.length?`<label>${lang?'卖方报价':'Seller offer'}<select id="east-market-offer">${offers.map((o,i)=>`<option value="${i}">${name(FACTIONS[o.seller]?.name||o.seller,lang)} · ${name(s.regions.find(r=>r.id===o.origin)?.name||o.origin,lang)} · ${name(COMMODITIES[o.commodity].name,lang)}${o.resale?` · ${lang?'转售':'resale'}`:''} · ${o.available} @ ${o.price}</option>`).join('')}</select></label><label>${lang?'送往己方战区':'Destination'}<select id="east-market-destination">${own.map(r=>`<option value="${esc(r.id)}" ${r.id===location?.id?'selected':''}>${name(r.name,lang)}</option>`).join('')}</select></label><label>${lang?'批数':'Batches'}<input id="east-market-quantity" type="number" min="1" max="20" value="1"></label><div id="east-market-quote" aria-live="polite"></div><button id="east-market-order">${lang?'派遣商队':'Dispatch merchant'}</button>`:`<p class="muted">${lang?'尚无可购买的协议货源。先与已知政体达成互市。':'No treaty-backed offer is available. Seek market access with a known court.'}</p>`}</div>
 <h3>${lang?'本国商队':'Your shipments'}</h3><div class="market-shipments">${shipments.map(x=>`<div class="market-shipment"><strong>${name(COMMODITIES[x.commodity]?.name||x.commodity,lang)} × ${x.quantity}</strong><span>${esc(statusName(x.status,lang))}</span><small>${name(s.regions.find(r=>r.id===x.origin)?.name||x.origin,lang)} → ${name(s.regions.find(r=>r.id===x.destination)?.name||x.destination,lang)} · ${name(s.persons[x.merchantId]?.name||x.merchantId,lang)}${['traveling','blocked'].includes(x.status)?` · ${lang?'下一段':'next leg'} ${x.remaining}`:''}</small></div>`).join('')||`<p class="muted">${lang?'尚无商队。':'No shipments yet.'}</p>`}</div>`;
 root.insertAdjacentHTML('beforeend',`<h3>${lang?'最近成交':'Recent deliveries'}</h3><div class="market-receipts">${transactions.length?transactions.map(receipt).join(''):`<p class="muted">${lang?'尚无成交。':'No deliveries yet.'}</p>`}</div>`);
 root.querySelector('#east-market-tariff').onchange=event=>onTariff(setEasternTariffPolicy(s,s.player,event.target.value));
 const partner=root.querySelector('#east-market-partner'),proposeButton=root.querySelector('#east-market-propose');
 if(proposeButton)proposeButton.onclick=()=>onProposal(propose(s,s.player,partner.value,'market'));
 const offerSelect=root.querySelector('#east-market-offer'),destinationSelect=root.querySelector('#east-market-destination'),quantityInput=root.querySelector('#east-market-quantity'),quoteText=root.querySelector('#east-market-quote'),orderButton=root.querySelector('#east-market-order');
 if(!offerSelect)return;
 const request=()=>{const o=offers[Number(offerSelect.value)];return {seller:o.seller,buyer:s.player,origin:o.origin,destination:destinationSelect.value,commodity:o.commodity,quantity:Number(quantityInput.value)}};
 const refresh=()=>{const q=quoteEasternTrade(s,request());orderButton.disabled=!q.ok;if(!q.ok){quoteText.textContent=marketReasonName(q.reason,lang);return}quoteText.innerHTML=`<p>${lang?'总价':'Total'} ${q.total} · ${lang?'行程':'Travel'} ${q.months} ${lang?'个月':'months'} · ${lang?'运费':'Transport'} ${q.transport} · ${lang?'过境税':'Tariffs'} ${q.tariffs.reduce((n,t)=>n+t.amount,0)}</p><details><summary>${lang?'查看路线':'Inspect route'}</summary>${q.path.map(id=>name(s.regions.find(r=>r.id===id)?.name||id,lang)).join(' → ')}</details>`};
 for(const control of [offerSelect,destinationSelect,quantityInput])control.addEventListener('change',refresh);
 orderButton.onclick=()=>onOrder(placeEasternTrade(s,request()));refresh();
}
