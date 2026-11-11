// Geography of the Han theatre: administrative circuits, military theatres,
// territory shape anchors, terrain, rivers and lakes.
//
// Territory borders are generated from several anchor points per territory
// (a Voronoi partition clipped to the coastline). Borders are therefore
// schematic: they follow the territory's seat, valley or oasis chain, not
// surveyed Han boundaries. Coordinates are [longitude, latitude].

// 十三州刺史部 — inspection circuits created in 106 BCE (supervisory, not a
// level of government in Western Han). Attribution follows the Treatise on
// Geography of the Hanshu in outline; grouped territories take the circuit of
// their principal commandery.
export const ZHOU={
 sili:{name:['Metropolitan Region (Sili)','司隶校尉部'],color:'#b8574a'},
 bing:{name:['Bing Circuit','并州'],color:'#8f7a4a'},
 shuofang:{name:['Shuofang Circuit','朔方刺史部'],color:'#a08a52'},
 liang:{name:['Liang Circuit','凉州'],color:'#c49a5a'},
 yi:{name:['Yi Circuit','益州'],color:'#6f8a5a'},
 jing:{name:['Jing Circuit','荆州'],color:'#5f8a7a'},
 yang:{name:['Yang Circuit','扬州'],color:'#4f7a8a'},
 yu:{name:['Yu Circuit','豫州'],color:'#9a6a5a'},
 yan:{name:['Yan Circuit','兖州'],color:'#a07a62'},
 xu:{name:['Xu Circuit','徐州'],color:'#8a6a7a'},
 qing:{name:['Qing Circuit','青州'],color:'#7a7a9a'},
 ji:{name:['Ji Circuit','冀州'],color:'#7a8a6a'},
 you:{name:['You Circuit','幽州'],color:'#6a7a8a'},
 duhu:{name:['Western Regions Protectorate','西域都护府'],color:'#c8a050'},
 waifan:{name:['Outer peoples and states','外藩诸国'],color:'#8a8070'}
};
// 战区 — military theatres used for command, reporting and the map.
export const THEATERS={
 guanzhong:{name:['Guanzhong','关中'],role:['The capital basin behind the passes','关隘环护的京畿']},
 zhongyuan:{name:['Central Plain','中原'],role:['Luoyang, Nanyang and the Huai lands','洛阳、南阳与淮北']},
 hebei:{name:['Hedong & Hebei','河东·河北'],role:['East of the Taihang and along the Fen','太行东西与汾水流域']},
 shandong:{name:['Shandong','山东'],role:['Qi, Lu and the eastern kingdoms','齐鲁与东方诸国']},
 jiangnan:{name:['Jiang–Han & Jiangdong','江汉·江东'],role:['The Yangtze lands','长江流域']},
 bashu:{name:['Ba–Shu','巴蜀'],role:['Hanzhong and the Chengdu plain','汉中与成都平原']},
 beibian:{name:['Northern Frontier','北边'],role:['The Ordos and the walls facing the steppe','河套与北塞']},
 longyou:{name:['Longyou & the Qiang','陇右·羌中'],role:['West of the Long mountains','陇山以西']},
 hexi:{name:['Hexi Corridor','河西'],role:['The four commanderies','河西四郡']},
 xiyu:{name:['Western Regions','西域'],role:['The Tarim oases under the Protectorate','都护所监诸国']},
 wusun:{name:['Wusun & Central Asia','乌孙·葱岭以西'],role:['Ili pastures, Ferghana, Kangju','伊犁草原、大宛、康居']},
 monan:{name:['Southern Steppe','漠南'],role:['Pastures south of the Gobi','戈壁以南牧地']},
 mobei:{name:['Northern Steppe','漠北'],role:['The chanyu’s court and the northern peoples','单于庭与北方诸部']}
};

