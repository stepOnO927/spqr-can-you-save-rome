// 49 BCE reconstruction. Points identify settlements or political centres, not borders.
// Hanshu 96A attests many oasis names but not a recoverable fixed list of exactly 36.
// Iranica entries distinguish Kangju influence, Yuezhi chiefdoms and Arsacid clients.
export const SOURCES={
 hanshu:'https://ctext.org/han-shu/xi-yu-zhuan/ens',
 sogdiana:'https://www.iranicaonline.org/articles/sogdiana-iii-history-and-archaeology/',
 bactria:'https://www.iranicaonline.org/articles/bactria/bactria-i-pre-islamic-period/',
 chorasmia:'https://www.iranicaonline.org/articles/chorasmia-i/',
 orodes:'https://www.iranicaonline.org/articles/orodes-ii/',
 persis:'https://www.iranicaonline.org/articles/persis-kings-of/',
 elymais:'https://www.iranicaonline.org/articles/elymais/',
 commagene:'https://www.iranicaonline.org/articles/commagene-a-portion-of-southwestern-asia-minor-modern-turkey/'
};
const P=(id,en,zh,lon,lat,government,confidence,overlord=null,source='hanshu',extra={})=>({id,name:[en,zh],lon,lat,government,confidence,overlord,source:SOURCES[source],...extra});
export const POLITIES=[
 // Local kings retained their own authority under or near the Han Protectorate.
 P('gumo','Gumo (Aksu)','姑墨（阿克苏）',80.3,41.1,'oasis_kingdom','documented','han'),
 P('jingjue','Jingjue (Niya)','精绝（尼雅）',82.8,37.0,'oasis_kingdom','documented','han'),
 P('qiemo','Qiemo','且末',85.6,38.1,'oasis_kingdom','documented','han'),
 P('xiaowan','Xiaowan','小宛',88.0,37.7,'oasis_kingdom','documented','han'),
 P('ruoqiang','Ruoqiang','婼羌',88.7,38.6,'oasis_kingdom','documented','han'),
 P('qiule','Qiule','渠勒',80.2,37.7,'oasis_kingdom','tentative','han'),
 P('wensu','Wensu','温宿',80.2,41.6,'oasis_kingdom','documented','han'),
 P('weixu','Weixu','危须',87.0,42.3,'oasis_kingdom','documented','han'),
 P('yuli','Yuli','尉犁',86.3,41.4,'oasis_kingdom','documented','han'),
 P('puli','Puli','蒲犁',75.2,37.8,'mountain_kingdom','documented','han'),
 P('wucha','Wucha','乌秅',77.3,37.2,'mountain_kingdom','documented','han'),
 P('nandou','Nandou','难兜',74.5,36.8,'mountain_kingdom','documented','han'),
 P('jushi_rear','Rear Jushi','车师后国',88.6,44.4,'oasis_kingdom','documented','han'),
 P('pishan','Pishan','皮山',78.3,37.6,'oasis_kingdom','documented','han'),
 P('xiye','Xiye','西夜',76.8,37.6,'oasis_kingdom','documented','han'),
 // Central Asian powers and local communities. Chiefdom sites are broad estimates.
 P('yuezhi','Great Yuezhi Confederation','大月氏联盟',66.9,36.7,'confederation','documented',null,'bactria'),
 P('xiumi','Xiumi chiefdom','休密翕侯',69.0,37.8,'yuezhi_chiefdom','strong','yuezhi','bactria'),
 P('shuangmi','Shuangmi chiefdom','双靡翕侯',67.8,37.2,'yuezhi_chiefdom','tentative','yuezhi','bactria'),
 P('guishuang','Guishuang chiefdom','贵霜翕侯',67.2,36.2,'yuezhi_chiefdom','tentative','yuezhi','bactria'),
 P('xidun','Xidun chiefdom','肸顿翕侯',65.8,36.1,'yuezhi_chiefdom','tentative','yuezhi','bactria'),
 P('dumi','Dumi chiefdom','都密翕侯',65.0,37.0,'yuezhi_chiefdom','tentative','yuezhi','bactria'),
 P('sogd_samarkand','Samarkand community','撒马尔罕城邦',66.96,39.65,'urban_community','strong','kangju','sogdiana'),
 P('sogd_bukhara','Bukhara community','布哈拉城邦',64.42,39.77,'urban_community','tentative','kangju','sogdiana'),
 P('chorasmia','Chorasmia','花剌子模',59.6,42.4,'regional_kingdom','strong','kangju','chorasmia'),
 P('margiana','Margiana (Merv)','木鹿地区',62.2,37.66,'frontier_principality','tentative','parthia','bactria'),
 P('sakastan','Sakastan Saka','塞迦斯坦塞种',61.5,31.0,'saka_chiefdom','strong','parthia','orodes'),
 P('gandhara_saka','Gandhara Saka','犍陀罗塞种',71.5,34.0,'saka_kingdom','tentative',null,'bactria'),
 // Arsacid core and locally governed dependents, not one flat sovereign state.
 P('parthia','Arsacid Parthia','安息帝国',53.1,35.7,'arsacid_monarchy','documented',null,'orodes',{ruler:'orodes-ii'}),
 P('atropatene','Media Atropatene','米底阿特罗帕特尼',46.3,37.5,'client_kingdom','strong','parthia','orodes'),
 P('elymais','Elymais','埃利迈斯',48.7,32.1,'regional_kingdom','tentative','parthia','elymais'),
 P('persis','Persis','波西斯',52.5,29.6,'client_dynasty','strong','parthia','persis'),
 P('characene','Characene / Mesene','卡拉塞尼',47.9,30.4,'trade_kingdom','strong','parthia','orodes'),
 P('adiabene','Adiabene','阿迪亚贝尼',43.2,36.2,'client_kingdom','strong','parthia','orodes'),
 P('osrhoene','Osrhoene','奥斯若恩',38.8,37.1,'frontier_kingdom','tentative','parthia','orodes'),
 P('gordyene','Gordyene','科尔杜埃内',42.0,37.4,'mountain_principality','tentative','parthia','orodes'),
 P('armenia','Kingdom of Armenia','亚美尼亚王国',44.5,40.2,'independent_kingdom','documented',null,'orodes',{ruler:'artavasdes-ii'}),
 P('caucasian_iberia','Caucasian Iberia','高加索伊比利亚',44.8,41.7,'independent_kingdom','strong',null,'orodes'),
 P('caucasian_albania','Caucasian Albania','高加索阿尔巴尼亚',47.5,40.7,'independent_kingdom','strong',null,'orodes'),
 P('commagene','Commagene','科马吉尼',38.3,37.9,'independent_kingdom','documented',null,'commagene',{ruler:'antiochus-i-commagene'})
];
const palette=['#9b7045','#826746','#8b8754','#6e7d68','#a08559','#846c63','#6a7c83','#a27d5f'];
export const EURASIAN_FACTIONS=Object.fromEntries(POLITIES.map((p,i)=>[p.id,{id:p.id,name:p.name,color:palette[i%palette.length],culture:p.government.includes('saka')?'saka':p.government.includes('yuezhi')?'yuezhi':p.id==='parthia'?'parthian':p.id==='armenia'||p.id==='commagene'?'western':p.id.startsWith('sogd')?'sogdian':'oasis',ruler:p.ruler||null,state:p.government,historicalConfidence:p.confidence,politicalStatus:p.government,politicalCenter:p.name,source:p.source,minor:p.government==='oasis_kingdom'||p.government==='local_community'}]));
const terrain=p=>p.government==='mountain_kingdom'||p.id==='gordyene'||p.id==='armenia'||p.id.startsWith('caucasian')?'mountain':p.id==='sakastan'?'desert':p.id==='yuezhi'||p.government==='yuezhi_chiefdom'?'hills':p.id==='chorasmia'||p.id.startsWith('sogd')?'oasis':p.id==='parthia'?'steppe':'oasis';
export const EURASIAN_REGIONS=POLITIES.map((p,i)=>({id:p.id,name:p.name,lon:p.lon,lat:p.lat,terrain:terrain(p),kind:p.government,owner:p.id,pop:p.government==='arsacid_monarchy'?30:p.government==='confederation'?16:p.government==='client_kingdom'?10:4,grain:p.government==='arsacid_monarchy'?7:2,tax:p.government==='arsacid_monarchy'?8:2,supply:p.government==='arsacid_monarchy'?7:2,fort:p.government.includes('mountain')?2:1,loyalty:68,granary:0,irrigation:0,seat:p.name,confidence:p.confidence,source:p.source,approximatePoint:true,tradeGoods:p.id==='dayuan'?['horses']:p.id==='yutian'?['jade']:p.id==='parthia'?['wool','silver']:p.id==='characene'?['spices']:['grain']}));
export const ADMINISTRATIVE_REGIONS=[
 {id:'hyrcania',name:['Hyrcania','希尔卡尼亚'],lon:54.4,lat:36.7,owner:'parthia',terrain:'forest',kind:'arsacid_region',seat:['Hyrcania','希尔卡尼亚']},
 {id:'ecbatana',name:['Ecbatana','埃克巴坦那'],lon:47.7,lat:34.8,owner:'parthia',terrain:'mountain',kind:'arsacid_region',seat:['Ecbatana','埃克巴坦那']},
 {id:'ctesiphon',name:['Ctesiphon','泰西封'],lon:44.58,lat:33.1,owner:'parthia',terrain:'river',kind:'arsacid_region',seat:['Ctesiphon','泰西封']},
 {id:'aria',name:['Aria','阿里亚'],lon:62.2,lat:34.4,owner:'parthia',terrain:'oasis',kind:'frontier_region',seat:['Alexandria in Aria','阿里亚地区']},
 {id:'bactra',name:['Bactra / Balkh','巴克特拉'],lon:66.9,lat:36.76,owner:'yuezhi',terrain:'oasis',kind:'yuezhi_region',seat:['Bactra','巴克特拉']},
 {id:'hindu_kush',name:['Hindu Kush crossings','兴都库什山道'],lon:68.2,lat:35.0,owner:null,terrain:'mountain',kind:'pass',seat:['Hindu Kush','兴都库什']},
 {id:'kabul',name:['Kabul basin','喀布尔盆地'],lon:69.2,lat:34.5,owner:'gandhara_saka',terrain:'hills',kind:'frontier_region',seat:['Kabul','喀布尔']},
 {id:'indus',name:['Indus crossing','印度河渡口'],lon:69.7,lat:29.8,owner:null,terrain:'river',kind:'crossing',seat:['Indus','印度河']},
 {id:'pamir',name:['Pamir crossings','葱岭山道'],lon:73.0,lat:38.2,owner:null,terrain:'mountain',kind:'pass',seat:['Pamir','帕米尔']},
 {id:'hatraregion',name:['Hatra region','哈特拉地区'],lon:42.7,lat:35.6,owner:'parthia',terrain:'desert',kind:'arsacid_region',seat:['Hatra region','哈特拉地区']},
 {id:'mediterranean_gate',name:['Eastern Mediterranean exchange','东地中海交易口'],lon:35.5,lat:36.2,owner:null,terrain:'urban',kind:'external_market',seat:['Eastern Mediterranean','东地中海']}
].map(r=>({pop:4,grain:2,tax:2,supply:2,fort:1,loyalty:70,granary:0,irrigation:0,approximatePoint:true,...r}));
const E=(a,b,kind='oasis',months=2,supply=1)=>({a,b,kind,months,supply,name:null});
export const EURASIAN_ROUTES=[
 E('qiuci','gumo'),E('gumo','wensu','oasis',1),E('wensu','shule','pass',2,0),
 E('shanshan','xiaowan','desert',2,0),E('xiaowan','qiemo','desert',2,0),E('qiemo','jingjue','desert',2,0),E('jingjue','yutian','oasis',2),
 E('shanshan','ruoqiang','desert',2,0),E('ruoqiang','qiemo','desert',1,0),E('yutian','qiule'),E('qiule','pishan'),E('pishan','xiye'),E('xiye','shache'),
 E('jushi','weixu'),E('weixu','yuli'),E('yuli','yanqi'),E('jushi','jushi_rear','pass',2,0),
 E('shache','wucha','pass',2,0),E('wucha','puli','pass',2,0),E('puli','nandou','pass',2,0),E('nandou','pamir','pass',2,0),
 E('shule','pamir','pass',2,0),E('pamir','bactra','pass',3,0),E('dayuan','sogd_samarkand','pass',2,1),
 E('kangju','sogd_samarkand','steppe',2,1),E('sogd_samarkand','sogd_bukhara','oasis',2),E('sogd_bukhara','chorasmia','river',3,1),
 E('sogd_bukhara','margiana','desert',3,0),E('bactra','yuezhi','oasis',1),E('bactra','guishuang','oasis',1),
 E('yuezhi','xiumi','oasis',1),E('yuezhi','shuangmi','oasis',1),E('yuezhi','xidun','oasis',1),E('yuezhi','dumi','oasis',1),
 E('bactra','margiana','oasis',3),E('margiana','aria','desert',2,0),E('aria','parthia','oasis',3),
 E('parthia','hyrcania','oasis',2),E('parthia','ecbatana','pass',3,1),E('ecbatana','ctesiphon','pass',2,1),
 E('ctesiphon','hatraregion','desert',2,0),E('hatraregion','osrhoene','oasis',2),E('osrhoene','commagene','pass',2,1),
 E('commagene','mediterranean_gate','road',2,2),E('ctesiphon','adiabene','river',2,1),E('adiabene','gordyene','pass',2,0),
 E('gordyene','armenia','pass',2,0),E('armenia','atropatene','pass',2,0),E('armenia','caucasian_iberia','pass',2,0),
 E('caucasian_iberia','caucasian_albania','pass',2,0),E('ctesiphon','characene','river',2,2),E('characene','elymais','river',2,1),
 E('elymais','persis','pass',2,1),E('persis','sakastan','desert',4,0),E('sakastan','aria','desert',3,0),
 E('bactra','hindu_kush','pass',3,0),E('hindu_kush','kabul','pass',2,0),E('kabul','gandhara_saka','pass',2,0),
 E('gandhara_saka','indus','river',2,1),E('indus','sakastan','desert',4,0)
];
export const DEPENDENCIES=POLITIES.filter(p=>p.overlord).map(p=>({subject:p.id,overlord:p.overlord,kind:p.overlord==='han'?'protectorate':p.overlord==='yuezhi'?'confederation_member':p.overlord==='kangju'?'political_influence':'client_or_influence',confidence:p.confidence,autonomy:70,tribute:0}));
export const EURASIAN_RULERS=[
 {id:'orodes-ii',name:['Orodes II','奥罗德斯二世'],faction:'parthia',record:'historical',source:SOURCES.orodes},
 {id:'artavasdes-ii',name:['Artavasdes II','阿尔塔瓦兹德二世'],faction:'armenia',record:'historical',source:SOURCES.orodes},
 {id:'antiochus-i-commagene',name:['Antiochus I Theos','安条克一世'],faction:'commagene',record:'historical',source:SOURCES.commagene}
];
