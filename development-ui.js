import {IDEAS,IDEA_CATEGORIES,MATERIALS,BUILDINGS,development,activeEffects,constructionCheck,ideaAdoptionPlan,ideaSlotExpansionCheck,localBuildingEffects,mineMetalOutput,knowledgeAgreementCheck,knowledgeTransitStatus,KNOWLEDGE_BLOCKED_LIMIT,scholarVisitCheck,scholarVisitTopics,researchTerms} from './development.js?v=66';
import {FIGURE_ROLES,initializeFigures,figureStatus,figureActive} from './great-figures.js';
import {CHARACTER_CATALOG} from './characters.js';
import {FACTIONS} from './data.js';
import {religionPanel} from './local-society.js?v=9';
import {techIllustration,buildingIllustration} from './tech-art.js?v=23';
import {nationalBudget} from './national-budget.js?v=37';
const materialFamilies=[
 {id:'water',name:['Water Management','水利管理'],items:['water-control','dam-engineering','reservoir-design','aqueduct-refinement','urban-drainage','sewer-improvement']},
 {id:'military',name:['Military Infrastructure','军事设施'],items:['barracks-design','stone-fortification','training-ground','supply-organization','armory-craft','siege-machinery']},
 {id:'industry',name:['Industry & Resources','工业与资源'],items:['quarrying','metal-extraction','metalworking','craft-workshops','grain-storage','grain-processing']},
 {id:'civic',name:['Civic Infrastructure','市政设施'],items:['stone-inscription','public-square-planning','library-organization','bath-construction','administrative-building']},
 {id:'trade',name:['Trade & Transportation','贸易与交通'],items:['roadmaking','road-milestones','bridge-engineering','port-facilities','warehouse-management','shipyard-craft','improved-shipbuilding','naval-equipment','repair-facilities','maritime-warehousing','military-transport-organization']}
];
const materialFamilyById=new Map(materialFamilies.flatMap(family=>family.items.map(id=>[id,family.id])));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const factionLabel=(id,zh)=>esc(FACTIONS[id]?.short?.[zh?1:0]||id);
const knowledgeLabel=(branch,id,zh)=>esc((branch==='material'?MATERIALS:IDEAS).find(item=>item.id===id)?.name[zh?1:0]||id);
function inTransitHtml(s,d,zh){return d.trade.map(trade=>{
 const status=knowledgeTransitStatus(s,s.player,trade);
 const note=status==='war'?enzh(zh,' · Paused by war',' · 因战争暂停'):status==='route'?enzh(zh,' · Paused: civilian route closed',' · 民间路线中断，传递暂停'):enzh(zh,'m in transit','个月后送达');
 const expiry=Math.max(0,KNOWLEDGE_BLOCKED_LIMIT-(Number.isInteger(trade.blockedMonths)?trade.blockedMonths:0));
 return `<p class="dev-status">${knowledgeLabel(trade.branch,trade.id,zh)} · ${trade.remaining}${status==='open'?note:`${enzh(zh,'m remaining','个月剩余')}${note} · ${expiry}${enzh(zh,'m until expiry; payment not refunded','个月后失效；付款不退')}`}</p>`;
}).join('')}
const visitingScholarStatus=(d,zh,s)=>d.visitingScholars.map(x=>{const here=s.regions.find(r=>r.id===x.currentRegion),place=x.travelRemaining>0&&here?` · ${enzh(zh,'via','途经')} ${esc(here.name[zh?1:0])}`:'';return `<p class="dev-status">${factionLabel(x.partner,zh)}${x.id?` · ${knowledgeLabel(x.branch,x.id,zh)}`:''}${place} · ${x.travelRemaining>0?`${x.travelRemaining}${enzh(zh,'m until arrival','个月后抵达')}`:`${x.remaining}${enzh(zh,'m of guidance left','个月指导期剩余')}`}</p>`}).join('');
const guardedKnowledge=new Set(['stone-fortification','siege-machinery','legion-training']);
const effectNames={treasury:['Treasury / month','国库 / 月'],food:['Food / month','粮食 / 月'],foodCapacity:['Food storage','粮食储量'],manpower:['Manpower / month','兵源 / 月'],loyalty:['Local loyalty / month','地方忠诚 / 月'],stability:['Stability / month','稳定度 / 月'],legitimacy:['Legitimacy / month','合法性 / 月'],upkeep:['Upkeep / month','维护费 / 月'],recruitMorale:['Recruit morale','新兵士气'],civicExercise:['Recruit morale in urban territory with integration ≥65','融合度≥65的城市新兵士气'],galatianMuster:['Recruit morale in Galatian territory with integration and satisfaction ≥45','加拉太领土融合度与满意度均≥45的新兵士气'],parthianArrowTrains:['Defense on a supplied, owned Parthian plain','有补给的己方帕提亚平原防御'],armenianHighlandSupply:['Army supply on reachable, owned Armenian hills','陆路可达的己方亚美尼亚丘陵军队补给'],combinedDefense:['Joint defense in an owned theater with supply ≥65%','己方战区两军合防且补给≥65%的防御'],recruitCost:['Recruitment discount','征兵折扣'],combatAttack:['Attack','进攻'],combatDefense:['Defense','防御'],siegeReduction:['Siege time reduction','围攻时间缩减'],march:['Land march reduction','陆路行军缩减'],seaSpeed:['Sea crossing reduction','海路航行缩减'],healthRisk:['Illness risk','患病风险'],diplomacy:['Relations improvement','关系改善'],diplomacyPressure:['Pressure','施压'],royalCourtCredit:['Alliance credit with independent kingdoms','与独立王国结盟加成'],relations:['Relations / month','外交关系 / 月'],researchDiscount:['Research discount','研究折扣'],constructionDiscount:['Construction discount','建造折扣'],decisionDelay:['Decision delay','决策延迟'],sanctuaryProtection:['Provincial rites support / quarter','地方祭仪支持 / 季'],ancestralRites:['Own rites +1 / other rites −1 each quarter','本国祭仪 +1 / 异地祭仪 −1 每季'],agentCapacity:["Concurrent spy and counterintelligence missions","同时进行的间谍与反谍任务"],scoutReliability:['Scout detection chance','斥候发现概率'],stone:['Stone / month','石材 / 月'],timber:['Timber / month','木材 / 月'],metal:['Metal / month','金属 / 月'],fort:['Fortification','防御等级'],navalPower:['Fleet combat power','舰队战力'],navalSupply:['Fleet supply','舰队补给'],navalTrade:['Maritime cargo volume','海运货量'],navalSecurity:['Route security','航线安全'],navalIntel:['Maritime intelligence','海事情报'],navalRepair:['Hull repair','船体修理'],navalDefense:['Port blockade resistance','港口抵抗封锁能力'],navalExperience:['Crew experience','水手经验']};
const enzh=(zh,en,cn)=>zh?cn:en;
function effectsText(e,zh){return Object.entries(e||{}).map(([key,value])=>{
 if(key==='localFoodCapacity')return `<span class="dev-effect positive">${zh?'地方储粮容量':'Provincial grain-store capacity'} +${value}</span>`;
 if(key==='ideaResearchDiscount')return `<span class="dev-effect positive">${zh?'理念研究折扣':'National-idea research discount'} +${value}</span>`;
 if(key==='grainCommutation')return `<span class="dev-effect positive">${zh?'存粮≥35且有稳定产粮地时：每月最多+3国库':'Stores ≥35 and supportive grain districts: up to +3 treasury / month'}</span><span class="dev-effect negative">${zh?'等量减少当月国家粮食收入；无粮食盈余时暂停':'Equal reduction in state food income; pauses without a food surplus'}</span>`;
 if(key==='egyptianDecrees')return `<span class="dev-effect positive">${zh?'埃及文化领土行政融合度 / 月 +1':'Integration in Egyptian-culture territories / month +1'}</span>`;
 if(key==='hellenicCouncil')return `<span class="dev-effect positive">${zh?'希腊文化领土且融合度≥45：当地满意度 / 季 +1':'Hellenic-culture territory with integration ≥45: local satisfaction / quarter +1'}</span>`;
 if(key==='culturalAccommodation')return `<span class="dev-effect positive">${zh?'异文化领土且融合度≥45：当地满意度 / 季 +1':'Different-culture territory with integration ≥45: local satisfaction / quarter +1'}</span>`;
 if(key==='ancestralRites')return `<span class="dev-effect positive">${zh?'本国祭仪满意度 / 季 +1':'Own rites satisfaction / quarter +1'}</span><span class="dev-effect negative">${zh?'异地祭仪满意度 / 季 −1':'Other rites satisfaction / quarter −1'}</span>`;
 if(key==='provincialRitesCharter')return `<span class="dev-effect positive">${zh?'承认地方祭仪时：异地传统且少数信仰≥25%的行省满意度 / 季 +1':'With local rites recognized: satisfaction / quarter +1 in provinces with a different dominant tradition and minority faith ≥25%'}</span>`;
 if(key==='templeGuarantees')return `<span class="dev-effect positive">${zh?'埃及文化且埃及祭仪占主导、祭司团有效时：当地满意度 / 季 +1；祭司影响 / 季 +1':'In Egyptian-culture provinces with dominant Egyptian rites: local satisfaction / quarter +1 with an influential priesthood; priestly influence / quarter +1'}</span><span class="dev-effect negative">${zh?'每4处符合条件的领土另付1国库／月（最多6）':'Additional 1 treasury / month per 4 eligible provinces (maximum 6)'}</span>`;
 if(key==='estateLabor')return `<span class="dev-effect positive">${zh?'有产出乡村领土每处粮食 / 月 +1（上限4）':'Food / month +1 per productive rural territory (max 4)'}</span><span class="dev-effect negative">${zh?'这些领土满意度与忠诚 / 季 −1；不满人口迁出减半':'Satisfaction and loyalty / quarter −1 there; distressed outmigration halved'}</span>`;
 if(key==='tenantShares')return `<span class="dev-effect positive">${zh?'有产出乡村领土满意度与忠诚 / 季 +1；不满人口迁出上限 225':'Productive rural satisfaction and loyalty / quarter +1; distressed outmigration cap 225'}</span><span class="dev-effect negative">${zh?'国库可用粮食 / 月 −1 每处（上限3）':'State-available food / month −1 per territory (max 3)'}</span>`;
 if(key==='seasonalLabor')return `<span class="dev-effect positive">${zh?'有产出乡村领土粮食 / 月 +1 每处（上限3）；不满人口迁出上限 300':'Food / month +1 per productive rural territory (max 3); distressed outmigration cap 300'}</span>`;
 if(key==='bosporanGrainStewardship')return `<span class="dev-effect positive">${zh?'己方有产出的博斯普鲁斯文化港口：国库粮食 / 月 +1 每处（上限2）':'Owned, productive Bosporan-culture ports: state food / month +1 each (max 2)'}</span>`;
 if(key==='taxReview')return `<span class="dev-effect positive">${zh?'行政融合度≥65且实行高税时，当地满意度与忠诚的月度损失各减少1':'With high taxes and integration ≥65, monthly satisfaction and loyalty losses each fall by 1'}</span><span class="dev-effect negative">${zh?'高税期间，每12处受益领土另需1国库／月的复核费用':'While taxes are high, review costs 1 treasury / month per 12 eligible territories'}</span>`;
 return `<span class="dev-effect ${(key==='upkeep'||key==='decisionDelay'||key==='healthRisk'?value>0:value<0)?'negative':'positive'}">${esc(effectNames[key]?.[zh?1:0]||key)} ${value>0?'+':value<0?'−':''}${Math.abs(value)<1?(Math.abs(value)*100).toFixed(Math.abs(value)<.01?1:0)+'%':Math.abs(value)}</span>`;
 }).join('')}
