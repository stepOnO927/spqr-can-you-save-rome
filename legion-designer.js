import {ROUTES} from './data.js?v=phase-x-1';
import {unlockedComponents,focusModifiers} from './national-focus.js?v=separate-crowns-1';
import {politicalAmbition} from './conspiracies.js?v=separate-crowns-1';
import {reportedControl} from './control-intelligence.js?v=fort-intel-1';

// LEGION DESIGNER. Templates are data; an army carries a snapshot of the
// composition it was actually organized into, so editing a template never
// transforms existing armies. All derived numbers feed real systems: battle
// power, march time, monthly upkeep, siege time, scouting and recruitment.
// Values are gameplay abstractions, not reconstructions of exact strengths.
const T=(plain,hills,forest,urban,desert)=>({plain,hills,forest,urban,desert});
const C=(id,cultures,slot,name,desc,stats)=>({id,cultures,slot,name,desc,max:12,requires:null,...stats});
export const CULTURES={caesar:'roman',senate:'roman',egypt:'hellenistic',egypt_claimant:'hellenistic',parthia:'parthian',parthia_claimant:'parthian',armenia:'armenian',numidia:'african',mauretania:'african',galatia:'galatian',bosporus:'bosporan',rebels:'roman'};
export const COMPONENTS=Object.fromEntries([
 // Roman (late Republic)
 C('cohort',['roman'],'main',['Legionary cohort','军团大队'],['Heavy infantry with pilum and gladius; the main Roman unit of maneuver. Strength varied in practice.','装备重标枪与短剑的重步兵，罗马的主要机动单位。实际兵力并不固定。'],{men:480,cost:4,equip:3,upkeep:.44,food:.40,atk:1.0,def:1.05,morale:62,train:2,speed:0,terrain:T(1,1,.95,1,.97),recon:0,siege:.2,supply:0,cavalry:0}),
 C('veteran_cohort',['roman'],'main',['Veteran cohort','老兵大队'],['Long-service soldiers. Steadier and more expensive; requires a focus.','长期服役的士兵。更沉稳也更昂贵；需要国家方针解锁。'],{men:420,cost:6,equip:3,upkeep:.55,food:.38,atk:1.12,def:1.14,morale:74,train:1,speed:0,terrain:T(1,1.02,.97,1.02,.98),recon:0,siege:.3,supply:0,cavalry:0,requires:'veteran_cohort',max:10}),
 C('auxilia',['roman','galatian'],'main',['Allied infantry detachment','同盟步兵分队'],['Provincial or allied infantry; cheaper and lighter than legionaries.','行省或同盟步兵；比军团兵便宜、装备更轻。'],{men:500,cost:2.5,equip:1.5,upkeep:.33,food:.38,atk:.86,def:.9,morale:55,train:1,speed:-.1,terrain:T(.95,1.05,1.05,.95,1),recon:.2,siege:.1,supply:0,cavalry:0}),
 C('roman_cavalry',['roman'],'main',['Cavalry attachment','骑兵附属队'],['Gallic, Germanic or Spanish horse serving with the legions; needs fodder.','随军团作战的高卢、日耳曼或西班牙骑兵；需要草料。'],{men:300,cost:5,equip:4,upkeep:.6,food:.62,atk:1.18,def:.82,morale:60,train:2,speed:-1,terrain:T(1.18,.82,.72,.68,1.08),recon:1,siege:0,supply:0,cavalry:1,max:6}),
 C('light_infantry',['roman','galatian','bosporan'],'support',['Light infantry','轻步兵'],['Skirmishers for broken ground and screening.','用于复杂地形和掩护的散兵。'],{atkBonus:.012,defBonus:.004,terrainBonus:{hills:.012,forest:.015},men:300,cost:1.5,equip:.8,upkeep:.22,food:.24,atk:.82,def:.7,morale:52,train:1,speed:-.6,terrain:T(.9,1.12,1.15,.92,.98),recon:.6,siege:0,supply:0,cavalry:0,max:4}),
 C('slingers',['roman','african','bosporan'],'support',['Slingers','投石兵'],['Balearic or local slingers; effective in sieges and against unarmoured troops.','巴利阿里或本地投石兵；擅长攻城和对付无甲部队。'],{atkBonus:.015,terrainBonus:{urban:.01},men:240,cost:1.5,equip:.5,upkeep:.2,food:.2,atk:.9,def:.6,morale:50,train:1,speed:-.4,terrain:T(1,1.1,.9,1.1,1),recon:.2,siege:.4,supply:0,cavalry:0,max:3}),
 C('archers',['roman','hellenistic','armenian','galatian'],'support',['Archers','弓箭手'],['Cretan or eastern archers supporting the line.','克里特或东方弓箭手，支援战线。'],{atkBonus:.016,terrainBonus:{plain:.006,desert:.006},men:240,cost:2,equip:.8,upkeep:.24,food:.2,atk:.95,def:.62,morale:50,train:2,speed:-.3,terrain:T(1.05,1.08,.85,1.05,1.05),recon:.3,siege:.3,supply:0,cavalry:0,max:3}),
 C('scouts',['roman','hellenistic','armenian','galatian','african','bosporan','parthian'],'support',['Scouts (exploratores)','侦察兵'],['Mounted scouts. Report enemy forces in neighbouring theaters.','骑马侦察兵。报告相邻战区的敌军。'],{atkBonus:.004,men:120,cost:1.5,equip:1,upkeep:.18,food:.18,atk:.5,def:.4,morale:50,train:1,speed:-1,terrain:T(1,1,1,1,1),recon:2,siege:0,supply:0,cavalry:.5,max:2}),
 C('engineers',['roman','hellenistic','galatian'],'support',['Engineers and specialists','工兵与专业人员'],['Fabri, surveyors and workshop crews. Shorten sieges and build camps.','工匠、测量员与工场人员。缩短围城，修筑营地。'],{defBonus:.008,men:150,cost:2,equip:2,upkeep:.25,food:.15,atk:.4,def:.6,morale:50,train:2,speed:.2,terrain:T(1,1,1,1,1),recon:0,siege:1.2,supply:0,cavalry:0,max:2}),
 C('medical',['roman','hellenistic'],'support',['Medical and logistics staff','医护与后勤人员'],['Abstract support that reduces attrition and reinforcement needs.','抽象的支援力量，减少减员和补充需求。'],{defBonus:.006,men:100,cost:1.5,equip:1,upkeep:.2,food:.1,atk:.2,def:.4,morale:58,train:1,speed:.1,terrain:T(1,1,1,1,1),recon:0,siege:0,supply:.04,cavalry:0,max:1}),
 C('baggage',['roman','hellenistic','armenian','galatian','african','bosporan','parthian'],'support',['Baggage and supply train','辎重与补给队'],['Pack animals and wagons. Better sustained supply; slower on difficult ground.','驮畜与车辆。补给更持久；在复杂地形上更慢。'],{terrainBonus:{hills:-.01,forest:-.01},men:200,cost:1.5,equip:1.5,upkeep:.15,food:.1,atk:.2,def:.4,morale:50,train:1,speed:.6,terrain:T(1,1,1,1,1),recon:0,siege:0,supply:.08,cavalry:0,max:2}),
 C('siege_train',['roman','hellenistic'],'support',['Siege equipment','攻城器械'],['Torsion artillery and siege works. Expensive and slow; requires a focus or engineers.','扭力投射器与攻城器械。昂贵且缓慢；需要国家方针或工兵。'],{defBonus:.004,terrainBonus:{urban:.015},men:180,cost:4,equip:6,upkeep:.4,food:.18,atk:.5,def:.7,morale:50,train:2,speed:1,terrain:T(1,.9,.85,1.05,1),recon:0,siege:2,supply:0,cavalry:0,max:2,requires:'siege_train'}),
 // Hellenistic (Ptolemaic)
 C('phalangites',['hellenistic','bosporan'],'main',['Phalangites','方阵兵'],['Pike phalanx; strong frontally on open ground, vulnerable in rough terrain.','长矛方阵；在开阔地正面强大，在崎岖地形中脆弱。'],{men:500,cost:3.5,equip:2.5,upkeep:.4,food:.4,atk:1.0,def:1.18,morale:58,train:3,speed:.1,terrain:T(1.12,.82,.75,.9,1.05),recon:0,siege:.1,supply:0,cavalry:0}),
 C('thureophoroi',['hellenistic','bosporan','galatian'],'main',['Thureophoroi','持盾兵'],['Versatile medium infantry with oval shields.','手持椭圆盾的多用途中步兵。'],{men:450,cost:3,equip:2,upkeep:.36,food:.38,atk:.95,def:.98,morale:56,train:2,speed:-.1,terrain:T(1,1.02,1,1,1),recon:.1,siege:.2,supply:0,cavalry:0}),
 C('gabiniani',['hellenistic'],'main',['Gabinian veterans','加比尼乌斯老兵'],['Roman soldiers settled in Egypt; requires a focus.','定居埃及的罗马士兵；需要国家方针解锁。'],{men:450,cost:5,equip:3,upkeep:.5,food:.4,atk:1.08,def:1.08,morale:64,train:1,speed:0,terrain:T(1,1,.95,1,.98),recon:0,siege:.3,supply:0,cavalry:0,max:6,requires:'gabiniani'}),
 C('hellenistic_cavalry',['hellenistic','bosporan'],'main',['Royal cavalry','王家骑兵'],['Hellenistic lancers recruited from settler families.','从定居者家庭中招募的希腊化长枪骑兵。'],{men:300,cost:5,equip:4,upkeep:.6,food:.62,atk:1.15,def:.8,morale:58,train:2,speed:-1,terrain:T(1.16,.84,.72,.7,1.1),recon:1,siege:0,supply:0,cavalry:1,max:6}),
 // Parthian
 C('horse_archers',['parthian','armenian','bosporan'],'main',['Horse archers','弓骑兵'],['Mobile mounted archers. Strong in open ground, weak in forests and cities.','机动的骑射手。开阔地强，森林与城市中弱。'],{men:300,cost:4,equip:2.5,upkeep:.5,food:.6,atk:1.15,def:.72,morale:60,train:2,speed:-1,terrain:T(1.22,.86,.65,.6,1.25),recon:1,siege:0,supply:0,cavalry:1,max:10}),
 C('cataphract',['parthian','armenian'],'main',['Cataphracts','铁甲骑兵'],['Armoured lancers on armoured horses; costly and fodder-hungry.','人马皆披甲的长枪骑兵；造价高、草料消耗大。'],{men:240,cost:7,equip:6,upkeep:.8,food:.8,atk:1.3,def:1.0,morale:66,train:3,speed:-.4,terrain:T(1.2,.85,.7,.72,1.1),recon:.3,siege:0,supply:0,cavalry:1,max:6,requires:null}),
 C('foot_levy',['parthian','armenian','african'],'main',['Foot levy','步兵征召兵'],['Lightly equipped infantry raised from subjects.','从臣民中征集的轻装步兵。'],{men:600,cost:1.5,equip:.8,upkeep:.3,food:.42,atk:.75,def:.82,morale:46,train:1,speed:0,terrain:T(.95,1,1,1,.95),recon:0,siege:.2,supply:0,cavalry:0}),
 C('camel_train',['parthian'],'support',['Camel ammunition train','骆驼弹药队'],['Keeps horse archers supplied with arrows; requires a focus.','为弓骑兵补充箭矢；需要国家方针解锁。'],{men:150,cost:2,equip:1.5,upkeep:.2,food:.15,atk:.3,def:.4,morale:50,train:1,speed:-.2,terrain:T(1,.9,.8,.9,1.1),recon:0,siege:0,supply:.06,cavalry:0,max:2,requires:'camel_train',archerBoost:.06}),
 // Armenian
 C('mountain_infantry',['armenian'],'main',['Mountain infantry','山地步兵'],['Highland spearmen; strong in hills; requires a focus.','高原长矛兵；山地作战强大；需要国家方针解锁。'],{men:450,cost:3,equip:1.8,upkeep:.36,food:.36,atk:.95,def:1.08,morale:58,train:2,speed:-.1,terrain:T(.92,1.25,1.08,.95,.9),recon:.2,siege:.2,supply:0,cavalry:0,requires:'mountain_infantry'}),
 // African kingdoms
 C('numidian_cavalry',['african'],'main',['Numidian light cavalry','努米底亚轻骑兵'],['Javelin cavalry riding without bridles; excellent skirmishers.','不用辔头的标枪骑兵；出色的散兵。'],{men:300,cost:3.5,equip:2,upkeep:.45,food:.55,atk:1.1,def:.7,morale:58,train:1,speed:-1,terrain:T(1.18,.95,.8,.65,1.2),recon:1.2,siege:0,supply:0,cavalry:1,max:10}),
 C('moorish_cavalry',['african'],'main',['Moorish horsemen','摩尔骑兵'],['Raiding cavalry from Mauretania; requires a focus.','来自毛里塔尼亚的袭扰骑兵；需要国家方针解锁。'],{men:300,cost:3.5,equip:2,upkeep:.45,food:.55,atk:1.14,def:.72,morale:60,train:1,speed:-1,terrain:T(1.18,1.0,.82,.65,1.22),recon:1.3,siege:0,supply:0,cavalry:1,max:8,requires:'moorish_cavalry'}),
 C('war_elephant',['african'],'support',['War elephants','战象'],['Shock troops that can panic under missile fire; requires a focus.','冲击部队，但在投射火力下可能失控；需要国家方针解锁。'],{atkBonus:.045,defBonus:.01,terrainBonus:{plain:.01,hills:-.03,forest:-.04,urban:-.03},men:120,cost:8,equip:6,upkeep:.9,food:1.2,atk:1.5,def:.9,morale:52,train:3,speed:.5,terrain:T(1.12,.7,.6,.7,1.0),recon:0,siege:.3,supply:0,cavalry:0,max:2,requires:'war_elephant'}),
 // Galatian
 C('galatian_legion',['galatian'],'main',['Galatian legionaries','加拉太军团兵'],['Galatians trained in the Roman manner; requires a focus.','以罗马方式训练的加拉太人；需要国家方针解锁。'],{men:480,cost:4,equip:3,upkeep:.45,food:.4,atk:1.0,def:1.04,morale:60,train:2,speed:0,terrain:T(1,1.02,.97,1,.96),recon:0,siege:.2,supply:0,cavalry:0,requires:'galatian_legion'}),
 C('celtic_warband',['galatian'],'main',['Celtic warband','凯尔特战团'],['Ferocious but less disciplined infantry.','勇猛但纪律较差的步兵。'],{men:550,cost:2,equip:1,upkeep:.3,food:.42,atk:1.08,def:.8,morale:60,train:1,speed:-.1,terrain:T(1,1,1.1,.9,.9),recon:.1,siege:.1,supply:0,cavalry:0}),
 // Bosporan
 C('steppe_cavalry',['bosporan'],'main',['Sarmatian horse','萨尔马提亚骑兵'],['Steppe lancers and archers; requires a focus.','草原长枪骑兵与弓骑兵；需要国家方针解锁。'],{men:300,cost:4.5,equip:3,upkeep:.55,food:.6,atk:1.2,def:.8,morale:60,train:2,speed:-1,terrain:T(1.2,.85,.7,.65,1.15),recon:1,siege:0,supply:0,cavalry:1,max:8,requires:'steppe_cavalry'})
].map(c=>[c.id,c]));
export const CULTURE_NAMES={roman:['Late Republican Roman','共和晚期罗马'],hellenistic:['Ptolemaic Hellenistic','托勒密希腊化'],parthian:['Parthian','帕提亚'],armenian:['Armenian','亚美尼亚'],african:['North African','北非'],galatian:['Galatian','加拉太'],bosporan:['Bosporan','博斯普鲁斯']};
const P=(name,main,support)=>({name,main,support});
export const PRESETS={
 roman:[P(['Standard Field Legion','标准野战军团'],{cohort:10,roman_cavalry:1},{scouts:1,engineers:1,baggage:1}),P(['Mobile Cavalry-Supported Force','机动骑兵支援部队'],{cohort:5,roman_cavalry:4},{scouts:2,light_infantry:2}),P(['Siege-Oriented Formation','攻城型编队'],{cohort:8},{engineers:2,slingers:2,baggage:1})],
 hellenistic:[P(['Royal Phalanx Army','王家方阵军'],{phalangites:6,thureophoroi:2,hellenistic_cavalry:2},{archers:1,baggage:1}),P(['Nile Mobile Force','尼罗河机动部队'],{thureophoroi:4,hellenistic_cavalry:3},{scouts:1,archers:2})],
 parthian:[P(['Cavalry Host','骑兵大军'],{horse_archers:8,cataphract:2},{scouts:1}),P(['Frontier Garrison','边境守备军'],{foot_levy:6,horse_archers:3},{scouts:1,baggage:1})],
 armenian:[P(['Royal Armenian Army','亚美尼亚王军'],{foot_levy:5,cataphract:2,horse_archers:2},{archers:2,baggage:1}),P(['Highland Defense','高地防御军'],{foot_levy:7,horse_archers:1},{archers:2,scouts:1})],
 african:[P(['Numidian Host','努米底亚大军'],{numidian_cavalry:7,foot_levy:3},{slingers:2,scouts:1}),P(['Royal Infantry','王家步兵'],{foot_levy:7,numidian_cavalry:2},{slingers:2,baggage:1})],
 galatian:[P(['Galatian Field Army','加拉太野战军'],{celtic_warband:6,auxilia:2},{archers:1,scouts:1,baggage:1}),P(['Tetrarch’s Guard','四分王卫队'],{celtic_warband:4,thureophoroi:3},{light_infantry:2})],
 bosporan:[P(['Bosporan Army','博斯普鲁斯军'],{phalangites:4,thureophoroi:2,hellenistic_cavalry:2},{slingers:1,scouts:1}),P(['Steppe Raiding Force','草原袭扰部队'],{hellenistic_cavalry:4,thureophoroi:3},{light_infantry:2,scouts:1})]
};
const BASE={upkeepPerMan:1/1100,foodPerMan:1/1200};

