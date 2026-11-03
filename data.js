export const REGIONS = [
  {id:'gaul',name:['Further Gaul','远高卢'],x:282,y:145,terrain:'forest',food:4,tax:3,supply:10,loyalty:75,owner:'caesar',fort:0,city:'Alesia'},
  {id:'narbo',name:['Narbonensis','纳博讷高卢'],x:407,y:251,terrain:'hills',food:4,tax:4,supply:10,loyalty:78,owner:'caesar',fort:0,city:'Narbo'},
  {id:'cisalpine',name:['Cisalpine Gaul','山南高卢'],x:548,y:223,terrain:'plain',food:5,tax:5,supply:14,loyalty:82,owner:'caesar',fort:0,city:'Ravenna'},
  {id:'hispaniaN',name:['Hispania Citerior','近西班牙'],x:175,y:329,terrain:'hills',food:5,tax:4,supply:11,loyalty:70,owner:'senate',fort:1,city:'Tarraco'},
  {id:'hispaniaS',name:['Hispania Ulterior','远西班牙'],x:185,y:437,terrain:'hills',food:5,tax:4,supply:10,loyalty:68,owner:'senate',fort:0,city:'Corduba'},
  {id:'italiaN',name:['Northern Italy','意大利北部'],x:588,y:309,terrain:'plain',food:6,tax:6,supply:15,loyalty:67,owner:'senate',fort:0,city:'Ariminum'},
  {id:'roma',name:['Latium','拉丁姆'],x:605,y:389,terrain:'urban',food:5,tax:9,supply:17,loyalty:63,owner:'senate',fort:1,city:'Roma'},
  {id:'italiaS',name:['Southern Italy','意大利南部'],x:650,y:471,terrain:'hills',food:5,tax:5,supply:13,loyalty:66,owner:'senate',fort:0,city:'Brundisium'},
  {id:'sicilia',name:['Sicilia','西西里'],x:603,y:551,terrain:'plain',food:7,tax:4,supply:12,loyalty:65,owner:'senate',fort:0,city:'Syracuse'},
  {id:'africa',name:['Africa','阿非利加'],x:468,y:585,terrain:'plain',food:8,tax:5,supply:12,loyalty:70,owner:'senate',fort:0,city:'Utica'},
  {id:'illyricum',name:['Illyricum','伊利里库姆'],x:732,y:304,terrain:'hills',food:4,tax:3,supply:10,loyalty:67,owner:'senate',fort:0,city:'Salona'},
  {id:'epirus',name:['Epirus','伊庇鲁斯'],x:779,y:400,terrain:'hills',food:4,tax:4,supply:11,loyalty:72,owner:'senate',fort:0,city:'Dyrrhachium'},
  {id:'achaia',name:['Achaia','亚该亚'],x:849,y:493,terrain:'hills',food:4,tax:5,supply:11,loyalty:72,owner:'senate',fort:0,city:'Athenae'},
  {id:'anatolia',name:['Asia Minor','小亚细亚'],x:963,y:337,terrain:'hills',food:6,tax:7,supply:13,loyalty:69,owner:'senate',fort:0,city:'Ephesus'},
  {id:'syria',name:['Syria','叙利亚'],x:1089,y:456,terrain:'desert',food:4,tax:6,supply:9,loyalty:65,owner:'senate',fort:0,city:'Antioch'},
  {id:'egypt',name:['Ptolemaic Egypt','托勒密埃及'],x:998,y:590,terrain:'desert',food:9,tax:8,supply:14,loyalty:77,owner:'egypt',fort:1,city:'Alexandria'},
  {id:'numidia',name:['Numidia','努米底亚'],x:344,y:570,terrain:'plain',food:5,tax:4,supply:11,loyalty:72,owner:'numidia',fort:0,city:'Cirta'},
  {id:'mauretania',name:['Mauretania','毛里塔尼亚'],x:218,y:565,terrain:'hills',food:4,tax:3,supply:10,loyalty:70,owner:'mauretania',fort:0,city:'Iol'},
  {id:'armenia',name:['Armenia','亚美尼亚'],x:1085,y:250,terrain:'hills',food:4,tax:4,supply:10,loyalty:70,owner:'armenia',fort:1,city:'Artaxata'},
  {id:'parthia',name:['Parthia','帕提亚'],x:1152,y:380,terrain:'desert',food:5,tax:6,supply:11,loyalty:70,owner:'parthia',fort:0,city:'Seleucia'}
];

// Sea routes require transport and take longer. All others represent adjoining land theaters.
export const ROUTES = [
  ['gaul','narbo'],['narbo','cisalpine'],['narbo','hispaniaN'],['hispaniaN','hispaniaS'],
  ['cisalpine','italiaN'],['italiaN','roma'],['roma','italiaS'],['italiaS','illyricum'],
  ['illyricum','epirus'],['epirus','achaia'],['anatolia','syria'],['syria','egypt'],
  ['italiaS','sicilia','sea'],['sicilia','africa','sea'],['africa','hispaniaS','sea'],
  ['achaia','anatolia','sea'],['italiaS','epirus','sea'],['africa','numidia'],['numidia','mauretania'],['mauretania','hispaniaS','sea'],['anatolia','armenia'],['armenia','parthia'],['parthia','syria']
];

