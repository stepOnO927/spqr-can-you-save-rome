// MANDATE OF HEAVEN — static data for the Western Han vertical slice.
// Coordinates are modern longitude/latitude of the commandery or oasis seat.
// Population, grain, tax and supply are gameplay abstractions in the same
// spirit as the Roman campaign; they are not census reconstructions.
//
// Chronology of the opening (documented in SOURCES): Emperor Xuan (Liu Xun)
// died on 10 January 48 BCE, late in the Huanglong 黄龙 era (conventionally
// "49 BCE"); Liu Shi took the throne on 29 January 48 BCE. The campaign opens
// in February 48 BCE, after the accession.

export const START={year:-48,month:2,label:['Huanglong 1, final month · February 48 BCE (Emperor Xuan d. 10 Jan 48 BCE; Liu Shi enthroned 29 Jan 48 BCE)','黄龙元年岁末 · 公元前48年2月（宣帝崩于公元前48年1月10日；刘奭于1月29日即位）']};

// terrain: plain | hills | mountain | river | desert | steppe | oasis | urban
// kind: commandery 郡 | kingdom 诸侯王国 | capital | protectorate 都护驻地 | oasis 城郭之国 | steppe 游牧之地
const R=(id,en,zh,lon,lat,terrain,kind,owner,pop,grain,tax,supply,fort,extra={})=>({id,name:[en,zh],lon,lat,terrain,kind,owner,pop,grain,tax,supply,fort,loyalty:70,granary:0,irrigation:0,...extra});
export const REGIONS=[
 // Han core — Guanzhong, the North China Plain, the south and Shu
 R('changan','Chang’an (Jingzhao)','长安（京兆）',108.94,34.27,'urban','capital','han',60,9,10,9,3,{seat:['Chang’an','长安'],river:true}),
 R('hongnong','Hongnong (Hangu Pass)','弘农（函谷关）',110.87,34.52,'mountain','commandery','han',22,4,4,4,3,{seat:['Hongnong','弘农']}),
 R('henan','Henan (Luoyang)','河南（洛阳）',112.45,34.68,'plain','commandery','han',50,9,9,8,2,{seat:['Luoyang','洛阳'],river:true,yellow:true,arsenal:true}),
 R('hedong','Hedong','河东',111.0,35.6,'hills','commandery','han',32,6,6,5,1,{seat:['Anyi','安邑'],river:true,yellow:true,salt:true}),
 R('taiyuan','Taiyuan','太原',112.55,37.87,'hills','commandery','han',24,5,4,4,1,{seat:['Jinyang','晋阳']}),
 R('zhao','Zhao Kingdom (Handan)','赵国（邯郸）',114.49,36.6,'plain','kingdom','han',36,8,6,6,1,{seat:['Handan','邯郸'],yellow:true,iron:true}),
 R('yan','Guangyang (Ji)','广阳（蓟）',116.4,39.9,'plain','kingdom','han',20,5,4,4,2,{seat:['Ji','蓟']}),
 R('qi','Qi (Linzi)','齐（临淄）',118.3,36.8,'plain','commandery','han',44,8,9,6,1,{seat:['Linzi','临淄'],yellow:true,salt:true,silk:true}),
 R('dongping','Dongping Kingdom','东平国',116.3,35.9,'plain','kingdom','han',26,7,5,5,0,{seat:['Wuyan','无盐'],yellow:true}),
 R('huaiyang','Huaiyang Kingdom (Chen)','淮阳国（陈）',114.9,33.73,'plain','kingdom','han',30,8,5,5,0,{seat:['Chen','陈']}),
 R('chu','Chu Kingdom (Pengcheng)','楚国（彭城）',117.18,34.26,'plain','kingdom','han',32,7,6,5,1,{seat:['Pengcheng','彭城'],iron:true}),
 R('nanyang','Nanyang (Wan)','南阳（宛）',112.53,33.0,'plain','commandery','han',38,8,7,6,1,{seat:['Wan','宛'],iron:true}),
 R('nanjun','Nan Commandery (Jiangling)','南郡（江陵）',112.19,30.35,'river','commandery','han',26,7,5,6,1,{seat:['Jiangling','江陵'],river:true,yangtze:true}),
 R('changsha','Changsha Kingdom','长沙国',112.98,28.2,'hills','kingdom','han',14,5,3,3,0,{seat:['Linxiang','临湘'],river:true,yangtze:true}),
 R('kuaiji','Kuaiji (Wu)','会稽（吴）',120.6,31.3,'river','commandery','han',24,6,5,5,0,{seat:['Wu','吴'],river:true,yangtze:true,silk:true}),
 R('hanzhong','Hanzhong','汉中',107.03,33.07,'mountain','commandery','han',14,4,3,3,2,{seat:['Nanzheng','南郑']}),
 R('shu','Shu (Chengdu)','蜀郡（成都）',104.07,30.67,'plain','commandery','han',34,9,7,6,1,{seat:['Chengdu','成都'],river:true,silk:true,iron:true,irrigation:2}),
 R('tianshui','Tianshui & Longxi','天水·陇西',105.3,35.0,'hills','commandery','han',20,4,3,4,2,{seat:['Pingxiang','平襄']}),
 R('jincheng','Jincheng','金城',103.3,36.2,'hills','commandery','han',10,3,2,3,2,{seat:['Yunwu','允吾'],frontier:true}),
 R('beidi','Beidi','北地',106.6,36.6,'hills','commandery','han',12,3,2,3,2,{seat:['Maling','马领'],frontier:true,horses:true}),
 R('shuofang','Shuofang & Wuyuan','朔方·五原',108.6,40.4,'steppe','commandery','han',12,3,2,3,3,{seat:['Shuofang','朔方'],frontier:true,yellow:true}),
 R('yunzhong','Yunzhong & Dingxiang','云中·定襄',111.6,40.6,'steppe','commandery','han',10,3,2,3,3,{seat:['Yunzhong','云中'],frontier:true}),
 R('yanmen','Yanmen & Dai','雁门·代',112.6,39.6,'hills','commandery','han',16,4,3,3,3,{seat:['Shanwu','善无'],frontier:true}),
 // Hexi Corridor — the four commanderies
 R('wuwei','Wuwei','武威',102.64,37.93,'oasis','commandery','han',10,4,2,4,2,{seat:['Guzang','姑臧'],frontier:true,hexi:true,horses:true}),
 R('zhangye','Zhangye','张掖',100.45,38.93,'oasis','commandery','han',9,4,2,4,2,{seat:['Lude','觻得'],frontier:true,hexi:true}),
 R('jiuquan','Jiuquan','酒泉',98.5,39.73,'oasis','commandery','han',8,3,2,3,2,{seat:['Lufu','禄福'],frontier:true,hexi:true}),
 R('dunhuang','Dunhuang (Yumen Pass)','敦煌（玉门关）',94.66,40.14,'oasis','commandery','han',6,3,2,3,3,{seat:['Dunhuang','敦煌'],frontier:true,hexi:true}),
 // Western Regions — oasis kingdoms under layered Protectorate authority
 R('wulei','Wulei & Quli (Protectorate)','乌垒·渠犁（都护驻地）',84.6,41.75,'oasis','protectorate','han',2,2,1,2,2,{seat:['Wulei','乌垒'],protectorate:true,tuntian:true}),
 R('shanshan','Shanshan (Loulan)','鄯善（楼兰）',88.6,39.1,'desert','oasis','shanshan',3,1,1,2,1,{seat:['Wuni','扜泥']}),
 R('jushi','Jushi (Jiaohe)','车师前国（交河）',89.06,42.95,'oasis','oasis','jushi',2,2,1,2,2,{seat:['Jiaohe','交河']}),
 R('yanqi','Yanqi','焉耆',86.57,42.06,'oasis','oasis','yanqi',4,2,1,2,1,{seat:['Yuanqu','员渠']}),
 R('qiuci','Qiuci','龟兹',82.96,41.72,'oasis','oasis','qiuci',8,3,2,3,1,{seat:['Yancheng','延城']}),
 R('yutian','Yutian (Khotan)','于阗',79.92,37.1,'oasis','oasis','yutian',4,2,2,2,1,{seat:['Xicheng','西城'],jade:true}),
 R('shache','Shache (Yarkand)','莎车',77.24,38.41,'oasis','oasis','shache',3,2,1,2,1,{seat:['Shache','莎车']}),
 R('shule','Shule (Kashgar)','疏勒',75.99,39.47,'oasis','oasis','shule',3,2,1,2,1,{seat:['Shule','疏勒']}),
 // Steppe and Central Asia
 R('wusun','Wusun Greater Kunmi (Chigu)','乌孙大昆弥（赤谷）',78.6,42.2,'steppe','steppe','wusun',12,2,1,3,1,{seat:['Chigu','赤谷城'],horses:true}),
 R('wusun_lesser','Wusun Lesser Kunmi (Ili)','乌孙小昆弥（伊犁）',81.3,43.9,'steppe','steppe','wusun_lesser',8,1,1,3,0,{horses:true}),
 R('dayuan','Dayuan (Ferghana)','大宛（费尔干纳）',71.6,40.8,'oasis','oasis','dayuan',30,4,2,4,2,{seat:['Guishan','贵山城'],horses:true}),
 R('kangju','Kangju','康居',69.5,42.8,'steppe','steppe','kangju',12,2,1,3,1,{seat:['Beitian','卑阗城'],horses:true}),
 R('monan','Southern Steppe (Huhanye)','漠南（呼韩邪庭）',108.9,42.0,'steppe','steppe','huhanye',6,1,1,3,0,{horses:true}),
 R('mobei','Northern Steppe (Chanyu Court)','漠北（单于庭）',102.5,47.3,'steppe','steppe','zhizhi',8,1,1,3,0,{horses:true}),
 R('wujie','Wujie','乌揭',88.0,47.5,'steppe','steppe','wujie',4,1,1,2,0,{horses:true}),
 R('jiankun','Jiankun','坚昆',91.5,51.0,'steppe','steppe','jiankun',6,1,1,2,0,{horses:true}),
 R('qiang','Qiang Highlands','羌地',100.8,36.2,'mountain','steppe','qiang',8,1,1,2,0,{})
];
for(const r of REGIONS)if(r.owner==='han')r.loyalty=r.kind==='kingdom'?62:r.frontier?66:74;

