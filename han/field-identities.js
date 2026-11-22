import {FACTIONS} from './data.js?v=han-1';
import {recordBirth} from './dynasty.js?v=han-1';
import {ensureHanPortraitSeed} from './court-portrait.js';

// Original game names. These are cultural reconstructions, never documented
// people or claims that a particular historical army had this commander.
const POOLS={
 han:{culture:['Han Chinese','汉'],names:[['Zhao He','赵和'],['Xu Jian','许俭'],['Cai Ming','蔡明'],['Wang Huan','王桓'],['Li Cheng','李成'],['Zhang Yan','张延']]},
 xiongnu:{culture:['Xiongnu (game reconstruction)','匈奴（游戏复原）'],names:[['Tule','图勒'],['Yuhe','于和'],['Mudu','穆都'],['Lushan','卢珊']]},
 wusun:{culture:['Wusun (game reconstruction)','乌孙（游戏复原）'],names:[['Natu','纳图'],['Quli','屈离'],['Mida','弥达'],['Yarun','雅伦']]},
 kangju:{culture:['Kangju (game reconstruction)','康居（游戏复原）'],names:[['Aruvan','阿鲁万'],['Kudara','库达拉'],['Vares','瓦雷斯'],['Mirak','米拉克']]},
 chorasmian:{culture:['Chorasmian / Eastern Iranian (game reconstruction)','花剌子模／东伊朗（游戏复原）'],names:[['Dadavan','达达万'],['Bagatar','巴加塔尔'],['Tirazan','蒂拉赞'],['Ispadak','伊斯帕达克']]},
 yuezhi:{culture:['Yuezhi (game reconstruction)','月氏（游戏复原）'],names:[['Vima','维玛'],['Tara','塔拉'],['Kushan','库珊'],['Arvata','阿尔瓦塔']]},
 sogdian:{culture:['Sogdian (game reconstruction)','粟特（游戏复原）'],names:[['Nanak','纳纳克'],['Vardun','瓦尔敦'],['Mirvan','米尔万'],['Arsang','阿尔桑']]},
 bactrian:{culture:['Bactrian (game reconstruction)','巴克特里亚（游戏复原）'],names:[['Oromis','奥罗米斯'],['Vardak','瓦尔达克'],['Mitraon','米特劳恩'],['Tirak','蒂拉克']]},
 saka:{culture:['Saka (game reconstruction)','塞种（游戏复原）'],names:[['Mauvan','毛万'],['Sparga','斯帕尔加'],['Arsaka','阿尔萨卡'],['Tirama','蒂拉玛']]},
 parthian:{culture:['Parthian (game reconstruction)','帕提亚（游戏复原）'],names:[['Vardanes','瓦尔达内斯'],['Artaban','阿尔塔班'],['Phraates','弗拉特斯'],['Mithradat','米特里达特']]},
 western:{culture:['Western Asian (game reconstruction)','西亚（游戏复原）'],names:[['Arsham','阿尔沙姆'],['Vardan','瓦尔丹'],['Tigran','提格兰'],['Artanes','阿尔塔涅斯']]},
 caucasian_iberian:{culture:['Caucasian Iberian (game reconstruction)','高加索伊比利亚（游戏复原）'],names:[['Parnav','帕尔纳夫'],['Artan','阿尔坦'],['Armaz','阿尔马兹'],['Mirdat','米尔达特']]},
 caucasian_albanian:{culture:['Caucasian Albanian (game reconstruction)','高加索阿尔巴尼亚（游戏复原）'],names:[['Orovan','奥罗万'],['Zobar','佐巴尔'],['Kosar','科萨尔'],['Arsan','阿尔桑']]},
 oasis:{culture:['Tarim oasis (game reconstruction)','塔里木绿洲（游戏复原）'],names:[['Tura','图拉'],['Dama','达玛'],['Suli','苏利'],['Mina','米纳'],['Kava','卡瓦']]},
 qiang:{culture:['Qiang (game reconstruction)','羌（游戏复原）'],names:[['Daru','达如'],['Mile','米勒'],['Qima','奇玛'],['Talu','塔鲁']]},
 steppe:{culture:['Steppe community (game reconstruction)','草原社群（游戏复原）'],names:[['Arta','阿尔塔'],['Turan','图兰'],['Madu','马都'],['Kara','卡拉']]}
};
export const CULTURAL_NAME_POOLS=Object.freeze(POOLS);

