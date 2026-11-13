import {reconReports} from './reconnaissance.js?v=9';

const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=(y,m,z)=>y==null?'—':m+'/'+Math.abs(y)+' '+(z?'公元前':'BCE');
const labels={
 'highly credible':['Highly Credible','高度可信'],confirmed:['Confirmed','已确认'],unverified:['Unverified','未经核实'],rumor:['Rumor','传闻'],disputed:['Disputed','存在争议'],outdated:['Outdated','已过时'],unknown:['Unknown','未知'],
 scouts:['Scouts','斥候'],probe:['Military probe','接敌试探'],battle:['Battle contact','战场接触'],low:['Low','低'],medium:['Medium','中'],high:['High','高'],moderate:['Moderate','中'],possible:['Possible','可能'],
 plain:['Plain','平原'],hills:['Hills','丘陵'],forest:['Forest','森林'],urban:['Urban','城市'],desert:['Desert','沙漠'],
 'high uncertainty':['High uncertainty','高度不确定'],uncertain:['Uncertain','不确定'],
 'enemy formations suspected in theater':['Enemy formations suspected','疑似敌军在战区内'],
 'no formation found on observed route':['No formation found on observed route','观察路线未发现敌军'],
 'positions unconfirmed':['Positions unconfirmed','部署未确认']
 ,'battlefield contact':['Battlefield contact','战场接触']
};
const local=(x,z)=>labels[x]?.[z?1:0]??x;
const range=(r,z)=>r?.min!=null?r.min.toLocaleString()+'–'+r.max.toLocaleString():(z?'未知':'Unknown');
export function fortificationText(s,observer,regionId,lang){
 const site=s.regions.find(r=>r.id===regionId),z=lang==='zh';
 if(!site)return z?'未知':'Unknown';
 if(site.owner===observer)return Number.isFinite(Number(site.fort))?String(Math.max(0,Math.round(Number(site.fort)))):(z?'未知':'Unknown');
 const report=reconReports(s,observer,regionId).find(r=>r.defensive?.fort!=null);
 if(!report)return z?'未知':'Unknown';
 const fort=Number(report.defensive.fort);
 if(!Number.isFinite(fort)||fort<0)return z?'未知':'Unknown';
 const observed=safe(date(report.observationYear,report.observationMonth,z));
 return `≈${Math.round(fort)} · ${observed}${report.age>2?(z?' · 可能过时':' · may be outdated'):''}`;
}
export function intelligenceHtml(a,r,lang){
 if(!a)return '';
 const z=lang==='zh',report=a.report;
 const rows=[
  [z?'己方兵力／士气':'Friendly strength / morale',a.friendly.toLocaleString()+' / '+a.morale],
  [z?'指挥官／补给':'Commander / supply',safe(a.commander[z?1:0])+' / '+a.supply+'%'],
  [z?'已知地形／敌方工事':'Known terrain / enemy works',safe(local(a.terrain,z))+' / '+(a.fort==null?(z?'未知':'Unknown'):`≈${safe(a.fort)} (${safe(date(a.fortReport?.observationYear,a.fortReport?.observationMonth,z))})`)],
  [z?'敌军估计':'Enemy estimate',range(report,z)],
  [z?'最后目击地点':'Last reported presence',report||a.sighting?safe(r.name?.[z?1:0]??a.regionId):(z?'未知':'Unknown')],
  [z?'情报来源':'Source',report?safe(local(report.source,z)):a.sighting?(z?'边境目击':'Frontier sighting'):(z?'无':'None')],
  [z?'观察日期／送达日期':'Observed / arrived',report?date(report.observationYear??report.year,report.observationMonth??report.month,z)+' / '+date(report.arrivalYear??report.year,report.arrivalMonth??report.month,z):a.sighting?date(a.sighting.year,a.sighting.month,z):(z?'无':'None')],
  [z?'可信度／时效':'Confidence / age',safe(local(report?.confidence??(a.sighting?'rumor':'unknown'),z))+' / '+(report?report.age+' '+(z?'月':'months'):(z?'未知':'unknown'))],
  [z?'来源可靠度／互证':'Reliability / corroboration',report?safe(local(report.reliability,z))+' / '+(report.corroborated?(z?'有':'Yes'):report.disputed?(z?'互相矛盾':'Conflicting'):(z?'无':'No')):(z?'未知':'Unknown')],
  [z?'部署／误报风险':'Positions / misinformation',safe(local(report?.positions??'positions unconfirmed',z))+' / '+safe(local(report?.misinformationRisk??'high',z))],
  [z?'行军时间／敌方增援':'Travel / enemy reinforcement',a.travelMonths+' '+(z?'月':'months')+' / '+safe(local(a.reinforcementRisk,z))],
  [z?'登陆风险':'Landing risk',a.landing?(z?'海上登陆会削弱进攻准备；沿岸防御未知。':'Seaborne landing reduces attack readiness; coastal defenses may be unknown.'):(z?'无海上登陆':'No seaborne landing')]
 ];
 const comparisons=(a.reports||[]).length>1?'<details class="intel-comparison"><summary>'+(z?'比较情报报告':'Compare intelligence reports')+' ('+a.reports.length+')</summary>'+a.reports.map(x=>'<p>'+safe(local(x.source,z))+' · '+date(x.observationYear,x.observationMonth,z)+' · '+range(x,z)+' · '+safe(local(x.confidence,z))+'</p>').join('')+'</details>':'';
 return '<section class="prebattle-intel"><h3>'+(z?'战前情报评估':'PRE-BATTLE INTELLIGENCE')+'</h3><dl>'+rows.map(([key,value])=>'<dt>'+key+'</dt><dd>'+value+'</dd>').join('')+'</dl>'+comparisons+'<p class="risk-warning">'+(z?'风险：':'Risk: ')+safe(local(a.risk,z))+' · '+(z?'敌军可能移动、增援或伪装。侦察有成本，仍不能保证胜利。':'Enemy forces may move, reinforce or deceive. Reconnaissance costs time and cannot guarantee victory.')+'</p></section>';
}
export function afterActionHtml(b,player,lang){
 const z=lang==='zh',own=b.attacker.owner===player?'attacker':'defender',loss=own==='attacker'?b.lossA:b.lossD,intel=own==='attacker'?b.preBattleIntel:b.meeting?b.defenderPreBattleIntel:null;
 const known=intel?(intel.report?range(intel.report,z)+' · '+local(intel.report.confidence,z)+' · '+date(intel.report.observationYear??intel.report.year,intel.report.observationMonth??intel.report.month,z):intel.sighting?(z?'仅有旧目击':'old sighting only'):(z?'敌军兵力未知':'enemy strength unknown')):(b.meeting?(z?'遭遇敌军反向行军':'opposing march encountered'):(z?'防御作战':'defensive battle'));
 const estimate=b.combatEstimate?.[own==='attacker'?'defender':'attacker'];
 const age=intel?.report?Math.max(0,(b.year-(intel.report.observationYear??intel.report.year))*12+b.month-(intel.report.observationMonth??intel.report.month)):null;
 const lessons=[];if(own==='attacker'&&['hills','forest','urban'].includes(b.terrain))lessons.push(z?'进攻受地形制约。':'The attack was constrained by terrain.');if(own==='attacker'&&b.fort>0)lessons.push(z?'敌方工事增加了防御优势。':'Enemy fortifications aided the defense.');if(b[own].supply<.6)lessons.push(z?'己方补给不足削弱了作战准备。':'Poor supply weakened friendly readiness.');if(b[own].commandFactor<.85)lessons.push(z?'指挥效率偏低。':'Command effectiveness was low.');if(age!=null&&age>=3)lessons.push(z?'战前情报已过时，应降低判断把握。':'Prebattle intelligence was old and warranted caution.');
 const ownSide=b[own],terrain=local(b.terrain,z),variation=b.roll<.95?(z?'不利':'unfavorable'):b.roll>1.05?(z?'有利':'favorable'):(z?'接近中性':'near neutral');
 return '<section class="after-action"><h3>'+(z?'战后复盘':'AFTER-ACTION REVIEW')+'</h3><h4>'+(z?'战前已知':'Known before battle')+'</h4><p>'+safe(known)+(age!=null?' · '+(z?'情报距今 ':'Intelligence age ')+age+(z?' 个月':' months'):'')+' · '+(z?'地形':'terrain')+' '+safe(terrain)+' · '+(z?'预计行军':'planned travel')+' '+(intel?.travelMonths??'—')+' '+(z?'月':'months')+'.'+(intel&&!intel.report?(z?' 本次选择在情报不足时进攻。':' The attack was ordered with incomplete intelligence.'):'')+(intel?.landing?(z?' 已知需海上登陆。':' A seaborne landing was planned.'):'')+'</p><h4>'+(z?'接战中观察':'Observed during battle')+'</h4><p>'+(estimate?(z?'敌军接战规模估计 ':'Opposing force estimated at ')+estimate[0].toLocaleString()+'–'+estimate[1].toLocaleString():(z?'遭遇有组织抵抗；确切敌军兵力未知':'Organized opposition; exact enemy strength remains unknown'))+' · '+(z?'己方初始兵力':'Friendly initial strength')+' '+ownSide.men.toLocaleString()+' · '+(z?'己方伤亡':'Friendly casualties')+' '+loss.toLocaleString()+' · '+(z?'地形':'terrain')+' '+safe(terrain)+' · '+(z?'工事':'fortifications')+' '+b.fort+'.</p><h4>'+(z?'战后所得判断':'Learned afterward')+'</h4><p>'+(z?'己方士气':'Friendly morale')+' '+ownSide.morale+' · '+(z?'补给效率':'supply efficiency')+' '+Math.round(ownSide.supply*100)+'% · '+(z?'指挥效率':'command effectiveness')+' '+(ownSide.commandFactor==null?'—':Math.round(ownSide.commandFactor*100)+'%')+' · '+(z?'战场变数':'battlefield variation')+' '+variation+(b.landingFactor<1?' · '+(z?'登陆战力系数':'landing factor')+' '+Math.round(b.landingFactor*100)+'%':'')+'. '+(z?'兵力、经验、战法和防御条件共同影响结果。':'Strength, experience, tactics and defensive conditions all affected the result.')+'</p><p>'+(lessons.length?lessons.join(' '):'')+'</p><p>'+(z?'本战结果：':'Outcome: ')+(b.attackerWins=== (own==='attacker')?(z?'己方获胜。':'Friendly victory.'):(z?'己方战败。':'Friendly defeat.'))+' '+(z?'下次可比较独立报告、派斥候、试探、增援或等待；任何方案都不能保证胜利。':'Next time compare independent reports, scout, probe, reinforce or wait; none guarantees victory.')+'</p></section>';
}
