import {localEntity} from '../local-polities.js';
import {wildernessSurveyQuote,startWildernessSurvey} from '../frontier-wilderness.js';
import {renderFootholdPanel} from './foothold-ui.js';

const LABELS={
 forest_interior:['forest interior','森林腹地'],highland_valley:['highland valley','高地山谷'],remote_hills:['remote hills','偏远丘陵'],dry_frontier:['dry frontier','干旱边疆'],desert_margin:['desert margin','沙漠边缘'],mountain_barrier:['mountain barrier','山地屏障'],
 difficult:['difficult crossing','艰难通行'],seasonal:['seasonal crossing','季节通行'],impassable:['impassable local feature','局部不可通行'],
 limited:['limited settlement','有限聚落'],camp_only:['temporary camps only','仅临时营地'],none:['no permanent settlement','不适宜永久聚落'],
 sparse:['sparse population','人口稀少'],unknown:['population uncertain','人口不明']
};
const label=(key,zh)=>LABELS[key]?.[zh?1:0]||key;

export function renderWildernessEntity({state,id,actor,language,panel,refresh}){
 const entity=localEntity(state,id),zh=language==='zh';if(entity?.type!=='wilderness'||!entity.wilderness)return;
 const w=entity.wilderness,section=document.createElement('section');section.className='theater-facts';
 const title=document.createElement('h3');title.textContent=`${zh?'荒野地带':'WILDERNESS'} · ${entity.name[zh?1:0]}`;section.append(title);
 const note=document.createElement('p');note.textContent=entity.description[zh?1:0];section.append(note);
 const facts=document.createElement('p');facts.textContent=zh?`类型：${label(w.kind,true)} · 通行：${label(w.passability,true)} · 定居：${label(w.settlement,true)} · 居住：${label(w.occupancy,true)}。`:`Classification: ${label(w.kind,false)} · passage: ${label(w.passability,false)} · settlement: ${label(w.settlement,false)} · occupancy: ${label(w.occupancy,false)}.`;section.append(facts);
 const survey=w.surveyedBy?.[actor],status=document.createElement('p');
 status.textContent=survey?(zh?`本方于 ${survey.month}/${survey.year<0?`${-survey.year} BCE`:survey.year} 完成实地勘察；估计人口 ${w.populationEstimate}。`:`Surveyed by us in ${survey.month}/${survey.year<0?`${-survey.year} BCE`:survey.year}; estimated population ${w.populationEstimate}.`):(zh?'尚无本方实地勘察。荒野可能有人居住；战区法理归属和实际地方治理是不同层次。':'No field survey by us. Wilderness may be inhabited; theater legal title and local administration are separate.');section.append(status);
 if(w.surveyProject?.actor===actor){const progress=document.createElement('p');progress.textContent=zh?`勘察仍需 ${w.surveyProject.remaining} 个月；勘察队离开时暂停。`:`Field survey needs ${w.surveyProject.remaining} more month(s); it pauses if the party leaves.`;section.append(progress)}
 const quote=wildernessSurveyQuote(state,id,actor),button=document.createElement('button');button.id='wilderness-survey';button.disabled=!quote.ok;button.textContent=zh?'派遣勘察队 · 4国库 / 1粮食 / 2个月':'SURVEY · 4 TREASURY / 1 FOOD / 2 MONTHS';button.onclick=()=>{if(startWildernessSurvey(state,id,actor).ok)refresh()};section.append(button);
 if(!quote.ok){const reason=document.createElement('p');reason.textContent=({unavailable:zh?'该地形无法实地勘察。':'This terrain cannot be surveyed in the field.',already_surveyed:zh?'本方已经完成勘察。':'Our survey is complete.',busy:zh?'已有勘察队在执行。':'A survey is already under way.',field_party:zh?'需要一支至少100人的本方驻地队伍。':'A local party of at least 100 soldiers is required.',resources:zh?'国库或粮食不足。':'Insufficient treasury or food.'})[quote.reason]||'';section.append(reason)}
 panel.append(section);
 if(w.settlement!=='none')renderFootholdPanel({state,entity,actor,language,panel:section,refresh});
}
