import {recordExpense} from './expense-ledger.js?v=3';

// Phase XIV. All numbers below are game balance values, not historical measurements.
export const IDEA_CATEGORIES = [
  {id:'military',name:['Military & Training','军事与训练']},
  {id:'government',name:['Government & Law','政治与法律']},
  {id:'diplomacy',name:['Diplomacy & Intelligence','外交与情报']},
  {id:'economy',name:['Economy & Society','经济与社会']},
  {id:'culture',name:['Education, Culture & Belief','教育、文化与信仰']}
];
export const IDEA_SLOT_ADMIN_UPKEEP=1;
const appianSource='https://whc.unesco.org/en/list/1708/';
const gracchusMilestonesSource='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Caius_Gracchus%2A.html';
const miningSource='https://oxrep.web.ox.ac.uk/mines-database';
const quarrySource='https://oxrep.web.ox.ac.uk/stone-quarries-database';
const alesiaSource='https://alesia.com/en/archaeology/';
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
const alyziaDamSource='https://www.issmge.org/uploads/publications/145/146/tc301-2026-107.pdf';
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
const source=(url,title)=>({title:title??(url.includes('metmuseum')?'Metropolitan Museum of Art':url.includes('whc.unesco')?'UNESCO World Heritage Centre':url.includes('oxrep.web.ox')?'Oxford Roman Economy Project':url.includes('musee-archeologie')?'Musée d’Archéologie nationale':url.includes('numanciasoria')?'Numancia Archaeological Site':url.includes('/Cato/')?'Cato, On Agriculture':url.includes('attalus.org/cicero/caelius')?'Cicero, Pro Caelio 11':url.includes('/Plutarch/Lives/Caius_Gracchus')?'Plutarch, Life of Caius Gracchus 7.2':url.includes('/Caesar/Civil_Wars/')?'Caesar, Civil Wars':url.includes('uni-heidelberg.de')?'Germania 93 (2015)':url.includes('persee.fr')?'Mélanges de l’École française de Rome':url.includes('sovraintendenzaroma.it')?'Sovrintendenza Capitolina':url.includes('sabapancona.cultura.gov.it')?'Italian Ministry of Culture':url.includes('museivaticani.va')?'Vatican Museums':url.includes('pompeiisites.org')?'Pompeii Archaeological Park':'Historical source'),url});
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
  {id:'diplomatic-accommodation',category:'diplomacy',name:['Diplomatic Accommodation','外交妥协'],cost:20,months:2,adopt:10,effects:{diplomacy:5,upkeep:1},conflicts:['hardline-diplomacy'],context:['Massilian envoys professed equal goodwill toward Caesar and Pompey and denied both entry to their city and ports; soon afterward Domitius entered and took command of its defense. This policy and its bonus are game interpretations, not a successful neutrality agreement.','马赛使者宣称对凯撒和庞培同样友善，并拒绝双方进入城内及港口；不久多米提乌斯入城，接掌守城指挥。本政策及其加成属于游戏诠释，并非一次成功的中立协议。'],source:source(massiliaSource,'Caesar, Civil Wars 1.35–36')},
  {id:'commercial-agreements',category:'diplomacy',name:['Commercial Agreements','商业协定'],cost:24,months:3,adopt:12,effects:{diplomacy:3,treasury:1,upkeep:1},context:['Polybius records much earlier Roman–Carthaginian trade terms; this is treaty practice, not evidence of a new 49 BCE agreement.','波利比乌斯记载更早的罗马与迦太基贸易条款；此卡取其条约惯例，并非前49年的新协定。'],source:source(polybiusTreatySource,'Polybius, Histories 3.22–26')},
  {id:'public-works',category:'economy',name:['State-Sponsored Public Works','国家公共工程'],cost:24,months:3,adopt:12,effects:{constructionDiscount:4,treasury:-1,loyalty:1},context:['Armies built and repaired bridges at Ilerda to preserve supplies; a lasting construction discount is a game abstraction.','军队在伊莱尔达修筑和修复桥梁以维持补给；长期建造折扣属于游戏抽象。'],source:source(massiliaSource,'Caesar, Civil Wars 1.40–41')},
  {id:'tax-farming',category:'economy',name:['Tax Farming','包税制'],cost:20,months:3,adopt:10,effects:{treasury:3,loyalty:-2},context:['Cicero describes auctioned Sicilian tithe rights and the resentment caused by abusive collection.','西塞罗记载了西西里谷物什一税征收权的拍卖，以及滥征造成的怨愤。'],source:source(verrineSource,'Cicero, In Verrem 2.3')},
  {id:'estate-organization',category:'economy',name:['Estate Organization','庄园组织'],cost:23,months:3,adopt:12,effects:{food:2,loyalty:-1},context:['Cato advises estate owners to supervise overseers, labor, harvests and accounts.','加图建议庄园主督察管事、劳力、收成与账目。'],source:source(catoEstateSource,'Cato, On Agriculture 1–2')},
  {id:'rhetorical-education',category:'culture',name:['Greek Rhetorical Education','希腊修辞教育'],cost:22,months:3,adopt:12,effects:{researchDiscount:4,upkeep:2},context:['Cicero describes translating Greek speeches as an exercise for Roman orators.','西塞罗记述罗马演说家以翻译希腊演说词作为练习。'],source:source(oratorSource,'Cicero, De Oratore 1.155')},
  {id:'cultural-accommodation',category:'culture',name:['Cultural Accommodation','文化包容'],cost:22,months:3,adopt:12,effects:{culturalAccommodation:1,stability:1,treasury:-1},context:['Cicero argues that an allied Gaditanian could receive Roman citizenship. This optional game policy improves satisfaction each quarter only in a different-culture province with administrative integration of at least 45. His defense of one person does not prove broad cultural or religious tolerance; the rate and treasury cost are game values.','西塞罗为一位来自盟邦加的斯的罗马公民身份辩护。本可选游戏政策仅在行政融合度至少为45的异文化行省每季度改善当地满意度。为一人辩护不能证明普遍的文化或宗教宽容；增益与财政成本是游戏数值。'],source:source(ciceroBalbusSource,'Cicero, Pro Balbo 25–27')},
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
IDEAS.push({id:'numidian-mounted-scouts',category:'military',origin:'numidia',originCulture:'north-african',name:['Numidian Mounted Scouts','努米底亚骑马斥候'],cost:27,months:4,adopt:15,effects:{scoutReliability:.08,upkeep:2},context:['Caesar records Numidian horsemen sent by King Juba to support Varus at Utica in 49 BCE. This optional policy models hiring and coordinating mounted local guides for field reconnaissance. Its detection bonus and upkeep are game values; reports can still miss or misidentify enemy forces. A foreign ruler must govern a supportive North African community to adopt it.','凯撒记载前49年朱巴国王派努米底亚骑兵支援乌提卡的瓦鲁斯。本可选政策模拟雇用并协调本地骑马向导参与战场侦察。发现概率加成与维护费属于游戏数值；报告仍可能遗漏或误判敌军。外来统治者须统治得到当地支持的北非社群才能装配。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/2B%2A.html','Caesar, Civil Wars 2.25')});
IDEAS.push({id:'galatian-auxiliary-muster',category:'military',origin:'galatia',name:['Galatian Auxiliary Muster','加拉太辅助兵征募'],cost:25,months:3,adopt:14,effects:{galatianMuster:6,upkeep:2},context:['Caesar says Deiotarus brought six hundred Gauls to Pompey in the civil war. This optional policy models local recruitment preparation only in supportive, administratively integrated Galatian communities; it improves newly raised forces there, not every army in the realm. The morale bonus, upkeep and adoption gate are game rules, not figures attested by Caesar.','凯撒记述内战期间德约塔鲁斯向庞培提供六百名高卢人。本可选政策只在支持统治、行政融合的加拉太社群模拟地方征募准备；它改善当地新军，而非全国所有军队。士气加成、维护费与装配门槛均属游戏规则，并非凯撒记载的数值。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/3A%2A.html','Caesar, Civil Wars 3.4')});
IDEAS.push({id:'parthian-arrow-trains',category:'military',origin:'parthia',name:['Parthian Arrow Supply Trains','帕提亚箭矢补给队'],cost:27,months:4,adopt:15,effects:{parthianArrowTrains:.06,upkeep:3},context:['Plutarch, writing long after the battle of Carrhae in 53 BCE, describes camels carrying replacement arrows to Parthian horse archers. This optional policy adapts that field logistics practice: a supplied defender in an owned Parthian-culture plain gains a small combat defense bonus. It does not apply in hills, at sea or under weak supply; adoption by a foreign ruler needs a supportive local community. The bonus, geographic rule and upkeep are game values, not measurements in Plutarch.','后世普鲁塔克记述前53年卡莱战役中，骆驼为帕提亚骑射手运送备用箭矢。本可选政策改编这种野战补给方法：在己方帕提亚文化平原且补给充足时，守军获得有限防御加成。山地、海上或补给不足时不生效；外来统治者须有支持它的当地社群。加成、地域限制及维护费均属游戏数值，并非普鲁塔克的测量。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Crassus%2A.html','Plutarch, Life of Crassus 25.1')});
IDEAS.push({id:'armenian-highland-provisioning',category:'military',origin:'armenia',name:['Armenian Highland Provisioning','亚美尼亚高地军需筹划'],cost:26,months:4,adopt:14,effects:{armenianHighlandSupply:.08,upkeep:2},context:['Plutarch, writing long after Carrhae, says King Artavasdes offered Crassus supplies and advised a route through the Armenian mountains in 53 BCE. This optional policy adapts local route knowledge and provisioning: an army on an owned Armenian-culture hill gains a small supply improvement only while its land route remains reachable. It does not help an isolated army, foreign terrain, or an army at sea. Foreign rulers need local support to adopt it. The bonus, costs and restrictions are game rules, not measured ancient effects or proof of a permanent institution in 49 BCE.','后世普鲁塔克记述，前53年亚美尼亚王阿尔塔瓦兹德向克拉苏提供军需，并建议经亚美尼亚山地行军。本可选政策改编当地路线知识与军需筹划：军队位于己方亚美尼亚文化丘陵，且陆路补给可达时，获得小幅补给改善。孤立军队、其他地形及海上军队不受益；外来统治者须获得当地支持才能装配。加成、成本及限制均为游戏规则，不是史料测得的效果，也不证明前49年有常设制度。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Crassus%2A.html','Plutarch, Life of Crassus 19.2')});
IDEAS.push({id:'field-march-coordination',category:'military',name:['Coordinated Field Marches','野战行军调度'],cost:28,months:4,adopt:15,effects:{march:1,upkeep:3},context:['Caesar says Fabius hurried by forced marches to join the army facing Afranius in Spain. This optional doctrine represents costly planning and dispatch; one month less on a longer land leg is a game rule, not an ancient travel-time measurement.','凯撒记载法比乌斯奉命急行军，与在西班牙对阵阿弗拉尼乌斯的军队会合。本可选学说模拟需经费维持的路线筹划与命令传递；较长陆路行程缩短一个月属于游戏规则，并非古代行军时间的测量。'],source:source(massiliaSource,'Caesar, Civil Wars 1.37')});
IDEAS.push({id:'field-reserve-command',category:'military',name:['Field Reserve Command','野战预备队指挥'],cost:26,months:4,adopt:14,effects:{combinedDefense:.05,upkeep:2},context:['At Alesia in 52 BCE, Caesar describes shifting cohorts to support hard-pressed defensive sectors. This optional command practice adds 5% defense only when at least two friendly armies defend an owned theater together with adequate supply. It is not a standing 49 BCE institution; the threshold, bonus and monthly cost are game rules.','凯撒记述前52年阿莱西亚之战中调遣步兵队增援吃紧的防线。本可选指挥惯例仅在至少两支己方部队共同守卫己方战区、且补给足够时增加5%防御。它并非史料证实的前49年常设机构；门槛、加成和月费均为游戏规则。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/7G%2A.html','Caesar, Gallic War 7.85–87')});
IDEAS.push({id:'court-informant-patronage',category:'diplomacy',name:['Court Informant Patronage','宫廷情报人员扶持'],cost:25,months:3,adopt:14,effects:{agentCapacity:1,upkeep:3},context:['Frontinus, writing much later, recounts Scipio sending disguised observers with an embassy before 49 BCE. This optional game policy pays for one more simultaneous spy or counterintelligence mission; it does not make reports reliable or prove a permanent Roman spy service.','后世的弗龙提努斯记述，早于前49年的西庇阿曾让伪装的观察者随使团行动。此游戏政策支付维护费，允许多一项同时进行的间谍或反谍任务；它不会保证报告可靠，也不证明罗马曾有常设谍报机构。'],source:source(frontinusInformantsSource,'Frontinus, Stratagems 1.2.1')});
IDEAS.push({id:'civic-exercise',category:'culture',name:['Civic Exercise Patronage','公民体能训练扶持'],cost:26,months:4,adopt:14,effects:{civicExercise:4,upkeep:3},context:['Aristotle discusses civic exercise and criticizes excessive Spartan severity in Politics VIII.4. This policy adapts supervised practice in administratively integrated towns; it raises recruit morale there, not across an entire population. The bonus and upkeep are game values.','亚里士多德在《政治学》卷八第4章讨论城邦体能训练，并批评斯巴达式的过度严苛。本政策把有组织的训练改编到行政融合程度较高的城市；只提高当地新兵士气，不作用于全体人口。加成与维护费属于游戏数值。'],source:source('https://classics.mit.edu/Aristotle/politics.8.eight.html','Aristotle, Politics VIII.4')});
IDEAS.push({id:'philosophical-patronage',category:'culture',name:['Philosophical and Scholarly Patronage','哲学与学术赞助'],cost:25,months:4,adopt:15,effects:{ideaResearchDiscount:3,upkeep:2},requiresBuilding:'library',context:['In 56 BCE Cicero described Tyrannio arranging his private books with help from Atticus’s staff. This optional policy funds scholarly exchange through an owned private collection; its discount applies only to future national-idea research. It does not establish a public library or a measured ancient research rate.','前56年，西塞罗记述蒂兰尼奥在阿提库斯属员协助下整理其私人藏书。本可选政策通过统治范围内的私人藏书室资助学者交流，只降低后续国家理念研究费用；它不证明当时存在公共图书馆，也不代表史料测得的研究速度。'],source:source('https://www.attalus.org/cicero/atticus4.html','Cicero, Letters to Atticus 4.8')});
IDEAS.push({id:'estate-labor-control',category:'economy',name:['Restrictive Estate Labor','庄园劳役约束'],cost:25,months:4,adopt:14,effects:{estateLabor:1,upkeep:1},conflicts:['negotiated-crop-shares','seasonal-labor-contracts'],context:['Cato describes close supervision, discipline and provisioning of estate workers in On Agriculture 5. This optional policy models harsher control only in productive rural territories. It is not the late Roman bound colonate, nor proof that every estate followed Cato. Food, discontent and migration values are game interpretations.','加图在《农业志》第5章记述对庄园劳力的严格监督、惩戒及供养。本可选政策只模拟有产出的乡村领土中更严厉的控制；它不是后期罗马的束缚农制度，也不表示所有庄园都遵照加图。粮食、不满及迁移数值属于游戏诠释。'],source:source(catoEstateSource,'Cato, On Agriculture 5')});
IDEAS.push({id:'negotiated-crop-shares',category:'economy',name:['Share Tenancy Arrangements','分成佃作安排'],cost:23,months:3,adopt:12,effects:{tenantShares:1,upkeep:1},conflicts:['estate-labor-control'],context:['Cato, On Agriculture 136–137, records terms for share tenants in particular Italian districts. This optional policy adapts share-tenancy terms in productive rural territories; it is not proof of universal tenant freedom or a 49 BCE public law. Reduced state grain, satisfaction and migration values are game interpretations.','加图《农业志》第136—137章记录意大利部分地区的分成佃作条件。本可选政策在有产出的乡村领土模拟分成佃作安排，并不证明佃农普遍自由，也不是前49年的成文公法。国家存粮、满意度与迁移数值均属游戏设计。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/I%2A.html','Cato, On Agriculture 136–137')});
IDEAS.push({id:'seasonal-labor-contracts',category:'economy',name:['Seasonal Free-Labor Contracts','季节性自由劳工契约'],cost:24,months:3,adopt:13,effects:{seasonalLabor:1,upkeep:3},conflicts:['estate-labor-control'],context:['Varro, writing after the 49 BCE opening, describes hiring free workers for vintage and haying rather than binding every farm task to an estate workforce. This optional policy models paid seasonal hiring in productive rural territories: a small harvest gain and more possible distressed migration between neighboring owned provinces, at continuing treasury cost. It does not establish a universal 49 BCE labor law or prove that migrants always found work; rates and movement cap are game choices.','瓦罗在前49年开局之后写到，葡萄采收和割草可雇用自由劳工，并非庄园所有劳动都由固定劳力承担。本可选政策在有产出的乡村领土模拟付费季节性雇工：小幅增加收成，并允许更多不满人口在相邻己方行省之间迁移，代价是持续的国库支出。它不证明前49年已有统一劳工法，也不保证迁出者都能找到工作；产量和迁移上限均为游戏设计。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Varro/de_Re_Rustica/1%2A.html','Varro, On Agriculture 1.17')});
IDEAS.push({id:'grain-dues-commutation',category:'economy',name:['Grain Dues Commutation','粮赋折现协定'],cost:24,months:3,adopt:13,effects:{grainCommutation:1},context:['Cicero says that some communities asked to pay the fair value of grain dues in cash instead of transporting the grain. This optional policy models agreed commutation in productive, supportive territories. Each month it shifts at most three units from positive state food income to treasury, only while national stores are adequate. The exchange rate, limits and national adoption are game rules; Cicero condemns coercive overpricing, which this policy does not represent.','西塞罗记述，有些社群请求按公平价值以现金缴纳粮赋，免去运送实物。本可选政策只在有产出且支持统治的领土模拟协商折现；全国存粮充足时，每月最多把三份正向粮食收入转为国库。兑换比例、上限和全国装配均属游戏规则；西塞罗谴责强迫抬价，本政策不模拟该做法。'],source:source('https://www.attalus.org/cicero/verres23_4.html','Cicero, In Verrem 2.3.188–190')});
IDEAS.push({id:'egyptian-multiscript-decrees',category:'government',origin:'egypt',name:['Egyptian Multiscript Decrees','埃及多文字诏令'],cost:26,months:4,adopt:14,effects:{egyptianDecrees:1,upkeep:2},context:['The Memphis Decree of 196 BCE was published in Greek, Demotic and hieroglyphs for different audiences. This optional adaptation improves administrative integration only in Egyptian-culture territories, regardless of their ruler. Foreign rulers need extra adoption time and an owned Egyptian-culture community with sufficient local support. It does not claim that every decree in 49 BCE used three scripts; the monthly gain and upkeep are game values.','前196年的孟斐斯诏令以希腊文、世俗体和圣书体面向不同读者公布。本可选改编只提高埃及文化领土的行政融合度，不论统治者是谁；外来统治者需要额外适应时间，且须统治有足够当地支持的埃及文化社群。这不表示前49年的每道诏令都使用三种文字。每月增益与维护费是游戏数值。'],source:source('https://www.britishmuseum.org/sites/default/files/2022-10/Hieroglyphs_unlocking_ancient_Egypt_large_print_guide_The_British_Museum.pdf','British Museum, Hieroglyphs: Unlocking Ancient Egypt, pp. 44–45')});
IDEAS.push({id:'achaean-assembly-practice',category:'government',origin:'hellenic',name:['Achaean Assembly Practice','亚该亚议事传统'],cost:25,months:4,adopt:14,effects:{hellenicCouncil:1,decisionDelay:1,upkeep:2},context:['Polybius describes an Achaean federal assembly hearing cities and envoys in the earlier Social War. This optional policy adapts consultation in Hellenic-culture territories with administrative integration of at least 45. It gives a small quarterly local satisfaction gain, but slows later policy changes and costs upkeep. The source does not establish that every Greek city in 49 BCE used the same assembly, and all effects are game values.','波利比乌斯记述较早同盟战争期间，亚该亚联邦大会听取各城与使节陈述。本可选政策只在行政融合度至少为45的希腊文化领土改编协商惯例：每季度有限提高当地满意度，但拖慢今后的政策更换并增加维护费。史料不能证明前49年所有希腊城市都采用同一种大会，具体效果均为游戏数值。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/4%2A.html','Polybius, Histories 4.7')});
IDEAS.push({id:'egyptian-temple-revenues',category:'culture',origin:'egypt',name:['Egyptian Temple Revenue Guarantees','埃及神庙收入保障'],cost:28,months:4,adopt:14,effects:{templeGuarantees:1,upkeep:2},context:['A royal decree of 118 BCE guaranteed Egyptian temples existing land revenues and treasury payments. This optional 49 BCE policy models a renewed guarantee, not an uninterrupted historical law. It needs a supportive Egyptian priesthood; where that cult remains locally dominant, continued funding gradually strengthens its priests and local satisfaction. Treasury costs and monthly rates are game values.','前118年的王室诏令保障埃及神庙原有的土地收入与国库拨款。本可选前49年政策模拟重新确认保障，不宣称该诏令一直连续有效。它需要当地埃及祭司团支持；在该信仰仍占主导的地方，持续资助逐步增强祭司影响与民众满意度。财政成本和月度数值均为游戏设计。'],source:source('https://www.attalus.org/egypt/ptolemy_viii_decrees.html','Ptolemy VIII, Royal Decrees of 118 BCE, §§50–72')});
IDEAS.push({id:'bosporan-grain-stewardship',category:'economy',origin:'bosporus',name:['Bosporan Grain Stewardship','博斯普鲁斯谷物统筹'],cost:25,months:4,adopt:13,effects:{bosporanGrainStewardship:1,upkeep:2},context:['Strabo, writing later, describes fertile grain country near Theodosia and an earlier large shipment to Athens under Leucon. This optional policy imagines coordinated grain handling in owned, productive Bosporan-culture ports. Each qualifying port adds one state food per month, at most two, while the policy costs two treasury per month. Strabo does not attest a permanent grain office in 49 BCE; the administrative practice and numbers are game interpretations.','后世的斯特拉波记述狄奥多西亚附近的肥沃产粮地，以及较早时留孔治下向雅典运送大批谷物。本可选政策设想在己方有产出的博斯普鲁斯文化港口统筹谷物。每处合格港口每月增加1份国库粮食，最多两处；政策每月花费2国库。史料不证明前49年存在常设谷物官署，行政做法与数值均属游戏诠释。'],source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/7D%2A.html','Strabo, Geography 7.4.6')});
export const MATERIALS = [
  {id:'roadmaking',name:['Road Building','道路修筑'],cost:22,months:3,building:'road',context:['Roman roads predate 49 BCE; this node spreads and improves local technique.','罗马道路早于前49年；此项代表技术传播与改进。'],source:source(appianSource,'UNESCO World Heritage Centre, Via Appia. Regina Viarum')},
  {id:'water-control',name:['Water Management','水利管理'],cost:24,months:4,building:'irrigation',context:['Cato advises gentle irrigation of beds and maintenance of drainage ditches; local channels adapt these older practices.','加图建议温和引水灌溉苗床并维护排水沟；地方水渠改造这些已有做法。'],source:source(catoWaterSource,'Cato, On Agriculture 151, 155')},
  {id:'barracks-design',name:['Barracks Planning','兵营规划'],cost:21,months:3,building:'barracks',context:['Republican Roman siege camps show planned military quarters.','共和国时期的罗马围城军营显示出经过规划的营舍。'],source:source(numantiaSource)},
  {id:'stone-fortification',name:['Fortification Planning','防御工事规划'],cost:25,months:4,building:'fort',context:['Caesar’s works at Alesia show extensive field fortifications; materials and layouts varied by site.','凯撒在阿莱西亚修筑了大规模野战工事；材料和布局因地而异。'],source:source(alesiaSource,'MuséoParc Alésia, Archaeology of the Siege')},
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
  {id:'granary',name:['Granary','粮仓'],tech:'grain-storage',cost:18,months:3,materials:{stone:1,timber:2},upkeep:1,effects:{foodCapacity:21,localFoodCapacity:24},terrain:['plain','urban','hills','desert']},
  {id:'drain',name:['Urban Drainage','城市排水'],tech:'urban-drainage',cost:30,months:5,materials:{stone:4,timber:1},upkeep:2,effects:{loyalty:2,stability:1},terrain:['urban']}
];
// Further historically plausible families. Each entry has a distinct bilingual
// encyclopedia summary; dates denote adaptation rather than first invention.
const additionalMaterials=[
 ['dam-engineering',['Dam Engineering','堤坝工程'],'dam',alyziaDamSource,['The stone dam near Alyzia in western Greece dates to roughly the mid-fourth to third century BCE; this card adapts a known ancient practice, not a Roman invention in 49 BCE.','希腊西部阿利齐亚附近的石堤坝约建于前4世纪中叶至前3世纪；此卡代表对古代已有工程的改造，并非前49年的罗马新发明。'],31,5,['water-control']],
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
 ['road-milestones',['Road Milestones','道路里程碑'],'milestone',gracchusMilestonesSource,['Plutarch, writing later, credits Gaius Gracchus with measuring roads by miles and setting stone markers. This card organizes an existing practice, not a new invention in 49 BCE.','后世普鲁塔克记述盖乌斯·格拉古按里程丈量道路并立石柱。本卡组织已有做法，并非前49年的新发明。'],16,2,['roadmaking']],
 ['public-square-planning',['Public Square Planning','公共广场规划'],'square',pompeiiForumSource,['Pompeii’s second-century BCE Comitium adjoined its Forum; public-space planning varied across cities.','庞贝前2世纪的民会场毗邻广场；各城公共空间规划并不相同。'],21,3,['roadmaking']],
 ['library-organization',['Private Collection Organization','私人藏书整理'],'library',librarySource,['Private book collections existed in Republican Rome; the first Roman public libraries came later.','共和国时期罗马已有私人藏书；罗马公共图书馆出现得更晚。'],24,4,['craft-workshops']],
 ['bath-construction',['Bath Construction','浴场建造'],'bath',pompeiiBathSource,['Pompeii’s Stabian and Republican baths were built in the second century BCE; their water and heating systems changed over time.','庞贝的斯塔比亚浴场与共和国浴场建于前2世纪；供水和加热设施后来多次改造。'],24,4,['aqueduct-refinement']],
 ['administrative-building',['Administrative Building','行政建筑'],'administration',pompeiiForumSource,['Pompeii’s Forum complex included a council chamber, record store, and magistrates’ building; their surviving phases need not all date to 49 BCE.','庞贝广场建筑群包括议事厅、档案库和地方官建筑；留存形态不一定全都属于前49年。'],23,4,['public-square-planning']],
 ['bridge-engineering',['Bridge Engineering','桥梁工程'],'bridge',massiliaSource,['At Ilerda in 49 BCE, bridges carried army supplies across the Sicoris; floods broke them and delayed repairs. The local march and revenue effects are game abstractions.','前49年伊莱尔达战役中，桥梁承载军需跨越西科里斯河；洪水冲毁桥梁并延误修复。地方行军与收入效果属于游戏抽象。'],24,4,['roadmaking']],
 ['port-facilities',['Port Facilities','港口设施'],'port',massiliaSource,['Massilia received merchant ships and warships during the 49 BCE siege; port works still require a suitable coast.','前49年马赛围城时商船与战船进出港口；港口工程仍须依托适宜海岸。'],26,4,['roadmaking']],
 ['warehouse-management',['Warehouse Management','仓储管理'],'warehouse',massiliaSource,['At Massilia, provisions were gathered and reserved for a possible siege; storage capacity is a game abstraction.','马赛曾为可能的围城收集并储备粮食与物资；仓储容量是游戏抽象值。'],20,3,['grain-storage']],
 ['shipyard-craft',['Shipyard Craft','造船工艺'],'shipyard',massiliaSource,['Caesar reports twelve warships made at Arelate in 49 BCE and equipped before deployment; the card represents local yard organization.','凯撒记载前49年阿雷拉特建造并装备十二艘战船；此卡代表地方船厂组织。'],28,5,['port-facilities']]
];
const checkedMaterialSourceTitles={
 'dam-engineering':'Alyzia Dam archaeological and engineering study (ISSMGE, 2026)',
 'reservoir-design':'Italian Ministry of Culture, Auximum water collection system',
 'supply-organization':'Javier Salido Dominguez, Architecture in the Service of the Roman Army (2015)',
 'bridge-engineering':'Caesar, Civil Wars 1.40–41, 1.48–54'
};
for(const [id,name,building,url,context,cost,months,prerequisites] of additionalMaterials)MATERIALS.push({id,name,building,cost,months,prerequisites,context,source:source(url,checkedMaterialSourceTitles[id])});
const additionalBuildings=[
 ['dam',['Dam','堤坝'],'dam-engineering',34,6,{stone:6,timber:2},3,{food:3},['hills','plain'],'water'],
 ['reservoir',['Reservoir','蓄水池'],'reservoir-design',22,4,{stone:3},1,{food:1,foodCapacity:30},['plain','hills','desert'],'water'],
 ['aqueduct',['Aqueduct Improvement','渡槽改进'],'aqueduct-refinement',29,5,{stone:5,metal:1},2,{food:1,loyalty:1},['plain','urban','hills'],'water'],
 ['sewer',['Sewer Improvement','下水道改进'],'sewer-improvement',32,6,{stone:5,metal:1},3,{loyalty:2,stability:1,healthRisk:-.004},['urban','desert','plain','hills'],'urban'],
 ['training-camp',['Training Camp','训练场'],'training-ground',20,3,{timber:2,metal:1},2,{recruitMorale:4},['plain','hills','urban']],
 ['supply-depot',['Supply Depot','军需仓'],'supply-organization',20,3,{timber:3,stone:1},2,{foodCapacity:25,localFoodCapacity:12},['plain','hills','urban']],
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
 ['warehouse',['Warehouse','仓库'],'warehouse-management',20,3,{stone:2,timber:2},1,{foodCapacity:40,localFoodCapacity:20},['plain','hills','urban','desert']],
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
Object.assign(BUILDINGS.find(b=>b.id==='coastal-fort'),{
 context:['At Brundisium in 49 BCE, Caesar tried to close the harbor with moles and rafts; Pompey sent towered ships against those works. A maintained coastal work resisting a light close blockade is a game abstraction, not evidence of a permanent stone harbor fort.','前49年凯撒在布伦迪西乌姆试图用堤道和木筏封港；庞培派装有高塔的船只攻击这些工事。常设海岸工事抵抗轻型近港封锁属于游戏抽象，并非永久石砌港垒存在的证据。'],
 source:source('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1A%2A.html','Caesar, Civil Wars 1.25–26')
});
// Research documents a practice; the building reference must instead explain
// the particular local investment. Linked research sources support the
// historical example, never the numerical game effect.
const buildingEntries={
 road:['The Via Appia shows that roads were established before this campaign. A local road can shorten connected land marches; its one gross treasury is offset by one upkeep, and neither number is a measured ancient return.','阿庇亚大道表明道路早在本战役前就已存在。地方道路可缩短相连陆路的行军；每月1国库毛收入由1维护费抵消，两者都不是古代实测数值。'],
 irrigation:['Cato describes modest irrigation of cultivated beds. A channel here adds local food output and needs continuing maintenance; one estate instruction does not establish a uniform provincial canal network.','加图描述过对田畦的适度灌溉。这里的水渠提高地方粮食产出并需持续维护；一条庄园建议不能证明各行省都有统一水渠网络。'],
 barracks:['The Numantian camp reconstruction illustrates planned military quarters. This paid local barracks improves new recruits’ morale in the game, without claiming an identical standing barracks in every Republican town.','努曼提亚军营复原展示了规划过的营舍。游戏里付费建造的地方兵营提高新兵士气，但不代表共和国每座城镇都有同样的常设兵营。'],
 fort:['Caesar’s Alesia works show substantial temporary fortification. This maintained provincial work adds one defense level; its durable form and combat value are game abstractions, not a claim that the source describes a permanent stone fort.','凯撒在阿莱西亚的工事表明当时能修筑大规模临时防御。此处需要维护的地方工事增加1级防御；其常设形式和战斗数值属于游戏抽象，并非史料记载的永久石堡。'],
 quarry:['Roman-period quarry sites are known, though their exact 49 BCE operation is often uncertain. A hill quarry produces stone for construction only after its paid project finishes, and continues to cost upkeep.','罗马时期的采石场确有遗址，但具体哪处在前49年开采往往不能确定。山地采石场须先付费建成，之后才为建筑提供石材，并持续产生维护费。'],
 mine:['The mine gazetteer records Roman-period extraction without precisely dating every deposit. This game mine needs a metal-bearing hill and local labor; output falls with population, while upkeep and local political strain remain.','矿业资料记录了罗马时期的采掘，却无法精确确定每处矿藏的年代。游戏矿场须有含金属的山地和地方劳力；人口下降会降低产量，维护费及地方政治压力仍会存在。'],
 granary:['Cato’s grain-storage advice concerns protecting an existing harvest. A completed granary holds a finite local reserve and adds limited national capacity; deposits transfer real food and shortage releases can delay, but not abolish, famine.','加图的谷仓建议针对已有收成的保存。建成的粮仓持有有限的地方储粮并增加少量全国容量；入库转移真实粮食，荒年出库只能延缓、不能消除饥荒。'],
 drain:['The Cloaca Maxima began as drainage long before 49 BCE. This urban drainage project costs stone and upkeep and improves local political conditions; it does not imply modern disease control.','罗马大下水道作为排水工程早于前49年很久。此项城市排水建设消耗石材和维护费，改善地方政治状况；它不代表现代疾病防控。'],
 dam:['The pre-49 BCE Alyzia dam was built in a narrow limestone gorge; its construction does not establish a universal Roman design. A game dam needs suitable water terrain, materials and upkeep. It adds 3 food to the monthly national budget and reduces local dry-month harvest loss; both values are game rules.','前49年已存在的阿利齐亚堤坝建于狭窄石灰岩峡谷，不能据此推定罗马各地采用相同设计。游戏堤坝仍须适宜水域、材料及维护费。它每月为国家粮食收支增加3，并减轻当地干旱月份的收成损失；两项数值均属游戏规则。'],
 reservoir:['Auximum’s cistern is provisionally associated with Republican planning. A game reservoir adds bounded food storage and some output at a water site, with paid upkeep; the numbers are not ancient measurements.','奥克西穆姆蓄水池与共和国时期规划的关联仍属初步判断。游戏蓄水池在有水的地点增加有限储粮和部分产出，并需付费维护；数值不是古代实测。'],
 aqueduct:['Aqua Marcia predates Caesar’s civil war. This local aqueduct improvement requires an actual water site and construction materials, then adds food and loyalty; it is an adaptation of existing engineering.','马尔基亚水道早于凯撒内战。此项地方渡槽改进须有水源并投入建筑材料，建成后增加粮食和忠诚；它是已有工程的地方改造。'],
 sewer:['The Cloaca Maxima was altered across many periods. A costly urban sewer here offers modest civic and character-health effects with maintenance, without presenting ancient drains as modern sanitation.','罗马大下水道在不同时期多次改造。这里昂贵的城市下水道带来有限的城市与人物健康效果，并需维护；古代排水设施不能等同于现代卫生系统。'],
 'training-camp':['Cicero recalls exercise on the Campus Martius and in camps. A designated local practice ground improves the morale of recruits trained there, but its recurring expense and numerical gain are game choices.','西塞罗回忆战神广场和军营中的操练。划定的地方训练场提高在当地招募者的士气，但持续费用和具体增益属于游戏设定。'],
 'supply-depot':['Republican military granaries are attested in Hispania. A game depot stores and contributes finite food and becomes a real supply-network source for nearby armies; it does not conjure supplies across enemy territory.','西班牙发现了共和国时期的军用粮仓。游戏军需仓储存并提供有限粮食，也成为附近军队真实补给网的来源；它不会隔着敌境凭空运粮。'],
 armory:['Caesar reports wartime arms workshops at Massilia. This maintained local armory lowers recruitment cost in the game; the saving is a designed logistical effect, not a documented citywide rate.','凯撒记载马赛在战时设立兵器作坊。此处需维护的地方军械库在游戏中降低征兵费用；节省幅度是设计的后勤效果，不是史料记载的全城比例。'],
 'siege-workshop':['Massilia’s siege involved constructed galleries and towers. A local workshop shortens a siege only through the game’s actual siege calculation, at a material and upkeep cost; the source gives no universal timetable.','马赛围城中修筑了带顶通道和高塔。地方攻城作坊投入材料并支付维护费，通过游戏的真实围攻计算缩短时间；史料没有给出通用工期。'],
 metalworks:['Cato names markets for iron tools and metal vessels. A local metalworking facility reduces later construction costs in the game, without treating his list of markets as proof of one standardized factory.','加图列出铁器与金属容器的市场。地方金属加工场在游戏中降低日后建造费用，但他的市场清单不能证明存在统一标准的工厂。'],
 workshop:['Cato lists tools, pottery, rope and milling equipment sold in different places. A paid local workshop adds treasury income with upkeep; this is a model of organized craft activity, not a measured ancient profit.','加图列出各地出售的工具、陶器、绳索与磨具。付费建成的地方作坊增加国库收入并产生维护费；这是手工业组织的模型，不是古代实测利润。'],
 'grain-mill':['Cato includes hand and donkey mills in estate equipment. A mill requires a local grain harvest; its game food output is capped by that harvest and can fall if production declines. It continues to cost upkeep.','加图把手磨和驴力磨列入庄园器具。磨坊须有当地谷物收成；游戏粮食收益受该收成限制，产量下降时也会减少。维护费仍需支付。'],
 monument:['The Scipio Barbatus tomb preserves a Republican inscription, not a template for every province. A player-written dedication adds political prestige but can lower local loyalty; the wording and effects are campaign choices.','西庇阿·巴尔巴图斯墓留有共和国铭文，却不是各行省通用范本。玩家撰写的铭文增加政治声望，也可能降低地方忠诚；文字及效果都取决于战役选择。'],
 milestone:['Plutarch describes stone distance markers along roads in Gaius Gracchus’s time. Build a local road first; the small treasury benefit models trade administration, not income produced by the stone itself.','普鲁塔克记述盖乌斯·格拉古时期沿道路设置石制里程标记。须先修建当地道路；少量国库收益模拟沿路商贸管理，并非石柱本身生财。'],
 square:['Pompeii’s Republican public spaces included a Forum and Comitium. A local square needs an urban site, materials and upkeep, then helps loyalty; the political gain is a game estimate.','庞贝共和国时期的公共空间包括广场和民会场。地方广场须位于城市，投入材料并持续维护，随后改善忠诚；政治增益属于游戏估算。'],
 library:['Private book collections existed before Roman public libraries. This urban private collection costs money and upkeep and helps future research; it is not a public institution or an automatic invention unlock.','罗马公共图书馆出现之前已有私人藏书。此处城市私人藏书室花费国库并需维护，可帮助未来研究；它不是公共机构，也不会自动解锁发明。'],
 bath:['Pompeii’s Republican baths existed before 49 BCE but changed later. A bath at a suitable water site modestly improves local loyalty and character-health risk, with upkeep; no modern medical claim follows.','庞贝的共和国浴场早于前49年，但后来又经历改造。建于适宜水域的浴场有限改善地方忠诚和人物患病风险，并需维护；这不构成现代医学主张。'],
 administration:['Pompeii’s Forum complex had civic rooms whose surviving phases vary in date. This urban office adds treasury and stability in the game while charging upkeep; it is not evidence of a universal 49 BCE bureaucracy.','庞贝广场建筑群拥有民政用房，但留存形态年代各异。此处城市官署在游戏中增加国库与稳定度并收取维护费；它不证明前49年存在统一官僚体制。'],
 bridge:['Caesar records bridges over the Sicoris carrying supplies, failing in floods and being rebuilt under pressure in 49 BCE. A local game bridge needs a water crossing and materials; its march and treasury effects are simulation values.','凯撒记载前49年西科里斯河上的桥梁运送军需，遭洪水冲毁后又在压力下重建。游戏中的地方桥梁须有水道跨越点并投入材料；行军与国库效果是模拟数值。'],
 port:['Caesar’s account shows merchant and war vessels using Massilia’s harbor. A game port needs a real coastal site and construction project before it can support local commerce and later shipyard work.','凯撒记载商船与战船使用马赛港。游戏港口须位于真正的海岸并完成建设，之后才可支持地方贸易及后续船厂工程。'],
 warehouse:['Massilia kept provisions against a possible siege. This maintained warehouse holds at most 20 local food from the existing state stock and adds 40 national storage spaces. It can return up to four food during a monthly shortage; capture transfers its actual contents. These capacities are game values, not documented ancient quantities.','马赛曾为可能的围城储备物资。这座需维护的仓库从现有全国存粮转入最多20份地方粮食，并增加40份全国储粮空间。每月缺粮时最多归还4份；领土易手时实际存粮随之转移。容量属于游戏数值，并非史料记载的古代数量。'],
 shipyard:['Caesar reports an emergency build of ships at Arelate, not a standard production rate. A coastal shipyard needs a port, materials and months of work; it enables ship construction and shortens a crossing that embarks there, while upkeep exceeds its gross treasury gain.','凯撒记载阿雷拉特紧急造船，而非通用生产速率。海岸船厂须先有港口，投入材料并经过数月建设；它使舰船建造成为可能，并缩短从该港出发的渡海行程，但维护费高于其国库毛收入。'],
 'naval-depot':['Historical port stores are represented here by a maintained coastal depot. It raises supply for actual fleets docked in that port; the extra capacity and monthly expense are game rules, not attested ancient quantities.','这里用需维护的海岸军需站模拟历史上的港口储备。它提高停泊于该港的真实舰队的补给；新增容量和月费是游戏规则，并非史料记载的数量。'],
 dockyard:['Massilia repaired and fitted out older ships after defeat. A paid coastal dockyard speeds repair of actual damaged hulls, without implying the source gives a universal monthly repair rate.','马赛失利后曾修理并整备旧船。付费建造的海岸船坞加快真实受损船体的维修；史料并未给出通用的月修理速率。'],
 'naval-training':['Caesar’s fleet preparations required rowers, sailors and commanders. This coastal training site improves an active fleet’s experience while it is docked there, with upkeep; no formal standardized naval school is asserted.','凯撒备舰需要桨手、水手与指挥官。此处海岸训练场让停泊于此的现役舰队增加经验，并需维护；不宣称当时存在正规统一的海军学校。']
};
for(const building of BUILDINGS)if(buildingEntries[building.id])building.context=buildingEntries[building.id];
BUILDINGS.find(building=>building.id==='naval-training').source=source(gallicNavySource,'Caesar, Gallic War 3.9');
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
 {id:'maritime-cultural-exchange',category:'culture',name:['Maritime Cultural Exchange','海上文化交流'],cost:22,months:3,adopt:11,effects:{navalTrade:1,stability:-1},context:['The Pompeii Archaeological Park describes coastal Campanian traders reaching Delos, Rhodes and Alexandria in the second century BCE, alongside foreign cults and new civic buildings at Pompeii. This optional policy models contact through trade; its commercial gain and political unease are game interpretations, not measured effects or proof that every influence arrived by sea.','庞贝考古公园记述前2世纪坎帕尼亚沿海商人到达提洛、罗得与亚历山大里亚；同时，庞贝出现外来祭仪场所和新的公共建筑。本可选政策模拟贸易往来带来的接触；商业收益与政治不安是游戏诠释，并非史料测得的效果，也不表示所有文化影响都经海路传入。'],source:source(pompeiiGreekSource,'Pompeii Archaeological Park, Antiquarium')}
);
const materialPrerequisites={'stone-fortification':['barracks-design'],'metal-extraction':['quarrying'],'urban-drainage':['water-control']};
const ideaPrerequisites={'reserve-mobilization':['legion-training'],'field-march-coordination':['legion-training'],'field-reserve-command':['frontier-defense'],'provincial-autonomy':['senatorial-consultation'],'commercial-agreements':['diplomatic-accommodation'],'estate-organization':['public-works'],'estate-labor-control':['estate-organization'],'negotiated-crop-shares':['estate-organization'],'seasonal-labor-contracts':['estate-organization'],'civic-education':['rhetorical-education']};
for(const item of MATERIALS)item.prerequisites=materialPrerequisites[item.id]||item.prerequisites||[];
for(const item of IDEAS)item.prerequisites=ideaPrerequisites[item.id]||[];
import {figureActive,scholarExpertise,VARRO_RESEARCH_EXPERTISE} from './great-figures.js';
import {FACTIONS,ROUTES} from './data.js';
import {GRAND_ROUTES} from './grand-map-data.js';
const ids = x => x.map(item=>item.id);
const strategicKnowledge=new Set(['stone-fortification','siege-machinery','legion-training']);
const metalDeposits=new Set(['hispaniaN','hispaniaS','illyricum','anatolia','armenia','gaul']);
const coastalSites=new Set(['narbo','hispaniaN','hispaniaS','italiaS','sicilia','africa','epirus','achaia','anatolia','syria','egypt','numidia','mauretania','bosporus']);
const waterSites=new Set(['gaul','cisalpine','narbo','hispaniaN','hispaniaS','italiaN','roma','italiaS','anatolia','syria','egypt','armenia']);
const urbanSites=new Set(['roma','egypt','anatolia','syria','achaia','sicilia']);
const fresh = faction => ({knownMaterial:faction==='egypt'?['water-control','grain-storage']:['roadmaking','grain-storage'],knownIdeas:[],foreignOrigins:{},slots:Object.fromEntries(IDEA_CATEGORIES.map(c=>[c.id,[null]])),research:null,adoption:null,expansion:null,trade:[],offers:[],purchaseRequests:[],exchangeRequests:[],agreementRequests:[],materials:{stone:6,timber:7,metal:3}});
const normalizedDevelopments=new WeakSet();
export function initializeDevelopment(s){
  s.development ||= {};
  s.knowledgeAgreements=Array.isArray(s.knowledgeAgreements)?s.knowledgeAgreements.filter(a=>a&&typeof a.a==='string'&&typeof a.b==='string'&&a.a!==a.b&&s.factions[a.a]&&s.factions[a.b]&&Number.isInteger(a.remaining)&&a.remaining>0&&a.remaining<=12&&Number.isInteger(a.next)&&a.next>0&&a.next<=3):[];
  for(const id of Object.keys(s.factions).filter(id=>id!=='rebels')){
    const d=s.development[id] ||= fresh(id);
    d.knownMaterial ||= fresh(id).knownMaterial;d.knownIdeas ||= [];
    if(!normalizedDevelopments.has(d)){d.knownMaterial=[...new Set(d.knownMaterial)];d.knownIdeas=[...new Set(d.knownIdeas)];normalizedDevelopments.add(d)}
    d.slots ||= fresh(id).slots;for(const c of IDEA_CATEGORIES)d.slots[c.id] ||= [null];
    d.materials ||= {stone:6,timber:7,metal:3};d.trade ||= [];d.offers=Array.isArray(d.offers)?d.offers.filter(o=>o&&typeof o.seller==='string'&&s.factions[o.seller]&&['material','idea'].includes(o.branch)&&typeof o.id==='string'&&Number.isFinite(o.remaining)&&o.remaining>0&&o.remaining<=12):[];d.purchaseRequests=Array.isArray(d.purchaseRequests)?d.purchaseRequests.filter(o=>o&&typeof o.buyer==='string'&&o.buyer!=='rebels'&&s.factions[o.buyer]&&['material','idea'].includes(o.branch)&&typeof o.id==='string'&&Number.isFinite(o.remaining)&&o.remaining>0&&o.remaining<=12):[];d.foreignOrigins ||= {};d.visitingScholars=Array.isArray(d.visitingScholars)?d.visitingScholars.filter(v=>v&&s.factions[v.partner]&&Number.isFinite(v.remaining)&&v.remaining>0):[];
    d.scholarRequests=Array.isArray(d.scholarRequests)?d.scholarRequests.filter(v=>v&&s.factions[v.host]&&['material','idea'].includes(v.branch)&&typeof v.id==='string'&&Number.isInteger(v.remaining)&&v.remaining>0&&v.remaining<=12):[];
    d.merchantContacts=d.merchantContacts&&typeof d.merchantContacts==='object'&&!Array.isArray(d.merchantContacts)?d.merchantContacts:{};
    d.merchantLeads=Array.isArray(d.merchantLeads)?d.merchantLeads.filter(lead=>{
      const branch=lead?.branch||'material',catalog=branch==='material'?MATERIALS:branch==='idea'?IDEAS:[],known=branch==='material'?d.knownMaterial:d.knownIdeas;
      return !!(lead&&s.factions[lead.seller]&&catalog.some(item=>item.id===lead.id)&&Number.isInteger(lead.expiresTurn)&&lead.expiresTurn>s.year*12+s.month&&!known.includes(lead.id));
    }):[];
    d.exchangeRequests=Array.isArray(d.exchangeRequests)?d.exchangeRequests.filter(o=>o&&o.partner!==id&&o.partner!=='rebels'&&s.factions[o.partner]&&['material','idea'].includes(o.offerBranch)&&['material','idea'].includes(o.wantBranch)&&typeof o.offerId==='string'&&typeof o.wantId==='string'&&Number.isFinite(o.remaining)&&o.remaining>0&&o.remaining<=12):[];
    d.agreementRequests=Array.isArray(d.agreementRequests)?d.agreementRequests.filter(o=>o&&o.partner!==id&&o.partner!=='rebels'&&s.factions[o.partner]&&Number.isInteger(o.remaining)&&o.remaining>0&&o.remaining<=4&&Number.isInteger(o.sentYear)&&Number.isInteger(o.sentMonth)&&o.sentMonth>=1&&o.sentMonth<=12):[];
  }
  for(const r of s.regions){r.buildings ||= [];r.construction ||= null}
  return s;
}
export const development = (s,id) => (initializeDevelopment(s),s.development[id]);
const knowledgeInProgress=(d,branch,id)=>d.research?.branch===branch&&d.research.id===id||d.trade.some(t=>t.branch===branch&&t.id===id);
const guardedMerchantIdeas=new Set(['court-informant-patronage','maritime-intelligence']);
const visitingScholarFor=(s,owner,branch,id)=>development(s,owner)?.visitingScholars.find(visit=>visit.remaining>0&&!visit.travelRemaining&&(!visit.route||visit.currentRegion===visit.destination)&&(!visit.id||visit.branch===branch&&visit.id===id));
export function scholarResearchBonus(s,owner,branch,id){return !!visitingScholarFor(s,owner,branch,id)}
export function merchantResearchLead(s,owner,branch,id){
 if(!['material','idea'].includes(branch))return null;
 return development(s,owner)?.merchantLeads.find(lead=>(lead.branch||'material')===branch&&lead.id===id&&lead.expiresTurn>s.year*12+s.month)||null;
}
export function recordMerchantContact(s,route){
 const last=route?.last,buyer=last?.buyer,seller=last?.seller;
 if(!last||last.year!==s.year||last.month!==s.month||last.reason!=='delivered'||last.amount<1||last.paid<=0||last.security<50||!buyer||!seller||buyer===seller||s.wars.some(w=>w.includes(buyer)&&w.includes(seller)))return null;
 initializeDevelopment(s);
 const recipient=s.development[buyer],source=s.development[seller];if(!recipient||!source)return null;
 const turn=s.year*12+s.month,previous=recipient.merchantContacts[route.id];
 if(previous?.seller===seller&&previous.lastTurn===turn)return null;
 const contact=previous?.seller===seller&&turn-previous.lastTurn<=9?previous:{seller,months:0,lastTurn:null};
 contact.months++;contact.lastTurn=turn;recipient.merchantContacts[route.id]=contact;
 if(contact.months<2)return null;
 contact.months=0;contact.pairs=(Number.isSafeInteger(contact.pairs)?contact.pairs:0)+1;
 if(recipient.merchantLeads.length>=3)return null;
 const eligible=branch=>{
  const catalog=branch==='material'?MATERIALS:IDEAS,known=branch==='material'?'knownMaterial':'knownIdeas';
  return catalog.find(candidate=>(branch==='material'?!strategicKnowledge.has(candidate.id):candidate.category!=='military'&&!guardedMerchantIdeas.has(candidate.id))&&source[known].includes(candidate.id)&&!recipient[known].includes(candidate.id)&&!knowledgeInProgress(recipient,branch,candidate.id)&&candidate.prerequisites.every(id=>recipient[known].includes(id))&&!recipient.merchantLeads.some(lead=>(lead.branch||'material')===branch&&lead.id===candidate.id));
 };
 const order=contact.pairs%2?['material','idea']:['idea','material'];
 const picked=order.map(branch=>({branch,item:eligible(branch)})).find(choice=>choice.item);
 if(!picked)return null;
 const {branch,item}=picked,lead={seller,routeId:route.id,branch,id:item.id,year:s.year,month:s.month,expiresTurn:turn+6};recipient.merchantLeads.push(lead);
 return {buyer,...lead,name:item.name};
}
export function researchTerms(s,owner,branch,id){
 const item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);if(!item)return null;
 const visitor=!!visitingScholarFor(s,owner,branch,id),merchant=merchantResearchLead(s,owner,branch,id),scholar=scholarExpertise(s,owner,branch,id);
 const effects=activeEffects(s,owner);
 return {cost:Math.max(8,item.cost-(effects.researchDiscount||0)-(branch==='idea'?(effects.ideaResearchDiscount||0):0)-(scholar?3:0)-(visitor?3:0)-(merchant?3:0)),months:Math.max(1,item.months-(scholar?1:0)-(visitor?1:0)-(merchant?1:0)),merchant,scholar};
}
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
export function templeGuaranteeExpense(s,owner){
 if(!s.grandMap||!s.development?.[owner]?.slots?.culture?.includes('egyptian-temple-revenues'))return 0;
 const supported=s.regions.filter(r=>r.owner===owner&&r.culture==='egypt'&&r.faiths?.[0]?.id==='egyptian-cults'&&r.priesthood?.tradition==='egyptian-cults').length;
 return Math.min(6,Math.ceil(supported/4));
}
export function researchInnovation(s,owner,branch,id){
  const d=development(s,owner),item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id),f=s.factions[owner];
  if(!item||d.research||d[branch==='material'?'knownMaterial':'knownIdeas'].includes(id)||knowledgeInProgress(d,branch,id))return {ok:false,reason:'unavailable'};
  if(item.prerequisites.some(pre=>!d[branch==='material'?'knownMaterial':'knownIdeas'].includes(pre)))return {ok:false,reason:'prerequisite'};
  const terms=researchTerms(s,owner,branch,id),visitingScholar=visitingScholarFor(s,owner,branch,id);
  if(f.treasury<terms.cost)return {ok:false,reason:'treasury'};
  f.treasury-=terms.cost;recordExpense(s,owner,'research',terms.cost);d.research={branch,id,remaining:terms.months,scholarPartner:visitingScholar?.id?visitingScholar.partner:null};
  if(terms.merchant)d.merchantLeads.splice(d.merchantLeads.indexOf(terms.merchant),1);
  return {ok:true};
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
const religiousAdoptionIdeas=new Set(['sanctuary-protection','ancestral-rites','provincial-rites-charter','egyptian-temple-revenues']);
function adoptionSpecialist(idea){
 if(idea.category==='military'||idea.id==='civic-exercise')return 'military';
 if(idea.category==='government'||idea.id==='cultural-accommodation')return 'statesman';
 if(idea.id==='public-works')return 'engineer';
 if(religiousAdoptionIdeas.has(idea.id))return 'religious';
 if(VARRO_RESEARCH_EXPERTISE.idea.has(idea.id))return 'scholar';
 return null;
}
export function ideaAdoptionPlan(s,owner,ideaId,slot=0){
  const d=development(s,owner),idea=IDEAS.find(x=>x.id===ideaId),f=s.factions[owner];
  if(!idea||!Number.isInteger(slot)||slot<0||slot>=d.slots[idea.category]?.length)return {ok:false,reason:'unavailable'};
  const old=d.slots[idea.category][slot],specialist=adoptionSpecialist(idea),adviserActive=!!(specialist&&figureActive(s,owner,specialist));
  const plan={cost:idea.adopt,months:Math.max(1,(old?3:2)+(activeEffects(s,owner).decisionDelay||0)+(d.foreignOrigins[ideaId]||idea.origin&&owner!==idea.origin?2:0)-(adviserActive?1:0)),stabilityLoss:old&&old!==ideaId?2:0,old,specialist,adviserActive};
  if(!d.knownIdeas.includes(ideaId)||d.adoption)return {...plan,ok:false,reason:'unavailable'};
  const compatible=ideaCompatibility(s,owner,ideaId,slot);if(!compatible.ok)return {...plan,...compatible};
  if(old===ideaId)return {...plan,ok:false,reason:'active'};
  const localGate=ideaLocalAdoptionGate(s,owner,idea);
  if(localGate)return {...plan,ok:false,reason:localGate};
  if(f.treasury<plan.cost)return {...plan,ok:false,reason:'treasury'};
  return {...plan,ok:true};
}
function ideaLocalAdoptionGate(s,owner,idea){
  if(idea.origin&&owner!==idea.origin){
    const culturalBase=s.regions.filter(r=>r.owner===owner&&(r.culture===(idea.originCulture||idea.origin)||!s.grandMap&&r.id===idea.origin));
    if(!culturalBase.length)return 'cultural-base';
    if(!culturalBase.some(r=>(r.civicSatisfaction??r.loyalty??0)>=45))return 'local-support';
  }
  if(idea.id==='egyptian-temple-revenues'&&!s.regions.some(r=>r.owner===owner&&r.culture==='egypt'&&r.faiths?.[0]?.id==='egyptian-cults'&&r.priesthood?.tradition==='egyptian-cults'&&r.priesthood.influence>=35&&(r.civicSatisfaction??r.loyalty??0)>=45))return 'priesthood';
  if(idea.requiresBuilding&&!s.regions.some(r=>r.owner===owner&&r.buildings.includes(idea.requiresBuilding)))return 'building';
  return null;
}
export function adoptIdea(s,owner,ideaId,slot=0){
  const plan=ideaAdoptionPlan(s,owner,ideaId,slot);if(!plan.ok)return {ok:false,reason:plan.reason,...(plan.with?{with:plan.with}:{})};
  const d=development(s,owner),idea=IDEAS.find(x=>x.id===ideaId),f=s.factions[owner];
  f.treasury-=plan.cost;recordExpense(s,owner,'policy',plan.cost);d.adoption={ideaId,category:idea.category,slot,remaining:plan.months,old:plan.old};
  if(plan.stabilityLoss)f.stability=Math.max(0,f.stability-plan.stabilityLoss);
  return {ok:true};
}
export function removeIdea(s,owner,category,slot=0){
  const d=development(s,owner),current=d.slots[category]?.[slot],f=s.factions[owner];
  if(!current||d.adoption||f.treasury<5)return {ok:false,reason:'unavailable'};
  f.treasury-=5;recordExpense(s,owner,'policy',5);d.adoption={ideaId:null,category,slot,remaining:2,old:current};return {ok:true};
}
export function cancelIdeaAdoption(s,owner){
  const d=development(s,owner);
  if(!d?.adoption)return {ok:false,reason:'unavailable'};
  d.adoption=null;
  return {ok:true};
}
export function ideaSlotExpansionCheck(s,owner,category){
  const d=development(s,owner),slots=d.slots[category],f=s.factions[owner];
  if(!slots||slots.length>=3)return {ok:false,reason:'capacity'};
  const known=d.knownIdeas.filter(id=>IDEAS.find(i=>i.id===id)?.category===category).length;
  const active=Object.values(d.slots).flat().filter(Boolean),owned=s.regions.filter(r=>r.owner===owner);
  const administration=active.some(id=>['senatorial-consultation','central-administration','maritime-administration'].includes(id))||owned.some(r=>r.buildings?.includes('administration'));
  const education=active.some(id=>['rhetorical-education','civic-education','naval-engineering-education'].includes(id))||owned.some(r=>r.buildings?.includes('library'));
  const cost=slots.length===1?35:60,months=slots.length===1?6:9;
  const requirements={known,requiredKnown:slots.length+1,administration,education,stability:f.stability,requiredStability:slots.length===2?55:0,treasury:f.treasury,cost,months,monthlyUpkeep:IDEA_SLOT_ADMIN_UPKEEP};
  if(d.expansion)return {...requirements,ok:false,reason:'capacity'};
  if(known<requirements.requiredKnown)return {...requirements,ok:false,reason:'knowledge'};
  if(slots.length===1&&!administration&&!education||slots.length===2&&(!administration||!education||f.stability<55))return {...requirements,ok:false,reason:'institution'};
  return f.treasury<cost?{...requirements,ok:false,reason:'treasury'}:{...requirements,ok:true};
}
export function expandIdeaSlot(s,owner,category){
  const check=ideaSlotExpansionCheck(s,owner,category);if(!check.ok)return check;
  const d=development(s,owner);s.factions[owner].treasury-=check.cost;recordExpense(s,owner,'policy',check.cost);d.expansion={category,remaining:check.months};return {ok:true,cost:check.cost,months:check.months};
}
export function constructionCheck(s,owner,regionId,buildingId){
  const d=development(s,owner),r=s.regions.find(x=>x.id===regionId),b=BUILDINGS.find(x=>x.id===buildingId),f=s.factions[owner];
  if(!r||!b||r.owner!==owner)return {ok:false,reason:'owner'};
  if(!d.knownMaterial.includes(b.tech))return {ok:false,reason:'technology'};
  if(!b.terrain.includes(r.terrain))return {ok:false,reason:'terrain'};
  if(b.id==='grain-mill'&&!(Number(r.food)>0))return {ok:false,reason:'harvest'};
  if(b.id==='mine'&&!(s.grandMap?r.resource==='metal':metalDeposits.has(r.id)))return {ok:false,reason:'deposit'};
  if(b.id==='mine'&&s.grandMap&&Number.isFinite(r.population)&&r.population<6000)return {ok:false,reason:'labor'};
  if(b.site==='coast'&&!(s.grandMap?r.port:coastalSites.has(r.id)))return {ok:false,reason:'coast'};
  if(b.site==='water'&&!(s.grandMap?r.river:waterSites.has(r.id)))return {ok:false,reason:'water'};
  if(b.site==='urban'&&!(s.grandMap?r.terrain==='urban':urbanSites.has(r.id)))return {ok:false,reason:'settlement'};
  if(b.id==='shipyard'&&!r.buildings.includes('port'))return {ok:false,reason:'port'};
  if(b.id==='milestone'&&!r.buildings.includes('road'))return {ok:false,reason:'road'};
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
  f.treasury-=cost;recordExpense(s,owner,'materials',cost);d.materials[kind]+=quantity;return {ok:true,cost,quantity};
}
function knowledgeCorridor(s,sender,receiver){
 // Either court may send a civilian courier to hand over the agreed material.
 for(const [courier,host] of [[sender,receiver],[receiver,sender]]){
  const regions=new Map(s.regions.map(r=>[r.id,r])),queue=s.regions.filter(r=>r.owner===courier).map(r=>r.id),seen=new Set(queue),neighbors=new Map();
  for(const [a,b] of s.grandMap?GRAND_ROUTES:ROUTES){
   if(!regions.has(a)||!regions.has(b))continue;
   if(!neighbors.has(a))neighbors.set(a,[]);if(!neighbors.has(b))neighbors.set(b,[]);
   neighbors.get(a).push(b);neighbors.get(b).push(a);
  }
  for(let i=0;i<queue.length;i++)for(const id of neighbors.get(queue[i])||[]){
   if(seen.has(id))continue;
   const ruler=regions.get(id).owner;
   if(ruler==='rebels'||atWarWith(s,courier,ruler))continue;
   if(ruler===host)return true;
   seen.add(id);queue.push(id);
  }
 }
 return false;
}
export function knowledgeTransitStatus(s,owner,trade){
  if(atWarWith(s,owner,trade.seller))return 'war';
  return knowledgeCorridor(s,trade.seller,owner)?'open':'route';
}
export const KNOWLEDGE_BLOCKED_LIMIT=12;
export function knowledgeTrade(s,buyer,seller,branch,id){
  initializeDevelopment(s);
  if(seller===s.player&&buyer!==s.player)return {ok:false,reason:'consent'};
  const bd=s.development[buyer],sd=s.development[seller],buyerFaction=s.factions[buyer],sellerFaction=s.factions[seller];
  const key=branch==='material'?'knownMaterial':branch==='idea'?'knownIdeas':null;
  const item=(branch==='material'?MATERIALS:branch==='idea'?IDEAS:[]).find(x=>x.id===id);
  if(!key||!item||!bd||!sd||!sd[key].includes(id)||bd[key].includes(id)||knowledgeInProgress(bd,branch,id))return {ok:false,reason:'knowledge'};
  if(s.wars.some(w=>w.includes(buyer)&&w.includes(seller)))return {ok:false,reason:'war'};
  if(!knowledgeCorridor(s,seller,buyer))return {ok:false,reason:'access'};
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
 if(!source||!recipient||!key||!item||!source[key].includes(id)||recipient[key].includes(id)||knowledgeInProgress(recipient,branch,id))return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(seller)&&w.includes(buyer)))return {ok:false,reason:'war'};
 if(!knowledgeCorridor(s,seller,buyer))return {ok:false,reason:'access'};
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
 if(!source||!recipient||!key||!item||!source[key].includes(id)||recipient[key].includes(id)||knowledgeInProgress(recipient,branch,id)||recipient.offers.some(o=>o.seller===seller&&o.branch===branch&&o.id===id)||recipient.offers.length>=3)return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(seller)&&w.includes(buyer)))return {ok:false,reason:'war'};
 if(!knowledgeCorridor(s,seller,buyer))return {ok:false,reason:'access'};
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
 if(!source||!recipient||!key||!item||!source[key].includes(id)||recipient[key].includes(id)||knowledgeInProgress(recipient,branch,id)||source.purchaseRequests.some(o=>o.buyer===buyer&&o.branch===branch&&o.id===id)||source.purchaseRequests.length>=3)return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(seller)&&w.includes(buyer)))return {ok:false,reason:'war'};
 if(!knowledgeCorridor(s,seller,buyer))return {ok:false,reason:'access'};
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
 if(knowledgeInProgress(ad,wantBranch,wantId)||knowledgeInProgress(bd,offerBranch,offerId))return {ok:false,reason:'pending'};
 if(s.wars.some(w=>w.includes(a)&&w.includes(b)))return {ok:false,reason:'war'};
 if(!knowledgeCorridor(s,a,b))return {ok:false,reason:'access'};
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
 if(!pd||!recipient||!offerKey||!wantKey||!(offerBranch==='material'?MATERIALS:IDEAS).some(x=>x.id===offerId)||!(wantBranch==='material'?MATERIALS:IDEAS).some(x=>x.id===wantId)||!pd[offerKey].includes(offerId)||!recipient[wantKey].includes(wantId)||pd[wantKey].includes(wantId)||recipient[offerKey].includes(offerId)||knowledgeInProgress(pd,wantBranch,wantId)||knowledgeInProgress(recipient,offerBranch,offerId)||recipient.exchangeRequests.some(x=>x.partner===partner)||recipient.exchangeRequests.length>=3)return {ok:false,reason:'knowledge'};
 if(s.wars.some(w=>w.includes(partner)&&w.includes(player)))return {ok:false,reason:'war'};
 if(!knowledgeCorridor(s,partner,player))return {ok:false,reason:'access'};
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
const atWarWith=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
function scholarRoute(s,origin,destination,partner){
 const regions=new Map(s.regions.map(r=>[r.id,r])),links=s.grandMap?GRAND_ROUTES:ROUTES,neighbors=new Map();
 for(const [a,b,kind,detail] of links){
  if(!regions.has(a)||!regions.has(b))continue;
  const from=regions.get(a),to=regions.get(b),distance=detail?.distance||Math.hypot(from.x-to.x,from.y-to.y),cost=Math.max(1,distance)*(kind==='sea'?1.1:1);
  for(const [start,end] of [[a,b],[b,a]]){if(!neighbors.has(start))neighbors.set(start,[]);neighbors.get(start).push({id:end,cost})}
 }
 const queue=[{id:origin,weight:0,path:[origin]}],best=new Map([[origin,0]]);
 while(queue.length){
  queue.sort((a,b)=>a.weight-b.weight);const current=queue.shift();if(current.weight!==best.get(current.id))continue;
  if(current.id===destination)return current.path;
  for(const next of neighbors.get(current.id)||[]){
   const ruler=regions.get(next.id)?.owner;
   // Civilian passage follows the sending court's relations, not the host's
   // military access. A war involving the sender closes that transit route.
   if(next.id!==destination&&(ruler==='rebels'||atWarWith(s,partner,ruler)))continue;
   const weight=current.weight+next.cost;if(weight>= (best.get(next.id)??Infinity))continue;
   best.set(next.id,weight);queue.push({id:next.id,weight,path:[...current.path,next.id]});
  }
 }
 return null;
}
export function scholarVisitCheck(s,host,partner,branch,id,ignoreRequest=false){
 initializeDevelopment(s);const hd=s.development[host],pd=s.development[partner],relation=s.relations[[host,partner].sort().join(':')]??0;
 if(!hd||!pd||host===partner||!s.regions.some(r=>r.owner===host)||!s.regions.some(r=>r.owner===partner)||s.wars.some(w=>w.includes(host)&&w.includes(partner)))return {ok:false,reason:'partner'};
 if(relation<20)return {ok:false,reason:'relations'};
 if(hd.visitingScholars.some(x=>x.partner===partner)||!ignoreRequest&&pd.scholarRequests.some(x=>x.host===host))return {ok:false,reason:'already invited'};
 const topics=scholarVisitTopics(s,host,partner),candidate=branch===undefined&&id===undefined?topics[0]:topics.find(topic=>topic.branch===branch&&topic.item.id===id);
 if(!candidate)return {ok:false,reason:'expertise'};
 const origin=s.regions.find(r=>r.owner===partner&&r.terrain==='urban')||s.regions.find(r=>r.owner===partner),destination=s.regions.find(r=>r.owner===host&&r.terrain==='urban')||s.regions.find(r=>r.owner===host);
 const route=scholarRoute(s,origin.id,destination.id,partner);if(!route)return {ok:false,reason:'access'};
 const travel=Math.max(2,Math.min(6,Math.ceil((route.length-1)/4)));
 if(s.factions[host].treasury<24)return {ok:false,reason:'treasury',travel};
 return {ok:true,branch:candidate.branch,id:candidate.item.id,travel,months:6,cost:24,origin:origin.id,destination:destination.id,route,requiresConsent:partner===s.player&&host!==s.player};
}
function beginScholarVisit(s,host,partner,check,acceptedBy){
 s.factions[host].treasury-=check.cost;s.factions[partner].treasury+=10;
 s.development[host].visitingScholars.push({partner,branch:check.branch,id:check.id,expertise:{branch:check.branch,id:check.id},origin:check.origin,destination:check.destination,route:check.route,currentRegion:check.origin,travelTotal:check.travel,travelRemaining:check.travel,remaining:check.months,sentYear:s.year,sentMonth:s.month,acceptedYear:s.year,acceptedMonth:s.month,acceptedBy});
 return {...check,accepted:true};
}
export function inviteForeignScholars(s,host,partner,branch,id){
 const check=scholarVisitCheck(s,host,partner,branch,id);if(!check.ok)return check;
 if(check.requiresConsent){s.development[partner].scholarRequests.push({host,branch:check.branch,id:check.id,remaining:12,sentYear:s.year,sentMonth:s.month});return {...check,pending:true}}
 const relation=s.relations[[host,partner].sort().join(':')]??0;
 if(relation<25||relation<40&&s.wars.some(w=>w.includes(partner)))return {ok:false,reason:'refused'};
 return beginScholarVisit(s,host,partner,check,'ai');
}
export function acceptScholarVisit(s,partner,host,branch,id){
 const d=development(s,partner),request=d?.scholarRequests.find(x=>x.host===host&&x.branch===branch&&x.id===id);
 if(partner!==s.player||!request)return {ok:false,reason:'request'};
 const check=scholarVisitCheck(s,host,partner,branch,id,true);if(!check.ok)return check;
 d.scholarRequests.splice(d.scholarRequests.indexOf(request),1);
 return beginScholarVisit(s,host,partner,check,'player');
}
export function declineScholarVisit(s,partner,host,branch,id){
 const d=development(s,partner),request=d?.scholarRequests.find(x=>x.host===host&&x.branch===branch&&x.id===id);
 if(partner!==s.player||!request)return {ok:false,reason:'request'};
 d.scholarRequests.splice(d.scholarRequests.indexOf(request),1);return {ok:true};
}
function agreementCandidate(s,seller,buyer,cycle=0){
 const source=s.development[seller],recipient=s.development[buyer];if(!source||!recipient)return null;
 for(const branch of cycle%2?['idea','material']:['material','idea']){
  const key=branch==='material'?'knownMaterial':'knownIdeas';
  const id=source[key].find(id=>!strategicKnowledge.has(id)&&!recipient[key].includes(id)&&!knowledgeInProgress(recipient,branch,id));
  if(id)return {branch,id};
 }
 return null;
}
export function knowledgeAgreementCheck(s,a,b){
 initializeDevelopment(s);
 if(a===b||!s.development[a]||!s.development[b]||!s.regions.some(r=>r.owner===a)||!s.regions.some(r=>r.owner===b))return {ok:false,reason:'partner'};
 if(s.knowledgeAgreements.some(x=>x.a===a&&x.b===b||x.a===b&&x.b===a))return {ok:false,reason:'existing'};
 if(s.wars.some(w=>w.includes(a)&&w.includes(b)))return {ok:false,reason:'war'};
 if(!knowledgeCorridor(s,a,b))return {ok:false,reason:'access'};
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
    if(d.research&&--d.research.remaining<=0){const {branch,id,scholarPartner}=d.research,key=branch==='material'?'knownMaterial':'knownIdeas',newKnowledge=!d[key].includes(id);if(newKnowledge)d[key].push(id);if(newKnowledge&&branch==='idea'&&scholarPartner)d.foreignOrigins[id]=scholarPartner;d.research=null;if(newKnowledge&&owner===s.player){const name=(branch==='material'?MATERIALS:IDEAS).find(item=>item.id===id)?.name||[id,id];log(`Research completed: ${name[0]}.`,`研究完成：${name[1]}。`)}}
    if(d.adoption&&--d.adoption.remaining<=0){
      const {category,slot,ideaId}=d.adoption,idea=IDEAS.find(item=>item.id===ideaId),gate=idea?ideaLocalAdoptionGate(s,owner,idea):null;
      if(gate){
        d.adoption.remaining=1;
        if(d.adoption.pausedReason!==gate&&owner===s.player)log('National idea transition paused: local adoption requirements are no longer met.','国家理念过渡暂停：当地装配条件已不再满足。');
        d.adoption.pausedReason=gate;
      }else{
        d.slots[category][slot]=ideaId;d.adoption=null;
        if(owner===s.player){const name=idea?.name||[ideaId||'removed',ideaId||'已移除'];log(`National idea ${name[0]} is now in effect.`,`国家理念${name[1]}现已生效。`)}
      }
    }
    if(d.expansion&&--d.expansion.remaining<=0){d.slots[d.expansion.category].push(null);d.expansion=null}
    d.offers=d.offers.filter(offer=>--offer.remaining>0&&!d[offer.branch==='material'?'knownMaterial':'knownIdeas'].includes(offer.id)&&!knowledgeInProgress(d,offer.branch,offer.id));
    d.purchaseRequests=d.purchaseRequests.filter(request=>--request.remaining>0&&!s.wars.some(w=>w.includes(owner)&&w.includes(request.buyer))&&d[request.branch==='material'?'knownMaterial':'knownIdeas'].includes(request.id)&&!s.development[request.buyer]?.[request.branch==='material'?'knownMaterial':'knownIdeas'].includes(request.id)&&!knowledgeInProgress(s.development[request.buyer],request.branch,request.id));
    d.exchangeRequests=d.exchangeRequests.filter(request=>--request.remaining>0&&!s.wars.some(w=>w.includes(owner)&&w.includes(request.partner))&&d[request.wantBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.wantId)&&!d[request.offerBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.offerId)&&s.development[request.partner]?.[request.offerBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.offerId)&&!s.development[request.partner]?.[request.wantBranch==='material'?'knownMaterial':'knownIdeas'].includes(request.wantId)&&!knowledgeInProgress(d,request.offerBranch,request.offerId)&&!knowledgeInProgress(s.development[request.partner],request.wantBranch,request.wantId));
    d.agreementRequests=d.agreementRequests.filter(request=>--request.remaining>0&&!s.wars.some(w=>w.includes(owner)&&w.includes(request.partner))&&(s.relations[[owner,request.partner].sort().join(':')]??0)>=20&&s.regions.some(r=>r.owner===owner)&&s.regions.some(r=>r.owner===request.partner)&&!s.knowledgeAgreements.some(a=>a.a===owner&&a.b===request.partner||a.a===request.partner&&a.b===owner));
    d.scholarRequests=d.scholarRequests.filter(request=>--request.remaining>0&&!atWarWith(s,owner,request.host)&&s.regions.some(r=>r.owner===owner)&&s.regions.some(r=>r.owner===request.host));
    for(const trade of [...d.trade]){
      const transit=knowledgeTransitStatus(s,owner,trade);
      if(transit!=='open'){
        if(trade.pausedReason!==transit&&owner===s.player)log(transit==='war'?'Foreign knowledge transfer paused by war.':'Foreign knowledge transfer paused: no civilian route.',transit==='war'?'战争使外国知识传递暂停。':'民间通行路线中断，外国知识传递暂停。');
        trade.pausedReason=transit;
        trade.blockedMonths=Math.min(KNOWLEDGE_BLOCKED_LIMIT,Math.max(0,Number.isInteger(trade.blockedMonths)?trade.blockedMonths:0)+1);
        if(trade.blockedMonths>=KNOWLEDGE_BLOCKED_LIMIT){
          d.trade.splice(d.trade.indexOf(trade),1);
          if(owner===s.player)log('Foreign knowledge transfer expired after a year without a passable route. The original payment is not returned.','外国知识传递因一年未能通行而失效，原付款不退还。');
        }
        continue;
      }
      if(trade.pausedReason&&owner===s.player)log('Foreign knowledge transfer resumed.','外国知识传递已恢复。');
      delete trade.pausedReason;
      delete trade.blockedMonths;
      if(--trade.remaining>0)continue;
      const key=trade.branch==='material'?'knownMaterial':'knownIdeas',newKnowledge=!d[key].includes(trade.id);
      if(newKnowledge)d[key].push(trade.id);
      if(newKnowledge&&trade.branch==='idea')d.foreignOrigins[trade.id]=trade.seller;
      d.trade.splice(d.trade.indexOf(trade),1);
      if(newKnowledge&&owner===s.player){const name=(trade.branch==='material'?MATERIALS:IDEAS).find(item=>item.id===trade.id)?.name||[trade.id,trade.id],seller=FACTIONS[trade.seller]?.short||[trade.seller,trade.seller];log(`Knowledge arrived from ${seller[0]}: ${name[0]}.`,`来自${seller[1]}的知识已传入：${name[1]}。`)}
    }
    for(const visit of [...d.visitingScholars]){
      if(atWarWith(s,owner,visit.partner)||!s.regions.some(r=>r.owner===owner)||!s.regions.some(r=>r.owner===visit.partner)||visit.destination&&s.regions.find(r=>r.id===visit.destination)?.owner!==owner){d.visitingScholars.splice(d.visitingScholars.indexOf(visit),1);continue}
      if(visit.travelRemaining>0){
        if(Array.isArray(visit.route)&&visit.route.length>1){
          const current=visit.currentRegion||visit.origin,position=Math.max(0,visit.route.indexOf(current));
          if(visit.route.slice(position+1).some(id=>{const ruler=s.regions.find(r=>r.id===id)?.owner;return ruler==='rebels'||atWarWith(s,visit.partner,ruler)})){
            const reroute=scholarRoute(s,current,visit.destination,visit.partner);
            if(!reroute){d.visitingScholars.splice(d.visitingScholars.indexOf(visit),1);if(owner===s.player)log('Foreign instruction was cancelled when the civilian route closed.','民间通行路线中断，外国技术指导取消。');continue}
            visit.route=reroute;visit.travelTotal=Math.max(visit.travelRemaining,Math.min(6,Math.ceil((reroute.length-1)/4)));
            visit.travelRemaining=visit.travelTotal;
          }
          visit.travelRemaining--;
          const total=visit.travelTotal||1,progress=Math.floor((total-visit.travelRemaining)*(visit.route.length-1)/total);
          visit.currentRegion=visit.route[Math.min(visit.route.length-1,progress)];
        }else visit.travelRemaining--;
        if(!visit.travelRemaining&&owner===s.player){const name=(visit.branch==='material'?MATERIALS:IDEAS).find(item=>item.id===visit.id)?.name||[visit.id,visit.id];log(`Scholars arrived to advise research on ${name[0]}.`,`外国学者抵达，将协助研究${name[1]}。`)}continue;
      }
      if(--visit.remaining<=0)d.visitingScholars.splice(d.visitingScholars.indexOf(visit),1);
    }
    const added={stone:0,timber:0,metal:0};
    for(const r of s.regions.filter(x=>x.owner===owner)){
      if(r.terrain==='forest')added.timber+=2;
      if(r.terrain==='hills')added.stone++;
      const local=localBuildingEffects(r);for(const k of ['stone','timber','metal'])added[k]+=local[k]||0;
    }
    for(const k of Object.keys(added))d.materials[k]=Math.min(100,d.materials[k]+added[k]);
    f.treasury-=Object.values(d.slots).reduce((n,slots)=>n+Math.max(0,slots.length-1)*IDEA_SLOT_ADMIN_UPKEEP,0)+taxReviewExpense(s,owner)+templeGuaranteeExpense(s,owner);
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
      if(!knowledgeCorridor(s,a,b))agreement.next=1;
      else{
        for(const [seller,buyer] of [[a,b],[b,a]]){
          const candidate=agreementCandidate(s,seller,buyer,agreement.cycle);
          if(candidate)s.development[buyer].trade.push({seller,...candidate,remaining:2,method:'agreement'});
        }
        agreement.next=3;agreement.cycle++;
      }
    }
    if(--agreement.remaining<=0)s.knowledgeAgreements.splice(s.knowledgeAgreements.indexOf(agreement),1);
  }
}
export function mineMetalOutput(r){const population=r.population;return !Number.isFinite(population)?2:population>=6000?2:population>=3000?1:0}
export function localBuildingEffects(r){const out={};for(const id of r.buildings||[]){const b=BUILDINGS.find(x=>x.id===id);if(!b)continue;for(const [k,v] of Object.entries(b.effects))out[k]=(out[k]||0)+(id==='mine'&&k==='metal'?mineMetalOutput(r):id==='grain-mill'&&k==='food'?Math.min(v,Math.max(0,Number(r.food)||0)):v);out.upkeep=(out.upkeep||0)+b.upkeep}return out}