const G=(zhou,theater,anchors)=>({zhou,theater,anchors});
export const REGION_GEO={
 changan:G('sili','guanzhong',[[108.9,34.3],[109.6,34.7],[108.2,34.4]]),
 hongnong:G('sili','guanzhong',[[110.9,34.5],[111.2,33.9]]),
 henan:G('sili','zhongyuan',[[112.5,34.7],[113.5,34.6]]),
 hedong:G('sili','hebei',[[111.0,35.6],[111.7,36.4]]),
 taiyuan:G('bing','hebei',[[112.5,37.9],[111.8,38.7],[113.2,37.3]]),
 zhao:G('ji','hebei',[[114.5,36.6],[115.1,37.6],[115.5,36.4]]),
 yan:G('you','hebei',[[116.4,39.9],[117.7,40.4],[115.3,39.3],[118.6,39.8]]),
 qi:G('qing','shandong',[[118.3,36.8],[119.6,36.5],[120.7,37.3]]),
 dongping:G('yan','shandong',[[116.3,35.9],[116.9,35.3]]),
 huaiyang:G('yan','zhongyuan',[[114.9,33.7],[115.6,33.1]]),
 chu:G('xu','shandong',[[117.2,34.3],[118.4,33.6],[118.9,34.6]]),
 nanyang:G('jing','zhongyuan',[[112.5,33.0],[111.6,32.6],[113.3,32.5]]),
 nanjun:G('jing','jiangnan',[[112.2,30.4],[111.0,30.9],[113.6,31.2],[110.2,31.3]]),
 changsha:G('jing','jiangnan',[[113.0,28.2],[112.0,27.0],[113.7,26.6],[111.3,28.6]]),
 kuaiji:G('yang','jiangnan',[[120.6,31.3],[120.3,29.8],[119.4,28.4],[118.6,30.7],[117.2,31.6]]),
 hanzhong:G('yi','bashu',[[107.0,33.1],[108.7,32.6],[106.2,32.9]]),
 shu:G('yi','bashu',[[104.1,30.7],[103.4,29.7],[105.6,31.5],[106.6,30.0],[104.8,29.2]]),
 tianshui:G('liang','longyou',[[105.3,35.0],[104.2,35.4],[106.0,34.6]]),
 jincheng:G('liang','longyou',[[103.3,36.2],[102.3,36.6]]),
 qiang:G('waifan','longyou',[[100.8,36.2],[99.0,35.1],[101.6,34.6],[97.5,36.6]]),
 beidi:G('liang','guanzhong',[[106.6,36.6],[106.4,37.7],[107.4,36.0]]),
 shuofang:G('shuofang','beibian',[[108.6,40.4],[106.9,40.0],[109.9,39.5],[108.2,38.7]]),
 yunzhong:G('bing','beibian',[[111.6,40.6],[113.1,40.7]]),
 yanmen:G('bing','beibian',[[112.6,39.6],[114.4,39.9]]),
 wuwei:G('liang','hexi',[[102.6,37.9],[103.6,38.8],[101.8,38.3]]),
 zhangye:G('liang','hexi',[[100.5,38.9],[99.6,39.4],[100.8,40.3]]),
 jiuquan:G('liang','hexi',[[98.5,39.7],[97.3,40.2],[99.0,40.6]]),
 dunhuang:G('liang','hexi',[[94.7,40.1],[93.2,40.4],[95.9,40.6],[96.3,39.8]]),
 wulei:G('duhu','xiyu',[[84.6,41.75],[85.7,41.4]]),
 shanshan:G('waifan','xiyu',[[88.6,39.1],[90.0,40.1],[86.6,38.4],[91.5,39.0]]),
 jushi:G('waifan','xiyu',[[89.1,42.9],[88.0,43.6],[90.6,42.6]]),
 yanqi:G('waifan','xiyu',[[86.6,42.1],[87.6,42.3]]),
 qiuci:G('waifan','xiyu',[[83.0,41.7],[81.6,41.4],[83.4,40.9]]),
 yutian:G('waifan','xiyu',[[79.9,37.1],[81.6,36.9],[82.6,37.6]]),
 shache:G('waifan','xiyu',[[77.2,38.4],[77.6,37.4]]),
 shule:G('waifan','xiyu',[[76.0,39.5],[74.9,39.9],[77.2,39.9]]),
 wusun:G('waifan','wusun',[[78.6,42.2],[76.6,42.6],[79.8,42.0],[75.6,42.0]]),
 wusun_lesser:G('waifan','wusun',[[81.3,43.9],[83.6,44.1],[79.4,44.6],[84.8,43.4]]),
 dayuan:G('waifan','wusun',[[71.6,40.8],[72.7,40.6],[70.5,40.3]]),
 kangju:G('waifan','wusun',[[69.5,42.8],[66.8,43.6],[71.6,44.2],[66.4,41.4],[64.0,43.0]]),
 monan:G('waifan','monan',[[108.9,42.0],[112.2,42.4],[105.4,41.7],[115.2,42.6],[102.3,41.6]]),
 mobei:G('waifan','mobei',[[102.5,47.3],[106.6,47.8],[98.6,46.4],[110.6,46.4],[104.0,45.6]]),
 wujie:G('waifan','mobei',[[88.0,47.5],[86.0,48.6],[91.0,46.6],[85.6,46.4]]),
 jiankun:G('waifan','mobei',[[91.5,51.0],[88.8,51.6],[95.0,50.6],[86.5,50.6]])
};
// Land outside the campaign: shown, but not playable.
export const OUTSIDE=[
 {name:['Tibetan Plateau','青藏高原'],pts:[[80,33],[86,32],[92,32.5],[97,31.5],[90,30],[84,29.5],[95,34.5],[88,34.8],[82,35.4]]},
 {name:['Lingnan (beyond the slice)','岭南（未纳入）'],pts:[[110,24.6],[114,24.8],[117.8,25.6],[106.5,25.2],[119.5,26.8]]},
 {name:['Southwest (Yelang, Dian)','西南夷（夜郎、滇）'],pts:[[103.5,26.0],[101.0,25.0],[106.0,27.0],[99.0,27.5]]},
 {name:['Liaodong & Korea (beyond the slice)','辽东与朝鲜（未纳入）'],pts:[[123.0,41.5],[125.5,40.0],[126.5,38.0],[121.0,42.5]]},
 {name:['Eastern steppe (Wuhuan, Xianbei)','东部草原（乌桓、鲜卑）'],pts:[[118.5,43.5],[121.5,45.5],[118.0,47.5],[124.0,47.0]]},
 {name:['Siberian forest','西伯利亚森林'],pts:[[100,53],[108,52.5],[116,52],[80,53],[122,51]]},
 {name:['Kazakh steppe','哈萨克草原'],pts:[[62,48.5],[70,50],[77,49],[82,51.5],[60,46.5]]},
 {name:['Bactria & Yuezhi','大夏与大月氏'],pts:[[67,37],[64,38.5],[70,37],[61,39.5],[60,36]]},
 {name:['Dzungaria','准噶尔'],pts:[[86.5,45.8],[89.5,45.0],[84.0,45.6]]}
];

