import {CHARACTER_CATALOG} from '../characters.js?v=world-kings-city-diplomacy-2';
import {localAdministrator,localAdministratorCandidates,appointLocalAdministrator,dismissLocalAdministrator} from '../office-system.js?v=world-kings-city-diplomacy-2';

// A settlement post is distinct from the theater governor and grants no title.
export function renderLocalAdministratorPanel({state,entity,actor,language,panel,refresh}){
 if(entity?.controller!==actor||['village','nomadic','wilderness'].includes(entity.type))return;
 const zh=language==='zh',current=localAdministrator(state,entity.id),candidates=localAdministratorCandidates(state,entity.id,actor);
 const box=document.createElement('section');box.className='help-list local-administrator-panel';
 const heading=document.createElement('strong');heading.textContent=zh?'地方行政官（游戏任命）':'LOCAL SETTLEMENT ADMINISTRATOR';box.append(heading);
 const status=document.createElement('p');status.textContent=zh?`当前：${current?CHARACTER_CATALOG[current]?.name?.[1]||current:'空缺'}。任命消耗5国库；在场的成年官员每月使地方阻力额外下降2。离开、失职或失去地方控制时任命结束；不会改变法理归属。`:`Current: ${current?CHARACTER_CATALOG[current]?.name?.[0]||current:'vacant'}. Appointment costs 5 treasury. A present adult official lowers local resistance by 2 more each month. Departure, incapacity or loss of local control ends the post; legal title does not change.`;box.append(status);
 const select=document.createElement('select');select.id='settlement-administrator-choice';select.setAttribute('aria-label',zh?'地方行政官人选':'Settlement administrator candidate');
 for(const id of candidates){const option=document.createElement('option');option.value=id;option.textContent=CHARACTER_CATALOG[id]?.name?.[zh?1:0]||id;option.selected=id===current;select.append(option)}
 if(!candidates.length){const option=document.createElement('option');option.value='';option.textContent=zh?'没有合适的在场官员':'No eligible official present';select.append(option)}
 const appoint=document.createElement('button');appoint.id='settlement-administrator-appoint';appoint.disabled=!candidates.length||state.factions[actor]?.treasury<5;appoint.textContent=zh?'任命或更换':'APPOINT OR REPLACE';appoint.onclick=()=>{if(appointLocalAdministrator(state,entity.id,select.value,actor).ok)refresh()};
 const dismiss=document.createElement('button');dismiss.id='settlement-administrator-dismiss';dismiss.disabled=!current;dismiss.textContent=zh?'解除任命':'DISMISS';dismiss.onclick=()=>{if(dismissLocalAdministrator(state,entity.id).ok)refresh()};
 box.append(select,appoint,dismiss);panel.append(box);
}
