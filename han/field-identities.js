import {FACTIONS} from './data.js?v=han-1';
import {recordBirth} from './dynasty.js?v=han-1';

// Original game names. These are cultural reconstructions, never documented
// people or claims that a particular historical army had this commander.
const POOLS={
 han:{culture:['Han Chinese','汉'],names:[['Zhao He','赵和'],['Xu Jian','许俭'],['Cai Ming','蔡明'],['Wang Huan','王桓'],['Li Cheng','李成'],['Zhang Yan','张延']]},
 xiongnu:{culture:['Xiongnu (game reconstruction)','匈奴（游戏复原）'],names:[['Tule','图勒'],['Yuhe','于和'],['Mudu','穆都'],['Lushan','卢珊']]},
 wusun:{culture:['Wusun (game reconstruction)','乌孙（游戏复原）'],names:[['Natu','纳图'],['Quli','屈离'],['Mida','弥达'],['Yarun','雅伦']]},
 kangju:{culture:['Kangju (game reconstruction)','康居（游戏复原）'],names:[['Aruvan','阿鲁万'],['Kudara','库达拉'],['Vares','瓦雷斯'],['Mirak','米拉克']]},
 yuezhi:{culture:['Yuezhi (game reconstruction)','月氏（游戏复原）'],names:[['Vima','维玛'],['Tara','塔拉'],['Kushan','库珊'],['Arvata','阿尔瓦塔']]},
 sogdian:{culture:['Sogdian (game reconstruction)','粟特（游戏复原）'],names:[['Nanak','纳纳克'],['Vardun','瓦尔敦'],['Mirvan','米尔万'],['Arsang','阿尔桑']]},
 bactrian:{culture:['Bactrian (game reconstruction)','巴克特里亚（游戏复原）'],names:[['Oromis','奥罗米斯'],['Vardak','瓦尔达克'],['Mitraon','米特劳恩'],['Tirak','蒂拉克']]},
 saka:{culture:['Saka (game reconstruction)','塞种（游戏复原）'],names:[['Mauvan','毛万'],['Sparga','斯帕尔加'],['Arsaka','阿尔萨卡'],['Tirama','蒂拉玛']]},
 parthian:{culture:['Parthian (game reconstruction)','帕提亚（游戏复原）'],names:[['Vardanes','瓦尔达内斯'],['Artaban','阿尔塔班'],['Phraates','弗拉特斯'],['Mithradat','米特里达特']]},
 western:{culture:['Western Asian (game reconstruction)','西亚（游戏复原）'],names:[['Arsham','阿尔沙姆'],['Vardan','瓦尔丹'],['Tigran','提格兰'],['Artanes','阿尔塔涅斯']]},
 oasis:{culture:['Tarim oasis (game reconstruction)','塔里木绿洲（游戏复原）'],names:[['Tura','图拉'],['Dama','达玛'],['Suli','苏利'],['Mina','米纳'],['Kava','卡瓦']]},
 qiang:{culture:['Qiang (game reconstruction)','羌（游戏复原）'],names:[['Daru','达如'],['Mile','米勒'],['Qima','奇玛'],['Talu','塔鲁']]},
 steppe:{culture:['Steppe community (game reconstruction)','草原社群（游戏复原）'],names:[['Arta','阿尔塔'],['Turan','图兰'],['Madu','马都'],['Kara','卡拉']]}
};

export function fieldCulture(faction){
 if(faction==='kangju'||faction==='chorasmia')return 'kangju';
 if(faction==='dayuan')return 'bactrian';
 if(faction==='yuezhi'||['xiumi','shuangmi','guishuang','xidun','dumi'].includes(faction))return 'yuezhi';
 if(faction==='margiana')return 'bactrian';
 if(faction==='parthia'||['atropatene','elymais','persis','characene','adiabene','osrhoene','gordyene'].includes(faction))return 'parthian';
 if(faction==='sogd_samarkand'||faction==='sogd_bukhara')return 'sogdian';
 if(faction==='wusun_lesser')return 'wusun';
 return POOLS[FACTIONS[faction]?.culture]?FACTIONS[faction].culture:'oasis';
}

export function assignFieldCommander(s,army){
 if(!army||army.men<=0)return null;
 if(army.commander&&s.persons[army.commander]?.alive)return army.commander;
 const culture=fieldCulture(army.owner),pool=POOLS[culture],used=new Set(Object.values(s.persons).filter(p=>p.alive).map(p=>p.name?.[0]));
 s.nextFieldPerson=Number.isSafeInteger(s.nextFieldPerson)&&s.nextFieldPerson>0?s.nextFieldPerson:1;
 let id;do{id=`field:${s.nextFieldPerson++}`}while(s.persons[id]);
 const start=(s.nextFieldPerson-1)%pool.names.length;
 let name=null;for(let i=0;i<pool.names.length;i++){const choice=pool.names[(start+i)%pool.names.length];if(!used.has(choice[0])){name=choice;break}}
 if(!name){const choice=pool.names[start];name=[`${choice[0]} (${s.nextFieldPerson-1})`,`${choice[1]}（${s.nextFieldPerson-1}）`]}
 const birth=s.year-35,person={id,name:[...name],record:'fictional',culture:[...pool.culture],faction:army.owner,role:'general',profession:'general',title:['Field commander','野战指挥官'],homeland:army.region,location:army.region,sex:'m',birth,death:null,alive:true,ambition:35,competence:55,loyalty:65,military:50,spouse:[],history:[{year:s.year,month:s.month,kind:'appointed',army:army.id}]};
 s.persons[id]=person;recordBirth(s,{id,birthSurname:null,birth,sex:'m'});army.commander=id;return id;
}

export function ensureFieldCommanders(s){for(const army of s.armies)if(army.men>0&&(!army.commander||!s.persons[army.commander]?.alive))assignFieldCommander(s,army);return s}
