import {fundMissingSearch,hasMissingSearchDestination} from './character-system.js?v=agent-handover-1';

// The panel uses only the player's existing contact status, not the hidden fate.
export function renderMissingSearch(s,id,zh=false){
 const person=s.world?.characters?.[id],missing=person?.missing;if(!missing||person.faction!==s.player)return '';
 const funded=!!missing.searchFunded,remaining=Number.isFinite(missing.remaining)?Math.max(0,Math.floor(missing.remaining)):3,territory=hasMissingSearchDestination(s,id);
 const status=!territory?(zh?'等待可抵达的己方战区':'Waiting for a reachable controlled theater'):funded?(zh?'已投入额外资源':'Additional search funded'):(zh?'常规搜寻':'Ordinary search');
 return `<section class="rule-block" data-missing-search><h4>${zh?'搜寻失联人物':'SEARCH FOR MISSING PERSON'}</h4><p>${status} · ${zh?'下一次尝试约':'Next attempt in about'} ${remaining} ${zh?'个月':'months'}</p><p class="hint">${zh?'常规搜寻约每三个月尝试一次。投入5国库可将下次尝试提前至最多两个月，并将本次发现机会从30%提高到60%；仍可能无果。需有可抵达的己方战区。':'Ordinary searches are attempted about every three months. Spend 5 treasury to bring the next attempt within two months and raise that attempt’s discovery chance from 30% to 60%; it can still fail. A reachable controlled theater is required.'}</p><button type="button" data-fund-missing-search ${funded?'disabled':''}>${funded?(zh?'本次已投入':'Already funded'):(zh?'投入搜寻资源 · 5国库':'Fund search · 5 treasury')}</button><p data-missing-search-feedback role="status"></p></section>`;
}
export function bindMissingSearch(root,s,id,zh=false,refresh=()=>{}){
 const button=root.querySelector('[data-fund-missing-search]'),out=root.querySelector('[data-missing-search-feedback]');if(!button||!out)return;button.onclick=()=>{
  out.textContent=zh?'确认投入5国库？搜寻仍可能无果。 ':'Confirm spending 5 treasury? The search can still fail. ';const confirm=document.createElement('button');confirm.type='button';confirm.dataset.confirmMissingSearch='';confirm.textContent=zh?'确认投入':'Confirm';out.append(confirm);confirm.onclick=()=>{const result=fundMissingSearch(s,id);if(result.ok){refresh();return}const messages={unavailable:['Search unavailable.','无法搜寻此人物。'],pending:['This attempt is already funded.','本次搜寻已投入资源。'],territory:['A reachable controlled theater is required.','需要一个可抵达的己方战区。'],treasury:['Insufficient treasury.','国库不足。']};out.textContent=(messages[result.reason]||messages.unavailable)[zh?1:0]};
 };
}
