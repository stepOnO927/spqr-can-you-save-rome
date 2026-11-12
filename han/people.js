// People of the Mandate of Heaven DLC.
//
// record: 'historical' — documented person; dates from the Hanshu/Shiji as
//         summarised in the sources list (approximate births are flagged).
//         'alternate'  — an undocumented descendant or ancestor added for
//         alternate-history play; never presented as attested history.
//         'fictional'  — an original character with no genealogical link to
//         the Liu clan unless stated.
//
// `father` is the agnatic (biological, recorded-at-birth) father. Liu lineage
// is computed only from this chain; see dynasty.js.
const P=(id,en,zh,surname,sex,birth,death,father,mother,extra={})=>({id,name:[en,zh],surname,birthSurname:surname,sex,birth,death,father,mother,record:'historical',...extra});

export const PEOPLE=[
 // ——— The Liu clan: documented agnatic line ———
 P('liu-taigong','Liu Taigong','刘太公','Liu','m',-280,-197,null,null,{birthApprox:true,title:['Grand Supreme Emperor (posthumous father of Gaozu)','太上皇'],root:true}),
 P('liu-bang','Liu Bang (Emperor Gaozu)','刘邦（汉高祖）','Liu','m',-256,-195,'liu-taigong',null,{birthApprox:true,emperor:1,portrait:'han-liu-bang'}),
 P('liu-jiao','Liu Jiao, Prince Yuan of Chu','楚元王刘交','Liu','m',-245,-179,'liu-taigong',null,{birthApprox:true}),
 P('liu-ying','Liu Ying (Emperor Hui)','刘盈（汉惠帝）','Liu','m',-210,-188,'liu-bang',null,{emperor:2,portrait:'han-liu-ying'}),
 P('liu-heng','Liu Heng (Emperor Wen)','刘恒（汉文帝）','Liu','m',-203,-157,'liu-bang',null,{emperor:3,portrait:'han-liu-heng'}),
 P('liu-qi','Liu Qi (Emperor Jing)','刘启（汉景帝）','Liu','m',-188,-141,'liu-heng',null,{emperor:4,portrait:'han-liu-qi'}),
 P('liu-che','Liu Che (Emperor Wu)','刘彻（汉武帝）','Liu','m',-156,-87,'liu-qi',null,{emperor:5,portrait:'han-liu-che'}),
 P('liu-ju','Liu Ju, Crown Prince Li','戾太子刘据','Liu','m',-128,-91,'liu-che',null,{}),
 P('liu-jin','Liu Jin','史皇孙刘进','Liu','m',-113,-91,'liu-ju',null,{birthApprox:true}),
 P('liu-fuling','Liu Fuling (Emperor Zhao)','刘弗陵（汉昭帝）','Liu','m',-94,-74,'liu-che',null,{emperor:6,portrait:'han-liu-fuling'}),
 P('liu-bo','Liu Bo, Prince Ai of Changyi','昌邑哀王刘髆','Liu','m',-104,-86,'liu-che',null,{birthApprox:true}),
 P('liu-he','Liu He, Marquis of Haihun (deposed 74 BCE)','海昏侯刘贺（74年被废）','Liu','m',-92,-59,'liu-bo',null,{deposedEmperor:true}),
 P('liu-xun','Liu Xun (Emperor Xuan)','刘询（汉宣帝）','Liu','m',-91,-48,'liu-jin',null,{emperor:7,portrait:'han-liu-xun',deathNote:['Died 10 January 48 BCE','公元前48年1月10日崩']}),
 // Chu line (descendants of Liu Jiao) — clan members with distant claims
 P('liu-fu','Liu Fu, Marquis of Xiu','休侯刘富','Liu','m',-215,-150,'liu-jiao',null,{birthApprox:true}),
 P('liu-piqiang','Liu Piqiang','刘辟强','Liu','m',-164,-80,'liu-fu',null,{birthApprox:true}),
 P('liu-de','Liu De, Director of the Imperial Clan','宗正刘德','Liu','m',-122,-56,'liu-piqiang',null,{birthApprox:true}),
 // ——— Living Liu at the start ———
 P('liu-shi','Liu Shi (Emperor Yuan)','刘奭（汉元帝）','Liu','m',-75,null,'liu-xun','xu-pingjun',{faction:'han',role:'emperor',portrait:'han-liu-shi',ambition:30,competence:45,loyalty:100,health:70,traits:['classicist','indecisive']}),
 P('liu-ao','Liu Ao (later Emperor Cheng)','刘骜（后为汉成帝）','Liu','m',-51,null,'liu-shi','wang-zhengjun',{faction:'han',role:'prince',portrait:'han-liu-ao',ambition:10,competence:30,loyalty:90}),
 P('liu-qin','Liu Qin, Prince of Huaiyang','淮阳王刘钦','Liu','m',-66,null,'liu-xun',null,{birthApprox:true,faction:'han',role:'prince',fief:'huaiyang',ambition:55,competence:62,loyalty:60,note:['Emperor Xuan reportedly considered him as heir.','宣帝曾欲以其为嗣。']}),
 P('liu-xiao','Liu Xiao, Prince of Chu','楚王刘嚣','Liu','m',-63,null,'liu-xun',null,{birthApprox:true,faction:'han',role:'prince',fief:'chu',ambition:30,competence:45,loyalty:70}),
 P('liu-yu','Liu Yu, Prince of Dongping','东平王刘宇','Liu','m',-62,null,'liu-xun',null,{birthApprox:true,faction:'han',role:'prince',fief:'dongping',ambition:45,competence:38,loyalty:55}),
 P('liu-jing','Liu Jing, imperial prince','宗室王刘竟','Liu','m',-58,null,'liu-xun',null,{birthApprox:true,faction:'han',role:'prince',ambition:20,competence:35,loyalty:75}),
 P('liu-xiang','Liu Gengsheng (Liu Xiang), clan scholar','刘更生（刘向）','Liu','m',-77,null,'liu-de',null,{faction:'han',role:'official',office:'zongzheng',courtFaction:'ru',ambition:35,competence:80,loyalty:85,corruption:0,note:['Descends from Liu Jiao, not from Gaozu: a clan member with a remote claim.','出自楚元王刘交一支，非高祖后裔，继承顺位极远。']}),
 // ——— Consorts and court ———
 P('xu-pingjun','Xu Pingjun (Empress Gong’ai)','许平君（恭哀皇后）','Xu','f',-89,-71,null,null,{birthApprox:true}),
 P('wang-zhengjun','Wang Zhengjun','王政君','Wang','f',-71,null,null,null,{faction:'han',role:'consort',courtFaction:'waiqi',ambition:40,competence:55,loyalty:85,spouse:['liu-shi'],note:['Made empress in 48 BCE.','公元前48年立为皇后。']}),
 P('empress-dowager-wang','Empress Dowager Wang (Empress of Xuan)','王太后（宣帝王皇后）','Wang','f',-85,null,null,null,{birthApprox:true,faction:'han',role:'dowager',courtFaction:'waiqi',ambition:20,competence:50,loyalty:90,spouse:['liu-xun']}),
 P('shi-gao','Shi Gao','史高','Shi','m',-90,null,null,null,{birthApprox:true,faction:'han',role:'official',office:'dasima',portrait:'han-shi-gao',courtFaction:'waiqi',ambition:62,competence:50,loyalty:65,corruption:35,note:['Relative of Emperor Xuan’s grandmother; named regent by Xuan.','宣帝祖母史良娣家族，受遗诏辅政。']}),
 P('xiao-wangzhi','Xiao Wangzhi','萧望之','Xiao','m',-114,null,null,null,{birthApprox:true,faction:'han',role:'official',office:'qianjiangjun',portrait:'han-xiao-wangzhi',courtFaction:'ru',ambition:45,competence:82,loyalty:85,corruption:5,note:['Liu Shi’s tutor; co-regent at the accession.','元帝师傅，受遗诏辅政。']}),
 P('zhou-kan','Zhou Kan','周堪','Zhou','m',-95,null,null,null,{birthApprox:true,faction:'han',role:'official',courtFaction:'ru',ambition:30,competence:70,loyalty:85,corruption:5}),
 P('hong-gong','Hong Gong','弘恭','Hong','m',-100,null,null,null,{birthApprox:true,faction:'han',role:'official',office:'zhongshu',portrait:'han-hong-gong',courtFaction:'huanguan',eunuch:true,ambition:60,competence:60,loyalty:60,corruption:40}),
 P('shi-xian','Shi Xian','石显','Shi','m',-90,null,null,null,{birthApprox:true,faction:'han',role:'official',courtFaction:'huanguan',eunuch:true,ambition:80,competence:72,loyalty:55,corruption:55,note:['Eunuch of the Palace Secretariat (中书仆射).','中书仆射，宦者。']}),
 P('yu-dingguo','Yu Dingguo','于定国','Yu','m',-105,null,null,null,{birthApprox:true,faction:'han',role:'official',office:'chengxiang',portrait:'han-yu-dingguo',courtFaction:'ru',ambition:25,competence:70,loyalty:85,corruption:10,note:['Chancellor 51–41 BCE; earlier Commandant of Justice.','公元前51–前41年任丞相，曾任廷尉。']}),
 P('chen-wannian','Chen Wannian','陈万年','Chen','m',-105,null,null,null,{birthApprox:true,faction:'han',role:'official',office:'yushi',portrait:'han-chen-wannian',courtFaction:'haoqiang',ambition:40,competence:50,loyalty:65,corruption:45}),
 P('feng-fengshi','Feng Fengshi','冯奉世','Feng','m',-100,null,null,null,{birthApprox:true,faction:'han',role:'general',courtFaction:'frontier',ambition:40,competence:75,loyalty:80,corruption:10,military:72}),
 P('gan-yanshou','Gan Yanshou','甘延寿','Gan','m',-80,null,null,null,{birthApprox:true,faction:'han',role:'general',courtFaction:'frontier',ambition:45,competence:65,loyalty:80,corruption:15,military:70}),
 P('chen-tang','Chen Tang','陈汤','Chen','m',-80,null,null,null,{birthApprox:true,faction:'han',role:'official',courtFaction:'frontier',ambition:85,competence:78,loyalty:60,corruption:40,military:76,note:['A junior official at the start; later famed for the Zhizhi campaign of 36 BCE.','开局时尚为小吏；后以公元前36年郅支之役闻名。']}),
 P('feng-liao','Feng Liao','冯嫽','Feng','f',-95,null,null,null,{birthApprox:true,faction:'han',role:'envoy',courtFaction:'frontier',ambition:30,competence:85,loyalty:90,corruption:0,diplomacy:88,note:['Han envoy to the Wusun; announced the Greater and Lesser Kunmi in 53 BCE.','汉使，公元前53年宣布大小昆弥之立。']}),
 // ——— Steppe and Western Regions rulers ———
 P('huhanye','Huhanye Chanyu (Jihoushan)','呼韩邪单于（稽侯珊）','Luandi','m',-90,null,null,null,{birthApprox:true,faction:'huhanye',role:'ruler',portrait:'han-huhanye',ambition:50,competence:70,loyalty:100,military:65,note:['Submitted to Han in 51 BCE and attended court.','公元前51年款塞入朝。']}),
 P('zhizhi','Zhizhi Chanyu (Hutusi)','郅支单于（呼屠吾斯）','Luandi','m',-95,null,null,null,{birthApprox:true,faction:'zhizhi',role:'ruler',portrait:'han-zhizhi',ambition:90,competence:72,loyalty:100,military:78}),
 P('xingmi','Xingmi, Greater Kunmi','大昆弥星靡','Wusun','m',-70,null,null,null,{birthApprox:true,faction:'wusun',role:'ruler',ambition:30,competence:40,loyalty:100,military:40,note:['Grandson of Princess Jieyou; succeeded his father Yuanguimi.','解忧公主之孙，继父元贵靡为大昆弥。']}),
 P('wujiutu','Wujiutu, Lesser Kunmi','小昆弥乌就屠','Wusun','m',-90,null,null,null,{birthApprox:true,faction:'wusun_lesser',role:'ruler',ambition:60,competence:60,loyalty:100,military:62,note:['Of Xiongnu maternal descent; recognised as Lesser Kunmi in 53 BCE.','母为匈奴人，公元前53年立为小昆弥。']}),
 // Rulers whose personal names for 48 BCE are not securely recorded.
 ...[['kangju','King of Kangju','康居王'],['dayuan','King of Dayuan','大宛王'],['shanshan','King of Shanshan','鄯善王'],['jushi','King of Jushi','车师王'],['yanqi','King of Yanqi','焉耆王'],['qiuci','King of Qiuci','龟兹王'],['yutian','King of Yutian','于阗王'],['shache','King of Shache','莎车王'],['shule','King of Shule','疏勒王']].map(([f,en,zh])=>P(`${f}-king`,en,zh,null,'m',-85,null,null,null,{birthApprox:true,faction:f,role:'ruler',titleOnly:true,ambition:40,competence:50,loyalty:100,military:40,note:['Personal name for this year is not recorded; shown by title.','此年国王名讳失载，以王号称之。']})),
 // ——— Alternate-history Liu (undocumented, flagged) ———
 P('liu-yan-alt','Liu Yan (alternate)','刘延（架空）','Liu','m',-112,-62,'liu-piqiang',null,{record:'alternate',note:['Undocumented younger son in the Chu line, added for alternate history.','楚元王一系中虚构的庶子，仅用于架空历史。']}),
 P('fictional-liu-ji','Liu Ji (alternate cadet prince)','刘寂（架空宗室）','Liu','m',-78,null,'liu-yan-alt',null,{record:'alternate',faction:'han',role:'official',courtFaction:'ru',portrait:'han-fictional-liu-ji',ambition:65,competence:70,loyalty:60,corruption:10,note:['Alternate-history clan member of the Chu line; not a documented person.','架空的楚元王一系宗室，并非史载人物。']}),
 P('fictional-liu-shang','Liu Shang (alternate son of the Marquis of Haihun)','刘殇（架空·海昏侯之子）','Liu','m',-65,null,'liu-he',null,{record:'alternate',faction:'han',role:'prince',portrait:'han-fictional-liu-shang',ambition:55,competence:40,loyalty:50,note:['Undocumented son of the deposed Liu He, added for alternate history.','虚构的废帝刘贺之子，仅用于架空历史。']}),
 // ——— Fictional non-Liu characters ———
 P('fictional-pang-chong','Pang Chong','庞崇','Pang','m',-98,null,null,null,{record:'fictional',faction:'han',role:'official',courtFaction:'haoqiang',portrait:'han-fictional-pang-chong',ambition:92,competence:76,loyalty:30,corruption:60,military:55}),
 P('fictional-zhao-lie','Zhao Lie','赵烈','Zhao','m',-88,null,null,null,{record:'fictional',faction:'han',role:'general',office:'hexi',courtFaction:'frontier',portrait:'han-fictional-zhao-lie',ambition:50,competence:68,loyalty:75,corruption:20,military:74}),
 P('fictional-su-heng','Su Heng','苏蘅','Su','f',-72,null,null,null,{record:'fictional',faction:'han',role:'consort',courtFaction:'waiqi',portrait:'han-fictional-su-heng',ambition:70,competence:62,loyalty:55,corruption:25,spouse:['liu-shi']})
];

