// These are fictional, approximate gameplay sites. Their points and names do
// not assert that an autonomous polity existed there in 49 BCE.
export const LOCAL_GENERATION_BANDS=Object.freeze({
 travel:{count:[1,2],population:.72,militia:[.06,.09],wealth:.7,skill:[1,1]},
 beginner:{count:[2,3],population:.86,militia:[.07,.11],wealth:.85,skill:[1,2]},
 standard:{count:[4,5],population:1,militia:[.09,.14],wealth:1,skill:[2,3]},
 hard:{count:[6,7],population:1.25,militia:[.11,.17],wealth:1.25,skill:[3,4]},
 expert:{count:[8,9],population:1.5,militia:[.14,.2],wealth:1.5,skill:[4,5]}
});

export const NOMADIC_GENERATION_BANDS=Object.freeze({travel:[0,0],beginner:[0,1],standard:[1,1],hard:[1,2],expert:[2,2]});
export const VILLAGE_GENERATION_BANDS=Object.freeze({travel:[0,1],beginner:[1,2],standard:[2,3],hard:[3,4],expert:[4,5]});
export const INDEPENDENT_VILLAGE_SITES=Object.freeze([
 {theater:'hispaniaN',coordinates:[-3.7,42.3]},{theater:'hispaniaS',coordinates:[-4.7,37.2]},
 {theater:'gaul',coordinates:[1.4,47.1]},{theater:'illyricum',coordinates:[17.8,44.2]},
 {theater:'epirus',coordinates:[20.5,39.6]},{theater:'achaia',coordinates:[22.5,38.0]},
 {theater:'anatolia',coordinates:[30.0,38.0]},{theater:'galatia',coordinates:[31.4,39.1]},
 {theater:'syria',coordinates:[36.0,34.5]},{theater:'numidia',coordinates:[6.4,35.0]},
 {theater:'egyptUpper',coordinates:[31.5,26.0]},{theater:'media',coordinates:[48.5,35.0]}
]);
export const NOMADIC_RANGES=Object.freeze([
 {id:'western-pasture',camps:[{theater:'numidia',coordinates:[6.5,34.2]},{theater:'mauretania',coordinates:[2.1,35.0]}]},
 {id:'nile-fringe',camps:[{theater:'egypt',coordinates:[29.5,28.5]},{theater:'egyptUpper',coordinates:[32.4,25.1]}]},
 {id:'iranian-upland',camps:[{theater:'parthia',coordinates:[48.8,33.8]},{theater:'media',coordinates:[46.3,35.3]}]},
 {id:'anatolian-pasture',camps:[{theater:'galatia',coordinates:[31.1,38.6]},{theater:'armenia',coordinates:[42.0,39.4]}]}
]);
export const WILDERNESS_SITES=Object.freeze([
 {theater:'gaul',coordinates:[2.4,47.5],kind:'forest_interior',passability:'difficult',settlement:'limited',occupancy:'sparse'},
 {theater:'illyricum',coordinates:[17.2,44.4],kind:'highland_valley',passability:'seasonal',settlement:'limited',occupancy:'seasonal'},
 {theater:'hispaniaN',coordinates:[-2.4,42.2],kind:'remote_hills',passability:'difficult',settlement:'limited',occupancy:'sparse'},
 {theater:'syria',coordinates:[37.3,34.8],kind:'dry_frontier',passability:'seasonal',settlement:'camp_only',occupancy:'seasonal'},
 {theater:'egyptUpper',coordinates:[31.5,24.5],kind:'desert_margin',passability:'seasonal',settlement:'camp_only',occupancy:'unknown'},
 {theater:'media',coordinates:[48.1,35.8],kind:'mountain_barrier',passability:'impassable',settlement:'none',occupancy:'unknown'}
]);

