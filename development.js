import {recordExpense} from './expense-ledger.js?v=1';

// Phase XIV. All numbers below are game balance values, not historical measurements.
export const IDEA_CATEGORIES = [
  {id:'military',name:['Military & Training','军事与训练']},
  {id:'government',name:['Government & Law','政治与法律']},
  {id:'diplomacy',name:['Diplomacy & Intelligence','外交与情报']},
  {id:'economy',name:['Economy & Society','经济与社会']},
  {id:'culture',name:['Education, Culture & Belief','教育、文化与信仰']}
];
const appianSource='https://whc.unesco.org/en/list/1708';
const miningSource='https://oxrep.web.ox.ac.uk/mines-database';
const quarrySource='https://oxrep.web.ox.ac.uk/stone-quarries-database';
const alesiaSource='https://musee-archeologienationale.fr/en/node/1592';
const numantiaSource='https://numanciasoria.es/en/divulgacion/the-archaeological-hall-of-garray';
const siegeSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/2A%2A.html';
const massiliaSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1B%2A.html';
const militaryTransportSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/3A%2A.html';
const librarySource='https://www.persee.fr/doc/mefr_0223-5102_2006_num_118_2_10261';
const cloacaSource='https://www.sovraintendenzaroma.it/i_luoghi/roma_antica/monumenti/cloaca_massima';
const marciaSource='https://www.sovraintendenzaroma.it/i_luoghi/roma_antica/monumenti/acquedotto_marcio';
const pompeiiBathSource='https://pompeiisites.org/en/excavations-plan-en/stabian-baths-and-republican-baths/';
const verrineSource='https://www.attalus.org/cicero/verres23.html';
const catoEstateSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/A%2A.html';
const oratorSource='https://www.attalus.org/cicero/deoratore1B.html';
const catoGranarySource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/F%2A.html';
const catoWaterSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/J%2A.html';
const catoCraftSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/I%2A.html';
const ciceroTrainingSource='https://www.attalus.org/cicero/caelius.html';
const pompeiiForumSource='https://pompeiisites.org/wp-content/uploads/A-Guide-to-the-Pompeii-Excavations-2.pdf';
const auximumCisternSource='https://sabapancona.cultura.gov.it/auximum-romana-il-sistema-di-raccolta-delle-acque/';
const alcantarillaSource='https://whc.unesco.org/uploads/nominations/1315.pdf';
const scipioInscriptionSource='https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/museo-pio-clementino/sarcofago-scipione-barbato.html';
const militaryGranarySource='https://journals.ub.uni-heidelberg.de/index.php/germania/article/download/33997/27684';
const gallicTrainingSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2%2A.html';
const gallicNavySource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/3%2A.html';
const gallicShipsSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/5A%2A.html';
const polybiusTreatySource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/3%2A.html';
const polybiusApameaSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/21%2A.html';
const ciceroPiratesSource='https://www.attalus.org/cicero/manilia.html';
const ciceroBalbusSource='https://www.attalus.org/cicero/balbus.html';
const diodorusTablesSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diodorus_Siculus/12B%2A.html';
const ciceroArchiaSource='https://beta.perseus.tufts.edu/urn:cts:latinLit:phi0474.phi016.perseus-eng2:7/';
const gallicScoutsSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2%2A.html';
const pompeiiGreekSource='https://pompeiisites.org/en/pompeii-map/antiquarium/';
const frontinusInformantsSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/Strategemata/1%2A.html';
const source=(url,title)=>({title:title??(url.includes('metmuseum')?'Metropolitan Museum of Art':url.includes('whc.unesco')?'UNESCO World Heritage Centre':url.includes('oxrep.web.ox')?'Oxford Roman Economy Project':url.includes('musee-archeologie')?'Musée d’Archéologie nationale':url.includes('numanciasoria')?'Numancia Archaeological Site':url.includes('/Cato/')?'Cato, On Agriculture':url.includes('attalus.org/cicero/caelius')?'Cicero, Pro Caelio 11':url.includes('penelope.uchicago')?'Caesar, Civil Wars':url.includes('uni-heidelberg.de')?'Germania 93 (2015)':url.includes('persee.fr')?'Mélanges de l’École française de Rome':url.includes('sovraintendenzaroma.it')?'Sovrintendenza Capitolina':url.includes('sabapancona.cultura.gov.it')?'Italian Ministry of Culture':url.includes('museivaticani.va')?'Vatican Museums':url.includes('pompeiisites.org')?'Pompeii Archaeological Park':'World History Encyclopedia'),url});
export const IDEAS = [
  {id:'legion-training',category:'military',name:['Legion Field Training','军团战场训练'],cost:24,months:3,adopt:12,effects:{recruitMorale:6,combatAttack:.06,upkeep:2},context:['Caesar credits practiced troops with responding to a sudden attack; a uniform training program and its bonus are game interpretations.','凯撒把突袭中的应变归功于士兵此前的战斗训练；统一训练计划及其加成属于游戏诠释。'],source:source(gallicTrainingSource,'Caesar, Gallic War 2.20')},
  {id:'frontier-defense',category:'military',name:['Prepared Border Defense','边境预备防御'],cost:22,months:3,adopt:10,effects:{combatDefense:.09,upkeep:1,combatAttack:-.02},context:['Caesar describes guarded bridges, ditches and fieldworks at Ilerda; a standing border doctrine is a game abstraction.','凯撒记载伊莱尔达附近的守桥、壕沟和野战工事；常设边境学说属于游戏抽象。'],source:source(massiliaSource,'Caesar, Civil Wars 1.40–42')},
  {id:'reserve-mobilization',category:'military',name:['Reserve Mobilization','预备役动员'],cost:24,months:3,adopt:12,effects:{manpower:120,upkeep:2,stability:-1},context:['Caesar reports calling on soldiers and auxiliaries from several regions for the Spanish campaign; the wider levy pool is a game abstraction.','凯撒记载为西班牙战役从多个地区召集士兵与辅助军；更广的征兵池属于游戏抽象。'],source:source(massiliaSource,'Caesar, Civil Wars 1.39')},
  {id:'senatorial-consultation',category:'government',name:['Senatorial Consultation','元老院协商'],cost:20,months:2,adopt:12,effects:{stability:1,loyalty:1,decisionDelay:1},conflicts:['central-administration'],context:['Caesar describes a Senate debate over envoys that lasted several days; the stability effect is a game interpretation.','凯撒记载元老院讨论派遣使节持续数日；稳定度效果是游戏诠释。'],source:source(massiliaSource,'Caesar, Civil Wars 1.32–33')},
  {id:'central-administration',category:'government',name:['Centralized Administration','中央集权行政'],cost:26,months:4,adopt:16,effects:{treasury:2,stability:-1,loyalty:-1},conflicts:['senatorial-consultation'],context:['Varro ordered provincial levies, shipbuilding and collection in Spain; the treasury and loyalty effects are game interpretations.','瓦罗在西班牙下令征兵、造船并征集物资；国库与忠诚效果属于游戏诠释。'],source:source(siegeSource,'Caesar, Civil Wars 2.17–18')},
  {id:'provincial-autonomy',category:'government',name:['Provincial Autonomy','行省自治'],cost:25,months:3,adopt:14,effects:{loyalty:2,treasury:-2},conflicts:['central-administration'],context:['Corduba and Carmona took local action against Varro; this does not prove formal provincial autonomy or a fixed loyalty gain.','科尔杜巴与卡尔莫纳自行采取反瓦罗行动；这不证明行省享有正式自治或固定忠诚加成。'],source:source(siegeSource,'Caesar, Civil Wars 2.19')},
  {id:'provincial-tax-review',category:'government',name:['Provincial Tax Review','行省税务复核'],cost:25,months:3,adopt:14,effects:{taxReview:1,upkeep:2},context:['Cicero says Sicilian tithe rules were reviewed by Roman magistrates and alleges that Verres overrode established protections. Regular local review is a game policy: in administratively integrated territories it softens, but does not remove, the discontent caused by high taxes.','西塞罗记述罗马官员审议西西里什一税规则，并指控维勒斯破坏既有保障。定期地方复核是游戏政策：在行政融合度较高的领土，它减轻但不消除高税引起的不满。'],source:source(verrineSource,'Cicero, In Verrem 2.3.17–21')},
  {id:'hardline-diplomacy',category:'diplomacy',name:['Hardline Diplomacy','强硬外交'],cost:20,months:2,adopt:10,effects:{diplomacyPressure:12,relations:-2},conflicts:['diplomatic-accommodation'],context:['The older Apamea settlement imposed ships, tribute and hostages on Antiochus; diplomatic pressure here is an abstract policy, not a 49 BCE event.','较早的阿帕梅亚和约向安条克索取舰船、贡赋与人质；此处外交施压是抽象政策，并非前49年的事件。'],source:source(polybiusApameaSource,'Polybius, Histories 21.42')},
  {id:'royal-court-liaison',category:'diplomacy',name:['Royal Court Liaison','王廷联络'],cost:25,months:3,adopt:13,effects:{royalCourtCredit:8,upkeep:3},context:['In 51 BCE Cicero described maintaining contact with allied kings, while warning that other royal support was uncertain. This optional network modestly helps form alliances with independent kingdoms; it cannot override war or conflicting alliances. The bonus and upkeep are game values.','西塞罗在前51年记述与盟邦国王保持联络，也警告其他王廷的支持并不可靠。这一可选联络网略微帮助与独立王国结盟，但不能绕过战争或相互冲突的同盟。加成与维护费属于游戏数值。'],source:source('https://www.attalus.org/cicero/adfam15.html','Cicero, Ad Familiares 15.2.2–4')},
  {id:'diplomatic-accommodation',category:'diplomacy',name:['Diplomatic Accommodation','外交妥协'],cost:20,months:2,adopt:10,effects:{diplomacy:5,upkeep:1},conflicts:['hardline-diplomacy'],context:['Caesar sought Massilian neutrality, but the city refused; negotiation need not succeed, and the bonus is a game value.','凯撒争取马赛保持中立，但该城拒绝；谈判未必成功，加成属于游戏数值。'],source:source(massiliaSource,'Caesar, Civil Wars 1.35')},
  {id:'commercial-agreements',category:'diplomacy',name:['Commercial Agreements','商业协定'],cost:24,months:3,adopt:12,effects:{diplomacy:3,treasury:1,upkeep:1},context:['Polybius records much earlier Roman–Carthaginian trade terms; this is treaty practice, not evidence of a new 49 BCE agreement.','波利比乌斯记载更早的罗马与迦太基贸易条款；此卡取其条约惯例，并非前49年的新协定。'],source:source(polybiusTreatySource,'Polybius, Histories 3.22–26')},
  {id:'public-works',category:'economy',name:['State-Sponsored Public Works','国家公共工程'],cost:24,months:3,adopt:12,effects:{constructionDiscount:4,treasury:-1,loyalty:1},context:['Armies built and repaired bridges at Ilerda to preserve supplies; a lasting construction discount is a game abstraction.','军队在伊莱尔达修筑和修复桥梁以维持补给；长期建造折扣属于游戏抽象。'],source:source(massiliaSource,'Caesar, Civil Wars 1.40–41')},
  {id:'tax-farming',category:'economy',name:['Tax Farming','包税制'],cost:20,months:3,adopt:10,effects:{treasury:3,loyalty:-2},context:['Cicero describes auctioned Sicilian tithe rights and the resentment caused by abusive collection.','西塞罗记载了西西里谷物什一税征收权的拍卖，以及滥征造成的怨愤。'],source:source(verrineSource,'Cicero, In Verrem 2.3')},
  {id:'estate-organization',category:'economy',name:['Estate Organization','庄园组织'],cost:23,months:3,adopt:12,effects:{food:2,loyalty:-1},context:['Cato advises estate owners to supervise overseers, labor, harvests and accounts.','加图建议庄园主督察管事、劳力、收成与账目。'],source:source(catoEstateSource,'Cato, On Agriculture 1–2')},
  {id:'rhetorical-education',category:'culture',name:['Greek Rhetorical Education','希腊修辞教育'],cost:22,months:3,adopt:12,effects:{researchDiscount:4,upkeep:2},context:['Cicero describes translating Greek speeches as an exercise for Roman orators.','西塞罗记述罗马演说家以翻译希腊演说词作为练习。'],source:source(oratorSource,'Cicero, De Oratore 1.155')},
  {id:'cultural-accommodation',category:'culture',name:['Cultural Accommodation','文化包容'],cost:22,months:3,adopt:12,effects:{loyalty:2,stability:1,treasury:-1},context:['Cicero argues that an allied Gaditanian could receive Roman citizenship; his defense speech does not prove broad religious tolerance.','西塞罗为一位来自盟邦加的斯的罗马公民身份辩护；这篇辩护词不能证明普遍的宗教宽容。'],source:source(ciceroBalbusSource,'Cicero, Pro Balbo 25–27')},
  {id:'civic-education',category:'culture',name:['Civic Education','公民教育'],cost:24,months:3,adopt:12,effects:{stability:1,researchDiscount:2,upkeep:2},context:['Cicero asks elite orators to study law, Senate custom and allied treaties; this does not establish public schooling.','西塞罗主张精英演说家研习法律、元老院惯例与盟邦条约；这不证明存在大众公民学校。'],source:source(oratorSource,'Cicero, De Oratore 1.159')}
];
IDEAS.push({id:'sanctuary-protection',category:'culture',name:['Provincial Sanctuary Protection','行省圣所保护'],cost:25,months:3,adopt:12,effects:{sanctuaryProtection:1,upkeep:2},context:['Cicero reports Sicilian outrage after Verres took sacred images from Henna. Protecting locally important sanctuaries is a game policy, not a documented universal Roman guarantee.','西塞罗记载维勒斯从恩纳圣所夺走神像后，当地人深感愤怒。保护地方重要圣所是游戏政策，并非史料证实的罗马普遍保障。'],source:source('https://www.attalus.org/cicero/verres24_3.html','Cicero, In Verrem 2.4.110–115')});
IDEAS.push({id:'ancestral-rites',category:'culture',name:['Ancestral Rites Patronage','传统祭仪扶持'],cost:28,months:3,adopt:14,effects:{ancestralRites:1,upkeep:3},conflicts:['provincial-rites-charter'],context:['Cicero proposes preserving inherited family rites in De Legibus 2.8.19–22. Supporting a realm’s own traditions is a game policy for any faction, not proof that his proposed law was enacted or that all provinces shared one cult. It can unsettle provinces with different influential rites.','西塞罗在《论法律》2.8.19—22主张保存家族传承的祭仪。扶持本国传统是适用于各派系的游戏政策，并不证明其拟议法律曾实施，也不意味着各省信仰相同；不同传统的地方可能因此不满。'],source:source('https://droitromain.univ-grenoble-alpes.fr/Auteurs_anciens/delegibus2_lat.htm','Cicero, De Legibus 2.8.19–22')});
IDEAS.push({id:'provincial-rites-charter',category:'culture',name:['Provincial Rites Accord','地方祭仪协定'],cost:27,months:4,adopt:14,effects:{provincialRitesCharter:1,upkeep:3},conflicts:['ancestral-rites'],context:['In a prosecution speech, Cicero recounts Sicilian envoys seeking the return of sacred images so that ancestral rites could continue. This optional accord is a game adaptation, not evidence of a universal Roman policy: it helps provinces with a substantial minority tradition only while local rites are recognized.','西塞罗在控诉演说中记述西西里使者要求归还神像，以延续祖传祭仪。本可选协定属于游戏改编，并非罗马普遍政策的证据：只有承认地方祭仪时，它才帮助拥有一定比例少数信仰的行省。'],source:source('https://www.attalus.org/cicero/verres24_3.html','Cicero, In Verrem 2.4.113–115')});
IDEAS.push(
 {id:'public-legal-reference',category:'government',name:['Public Legal Reference','公开法律参照'],cost:23,months:3,adopt:12,effects:{loyalty:2,upkeep:2},context:['Diodorus says the Twelve Tables were engraved and publicly displayed centuries before 49 BCE. This policy represents maintaining accessible legal records; its loyalty effect is a game interpretation.','狄奥多罗斯记载十二铜表法在前49年数世纪前已刻写并公开展示。本政策代表维护可查阅的法律记录；忠诚效果属于游戏诠释。'],source:source(diodorusTablesSource,'Diodorus Siculus, Library of History 12.26.1')},
 {id:'citizen-registration',category:'government',name:['Allied Citizen Registration','盟邦公民登记'],cost:24,months:3,adopt:13,effects:{manpower:80,loyalty:1,upkeep:2},context:['Cicero describes residence and a time-limited declaration to a praetor under an earlier citizenship law. This card models administering eligible claims, not granting citizenship to every subject.','西塞罗记载一项早期公民权法要求居住条件及限期向裁判官登记。本卡模拟处理合资格申请，并非给所有臣民授予公民权。'],source:source(ciceroArchiaSource,'Cicero, Pro Archia 7')}
);
IDEAS.push({id:'field-reconnaissance',category:'military',name:['Field Scout Coordination','战场斥候编组'],cost:25,months:3,adopt:13,effects:{scoutReliability:.12,upkeep:2},context:['Caesar reports holding his army back until scouts checked a retreating enemy in 57 BCE. Coordinated verification modestly improves this game’s field reports but cannot remove uncertainty or deception.','凯撒记载在前57年敌军撤退时，他让军队停留，待斥候复核消息。协调核查在游戏中略微改善战场报告，但无法消除不确定性或欺骗。'],source:source(gallicScoutsSource,'Caesar, Gallic War 2.11')});
IDEAS.push({id:'field-march-coordination',category:'military',name:['Coordinated Field Marches','野战行军调度'],cost:28,months:4,adopt:15,effects:{march:1,upkeep:3},context:['Caesar says Fabius hurried by forced marches to join the army facing Afranius in Spain. This optional doctrine represents costly planning and dispatch; one month less on a longer land leg is a game rule, not an ancient travel-time measurement.','凯撒记载法比乌斯奉命急行军，与在西班牙对阵阿弗拉尼乌斯的军队会合。本可选学说模拟需经费维持的路线筹划与命令传递；较长陆路行程缩短一个月属于游戏规则，并非古代行军时间的测量。'],source:source(massiliaSource,'Caesar, Civil Wars 1.40')});
IDEAS.push({id:'court-informant-patronage',category:'diplomacy',name:['Court Informant Patronage','宫廷情报人员扶持'],cost:25,months:3,adopt:14,effects:{agentCapacity:1,upkeep:3},context:['Frontinus, writing much later, recounts Scipio sending disguised observers with an embassy before 49 BCE. This optional game policy pays for one more simultaneous spy or counterintelligence mission; it does not make reports reliable or prove a permanent Roman spy service.','后世的弗龙提努斯记述，早于前49年的西庇阿曾让伪装的观察者随使团行动。此游戏政策支付维护费，允许多一项同时进行的间谍或反谍任务；它不会保证报告可靠，也不证明罗马曾有常设谍报机构。'],source:source(frontinusInformantsSource,'Frontinus, Stratagems 1.2.1')});
IDEAS.push({id:'civic-exercise',category:'culture',name:['Civic Exercise Patronage','公民体能训练扶持'],cost:26,months:4,adopt:14,effects:{civicExercise:4,upkeep:3},context:['Aristotle discusses civic exercise and criticizes excessive Spartan severity in Politics VIII.4. This policy adapts supervised practice in administratively integrated towns; it raises recruit morale there, not across an entire population. The bonus and upkeep are game values.','亚里士多德在《政治学》卷八第4章讨论城邦体能训练，并批评斯巴达式的过度严苛。本政策把有组织的训练改编到行政融合程度较高的城市；只提高当地新兵士气，不作用于全体人口。加成与维护费属于游戏数值。'],source:source('https://www.gutenberg.org/files/6762/6762-h/6762-h.htm','Aristotle, Politics VIII.4')});
IDEAS.push({id:'estate-labor-control',category:'economy',name:['Restrictive Estate Labor','庄园劳役约束'],cost:25,months:4,adopt:14,effects:{estateLabor:1,upkeep:1},conflicts:['negotiated-crop-shares'],context:['Cato describes close supervision, discipline and provisioning of estate workers in On Agriculture 5. This optional policy models harsher control only in productive rural territories. It is not the late Roman bound colonate, nor proof that every estate followed Cato. Food, discontent and migration values are game interpretations.','加图在《农业志》第5章记述对庄园劳力的严格监督、惩戒及供养。本可选政策只模拟有产出的乡村领土中更严厉的控制；它不是后期罗马的束缚农制度，也不表示所有庄园都遵照加图。粮食、不满及迁移数值属于游戏诠释。'],source:source(catoEstateSource,'Cato, On Agriculture 5')});
IDEAS.push({id:'negotiated-crop-shares',category:'economy',name:['Share Tenancy Arrangements','分成佃作安排'],cost:23,months:3,adopt:12,effects:{tenantShares:1,upkeep:1},conflicts:['estate-labor-control'],context:['Cato, On Agriculture 136–137, records terms for share tenants in particular Italian districts. This optional policy adapts share-tenancy terms in productive rural territories; it is not proof of universal tenant freedom or a 49 BCE public law. Reduced state grain, satisfaction and migration values are game interpretations.','加图《农业志》第136—137章记录意大利部分地区的分成佃作条件。本可选政策在有产出的乡村领土模拟分成佃作安排，并不证明佃农普遍自由，也不是前49年的成文公法。国家存粮、满意度与迁移数值均属游戏设计。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/I%2A.html','Cato, On Agriculture 136–137')});
IDEAS.push({id:'egyptian-multiscript-decrees',category:'government',origin:'egypt',name:['Egyptian Multiscript Decrees','埃及多文字诏令'],cost:26,months:4,adopt:14,effects:{egyptianDecrees:1,upkeep:2},context:['The Memphis Decree of 196 BCE was published in Greek, Demotic and hieroglyphs for different audiences. This optional adaptation improves administrative integration only in Egyptian-culture territories, regardless of their ruler. Foreign rulers need extra adoption time. It does not claim that every decree in 49 BCE used three scripts; the monthly gain and upkeep are game values.','前196年的孟斐斯诏令以希腊文、世俗体和圣书体面向不同读者公布。本可选改编只提高埃及文化领土的行政融合度，不论统治者是谁；外来统治者需要额外适应时间。这不表示前49年的每道诏令都使用三种文字。每月增益与维护费是游戏数值。'],source:source('https://www.britishmuseum.org/sites/default/files/2022-10/Hieroglyphs_unlocking_ancient_Egypt_large_print_guide_The_British_Museum.pdf','British Museum, Hieroglyphs: Unlocking Ancient Egypt, pp. 44–45')});
export const MATERIALS = [
  {id:'roadmaking',name:['Road Building','道路修筑'],cost:22,months:3,building:'road',context:['Roman roads predate 49 BCE; this node spreads and improves local technique.','罗马道路早于前49年；此项代表技术传播与改进。'],source:source(appianSource)},
  {id:'water-control',name:['Water Management','水利管理'],cost:24,months:4,building:'irrigation',context:['Cato advises gentle irrigation of beds and maintenance of drainage ditches; local channels adapt these older practices.','加图建议温和引水灌溉苗床并维护排水沟；地方水渠改造这些已有做法。'],source:source(catoWaterSource,'Cato, On Agriculture 151, 155')},
  {id:'barracks-design',name:['Barracks Planning','兵营规划'],cost:21,months:3,building:'barracks',context:['Republican Roman siege camps show planned military quarters.','共和国时期的罗马围城军营显示出经过规划的营舍。'],source:source(numantiaSource)},
  {id:'stone-fortification',name:['Fortification Planning','防御工事规划'],cost:25,months:4,building:'fort',context:['Caesar’s works at Alesia show extensive field fortifications; materials and layouts varied by site.','凯撒在阿莱西亚修筑了大规模野战工事；材料和布局因地而异。'],source:source(alesiaSource)},
  {id:'quarrying',name:['Quarrying','采石'],cost:20,months:3,building:'quarry',context:['Roman-period quarry sites are documented, though dating individual sites to 49 BCE is often uncertain.','罗马时期采石场有考古记录，但单个遗址是否活跃于前49年往往难以确定。'],source:source(quarrySource)},
  {id:'metal-extraction',name:['Metal Extraction','金属采掘'],cost:23,months:4,building:'mine',context:['Roman mining sites are documented, but this card does not date a particular deposit to 49 BCE.','罗马时期矿场有考古记录，但此卡不把某处矿藏断定为前49年已开采。'],source:source(miningSource)},
  {id:'grain-storage',name:['Grain Storage','谷物储藏'],cost:20,months:3,building:'granary',context:['Cato describes protecting stored grain against weevils and mice; a granary still must be built.','加图记载了防止谷仓中的谷物受象鼻虫与老鼠侵害的方法；研究后仍需建造粮仓。'],source:source(catoGranarySource,'Cato, On Agriculture 92')},
  {id:'urban-drainage',name:['Urban Drainage Improvement','城市排水改进'],cost:27,months:4,building:'drain',context:['Rome’s Cloaca Maxima began as drainage for a flood-prone valley long before 49 BCE; this node represents local maintenance and adaptation, not modern sanitation.','罗马大下水道在前49年很久以前已用于排除低洼地积水；此项代表地方维护与改造，并非现代卫生。'],source:source(cloacaSource)}
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
 ['dam-engineering',['Dam Engineering','堤坝工程'],'dam',alcantarillaSource,['A UNESCO nomination suggests the Alcantarilla dam may reach back to the second century BCE; its date is uncertain and this card is local adaptation.','一份联合国教科文组织申遗文件认为阿尔坎塔里利亚堤坝或可追溯至前2世纪；年代仍有争议，此卡代表地方改造。'],31,5,['water-control']],
 ['reservoir-design',['Reservoir Design','蓄水池设计'],'reservoir',auximumCisternSource,['Italian heritage officials tentatively date Auximum’s forum cistern to the second century BCE; this card represents local water storage.','意大利文保机构初步把奥克西穆姆广场蓄水池定于前2世纪；此卡代表地方储水。'],22,3,['water-control']],
 ['aqueduct-refinement',['Aqueduct Refinement','渡槽改进'],'aqueduct',marciaSource,['Rome’s Aqua Marcia was built in 144 BCE; this node refines water distribution rather than inventing aqueducts.','罗马的马尔基亚水道建于前144年；此项改进配水，而非发明渡槽。'],27,4,['water-control']],
 ['sewer-improvement',['Sewer Improvement','下水道改进'],'sewer',cloacaSource,['The Cloaca Maxima combined drainage with later sewer functions; this is an improvement of existing works, not a claim of modern hygiene.','罗马大下水道兼有排涝和后来的排污功能；此项改进旧有工程，不宣称现代卫生效果。'],29,5,['urban-drainage']],
 ['training-ground',['Training Ground','训练场'],'training-camp',ciceroTrainingSource,['Cicero recalls exercises on the Campus Martius and in camp before 49 BCE; the building represents a designated practice area.','西塞罗回忆前49年已在战神广场和军营操练；建筑代表划定的训练场地。'],20,3,['barracks-design']],
 ['supply-organization',['Supply Organization','军需组织'],'supply-depot',militaryGranarySource,['Republican military granaries in Hispania show that armies stored grain near campaigns.','西班牙的共和国时期军用粮仓表明军队曾在战役地点附近储粮。'],22,3,['barracks-design']],
 ['armory-craft',['Armory Craft','军械制造'],'armory',massiliaSource,['Caesar reports that Massilia set up arms workshops in 49 BCE; a local armory adapts that wartime practice.','凯撒记载马赛在前49年设立兵器作坊；地方军械库代表这种战时做法的改造。'],24,4,['metal-extraction']],
 ['siege-machinery',['Siege Machinery','攻城器械'],'siege-workshop',siegeSource,['Caesar describes earthworks, covered galleries and towers at the siege of Massilia in 49 BCE.','凯撒记载了前49年马赛围城中的土垒、带顶通道与攻城塔。'],25,4,['armory-craft']],
 ['metalworking',['Metalworking','金属加工'],'metalworks',catoCraftSource,['Cato lists Italian markets for iron tools, nails, bars, and copper vessels; local production capacity is a game abstraction.','加图列出意大利各地铁器、铁钉、铁条与铜器的市场；地方产能属于游戏抽象。'],22,3,['metal-extraction']],
 ['craft-workshops',['Craft Workshops','手工业作坊'],'workshop',catoCraftSource,['Cato names markets for tools, pottery, rope, and mills; this card models local craft organization rather than a single ancient factory.','加图记载工具、陶器、绳索和磨坊器具的产地；此卡模拟地方手工业组织，并非某座古代工厂。'],18,3,[]],
 ['grain-processing',['Grain Processing','谷物加工'],'grain-mill',catoEstateSource,['Cato lists donkey-driven and hand mills among estate equipment; milling was not new in 49 BCE.','加图把驴力磨和手磨列为庄园设备；碾磨并非前49年的新发明。'],19,3,['grain-storage']],
 ['stone-inscription',['Stone Inscription','石刻铭文'],'monument',scipioInscriptionSource,['The Scipio Barbatus sarcophagus bears Republican inscriptions; the monument’s legitimacy effect is a game interpretation.','西庇阿·巴尔巴图斯石棺留有共和国时期铭文；纪念碑的合法性效果是游戏诠释。'],18,2,['quarrying']],
 ['road-milestones',['Road Milestones','道路里程碑'],'milestone',appianSource,['Milestones marked Roman roads; surviving examples span several periods.','里程碑标示罗马道路；留存实例横跨多个时期。'],16,2,['roadmaking']],
 ['public-square-planning',['Public Square Planning','公共广场规划'],'square',pompeiiForumSource,['Pompeii’s second-century BCE Comitium adjoined its Forum; public-space planning varied across cities.','庞贝前2世纪的民会场毗邻广场；各城公共空间规划并不相同。'],21,3,['roadmaking']],
 ['library-organization',['Private Collection Organization','私人藏书整理'],'library',librarySource,['Private book collections existed in Republican Rome; the first Roman public libraries came later.','共和国时期罗马已有私人藏书；罗马公共图书馆出现得更晚。'],24,4,['craft-workshops']],
 ['bath-construction',['Bath Construction','浴场建造'],'bath',pompeiiBathSource,['Pompeii’s Stabian and Republican baths were built in the second century BCE; their water and heating systems changed over time.','庞贝的斯塔比亚浴场与共和国浴场建于前2世纪；供水和加热设施后来多次改造。'],24,4,['aqueduct-refinement']],
 ['administrative-building',['Administrative Building','行政建筑'],'administration',pompeiiForumSource,['Pompeii’s Forum complex included a council chamber, record store, and magistrates’ building; their surviving phases need not all date to 49 BCE.','庞贝广场建筑群包括议事厅、档案库和地方官建筑；留存形态不一定全都属于前49年。'],23,4,['public-square-planning']],
 ['bridge-engineering',['Bridge Engineering','桥梁工程'],'bridge',appianSource,['Bridges extend practical roads across rivers.','桥梁使实用道路跨越河流。'],24,4,['roadmaking']],
 ['port-facilities',['Port Facilities','港口设施'],'port',massiliaSource,['Massilia received merchant ships and warships during the 49 BCE siege; port works still require a suitable coast.','前49年马赛围城时商船与战船进出港口；港口工程仍须依托适宜海岸。'],26,4,['roadmaking']],
 ['warehouse-management',['Warehouse Management','仓储管理'],'warehouse',massiliaSource,['At Massilia, provisions were gathered and reserved for a possible siege; storage capacity is a game abstraction.','马赛曾为可能的围城收集并储备粮食与物资；仓储容量是游戏抽象值。'],20,3,['grain-storage']],
 ['shipyard-craft',['Shipyard Craft','造船工艺'],'shipyard',massiliaSource,['Caesar reports twelve warships made at Arelate in 49 BCE and equipped before deployment; the card represents local yard organization.','凯撒记载前49年阿雷拉特建造并装备十二艘战船；此卡代表地方船厂组织。'],28,5,['port-facilities']]
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
 ['library',['Private Book Collection','私人藏书室'],'library-organization',25,4,{stone:2,timber:2},2,{researchDiscount:3},['plain','hills','urban'],'urban'],
 ['bath',['Bath','浴场'],'bath-construction',25,5,{stone:3,metal:1},2,{loyalty:1,healthRisk:-.002},['plain','hills','urban'],'water'],
 ['administration',['Administrative Building','行政官署'],'administrative-building',24,4,{stone:3,timber:2},2,{treasury:2,stability:1},['plain','hills','urban'],'urban'],
 ['bridge',['Bridge','桥梁'],'bridge-engineering',25,4,{stone:3,timber:2},1,{treasury:1,march:1},['plain','hills','forest','urban'],'water'],
 ['port',['Port','港口'],'port-facilities',30,5,{stone:4,timber:3},2,{treasury:2,food:1},['plain','hills','desert'],'coast'],
 ['warehouse',['Warehouse','仓库'],'warehouse-management',20,3,{stone:2,timber:2},1,{foodCapacity:40},['plain','hills','urban','desert']],
 ['shipyard',['Shipyard','造船厂'],'shipyard-craft',30,5,{stone:3,timber:4,metal:2},3,{treasury:2,seaSpeed:1},['plain','hills','desert'],'coast']
];
for(const [id,name,tech,cost,months,materials,upkeep,effects,terrain,site] of additionalBuildings)BUILDINGS.push({id,name,tech,cost,months,materials,upkeep,effects,terrain,site});
MATERIALS.push(
 {id:'improved-shipbuilding',name:['Improved Shipbuilding','改良造船'],cost:27,months:4,prerequisites:['shipyard-craft'],context:['Caesar reports warships built and equipped at Arelate within thirty days; the game models yard coordination, not a universal build time.','凯撒记载阿雷拉特在三十天内建造并装备战船；游戏模拟船厂协作，并非通用建造工期。'],source:source(massiliaSource,'Caesar, Civil Wars 1.36')},
 {id:'naval-equipment',name:['Heavy Naval Equipment','重型海军装备'],cost:32,months:5,prerequisites:['shipyard-craft','metalworking'],context:['Caesar describes grappling equipment prepared for the Massilia fleet; larger hulls are a separate game abstraction.','凯撒记载马赛战役舰队准备了钩爪等装备；大型船体是另行抽象的游戏设定。'],source:source(massiliaSource,'Caesar, Civil Wars 1.57')},
 {id:'repair-facilities',name:['Naval Repair Facilities','海军修理设施'],cost:25,months:4,prerequisites:['shipyard-craft'],context:['Massilia repaired and fitted out old ships after a naval defeat; the game models dockside repair crews.','马赛海战失利后修理并重新装备旧船；游戏据此模拟港边修船人员。'],source:source(siegeSource,'Caesar, Civil Wars 2.4')},
 {id:'maritime-warehousing',name:['Maritime Warehousing','海运仓储'],cost:23,months:3,prerequisites:['port-facilities'],context:['Massilia stored grain for an emergency during the siege; cargo throughput bonuses are game values.','马赛围城期间储备谷物以应急；货物吞吐加成属于游戏数值。'],source:source(siegeSource,'Caesar, Civil Wars 2.22')},
 {id:'military-transport-organization',name:['Military Transport Organization','军事海运组织'],cost:26,months:4,prerequisites:['shipyard-craft'],context:['Caesar describes scarce transport capacity and ships sent back for another crossing; the game abstracts improved loading capacity.','凯撒记载运兵船不足，以及舰船返航接运后续部队；游戏将改进装载能力作抽象处理。'],source:source(militaryTransportSource,'Caesar, Civil Wars 3.2, 3.29')}
);
BUILDINGS.push(
 {id:'naval-depot',name:['Naval Supply Depot','海军补给站'],tech:'port-facilities',cost:23,months:3,materials:{timber:2,stone:1},upkeep:1,effects:{navalSupply:12},terrain:['plain','hills','urban'],site:'coast'},
 {id:'dockyard',name:['Naval Dockyard','海军船坞'],tech:'repair-facilities',cost:29,months:5,materials:{timber:3,stone:2,metal:1},upkeep:2,effects:{navalRepair:8},terrain:['plain','hills','urban'],site:'coast'},
 {id:'coastal-fort',name:['Coastal Fortification','海岸堡垒'],tech:'stone-fortification',cost:30,months:5,materials:{stone:4,timber:1,metal:1},upkeep:2,effects:{navalDefense:4},terrain:['plain','hills','urban'],site:'coast'},
 {id:'naval-training',name:['Naval Training Facility','海军训练场'],tech:'shipyard-craft',cost:22,months:4,materials:{timber:2,stone:1},upkeep:2,effects:{navalExperience:2},terrain:['plain','hills','urban'],site:'coast'}
);
IDEAS.push(
 {id:'naval-crew-training',category:'military',name:['Naval Crew Training','海军船员训练'],cost:23,months:3,adopt:12,effects:{navalPower:.08,upkeep:2},context:['Caesar gathered rowers, sailors and helmsmen for a Gallic campaign; regular drills and combat gains are game interpretations.','凯撒为高卢战役召集桨手、水手和舵手；定期操练与战力加成属于游戏诠释。'],source:source(gallicNavySource,'Caesar, Gallic War 3.9')},
 {id:'fleet-coordination',category:'military',name:['Fleet Coordination','舰队协同'],cost:25,months:4,adopt:13,effects:{navalPower:.06,navalSupply:3,upkeep:1},context:['Caesar placed Brutus over his new fleet at Massilia and prepared crews for battle; the combat bonus is a game abstraction.','凯撒在马赛任命布鲁图斯统领新舰队并备战；战斗加成属于游戏抽象。'],source:source(massiliaSource,'Caesar, Civil Wars 1.36, 1.57')},
 {id:'maritime-administration',category:'government',name:['Maritime Administration','海务行政'],cost:23,months:3,adopt:12,effects:{navalTrade:1,upkeep:2},context:['Varro ordered ships built at Gades and Caesar received their accounts; a permanent maritime office is a game abstraction.','瓦罗下令在加的斯造船，凯撒接收相关账目；常设海务机关属于游戏抽象。'],source:source(siegeSource,'Caesar, Civil Wars 2.18–21')},
 {id:'harbor-regulation',category:'government',name:['Harbor Regulation','港口条例'],cost:22,months:3,adopt:10,effects:{navalSecurity:8,treasury:-1},context:['Earlier Rome–Carthage treaties restricted where ships could trade or stop; inspection and security gains are game interpretations.','早期罗马与迦太基条约限制船只贸易与停泊地点；检查与安全加成属于游戏诠释。'],source:source(polybiusTreatySource,'Polybius, Histories 3.22–24')},
 {id:'maritime-intelligence',category:'diplomacy',name:['Maritime Intelligence Networks','海事情报网'],cost:24,months:3,adopt:12,effects:{navalIntel:1,upkeep:1},context:['A small vessel warned Massilia of an approaching fleet; the game generalizes this courier into uncertain naval sightings.','一艘小船提前通报马赛舰队将至；游戏把这种信使概括成不确定的海上目击情报。'],source:source(siegeSource,'Caesar, Civil Wars 2.3')},
 {id:'commercial-treaties',category:'diplomacy',name:['Commercial Treaties','商业条约'],cost:25,months:3,adopt:12,effects:{navalTrade:1,upkeep:1},context:['Polybius records older treaty clauses on merchants and coastal access; the card does not claim those terms still applied in 49 BCE.','波利比乌斯记录较早条约中关于商人和沿海准入的条款；此卡不声称这些条款前49年仍然有效。'],source:source(polybiusTreatySource,'Polybius, Histories 3.22–26')},
 {id:'merchant-patronage',category:'economy',name:['Merchant Patronage','商人赞助'],cost:23,months:3,adopt:12,effects:{navalTrade:1,loyalty:-1},context:['Cicero argued for defending merchants and public revenue from pirates; selective patronage and its loyalty cost are game choices.','西塞罗主张保护商人与税收免遭海盗侵害；选择性赞助及其忠诚代价属于游戏设计。'],source:source(ciceroPiratesSource,'Cicero, De Lege Manilia 32–34')},
 {id:'state-supported-trade',category:'economy',name:['State-Supported Trade','国家扶助贸易'],cost:27,months:4,adopt:14,effects:{navalSecurity:10,treasury:-2},context:['Cicero credits Pompey with fleets and garrisons against pirates; their trade-security benefit is a speech claim, not a measured value.','西塞罗称庞培用舰队与驻军打击海盗；贸易安全收益来自演说陈述，并非可量化数值。'],source:source(ciceroPiratesSource,'Cicero, De Lege Manilia 32–35')},
 {id:'naval-engineering-education',category:'culture',name:['Naval Engineering Education','海军工程教育'],cost:25,months:4,adopt:13,effects:{navalRepair:4,upkeep:1},context:['Caesar ordered ships suited to British tides, showing adaptation of craft knowledge; no formal naval school or repair gain is documented.','凯撒下令建造适应不列颠潮汐的船只，显示工艺调整；史料未证明存在正规海军学校或修理加成。'],source:source(gallicShipsSource,'Caesar, Gallic War 5.1')},
 {id:'maritime-cultural-exchange',category:'culture',name:['Maritime Cultural Exchange','海上文化交流'],cost:22,months:3,adopt:11,effects:{navalTrade:1,stability:-1},context:['Pompeii shows Greek and Etruscan influence before 49 BCE; maritime transmission and political unease are game interpretations.','庞贝在前49年前已有希腊和伊特鲁里亚文化影响；海路传播与政治不安属于游戏诠释。'],source:source(pompeiiGreekSource,'Pompeii Archaeological Park, Antiquarium')}
);
const materialPrerequisites={'stone-fortification':['barracks-design'],'metal-extraction':['quarrying'],'urban-drainage':['water-control']};
const ideaPrerequisites={'reserve-mobilization':['legion-training'],'field-march-coordination':['legion-training'],'provincial-autonomy':['senatorial-consultation'],'commercial-agreements':['diplomatic-accommodation'],'estate-organization':['public-works'],'estate-labor-control':['estate-organization'],'negotiated-crop-shares':['estate-organization'],'civic-education':['rhetorical-education']};
for(const item of MATERIALS)item.prerequisites=materialPrerequisites[item.id]||item.prerequisites||[];
for(const item of IDEAS)item.prerequisites=ideaPrerequisites[item.id]||[];
import {figureActive} from './great-figures.js';
import {FACTIONS} from './data.js';
const ids = x => x.map(item=>item.id);
const strategicKnowledge=new Set(['stone-fortification','siege-machinery','legion-training']);
const metalDeposits=new Set(['hispaniaN','hispaniaS','illyricum','anatolia','armenia','gaul']);
const coastalSites=new Set(['narbo','hispaniaN','hispaniaS','italiaS','sicilia','africa','epirus','achaia','anatolia','syria','egypt','numidia','mauretania','bosporus']);
const waterSites=new Set(['gaul','cisalpine','narbo','hispaniaN','hispaniaS','italiaN','roma','italiaS','anatolia','syria','egypt','armenia']);
const urbanSites=new Set(['roma','egypt','anatolia','syria','achaia','sicilia']);
const fresh = faction => ({knownMaterial:faction==='egypt'?['water-control','grain-storage']:['roadmaking','grain-storage'],knownIdeas:[],foreignOrigins:{},slots:Object.fromEntries(IDEA_CATEGORIES.map(c=>[c.id,[null]])),research:null,adoption:null,expansion:null,trade:[],offers:[],purchaseRequests:[],exchangeRequests:[],agreementRequests:[],materials:{stone:6,timber:7,metal:3}});
export function initializeDevelopment(s){
  s.development ||= {};
  s.knowledgeAgreements=Array.isArray(s.knowledgeAgreements)?s.knowledgeAgreements.filter(a=>a&&typeof a.a==='string'&&typeof a.b==='string'&&a.a!==a.b&&s.factions[a.a]&&s.factions[a.b]&&Number.isInteger(a.remaining)&&a.remaining>0&&a.remaining<=12&&Number.isInteger(a.next)&&a.next>0&&a.next<=3):[];
  for(const id of Object.keys(s.factions).filter(id=>id!=='rebels')){
    const d=s.development[id] ||= fresh(id);
    d.knownMaterial ||= fresh(id).knownMaterial;d.knownIdeas ||= [];
    d.slots ||= fresh(id).slots;for(const c of IDEA_CATEGORIES)d.slots[c.id] ||= [null];
    d.materials ||= {stone:6,timber:7,metal:3};d.trade ||= [];d.offers=Array.isArray(d.offers)?d.offers.filter(o=>o&&typeof o.seller==='string'&&s.factions[o.seller]&&['material','idea'].includes(o.branch)&&typeof o.id==='string'&&Number.isFinite(o.remaining)&&o.remaining>0&&o.remaining<=12):[];d.purchaseRequests=Array.isArray(d.purchaseRequests)?d.purchaseRequests.filter(o=>o&&typeof o.buyer==='string'&&o.buyer!=='rebels'&&s.factions[o.buyer]&&['material','idea'].includes(o.branch)&&typeof o.id==='string'&&Number.isFinite(o.remaining)&&o.remaining>0&&o.remaining<=12):[];d.foreignOrigins ||= {};d.visitingScholars ||= [];
    d.exchangeRequests=Array.isArray(d.exchangeRequests)?d.exchangeRequests.filter(o=>o&&o.partner!==id&&o.partner!=='rebels'&&s.factions[o.partner]&&['material','idea'].includes(o.offerBranch)&&['material','idea'].includes(o.wantBranch)&&typeof o.offerId==='string'&&typeof o.wantId==='string'&&Number.isFinite(o.remaining)&&o.remaining>0&&o.remaining<=12):[];
    d.agreementRequests=Array.isArray(d.agreementRequests)?d.agreementRequests.filter(o=>o&&o.partner!==id&&o.partner!=='rebels'&&s.factions[o.partner]&&Number.isInteger(o.remaining)&&o.remaining>0&&o.remaining<=4&&Number.isInteger(o.sentYear)&&Number.isInteger(o.sentMonth)&&o.sentMonth>=1&&o.sentMonth<=12):[];
  }
  for(const r of s.regions){r.buildings ||= [];r.construction ||= null}
  return s;
}
export const development = (s,id) => (initializeDevelopment(s),s.development[id]);
const visitingScholarFor=(s,owner,branch,id)=>development(s,owner)?.visitingScholars.find(visit=>visit.remaining>0&&!visit.travelRemaining&&(!visit.id||visit.branch===branch&&visit.id===id));
export function scholarResearchBonus(s,owner,branch,id){return !!visitingScholarFor(s,owner,branch,id)}
export function activeEffects(s,id){
  const d=development(s,id),result={};if(!d)return result;
  for(const ideaId of Object.values(d.slots).flat().filter(Boolean))for(const [key,value] of Object.entries(IDEAS.find(i=>i.id===ideaId)?.effects||{}))result[key]=(result[key]||0)+value;
  for(const r of s.regions.filter(x=>x.owner===id))for(const buildingId of r.buildings){const e=BUILDINGS.find(x=>x.id===buildingId)?.effects||{};for(const key of ['researchDiscount','constructionDiscount'])result[key]=(result[key]||0)+(e[key]||0)}
  return result;
}
export function taxReviewExpense(s,owner){
 if(!s.grandMap||s.factions[owner]?.tax!=='high'||!development(s,owner)?.slots?.government?.includes('provincial-tax-review'))return 0;
 return Math.ceil(s.regions.filter(r=>r.owner===owner&&(r.integration??60)>=65).length/12);
}
export function researchInnovation(s,owner,branch,id){
  const d=development(s,owner),item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id),f=s.factions[owner];
  if(!item||d.research||d[branch==='material'?'knownMaterial':'knownIdeas'].includes(id))return {ok:false,reason:'unavailable'};
  if(item.prerequisites.some(pre=>!d[branch==='material'?'knownMaterial':'knownIdeas'].includes(pre)))return {ok:false,reason:'prerequisite'};
  const visitingScholar=visitingScholarFor(s,owner,branch,id),visitor=!!visitingScholar;
  const cost=Math.max(8,item.cost-(activeEffects(s,owner).researchDiscount||0)-(figureActive(s,owner,'scholar')?3:0)-(visitor?3:0));
  if(f.treasury<cost)return {ok:false,reason:'treasury'};
  f.treasury-=cost;recordExpense(s,owner,'research',cost);d.research={branch,id,remaining:Math.max(1,item.months-(figureActive(s,owner,'scholar')?1:0)-(visitor?1:0)),scholarPartner:visitingScholar?.id?visitingScholar.partner:null};return {ok:true};
}
export function ideaCompatibility(s,owner,ideaId,slot){
  const d=development(s,owner),idea=IDEAS.find(i=>i.id===ideaId);
  if(!idea)return {ok:false,reason:'unknown'};
  if(slot!==undefined&&(!Number.isInteger(slot)||slot<0||slot>=d.slots[idea.category].length))return {ok:false,reason:'unavailable'};
  const active=Object.entries(d.slots).flatMap(([category,slots])=>slots.filter((id,index)=>id&&!(category===idea.category&&index===slot)));
  if(active.includes(ideaId))return {ok:false,reason:'duplicate',with:ideaId};
  const conflict=active.find(id=>idea.conflicts?.includes(id)||IDEAS.find(x=>x.id===id)?.conflicts?.includes(ideaId));
  return conflict?{ok:false,reason:'conflict',with:conflict}:{ok:true};
}
export function ideaAdoptionPlan(s,owner,ideaId,slot=0){
  const d=development(s,owner),idea=IDEAS.find(x=>x.id===ideaId),f=s.factions[owner];
  if(!idea||!Number.isInteger(slot)||slot<0||slot>=d.slots[idea.category]?.length)return {ok:false,reason:'unavailable'};
  const old=d.slots[idea.category][slot],specialist=idea.category==='military'?'military':idea.category==='government'?'statesman':idea.category==='culture'?'religious':null;
  const plan={cost:idea.adopt,months:Math.max(1,(old?3:2)+(activeEffects(s,owner).decisionDelay||0)+(d.foreignOrigins[ideaId]||idea.origin&&owner!==idea.origin?2:0)-(specialist&&figureActive(s,owner,specialist)?1:0)),stabilityLoss:old&&old!==ideaId?2:0,old};
  if(!d.knownIdeas.includes(ideaId)||d.adoption)return {...plan,ok:false,reason:'unavailable'};
  const compatible=ideaCompatibility(s,owner,ideaId,slot);if(!compatible.ok)return {...plan,...compatible};
  if(old===ideaId)return {...plan,ok:false,reason:'active'};
  if(f.treasury<plan.cost)return {...plan,ok:false,reason:'treasury'};
  return {...plan,ok:true};
}
export function adoptIdea(s,owner,ideaId,slot=0){
  const plan=ideaAdoptionPlan(s,owner,ideaId,slot);if(!plan.ok)return {ok:false,reason:plan.reason,...(plan.with?{with:plan.with}:{})};
  const d=development(s,owner),idea=IDEAS.find(x=>x.id===ideaId),f=s.factions[owner];
  f.treasury-=plan.cost;d.adoption={ideaId,category:idea.category,slot,remaining:plan.months,old:plan.old};
  if(plan.stabilityLoss)f.stability=Math.max(0,f.stability-plan.stabilityLoss);
  return {ok:true};
}
export function removeIdea(s,owner,category,slot=0){
  const d=development(s,owner),current=d.slots[category]?.[slot],f=s.factions[owner];
  if(!current||d.adoption||f.treasury<5)return {ok:false,reason:'unavailable'};
  f.treasury-=5;d.adoption={ideaId:null,category,slot,remaining:2,old:current};return {ok:true};
}
export function ideaSlotExpansionCheck(s,owner,category){
  const d=development(s,owner),slots=d.slots[category],f=s.factions[owner];
  if(!slots||slots.length>=3||d.expansion)return {ok:false,reason:'capacity'};
  const known=d.knownIdeas.filter(id=>IDEAS.find(i=>i.id===id)?.category===category).length;
  if(known<slots.length+1)return {ok:false,reason:'knowledge'};
  const active=Object.values(d.slots).flat().filter(Boolean),owned=s.regions.filter(r=>r.owner===owner);
  const administration=active.some(id=>['senatorial-consultation','central-administration','maritime-administration'].includes(id))||owned.some(r=>r.buildings?.includes('administration'));
  const education=active.some(id=>['rhetorical-education','civic-education','naval-engineering-education'].includes(id))||owned.some(r=>r.buildings?.includes('library'));
  if(slots.length===1&&!administration&&!education||slots.length===2&&(!administration||!education||f.stability<55))return {ok:false,reason:'institution'};
  const cost=slots.length===1?35:60,months=slots.length===1?6:9;
  return f.treasury<cost?{ok:false,reason:'treasury',cost,months}:{ok:true,cost,months};
}
export function expandIdeaSlot(s,owner,category){
  const check=ideaSlotExpansionCheck(s,owner,category);if(!check.ok)return check;
  const d=development(s,owner);s.factions[owner].treasury-=check.cost;d.expansion={category,remaining:check.months};return {ok:true,cost:check.cost,months:check.months};
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
  s.factions[owner].treasury-=check.cost;recordExpense(s,owner,'construction',check.cost);for(const [k,v] of Object.entries(b.materials))d.materials[k]-=v;
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
  if(seller===s.player&&buyer!==s.player)return {ok:false,reason:'consent'};
  const bd=s.development[buyer],sd=s.development[seller],buyerFaction=s.factions[buyer],sellerFaction=s.factions[seller];
  const key=branch==='material'?'knownMaterial':branch==='idea'?'knownIdeas':null;
  const item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);
  if(!key||!item||!bd||!sd||!sd[key].includes(id)||bd[key].includes(id)||bd.trade.some(t=>t.id===id&&t.branch===branch))return {ok:false,reason:'knowledge'};
  if(s.wars.some(w=>w.includes(buyer)&&w.includes(seller)))return {ok:false,reason:'war'};
  const relation=s.relations[[buyer,seller].sort().join(':')]||0;
  if(relation<0)return {ok:false,reason:'relations'};
  if(strategicKnowledge.has(id)&&relation<30)return {ok:false,reason:'strategic'};
  const price=Math.max(16,Math.round(item.cost*1.3));
  if(buyerFaction.treasury<price)return {ok:false,reason:'treasury'};
  buyerFaction.treasury-=price;sellerFaction.treasury+=Math.round(price*.7);
  bd.trade.push({seller,branch,id,remaining:2});return {ok:true,price};
}
export function sellKnowledge(s,seller,buyer,branch,id){
 initializeDevelopment(s);const source=s.development[seller],recipient=s.development[buyer],key=branch==='material'?'knownMaterial':branch==='idea'?'knownIdeas':null,item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);
 if(!source||!recipient||!key||!item||!source[key].includes(id)||recipient[key].includes(id)||recipient.trade.some(t=>t.id===id&&t.branch===branch))return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(seller)&&w.includes(buyer)))return {ok:false,reason:'war'};
 const relation=s.relations[[seller,buyer].sort().join(':')]??0,price=Math.max(12,Math.round(item.cost*.9));
 if(relation<15)return {ok:false,reason:'relations'};
 if(strategicKnowledge.has(id)&&relation<30)return {ok:false,reason:'strategic'};
 // An AI buyer must keep the ordinary 24-treasury levy reserve. Human buyers
 // may deliberately spend their last treasury on a quoted knowledge offer.
 if(s.factions[buyer].treasury<price+(buyer===s.player?0:24))return {ok:false,reason:'buyer treasury'};
 s.factions[buyer].treasury-=price;s.factions[seller].treasury+=price;
 recipient.trade.push({seller,branch,id,remaining:2,method:'sale'});return {ok:true,price};
}
export function proposeKnowledgeSale(s,seller,buyer,branch,id){
 initializeDevelopment(s);
 if(seller===buyer||buyer!==s.player||seller===s.player)return {ok:false,reason:'recipient'};
 const source=s.development[seller],recipient=s.development[buyer],key=branch==='material'?'knownMaterial':branch==='idea'?'knownIdeas':null;
 const item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);
 if(!source||!recipient||!key||!item||!source[key].includes(id)||recipient[key].includes(id)||recipient.trade.some(t=>t.branch===branch&&t.id===id)||recipient.offers.some(o=>o.seller===seller&&o.branch===branch&&o.id===id)||recipient.offers.length>=3)return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(seller)&&w.includes(buyer)))return {ok:false,reason:'war'};
 const relation=s.relations[[seller,buyer].sort().join(':')]??0;
 if(relation<15)return {ok:false,reason:'relations'};
 if(strategicKnowledge.has(id)&&relation<30)return {ok:false,reason:'strategic'};
 const price=Math.max(12,Math.round(item.cost*.9));
 recipient.offers.push({seller,branch,id,price,remaining:4});return {ok:true,price,months:4};
}
export function proposeKnowledgePurchase(s,buyer,seller,branch,id){
 initializeDevelopment(s);
 if(seller!==s.player||buyer===s.player||buyer===seller)return {ok:false,reason:'recipient'};
 const source=s.development[seller],recipient=s.development[buyer],key=branch==='material'?'knownMaterial':branch==='idea'?'knownIdeas':null;
 const item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);
 if(!source||!recipient||!key||!item||!source[key].includes(id)||recipient[key].includes(id)||recipient.trade.some(t=>t.branch===branch&&t.id===id)||source.purchaseRequests.some(o=>o.buyer===buyer&&o.branch===branch&&o.id===id)||source.purchaseRequests.length>=3)return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(seller)&&w.includes(buyer)))return {ok:false,reason:'war'};
 const relation=s.relations[[seller,buyer].sort().join(':')]??0;
 if(relation<15)return {ok:false,reason:'relations'};
 if(strategicKnowledge.has(id)&&relation<30)return {ok:false,reason:'strategic'};
 const price=Math.max(12,Math.round(item.cost*.9));
 if(s.factions[buyer].treasury<price+24)return {ok:false,reason:'buyer treasury'};
 source.purchaseRequests.push({buyer,branch,id,price,remaining:4});return {ok:true,price,months:4};
}
export function acceptKnowledgePurchase(s,seller,buyer,branch,id){
 const source=development(s,seller),request=source?.purchaseRequests.find(o=>o.buyer===buyer&&o.branch===branch&&o.id===id);
 if(!request||seller!==s.player)return {ok:false,reason:'request'};
 const result=sellKnowledge(s,seller,buyer,branch,id);
 if(result.ok)source.purchaseRequests.splice(source.purchaseRequests.indexOf(request),1);
 return result;
}
export function declineKnowledgePurchase(s,seller,buyer,branch,id){
 const source=development(s,seller),request=source?.purchaseRequests.find(o=>o.buyer===buyer&&o.branch===branch&&o.id===id);
 if(!request||seller!==s.player)return {ok:false,reason:'request'};
 source.purchaseRequests.splice(source.purchaseRequests.indexOf(request),1);return {ok:true};
}
export function acceptKnowledgeOffer(s,buyer,seller,branch,id){
 const recipient=development(s,buyer),offer=recipient?.offers.find(o=>o.seller===seller&&o.branch===branch&&o.id===id);
 if(!offer||buyer!==s.player)return {ok:false,reason:'offer'};
 const result=sellKnowledge(s,seller,buyer,branch,id);
 if(result.ok)recipient.offers.splice(recipient.offers.indexOf(offer),1);
 return result;
}
export function declineKnowledgeOffer(s,buyer,seller,branch,id){
 const recipient=development(s,buyer),offer=recipient?.offers.find(o=>o.seller===seller&&o.branch===branch&&o.id===id);
 if(!offer||buyer!==s.player)return {ok:false,reason:'offer'};
 recipient.offers.splice(recipient.offers.indexOf(offer),1);return {ok:true};
}
export function exchangeKnowledge(s,a,b,offerBranch,offerId,wantBranch,wantId){
 initializeDevelopment(s);const ad=s.development[a],bd=s.development[b],ak=offerBranch==='material'?'knownMaterial':offerBranch==='idea'?'knownIdeas':null,bk=wantBranch==='material'?'knownMaterial':wantBranch==='idea'?'knownIdeas':null;
 if(b===s.player&&a!==s.player)return {ok:false,reason:'consent'};
 if(!ad||!bd||!ak||!bk||!ad[ak].includes(offerId)||!bd[bk].includes(wantId)||ad[bk].includes(wantId)||bd[ak].includes(offerId))return {ok:false,reason:'knowledge'};
 if(ad.trade.some(t=>t.id===wantId&&t.branch===wantBranch)||bd.trade.some(t=>t.id===offerId&&t.branch===offerBranch))return {ok:false,reason:'pending'};
 if(s.wars.some(w=>w.includes(a)&&w.includes(b)))return {ok:false,reason:'war'};
 if((s.relations[[a,b].sort().join(':')]??0)<20)return {ok:false,reason:'relations'};
 if((strategicKnowledge.has(offerId)||strategicKnowledge.has(wantId))&&(s.relations[[a,b].sort().join(':')]??0)<30)return {ok:false,reason:'strategic'};
 if(s.factions[a].treasury<8||s.factions[b].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[a].treasury-=8;s.factions[b].treasury-=8;
 ad.trade.push({seller:b,branch:wantBranch,id:wantId,remaining:3,method:'exchange'});
 bd.trade.push({seller:a,branch:offerBranch,id:offerId,remaining:3,method:'exchange'});
 return {ok:true,months:3,cost:8};
}
export function proposeKnowledgeExchange(s,partner,player,offerBranch,offerId,wantBranch,wantId){
 initializeDevelopment(s);
 if(player!==s.player||partner===player)return {ok:false,reason:'recipient'};
 const pd=s.development[partner],recipient=s.development[player],offerKey=offerBranch==='material'?'knownMaterial':offerBranch==='idea'?'knownIdeas':null,wantKey=wantBranch==='material'?'knownMaterial':wantBranch==='idea'?'knownIdeas':null;
 if(!pd||!recipient||!offerKey||!wantKey||!(offerBranch==='material'?MATERIALS:IDEAS).some(x=>x.id===offerId)||!(wantBranch==='material'?MATERIALS:IDEAS).some(x=>x.id===wantId)||!pd[offerKey].includes(offerId)||!recipient[wantKey].includes(wantId)||pd[wantKey].includes(wantId)||recipient[offerKey].includes(offerId)||pd.trade.some(t=>t.branch===wantBranch&&t.id===wantId)||recipient.trade.some(t=>t.branch===offerBranch&&t.id===offerId)||recipient.exchangeRequests.some(x=>x.partner===partner)||recipient.exchangeRequests.length>=3)return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(partner)&&w.includes(player)))return {ok:false,reason:'war'};
 const relation=s.relations[[partner,player].sort().join(':')]??0;
 if(relation<20)return {ok:false,reason:'relations'};
 if((strategicKnowledge.has(offerId)||strategicKnowledge.has(wantId))&&relation<30)return {ok:false,reason:'strategic'};
 if(s.factions[partner].treasury<8||s.factions[player].treasury<8)return {ok:false,reason:'treasury'};
 recipient.exchangeRequests.push({partner,offerBranch,offerId,wantBranch,wantId,remaining:4});return {ok:true,months:4};
}
export function acceptKnowledgeExchange(s,player,partner,offerBranch,offerId,wantBranch,wantId){
 const recipient=development(s,player),request=recipient?.exchangeRequests.find(x=>x.partner===partner&&x.offerBranch===offerBranch&&x.offerId===offerId&&x.wantBranch===wantBranch&&x.wantId===wantId);
 if(!request||player!==s.player)return {ok:false,reason:'request'};
 const result=exchangeKnowledge(s,player,partner,wantBranch,wantId,offerBranch,offerId);
 if(result.ok)recipient.exchangeRequests.splice(recipient.exchangeRequests.indexOf(request),1);
 return result;
}
export function declineKnowledgeExchange(s,player,partner,offerBranch,offerId,wantBranch,wantId){
 const recipient=development(s,player),request=recipient?.exchangeRequests.find(x=>x.partner===partner&&x.offerBranch===offerBranch&&x.offerId===offerId&&x.wantBranch===wantBranch&&x.wantId===wantId);
 if(!request||player!==s.player)return {ok:false,reason:'request'};
 recipient.exchangeRequests.splice(recipient.exchangeRequests.indexOf(request),1);return {ok:true};
}
export function scholarVisitTopics(s,host,partner){
 initializeDevelopment(s);const hd=s.development[host],pd=s.development[partner];
 if(!hd||!pd)return [];
 return [...MATERIALS.map(item=>({branch:'material',item})),...IDEAS.map(item=>({branch:'idea',item}))].filter(({branch,item})=>{const key=branch==='material'?'knownMaterial':'knownIdeas';return !strategicKnowledge.has(item.id)&&pd[key].includes(item.id)&&!hd[key].includes(item.id)&&!hd.trade.some(t=>t.branch===branch&&t.id===item.id)&&!(hd.research?.branch===branch&&hd.research.id===item.id)&&item.prerequisites.every(id=>hd[key].includes(id))});
}
export function scholarVisitCheck(s,host,partner,branch,id){
 initializeDevelopment(s);const hd=s.development[host],pd=s.development[partner],relation=s.relations[[host,partner].sort().join(':')]??0;
 if(!hd||!pd||host===partner||!s.regions.some(r=>r.owner===host)||!s.regions.some(r=>r.owner===partner)||s.wars.some(w=>w.includes(host)&&w.includes(partner)))return {ok:false,reason:'partner'};
 if(relation<20)return {ok:false,reason:'relations'};
 if(hd.visitingScholars.some(x=>x.partner===partner))return {ok:false,reason:'already invited'};
 const topics=scholarVisitTopics(s,host,partner),candidate=branch===undefined&&id===undefined?topics[0]:topics.find(topic=>topic.branch===branch&&topic.item.id===id);
 if(!candidate)return {ok:false,reason:'expertise'};
 const origin=s.regions.find(r=>r.owner===partner&&r.terrain==='urban')||s.regions.find(r=>r.owner===partner),destination=s.regions.find(r=>r.owner===host&&r.terrain==='urban')||s.regions.find(r=>r.owner===host);
 const distance=[origin.x,origin.y,destination.x,destination.y].every(Number.isFinite)?Math.hypot(origin.x-destination.x,origin.y-destination.y):320,travel=Math.max(2,Math.min(6,Math.ceil(distance/160)));
 if(s.factions[host].treasury<24)return {ok:false,reason:'treasury',travel};
 return {ok:true,branch:candidate.branch,id:candidate.item.id,travel,months:6,cost:24,origin:origin.id,destination:destination.id};
}
export function inviteForeignScholars(s,host,partner,branch,id){
 const check=scholarVisitCheck(s,host,partner,branch,id);if(!check.ok)return check;
 s.factions[host].treasury-=check.cost;s.factions[partner].treasury+=10;
 s.development[host].visitingScholars.push({partner,branch:check.branch,id:check.id,origin:check.origin,destination:check.destination,travelRemaining:check.travel,remaining:check.months,sentYear:s.year,sentMonth:s.month});
 return check;
}
function agreementCandidate(s,seller,buyer,cycle=0){
 const source=s.development[seller],recipient=s.development[buyer];if(!source||!recipient)return null;
 for(const branch of cycle%2?['idea','material']:['material','idea']){
  const key=branch==='material'?'knownMaterial':'knownIdeas';
  const id=source[key].find(id=>!strategicKnowledge.has(id)&&!recipient[key].includes(id)&&!recipient.trade.some(t=>t.branch===branch&&t.id===id));
  if(id)return {branch,id};
 }
 return null;
}
export function knowledgeAgreementCheck(s,a,b){
 initializeDevelopment(s);
 if(a===b||!s.development[a]||!s.development[b]||!s.regions.some(r=>r.owner===a)||!s.regions.some(r=>r.owner===b))return {ok:false,reason:'partner'};
 if(s.knowledgeAgreements.some(x=>x.a===a&&x.b===b||x.a===b&&x.b===a))return {ok:false,reason:'existing'};
 if(s.wars.some(w=>w.includes(a)&&w.includes(b)))return {ok:false,reason:'war'};
 if((s.relations[[a,b].sort().join(':')]??0)<45)return {ok:false,reason:'relations'};
 if(s.factions[a].treasury<20||s.factions[b].treasury<20)return {ok:false,reason:'treasury'};
 if(!agreementCandidate(s,a,b)||!agreementCandidate(s,b,a))return {ok:false,reason:'knowledge'};
 return {ok:true,cost:20,months:12};
}
export function proposeKnowledgeAgreement(s,partner,player){
 initializeDevelopment(s);
 if(player!==s.player||partner===player||partner==='rebels')return {ok:false,reason:'recipient'};
 const requests=s.development[player]?.agreementRequests;
 if(!requests||requests.some(x=>x.partner===partner)||requests.length>=3)return {ok:false,reason:'request'};
 const check=knowledgeAgreementCheck(s,partner,player);if(!check.ok)return check;
 s.development[player].agreementRequests.push({partner,sentYear:s.year,sentMonth:s.month,remaining:4});
 return {ok:true,cost:check.cost,months:check.months,offerMonths:4};
}
export function negotiateKnowledgeAgreement(s,a,b){
 if(a!==s.player&&b===s.player)return {ok:false,reason:'consent'};
 const check=knowledgeAgreementCheck(s,a,b);if(!check.ok)return check;
 s.factions[a].treasury-=20;s.factions[b].treasury-=20;
 s.knowledgeAgreements.push({a,b,remaining:12,next:3,cycle:0});
 if(a===s.player||b===s.player){const requests=s.development[s.player].agreementRequests;for(let i=requests.length-1;i>=0;i--)if(requests[i].partner===(a===s.player?b:a))requests.splice(i,1)}
 return check;
}
export function acceptKnowledgeAgreement(s,player,partner){
 const requests=development(s,player)?.agreementRequests;
 if(player!==s.player||!requests?.some(x=>x.partner===partner))return {ok:false,reason:'request'};
 return negotiateKnowledgeAgreement(s,player,partner);
}
export function declineKnowledgeAgreement(s,player,partner){
 const requests=development(s,player)?.agreementRequests,request=requests?.find(x=>x.partner===partner);
 if(player!==s.player||!request)return {ok:false,reason:'request'};
 requests.splice(requests.indexOf(request),1);return {ok:true};
}
export function cancelKnowledgeAgreement(s,a,b){
 initializeDevelopment(s);
 if(a!==s.player)return {ok:false,reason:'consent'};
 const agreement=s.knowledgeAgreements.find(x=>x.a===a&&x.b===b||x.a===b&&x.b===a);
 if(!agreement)return {ok:false,reason:'agreement'};
 s.knowledgeAgreements.splice(s.knowledgeAgreements.indexOf(agreement),1);return {ok:true};
}
export function advanceDevelopment(s,log=()=>{}){
  initializeDevelopment(s);
  for(const [owner,d] of Object.entries(s.development)){
    const f=s.factions[owner];if(!f)continue;
    if(d.research&&--d.research.remaining<=0){const {branch,id,scholarPartner}=d.research;d[branch==='material'?'knownMaterial':'knownIdeas'].push(id);if(branch==='idea'&&scholarPartner)d.foreignOrigins[id]=scholarPartner;d.research=null;if(owner===s.player){const name=(branch==='material'?MATERIALS:IDEAS).find(item=>item.id===id)?.name||[id,id];log(`Research completed: ${name[0]}.`,`研究完成：${name[1]}。`)}}
    if(d.adoption&&--d.adoption.remaining<=0){const {category,slot,ideaId}=d.adoption;d.slots[category][slot]=ideaId;d.adoption=null;if(owner===s.player){const name=IDEAS.find(item=>item.id===ideaId)?.name||[ideaId||'removed',ideaId||'已移除'];log(`National idea ${name[0]} is now in effect.`,`国家理念${name[1]}现已生效。`)}}
    if(d.expansion&&--d.expansion.remaining<=0){d.slots[d.expansion.category].push(null);d.expansion=null}
    d.offers=d.offers.filter(offer=>--offer.remaining>0&&!d[offer.branch==='material'?'knownMaterial':'knownIdeas'].includes(offer.id)&&!d.trade.some(t=>t.branch===offer.branch&&t.id===offer.id));
    d.purchaseRequests=d.purchaseRequests.filter(request=>--request.remaining>0&&!s.wars.some(w=>w.includes(owner)&&w.includes(request.buyer))&&d[request.branch==='material'?'knownMaterial':'knownIdeas'].includes(request.id)&&!s.development[request.buyer]?.[request.branch==='material'?'knownMaterial':'knownIdeas'].includes(request.id)&&!s.development[request.buyer]?.trade.some(t=>t.branch===request.branch&&t.id===request.id));
    d.exchangeRequests=d.exchangeRequests.filter(request=>--request.remaining>0&&!s.wars.some(w=>w.includes(owner)&&w.includes(request.partner))&&d[request.wantBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.wantId)&&!d[request.offerBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.offerId)&&s.development[request.partner]?.[request.offerBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.offerId)&&!s.development[request.partner]?.[request.wantBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.wantId)&&!d.trade.some(t=>t.branch===request.offerBranch&&t.id===request.offerId)&&!s.development[request.partner]?.trade.some(t=>t.branch===request.wantBranch&&t.id===request.wantId));
    d.agreementRequests=d.agreementRequests.filter(request=>--request.remaining>0&&!s.wars.some(w=>w.includes(owner)&&w.includes(request.partner))&&(s.relations[[owner,request.partner].sort().join(':')]??0)>=20&&s.regions.some(r=>r.owner===owner)&&s.regions.some(r=>r.owner===request.partner)&&!s.knowledgeAgreements.some(a=>a.a===owner&&a.b===request.partner||a.a===request.partner&&a.b===owner));
    for(const trade of [...d.trade])if(--trade.remaining<=0){const key=trade.branch==='material'?'knownMaterial':'knownIdeas';if(!d[key].includes(trade.id))d[key].push(trade.id);if(trade.branch==='idea')d.foreignOrigins[trade.id]=trade.seller;d.trade.splice(d.trade.indexOf(trade),1);if(owner===s.player){const name=(trade.branch==='material'?MATERIALS:IDEAS).find(item=>item.id===trade.id)?.name||[trade.id,trade.id],seller=FACTIONS[trade.seller]?.short||[trade.seller,trade.seller];log(`Knowledge arrived from ${seller[0]}: ${name[0]}.`,`来自${seller[1]}的知识已传入：${name[1]}。`)}}
    for(const visit of [...d.visitingScholars]){
      if(s.wars.some(w=>w.includes(owner)&&w.includes(visit.partner))||!s.regions.some(r=>r.owner===owner)||!s.regions.some(r=>r.owner===visit.partner)){d.visitingScholars.splice(d.visitingScholars.indexOf(visit),1);continue}
      if(visit.travelRemaining>0){visit.travelRemaining--;if(!visit.travelRemaining&&owner===s.player){const name=(visit.branch==='material'?MATERIALS:IDEAS).find(item=>item.id===visit.id)?.name||[visit.id,visit.id];log(`Scholars arrived to advise research on ${name[0]}.`,`外国学者抵达，将协助研究${name[1]}。`)}continue}
      if(--visit.remaining<=0)d.visitingScholars.splice(d.visitingScholars.indexOf(visit),1);
    }
    const added={stone:0,timber:0,metal:0};
    for(const r of s.regions.filter(x=>x.owner===owner)){
      if(r.terrain==='forest')added.timber+=2;
      if(r.terrain==='hills')added.stone++;
      for(const id of r.buildings){const b=BUILDINGS.find(x=>x.id===id);for(const k of ['stone','timber','metal'])added[k]+=b?.effects[k]||0}
    }
    for(const k of Object.keys(added))d.materials[k]=Math.min(100,d.materials[k]+added[k]);
    f.treasury-=Object.values(d.slots).reduce((n,slots)=>n+Math.max(0,slots.length-1),0)+taxReviewExpense(s,owner);
    const relationEffect=activeEffects(s,owner).relations||0;
    if(relationEffect)for(const other of Object.keys(s.development).filter(id=>id!==owner&&!s.wars.some(w=>w.includes(owner)&&w.includes(id)))){
      const key=[owner,other].sort().join(':');s.relations[key]=Math.max(-100,Math.min(100,(s.relations[key]||0)+relationEffect));
    }
  }
  for(const r of s.regions){const c=r.construction;if(!c)continue;if(r.owner!==c.owner){r.construction=null;continue}if(--c.remaining<=0){r.buildings.push(c.buildingId);if(c.buildingId==='fort')r.fort++;if(c.buildingId==='monument'&&c.inscription)(r.inscriptions||=[]).push({text:c.inscription,owner:c.owner,year:s.year,month:s.month});if(c.owner===s.player)log(`${c.buildingId} completed in ${r.name[0]}.`,`${r.name[1]}的${c.buildingId}建成。`);r.construction=null}}
  for(const agreement of [...s.knowledgeAgreements]){
    const {a,b}=agreement;
    if(s.wars.some(w=>w.includes(a)&&w.includes(b))||(s.relations[[a,b].sort().join(':')]??0)<20||!s.regions.some(r=>r.owner===a)||!s.regions.some(r=>r.owner===b)){
      s.knowledgeAgreements.splice(s.knowledgeAgreements.indexOf(agreement),1);continue;
    }
    if(--agreement.next<=0){
      for(const [seller,buyer] of [[a,b],[b,a]]){
        const candidate=agreementCandidate(s,seller,buyer,agreement.cycle);
        if(candidate)s.development[buyer].trade.push({seller,...candidate,remaining:2,method:'agreement'});
      }
      agreement.next=3;agreement.cycle++;
    }
    if(--agreement.remaining<=0)s.knowledgeAgreements.splice(s.knowledgeAgreements.indexOf(agreement),1);
  }
}
export function localBuildingEffects(r){const out={};for(const id of r.buildings||[]){const b=BUILDINGS.find(x=>x.id===id);if(!b)continue;for(const [k,v] of Object.entries(b.effects))out[k]=(out[k]||0)+v;out.upkeep=(out.upkeep||0)+b.upkeep}return out}
export const developmentCatalogIds={ideas:ids(IDEAS),materials:ids(MATERIALS),buildings:ids(BUILDINGS)};