// kind: road 驰道/道路 | river 水运 | pass 关隘 | desert 沙碛 | steppe 草原 | oasis 绿洲道
// months: base travel time for a mixed infantry army; supply: logistic quality 0–3.
const L=(a,b,kind,months,supply,name=null)=>({a,b,kind,months,supply,name});
export const ROUTES=[
 L('changan','hongnong','road',1,3,['Hangu road','函谷道']),L('hongnong','henan','pass',1,2,['Hangu Pass','函谷关']),
 L('changan','hedong','river',1,3,['Yellow River crossing','蒲津']),L('henan','hedong','river',1,2),L('hedong','taiyuan','road',1,2),
 L('taiyuan','yanmen','pass',1,2,['Gouzhu Pass','句注塞']),L('yanmen','yunzhong','road',1,2),L('yunzhong','shuofang','road',1,2),
 L('changan','beidi','road',1,2),L('beidi','shuofang','road',2,1,['Direct Road','直道']),L('changan','tianshui','road',1,2,['Long road','陇道']),
 L('changan','hanzhong','pass',2,1,['Qinling plank roads','秦岭栈道']),L('hanzhong','shu','pass',2,1,['Shu roads','蜀道']),
 L('changan','nanyang','pass',2,2,['Wu Pass','武关']),L('nanyang','henan','road',1,3),L('nanyang','nanjun','road',1,2),
 L('nanjun','changsha','river',1,2),L('nanjun','shu','river',2,1,['Yangtze Gorges','三峡']),L('nanjun','kuaiji','river',2,2,['Yangtze','长江水道']),
 L('henan','zhao','road',1,3),L('zhao','yan','road',1,2),L('zhao','taiyuan','pass',1,1,['Taihang passes','太行陉']),L('yan','yanmen','road',1,1),
 L('henan','huaiyang','road',1,3),L('huaiyang','chu','road',1,3),L('chu','qi','road',1,2),L('qi','dongping','road',1,2),
 L('dongping','zhao','road',1,2),L('dongping','huaiyang','road',1,2),L('chu','kuaiji','river',2,2,['Huai–Yangtze waterways','江淮水道']),
 L('tianshui','jincheng','road',1,2),L('jincheng','wuwei','pass',1,1,['Wushaoling','乌鞘岭']),L('jincheng','qiang','road',1,1),
 L('wuwei','zhangye','road',1,2),L('zhangye','jiuquan','road',1,2),L('jiuquan','dunhuang','road',1,2),L('beidi','wuwei','steppe',2,1),
 L('dunhuang','shanshan','desert',2,0,['White Dragon Mounds','白龙堆']),L('shanshan','jushi','desert',2,0),L('shanshan','wulei','desert',2,0),
 L('jushi','yanqi','oasis',1,1),L('yanqi','wulei','oasis',1,1),L('wulei','qiuci','oasis',1,1),L('qiuci','shule','oasis',2,1,['Northern route','北道']),
 L('shanshan','yutian','desert',3,0,['Southern route','南道']),L('yutian','shache','oasis',1,1),L('shache','shule','oasis',1,1),
 L('shule','dayuan','pass',2,0,['Terek Pass','葱岭']),L('dayuan','kangju','steppe',1,1),L('kangju','wusun','steppe',2,1),
 L('wusun','qiuci','pass',2,0,['Tianshan passes','天山隘口']),L('wusun','wusun_lesser','steppe',1,1),L('wusun','dayuan','pass',2,1),
 L('jushi','wusun_lesser','pass',2,0,['Tianshan north road','天山北路']),
 L('shuofang','monan','steppe',1,1),L('yunzhong','monan','steppe',1,1),L('yanmen','monan','steppe',1,1),
 L('monan','mobei','desert',2,0,['Gobi crossing','戈壁']),L('mobei','wujie','steppe',2,1),L('wujie','jiankun','steppe',1,1),
 L('mobei','jiankun','steppe',2,1),L('wujie','wusun_lesser','steppe',2,1),L('wujie','jushi','steppe',2,1),L('kangju','wujie','steppe',3,0)
];