export const LOCAL_GENERATION_SITES=Object.freeze([
 {theater:'narbo',type:'city_state',coordinates:[3.1,43.2],scale:.9},
 {theater:'sicilia',type:'city_state',coordinates:[14.3,37.7],scale:1},
 {theater:'achaia',type:'city_state',coordinates:[22.7,37.5],scale:1},
 {theater:'anatolia',type:'city_state',coordinates:[27.8,38.5],scale:1.05},
 {theater:'bosporus',type:'city_state',coordinates:[35.8,45.2],scale:.8},
 {theater:'africa',type:'city_state',coordinates:[10.5,36.8],scale:1},
 {theater:'illyricum',type:'tribe',coordinates:[16.1,43.3],scale:.85},
 {theater:'hispaniaN',type:'tribe',coordinates:[.6,41.7],scale:.9},
 {theater:'hispaniaS',type:'tribe',coordinates:[-4.3,37.5],scale:.9},
 {theater:'galatia',type:'tribe',coordinates:[32.6,39.2],scale:1},
 {theater:'numidia',type:'tribe',coordinates:[6.1,35.4],scale:.75},
 {theater:'syria',type:'microstate',coordinates:[38.8,36.4],scale:1},
 {theater:'armenia',type:'microstate',coordinates:[43.3,40.1],scale:.85},
 {theater:'media',type:'microstate',coordinates:[47.5,34.8],scale:.9},
 {theater:'mauretania',type:'microstate',coordinates:[.5,35.6],scale:.8},
 {theater:'egyptUpper',type:'microstate',coordinates:[31.9,25.4],scale:.8},
 {theater:'gaul',type:'strongman',coordinates:[1.5,46.0],scale:.8},
 {theater:'cisalpine',type:'strongman',coordinates:[10.3,45.1],scale:.8},
 {theater:'italiaN',type:'strongman',coordinates:[11.5,44.3],scale:.9},
 {theater:'egypt',type:'strongman',coordinates:[30.6,29.8],scale:1},
 {theater:'parthia',type:'strongman',coordinates:[53.4,34.6],scale:.85},
 {theater:'epirus',type:'strongman',coordinates:[20.3,39.7],scale:.75}
]);