// A merchant's preferred cargo is a saved business trait, not an assertion
// about a documented person. Older merchants without one remain usable.
const MERCHANT_SPECIALTIES={
 han:['silk','jade','grain','iron'],xiongnu:['horses','livestock','wool'],
 wusun:['horses','livestock','wool'],kangju:['horses','wool','copper'],
 chorasmian:['grain','wool','copper'],yuezhi:['horses','wool','silk'],
 sogdian:['silk','wool','jade'],bactrian:['horses','copper','wool'],
 saka:['horses','livestock','wool'],parthian:['horses','silk','iron'],
 western:['grain','copper','timber'],caucasian_iberian:['timber','copper','wool'],
 caucasian_albanian:['timber','wool','grain'],oasis:['silk','horses','jade'],
 qiang:['horses','livestock','wool'],steppe:['horses','livestock','wool']
};

export function fieldCulture(faction){
 // These courts and uprisings split from Han territory. Their newly raised
 // commanders should keep that origin even though they are not static states.
 if(['han_loyalist','rival_court','rebels'].includes(faction)||faction?.startsWith('usurper-'))return 'han';
 if(faction==='kangju')return 'kangju';
 if(faction==='chorasmia')return 'chorasmian';
 if(faction==='caucasian_iberia')return 'caucasian_iberian';
 if(faction==='caucasian_albania')return 'caucasian_albanian';
 if(faction==='dayuan')return 'bactrian';
 if(faction==='yuezhi'||['xiumi','shuangmi','guishuang','xidun','dumi'].includes(faction))return 'yuezhi';
 if(faction==='margiana')return 'bactrian';
 if(faction==='parthia'||['atropatene','elymais','persis','characene','adiabene','osrhoene','gordyene'].includes(faction))return 'parthian';
 if(faction==='sogd_samarkand'||faction==='sogd_bukhara')return 'sogdian';
 if(faction==='wusun_lesser')return 'wusun';
 return POOLS[FACTIONS[faction]?.culture]?FACTIONS[faction].culture:'oasis';
}

function homeLabel(s,regionId,faction){
 const site=s.regions.find(r=>r.id===regionId),label=site?.seat||site?.name||FACTIONS[faction]?.name;
 return Array.isArray(label)&&label.length===2?label:null;
}

function originalName(pool,start,used,place,serial){
 for(let i=0;i<pool.names.length;i++){
  const choice=pool.names[(start+i)%pool.names.length];
  if(!used.has(choice[0]))return choice;
 }
 // A geographic byname distinguishes original game characters from different
 // courts. It is a UI convention, not an attested ancient naming practice.
 if(place)for(let i=0;i<pool.names.length;i++){
  const choice=pool.names[(start+i)%pool.names.length];
  const candidate=[`${choice[0]} of ${place[0]}`,`${place[1]}的${choice[1]}`];
  if(!used.has(candidate[0]))return candidate;
 }
 const choice=pool.names[start];
 return [`${choice[0]} (${serial})`,`${choice[1]}（${serial}）`];
}

export function assignFieldCommander(s,army){
 if(!army||army.men<=0)return null;
 if(army.commander&&s.persons[army.commander]?.alive)return army.commander;
 const culture=fieldCulture(army.owner),pool=POOLS[culture],used=new Set(Object.values(s.persons).filter(p=>p.alive).map(p=>p.name?.[0]));
 s.nextFieldPerson=Number.isSafeInteger(s.nextFieldPerson)&&s.nextFieldPerson>0?s.nextFieldPerson:1;
 let id;do{id=`field:${s.nextFieldPerson++}`}while(s.persons[id]);
 const start=(s.nextFieldPerson-1)%pool.names.length;
 const name=originalName(pool,start,used,homeLabel(s,army.region,army.owner),s.nextFieldPerson-1);
 const birth=s.year-35,person={id,name:[...name],record:'fictional',culture:[...pool.culture],faction:army.owner,role:'general',profession:'general',title:['Field commander','野战指挥官'],homeland:army.region,location:army.region,sex:'m',birth,death:null,alive:true,ambition:35,competence:55,loyalty:65,military:50,spouse:[],history:[{year:s.year,month:s.month,kind:'appointed',army:army.id}]};
 s.persons[id]=person;recordBirth(s,{id,birthSurname:null,birth,sex:'m'});ensureHanPortraitSeed(person);army.commander=id;return id;
}

export function ensureFieldCommanders(s){for(const army of s.armies)if(army.men>0&&(!army.commander||!s.persons[army.commander]?.alive))assignFieldCommander(s,army);return s}

