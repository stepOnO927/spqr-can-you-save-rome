// Phase XIV. All numbers below are game balance values, not historical measurements.
export const IDEA_CATEGORIES = [
  {id:'military',name:['Military & Training','军事与训练']},
  {id:'government',name:['Government & Law','政治与法律']},
  {id:'diplomacy',name:['Diplomacy & Intelligence','外交与情报']},
  {id:'economy',name:['Economy & Society','经济与社会']},
  {id:'culture',name:['Education, Culture & Belief','教育、文化与信仰']}
];
const romanSource='https://www.metmuseum.org/essays/the-roman-republic';
const armySource='https://www.worldhistory.org/Roman_Army/';
const republicSource='https://www.worldhistory.org/Roman_Republic/';
const roadSource='https://www.worldhistory.org/article/758/roman-roads/';
const waterSource='https://www.worldhistory.org/aqueduct/';
const grainSource='https://www.worldhistory.org/article/684/food-in-the-roman-world/';
const engineeringSource='https://www.worldhistory.org/Roman_Engineering/';
const inscriptionSource='https://www.metmuseum.org/essays/roman-inscriptions';
const source=(url)=>({title:url.includes('metmuseum')?'Metropolitan Museum of Art':'World History Encyclopedia',url});
export const IDEAS = [
  {id:'legion-training',category:'military',name:['Standardized Legion Training','军团标准化训练'],cost:24,months:3,adopt:12,effects:{recruitMorale:6,combatAttack:.06,upkeep:2},context:['Roman drill and organization are adapted as a costly training program.','罗马式操练与编制需要持续训练经费。'],source:source(armySource)},
  {id:'frontier-defense',category:'military',name:['Frontier Defense Doctrine','边境防御学说'],cost:22,months:3,adopt:10,effects:{combatDefense:.09,upkeep:1,combatAttack:-.02},context:['Garrisons favor prepared defense over rapid offensive action.','驻军重视防御，但进攻灵活性稍降。'],source:source(armySource)},
  {id:'reserve-mobilization',category:'military',name:['Reserve Mobilization','预备役动员'],cost:24,months:3,adopt:12,effects:{manpower:120,upkeep:2,stability:-1},context:['A wider levy pool raises manpower while burdening households and administration.','扩大征兵来源增加兵源，也使家庭与行政承压。'],source:source(armySource)},
  {id:'senatorial-consultation',category:'government',name:['Senatorial Consultation','元老院协商'],cost:20,months:2,adopt:12,effects:{stability:1,loyalty:1,decisionDelay:1},conflicts:['central-administration'],context:['Elite consultation can support legitimacy while slowing decisions.','精英协商有助于合法性，但延长决策时间。'],source:source(republicSource)},
  {id:'central-administration',category:'government',name:['Centralized Administration','中央集权行政'],cost:26,months:4,adopt:16,effects:{treasury:2,stability:-1,loyalty:-1},conflicts:['senatorial-consultation'],context:['Central direction improves collection but can strain local loyalties.','中央指挥改善征收，却可能损害地方忠诚。'],source:source(republicSource)},
  {id:'provincial-autonomy',category:'government',name:['Provincial Autonomy','行省自治'],cost:25,months:3,adopt:14,effects:{loyalty:2,treasury:-2},conflicts:['central-administration'],context:['Local discretion can win support while limiting central receipts.','地方自主可争取支持，但减少中央收入。'],source:source(republicSource)},
  {id:'hardline-diplomacy',category:'diplomacy',name:['Hardline Diplomacy','强硬外交'],cost:20,months:2,adopt:10,effects:{diplomacyPressure:12,relations:-2},conflicts:['diplomatic-accommodation'],context:['Coercive bargaining increases pressure and foreign distrust.','胁迫式谈判增加压力，也加深外国疑虑。'],source:source(republicSource)},
  {id:'diplomatic-accommodation',category:'diplomacy',name:['Diplomatic Accommodation','外交妥协'],cost:20,months:2,adopt:10,effects:{diplomacy:5,upkeep:1},conflicts:['hardline-diplomacy'],context:['Concessions help peaceful relations but require envoys and gifts.','让步有助于和平关系，但需要使节和礼物。'],source:source(republicSource)},
  {id:'commercial-agreements',category:'diplomacy',name:['Commercial Agreements','商业协定'],cost:24,months:3,adopt:12,effects:{diplomacy:3,treasury:1,upkeep:1},context:['Commercial ties support envoys and receipts but require administration.','商业往来支持外交和收入，但需要行政管理。'],source:source(republicSource)},
  {id:'public-works',category:'economy',name:['State-Sponsored Public Works','国家公共工程'],cost:24,months:3,adopt:12,effects:{constructionDiscount:4,treasury:-1,loyalty:1},context:['Public investment supports building and local standing at a fiscal cost.','公共投资降低建造费用，但长期占用国库。'],source:source(roadSource)},
  {id:'tax-farming',category:'economy',name:['Tax Farming','包税制'],cost:20,months:3,adopt:10,effects:{treasury:3,loyalty:-2},context:['Contracted collection raises receipts and local resentment.','承包征税提高收入，也增加地方怨怼。'],source:source(republicSource)},
  {id:'estate-organization',category:'economy',name:['Estate Organization','庄园组织'],cost:23,months:3,adopt:12,effects:{food:2,loyalty:-1},context:['Large estates can coordinate output while concentrating land and influence.','大型庄园组织产出，但也集中土地与权势。'],source:source(grainSource)},
  {id:'rhetorical-education',category:'culture',name:['Greek Rhetorical Education','希腊修辞教育'],cost:22,months:3,adopt:12,effects:{researchDiscount:4,upkeep:2},context:['Elite education helps transmit learned practices, at continuing cost.','精英教育促进知识传播，但需要持续支出。'],source:source(romanSource)},
  {id:'cultural-accommodation',category:'culture',name:['Cultural Accommodation','文化包容'],cost:22,months:3,adopt:12,effects:{loyalty:2,stability:1,treasury:-1},context:['Accommodation can ease local tensions without erasing distinct beliefs.','包容可缓和地方紧张，但不会抹去不同信仰。'],source:source(romanSource)},
  {id:'civic-education',category:'culture',name:['Civic Education','公民教育'],cost:24,months:3,adopt:12,effects:{stability:1,researchDiscount:2,upkeep:2},context:['Teaching public duties supports institutions but requires teachers and funds.','公民职责教育支持制度，但需要教师与经费。'],source:source(romanSource)}
];
export const MATERIALS = [
  {id:'roadmaking',name:['Road Building','道路修筑'],cost:22,months:3,building:'road',context:['Roman roads predate 49 BCE; this node spreads and improves local technique.','罗马道路早于前49年；此项代表技术传播与改进。'],source:source(roadSource)},
  {id:'water-control',name:['Water Management','水利管理'],cost:24,months:4,building:'irrigation',context:['Channels adapt older Mediterranean water practices to local terrain.','水渠将已有的地中海水利做法用于当地地形。'],source:source(waterSource)},
  {id:'barracks-design',name:['Barracks Planning','兵营规划'],cost:21,months:3,building:'barracks',context:['Organized quarters support military training and supply.','有组织的营舍支撑军队训练与补给。'],source:source(armySource)},
  {id:'stone-fortification',name:['Stone Fortification','石砌防御工事'],cost:25,months:4,building:'fort',context:['Fortified sites require skilled construction and a defensible location.','防御据点需要熟练工匠与合适地形。'],source:source(armySource)},
  {id:'quarrying',name:['Quarrying','采石'],cost:20,months:3,building:'quarry',context:['Stone extraction supplies local building work.','采石为当地建筑提供石材。'],source:source(romanSource)},
  {id:'metal-extraction',name:['Metal Extraction','金属采掘'],cost:23,months:4,building:'mine',context:['Metal extraction depends on regional deposits and labor.','金属采掘取决于当地矿藏与劳动力。'],source:source(romanSource)},
  {id:'grain-storage',name:['Grain Storage','谷物储藏'],cost:20,months:3,building:'granary',context:['Stored grain buffers shortages; storage must be constructed.','储粮缓解短缺；研究之后仍需建造粮仓。'],source:source(grainSource)},
  {id:'urban-drainage',name:['Urban Drainage Improvement','城市排水改进'],cost:27,months:4,building:'drain',context:['Ancient drains existed before 49 BCE; this is local improvement, not modern sanitation.','古代排水早于前49年；此为地方改进，并非现代卫生。'],source:source(waterSource)}
];
export const BUILDINGS = [
  {id:'road',name:['Road','道路'],tech:'roadmaking',cost:18,months:3,materials:{stone:2,timber:1},upkeep:1,effects:{treasury:1},terrain:['plain','hills','forest','urban','desert']},
  {id:'irrigation',name:['Irrigation Channel','灌溉水渠'],tech:'water-control',cost:22,months:4,materials:{stone:2,timber:1},upkeep:1,effects:{food:2},terrain:['plain','desert']},
  {id:'barracks',name:['Barracks','兵营'],tech:'barracks-design',cost:20,months:3,materials:{stone:1,timber:2,metal:1},upkeep:2,effects:{recruitMorale:5},terrain:['plain','hills','urban']},
  {id:'fort',name:['Fortification','防御工事'],tech:'stone-fortification',cost:28,months:5,materials:{stone:4,timber:2,metal:2},upkeep:2,effects:{fort:1},terrain:['hills','plain','urban']},
  {id:'quarry',name:['Quarry','采石场'],tech:'quarrying',cost:18,months:3,materials:{timber:2},upkeep:1,effects:{stone:2},terrain:['hills']},
  {id:'mine',name:['Mine','矿场'],tech:'metal-extraction',cost:24,months:5,materials:{stone:2,timber:2},upkeep:2,effects:{metal:2,loyalty:-1},terrain:['hills']},
  {id:'granary',name:['Granary','粮仓'],tech:'grain-storage',cost:18,months:3,materials:{stone:1,timber:2},upkeep:1,effects:{food:1,foodCapacity:45},terrain:['plain','urban','hills','desert']},
  {id:'drain',name:['Urban Drainage','城市排水'],tech:'urban-drainage',cost:30,months:5,materials:{stone:4,timber:1},upkeep:2,effects:{loyalty:2,stability:1},terrain:['urban']}
];
// Further historically plausible families. Each entry has a distinct bilingual
// encyclopedia summary; dates denote adaptation rather than first invention.
const additionalMaterials=[
 ['dam-engineering',['Dam Engineering','堤坝工程'],'dam',engineeringSource,['Later Roman dams became especially prominent under the Empire; this is a costly local adaptation.','大型罗马堤坝在帝国时代尤为突出；此项是昂贵的地方改造。'],31,5,['water-control']],
 ['reservoir-design',['Reservoir Design','蓄水池设计'],'reservoir',waterSource,['Reservoirs store water for settlement and cultivation.','蓄水池为聚落与耕作储水。'],22,3,['water-control']],
 ['aqueduct-refinement',['Aqueduct Refinement','渡槽改进'],'aqueduct',waterSource,['Aqueducts long predate Caesar; this refines local distribution.','渡槽早于凯撒时代；此项改进地方配水。'],27,4,['water-control']],
 ['sewer-improvement',['Sewer Improvement','下水道改进'],'sewer',engineeringSource,['Older drains are improved for larger settlements; no modern medical claim is implied.','改进旧有排水以服务较大聚落，不暗示现代医疗卫生。'],29,5,['urban-drainage']],
 ['training-ground',['Training Ground','训练场'],'training-camp',armySource,['Permanent training grounds support repeated drills.','固定训练场支持反复操练。'],20,3,['barracks-design']],
 ['supply-organization',['Supply Organization','军需组织'],'supply-depot',armySource,['Depots hold food and equipment near active armies.','军需仓在军队附近储备粮食与装备。'],22,3,['barracks-design']],
 ['armory-craft',['Armory Craft','军械制造'],'armory',armySource,['Organized armories support recruitment and equipment repair.','有组织的军械库支援征兵与装备修理。'],24,4,['metal-extraction']],
 ['siege-machinery',['Siege Machinery','攻城器械'],'siege-workshop',armySource,['Workshops assemble machines for prolonged sieges.','作坊制造长期围攻所需的器械。'],25,4,['armory-craft']],
 ['metalworking',['Metalworking','金属加工'],'metalworks',engineeringSource,['Local metalworking turns mined supply into practical equipment.','地方金属加工把矿产变成实用器材。'],22,3,['metal-extraction']],
 ['craft-workshops',['Craft Workshops','手工业作坊'],'workshop',engineeringSource,['Workshops sustain urban crafts and taxable exchange.','作坊支撑城市手工业与可征税的交换。'],18,3,[]],
 ['grain-processing',['Grain Processing','谷物加工'],'grain-mill',grainSource,['Milling and processing increase usable local grain.','碾磨加工提高当地谷物的可用量。'],19,3,['grain-storage']],
 ['stone-inscription',['Stone Inscription','石刻铭文'],'monument',inscriptionSource,['Roman inscriptions served civic, religious, commemorative and political purposes.','罗马铭文用于公民、宗教、纪念和政治用途。'],18,2,['quarrying']],
 ['road-milestones',['Road Milestones','道路里程碑'],'milestone',roadSource,['Milestones marked routes and often named responsible officials.','里程碑标示路线，也常记载负责官员。'],16,2,['roadmaking']],
 ['public-square-planning',['Public Square Planning','公共广场规划'],'square',romanSource,['A civic square concentrates assemblies and exchange.','公共广场汇集集会与交易。'],21,3,['roadmaking']],
 ['library-organization',['Library Organization','书库组织'],'library',romanSource,['Collections and copyists preserve and circulate learned works.','藏书与抄写者保存、传播学术著作。'],24,4,['public-square-planning']],
 ['bath-construction',['Bath Construction','浴场建造'],'bath',engineeringSource,['Baths require water and maintenance and serve social life.','浴场需要供水和维护，也是社会生活场所。'],24,4,['aqueduct-refinement']],
 ['administrative-building',['Administrative Building','行政建筑'],'administration',republicSource,['Offices provide a place for records and provincial administration.','官署容纳记录与地方行政。'],23,4,['public-square-planning']],
 ['bridge-engineering',['Bridge Engineering','桥梁工程'],'bridge',roadSource,['Bridges extend practical roads across rivers.','桥梁使实用道路跨越河流。'],24,4,['roadmaking']],
 ['port-facilities',['Port Facilities','港口设施'],'port',engineeringSource,['Harbors handle shipments but require a suitable coast.','港口处理船运，必须有合适海岸。'],26,4,['roadmaking']],
 ['warehouse-management',['Warehouse Management','仓储管理'],'warehouse',grainSource,['Warehouses protect traded supplies and grain reserves.','仓库保护交易货物与谷物储备。'],20,3,['grain-storage']],
 ['shipyard-craft',['Shipyard Craft','造船工艺'],'shipyard',engineeringSource,['Shipyards maintain vessels at suitable maritime ports.','造船厂在适合的海港维修船舶。'],28,5,['port-facilities']]
];
for(const [id,name,building,url,context,cost,months,prerequisites] of additionalMaterials)MATERIALS.push({id,name,building,cost,months,prerequisites,context,source:source(url)});
const additionalBuildings=[
 ['dam',['Dam','堤坝'],'dam-engineering',34,6,{stone:6,timber:2},3,{food:3},['hills','plain'],'water'],
 ['reservoir',['Reservoir','蓄水池'],'reservoir-design',22,4,{stone:3},1,{food:1,foodCapacity:30},['plain','hills','desert'],'water'],
 ['aqueduct',['Aqueduct Improvement','渡槽改进'],'aqueduct-refinement',29,5,{stone:5,metal:1},2,{food:1,loyalty:1},['plain','urban','hills'],'water'],
 ['sewer',['Sewer Improvement','下水道改进'],'sewer-improvement',32,6,{stone:5,metal:1},3,{loyalty:2,stability:1,healthRisk:-.004},['urban','desert','plain','hills'],'urban'],
 ['training-camp',['Training Camp','训练场'],'training-ground',20,3,{timber:2,metal:1},2,{recruitMorale:4},['plain','hills','urban']],
 ['supply-depot',['Supply Depot','军需仓'],'supply-organization',20,3,{timber:3,stone:1},2,{foodCapacity:25,food:1},['plain','hills','urban']],
 ['armory',['Armory','军械库'],'armory-craft',24,4,{stone:2,timber:2,metal:2},2,{recruitCost:3},['plain','hills','urban']],
 ['siege-workshop',['Siege Workshop','攻城作坊'],'siege-machinery',26,4,{stone:2,timber:3,metal:2},2,{siegeReduction:1},['plain','hills','urban']],
 ['metalworks',['Metalworking Facility','金属加工场'],'metalworking',23,4,{stone:2,timber:2,metal:1},2,{constructionDiscount:2},['plain','hills','urban']],
 ['workshop',['Craft Workshop','手工业作坊'],'craft-workshops',18,3,{timber:2},1,{treasury:2},['plain','hills','urban']],
 ['grain-mill',['Grain-Processing Facility','谷物加工场'],'grain-processing',20,3,{stone:2,timber:2},1,{food:2},['plain','hills','urban']],
 ['monument',['Inscribed Stone Monument','铭文石碑'],'stone-inscription',23,4,{stone:3},1,{legitimacy:1,loyalty:-1},['plain','hills','urban']],
 ['milestone',['Milestone','里程碑'],'road-milestones',15,2,{stone:1},0,{treasury:1},['plain','hills','forest','urban','desert']],
 ['square',['Public Square','公共广场'],'public-square-planning',24,4,{stone:3,timber:1},2,{loyalty:1},['plain','hills','urban'],'urban'],
 ['library',['Library','书库'],'library-organization',25,4,{stone:2,timber:2},2,{researchDiscount:3},['plain','hills','urban'],'urban'],
 ['bath',['Bath','浴场'],'bath-construction',25,5,{stone:3,metal:1},2,{loyalty:1,healthRisk:-.002},['plain','hills','urban'],'water'],
 ['administration',['Administrative Building','行政官署'],'administrative-building',24,4,{stone:3,timber:2},2,{treasury:2,stability:1},['plain','hills','urban'],'urban'],
 ['bridge',['Bridge','桥梁'],'bridge-engineering',25,4,{stone:3,timber:2},1,{treasury:1,march:1},['plain','hills','forest','urban'],'water'],
 ['port',['Port','港口'],'port-facilities',30,5,{stone:4,timber:3},2,{treasury:2,food:1},['plain','hills','desert'],'coast'],
 ['warehouse',['Warehouse','仓库'],'warehouse-management',20,3,{stone:2,timber:2},1,{foodCapacity:40},['plain','hills','urban','desert']],
 ['shipyard',['Shipyard','造船厂'],'shipyard-craft',30,5,{stone:3,timber:4,metal:2},3,{treasury:2,seaSpeed:1},['plain','hills','desert'],'coast']
];
for(const [id,name,tech,cost,months,materials,upkeep,effects,terrain,site] of additionalBuildings)BUILDINGS.push({id,name,tech,cost,months,materials,upkeep,effects,terrain,site});
MATERIALS.push(
 {id:'improved-shipbuilding',name:['Improved Shipbuilding','改良造船'],cost:27,months:4,prerequisites:['shipyard-craft'],context:['Better yard organization shortens vessel construction.','改进船厂组织，缩短造船时间。'],source:source(engineeringSource)},
 {id:'naval-equipment',name:['Heavy Naval Equipment','重型海军装备'],cost:32,months:5,prerequisites:['shipyard-craft','metalworking'],context:['Stronger hull fittings make heavier warships feasible.','更坚固的船体配件使大型战船可建造。'],source:source(engineeringSource)},
 {id:'repair-facilities',name:['Naval Repair Facilities','海军修理设施'],cost:25,months:4,prerequisites:['shipyard-craft'],context:['Dockside repair crews restore damaged hulls over time.','港边修理人员逐月修复受损船体。'],source:source(engineeringSource)},
 {id:'maritime-warehousing',name:['Maritime Warehousing','海运仓储'],cost:23,months:3,prerequisites:['port-facilities'],context:['Warehouses protect cargo and increase reliable throughput.','仓库保护货物，提高稳定吞吐量。'],source:source(grainSource)},
 {id:'military-transport-organization',name:['Military Transport Organization','军事海运组织'],cost:26,months:4,prerequisites:['shipyard-craft'],context:['Organized loading lets each transport carry more soldiers.','组织装载，使每艘运输船多运士兵。'],source:source(armySource)}
);
BUILDINGS.push(
 {id:'naval-depot',name:['Naval Supply Depot','海军补给站'],tech:'port-facilities',cost:23,months:3,materials:{timber:2,stone:1},upkeep:1,effects:{navalSupply:12},terrain:['plain','hills','urban'],site:'coast'},
 {id:'dockyard',name:['Naval Dockyard','海军船坞'],tech:'repair-facilities',cost:29,months:5,materials:{timber:3,stone:2,metal:1},upkeep:2,effects:{navalRepair:8},terrain:['plain','hills','urban'],site:'coast'},
 {id:'coastal-fort',name:['Coastal Fortification','海岸堡垒'],tech:'stone-fortification',cost:30,months:5,materials:{stone:4,timber:1,metal:1},upkeep:2,effects:{navalDefense:4},terrain:['plain','hills','urban'],site:'coast'},
 {id:'naval-training',name:['Naval Training Facility','海军训练场'],tech:'shipyard-craft',cost:22,months:4,materials:{timber:2,stone:1},upkeep:2,effects:{navalExperience:2},terrain:['plain','hills','urban'],site:'coast'}
);
IDEAS.push(
 {id:'naval-crew-training',category:'military',name:['Naval Crew Training','海军船员训练'],cost:23,months:3,adopt:12,effects:{navalPower:.08,upkeep:2},context:['Drilling oarsmen improves maneuver but requires pay.','训练桨手改善机动，但增加军费。'],source:source(armySource)},
 {id:'fleet-coordination',category:'military',name:['Fleet Coordination','舰队协同'],cost:25,months:4,adopt:13,effects:{navalPower:.06,navalSupply:3,upkeep:1},context:['Signals and practiced formations aid a fleet at a cost.','旗号与队形训练增强舰队，也要花费。'],source:source(armySource)},
 {id:'maritime-administration',category:'government',name:['Maritime Administration','海务行政'],cost:23,months:3,adopt:12,effects:{navalTrade:1,upkeep:2},context:['Officials organize convoy records and port dues.','官员管理船队记录与港口税费。'],source:source(republicSource)},
 {id:'harbor-regulation',category:'government',name:['Harbor Regulation','港口条例'],cost:22,months:3,adopt:10,effects:{navalSecurity:8,treasury:-1},context:['Inspections reduce losses and slow merchants.','检查减少损失，也拖慢商船。'],source:source(republicSource)},
 {id:'maritime-intelligence',category:'diplomacy',name:['Maritime Intelligence Networks','海事情报网'],cost:24,months:3,adopt:12,effects:{navalIntel:1,upkeep:1},context:['Port informants improve sightings without revealing certainty.','港口线人改善目击，仍不能提供确切情报。'],source:source(republicSource)},
 {id:'commercial-treaties',category:'diplomacy',name:['Commercial Treaties','商业条约'],cost:25,months:3,adopt:12,effects:{navalTrade:1,upkeep:1},context:['Treaties ease access but require envoys and concessions.','条约改善准入，也需要使节与让步。'],source:source(republicSource)},
 {id:'merchant-patronage',category:'economy',name:['Merchant Patronage','商人赞助'],cost:23,months:3,adopt:12,effects:{navalTrade:1,loyalty:-1},context:['Patronage expands exchange and favors a few merchants.','赞助扩大贸易，也偏袒少数商人。'],source:source(grainSource)},
 {id:'state-supported-trade',category:'economy',name:['State-Supported Trade','国家扶助贸易'],cost:27,months:4,adopt:14,effects:{navalSecurity:10,treasury:-2},context:['State escorts stabilize commerce at fiscal cost.','国家护航稳定贸易，却增加财政负担。'],source:source(grainSource)},
 {id:'naval-engineering-education',category:'culture',name:['Naval Engineering Education','海军工程教育'],cost:25,months:4,adopt:13,effects:{navalRepair:4,upkeep:1},context:['Training shipwrights improves repairs.','训练造船工匠改善修理。'],source:source(engineeringSource)},
 {id:'maritime-cultural-exchange',category:'culture',name:['Maritime Cultural Exchange','海上文化交流'],cost:22,months:3,adopt:11,effects:{navalTrade:1,stability:-1},context:['Port exchange carries knowledge and political unease.','港口交流传播知识，也带来政治不安。'],source:source(romanSource)}
);
const materialPrerequisites={'stone-fortification':['barracks-design'],'metal-extraction':['quarrying'],'urban-drainage':['water-control']};
const ideaPrerequisites={'reserve-mobilization':['legion-training'],'provincial-autonomy':['senatorial-consultation'],'commercial-agreements':['diplomatic-accommodation'],'estate-organization':['public-works'],'civic-education':['rhetorical-education']};
for(const item of MATERIALS)item.prerequisites=materialPrerequisites[item.id]||item.prerequisites||[];
for(const item of IDEAS)item.prerequisites=ideaPrerequisites[item.id]||[];
import {figureActive} from './great-figures.js';
const ids = x => x.map(item=>item.id);
const metalDeposits=new Set(['hispaniaN','hispaniaS','illyricum','anatolia','armenia','gaul']);
const coastalSites=new Set(['narbo','hispaniaN','hispaniaS','italiaS','sicilia','africa','epirus','achaia','anatolia','syria','egypt','numidia','mauretania','bosporus']);
const waterSites=new Set(['gaul','cisalpine','narbo','hispaniaN','hispaniaS','italiaN','roma','italiaS','anatolia','syria','egypt','armenia']);
const urbanSites=new Set(['roma','egypt','anatolia','syria','achaia','sicilia']);
const fresh = faction => ({knownMaterial:faction==='egypt'?['water-control','grain-storage']:['roadmaking','grain-storage'],knownIdeas:[],foreignOrigins:{},slots:Object.fromEntries(IDEA_CATEGORIES.map(c=>[c.id,[null]])),research:null,adoption:null,expansion:null,trade:[],materials:{stone:6,timber:7,metal:3}});
export function initializeDevelopment(s){
  s.development ||= {};
  for(const id of Object.keys(s.factions).filter(id=>id!=='rebels')){
    const d=s.development[id] ||= fresh(id);
    d.knownMaterial ||= fresh(id).knownMaterial;d.knownIdeas ||= [];
    d.slots ||= fresh(id).slots;for(const c of IDEA_CATEGORIES)d.slots[c.id] ||= [null];
    d.materials ||= {stone:6,timber:7,metal:3};d.trade ||= [];d.foreignOrigins ||= {};
  }
  for(const r of s.regions){r.buildings ||= [];r.construction ||= null}
  return s;
}
export const development = (s,id) => (initializeDevelopment(s),s.development[id]);
export function activeEffects(s,id){
  const d=development(s,id),result={};if(!d)return result;
  for(const ideaId of Object.values(d.slots).flat().filter(Boolean))for(const [key,value] of Object.entries(IDEAS.find(i=>i.id===ideaId)?.effects||{}))result[key]=(result[key]||0)+value;
  for(const r of s.regions.filter(x=>x.owner===id))for(const buildingId of r.buildings){const e=BUILDINGS.find(x=>x.id===buildingId)?.effects||{};for(const key of ['researchDiscount','constructionDiscount'])result[key]=(result[key]||0)+(e[key]||0)}
  return result;
}
export function researchInnovation(s,owner,branch,id){
  const d=development(s,owner),item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id),f=s.factions[owner];
  if(!item||d.research||d[branch==='material'?'knownMaterial':'knownIdeas'].includes(id))return {ok:false,reason:'unavailable'};
  if(item.prerequisites.some(pre=>!d[branch==='material'?'knownMaterial':'knownIdeas'].includes(pre)))return {ok:false,reason:'prerequisite'};
  const cost=Math.max(8,item.cost-(activeEffects(s,owner).researchDiscount||0)-(figureActive(s,owner,'scholar')?3:0));
  if(f.treasury<cost)return {ok:false,reason:'treasury'};
  f.treasury-=cost;d.research={branch,id,remaining:Math.max(1,item.months-(figureActive(s,owner,'scholar')?1:0))};return {ok:true};
}
export function ideaCompatibility(s,owner,ideaId){
  const d=development(s,owner),idea=IDEAS.find(i=>i.id===ideaId);
  if(!idea)return {ok:false,reason:'unknown'};
  const active=Object.values(d.slots).flat().filter(Boolean);
  const conflict=active.find(id=>idea.conflicts?.includes(id)||IDEAS.find(x=>x.id===id)?.conflicts?.includes(ideaId));
  return conflict?{ok:false,reason:'conflict',with:conflict}:{ok:true};
}
export function adoptIdea(s,owner,ideaId,slot=0){
  const d=development(s,owner),idea=IDEAS.find(x=>x.id===ideaId),f=s.factions[owner];
  if(!idea||!d.knownIdeas.includes(ideaId)||d.adoption||!d.slots[idea.category]||slot<0||slot>=d.slots[idea.category].length)return {ok:false,reason:'unavailable'};
  const compatible=ideaCompatibility(s,owner,ideaId);if(!compatible.ok)return compatible;
  if(f.treasury<idea.adopt)return {ok:false,reason:'treasury'};
  const old=d.slots[idea.category][slot];if(old===ideaId)return {ok:false,reason:'active'};
  const specialist=idea.category==='military'?'military':idea.category==='government'?'statesman':idea.category==='culture'?'religious':null;
  f.treasury-=idea.adopt;d.adoption={ideaId,category:idea.category,slot,remaining:Math.max(1,(old?3:2)+(activeEffects(s,owner).decisionDelay||0)+(d.foreignOrigins[ideaId]?2:0)-(specialist&&figureActive(s,owner,specialist)?1:0)),old};
  if(old)f.stability=Math.max(0,f.stability-2);
  return {ok:true};
}
export function removeIdea(s,owner,category,slot=0){
  const d=development(s,owner),current=d.slots[category]?.[slot],f=s.factions[owner];
  if(!current||d.adoption||f.treasury<5)return {ok:false,reason:'unavailable'};
  f.treasury-=5;d.adoption={ideaId:null,category,slot,remaining:2,old:current};return {ok:true};
}
export function expandIdeaSlot(s,owner,category){
  const d=development(s,owner),slots=d.slots[category],f=s.factions[owner];
  if(!slots||slots.length>=3||d.expansion||d.knownIdeas.filter(id=>IDEAS.find(i=>i.id===id)?.category===category).length<2)return {ok:false,reason:'capacity'};
  const cost=slots.length===1?35:60;if(f.treasury<cost)return {ok:false,reason:'treasury'};
  f.treasury-=cost;d.expansion={category,remaining:slots.length===1?6:9};return {ok:true};
}
export function constructionCheck(s,owner,regionId,buildingId){
  const d=development(s,owner),r=s.regions.find(x=>x.id===regionId),b=BUILDINGS.find(x=>x.id===buildingId),f=s.factions[owner];
  if(!r||!b||r.owner!==owner)return {ok:false,reason:'owner'};
  if(!d.knownMaterial.includes(b.tech))return {ok:false,reason:'technology'};
  if(!b.terrain.includes(r.terrain))return {ok:false,reason:'terrain'};
  if(b.id==='mine'&&!(s.grandMap?r.resource==='metal':metalDeposits.has(r.id)))return {ok:false,reason:'deposit'};
  if(b.site==='coast'&&!(s.grandMap?r.port:coastalSites.has(r.id)))return {ok:false,reason:'coast'};
  if(b.site==='water'&&!(s.grandMap?r.river:waterSites.has(r.id)))return {ok:false,reason:'water'};
  if(b.site==='urban'&&!(s.grandMap?r.terrain==='urban':urbanSites.has(r.id)))return {ok:false,reason:'settlement'};
  if(b.id==='shipyard'&&!r.buildings.includes('port'))return {ok:false,reason:'port'};
  if(r.buildings.includes(buildingId)||r.construction)return {ok:false,reason:'queue'};
  const cost=Math.max(5,b.cost-(activeEffects(s,owner).constructionDiscount||0)-(figureActive(s,owner,'engineer')?3:0));
  if(f.treasury<cost)return {ok:false,reason:'treasury'};
  if(Object.entries(b.materials).some(([k,v])=>(d.materials[k]||0)<v))return {ok:false,reason:'materials'};
  return {ok:true,cost};
}
export function startConstruction(s,owner,regionId,buildingId,inscription=''){
  const check=constructionCheck(s,owner,regionId,buildingId);if(!check.ok)return check;
  const d=development(s,owner),r=s.regions.find(x=>x.id===regionId),b=BUILDINGS.find(x=>x.id===buildingId);
  s.factions[owner].treasury-=check.cost;for(const [k,v] of Object.entries(b.materials))d.materials[k]-=v;
  r.construction={buildingId,owner,remaining:Math.max(1,b.months-(figureActive(s,owner,'engineer')?1:0)),inscription:buildingId==='monument'?String(inscription).slice(0,120):''};return {ok:true};
}
export function purchaseMaterials(s,owner,kind,amount=5){
  const d=development(s,owner),f=s.factions[owner],unit={stone:2,timber:2,metal:4}[kind];
  if(!d||!f||!unit||!Number.isInteger(amount)||amount<1||amount>20)return {ok:false,reason:'unavailable'};
  const quantity=Math.min(amount,100-(d.materials[kind]||0));if(quantity<1)return {ok:false,reason:'capacity'};
  const cost=unit*quantity;if(f.treasury<cost)return {ok:false,reason:'treasury'};
  f.treasury-=cost;d.materials[kind]+=quantity;return {ok:true,cost,quantity};
}
export function knowledgeTrade(s,buyer,seller,branch,id){
  initializeDevelopment(s);
  const bd=s.development[buyer],sd=s.development[seller],buyerFaction=s.factions[buyer],sellerFaction=s.factions[seller];
  const key=branch==='material'?'knownMaterial':branch==='idea'?'knownIdeas':null;
  const item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);
  if(!key||!item||!bd||!sd||!sd[key].includes(id)||bd[key].includes(id)||bd.trade.some(t=>t.id===id&&t.branch===branch))return {ok:false,reason:'knowledge'};
  if(s.wars.some(w=>w.includes(buyer)&&w.includes(seller)))return {ok:false,reason:'war'};
  const relation=s.relations[[buyer,seller].sort().join(':')]||0;
  if(relation<0)return {ok:false,reason:'relations'};
  if(['stone-fortification','siege-machinery','legion-training'].includes(id)&&relation<30)return {ok:false,reason:'strategic'};
  const price=Math.max(16,Math.round(item.cost*1.3));
  if(buyerFaction.treasury<price)return {ok:false,reason:'treasury'};
  buyerFaction.treasury-=price;sellerFaction.treasury+=Math.round(price*.7);
  bd.trade.push({seller,branch,id,remaining:2});return {ok:true,price};
}
export function advanceDevelopment(s,log=()=>{}){
  initializeDevelopment(s);
  for(const [owner,d] of Object.entries(s.development)){
    const f=s.factions[owner];if(!f)continue;
    if(d.research&&--d.research.remaining<=0){const {branch,id}=d.research;d[branch==='material'?'knownMaterial':'knownIdeas'].push(id);d.research=null;if(owner===s.player)log(`Research completed: ${id}.`,`研究完成：${id}。`)}
    if(d.adoption&&--d.adoption.remaining<=0){const {category,slot,ideaId}=d.adoption;d.slots[category][slot]=ideaId;d.adoption=null;if(owner===s.player)log(`National idea ${ideaId||'removed'} is now in effect.`,`国家理念${ideaId||'已移除'}现已生效。`)}
    if(d.expansion&&--d.expansion.remaining<=0){d.slots[d.expansion.category].push(null);d.expansion=null}
    for(const trade of [...d.trade])if(--trade.remaining<=0){const key=trade.branch==='material'?'knownMaterial':'knownIdeas';if(!d[key].includes(trade.id))d[key].push(trade.id);if(trade.branch==='idea')d.foreignOrigins[trade.id]=trade.seller;d.trade.splice(d.trade.indexOf(trade),1);if(owner===s.player)log(`Knowledge arrived from ${trade.seller}: ${trade.id}.`,`来自${trade.seller}的知识已传入：${trade.id}。`)}
    const added={stone:0,timber:0,metal:0};
    for(const r of s.regions.filter(x=>x.owner===owner)){
      if(r.terrain==='forest')added.timber+=2;
      if(r.terrain==='hills')added.stone++;
      for(const id of r.buildings){const b=BUILDINGS.find(x=>x.id===id);for(const k of ['stone','timber','metal'])added[k]+=b?.effects[k]||0}
    }
    for(const k of Object.keys(added))d.materials[k]=Math.min(100,d.materials[k]+added[k]);
    f.treasury-=Object.values(d.slots).reduce((n,slots)=>n+Math.max(0,slots.length-1),0);
    const relationEffect=activeEffects(s,owner).relations||0;
    if(relationEffect)for(const other of Object.keys(s.development).filter(id=>id!==owner&&!s.wars.some(w=>w.includes(owner)&&w.includes(id)))){
      const key=[owner,other].sort().join(':');s.relations[key]=Math.max(-100,Math.min(100,(s.relations[key]||0)+relationEffect));
    }
  }
  for(const r of s.regions){const c=r.construction;if(!c)continue;if(r.owner!==c.owner){r.construction=null;continue}if(--c.remaining<=0){r.buildings.push(c.buildingId);if(c.buildingId==='fort')r.fort++;if(c.buildingId==='monument'&&c.inscription)(r.inscriptions||=[]).push({text:c.inscription,owner:c.owner,year:s.year,month:s.month});if(c.owner===s.player)log(`${c.buildingId} completed in ${r.name[0]}.`,`${r.name[1]}的${c.buildingId}建成。`);r.construction=null}}
}
export function localBuildingEffects(r){const out={};for(const id of r.buildings||[]){const b=BUILDINGS.find(x=>x.id===id);if(!b)continue;for(const [k,v] of Object.entries(b.effects))out[k]=(out[k]||0)+v;out.upkeep=(out.upkeep||0)+b.upkeep}return out}
export const developmentCatalogIds={ideas:ids(IDEAS),materials:ids(MATERIALS),buildings:ids(BUILDINGS)};