const STEMS=Object.freeze([
 ['Asteron','阿斯特隆'],['Kallion','卡利翁'],['Nerion','涅里翁'],['Thalaron','塔拉隆'],
 ['Erymon','埃里蒙'],['Lykaron','吕卡隆'],['Ortheon','奥尔忒翁'],['Myralon','米拉隆'],
 ['Akrion','阿克里翁'],['Syralon','叙拉隆'],['Arkanis','阿尔卡尼斯'],['Helaron','赫拉隆'],
 ['Tiramon','提拉蒙'],['Vardion','瓦尔迪翁'],['Mekaron','梅卡隆'],['Daronis','达罗尼斯'],
 ['Pyralon','皮拉隆'],['Selaron','塞拉隆'],['Vekrion','维克里翁'],['Olyron','奥利隆']
]);
// Fictional phonetic pools give each broad theater a local flavor without
// asserting a historical settlement, language boundary or attested ruler.
const REGIONAL_NAMES=Object.freeze({
 western:Object.freeze([
  ['Arvion','阿尔维翁'],['Belaron','贝拉隆'],['Brigion','布里吉翁'],['Carvion','卡尔维翁'],
  ['Drunon','德鲁农'],['Elvion','埃尔维翁'],['Marvion','马尔维翁'],['Nertion','涅尔提翁'],
  ['Tavrion','塔夫里翁'],['Uxeron','乌克塞隆'],['Virdon','维尔冬'],['Zerakon','泽拉孔']]),
 iberian:Object.freeze([
  ['Arketon','阿尔凯顿'],['Balcion','巴尔西翁'],['Ileron','伊莱隆'],['Karbion','卡尔比翁'],
  ['Lurakon','卢拉孔'],['Oretun','奥雷吞'],['Saldon','萨尔冬'],['Tarsion','塔尔西翁'],
  ['Turmion','图尔米翁'],['Veskon','韦斯孔'],['Ybrion','伊布里翁'],['Zaldun','扎尔敦']]),
 hellenic:Object.freeze([
  ['Akrion','阿克里翁'],['Delyron','德吕隆'],['Epharon','埃法隆'],['Kallion','卡利翁'],
  ['Myralon','米拉隆'],['Ortheon','奥尔忒翁'],['Pyralon','皮拉隆'],['Selaron','塞拉隆'],
  ['Thalaron','塔拉隆'],['Vekrion','维克里翁'],['Xanthion','克桑提翁'],['Zelyron','泽吕隆']]),
 eastern:Object.freeze([
  ['Arkanis','阿尔卡尼斯'],['Daronis','达罗尼斯'],['Esharan','埃沙兰'],['Faradon','法拉冬'],
  ['Harvash','哈尔瓦什'],['Kezaran','凯扎兰'],['Mekaron','梅卡隆'],['Narzash','纳尔扎什'],
  ['Paradon','帕拉冬'],['Ravash','拉瓦什'],['Tiramon','提拉蒙'],['Vardion','瓦尔迪翁']]),
 african:Object.freeze([
  ['Aduron','阿杜隆'],['Barakon','巴拉孔'],['Dazuron','达祖隆'],['Emazir','埃马齐尔'],
  ['Farsun','法尔孙'],['Imlaron','伊姆拉隆'],['Kezuron','凯祖隆'],['Mazaron','马扎隆'],
  ['Namarun','纳马伦'],['Taziron','塔齐隆'],['Umaron','乌马隆'],['Zamarun','扎马伦']]),
 nile:Object.freeze([
  ['Abaron','阿巴隆'],['Demeron','德梅隆'],['Eshamon','埃沙蒙'],['Faranet','法拉内特'],
  ['Hekaron','赫卡隆'],['Imeron','伊梅隆'],['Kameret','卡梅雷特'],['Meneron','梅涅隆'],
  ['Nefaron','涅法隆'],['Pameret','帕梅雷特'],['Tameron','塔梅隆'],['Zekaron','泽卡隆']])
});
const REGION_GROUP=Object.freeze({
 narbo:'western',gaul:'western',cisalpine:'western',italiaN:'western',illyricum:'western',
 hispaniaN:'iberian',hispaniaS:'iberian',
 sicilia:'hellenic',achaia:'hellenic',epirus:'hellenic',anatolia:'hellenic',galatia:'hellenic',bosporus:'hellenic',
 syria:'eastern',armenia:'eastern',media:'eastern',parthia:'eastern',
 africa:'african',numidia:'african',mauretania:'african',
 egypt:'nile',egyptUpper:'nile'
});
const stemsFor=theater=>REGIONAL_NAMES[REGION_GROUP[theater]]||STEMS;
const TITLES=Object.freeze({
 city_state:[['Free Port','自由港'],['Harbor Council','港口议事城'],['Maritime Commune','海滨公社']],
 microstate:[['March','边地小国'],['Court','地方王廷'],['Highland Realm','高地小国']],
 tribe:[['Hill Council','山地议事会'],['River Clan','河谷部族'],['Frontier Assembly','边地部落联盟']],
 strongman:[['Household','地方家族'],['Retinue','地方部曲'],['River Following','河谷武装']]
});
const RULER_NAMES=Object.freeze([
 ['Aleron','阿勒隆'],['Beren','贝伦'],['Damar','达马尔'],['Elyon','埃利翁'],['Haron','哈隆'],
 ['Ilyra','伊莉拉'],['Keren','凯伦'],['Lysara','莉萨拉'],['Maron','马隆'],['Neressa','涅蕾莎'],
 ['Oryon','奥里翁'],['Pheron','菲隆'],['Rovena','罗薇娜'],['Salyra','萨莉拉'],['Taron','塔隆'],
 ['Velira','维莉拉'],['Xeron','泽隆'],['Ylena','伊蕾娜'],['Zareon','扎雷翁'],['Mirena','米蕾娜']
]);
const REGIONAL_RULERS=Object.freeze({
 western:Object.freeze([['Arovas','阿罗瓦斯'],['Belia','贝莉娅'],['Carvos','卡尔沃斯'],['Dervena','德尔维娜'],['Elvar','埃尔瓦尔'],['Maros','马罗斯'],['Nertara','涅尔塔拉'],['Talvion','塔尔维翁'],['Uxer','乌克塞尔'],['Virdessa','维尔德萨']]),
 iberian:Object.freeze([['Arbel','阿尔贝尔'],['Balsara','巴尔萨拉'],['Karet','卡雷特'],['Lurena','卢蕾娜'],['Oretan','奥雷坦'],['Saldira','萨尔迪拉'],['Tarsen','塔尔森'],['Turmara','图尔马拉'],['Veska','韦斯卡'],['Zaldar','扎尔达尔']]),
 hellenic:RULER_NAMES,
 eastern:Object.freeze([['Arzavan','阿尔扎万'],['Darvash','达尔瓦什'],['Eshara','埃沙拉'],['Farazon','法拉宗'],['Harzena','哈尔泽娜'],['Kevar','凯瓦尔'],['Narvaz','纳尔瓦兹'],['Ravazan','拉瓦赞'],['Tiraz','蒂拉兹'],['Vardaz','瓦尔达兹']]),
 african:Object.freeze([['Adur','阿杜尔'],['Baresa','巴雷萨'],['Dazun','达尊'],['Emazira','埃马齐拉'],['Farsen','法尔森'],['Imlara','伊姆拉拉'],['Kezun','凯尊'],['Mazar','马扎尔'],['Tazira','塔齐拉'],['Zamur','扎穆尔']]),
 nile:Object.freeze([['Abar','阿巴尔'],['Demera','德梅拉'],['Eshamet','埃沙梅特'],['Faret','法雷特'],['Hekara','赫卡拉'],['Imeret','伊梅雷特'],['Kamer','卡梅尔'],['Menera','梅涅拉'],['Pamer','帕梅尔'],['Tameret','塔梅雷特']])
});
const rulersFor=theater=>REGIONAL_RULERS[REGION_GROUP[theater]]||RULER_NAMES;
const NOMAD_TITLES=Object.freeze([['Pastoral Camp','牧营'],['Seasonal Encampment','季节营地'],['Herding Band','游牧群体'],['Range Council','牧地议事群']]);
const VILLAGE_TITLES=Object.freeze([['Village','村'],['Hamlet','小村'],['Farmstead','农庄']]);
const WILDERNESS_NAMES=Object.freeze([['Remote Tract','偏远地带'],['Interior Reach','内陆荒地'],['Outer Range','边缘地带'],['Sparse Corridor','稀疏走廊'],['Wild Margin','荒野边缘'],['High Frontier','高地边疆']]);
const WILDERNESS_KINDS=Object.freeze({forest_interior:['Forest Interior','森林腹地'],highland_valley:['Highland Valley','高地山谷'],remote_hills:['Remote Hills','偏远丘陵'],dry_frontier:['Dry Frontier','干旱边疆'],desert_margin:['Desert Margin','沙漠边缘'],mountain_barrier:['Mountain Barrier','山地屏障']});
const RULER_TITLES=Object.freeze({city_state:['Archon','执政官'],microstate:['Ruler','地方君主'],tribe:['Elder','长老'],strongman:['Chief','地方首领']});
const PERSONALITIES=Object.freeze(['cautious','pragmatic','bold','ambitious']);
const BASE=Object.freeze({city_state:[6000,13000,1.25,1.1],microstate:[8000,17000,1.1,1],tribe:[4500,11000,.75,1.2],strongman:[1200,4200,.7,1.1]});
const next=state=>{state.value=(Math.imul(state.value,1664525)+1013904223)>>>0;return state.value/4294967296};
const integer=(rng,low,high)=>low+Math.floor(next(rng)*(high-low+1));
const range=(rng,low,high)=>low+next(rng)*(high-low);
const siteSeed=(seed,theater)=>[...theater].reduce((value,char)=>Math.imul(value^char.charCodeAt(0),16777619)>>>0,seed>>>0);

