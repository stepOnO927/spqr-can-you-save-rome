import {COMMODITIES,initializeMarkets,quoteTrade,placeTradeOrder,tradeRouteName} from '../trade-markets.js?v=faces-empire-2';
import {activeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {REGIONS} from '../data.js?v=phase-x-1';

const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const name=(value,zh)=>value?.[zh?1:0]||'';
const reasons={invalid:['Choose a valid route, good and quantity.','请选择有效的路线、货物和数量。'],access:['Trade access is unavailable.','没有贸易通行权。'],unavailable:['The seller cannot fill this order.','卖方目前无法供货。'],route:['No permitted route is open.','目前没有可通行的商路。'],treasury:['Treasury cannot cover the full cost.','国库不足以支付全部费用。'],price:['The price has changed; review the new quote.','价格已变化，请重新核对报价。']};

export function renderMarketPanel({root,state,language,selection,onOrder,onPerson,knownOwner}){
 const zh=language==='zh',markets=initializeMarkets(state),player=state.player,owned=state.regions.filter(r=>r.owner===player);
 // Keep an initial treaty market listing even if a later conquest is unseen.
 const reportedSeller=r=>{if(r.owner===player)return player;const reported=knownOwner(r.id);return reported&&reported!=='shared'?reported:REGIONS.find(x=>x.id===r.id)?.owner};
 const suppliers=state.regions.filter(r=>r.owner===player||!!activeAgreement(state,player,reportedSeller(r),'trade'));
 const goods=Object.keys(COMMODITIES);
 if(!owned.some(r=>r.id===selection.destination))selection.destination=owned[0]?.id||'';
 if(!suppliers.some(r=>r.id===selection.origin))selection.origin=suppliers.find(r=>r.id!==selection.destination)?.id||'';
 if(!goods.includes(selection.commodity))selection.commodity='grain';
 if(!Number.isSafeInteger(selection.quantity)||selection.quantity<1||selection.quantity>20)selection.quantity=1;
 const from=state.regions.find(r=>r.id===selection.origin),to=state.regions.find(r=>r.id===selection.destination);
 const request={seller:from&&reportedSeller(from),buyer:player,origin:selection.origin,destination:selection.destination,commodity:selection.commodity,quantity:selection.quantity};
 const quote=from&&to?quoteTrade(state,request):{ok:false,reason:'invalid'};
 const options=(regions,current)=>regions.map(r=>`<option value="${escapeHTML(r.id)}" ${r.id===current?'selected':''}>${escapeHTML(name(r.name,zh))}</option>`).join('');
 const goodOptions=goods.map(key=>`<option value="${key}" ${key===selection.commodity?'selected':''}>${escapeHTML(name(COMMODITIES[key].name,zh))}</option>`).join('');
 const pending=markets.shipments.filter(x=>(x.buyer===player||x.seller===player)&&x.status!=='delivered');
 const deliveries=markets.transactions.filter(x=>x.buyer===player||x.seller===player).slice(-5).reverse();
 const carrier=id=>{const person=state.world.characters[id],catalog=state.world.dynasties.catalog[id];return person?.faction===player&&catalog?.name?` · <button type="button" data-market-merchant="${escapeHTML(id)}">${escapeHTML(name(catalog.name,zh))}</button>`:''};
 const receipt=x=>{
  const shipment=markets.shipments.find(y=>y.id===x.shipment),origin=x.origin||shipment?.origin,destination=x.destination||shipment?.destination;
  const place=id=>escapeHTML(name(state.regions.find(r=>r.id===id)?.name,zh)||id||'?');
  const party=id=>escapeHTML(id==='external'?(zh?'境外商人':'Outside merchants'):name(state.factions[id]?.name,zh)||id||'?');
  const customs=(x.tariffs||[]).reduce((sum,t)=>sum+t.amount,0),total=(x.price||0)+(x.transport||0)+customs;
  return `<p><b>${x.month}/${x.year} · ${escapeHTML(name(COMMODITIES[x.commodity]?.name,zh))} ×${x.quantity}</b> · ${place(origin)} → ${place(destination)}${carrier(x.merchantId)}<br><small>${party(x.seller)} → ${party(x.buyer)} · ${zh?'货价':'Goods'} ${x.price}¤ · ${zh?'运费':'Transport'} ${x.transport}¤ · ${zh?'过境税':'Customs'} ${customs}¤ · ${zh?'总计':'Total'} ${total}¤ · ${zh?'已入库':'Delivered into'} ${place(destination)}</small></p>`;
 };
 root.innerHTML=`<section class="market-panel help-list"><strong>${zh?'各地市场':'LOCAL MARKETS'}</strong><p>${zh?'库存仅显示己方战区；外国市场须通过贸易协定获取报价，市场归属报告可能过时。每批货物有明确单位，运费及过境税在下单时一次预付。':'Stocks are shown only for your theaters. Foreign prices require a trade treaty; market ownership reports may be outdated. Each batch has a measured unit; transport and customs are paid when ordering.'}</p><div class="market-stock">${owned.map(r=>`<article><b>${escapeHTML(name(r.name,zh))}</b><small>${goods.map(key=>`${escapeHTML(name(COMMODITIES[key].name,zh))} ${markets.regions[r.id].goods[key].stock}`).join(' · ')}</small></article>`).join('')}</div><strong>${zh?'下达贸易订单':'PLACE TRADE ORDER'}</strong><div class="market-fields"><label>${zh?'卖方市场':'Seller market'}<select id="market-origin">${options(suppliers,selection.origin)}</select></label><label>${zh?'运抵己方战区':'Own destination'}<select id="market-destination">${options(owned,selection.destination)}</select></label><label>${zh?'货物':'Commodity'}<select id="market-commodity">${goodOptions}</select></label><label>${zh?'批数（1–20）':'Batches (1–20)'}<input id="market-quantity" type="number" min="1" max="20" step="1" value="${selection.quantity}"></label></div><p id="market-quote" class="battle-note">${quote.ok?`${zh?'货价':'Goods'} ${quote.price}¤ · ${zh?'运费':'Transport'} ${quote.transport}¤ · ${zh?'过境税':'Customs'} ${quote.tariffs.reduce((sum,t)=>sum+t.amount,0)}¤ · <b>${zh?'总计':'Total'} ${quote.total}¤</b><br>${zh?'预计':'Estimated'} ${quote.months} ${zh?'个月':'months'} · ${quote.route.map(id=>escapeHTML(name(tradeRouteName(state,id),zh))).join(' → ')}`:escapeHTML(name(reasons[quote.reason]||reasons.invalid,zh))}</p><button id="market-order" ${quote.ok?'':'disabled'}>${zh?'预付并派出商队':'PAY AND DISPATCH CARAVAN'}</button><div id="market-feedback" role="status"></div><strong>${zh?'在途商队':'SHIPMENTS IN TRANSIT'}</strong>${pending.length?pending.map(x=>`<p>${escapeHTML(name(COMMODITIES[x.commodity]?.name,zh))} ×${x.quantity} · ${escapeHTML(name(state.regions.find(r=>r.id===x.destination)?.name,zh))} · ${x.status==='blocked'?(zh?'通路受阻':'BLOCKED'):(zh?'运输中':'TRAVELING')}${carrier(x.merchantId)}</p>`).join(''):`<p>${zh?'暂无在途商队。':'No shipments in transit.'}</p>`}<strong>${zh?'最近成交':'RECENT DELIVERIES'}</strong>${deliveries.length?deliveries.map(receipt).join(''):`<p>${zh?'暂无成交。':'No deliveries yet.'}</p>`}</section>`;
 const rerender=()=>renderMarketPanel({root,state,language,selection,onOrder,onPerson,knownOwner});
 for(const [id,key] of [['#market-origin','origin'],['#market-destination','destination'],['#market-commodity','commodity'],['#market-quantity','quantity']])root.querySelector(id).onchange=event=>{selection[key]=key==='quantity'?Number(event.target.value):event.target.value;setTimeout(rerender,0)};
 root.querySelectorAll('[data-market-merchant]').forEach(button=>button.onclick=()=>onPerson?.(button.dataset.marketMerchant));
 root.querySelector('#market-order').onclick=()=>{const result=placeTradeOrder(state,{...request,maxTotal:quote.total});if(result.ok){onOrder(result.shipment);rerender()}else{rerender();root.querySelector('#market-feedback').textContent=name(reasons[result.reason]||reasons.invalid,zh)}};
}