// ---------- state ----------
export function formationState(s){s.world.formations||={templates:{},nextId:1,seeded:{}};return s.world.formations}
export function templatesFor(s,owner){return Object.values(formationState(s).templates).filter(t=>t.owner===owner)}
export function cultureOf(owner){return CULTURES[owner]||'roman'}
export function availableComponents(s,owner){const culture=cultureOf(owner),unlocked=new Set(unlockedComponents(s,owner));return Object.values(COMPONENTS).filter(c=>c.cultures.includes(culture)&&(!c.requires||unlocked.has(c.requires)))}
export function seedTemplates(s,owner){
 const st=formationState(s);if(st.seeded[owner]||owner==='rebels'||!s.factions[owner])return;st.seeded[owner]=true;
 for(const p of PRESETS[cultureOf(owner)]||[]){const r=saveTemplate(s,owner,{name:p.name[0],nameZh:p.name[1],main:{...p.main},support:{...p.support}},{preset:true});if(!r.ok)throw Error(`invalid preset for ${owner}: ${r.reason}`)}
}

// ---------- validation and statistics ----------
export function validateTemplate(s,owner,t,{ignoreUnlock=false}={}){
 const culture=cultureOf(owner),unlocked=new Set(unlockedComponents(s,owner)),errors=[];
 let mainUnits=0,supportUnits=0;
 for(const [slot,group] of [['main',t.main||{}],['support',t.support||{}]])for(const [id,n] of Object.entries(group)){
  const c=COMPONENTS[id];if(!c){errors.push(`unknown component ${id}`);continue}
  if(!Number.isInteger(n)||n<0)errors.push(`invalid count for ${id}`);
  if(c.slot!==slot)errors.push(`${id} belongs in ${c.slot}`);
  if(!c.cultures.includes(culture))errors.push(`${id} is not available to ${culture}`);
  if(c.requires&&!ignoreUnlock&&!unlocked.has(c.requires))errors.push(`${id} is locked`);
  if(n>c.max)errors.push(`${id} exceeds ${c.max}`);
  if(slot==='main')mainUnits+=n;else supportUnits+=n;
 }
 if(mainUnits<3)errors.push('at least 3 main units');if(mainUnits>12)errors.push('at most 12 main units');if(supportUnits>6)errors.push('at most 6 support units');
 const st=errors.length?null:templateStats({main:t.main,support:t.support});
 if(st&&(st.personnel<1500||st.personnel>15000))errors.push('personnel must be 1,500–15,000');
 if(t.support?.siege_train&&!t.support?.engineers)errors.push('a siege train needs engineers');
 if(t.support?.camel_train&&!t.main?.horse_archers)errors.push('a camel train needs horse archers');
 return errors;
}
export function templateStats(t,{commander=null,fill=1}={}){
 const rows=[...Object.entries(t.main||{}),...Object.entries(t.support||{})].filter(([,n])=>n>0).map(([id,n])=>({c:COMPONENTS[id],n}));
 const personnel=rows.reduce((v,r)=>v+r.c.men*r.n,0)||1,w=f=>rows.reduce((v,r)=>v+f(r.c)*r.c.men*r.n,0)/personnel,sum=f=>rows.reduce((v,r)=>v+f(r.c)*r.n,0);
 // Fighting quality comes from the main body; attachments add explicit, small effects
 // instead of diluting the line with non-combatants.
 const mainRows=rows.filter(r=>r.c.slot==='main'),mainMen=mainRows.reduce((v,r)=>v+r.c.men*r.n,0)||1,wm=f=>mainRows.reduce((v,r)=>v+f(r.c)*r.c.men*r.n,0)/mainMen;
 const cavalryShare=w(c=>c.cavalry),archers=(t.main?.horse_archers||0)>0?sum(c=>c.archerBoost||0):0;
 const terrain=Object.fromEntries(['plain','hills','forest','urban','desert'].map(k=>[k,Math.round((wm(c=>c.terrain[k])+sum(c=>c.slot==='support'?(c.terrainBonus?.[k]||0):0))*1000)/1000]));
 const speedScore=w(c=>c.speed);
 const s={personnel,recruitCost:Math.round(sum(c=>c.cost)),equipment:Math.round(sum(c=>c.equip)),upkeep:Math.round(sum(c=>c.upkeep)*100)/100,food:Math.round(sum(c=>c.food)*100)/100,
  attack:Math.round((wm(c=>c.atk)+sum(c=>c.slot==='support'?(c.atkBonus||0):0)+archers)*1000)/1000,defense:Math.round((wm(c=>c.def)+sum(c=>c.slot==='support'?(c.defBonus||0):0))*1000)/1000,morale:Math.round(w(c=>c.morale)),training:Math.max(...rows.map(r=>r.c.train),1),
  speed:speedScore<=-.35?'fast':speedScore>=.3?'slow':'normal',speedScore:Math.round(speedScore*100)/100,terrain,recon:Math.round(sum(c=>c.recon)*10)/10,siege:Math.round(sum(c=>c.siege)*10)/10,supply:Math.round(sum(c=>c.supply)*100)/100,cavalryShare:Math.round(cavalryShare*100)/100};
 s.combat=Math.round(personnel*s.attack);s.holding=Math.round(personnel*s.defense);
 s.reinforcePer1000={treasury:Math.round((s.recruitCost+s.equipment)/personnel*1000*.6),manpower:1000};
 s.supplyNeed=Math.round((s.food/personnel*1000)*100)/100;
 s.profile=cavalryShare>=.4?'cavalry':s.siege>=4.5?'siege':cavalryShare<.12&&s.defense>=1.02?'infantry':'mixed';
 if(commander){s.commanderNote=[]}
 return s;
}
export function saveTemplate(s,owner,{id=null,name,nameZh=null,main,support},{preset=false}={}){
 const st=formationState(s),t={main:Object.fromEntries(Object.entries(main||{}).filter(([,n])=>n>0)),support:Object.fromEntries(Object.entries(support||{}).filter(([,n])=>n>0))};
 const errors=validateTemplate(s,owner,t);if(errors.length)return {ok:false,reason:errors[0],errors};
 const label=String(name||'').trim().slice(0,48);if(!label)return {ok:false,reason:'name'};
 if(id){const old=st.templates[id];if(!old||old.owner!==owner)return {ok:false,reason:'unknown'};Object.assign(old,{name:label,nameZh:nameZh||old.nameZh&&old.name===label?old.nameZh:null,main:t.main,support:t.support,version:(old.version||1)+1,updated:[s.year,s.month]});return {ok:true,template:old}}
 const tid=`tpl:${owner}:${st.nextId++}`;st.templates[tid]={id:tid,owner,culture:cultureOf(owner),name:label,nameZh:nameZh||null,main:t.main,support:t.support,version:1,preset,created:[s.year,s.month],updated:[s.year,s.month]};
 return {ok:true,template:st.templates[tid]};
}
export function duplicateTemplate(s,owner,id,name){const t=formationState(s).templates[id];if(!t||t.owner!==owner)return {ok:false,reason:'unknown'};return saveTemplate(s,owner,{name:name||`${t.name} II`,main:t.main,support:t.support})}
export function renameTemplate(s,owner,id,name){const t=formationState(s).templates[id];if(!t||t.owner!==owner)return {ok:false,reason:'unknown'};const label=String(name||'').trim().slice(0,48);if(!label)return {ok:false,reason:'name'};t.name=label;t.nameZh=null;return {ok:true}}
export function deleteTemplate(s,owner,id){const st=formationState(s),t=st.templates[id];if(!t||t.owner!==owner)return {ok:false,reason:'unknown'};delete st.templates[id];return {ok:true}}
export function compareTemplates(s,owner,ids){return ids.map(id=>formationState(s).templates[id]).filter(t=>t&&t.owner===owner).map(t=>({id:t.id,name:t.name,stats:templateStats(t)}))}