function profile(rng,type,scale,band){
 const [low,high,wealth,foodValue]=BASE[type];
 const population=Math.round(integer(rng,low,high)*scale*band.population/100)*100;
 const militia=Math.max(100,Math.round(population*range(rng,...band.militia)/50)*50);
 const treasury=Math.max(3,Math.round(population/450*wealth*band.wealth*range(rng,.8,1.2)));
 const food=Math.max(4,Math.round(population/650*foodValue*band.wealth*range(rng,.8,1.2)));
 const fort=Math.max(0,Math.min(3,(['tribe','strongman'].includes(type)?0:1)+(band.skill[0]>=3?1:0)+(band.skill[0]>=4&&next(rng)>.5?1:0)));
 return {population,militia,treasury,food,fort,strategy:integer(rng,...band.skill)};
}

export function generatedLocalPolities(seed,difficulty,availableTheaters,startYear=-49){
 const band=LOCAL_GENERATION_BANDS[difficulty]||LOCAL_GENERATION_BANDS.standard;
 const rng={value:seed>>>0},sites=LOCAL_GENERATION_SITES.filter(site=>availableTheaters.has(site.theater)).map(site=>({...site}));
 for(let i=sites.length-1;i>0;i--){const j=integer(rng,0,i);[sites[i],sites[j]]=[sites[j],sites[i]]}
 const count=Math.min(sites.length,integer(rng,...band.count)),used=new Set(),usedRulers=new Set();
 const result=[];
 const selected=[];
 const quota=count===1?[sites.find(site=>['city_state','microstate'].includes(site.type))?.type||'city_state']:
  count===2?['city_state','microstate']:
  count===3?['city_state','microstate','tribe']:
  count<=5?['city_state','microstate','tribe','strongman']:
  count<=7?['city_state','microstate','city_state','microstate','tribe','strongman']:
  ['city_state','microstate','city_state','microstate','tribe','strongman','tribe','strongman'];
 for(const type of quota){const index=sites.findIndex(site=>site.type===type);if(index>=0)selected.push(...sites.splice(index,1))}
 selected.push(...sites.slice(0,count-selected.length));
 for(const site of selected){
  let name,english;
  do{const stems=stemsFor(site.theater),stem=stems[integer(rng,0,stems.length-1)],title=TITLES[site.type][integer(rng,0,TITLES[site.type].length-1)];name=[`${stem[0]} ${title[0]}`,`${stem[1]}${title[1]}`];english=name[0]}while(used.has(english));
  used.add(english);
  let rulerName,rulerKey;
  do{const names=rulersFor(site.theater),person=names[integer(rng,0,names.length-1)],title=RULER_TITLES[site.type];rulerName=[`${title[0]} ${person[0]}`,`${person[1]}${title[1]}`];rulerKey=rulerName[0]}while(usedRulers.has(rulerKey));
  usedRulers.add(rulerKey);
  const age=integer(rng,28,64);
  result.push({id:`generated:${site.theater}`,type:site.type,theater:site.theater,coordinates:site.coordinates,name,
   historical:false,procedural:true,spatialAccuracy:'fictional_approximate_point',
   description:site.type==='strongman'?['Fictional local strongman and armed household generated for this campaign; personal control is not a recognized sovereign border.','本局生成的架空地方豪强及其部曲；个人控制不等于获得承认的主权边界。']:['Fictional autonomous polity generated for this campaign; the point is approximate and does not define a border.','本局生成的架空自治政权；地点为近似点，不代表真实历史边界。'],
   ruler:{id:`local-ruler:${site.theater}`,name:rulerName,birthYear:startYear-age,personality:PERSONALITIES[integer(rng,0,PERSONALITIES.length-1)],fictional:true},
   government:site.type==='strongman'?'personal_following':site.type==='city_state'?'civic_council':site.type==='tribe'?'tribal_assembly':'local_dynasty',
   maxFootholdLevel:site.type==='strongman'?2:site.type==='tribe'?2:3,...profile({value:siteSeed(seed,site.theater)},site.type,site.scale,band),seed:integer(rng,0,0xffffffff)});
 }
 return result;
}