export const FACTIONS = {
  caesar:{name:['Caesarian command','凯撒派军队'],short:['Caesar','凯撒'],color:'#a74737',ruler:['Gaius Julius Caesar','盖乌斯·尤利乌斯·凯撒']},
  senate:{name:['Senate and Pompeian command','元老院与庞培派军队'],short:['Senate','元老院'],color:'#c1a576',ruler:['Gnaeus Pompeius Magnus','格奈乌斯·庞培·马格努斯']},
  egypt:{name:['Ptolemaic Egypt','托勒密埃及'],short:['Egypt','埃及'],color:'#8ca490',ruler:['Ptolemy XIII','托勒密十三世']},
  numidia:{name:['Kingdom of Numidia','努米底亚王国'],short:['Numidia','努米底亚'],color:'#ad8e51',ruler:['Juba I','朱巴一世']},
  mauretania:{name:['Mauretanian kingdoms','毛里塔尼亚诸王国'],short:['Mauretania','毛里塔尼亚'],color:'#849063',ruler:['Bocchus II and Bogud','博库斯二世与博古德']},
  armenia:{name:['Kingdom of Armenia','亚美尼亚王国'],short:['Armenia','亚美尼亚'],color:'#967d91',ruler:['Artavasdes II','阿尔塔瓦兹德二世']},
  parthia:{name:['Parthian Empire','帕提亚帝国'],short:['Parthia','帕提亚'],color:'#b28560',ruler:['Orodes II','奥罗德二世']},
  rebels:{name:['Provincial rebels','行省叛军'],short:['Rebels','叛军'],color:'#8a7365',ruler:['Local leaders','地方首领']}
};

export const INITIAL_ARMIES = [
  {id:'xiii',name:['Legio XIII','第十三军团'],owner:'caesar',region:'cisalpine',men:7200,morale:82,skill:4,experience:3,commander:['Julius Caesar','尤利乌斯·凯撒']},
  {id:'viii',name:['Gallic veterans','高卢老兵'],owner:'caesar',region:'narbo',men:5400,morale:77,skill:2,experience:2,commander:['Unnamed legate','未具名副将']},
  {id:'italy',name:['Italian levies','意大利征召军'],owner:'senate',region:'italiaN',men:5200,morale:62,skill:2,experience:1,commander:['Unnamed officer','未具名军官']},
  {id:'pompey',name:['Pompeian field army','庞培野战军'],owner:'senate',region:'roma',men:8800,morale:75,skill:4,experience:2,commander:['Pompey','庞培']},
  {id:'spain',name:['Hispanian legions','西班牙军团'],owner:'senate',region:'hispaniaN',men:6700,morale:68,skill:2,experience:2,commander:['Unnamed officer','未具名军官']},
  {id:'egyptguard',name:['Royal guard','王室卫队'],owner:'egypt',region:'egypt',men:4700,morale:66,skill:2,experience:1,commander:['Unnamed officer','未具名军官']},
  ...['numidia','mauretania','armenia','parthia'].map(id=>({id:id+'army',name:['Royal forces','王国军队'],owner:id,region:id,men:4200,morale:65,skill:2,experience:1,commander:['Unnamed officer','未具名军官']}))
];

export const SOURCES = [
  {title:'Natural Earth · Public domain geographic data',url:'https://www.naturalearthdata.com/about/terms-of-use/'},
  {title:'Ancient World Mapping Center · Roman extent c. 60 BCE (ODbL 1.0)',url:'https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60'},
  {title:'University of Birmingham · The Late Republic in 5 Timelines',url:'https://www.birmingham.ac.uk/Documents/college-artslaw/caha/classroom/The-Late-Republic-in-5-timelines-teacher-guide-and-notes.pdf'},
  {title:'Macquarie University · Crossing the Rubicon',url:'https://www.mq.edu.au/faculty-of-arts/schools/school-of-humanities/our-research/australian-centre-for-ancient-numismatic-studies/digital-exhibitions/the-coinage-of-julius-caesar/the-civil-wars/crossing-the-rubicon-the-coins-of-49-bc'},
  {title:'World History Encyclopedia · Pompey',url:'https://www.worldhistory.org/pompey/'},
  {title:'World History Encyclopedia · Julius Caesar',url:'https://www.worldhistory.org/Julius_Caesar/'},
  {title:'University of Warwick · Juba and North Africa',url:'https://warwick.ac.uk/fac/arts/classics/intranets/students/modules/africa/handouts/lecture_week_7_-_sallust_and_livy.pdf'},
  {title:'Encyclopaedia Iranica · Orodes II',url:'https://www.iranicaonline.org/articles/orodes-ii/'},
  {title:'Armenian Numismatic Research · Artavasdes II',url:'https://armnumres.org/collections/show/91'}
];