// ---------- commanders ----------
// Simulated military specialties for gameplay; not claims about historical skill.
const SPECIALTIES={caesar:{cavalry:1,engineering:3,caution:1},labienus:{cavalry:3,engineering:1,caution:0},pompey:{cavalry:1,engineering:1,caution:2},antony:{cavalry:2,engineering:0,caution:0},scipio:{cavalry:0,engineering:0,caution:2},pacorus:{cavalry:3,engineering:0,caution:0},orodes:{cavalry:1,engineering:0,caution:2},juba:{cavalry:2,engineering:0,caution:1},artavasdes:{cavalry:1,engineering:0,caution:2},deiotarus:{cavalry:0,engineering:1,caution:1},pharnaces:{cavalry:1,engineering:0,caution:0},bogud:{cavalry:2,engineering:0,caution:0},bocchus:{cavalry:1,engineering:0,caution:1},lepidus:{cavalry:0,engineering:1,caution:2}};
export function commanderSpecialty(s,id){
 const c=s.world?.characters?.[id];if(!c)return null;
 if(!c.martial){if(SPECIALTIES[id])c.martial={...SPECIALTIES[id]};else{let h=2166136261;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;c.martial={cavalry:h%3===0?2:h%2,engineering:(h>>>3)%3===0?2:(h>>>3)%2,caution:(h>>>6)%3}}}
 return c.martial;
}
// Concentration of military power under one person. Feeds the existing
// ambition/influence model; it never triggers a rebellion by itself.
export function commandConcentration(s,owner,id){
 const total=s.armies.filter(a=>a.owner===owner).reduce((n,a)=>n+a.men,0)||1;
 const own=s.armies.filter(a=>a.owner===owner&&a.characterId===id),men=own.reduce((n,a)=>n+a.men,0);
 const planned=(s.world.battlePlans||[]).filter(p=>p.owner===owner&&['active','preparing','paused','needs_attention'].includes(p.status)&&p.commanderId===id).flatMap(p=>p.roles.map(r=>r.armyId));
 const extra=s.armies.filter(a=>planned.includes(a.id)&&a.characterId!==id).reduce((n,a)=>n+a.men,0);
 const share=(men+extra)/total,ambition=politicalAmbition(s,id)??0,elite=own.filter(a=>(a.formation?.comp?.veteran_cohort||0)>=4||a.experience>=3).length;
 const score=Math.round(share*100*(.5+ambition/100)+elite*6);
 return {men:men+extra,share:Math.round(share*100),ambition,elite,score,level:score>=60?'high':score>=35?'elevated':'low'};
}