export function generatedIndependentVillages(seed,difficulty,availableTheaters){
 const band=LOCAL_GENERATION_BANDS[difficulty]||LOCAL_GENERATION_BANDS.standard;
 const countBand=VILLAGE_GENERATION_BANDS[difficulty]||VILLAGE_GENERATION_BANDS.standard;
 const rng={value:(seed^0x27d4eb2d)>>>0};
 const sites=INDEPENDENT_VILLAGE_SITES.filter(site=>availableTheaters.has(site.theater)).map(site=>({...site}));
 for(let i=sites.length-1;i>0;i--){const j=integer(rng,0,i);[sites[i],sites[j]]=[sites[j],sites[i]]}
 const count=Math.min(sites.length,integer(rng,...countBand));
 const used=new Set();
 return sites.slice(0,count).map(site=>{
  let name;
  do{const stems=stemsFor(site.theater),stem=stems[integer(rng,0,stems.length-1)],title=VILLAGE_TITLES[integer(rng,0,VILLAGE_TITLES.length-1)];name=[`${stem[0]} ${title[0]}`,`${stem[1]}${title[1]}`]}while(used.has(name[0]));
  used.add(name[0]);
  const names=rulersFor(site.theater),head=names[integer(rng,0,names.length-1)];
  const population=Math.round(integer(rng,350,850)*band.population/50)*50;
  const foodNeed=Math.max(2,Math.ceil(population/350));
  const storedFood=Math.min(12,foodNeed*3);
  return {id:`generated-independent-village:${site.theater}`,type:'village',theater:site.theater,coordinates:[...site.coordinates],
   name,historical:false,procedural:true,proceduralVillage:true,proceduralIndependentVillage:true,spatialAccuracy:'fictional_approximate_point',
   description:['Fictional village generated for this campaign. Its approximate point, people and production do not assert a historical settlement or independent territory.','本局生成的架空村落。地点、人口与生产均为模拟，不表示真实历史聚落或独立领土。'],
   militia:0,fort:0,treasury:integer(rng,2,6),food:storedFood,seed:integer(rng,0,0xffffffff),
   village:{population,leader:[`Elder ${head[0]}`,`${head[1]}村长`],specialty:site.theater==='numidia'||site.theater==='media'?['pastoral food','畜牧食物']:['grain','谷物'],storedFood,
    foodProduction:foodNeed+1,foodNeed,granary:0,irrigation:0,market:0,well:0,road:0,wall:0,shrine:0,agriculture:0,
    satisfaction:integer(rng,55,75),security:integer(rng,50,70),marketAccess:integer(rng,35,65),project:null,localIssue:null}};
 });
}