function sourceLink(item,zh){return `<a href="${esc(item.source.url)}" target="_blank" rel="noopener noreferrer">${enzh(zh,'Historical source','史料来源')}: ${esc(item.source.title)} ↗</a>`}
function figurePanel(s,zh){
 const figures=initializeFigures(s),owner=s.player;
 const rows=Object.entries(FIGURE_ROLES).map(([role,data])=>{
  const people=data.candidates.map(id=>{
   const c=CHARACTER_CATALOG[id],status=figureStatus(s,owner,id),invite=figures.invitations.find(x=>x.id===id),journey=figures.journeys.find(x=>x.id===id);
   const condition=invite?`${invite.remaining}${enzh(zh,'m until reply','个月后答复')}`:journey?`${journey.remaining}${enzh(zh,'m travel','个月行程')}`:status.ok?enzh(zh,status.foreign?'foreign invitation possible':'available',status.foreign?'可邀请外国人物':'可任命'):enzh(zh,status.reason,({assigned:'已任命',unavailable:'不可用','in-office':'已有公职',diplomacy:'外交条件不足',treasury:'国库不足'})[status.reason]||status.reason);
   const foreign=s.world.characters[id]?.faction!==owner;
   const price=foreign?enzh(zh,'5¤ now + 30¤ on acceptance','先付5国库；接受后付30国库'):`${status.cost||20}¤`;
   return {id,name:esc(c.name[zh?1:0]),source:esc(c.source),condition,price,enabled:status.ok};
  });
  return `<div class="dev-build-row"><div><b>${esc(data.name[zh?1:0])}${figureActive(s,owner,role)?' ✓':''}</b><small>${people.map(p=>`${p.name} · ${p.condition} <a href="${p.source}" target="_blank" rel="noopener noreferrer">${enzh(zh,'source ↗','资料 ↗')}</a>`).join(' / ')}</small></div>${people.map(p=>`<button class="action" data-recruit-figure="${p.id}" ${p.enabled?'':'disabled'}>${enzh(zh,'Invite','邀请')} · ${p.price}</button>`).join('')}</div>`;
 }).join('');
 return `<section class="dev-category"><h3>${enzh(zh,'Historical specialists','历史人物与专长')}</h3><p class="hint">${enzh(zh,'Domestic appointments require travel. A foreign invitation costs 5 treasury now; the person may decline after one month. Only acceptance charges the remaining 30 treasury and starts a real journey. Historical identities are sourced; assignments and bonuses are game models.','本国任命需要行程。外国邀请现在花费5国库，人物可能在一个月后拒绝；只有接受时才再付30国库并开始实际行程。人物身份有史料来源；任命与加成为游戏模拟。')}</p>${rows}</section>`;
}
function card(item,zh,body,extra=''){const previous=(item.prerequisites||[]).map(id=>({id,name:(IDEAS.find(x=>x.id===id)||MATERIALS.find(x=>x.id===id))?.name[zh?1:0]||id}));return `<article id="tech-${item.id}" class="dev-card dev-card-${item.category||'material'}" data-tech-node="${item.id}" data-prerequisites="${esc(previous.map(x=>x.id).join(' '))}"><div class="dev-illustration" aria-hidden="true">${techIllustration(item)}</div><div class="dev-card-body"><h3>${esc(item.name[zh?1:0])}</h3><small>${esc(item.name[zh?0:1])}</small>${previous.length?`<p class="dev-prerequisite">↳ ${enzh(zh,'Requires','前置')}: ${previous.map(x=>`<a href="#tech-${x.id}" class="dev-prereq-link">${esc(x.name)}</a>`).join(' + ')}</p>`:''}<p>${esc(item.context[zh?1:0])}</p>${body}${MATERIALS.includes(item)?materialDetails(item,zh):''}${sourceLink(item,zh)}${extra}</div></article>`}
function treeLanes(list,zh,render){
 const byId=new Map(list.map(x=>[x.id,x])),depthCache=new Map();
 const depth=id=>{if(depthCache.has(id))return depthCache.get(id);const item=byId.get(id),parents=(item?.prerequisites||[]).filter(x=>byId.has(x));const value=parents.length?Math.max(...parents.map(x=>depth(x)))+1:0;depthCache.set(id,value);return value};
 const root=id=>{let item=byId.get(id);while(item?.prerequisites?.some(x=>byId.has(x)))item=byId.get(item.prerequisites.find(x=>byId.has(x)));return item?.id||id};
 const groups=new Map();for(const item of list){const key=item.category||materialFamilyById.get(item.id)||root(item.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)}
 const order=(list[0]?.category?IDEA_CATEGORIES:materialFamilies).map(group=>group.id);
 return [...groups].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0])).map(([key,items])=>{const title=(items[0].category?IDEA_CATEGORIES:materialFamilies).find(f=>f.id===key)?.name[zh?1:0]||byId.get(key)?.name[zh?1:0]||key,levels=[...new Set(items.map(x=>depth(x.id)))].sort((a,b)=>a-b);
  return `<section class="dev-tree-lane" data-dev-lane="${esc(key)}"><h3>${esc(title)}</h3><div class="dev-tree-steps"><svg class="dev-tree-links" aria-hidden="true"></svg>${levels.map(level=>`<div class="dev-tree-tier"><small>${enzh(zh,'Stage','阶段')} ${level+1}</small>${items.filter(x=>depth(x.id)===level).map(render).join('')}</div>`).join('')}</div></section>`;
 }).join('');
}
function materialUnlock(item,zh){const buildings=BUILDINGS.filter(b=>b.tech===item.id);if(buildings.length)return buildings.map(b=>b.name[zh?1:0]).join(' · ');return ({'improved-shipbuilding':['Faster ship construction','缩短造船时间'],'naval-equipment':['Heavy warship construction','大型战船建造'],'maritime-warehousing':['More cargo per shipment','每航次增载货物'],'military-transport-organization':['Greater troop capacity per transport','每艘运输船增载士兵']})[item.id]?.[zh?1:0]||item.name[zh?1:0]}
function materialDetails(item,zh){
 const buildings=BUILDINGS.filter(b=>b.tech===item.id),terrain={plain:['Plains','平原'],hills:['Hills','丘陵'],forest:['Forest','森林'],urban:['Urban','城市'],desert:['Desert','沙漠']},sites={coast:['coast','海岸'],water:['river or water source','河流或水源'],urban:['large settlement','大型聚落']},materials={stone:['stone','石材'],timber:['timber','木材'],metal:['metal','金属']};
 if(buildings.length)return `<div class="dev-material-details">${buildings.map(b=>{const place=[b.terrain.map(t=>terrain[t]?.[zh?1:0]||t).join(' / '),b.site?sites[b.site]?.[zh?1:0]:null,b.id==='mine'?enzh(zh,'metal deposit · at least 6,000 people','金属矿藏 · 至少6,000人口'):null,b.id==='shipyard'?enzh(zh,'existing port','已有港口'):null,b.id==='milestone'?enzh(zh,'existing local road','当地已建道路'):null].filter(Boolean).join(' · ');return `<div class="dev-material-unlock"><strong>${esc(b.name[zh?1:0])}</strong><div class="dev-effects">${effectsText(b.effects,zh)}</div><small>${enzh(zh,'Base build cost','基础建造费')} ${b.cost}¤ · ${b.months}${enzh(zh,' months','个月')} · ${enzh(zh,'Upkeep','维护')} ${b.upkeep}¤/${enzh(zh,'month','月')}</small><small>${enzh(zh,'Materials','材料')}: ${Object.entries(b.materials).map(([k,v])=>`${v} ${materials[k]?.[zh?1:0]||k}`).join(' · ')}</small><small>${enzh(zh,'Location','地点')}: ${esc(place)}</small></div>`}).join('')}</div>`;
 const direct={'improved-shipbuilding':['Ship construction −1 month (minimum 1 month)','造船时间 −1 月（至少 1 月）'],'naval-equipment':['Quadriremes and quinqueremes become available at a shipyard','船厂可建造四列桨与五列桨战船'],'maritime-warehousing':['Planned merchant shipment +1 cargo, limited by hull capacity','商船计划货量 +1，仍受船体容量限制'],'military-transport-organization':['Military transport capacity +600 soldiers per transport','每艘军用运输船增载 600 名士兵']}[item.id];
 return direct?`<p class="dev-material-direct">${esc(direct[zh?1:0])}</p>`:'';
}
function researchTreasuryNotice(s,zh){
 const cash=s.factions[s.player].treasury,monthly=nationalBudget(s,s.player).projectedNet;
 const signed=monthly>0?`+${monthly}`:`${monthly}`;
 const runway=monthly<0?Math.max(0,Math.ceil(cash/-monthly)):null;
 return `<p class="dev-budget-preview">${enzh(zh,'Treasury before research','研究前国库')} ${cash}¤ · ${enzh(zh,'Projected monthly balance','预计每月收支')} ${signed}¤${runway===null?'':` · ${enzh(zh,'At current conditions, funds last about','按当前情况，资金约可维持')} ${runway}${enzh(zh,' months','个月')}`}. ${enzh(zh,'Research costs are paid now; buildings and policies require separate spending.','研究费立即扣除；建筑和政策仍需另行支付。')}</p>`;
}
function developmentPanelContent(s,lang,branch){
  const zh=lang==='zh',d=development(s,s.player),f=s.factions[s.player];
  const list=branch==='material'?MATERIALS:IDEAS;
  return `<div class="panel-heading"><span class="eyebrow">INVENTIONES</span><h2>${enzh(zh,'Development','文明发展')}</h2></div><div class="segmented"><button data-dev-branch="material" class="${branch==='material'?'active':''}">${enzh(zh,'Material','物质')}</button><button data-dev-branch="idea" class="${branch==='idea'?'active':''}">${enzh(zh,'Non-material','非物质')}</button></div><p class="hint">${enzh(zh,'Research costs treasury and months. Buildings must then be constructed; ideas must be equipped. Delivered foreign trade can yield a dated research lead, not instant knowledge. Drawings are original interpretive art. Scroll the tree horizontally for later stages.','研究消耗国库与月份。建筑仍需建造，理念仍需装配。实际送达的外国贸易可能产生限时研究线索，不会直接授予知识。节点插画是原创示意图；横向滚动可看后续阶段。')}</p>${researchTreasuryNotice(s,zh)}<p class="dev-status">${d.research?`${enzh(zh,'Researching','研究中')}: ${esc(list.find(x=>x.id===d.research.id)?.name[zh?1:0]||d.research.id)} · ${d.research.remaining} ${enzh(zh,'months','个月')}`:enzh(zh,'No research in progress','暂无研究项目')}</p><div class="dev-cards dev-tree">${treeLanes(list,zh,item=>{const known=d[branch==='material'?'knownMaterial':'knownIdeas'].includes(item.id),inTransit=d.trade.some(t=>t.branch===branch&&t.id===item.id),busy=!!d.research,terms=researchTerms(s,s.player,branch,item.id),price=terms.cost,months=terms.months;return card(item,zh,`<div class="dev-meta">${branch==='material'?`${enzh(zh,'Unlocks','解锁')} ${esc(materialUnlock(item,zh))}`:`${esc(IDEA_CATEGORIES.find(c=>c.id===item.category).name[zh?1:0])}<div class="dev-effects">${effectsText(item.effects,zh)}</div>`}</div>${terms.scholar?`<p class="dev-meta">${enzh(zh,'Varro advises this subject: cost up to −3¤ / time up to −1m','瓦罗在此领域提供指导：费用最多 −3¤ / 时间最多 −1月')}</p>`:''}${terms.merchant?`<p class="dev-meta">${enzh(zh,'Merchant research lead','商贸研究线索')} · ${factionLabel(terms.merchant.seller,zh)} · ${Math.max(0,terms.merchant.expiresTurn-s.year*12-s.month)}${enzh(zh,' months left','个月后失效')} · ${enzh(zh,'Cost −3¤ / time −1m','费用 −3¤ / 时间 −1月')}</p>`:''}<button class="action" data-research="${item.id}" data-research-branch="${branch}" ${known||inTransit||busy||f.treasury<price||item.prerequisites.some(pre=>!d[branch==='material'?'knownMaterial':'knownIdeas'].includes(pre))?'disabled':''}>${known?enzh(zh,'Known','已掌握'):inTransit?enzh(zh,'In transit','传输中'):`${enzh(zh,'Research','研究')} · ${price}¤ / ${months}${enzh(zh,'m','月')}`}</button>`)})}</div>${tradePanel(s,lang)}`;
}
function adoptionGateText(reason,zh){
 return ({'cultural-base':enzh(zh,'originating culture territory','起源文化领土'),'local-support':enzh(zh,'local satisfaction 45+','当地满意度至少45'),'priesthood':enzh(zh,'supportive Egyptian priesthood','有影响力的埃及祭司团'),'building':enzh(zh,'owned Private Book Collection','己方私人藏书室')})[reason]||enzh(zh,'local conditions','当地条件');
}
function adoptionBudgetForecast(s,idea,slot,plan,zh){
 const slots=development(s,s.player).slots[idea.category],previous=slots[slot];
 const current=nationalBudget(s,s.player).projectedNet;
 slots[slot]=idea.id;
 let proposed;
 try{proposed=nationalBudget(s,s.player).projectedNet}finally{slots[slot]=previous}
 const signed=value=>`${value>0?'+':''}${value}`;
 return `<small class="dev-budget-preview">${enzh(zh,'Projected treasury / month after transition','过渡完成后预计国库 / 月')}: ${signed(current)} → ${signed(proposed)}¤ · ${enzh(zh,'At current holdings and policies; adoption also costs','按当前领土与政策估算；装配另需')} ${plan.cost}¤${proposed<0?` · ${enzh(zh,'Monthly deficit at current conditions','按当前条件每月赤字')}`:''}</small>`;
}
function ideaChoiceCard(s,zh,d,slots,idea){
 const known=d.knownIdeas.includes(idea.id),plans=slots.map((_,index)=>ideaAdoptionPlan(s,s.player,idea.id,index));
 const reason=plan=>plan.reason==='conflict'?`${enzh(zh,'Conflicts with','与其冲突')} ${esc(IDEAS.find(i=>i.id===plan.with)?.name[zh?1:0]||plan.with)}`:plan.reason==='duplicate'?enzh(zh,'Already active in another slot','已在其他栏位生效'):plan.reason==='treasury'?enzh(zh,'Insufficient treasury','国库不足'):plan.reason==='active'?enzh(zh,'Already active','已生效'):plan.reason==='cultural-base'?enzh(zh,'Requires an owned territory of the originating culture','需要统治该理念起源文化的领土'):plan.reason==='local-support'?enzh(zh,'Local satisfaction must reach 45','当地满意度须达到45'):plan.reason==='priesthood'?enzh(zh,'Requires a supportive Egyptian priesthood with local satisfaction 45+','需要有影响力的埃及祭司团，且当地满意度至少45'):plan.reason==='building'?enzh(zh,'Build an owned Private Book Collection first','先在领土内建成私人藏书室'):d.adoption?enzh(zh,'Policy transition in progress','政策更换中'):enzh(zh,'Research first','先研究');
 const actions=plans.map((plan,index)=>`<div><button class="action" data-adopt-idea="${idea.id}" data-slot="${index}" ${plan.ok?'':'disabled'}>${slots[index]?enzh(zh,'Replace','更换'):enzh(zh,'Equip','装配')} ${index+1} · ${plan.cost}¤ / ${plan.months}${enzh(zh,'m','月')}${plan.stabilityLoss?` · ${enzh(zh,'stability','稳定度')} −${plan.stabilityLoss}`:''}</button>${plan.ok?adoptionBudgetForecast(s,idea,index,plan,zh):''}${plan.adviserActive?`<small>${enzh(zh,'Adviser','顾问')}: ${esc(FIGURE_ROLES[plan.specialist].name[zh?1:0])} · −1${enzh(zh,' month','个月')}</small>`:''}${known&&!plan.ok&&plan.reason!=='active'?`<small>${enzh(zh,'Slot','栏位')} ${index+1}: ${reason(plan)}</small>`:''}</div>`).join('');
 const comparisons=slots.map((oldId,index)=>{const old=IDEAS.find(i=>i.id===oldId);if(!old||old.id===idea.id)return '';const plan=plans[index];return `<details class="dev-compare"><summary>${enzh(zh,'Compare with slot','与栏位')} ${index+1}: ${esc(old.name[zh?1:0])}</summary><div class="dev-compare-grid"><div><b>${enzh(zh,'Current','当前')}</b><div class="dev-effects">${effectsText(old.effects,zh)}</div></div><div><b>${enzh(zh,'Proposed','拟装配')}</b><div class="dev-effects">${effectsText(idea.effects,zh)}</div></div></div><p>${enzh(zh,'Transition','更换代价')}: ${plan.cost}¤ · ${plan.months}${enzh(zh,' months','个月')} · ${enzh(zh,'stability','稳定度')} −${plan.stabilityLoss}</p></details>`}).join('');
 return card(idea,zh,`<div class="dev-effects">${effectsText(idea.effects,zh)}</div><p class="dev-meta">${known?enzh(zh,'Known','已掌握'):enzh(zh,'Research first','先研究')}${d.foreignOrigins[idea.id]||idea.origin&&s.player!==idea.origin?` · ${enzh(zh,'Foreign adaptation adds time','外来理念适应增加时间')}`:''}</p><div class="dev-actions">${actions}</div>${comparisons}`);
}
const selectedIdeaByCategory=new Map();
function ideaLoadoutBrowser(s,zh,d,category,slots,options){
 const key=`${s.player}:${category.id}`;
 const selected=options.find(idea=>idea.id===selectedIdeaByCategory.get(key))||options.find(idea=>slots.includes(idea.id))||options.find(idea=>d.knownIdeas.includes(idea.id))||options[0];
 selectedIdeaByCategory.set(key,selected.id);
 const choices=options.map(idea=>{const active=slots.includes(idea.id),known=d.knownIdeas.includes(idea.id),chosen=idea.id===selected.id;
  return `<button type="button" class="dev-idea-choice${chosen?' selected':''}${active?' active':''}" data-select-idea="${idea.id}" data-idea-category="${category.id}" aria-controls="tech-${idea.id}" aria-pressed="${chosen}"><span>${esc(idea.name[zh?1:0])}</span><small>${active?enzh(zh,'Equipped','已装配'):known?enzh(zh,'Known','已掌握'):enzh(zh,'Unresearched','未研究')}</small></button>`}).join('');
 const details=options.map(idea=>`<div class="dev-idea-detail" data-idea-detail="${idea.id}" ${idea.id===selected.id?'':'hidden'}>${ideaChoiceCard(s,zh,d,slots,idea)}</div>`).join('');
 return `<div class="dev-idea-browser"><div class="dev-idea-list" role="group" aria-label="${enzh(zh,'Choose an idea to inspect','选择理念查看详情')}">${choices}</div><div class="dev-idea-details">${details}</div></div>`;
}
export function bindIdeaSelection(root=document){
 root.querySelectorAll('[data-select-idea]').forEach(button=>button.onclick=()=>{
  const section=button.closest('.dev-category'),id=button.dataset.selectIdea;
  selectedIdeaByCategory.set(`${section.dataset.ideaFaction}:${button.dataset.ideaCategory}`,id);
  section.querySelectorAll('[data-select-idea]').forEach(choice=>{const selected=choice===button;choice.classList.toggle('selected',selected);choice.setAttribute('aria-pressed',String(selected))});
  section.querySelectorAll('[data-idea-detail]').forEach(detail=>{detail.hidden=detail.dataset.ideaDetail!==id});
 });
 root.querySelectorAll('.dev-idea-detail .dev-prereq-link').forEach(link=>link.onclick=event=>{
  const href=link.getAttribute('href')||'';
  if(!href.startsWith('#tech-'))return;
  const id=href.slice(6),choice=[...root.querySelectorAll('[data-select-idea]')].find(button=>button.dataset.selectIdea===id);
  if(!choice)return;
  event.preventDefault();choice.click();
  root.querySelector(`[data-idea-detail="${id}"]`)?.scrollIntoView({block:'nearest'});
 });
}
function ideaExpansionControls(zh,d,category,slots,plan){
 if(slots.length>=3)return '';
 const check=(met,en,cn)=>`<span class="dev-expansion-check ${met?'met':'missing'}">${met?'✓':'○'} ${enzh(zh,en,cn)}</span>`;
 const institutional=slots.length===1
  ?check(plan.administration||plan.education,'Administration or education','行政或教育制度')
  :check(plan.administration,'Administration','行政制度')+check(plan.education,'Education','教育制度');
 const requirements=check(plan.known>=plan.requiredKnown,`Known ideas ${plan.known}/${plan.requiredKnown}`,`已知理念 ${plan.known}/${plan.requiredKnown}`)+institutional+(plan.requiredStability?check(plan.stability>=plan.requiredStability,`Stability ${plan.stability}/${plan.requiredStability}`,`稳定度 ${plan.stability}/${plan.requiredStability}`):'')+check(plan.treasury>=plan.cost,`Treasury ${plan.treasury}/${plan.cost}¤`,`国库 ${plan.treasury}/${plan.cost}¤`);
 const progress=d.expansion?.category===category.id?`<p class="dev-status">${enzh(zh,'Slot expansion in progress','栏位扩建中')} · ${d.expansion.remaining}${enzh(zh,'m remaining','个月剩余')}</p>`:d.expansion?`<p class="dev-meta">${enzh(zh,'Another category is expanding first.','另一类别的栏位正在扩建。')}</p>`:'';
 return `<div class="dev-expansion"><button class="action" data-expand-idea="${category.id}" ${plan.ok?'':'disabled'}>${enzh(zh,'Expand to','扩展至')} ${slots.length+1} ${enzh(zh,'slots','栏位')} · ${plan.cost}¤ / ${plan.months}${enzh(zh,'m','月')}</button><p class="dev-meta">${enzh(zh,'After completion: +','完工后：每月增加')} ${plan.monthlyUpkeep}¤${zh?' 行政维护费':' administrative upkeep / month'}</p>${progress}<div class="dev-expansion-checks">${requirements}</div></div>`;
}
function constructionTreasuryNote(s,zh){
 const treasury=s.factions[s.player].treasury,net=nationalBudget(s,s.player).projectedNet;
 if(net>=0)return '';
 const months=treasury>0?Math.ceil(treasury/-net):0;
 return `<p class="dev-status">${enzh(zh,'Treasury outlook:','国库预估：')} ${treasury}¤ · ${enzh(zh,'current monthly balance','当前每月收支')} ${net}¤${enzh(zh,'.','。')} ${months?enzh(zh,`At the current rate, funds reach zero in about ${months} months.`,`若收支不变，约 ${months} 个月后国库耗尽。`):enzh(zh,'Funds are already exhausted.','国库已耗尽。')} ${enzh(zh,'Construction is paid now; upkeep starts when the building is complete. War and income can change this estimate.','建造费现在支付，维护费在完工后开始；战事和收入会改变此估算。')}</p>`;
}
export function ideasPanel(s,lang){
  const zh=lang==='zh',d=development(s,s.player),e=activeEffects(s,s.player);
  return `<div class="panel-heading"><span class="eyebrow">CONSILIA</span><h2>${enzh(zh,'National Ideas','国家理念')}</h2></div><p class="hint">${enzh(zh,'One starting slot in each of five categories. Only active ideas change the simulation. Adoption and replacement take months.','五类理念各有一个初始栏位。只有生效的理念改变模拟；装配与更换需要数月。')}</p>${d.adoption?`<p class="dev-status">${enzh(zh,'Policy transition','政策过渡')} · ${d.adoption.remaining} ${enzh(zh,'months','个月')}${d.adoption.pausedReason?` · ${enzh(zh,'Paused until local requirements recover','暂停，等待当地条件恢复')}: ${adoptionGateText(d.adoption.pausedReason,zh)}`:''} <button class="action" data-cancel-idea-adoption title="${enzh(zh,'The adoption fee is not refunded; any idea already in the slot remains active.','装配费用不退还；栏位中原有理念继续生效。')}">${enzh(zh,'Cancel transition','取消过渡')}</button></p>`:''}<div class="dev-effects">${effectsText(e,zh)}</div>${IDEA_CATEGORIES.map(category=>{const slots=d.slots[category.id],options=IDEAS.filter(i=>i.category===category.id),expansion=ideaSlotExpansionCheck(s,s.player,category.id);return `<section class="dev-category" data-idea-faction="${s.player}"><h3>${esc(category.name[zh?1:0])}</h3><div class="dev-slots">${[0,1,2].map(index=>{const id=slots[index],idea=IDEAS.find(i=>i.id===id);return `<div class="dev-slot ${index>=slots.length?'locked':''}"><small>${enzh(zh,'Slot','栏位')} ${index+1}</small><b>${index>=slots.length?enzh(zh,'Locked','未解锁'):idea?esc(idea.name[zh?1:0]):enzh(zh,'Empty','空')}</b>${idea?`<button data-remove-idea="${category.id}" data-slot="${index}" ${d.adoption?'disabled':''}>${enzh(zh,'Remove · 5¤ / 2m','移除 · 5¤ / 2月')}</button>`:''}</div>`}).join('')}</div>${ideaExpansionControls(zh,d,category,slots,expansion)}${ideaLoadoutBrowser(s,zh,d,category,slots,options)}</section>`}).join('')}`+religionPanel(s,lang);
}
function constructionPanelBase(s,lang,r,extra=''){
  if(!r||r.owner!==s.player)return '';
  const zh=lang==='zh',d=development(s,s.player),local=localBuildingEffects(r);
  extra=constructionTreasuryNote(s,zh)+extra;
  return `<section class="dev-construction"><div class="separator"></div><span class="eyebrow">AEDIFICIA</span><h3>${enzh(zh,'Material Construction','物质建造')}</h3><p class="hint">${enzh(zh,'Local terrain, knowledge, funds and materials determine availability.','可建项目取决于当地地形、知识、资金和材料。')}</p><p class="dev-meta">${enzh(zh,'Materials','材料')}: ${d.materials.stone} ${enzh(zh,'stone','石')} · ${d.materials.timber} ${enzh(zh,'timber','木')} · ${d.materials.metal} ${enzh(zh,'metal','金属')}</p>${local.localFoodCapacity?`<p class="dev-status">${enzh(zh,'Provincial grain reserve','地方粮仓储备')}: ${Math.max(0,Math.min(local.localFoodCapacity,Math.floor(Number(r.grainReserve)||0)))}/${local.localFoodCapacity} · ${enzh(zh,'Stores 2 food per month from the state pool above 30; releases up to 4 per month during shortages. Capturing the province transfers its stored grain.','全国存粮超过30时每月转存2粮；缺粮时每月最多释放4粮。领土易手时储粮随之转移。')}</p>`:''}${r.construction?`<p class="dev-status">${enzh(zh,'Building','建造中')} ${esc(BUILDINGS.find(b=>b.id===r.construction.buildingId)?.name[zh?1:0]||r.construction.buildingId)} · ${r.construction.remaining}${enzh(zh,'m','月')}</p>`:''}<div class="dev-effects">${effectsText(local,zh)}</div>${extra}${BUILDINGS.map(b=>{const check=constructionCheck(s,s.player,r.id,b.id),done=r.buildings.includes(b.id);return `<div class="dev-build-row"><div><b>${esc(b.name[zh?1:0])}</b><small>${done?enzh(zh,'Built','已建成'):!check.ok?enzh(zh,check.reason==='labor'?'Unavailable: local population below 6,000':check.reason==='road'?'Unavailable: build a local road first':check.reason==='harvest'?'Unavailable: no local grain harvest':`Unavailable: ${check.reason}`,`不可建：${({technology:'缺少技术',terrain:'地形不适合',deposit:'缺少矿藏',labor:'当地劳力不足',queue:'队列占用或已建成',treasury:'国库不足',materials:'材料不足',coast:'需要海岸',water:'需要水源',settlement:'需要大型聚落',port:'需要港口',road:'需要当地已建道路',harvest:'当地没有粮食收成'})[check.reason]||check.reason}`):`${b.months}${enzh(zh,' months','个月')} · ${Object.entries(b.materials).map(([k,v])=>`${k} ${v}`).join(', ')}`}</small></div><button class="action" data-build="${b.id}" ${check.ok?'':'disabled'}>${enzh(zh,'Build','建造')} · ${check.cost||b.cost}¤</button></div>`}).join('')}</section>`;
}
export function openInscriptionEditor(button,lang,owner,onSubmit){
  const row=button.closest('.dev-build-row');
  if(!row||row.querySelector('.dev-inscription-editor'))return;
  const zh=lang==='zh',roman=['caesar','senate'].includes(owner);
  const form=document.createElement('form');
  form.className='dev-inscription-editor';
  form.innerHTML=`<label>${enzh(zh,'Draft the inscription','撰写石刻铭文')}<textarea maxlength="120" rows="3" required aria-label="${enzh(zh,'Inscription text','铭文正文')}" placeholder="${enzh(zh,'Write a civic dedication in a form suited to this culture and era.','写下符合本国文化与时代的公共纪念文字。')}"></textarea></label><p class="hint">${enzh(zh,'A civic dedication is part of this monument’s record. Avoid modern titles or claims about events that have not happened. Maximum 120 characters.','这段公共纪念文字会保存在石碑记录中。避免现代头衔或尚未发生的事件。最多120字。')}</p><blockquote class="dev-inscription" aria-live="polite"></blockquote><small class="dev-inscription-count">0 / 120</small><div class="dev-inscription-actions"><button class="action" type="submit">${enzh(zh,'Begin construction','开始建造')}</button><button class="action" type="button" data-inscription-cancel>${enzh(zh,'Cancel','取消')}</button></div>`;
  const input=form.querySelector('textarea'),preview=form.querySelector('blockquote'),count=form.querySelector('.dev-inscription-count');
  if(roman)input.value='SENATVS POPVLVSQVE ROMANVS';
  const update=()=>{preview.textContent=input.value.trim()||enzh(zh,'Your inscription will appear here.','铭文将在这里预览。');count.textContent=`${input.value.length} / 120`};
  input.addEventListener('input',update);update();
  form.querySelector('[data-inscription-cancel]').onclick=()=>{row.classList.remove('editor-open');button.hidden=false;form.remove();button.focus()};
  form.onsubmit=event=>{event.preventDefault();const text=input.value.trim();if(!text){input.focus();return}onSubmit(text)};
  row.classList.add('editor-open');button.hidden=true;row.append(form);input.focus();
}
function purchaseRequestsHtml(s,zh,d){
 const rows=(d.purchaseRequests||[]).map(request=>{
  const item=(request.branch==='material'?MATERIALS:IDEAS).find(x=>x.id===request.id);
  const buyer=s.factions[request.buyer],recipient=s.development[request.buyer];if(!item||!buyer||!recipient)return '';
  const relation=s.relations[[s.player,request.buyer].sort().join(':')]??0;
  const war=s.wars.some(w=>w.includes(s.player)&&w.includes(request.buyer));
  const pending=recipient.trade.some(t=>t.branch===request.branch&&t.id===request.id)||recipient.research?.branch===request.branch&&recipient.research.id===request.id;
  const price=Math.max(12,Math.round(item.cost*.9));
  const eligible=!war&&relation>=15&&(!guardedKnowledge.has(item.id)||relation>=30)&&buyer.treasury>=price+24&&!pending&&!recipient[request.branch==='material'?'knownMaterial':'knownIdeas'].includes(item.id);
  return `<div class="dev-build-row"><div><b>${esc(item.name[zh?1:0])}</b><small>${factionLabel(request.buyer,zh)} · ${enzh(zh,'requests your knowledge','请求购买己方知识')} · ${Math.max(0,request.remaining)}${enzh(zh,'m left','个月后失效')}</small></div><button class="action" data-accept-purchase-buyer="${esc(request.buyer)}" data-purchase-branch="${esc(request.branch)}" data-purchase-id="${esc(request.id)}" ${eligible?'':'disabled'}>${enzh(zh,'Sell','出售')} · +${price}¤</button><button class="action" data-decline-purchase-buyer="${esc(request.buyer)}" data-purchase-branch="${esc(request.branch)}" data-purchase-id="${esc(request.id)}">${enzh(zh,'Decline','拒绝')}</button></div>`;
 }).join('');
 return rows?`<h4>${enzh(zh,'Requests to buy your knowledge','购买己方知识的请求')}</h4>${rows}`:'';
}
function exchangeRequestsHtml(s,zh,d){
 const rows=(d.exchangeRequests||[]).map(request=>{
  const partner=s.factions[request.partner],other=s.development[request.partner];if(!partner||!other)return '';
  const relation=s.relations[[s.player,request.partner].sort().join(':')]??0;
  const valid=!s.wars.some(w=>w.includes(s.player)&&w.includes(request.partner))&&relation>=20&&(!guardedKnowledge.has(request.offerId)&&!guardedKnowledge.has(request.wantId)||relation>=30)&&s.factions[s.player].treasury>=8&&partner.treasury>=8&&d[request.wantBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.wantId)&&!d[request.offerBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.offerId)&&other[request.offerBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.offerId)&&!other[request.wantBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.wantId)&&!d.trade.some(t=>t.branch===request.offerBranch&&t.id===request.offerId)&&!other.trade.some(t=>t.branch===request.wantBranch&&t.id===request.wantId)&&!(d.research?.branch===request.offerBranch&&d.research.id===request.offerId)&&!(other.research?.branch===request.wantBranch&&other.research.id===request.wantId);
  const attrs=`data-exchange-request-partner="${esc(request.partner)}" data-exchange-request-offer-branch="${esc(request.offerBranch)}" data-exchange-request-offer-id="${esc(request.offerId)}" data-exchange-request-want-branch="${esc(request.wantBranch)}" data-exchange-request-want-id="${esc(request.wantId)}"`;
  return `<div class="dev-build-row"><div><b>${factionLabel(request.partner,zh)} · ${enzh(zh,'Knowledge exchange','知识交换')}</b><small>${enzh(zh,'Receive','获得')} ${knowledgeLabel(request.offerBranch,request.offerId,zh)} · ${enzh(zh,'Give','提供')} ${knowledgeLabel(request.wantBranch,request.wantId,zh)} · ${Math.max(0,request.remaining)}${enzh(zh,'m left','个月后失效')}</small></div><button class="action" data-accept-exchange-request ${attrs} ${valid?'':'disabled'}>${enzh(zh,'Accept','接受')} · 8¤</button><button class="action" data-decline-exchange-request ${attrs}>${enzh(zh,'Decline','拒绝')}</button></div>`;
 }).join('');
 return rows?`<h4>${enzh(zh,'Knowledge exchange proposals','知识交换提议')}</h4>${rows}`:'';
}
function agreementRequestsHtml(s,zh,d){
 const rows=(d.agreementRequests||[]).map(request=>{
  const check=knowledgeAgreementCheck(s,s.player,request.partner);
  const date=zh?`${request.sentYear<0?'前':''}${Math.abs(request.sentYear)}年${request.sentMonth}月`:`${request.sentMonth}/${Math.abs(request.sentYear)} ${request.sentYear<0?'BCE':'CE'}`;
  return `<div class="dev-build-row"><div><b>${factionLabel(request.partner,zh)} · ${enzh(zh,'Knowledge-sharing proposal','知识共享提议')}</b><small>${enzh(zh,'Sent','发出于')} ${date} · ${request.remaining}${enzh(zh,'m left','个月后失效')} · ${enzh(zh,'each side pays 20 treasury on acceptance','接受时双方各付20国库')}</small></div><button class="action" data-accept-knowledge-agreement-request="${esc(request.partner)}" ${check.ok?'':'disabled'}>${enzh(zh,'Accept','接受')} · 20¤</button><button class="action" data-decline-knowledge-agreement-request="${esc(request.partner)}">${enzh(zh,'Decline','拒绝')}</button></div>`;
 }).join('');
 return rows?`<h4>${enzh(zh,'Proposed knowledge-sharing agreements','知识共享协定提议')}</h4>${rows}`:'';
}
function knowledgeAgreementsHtml(s,zh,partners){
 const active=s.knowledgeAgreements.filter(a=>a.a===s.player||a.b===s.player).map(a=>{
  const partner=a.a===s.player?a.b:a.a;
  return `<div class="dev-build-row"><div><b>${factionLabel(partner,zh)}</b><small>${enzh(zh,'Agreement active','协定生效中')} · ${a.remaining}${enzh(zh,'m left','个月剩余')} · ${a.next}${enzh(zh,'m to next exchange','个月后下次传递')}</small></div><button class="action" data-cancel-knowledge-agreement="${esc(partner)}">${enzh(zh,'End agreement','终止协定')}</button></div>`;
 }).join('');
 const available=partners.filter(([id])=>!s.knowledgeAgreements.some(a=>a.a===s.player&&a.b===id||a.a===id&&a.b===s.player)).map(([id])=>{
  const check=knowledgeAgreementCheck(s,s.player,id);
  return `<button class="action" data-negotiate-knowledge-agreement="${esc(id)}" ${check.ok?'':'disabled'}>${enzh(zh,'Negotiate with','与其缔结协定')} ${factionLabel(id,zh)} · 20¤ / 12${enzh(zh,'m','个月')}</button>`;
 }).join('');
 return `<h4>${enzh(zh,'Knowledge-sharing agreements','知识共享协定')}</h4><p class="hint">${enzh(zh,'Both sides pay 20 treasury and need relations of 45 or better plus knowledge each can share. Every three months, up to one nonstrategic invention from each side starts a two-month transfer. War or relations below 20 ends the agreement; adoption and construction still require separate action.','双方各付20国库，关系须至少45，且双方都有可分享的知识。每三个月，双方各有最多一项非战略性发明开始为期两个月的传递。战争或关系低于20会终止协定；理念装配与建筑建造仍须另行操作。')}</p>${active}${available}`;
}
const civilianKnowledgeRouteOpen=(s,partner)=>knowledgeTransitStatus(s,s.player,{seller:partner})==='open';
const civilianRouteNote=(s,partner,zh)=>civilianKnowledgeRouteOpen(s,partner)?'':` · ${enzh(zh,'No civilian route','民间通道中断')}`;
export function tradePanel(s,lang){
  const zh=lang==='zh',d=development(s,s.player),partners=Object.entries(s.development).filter(([id])=>id!==s.player&&s.regions.some(r=>r.owner===id));
  const offers=partners.flatMap(([id,other])=>['material','idea'].flatMap(branch=>other[branch==='material'?'knownMaterial':'knownIdeas'].filter(k=>!d[branch==='material'?'knownMaterial':'knownIdeas'].includes(k)).map(k=>({id,branch,item:(branch==='material'?MATERIALS:IDEAS).find(x=>x.id===k)})))).filter(x=>x.item);
  const ownOffers=(other)=>['material','idea'].flatMap(branch=>d[branch==='material'?'knownMaterial':'knownIdeas'].filter(k=>!other[branch==='material'?'knownMaterial':'knownIdeas'].includes(k)&&!other.trade.some(t=>t.branch===branch&&t.id===k)&&!(other.research?.branch===branch&&other.research.id===k)).map(id=>({branch,id,item:(branch==='material'?MATERIALS:IDEAS).find(x=>x.id===id)}))).filter(x=>x.item);
  const sales=partners.flatMap(([buyer,other])=>ownOffers(other).map(offer=>{const price=Math.max(12,Math.round(offer.item.cost*.9)),relation=s.relations[[s.player,buyer].sort().join(':')]??0,war=s.wars.some(w=>w.includes(s.player)&&w.includes(buyer));return `<div class="dev-build-row"><div><b>${esc(offer.item.name[zh?1:0])}</b><small>${enzh(zh,'Sell to','售予')} ${factionLabel(buyer,zh)} · ${enzh(zh,'relations','关系')} ${relation}${civilianRouteNote(s,buyer,zh)}</small></div><button class="action" data-sell-buyer="${buyer}" data-sell-branch="${offer.branch}" data-sell-id="${offer.id}" ${war||!civilianKnowledgeRouteOpen(s,buyer)||relation<15||(guardedKnowledge.has(offer.id)&&relation<30)||other.research?.branch===offer.branch&&other.research.id===offer.id||other.trade.some(t=>t.branch===offer.branch&&t.id===offer.id)||s.factions[buyer].treasury<price+24?'disabled':''}>${enzh(zh,'Sell expertise','出售知识')} · +${price}¤</button></div>`})).join('');
  const visits=partners.map(([id])=>{const check=scholarVisitCheck(s,s.player,id),topics=scholarVisitTopics(s,s.player,id);return `<div class="dev-build-row"><div><b>${enzh(zh,'Instruction from','技术指导来自')} ${factionLabel(id,zh)}</b><small>${check.ok?`24¤ / ${check.travel}${enzh(zh,'m travel','个月行程')} + 6${enzh(zh,'m study','个月指导')}`:enzh(zh,'Unavailable under current conditions','当前条件下不可委托')}</small></div><label class="dev-trade-offer">${enzh(zh,'Subject','课题')} <select data-scholar-topic="${id}" ${topics.length?'':'disabled'}>${topics.map(({branch,item})=>`<option value="${branch}:${item.id}">${esc(item.name[zh?1:0])} · ${branch==='material'?enzh(zh,'Material','物质'):enzh(zh,'Idea','理念')}</option>`).join('')}</select></label><button class="action" data-invite-scholar="${id}" ${check.ok?'':'disabled'}>${enzh(zh,'Commission instruction','委托指导')}</button></div>`}).join('');
  const scholarRequests=d.scholarRequests.map(request=>{const check=scholarVisitCheck(s,request.host,s.player,request.branch,request.id,true);return `<div class="dev-build-row"><div><b>${enzh(zh,'Instruction request from','技术指导请求来自')} ${factionLabel(request.host,zh)}</b><small>${knowledgeLabel(request.branch,request.id,zh)} · ${request.remaining}${enzh(zh,'m to decide','个月内答复')} · ${enzh(zh,'Your court receives 10¤ if accepted','接受后本国获得10国库')}</small></div><button class="action" data-accept-scholar-host="${esc(request.host)}" data-scholar-branch="${esc(request.branch)}" data-scholar-id="${esc(request.id)}" ${check.ok?'':'disabled'}>${enzh(zh,'Accept','接受')}</button><button class="action" data-decline-scholar-host="${esc(request.host)}" data-scholar-branch="${esc(request.branch)}" data-scholar-id="${esc(request.id)}">${enzh(zh,'Decline','拒绝')}</button></div>`}).join('');
  const selectors=partners.map(([id,other])=>{const available=ownOffers(other);return available.length?`<label class="dev-trade-offer">${enzh(zh,'Offer to','向其提供')} ${factionLabel(id,zh)} <select data-exchange-offer="${id}">${available.map(x=>`<option value="${x.branch}:${x.id}">${esc(x.item.name[zh?1:0])}</option>`).join('')}</select></label>`:''}).join('');
  const incoming=d.offers.map(offer=>{const item=(offer.branch==='material'?MATERIALS:offer.branch==='idea'?IDEAS:[]).find(x=>x.id===offer.id);if(!item)return '';const price=Math.max(12,Math.round(item.cost*.9)),relation=s.relations[[s.player,offer.seller].sort().join(':')]??0,war=s.wars.some(w=>w.includes(s.player)&&w.includes(offer.seller)),pending=d.trade.some(t=>t.branch===offer.branch&&t.id===offer.id)||d.research?.branch===offer.branch&&d.research.id===offer.id,eligible=!war&&civilianKnowledgeRouteOpen(s,offer.seller)&&relation>=15&&(!guardedKnowledge.has(offer.id)||relation>=30)&&s.factions[s.player].treasury>=price&&!pending&&!d[offer.branch==='material'?'knownMaterial':'knownIdeas'].includes(offer.id);return `<div class="dev-build-row"><div><b>${esc(item.name[zh?1:0])}</b><small>${factionLabel(offer.seller,zh)} · ${Math.max(0,Number(offer.remaining)||0)}${enzh(zh,'m left','个月后失效')} · ${price}¤${civilianRouteNote(s,offer.seller,zh)}</small></div><button class="action" data-accept-offer-seller="${esc(offer.seller)}" data-offer-branch="${esc(offer.branch)}" data-offer-id="${esc(offer.id)}" ${eligible?'':'disabled'}>${enzh(zh,'Accept','接受')}</button><button class="action" data-decline-offer-seller="${esc(offer.seller)}" data-offer-branch="${esc(offer.branch)}" data-offer-id="${esc(offer.id)}">${enzh(zh,'Decline','拒绝')}</button></div>`}).join('');
  return `<section class="dev-category"><h3>${enzh(zh,'Knowledge & Innovation Trade','知识与发明交易')}</h3>${knowledgeAgreementsHtml(s,zh,partners)}${agreementRequestsHtml(s,zh,d)}${incoming}${purchaseRequestsHtml(s,zh,d)}${exchangeRequestsHtml(s,zh,d)}<p class="hint">${enzh(zh,'Peacetime trade needs nonnegative relations and treasury. Purchases arrive in two months; exchanges take three. Material knowledge does not build anything; foreign ideas still require adoption.','和平交易需要非负外交关系与国库；购买知识两个月后送达，交换需三个月。技术不自动建造，外国理念仍需装配。')}</p>${inTransitHtml(s,d,zh)}${offers.map(x=>{const relation=s.relations[[s.player,x.id].sort().join(':')]||0,war=s.wars.some(w=>w.includes(s.player)&&w.includes(x.id)),price=Math.max(16,Math.round(x.item.cost*1.3)),pending=d.trade.some(t=>t.id===x.item.id&&t.branch===x.branch)||d.research?.branch===x.branch&&d.research.id===x.item.id;return `<div class="dev-build-row"><div><b>${esc(x.item.name[zh?1:0])}</b><small>${factionLabel(x.id,zh)} · ${x.branch==='material'?enzh(zh,'Material','物质'):enzh(zh,'Idea','理念')} · ${enzh(zh,'relations','关系')} ${relation}${civilianRouteNote(s,x.id,zh)}</small></div><button class="action" data-trade-seller="${x.id}" data-trade-branch="${x.branch}" data-trade-id="${x.item.id}" ${war||!civilianKnowledgeRouteOpen(s,x.id)||relation<0||(guardedKnowledge.has(x.item.id)&&relation<30)||pending||s.factions[s.player].treasury<price?'disabled':''}>${enzh(zh,'Purchase','购入')} · ${price}¤</button>${ownOffers(s.development[x.id]).length?`<button class='action' data-exchange-partner='${x.id}' data-exchange-branch='${x.branch}' data-exchange-id='${x.item.id}' ${war||!civilianKnowledgeRouteOpen(s,x.id)||relation<20||pending||s.factions[s.player].treasury<8?'disabled':''}>${enzh(zh,'Exchange','交换')} · 8¤ / 3${enzh(zh,'m','月')}</button>`:''}</div>`}).join('')||`<p class="hint">${enzh(zh,'No eligible offers currently available.','目前没有可交易的知识。')}</p>`}<h4>${enzh(zh,'Offer your knowledge','提供己方知识')}</h4>${selectors}<h4>${enzh(zh,'Visiting scholars','来访学者')}</h4><p class="hint">${enzh(zh,'Choose a subject actually known to another court. That court may refuse; if it agrees, a civilian delegation follows a dated route before six months of guidance. War or a closed route can end the visit. Guidance helps research but grants no knowledge or building.','从其他王廷确实掌握的知识中选定课题。对方可以拒绝；同意后，民间技术代表沿可通行路线前来，抵达后指导六个月。战争或路线中断会终止访问。指导有助于研究，但不直接授予知识或建筑。')}</p>${scholarRequests}${visitingScholarStatus(d,zh,s)}${visits}<h4>${enzh(zh,'Sell expertise','出售知识')}</h4>${sales}</section>`;
}
export function developmentPanel(s,lang,branch){
  const zh=lang==='zh';
  const reference=branch==='material'?`<details class="dev-reference"><summary>${enzh(zh,'Building reference · costs and effects','建筑图鉴 · 费用与效果')}</summary>${BUILDINGS.map(b=>{const invention=MATERIALS.find(x=>x.id===b.tech);return `<article data-building-reference="${esc(b.id)}"><div class="dev-reference-heading"><span class="dev-reference-art" aria-hidden="true">${buildingIllustration(b)}</span><div><b>${esc(b.name[zh?1:0])}</b><small>${esc(b.name[zh?0:1])} · ${b.cost}¤ · ${b.months}${enzh(zh,' months','个月')} · ${enzh(zh,'upkeep','维护')} ${b.upkeep}¤</small></div></div><p>${esc((b.context||invention.context)[zh?1:0])}</p><div class="dev-effects">${effectsText(b.effects,zh)}</div>${sourceLink(b.source?b:invention,zh)}</article>`}).join('')}</details>`:'';
  return `<div class="dev-zoom"><span>${zh?'后续阶段':'LATER STAGES'}</span><button data-tree-pan="left" aria-label="${zh?'查看前一阶段':'Show earlier stages'}">←</button><button data-tree-pan="right" aria-label="${zh?'查看后一阶段':'Show later stages'}">→</button><span>${zh?'缩放':'ZOOM'}</span><button data-tree-zoom="out" aria-label="${zh?'缩小':'Zoom out'}">−</button><button data-tree-zoom="in" aria-label="${zh?'放大':'Zoom in'}">+</button></div>`+developmentPanelContent(s,lang,branch)+figurePanel(s,zh)+reference;
}
let linkResizeObserver;
export function bindDevelopmentTreeNavigation(root,lang='en'){
 const tree=root.querySelector('.dev-tree');if(!tree)return;
 root.querySelector('.dev-lane-nav')?.remove();
 const inspector=tree.closest('.inspector, .selection'),nav=document.createElement('nav');
 nav.className='dev-lane-nav';nav.setAttribute('aria-label',lang==='zh'?'研究分支':'Research branches');
 for(const lane of tree.querySelectorAll('.dev-tree-lane')){
  const button=document.createElement('button');button.type='button';button.dataset.devJump=lane.dataset.devLane;
  button.textContent=lane.querySelector('h3').textContent;
  button.onclick=()=>{inspector.scrollTop+=lane.getBoundingClientRect().top-inspector.getBoundingClientRect().top-nav.getBoundingClientRect().height-12;tree.scrollLeft=0;update()};
  nav.append(button);
 }
 tree.before(nav);
 tree.addEventListener('click',event=>{
  const link=event.target.closest('.dev-prereq-link');if(!link)return;
  const target=tree.querySelector(link.getAttribute('href'));if(!target)return;
  event.preventDefault();
  inspector.scrollTop+=target.getBoundingClientRect().top-nav.getBoundingClientRect().bottom-10;
  tree.scrollLeft+=target.getBoundingClientRect().left-tree.getBoundingClientRect().left-12;
  target.tabIndex=-1;target.focus({preventScroll:true});update();
 });
 const previous=root.querySelector('[data-tree-pan="left"]'),next=root.querySelector('[data-tree-pan="right"]');
 const update=()=>{previous.disabled=tree.scrollLeft<=1;next.disabled=tree.scrollLeft+tree.clientWidth>=tree.scrollWidth-1};
 previous.onclick=()=>{tree.scrollLeft-=Math.max(240,tree.clientWidth*.8)};
 next.onclick=()=>{tree.scrollLeft+=Math.max(240,tree.clientWidth*.8)};
 const drawLinks=()=>{for(const steps of tree.querySelectorAll('.dev-tree-steps')){
  const svg=steps.querySelector('.dev-tree-links'),cards=new Map([...steps.querySelectorAll('[data-tech-node]')].map(card=>[card.dataset.techNode,card]));
  const bounds=steps.getBoundingClientRect(),scale=bounds.width/(steps.offsetWidth||bounds.width)||1,width=steps.scrollWidth,height=steps.scrollHeight;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
  const lines=[];for(const child of cards.values())for(const id of (child.dataset.prerequisites||'').split(' ').filter(Boolean)){
   const parent=cards.get(id);if(!parent)continue;
   const a=parent.getBoundingClientRect(),b=child.getBoundingClientRect(),x1=(a.right-bounds.left)/scale,y1=(a.top+a.height/2-bounds.top)/scale,x2=(b.left-bounds.left)/scale,y2=(b.top+b.height/2-bounds.top)/scale,bend=Math.max(20,(x2-x1)*.45);
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`);path.dataset.from=id;path.dataset.to=child.dataset.techNode;lines.push(path);
  }
  svg.replaceChildren(...lines);
 }};
 let scheduled=false;const refresh=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(tree.isConnected)drawLinks()})};
 linkResizeObserver?.disconnect();linkResizeObserver=new ResizeObserver(refresh);
 for(const steps of tree.querySelectorAll('.dev-tree-steps')){linkResizeObserver.observe(steps);for(const card of steps.querySelectorAll('[data-tech-node]'))linkResizeObserver.observe(card)}
 const focusLink=id=>{tree.classList.toggle('dev-link-focused',!!id);for(const path of tree.querySelectorAll('.dev-tree-links path'))path.classList.toggle('emphasis',!!id&&(path.dataset.from===id||path.dataset.to===id))};
 tree.addEventListener('pointerover',event=>{const card=event.target.closest('[data-tech-node]');if(card)focusLink(card.dataset.techNode)});
 tree.addEventListener('pointerout',event=>{if(!event.relatedTarget?.closest?.('[data-tech-node]'))focusLink(null)});
 tree.addEventListener('focusin',event=>{const card=event.target.closest('[data-tech-node]');if(card)focusLink(card.dataset.techNode)});
 tree.addEventListener('focusout',event=>{if(!event.relatedTarget?.closest?.('[data-tech-node]'))focusLink(null)});
 tree.addEventListener('scroll',update,{passive:true});update();refresh();
}
export function constructionPanel(s,lang,r){
  const inscriptions=(r?.inscriptions||[]).map(record=>`<blockquote class="dev-inscription">${esc(record.text)}<small>${record.month}/${Math.abs(record.year)} BCE</small></blockquote>`).join('');
  if(!r||r.owner!==s.player)return '';
  const zh=lang==='zh',d=development(s,s.player);
  const purchases=`<div class="dev-material-buy"><p>${enzh(zh,'Acquire construction materials from merchants','向商人采购建筑材料')}</p>${[['stone','石材',10],['timber','木材',10],['metal','金属',20]].map(([kind,label,cost])=>`<button data-buy-material="${kind}" ${s.factions[s.player].treasury<cost||d.materials[kind]>=100?'disabled':''}>${enzh(zh,kind,label)} +5 · ${cost}¤</button>`).join('')}</div>`;
  const mineKnown=d.knownMaterial.includes('metal-extraction'),mineSite=r.terrain==='hills'&&(s.grandMap?r.resource==='metal':r.buildings.includes('mine'));
  const mineNote=(r.buildings.includes('mine')||mineKnown&&mineSite)?`<p class="dev-status">${enzh(zh,'Mine labor','矿场劳力')}: ${Number.isFinite(r.population)?r.population.toLocaleString():enzh(zh,'unrecorded','未记录')} · ${r.buildings.includes('mine')?`${enzh(zh,'current metal output','当前金属产量')} ${mineMetalOutput(r)}/${enzh(zh,'month','月')} · `:''}${enzh(zh,'6,000 people for full output; 3,000–5,999 for half output. Maintenance continues even if production stops.','人口达到6,000时满产；3,000–5,999时产量减半。停产时仍需维护。')}</p>`:'';
  return constructionPanelBase(s,lang,r,mineNote)+purchases+(inscriptions?`<section class="dev-inscriptions"><h3>${zh?'石刻铭文':'Stone inscriptions'}</h3>${inscriptions}</section>`:'');
}