export const GRANARY_RESERVE_CAPACITY=24;
export const grainStorageCapacity=site=>Math.max(0,localBuildingEffects(site).localFoodCapacity||0);
const storedGrain=site=>Math.max(0,Math.min(grainStorageCapacity(site),Math.floor(Number(site.grainReserve)||0)));
// Transfer actual state food into a provincial store; no food is created by storage.
export function settleGranaryReserves(s,owner){
 const treasury=s.factions[owner],stores=s.regions.filter(r=>r.owner===owner&&grainStorageCapacity(r)>0);
 if(!treasury||!stores.length)return 0;
 let transferred=0;
 if(treasury.food<0){
  for(const site of stores){const reserve=storedGrain(site),amount=Math.min(4,reserve,-treasury.food);site.grainReserve=reserve-amount;treasury.food+=amount;transferred+=amount;if(treasury.food>=0)break}
 }else if(treasury.food>30){
  for(const site of stores){const reserve=storedGrain(site),amount=Math.min(2,grainStorageCapacity(site)-reserve,Math.max(0,treasury.food-25));site.grainReserve=reserve+amount;treasury.food-=amount;transferred+=amount;if(treasury.food<=25)break}
 }
 return transferred;
}
// Older saves counted all 45 granary spaces in the national pool. Move only
// the excess above the new national limit into owned stores, exactly once.
export function migrateGranaryReserves(s,nationalCapacity){
 if(s.granaryReservesVersion===1)return;
 for(const [owner,faction] of Object.entries(s.factions||{})){
  let overflow=Math.max(0,Math.floor(faction.food-(nationalCapacity(s,owner)||0)));
  for(const site of s.regions.filter(r=>r.owner===owner&&r.buildings?.includes('granary'))){
   const reserve=storedGrain(site),amount=Math.min(overflow,GRANARY_RESERVE_CAPACITY-reserve);
   site.grainReserve=reserve+amount;faction.food-=amount;overflow-=amount;
   if(!overflow)break;
  }
 }
 s.granaryReservesVersion=1;
}
export const developmentCatalogIds={ideas:ids(IDEAS),materials:ids(MATERIALS),buildings:ids(BUILDINGS)};