// Factions. `ruler` is the character holding effective rule at the start.
const F=(id,en,zh,color,culture,ruler,extra={})=>({id,name:[en,zh],color,culture,ruler,...extra});
export const FACTIONS={
 han:F('han','Western Han Empire','西汉','#a2311f','han','liu-shi',{state:'empire'}),
 huhanye:F('huhanye','Huhanye Chanyu’s Xiongnu','呼韩邪单于部','#7a6a3a','xiongnu','huhanye',{state:'confederation'}),
 zhizhi:F('zhizhi','Zhizhi Chanyu’s Xiongnu','郅支单于部','#4f3f2a','xiongnu','zhizhi',{state:'confederation'}),
 wusun:F('wusun','Wusun — Greater Kunmi','乌孙大昆弥','#3f6f6a','wusun','xingmi',{state:'kunmi'}),
 wusun_lesser:F('wusun_lesser','Wusun — Lesser Kunmi','乌孙小昆弥','#5d8a74','wusun','wujiutu',{state:'kunmi'}),
 kangju:F('kangju','Kangju','康居','#6b4f7a','steppe','kangju-king',{state:'kingdom'}),
 dayuan:F('dayuan','Dayuan','大宛','#8a6b2f','oasis','dayuan-king',{state:'kingdom'}),
 shanshan:F('shanshan','Shanshan','鄯善','#b08a4a','oasis','shanshan-king',{state:'oasis'}),
 jushi:F('jushi','Jushi','车师','#9a5a3c','oasis','jushi-king',{state:'oasis'}),
 yanqi:F('yanqi','Yanqi','焉耆','#8f7f56','oasis','yanqi-king',{state:'oasis'}),
 qiuci:F('qiuci','Qiuci','龟兹','#c0763a','oasis','qiuci-king',{state:'oasis'}),
 yutian:F('yutian','Yutian','于阗','#5f8f4a','oasis','yutian-king',{state:'oasis'}),
 shache:F('shache','Shache','莎车','#7f9a5a','oasis','shache-king',{state:'oasis'}),
 shule:F('shule','Shule','疏勒','#a0825a','oasis','shule-king',{state:'oasis'}),
 wujie:F('wujie','Wujie','乌揭','#6f6f5a','steppe',null,{state:'tribes',minor:true}),
 jiankun:F('jiankun','Jiankun','坚昆','#5a6f7f','steppe',null,{state:'tribes',minor:true}),
 qiang:F('qiang','Qiang peoples','羌人诸部','#7f5a4a','qiang',null,{state:'tribes',minor:true}),
 han_loyalist:F('han_loyalist','Han Loyalist Court','汉室勤王政府','#c8492e','han',null,{state:'government',dynamic:true})
};
export const PLAYABLE=['han','huhanye','zhizhi','wusun','wusun_lesser','kangju','dayuan','shanshan','jushi','yanqi','qiuci','yutian','shache','shule'];
export const OASIS=['shanshan','jushi','yanqi','qiuci','yutian','shache','shule'];
export const STEPPE=['huhanye','zhizhi','wusun','wusun_lesser','kangju','wujie','jiankun'];