// Terrain polygons (schematic relief). kind: plateau | mountain | desert | steppe | marsh | hills
export const TERRAIN=[
 {kind:'plateau',name:['Tibetan Plateau','青藏高原'],pts:[[75,36],[80,35.6],[86,35.6],[92,36.6],[97,36.2],[101,33.6],[103,31.2],[101.5,28],[97,27.6],[92,27.8],[88,27.8],[84,28.6],[80,30],[77,32],[75,34.4]]},
 {kind:'steppe',name:['Mongolian plateau','蒙古高原'],pts:[[90,49],[98,50.5],[110,50.5],[118,48.6],[120.5,45],[116,43.2],[110,42.5],[104,42.1],[96,43],[91,45.5]]},
 {kind:'steppe',name:['Kazakh steppe','哈萨克草原'],pts:[[58,46],[64,49.5],[72,50.5],[80,50],[84.5,47.2],[80,45.6],[74,44.7],[68,44.6],[62,45]]},
 {kind:'steppe',name:['Ili pastures','伊犁草原'],pts:[[75,43.2],[79,44.6],[84,44.6],[85,43.6],[81,43.0],[77,42.8]]},
 {kind:'steppe',name:['Ordos','河套'],pts:[[106.5,40.6],[109.5,40.9],[111.2,40.0],[110.4,38.0],[107.5,37.6],[106.2,38.6]]},
 {kind:'desert',name:['Taklamakan','塔克拉玛干'],pts:[[77.5,39.2],[79,40.2],[81.5,40.7],[84.5,40.9],[87.5,40.3],[89,39.6],[88,38.7],[85.5,37.9],[82,37.3],[79.5,37.6],[78,38.4]]},
 {kind:'desert',name:['Gobi','戈壁'],pts:[[96,43],[100,44.3],[104,44.9],[108,44.9],[112,44.3],[114,43.5],[111,42.7],[106,42.3],[101,42.1],[97,42.2]]},
 {kind:'desert',name:['Kumtag & Lop','库姆塔格与罗布泊'],pts:[[89.5,40.6],[92.5,40.5],[94,39.8],[92,39.3],[90,39.8]]},
 {kind:'desert',name:['Badain Jaran & Tengger','巴丹吉林与腾格里'],pts:[[99.5,40.6],[102,41.3],[104.5,40.1],[105.1,38.6],[103.6,38.2],[101,39.7]]},
 {kind:'desert',name:['Mu Us sands','毛乌素沙地'],pts:[[107.6,38.6],[109.5,39.4],[110.3,38.3],[108.6,37.7]]},
 {kind:'desert',name:['Kyzylkum','克孜勒库姆'],pts:[[61,43.6],[64,43.9],[66.5,42],[64,40.8],[61.5,41.5]]},
 {kind:'desert',name:['Gurbantunggut','古尔班通古特'],pts:[[84.6,45.3],[87,46.1],[90,45.6],[89,44.5],[86,44.5]]},
 {kind:'mountain',name:['Tianshan','天山'],pts:[[70,42],[74,42.9],[78,43.3],[82,43.6],[86,43.7],[89,43.5],[93,43.3],[95,43.1],[94,42.5],[90,42.4],[86,42.5],[82,42.3],[78,41.9],[75,41.1],[71,41]]},
 {kind:'mountain',name:['Congling (Pamirs)','葱岭'],pts:[[71,39.4],[74.6,40.1],[75.6,38.6],[75.2,36.6],[72,36.4],[70,37.6]]},
 {kind:'mountain',name:['Kunlun','昆仑山'],pts:[[75.6,36.8],[80,36.3],[86,36.6],[92,37.4],[96,36.6],[92,36.3],[86,35.9],[80,35.8],[76,35.9]]},
 {kind:'mountain',name:['Qilian','祁连山'],pts:[[94,38.9],[96,39.2],[99,38.9],[102,37.9],[103.6,36.9],[102.6,36.7],[99,37.8],[96,38.6]]},
 {kind:'mountain',name:['Qinling','秦岭'],pts:[[104.5,34.2],[107,34.0],[110,33.95],[112,33.6],[111.4,33.2],[109,33.2],[106,33.4],[104.5,33.6]]},
 {kind:'mountain',name:['Daba','大巴山'],pts:[[105.6,32.4],[108,32.2],[110.5,31.8],[110,31.3],[107.5,31.6],[105.5,31.9]]},
 {kind:'mountain',name:['Taihang','太行山'],pts:[[113.2,40.0],[114.4,39.0],[114.1,37.5],[113.7,35.6],[112.7,35.3],[112.9,37.0],[112.5,38.6]]},
 {kind:'mountain',name:['Lüliang','吕梁山'],pts:[[110.6,38.9],[111.7,38.5],[111.6,37.0],[111.0,36.4],[110.6,37.2]]},
 {kind:'mountain',name:['Yin Mountains','阴山'],pts:[[106.5,41.3],[109,41.4],[112,41.3],[114,41.1],[112,40.85],[109,40.95],[106.8,40.85]]},
 {kind:'mountain',name:['Helan','贺兰山'],pts:[[105.6,39.4],[106.3,39.3],[106.1,38.2],[105.7,38.3]]},
 {kind:'mountain',name:['Altai','阿尔泰山'],pts:[[84.6,50],[88,49.3],[92,48.1],[96,46.1],[95.6,45.3],[91,46.6],[87,48.1],[84.4,49.3]]},
 {kind:'mountain',name:['Khangai','杭爱山'],pts:[[96,48.9],[100,48.6],[102.2,47.3],[100,46.7],[97,47.3]]},
 {kind:'mountain',name:['Sayan','萨彦岭'],pts:[[89,52.6],[95,52.4],[100,51.9],[100,51.4],[95,51.7],[89,52.1]]},
 {kind:'mountain',name:['Long mountains','陇山'],pts:[[106.0,36.0],[106.6,35.9],[106.6,34.9],[106.1,35.0]]},
 {kind:'hills',name:['Nanling','南岭'],pts:[[110,25.9],[114,25.6],[117,26.1],[118.5,27.6],[117,27.1],[113,26.5],[110,26.5]]},
 {kind:'hills',name:['Shandong hills','泰沂山地'],pts:[[116.8,36.5],[118.0,36.6],[118.8,36.0],[117.8,35.5],[116.9,35.8]]},
 {kind:'marsh',name:['Yunmeng marshes','云梦泽'],pts:[[111.8,30.0],[113.0,30.5],[114.0,30.0],[113.5,29.2],[112.4,29.0]]}
];
export const LAKES=[
 {name:['Issyk-Kul','热海（伊塞克湖）'],pts:[[76.2,42.5],[77.2,42.75],[78.4,42.6],[78.2,42.3],[77.0,42.2]]},
 {name:['Balkhash','巴尔喀什湖'],pts:[[73.5,46.2],[75,46.6],[77,46.4],[79,46.7],[79.3,46.3],[77,46.0],[75,45.95]]},
 {name:['Lop Nur','盐泽'],pts:[[90.0,40.6],[90.7,40.6],[90.8,40.1],[90.1,40.0]]},
 {name:['Bosten','焉耆近海'],pts:[[86.8,42.1],[87.3,42.1],[87.3,41.85],[86.8,41.85]]},
 {name:['Qinghai Lake','西海（青海湖）'],pts:[[99.7,37.0],[100.4,37.2],[100.8,36.9],[100.3,36.6],[99.8,36.7]]},
 {name:['Aral Sea','咸海'],pts:[[58.6,44.0],[60.5,44.4],[61.3,45.8],[60.2,46.6],[58.6,46.1]]},
 {name:['Dongting','洞庭'],pts:[[112.4,29.4],[113.1,29.5],[113.0,28.9],[112.5,28.9]]},
 {name:['Pengli (Poyang)','彭蠡泽'],pts:[[116.0,29.4],[116.6,29.2],[116.4,28.7],[116.0,28.9]]},
 {name:['Zhenze (Tai Lake)','震泽'],pts:[[119.9,31.4],[120.4,31.5],[120.5,31.0],[120.0,30.95]]},
 {name:['Baikal','北海（贝加尔湖）'],pts:[[103.6,51.7],[104.6,51.6],[106.6,52.6],[108.8,53.6],[109.3,53.3],[107.0,52.2],[105.2,51.4],[103.8,51.4]]}
];
export const RIVERS={
 yellow:{name:['Yellow River','河（黄河）'],major:true,pts:[[96,35],[100,36],[103.6,36.1],[105,37.5],[106.5,39.2],[107,40.6],[109,40.7],[111,40.3],[111.5,39],[110.5,37],[110.4,35],[111.5,34.8],[113.6,34.9],[115,35.8],[116,37],[117.5,38.4]]},
 yangtze:{name:['Yangtze','江（长江）'],major:true,pts:[[91,33.5],[97,33],[99.5,28],[102,26.5],[104.6,28.8],[106.5,29.6],[108.4,30.8],[110.5,31],[112.2,30.3],[113.5,30.4],[114.3,30.6],[116,29.8],[117.6,30.9],[118.8,32],[121,31.7]]},
 wei:{name:['Wei','渭水'],pts:[[104.6,34.8],[106.2,34.4],[107.5,34.3],[108.9,34.4],[110.2,34.6]]},
 jing:{name:['Jing','泾水'],pts:[[106.3,35.6],[107.6,35.0],[108.9,34.5]]},
 luo:{name:['Luo','雒水'],pts:[[110.3,34.1],[111.6,34.4],[112.9,34.7]]},
 fen:{name:['Fen','汾水'],pts:[[111.9,38.9],[112.4,37.8],[111.6,36.3],[110.6,35.6]]},
 han:{name:['Han','沔水（汉水）'],pts:[[106.5,33.1],[108.9,32.7],[110.8,32.6],[112.1,32.0],[112.6,31.0],[114.3,30.6]]},
 huai:{name:['Huai','淮水'],pts:[[113.4,32.4],[115,32.5],[117,32.8],[118.6,33.3],[119.6,33.9]]},
 jialing:{name:['Jialing','西汉水（嘉陵江）'],pts:[[106.4,33.3],[105.9,32.4],[106.1,31.0],[106.6,29.6]]},
 min:{name:['Min','江水（岷江）'],pts:[[103.6,31.9],[103.7,30.9],[103.8,29.8],[104.6,28.8]]},
 xiang:{name:['Xiang','湘水'],pts:[[111.0,25.8],[112.6,26.9],[113.0,28.2],[112.8,29.3]]},
 shule_r:{name:['Shule','籍端水（疏勒河）'],pts:[[97.2,39.7],[95.5,40.4],[93.8,40.5]]},
 ruo:{name:['Ruo (Black River)','弱水'],pts:[[100.2,38.9],[100.6,40.4],[101.1,42.0]]},
 tarim:{name:['Tarim','塔里木河'],major:true,pts:[[76,39.5],[79,40.6],[81,40.9],[84,41.2],[86.5,40.8],[88,40.2],[90.3,40.4]]},
 hotan:{name:['Yutian river','于阗河'],pts:[[79.9,37.1],[80.5,39],[81,40.6]]},
 yarkand:{name:['Yarkand','莎车河'],pts:[[77.2,38.4],[78.5,39.8],[80,40.6]]},
 kongque:{name:['Kongque','孔雀河'],pts:[[86.6,41.9],[88,41.1],[89.8,40.4]]},
 ili:{name:['Ili','伊犁河'],pts:[[82.5,43.6],[81.3,43.9],[78,44],[76.5,44.5],[74.8,45.4]]},
 syr:{name:['Syr Darya','锡尔河'],major:true,pts:[[72.5,40.8],[71.6,40.9],[69.3,41],[68.5,42],[66,44.5],[61.5,46]]},
 amu:{name:['Amu Darya','妫水（阿姆河）'],major:true,pts:[[69,37.2],[66,37.8],[63,39.8],[61,41.8],[59.6,43.6]]},
 chu:{name:['Chu','楚河'],pts:[[76.2,42.4],[74.6,42.9],[72.8,43.9],[70.5,45]]},
 orkhon:{name:['Orkhon','于都斤水（鄂尔浑河）'],pts:[[102.5,47.0],[103.8,48.6],[105.8,50.2],[106.5,50.6]]},
 kherlen:{name:['Kherlen','克鲁伦河'],pts:[[108.5,48.6],[111.5,47.6],[115.0,48.0],[117.4,48.9]]},
 selenga:{name:['Selenga','色楞格河'],pts:[[100.0,49.6],[103.0,49.8],[105.8,50.2],[106.6,51.6]]}
};
// Han frontier line: walls, ramparts and beacon chains (schematic).
export const FRONTIER=[[93.8,40.4],[95.5,40.3],[98.5,40],[100.5,39.4],[102.8,38.4],[104.5,38.2],[106.2,39.0],[107.5,41.0],[110,41.5],[112.5,41.3],[115,41.0],[118,40.5],[120.5,41.2]];