// Later history, kept OUT of the simulation. Shown in the record panel only,
// so documented facts stay separate from what happens in a campaign.
export const LATER_HISTORY=[
 {id:'liu-ao',name:['Liu Ao reigns as Emperor Cheng','刘骜即位为汉成帝'],year:-33,portrait:'han-liu-ao'},
 {id:'liu-xin',name:['Liu Xin (Emperor Ai), b. 25 BCE, reigns 7–1 BCE','刘欣（汉哀帝），生于公元前25年，前7–前1年在位'],year:-7,portrait:'han-liu-xin'},
 {id:'liu-kan',name:['Liu Kan (Emperor Ping), b. 9 BCE, reigns 1 BCE–6 CE','刘衎（汉平帝），生于公元前9年，前1–6年在位'],year:-1,portrait:'han-liu-kan'},
 {id:'wang-mang',name:['Wang Mang, b. 45 BCE, proclaims the Xin dynasty in 9 CE — a non-Liu usurper, not a Han emperor','王莽，生于公元前45年，公元9年建立新朝——非刘氏篡位者，不是汉朝皇帝'],year:9},
 {id:'zhizhi-36',name:['Han forces under Gan Yanshou and Chen Tang defeat Zhizhi in 36 BCE','公元前36年甘延寿、陈汤击灭郅支'],year:-36},
 {id:'liu-xiu',name:['Liu Xiu restores Han rule in 25 CE (Eastern Han)','公元25年刘秀复兴汉室（东汉）'],year:25}
];