// Distant western nodes. They are not on the playable map; they are the far
// end of the intermediary chain. 犁靬 Lijian appears in the Shiji and Hanshu as
// a far-western land; identifications with Roman Egypt or the Hellenistic
// world are debated, so the game uses the period term and states the doubt.
export const FAR_WEST=[
 {id:'anxi',name:['Anxi (Parthia)','安息'],via:'kangju',months:6,intermediary:true},
 {id:'lijian',name:['Lijian — the far west (Rome’s world, by rumor)','犁靬（极西之地，传闻中的罗马世界）'],via:'anxi',months:18,intermediary:false}
];

export const GOODS={
 silk:{name:['Silk','丝绸'],origin:['qi','shu','kuaiji'],value:6},
 iron:{name:['Iron and metal goods','铁器'],origin:['nanyang','zhao','chu'],value:4},
 lacquer:{name:['Lacquerware','漆器'],origin:['shu'],value:5},
 horses:{name:['Horses','马匹'],origin:['dayuan','wusun','wusun_lesser','kangju'],value:5},
 jade:{name:['Jade','玉石'],origin:['yutian'],value:6},
 wool:{name:['Woollen textiles','毛织物'],origin:['kangju','qiuci'],value:3},
 grapes:{name:['Grapes and alfalfa','葡萄与苜蓿'],origin:['dayuan'],value:2}
};