export function generatedNomadicCommunities(seed,difficulty,availableTheaters,startYear=-49){
 const band=LOCAL_GENERATION_BANDS[difficulty]||LOCAL_GENERATION_BANDS.standard,countBand=NOMADIC_GENERATION_BANDS[difficulty]||NOMADIC_GENERATION_BANDS.standard;
 const rng={value:(seed^0x9e3779b9)>>>0},ranges=NOMADIC_RANGES.filter(range=>range.camps.every(camp=>availableTheaters.has(camp.theater))).map(range=>({...range}));
 for(let i=ranges.length-1;i>0;i--){const j=integer(rng,0,i);[ranges[i],ranges[j]]=[ranges[j],ranges[i]]}
 const count=Math.min(ranges.length,integer(rng,...countBand));
 return ranges.slice(0,count).map(route=>{
  const stems=stemsFor(route.camps[0].theater),names=rulersFor(route.camps[0].theater),stem=stems[integer(rng,0,stems.length-1)],title=NOMAD_TITLES[integer(rng,0,NOMAD_TITLES.length-1)],person=names[integer(rng,0,names.length-1)];
  const population=Math.round(integer(rng,1000,3200)*band.population/100)*100;
  const militia=Math.max(100,Math.round(population*range(rng,...band.militia)/50)*50);
  const treasury=Math.max(3,Math.round(population/550*band.wealth*range(rng,.8,1.2)));
  const food=Math.max(4,Math.round(population/800*band.wealth*range(rng,.8,1.2)));
  const camps=route.camps.map(camp=>({theater:camp.theater,coordinates:[...camp.coordinates]}));
  return {id:`generated-nomad:${route.id}`,type:'nomadic',theater:camps[0].theater,coordinates:[...camps[0].coordinates],name:[`${stem[0]} ${title[0]}`,`${stem[1]}${title[1]}`],
   historical:false,procedural:true,proceduralNomad:true,spatialAccuracy:'fictional_approximate_point',
   description:['Fictional mobile herding community generated for this campaign. Its camps are approximate seasonal points, not a sovereign border.','本局生成的架空流动牧群；营地是季节性的近似点，不代表主权边界。'],
   ruler:{id:`local-ruler:nomad:${route.id}`,name:[`Herd Elder ${person[0]}`,`${person[1]}牧群长老`],birthYear:startYear-integer(rng,28,64),personality:PERSONALITIES[integer(rng,0,PERSONALITIES.length-1)],fictional:true},
   government:'seasonal_camp',population,militia,treasury,food,fort:0,strategy:integer(rng,...band.skill),herds:Math.max(4,Math.round(population/250)),
   seasonalRange:camps,rangeIndex:0,pastureRights:{},waterSecurity:integer(rng,50,80),maxFootholdLevel:0,seed:integer(rng,0,0xffffffff)};
 });
}