// ---------- integration with existing systems ----------
// Quarterly: a commander holding a large share of the army slowly gains public
// influence. The existing conspiracy/ambition model decides what follows.
export function advanceCommandInfluence(s,{log=()=>{}}={}){
 if(s.month%3!==0)return;const seen=new Set();
 for(const a of s.armies){const id=a.characterId;if(!id||seen.has(id))continue;seen.add(id);const c=s.world.characters[id];if(!c?.alive)continue;
  const leaders=s.world.leadership?.[a.owner]||[];if(leaders.includes(id))continue;
  const k=commandConcentration(s,a.owner,id);if(k.level==='low')continue;
  const before=c.influence??50;c.influence=Math.min(90,before+(k.level==='high'?2:1));
  (s.world.commandInfluence||={})[id]={year:s.year,month:s.month,level:k.level,share:k.share};
  if(a.owner===s.player&&k.level==='high'&&before<70&&c.influence>=70)log(s,'A commander with a large share of the army now carries notable political weight.','一位掌握大量军队的将领已拥有可观的政治分量。',{kind:'formation'});
 }
}
const snapshotOf=t=>({templateId:t.id,version:t.version,name:t.name,comp:{...t.main,...t.support},main:{...t.main},support:{...t.support},profile:templateStats(t).profile});
const statsCache=new WeakMap();
export function armyStats(a){if(!a?.formation)return null;let st=statsCache.get(a.formation);if(!st){st=templateStats(a.formation);statsCache.set(a.formation,st)}return st}
// Multiplier on battle power. Unorganized (legacy) armies use 1. Training and
// partial conversion scale the effect; commander specialties adjust it within limits.
export function formationCombatFactor(s,a,terrainKind,role){
 const st=armyStats(a);let f=1;
 if(st){const fill=Math.max(0,Math.min(1,a.formationFill??1)),base=(role==='attack'?st.attack:st.defense)*(st.terrain[terrainKind]??1);f=1+(base-1)*fill;
  const spec=a.characterId?commanderSpecialty(s,a.characterId):null;
  if(spec){f*=1+st.cavalryShare*spec.cavalry*.03;if(role==='defend')f*=1+spec.caution*.02;else f*=1-spec.caution*.008}
  f*=1+Math.min(.06,st.supply)*fill;}
 if(a.training>0)f*=1-Math.min(.2,a.training*.06);
 return Math.max(.6,Math.min(1.45,f));
}
export function formationMarchDelta(s,a,link,terrainKind){
 const st=armyStats(a);if(!st||link.sea)return 0;
 if(st.speed==='fast'&&['hills','desert','forest'].includes(terrainKind))return -1;
 if(st.speed==='slow'&&['hills','forest','desert'].includes(terrainKind))return 1;
 return 0;
}
export function formationSiegeReduction(s,a){
 const st=armyStats(a);let n=0;if(st)n+=st.siege>=3.5?2:st.siege>=1.5?1:0;
 const spec=a.characterId?commanderSpecialty(s,a.characterId):null;if(spec?.engineering>=2&&(st?.siege||0)>=1)n+=1;
 return n+(focusModifiers(s,a.owner).siege||0);
}
// Extra monthly cost beyond the existing per-man baseline (may be negative for
// light formations). Used by the economy and its forecast.
export function formationUpkeepDelta(s,owner){
 let treasury=0,food=0;
 for(const a of s.armies.filter(x=>x.owner===owner&&x.formation&&x.men>0)){const st=armyStats(a),scale=a.men/st.personnel;treasury+=st.upkeep*scale-a.men*BASE.upkeepPerMan;food+=st.food*scale-a.men*BASE.foodPerMan}
 for(const a of s.armies.filter(x=>x.owner===owner&&x.reorg))treasury+=1;
 return {treasury:Math.round(treasury*10)/10,food:Math.round(food*10)/10};
}
// Scouts report enemy forces in theaters adjacent to the army.
export function observeFormationRecon(s){
 for(const a of s.armies.filter(x=>x.formation&&x.men>0&&!x.move)){
  const st=armyStats(a);if(st.recon<2||!s.knowledge?.[a.owner])continue;
  const places=new Set([a.region,...ROUTES.filter(r=>r[0]===a.region||r[1]===a.region).map(r=>r[0]===a.region?r[1]:r[0])]);
  for(const u of s.armies){if(u.owner===a.owner||u.move||!places.has(u.region)||!s.knowledge[a.owner][u.owner])continue;const k=s.knowledge[a.owner][u.owner];k.sightings||={};k.sightings[u.id]={id:u.id,name:[...u.name],owner:u.owner,region:u.region,year:s.year,month:s.month,commanderId:null,strengthBand:[Math.max(0,Math.floor(u.men*.75/1000)*1000),Math.max(1000,Math.ceil(u.men*1.25/1000)*1000)],profile:u.formation?.profile||null,source:'scouts',scoutArmy:a.id}}
 }
}
const supplyLinked=(s,owner,regionId)=>{const seen=new Set([regionId]),todo=[regionId];while(todo.length){const id=todo.pop(),r=s.regions.find(x=>x.id===id);if(r&&r.owner===owner&&(r.fort>0||r.terrain==='urban'||r.supply>=13))return true;for(const [a,b] of ROUTES){const next=a===id?b:b===id?a:null;if(next&&!seen.has(next)&&s.regions.find(x=>x.id===next)?.owner===owner){seen.add(next);todo.push(next)}}}return false};
export function reorganizationQuote(s,owner,armyId,templateId){
 const a=s.armies.find(x=>x.id===armyId),t=formationState(s).templates[templateId],f=s.factions[owner];
 if(!a||a.owner!==owner||!t||t.owner!==owner)return {ok:false,reason:'unknown'};
 const errors=validateTemplate(s,owner,t);if(errors.length)return {ok:false,reason:'template',errors};
 const here=s.regions.find(r=>r.id===a.region);
 if(a.move||a.siege||a.reorg)return {ok:false,reason:'busy'};
 if(here?.owner!==owner)return {ok:false,reason:'location'};
 if(s.armies.some(x=>x.region===a.region&&x.owner!==owner&&s.wars.some(w=>w.includes(x.owner)&&w.includes(owner))))return {ok:false,reason:'enemy'};
 if(!supplyLinked(s,owner,a.region))return {ok:false,reason:'supply'};
 const st=templateStats(t),from=a.formation?.comp||{},changed=Object.entries({...t.main,...t.support}).reduce((v,[id,n])=>v+Math.max(0,n-(from[id]||0))*COMPONENTS[id].equip,0);
 const discount=1-Math.min(.4,focusModifiers(s,owner).reorg||0);
 const manpower=Math.max(0,st.personnel-a.men),treasury=Math.round((4+changed+manpower/1000*2)*discount),food=Math.ceil(manpower/1500);
 const months=Math.max(1,Math.min(4,Math.ceil(st.training/(a.formation?1.5:1))-(focusModifiers(s,owner).training||0)));
 const fraction=Math.min(1,f.manpower/Math.max(1,manpower),f.treasury/Math.max(1,treasury),f.food/Math.max(1,food));
 return {ok:true,manpower,treasury,food,months,personnel:st.personnel,fraction:Math.round(fraction*100)/100,partial:fraction<1};
}
export function reorganizeArmy(s,owner,armyId,templateId,{allowPartial=true,log=()=>{}}={}){
 const q=reorganizationQuote(s,owner,armyId,templateId);if(!q.ok)return q;
 if(q.partial&&(!allowPartial||q.fraction<.25))return {ok:false,reason:'resources',quote:q};
 const a=s.armies.find(x=>x.id===armyId),t=formationState(s).templates[templateId],f=s.factions[owner],x=Math.min(1,q.fraction);
 const manpower=Math.floor(q.manpower*x),treasury=Math.ceil(q.treasury*x),food=Math.ceil(q.food*x);
 f.manpower-=manpower;f.treasury-=treasury;f.food-=food;
 a.reorg={template:snapshotOf(t),remaining:q.months,addMen:manpower,fill:Math.round((a.formation?.templateId===templateId?Math.max(x,a.formationFill??1):Math.max(.25,x))*100)/100,started:[s.year,s.month],paid:{manpower,treasury,food}};
 a.order={kind:'hold',target:a.region};
 if(owner===s.player)log(s,`${a.name[0]} began reorganizing as “${t.name}” (${q.months} months${x<1?`, partial conversion ${Math.round(x*100)}%`:''}).`,`${a.name[1]}开始改编为“${t.nameZh||t.name}”（${q.months}个月${x<1?`，部分改编 ${Math.round(x*100)}%`:''}）。`,{kind:'formation'});
 return {ok:true,quote:q,fraction:x};
}
export function advanceReorganizations(s,{log=()=>{}}={}){
 for(const a of s.armies){
  if(a.training>0)a.training--;
  if(!a.reorg)continue;
  const here=s.regions.find(r=>r.id===a.region);
  // An army that leaves friendly ground or is attacked stops; resources already spent remain spent and are recorded.
  if(here?.owner!==a.owner||a.move||a.siege){if(a.owner===s.player)log(s,`${a.name[0]} interrupted its reorganization.`,`${a.name[1]}中断了改编。`,{kind:'formation'});a.reorgHistory=[...(a.reorgHistory||[]),{interrupted:[s.year,s.month],paid:a.reorg.paid}].slice(-5);delete a.reorg;continue}
  if(--a.reorg.remaining>0)continue;
  a.men+=a.reorg.addMen;a.formation=a.reorg.template;a.formationFill=a.reorg.fill;a.morale=Math.max(35,a.morale-4);
  a.reorgHistory=[...(a.reorgHistory||[]),{completed:[s.year,s.month],template:a.formation.templateId,fill:a.formationFill}].slice(-5);delete a.reorg;
  if(a.order?.kind==='hold')a.order=null;
  if(a.owner===s.player)log(s,`${a.name[0]} completed its reorganization as “${a.formation.name}”.`,`${a.name[1]}完成改编：“${a.formation.name}”。`,{kind:'formation'});
 }
}
export function recruitmentQuote(s,owner,templateId){const t=formationState(s).templates[templateId];if(!t||t.owner!==owner)return null;const st=templateStats(t);return {treasury:st.recruitCost+st.equipment,manpower:st.personnel,food:Math.ceil(st.personnel/500),training:st.training,personnel:st.personnel}}
export function recruitFormation(s,owner,regionId,templateId,{log=()=>{}}={}){
 const r=s.regions.find(x=>x.id===regionId),f=s.factions[owner],t=formationState(s).templates[templateId];
 if(!r||r.owner!==owner||!t||t.owner!==owner)return {ok:false,reason:'unavailable'};
 if(validateTemplate(s,owner,t).length)return {ok:false,reason:'template'};
 const q=recruitmentQuote(s,owner,templateId);
 if(f.treasury<q.treasury||f.manpower<q.manpower||f.food<q.food)return {ok:false,reason:'resources',quote:q};
 f.treasury-=q.treasury;f.manpower-=q.manpower;f.food-=q.food;
 const id=`levy${s.nextArmy++}`,st=templateStats(t);
 s.armies.push({id,name:[t.name,t.nameZh||t.name],owner,region:regionId,men:q.personnel,morale:Math.min(80,st.morale),skill:1,experience:0,commander:['Unnamed officer','未具名军官'],move:null,siege:null,characterId:null,formation:snapshotOf(t),formationFill:1,training:q.training});
 r.loyalty=Math.max(0,r.loyalty-3);
 if(owner===s.player)log(s,`“${t.name}” was raised in ${r.name[0]}; it needs ${q.training} months of training.`,`在${r.name[1]}征召了“${t.nameZh||t.name}”；需要训练${q.training}个月。`,{kind:'formation'});
 return {ok:true,armyId:id,quote:q};
}
export function outdatedArmies(s,owner){const st=formationState(s);return s.armies.filter(a=>a.owner===owner&&a.formation&&st.templates[a.formation.templateId]&&st.templates[a.formation.templateId].version!==a.formation.version).map(a=>a.id)}