// Western Han offices of 48 BCE. Titles follow the Hanshu tables of officials.
// `admin` and `military` say what the office actually drives in the simulation.
export const OFFICES={
 chengxiang:{name:['Chancellor','丞相'],gloss:['Head of the outer administration; traditionally dismissed for calamities.','外朝之首，常因灾异被免。'],rank:10,admin:3,drives:'administration'},
 yushi:{name:['Imperial Counsellor','御史大夫'],gloss:['Second of the senior ministers; supervises censorial oversight.','亚相，掌监察。'],rank:9,admin:2,drives:'oversight'},
 dasima:{name:['Grand Marshal & General of Chariots and Cavalry','大司马车骑将军'],gloss:['Inner-court commander, usually a consort relative; “in charge of the Secretariat” (领尚书事).','中朝首领，多由外戚担任，领尚书事。'],rank:10,admin:2,military:2,drives:'inner_court'},
 qianjiangjun:{name:['General of the Van & Superintendent of the Palace','前将军光禄勋'],gloss:['Senior general and head of palace gentlemen.','前将军兼光禄勋，掌宫殿门户郎官。'],rank:8,admin:1,military:1,drives:'palace'},
 zhongshu:{name:['Prefect of the Palace Secretariat','中书令'],gloss:['Eunuch office carrying documents between emperor and Secretariat.','宦者之职，出纳奏章。'],rank:6,admin:1,drives:'documents'},
 dasinong:{name:['Grand Minister of Agriculture','大司农'],gloss:['Manages the state granaries, grain transport and fiscal revenue.','掌国家钱谷、漕运与财政。'],rank:8,admin:2,drives:'finance'},
 zongzheng:{name:['Director of the Imperial Clan','宗正'],gloss:['Keeps the register of the Liu imperial clan; always a Liu.','掌皇族属籍，例由刘氏宗室担任。'],rank:8,admin:1,drives:'clan',requiresLiu:true},
 duhu:{name:['Protector-General of the Western Regions','西域都护'],gloss:['Commands the Protectorate at Wulei; supervises oasis rulers, not their internal government.','驻乌垒，监护西域诸国，不直接治理其内政。'],rank:7,military:2,drives:'protectorate'},
 hexi:{name:['Chief Commandant of the Hexi Garrisons','河西都尉'],gloss:['Frontier commander for the four Hexi commanderies (gameplay grouping).','河西四郡边防统领（游戏归并）。'],rank:6,military:2,drives:'frontier'},
 jingzhao:{name:['Governor of the Capital','京兆尹'],gloss:['Administers the capital district.','治理京畿。'],rank:7,admin:2,drives:'capital'}
};

// Court factions (gameplay groupings described with period terms).
export const COURT_FACTIONS={
 waiqi:{name:['Consort relatives','外戚'],aim:['Family offices, inner-court control, influence over succession','家族官职、中朝权力、左右继承']},
 ru:{name:['Classicist officials','儒臣'],aim:['Classical government, frugality, ritual reform, curbs on the inner court','经术治国、节俭、礼制改革、限制中朝']},
 huanguan:{name:['Palace Secretariat eunuchs','中书宦官'],aim:['Control of documents and access to the emperor','掌握文书与面见皇帝之途']},
 frontier:{name:['Frontier generals','边将'],aim:['Garrisons, campaigns, honours for the western and northern commands','戍边、出征、西北军功']},
 haoqiang:{name:['Regional magnates','地方豪强'],aim:['Land, local office, light audits','田产、地方职位、宽松稽查']}
};