// A Han commandery has an actual officeholder. These original game people
// represent unnamed local administrations, not attested historical governors.
export function ensureRegionalAdministrators(s){
 const vacancies=[];
 for(const site of s.regions){
  const appointed=site.administratorId&&s.persons[site.administratorId],eligible=site.owner==='han'&&site.kind==='commandery';
  if(site.administratorId&&(!eligible||!appointed?.alive||appointed.faction!=='han'||appointed.regionalOffice!==site.id)){
   if(appointed?.regionalOffice===site.id){
    appointed.regionalOffice=null;
    (appointed.career||=[]).push({year:s.year,month:s.month,kind:'regional_service_ended',region:site.id});
   }
   site.administratorId=null;
  }
  if(eligible&&!site.administratorId)vacancies.push(site);
 }
 if(!vacancies.length)return s;
 const pool=POOLS.han,used=new Set(Object.values(s.persons).map(p=>p.name?.[0]).filter(Boolean));
 s.nextRegionalAdministrator=Number.isSafeInteger(s.nextRegionalAdministrator)&&s.nextRegionalAdministrator>0?s.nextRegionalAdministrator:1;
 for(const site of vacancies){
  let id;do{id=`regional-administrator:${s.nextRegionalAdministrator++}`}while(s.persons[id]||s.genealogy?.[id]);
  const serial=s.nextRegionalAdministrator-1,name=originalName(pool,serial%pool.names.length,used,homeLabel(s,site.id,'han'),serial),birth=s.year-35;
  used.add(name[0]);
  const person={id,name:[...name],surname:name[0].split(' ')[0],birthSurname:name[0].split(' ')[0],record:'fictional',culture:[...pool.culture],faction:'han',role:'official',profession:'regional administrator',regionalOffice:site.id,title:['Commandery administrator','郡守'],homeland:site.id,location:site.id,sex:'m',birth,death:null,alive:true,ambition:35,competence:45+serial%26,loyalty:65,corruption:serial%25,military:30,spouse:[],career:[{year:s.year,month:s.month,kind:'regional_appointment',region:site.id,who:id}]};
  s.persons[id]=person;recordBirth(s,{id,birthSurname:person.birthSurname,birth,sex:'m'});ensureHanPortraitSeed(person);site.administratorId=id;
 }
 return s;
}

export function regionalAdministrationFactor(s,site){
 const person=s.persons[site?.administratorId];
 if(site?.owner!=='han'||!person?.alive||person.faction!=='han'||person.regionalOffice!==site.id)return 1;
 return Math.max(.85,Math.min(1.1,1+((person.competence??50)-50)/500-(person.corruption??0)/1000));
}

// Commercial agents use the same cultural pools but a separate persistent ID
// namespace. A market record never claims these original game people are
// documented historical merchants.
export function createMarketMerchant(s,faction,location){
 const culture=fieldCulture(faction),pool=POOLS[culture],used=new Set(Object.values(s.persons).map(p=>p.name?.[0]).filter(Boolean));
 s.nextMerchantPerson=Number.isSafeInteger(s.nextMerchantPerson)&&s.nextMerchantPerson>0?s.nextMerchantPerson:1;
 let id;do{id=`merchant:${s.nextMerchantPerson++}`}while(s.persons[id]);
 const serial=s.nextMerchantPerson-1,start=serial%pool.names.length;
 // A foreign market is the place of hiring, not evidence that the merchant
 // was born there. Generate a home in the merchant's own realm when possible.
 const homeland=s.regions.find(r=>r.owner===faction)?.id||location;
 const name=originalName(pool,start,used,homeLabel(s,homeland,faction),serial);
 const birth=s.year-35,specialties=MERCHANT_SPECIALTIES[culture]||MERCHANT_SPECIALTIES.oasis,person={id,name:[...name],record:'fictional',culture:[...pool.culture],faction,role:'merchant',profession:'merchant',title:['Caravan merchant','商队商人'],homeland,location,sex:'unknown',birth,death:null,alive:true,ambition:40,competence:55,loyalty:60,wealth:0,specialization:specialties[serial%specialties.length],riskTolerance:[35,50,65,80][serial%4],spouse:[],history:[{year:s.year,month:s.month,kind:'entered_market',region:location}],appearanceSeed:serial*2654435761>>>0};
 s.persons[id]=person;recordBirth(s,{id,birthSurname:null,birth,sex:'unknown'});return id;
}