export function generatedWildernessSites(seed,availableTheaters){
 const rng={value:(seed^0x85ebca6b)>>>0},sites=WILDERNESS_SITES.filter(site=>availableTheaters.has(site.theater)).map(site=>({...site}));
 for(let i=sites.length-1;i>0;i--){const j=integer(rng,0,i);[sites[i],sites[j]]=[sites[j],sites[i]]}
 const count=Math.min(sites.length,integer(rng,3,4));
 return sites.slice(0,count).map((site,index)=>{
  const label=WILDERNESS_NAMES[integer(rng,0,WILDERNESS_NAMES.length-1)],kind=WILDERNESS_KINDS[site.kind];
  return {id:`generated-wilderness:${site.theater}`,type:'wilderness',theater:site.theater,coordinates:[...site.coordinates],
   name:[`${label[0]} · ${kind[0]}`,`${kind[1]}·${label[1]}`],historical:false,procedural:true,proceduralWilderness:true,spatialAccuracy:'fictional_approximate_point',
   description:['Simulated sparse or difficult terrain in this broad theater. This point is approximate; it is not proof of empty land or a free sovereign claim.','此广域战区内模拟的稀疏或难行地带。地点为近似点，不代表无人土地或可自由取得的主权。'],
   wilderness:{kind:site.kind,passability:site.passability,settlement:site.settlement,occupancy:site.occupancy,populationEstimate:integer(rng,0,site.occupancy==='sparse'?180:90),surveyedBy:{},surveyProject:null},
   maxFootholdLevel:site.settlement==='none'?0:1,seed:integer(rng,0,0xffffffff),generatedIndex:index};
 });
}

export function historicalLocalProfile(seed,difficulty,type,scale=1){
 const band=LOCAL_GENERATION_BANDS[difficulty]||LOCAL_GENERATION_BANDS.standard;
 return profile({value:seed>>>0},type,scale,band);
}