export const PERSON=Object.fromEntries(PEOPLE.map(p=>[p.id,p]));

// Period-appropriate procedural names. Liu is deliberately excluded from the
// common-surname pool: new Liu persons are only ever born to a Liu father.
export const SURNAMES=[['Wang','王'],['Zhang','张'],['Li','李'],['Zhao','赵'],['Chen','陈'],['Yang','杨'],['Zhou','周'],['Xu','许'],['Sun','孙'],['Ma','马'],['Zhu','朱'],['Hu','胡'],['Guo','郭'],['He','何'],['Gao','高'],['Luo','罗'],['Zheng','郑'],['Han','韩'],['Feng','冯'],['Deng','邓'],['Cao','曹'],['Peng','彭'],['Dong','董'],['Yuan','袁'],['Du','杜'],['Wei','魏'],['Su','苏'],['Kong','孔'],['Gongsun','公孙'],['Sima','司马']];
export const GIVEN=[['An','安'],['Chang','昌'],['De','德'],['Gong','恭'],['Guang','广'],['Hong','弘'],['Ji','吉'],['Jun','君'],['Kuan','宽'],['Ling','陵'],['Mao','茂'],['Ping','平'],['Qian','谦'],['Rong','荣'],['Sheng','胜'],['Shou','寿'],['Tang','汤'],['Wen','温'],['Xian','贤'],['Xin','信'],['Yan','延'],['Yi','义'],['Yong','永'],['Zhong','忠'],['Zun','遵'],['Bao','褒'],['Fang','方'],['Gu','固'],['Jing','敬'],['Qing','卿']];
export const PROFESSIONS=[['official','朝官'],['scholar','经学士'],['general','将领'],['governor','郡守'],['frontier','边将'],['envoy','使者'],['merchant','商贾'],['engineer','工匠'],['notable','乡里豪族'],['relative','外戚']];