// ---------- AI ----------
// Bounded template search. Higher difficulty evaluates more candidates; every
// candidate obeys the same validation, costs and unlocks as the player.
function frontierTerrain(s,owner){
 const own=new Set(s.regions.filter(r=>r.owner===owner).map(r=>r.id)),mix={plain:0,hills:0,forest:0,urban:0,desert:0};
 for(const [a,b] of ROUTES){for(const [x,y] of [[a,b],[b,a]])if(own.has(x)&&!own.has(y)){const t=s.regions.find(r=>r.id===y);const rep=reportedControl(s,owner,y)?.owner;if(t&&rep&&rep!==owner)mix[t.terrain]+=s.wars.some(w=>w.includes(owner)&&w.includes(rep))?2:1}}
 const total=Object.values(mix).reduce((v,n)=>v+n,0);if(!total)for(const r of s.regions.filter(r=>r.owner===owner))mix[r.terrain]++;
 const sum=Object.values(mix).reduce((v,n)=>v+n,0)||1;return Object.fromEntries(Object.entries(mix).map(([k,v])=>[k,v/sum]));
}
function enemyProfiles(s,owner){const now=s.year*12+s.month;const list=Object.values(s.knowledge?.[owner]||{}).flatMap(k=>Object.values(k.sightings||{})).filter(x=>x.profile&&now-(x.year*12+x.month)<=12);return {cavalry:list.filter(x=>x.profile==='cavalry').length,infantry:list.filter(x=>x.profile==='infantry').length,total:list.length}}
export function evaluateTemplate(s,owner,t,context=null){
 const st=templateStats(t),ctx=context||{terrain:frontierTerrain(s,owner),enemy:enemyProfiles(s,owner)};
 const terrainFit=Object.entries(ctx.terrain).reduce((v,[k,w])=>v+w*(st.terrain[k]??1),0);
 const power=(st.attack*.55+st.defense*.45)*terrainFit*(ctx.enemy.cavalry>ctx.enemy.infantry?(1+(st.defense-1)*.6):1);
 const cost=(st.recruitCost+st.equipment)/st.personnel*1000,upkeep=st.upkeep/st.personnel*1000;
 const f=s.factions[owner],strain=f.treasury<60?1.6:1;
 return Math.round((power*100-cost*1.2-upkeep*30*strain+st.recon*1.5+(st.siege>=1.5?3:0))*100)/100;
}
export function aiDesignFormations(s,owner){
 if(owner==='rebels'||!s.factions[owner])return null;seedTemplates(s,owner);
 const level=s.difficulty||'standard',tries={beginner:0,standard:1,hard:3,expert:6}[level]??1;
 const st=formationState(s),mine=templatesFor(s,owner),ctx={terrain:frontierTerrain(s,owner),enemy:enemyProfiles(s,owner)};
 const comps=availableComponents(s,owner);let best=mine.map(t=>({t,score:evaluateTemplate(s,owner,t,ctx)})).sort((a,b)=>b.score-a.score)[0];
 let h=(s.seed^(s.year*12+s.month)*131)>>>0;for(const ch of owner)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;const next=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296};
 for(let i=0;i<tries;i++){
  const base=best?.t||mine[0];if(!base)break;const cand={main:{...base.main},support:{...base.support}};
  const c=comps[Math.floor(next()*comps.length)],group=c.slot==='main'?cand.main:cand.support,delta=next()<.6?1:-1;group[c.id]=Math.max(0,(group[c.id]||0)+delta);
  if(validateTemplate(s,owner,cand).length)continue;const score=evaluateTemplate(s,owner,cand,ctx);
  if(score>(best?.score??-Infinity)+.5){const r=saveTemplate(s,owner,{name:`${base.name.replace(/ \(AI [0-9]+\)$/,'')} (AI ${st.nextId})`,nameZh:base.nameZh?`${base.nameZh.replace(/（AI [0-9]+）$/,'')}（AI ${st.nextId}）`:null,main:cand.main,support:cand.support});if(r.ok)best={t:r.template,score}}
 }
 // Keep the AI's own template list bounded.
 const ai=templatesFor(s,owner).filter(t=>!t.preset).sort((a,b)=>evaluateTemplate(s,owner,b,ctx)-evaluateTemplate(s,owner,a,ctx));for(const t of ai.slice(4))if(!s.armies.some(a=>a.formation?.templateId===t.id))delete st.templates[t.id];
 const plan=(s.world.aiFormationPlans||={})[owner]={date:s.year*12+s.month,preferred:best?.t?.id||null,terrain:ctx.terrain,enemy:ctx.enemy};
 return plan;
}
export function aiRecruitFormation(s,owner,regionId,{log=()=>{}}={}){
 const pref=s.world.aiFormationPlans?.[owner]?.preferred,list=[pref,...templatesFor(s,owner).map(t=>t.id)].filter(Boolean),f=s.factions[owner];
 for(const id of [...new Set(list)]){const q=recruitmentQuote(s,owner,id);if(!q)continue;
  // Sustainable upkeep: keep a reserve after paying.
  if(f.treasury-q.treasury<25||f.manpower-q.manpower<1500||f.food-q.food<10)continue;
  const r=recruitFormation(s,owner,regionId,id,{log});if(r.ok)return r}
 return {ok:false,reason:'resources'};
}
export function aiReorganize(s,owner,{exclude=new Set(),log=()=>{}}={}){
 const pref=s.world.aiFormationPlans?.[owner]?.preferred;if(!pref)return null;const f=s.factions[owner];if(f.treasury<35)return null;
 const t=formationState(s).templates[pref],target=t&&templateStats(t).personnel;
 const candidate=s.armies.filter(a=>a.owner===owner&&!exclude.has(a.id)&&!a.move&&!a.siege&&!a.reorg&&a.men>1200&&(!a.formation||a.formation.templateId!==pref&&a.men<target*.7||a.formation.templateId===pref&&a.formation.version!==t.version)).sort((a,b)=>a.men-b.men)[0];
 if(!candidate)return null;const r=reorganizeArmy(s,owner,candidate.id,pref,{log});return r.ok?candidate.id:null;
}
