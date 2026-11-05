import {REGIONS as LEGACY_REGIONS,ROUTES as LEGACY_ROUTES} from './data.js';

// Settlement anchors define operational territories, not asserted ancient
// administrative boundaries. Coordinates were manually curated as approximate
// ancient-site positions; this is game data, not a surveyed historical GIS.
const rows=`cisalpine|Ravenna|拉文纳|12.2035|44.4184|plain|port,road,grain
cisalpine|Mediolanum|梅迪奥拉努姆|9.1900|45.4642|plain|road,grain
cisalpine|Aquileia|阿奎莱亚|13.3683|45.7680|plain|port,road,metal
cisalpine|Placentia|普拉森提亚|9.6930|45.0526|plain|road,river,grain
cisalpine|Bononia|博诺尼亚|11.3430|44.4940|plain|road,grain
cisalpine|Mutina|穆提纳|10.9250|44.6450|plain|road,grain
cisalpine|Verona|维罗纳|10.9930|45.4380|plain|road,river,grain
cisalpine|Patavium|帕塔维乌姆|11.8768|45.4064|plain|road,river,grain
italiaN|Ariminum|阿里米努姆|12.5681|44.0678|plain|port,road,grain
italiaN|Pisae|皮萨|10.4000|43.7167|plain|port,road,grain
italiaN|Arretium|阿雷提乌姆|11.8828|43.4633|hills|road,stone
italiaN|Perusia|佩鲁西亚|12.3888|43.1107|hills|road,stone
italiaN|Ancona|安科纳|13.5115|43.6158|hills|port,road,timber
italiaN|Spoletium|斯波莱提乌姆|12.7385|42.7405|hills|road,stone
roma|Roma|罗马|12.4964|41.9028|urban|road,river,stone
roma|Ostia|奥斯提亚|12.2916|41.7500|plain|port,road,grain
roma|Tibur|提布尔|12.7989|41.9630|hills|road,stone
roma|Praeneste|普拉埃内斯特|12.8853|41.8394|hills|road,stone
roma|Tarracina|塔拉基纳|13.2434|41.2910|plain|port,road,grain
italiaS|Brundisium|布伦迪西姆|17.9463|40.6327|plain|port,road,grain
italiaS|Capua|卡普亚|14.2128|41.1050|plain|road,grain
italiaS|Neapolis|那不勒斯|14.2681|40.8518|urban|port,road,stone
italiaS|Beneventum|贝内文图姆|14.7826|41.1298|hills|road,grain
italiaS|Tarentum|塔兰托|17.2430|40.4710|plain|port,road,grain
italiaS|Canusium|卡努西乌姆|16.0667|41.2181|plain|road,grain
italiaS|Rhegium|雷吉乌姆|15.6500|38.1140|hills|port,road,timber
sicilia|Syracuse|叙拉古|15.2866|37.0755|plain|port,grain
sicilia|Messana|墨萨纳|15.5500|38.1920|hills|port,road,grain
sicilia|Panormus|帕诺尔穆斯|13.3614|38.1157|plain|port,grain
sicilia|Agrigentum|阿格里真图姆|13.5765|37.3111|hills|port,grain
gaul|Alesia|阿莱西亚|4.4915|47.5360|hills|road,stone
gaul|Lugdunum|卢格杜努姆|4.8357|45.7640|hills|road,river,grain
gaul|Bibracte|比布拉克特|4.0380|46.9230|forest|road,timber
gaul|Avaricum|阿瓦里库姆|2.3960|47.0810|plain|road,grain
gaul|Cenabum|凯纳布姆|1.9040|47.9020|plain|road,river,grain
gaul|Gergovia|热尔戈维亚|3.1360|45.7200|hills|road,stone
gaul|Lutetia|卢泰提亚|2.3520|48.8560|plain|river,road,grain
gaul|Durocortorum|杜罗科尔托鲁姆|4.0310|49.2580|plain|road,grain
gaul|Vesontio|维松提奥|6.0250|47.2380|hills|river,road,metal
gaul|Burdigala|布尔迪加拉|-.5790|44.8378|plain|port,river,grain
gaul|Tolosa|托洛萨|1.4440|43.6040|plain|road,river,grain
gaul|Samarobriva|萨马罗布里瓦|2.3000|49.8900|plain|river,road,grain
narbo|Narbo|纳博|3.0030|43.1840|plain|port,road,grain
narbo|Massilia|马西利亚|5.3698|43.2965|plain|port,road,grain
narbo|Nemausus|内毛苏斯|4.3600|43.8360|plain|road,grain
narbo|Arelate|阿雷拉特|4.6280|43.6760|plain|port,river,grain
narbo|Vienna|维恩纳|4.8750|45.5250|hills|road,river,grain
narbo|Carcaso|卡尔卡索|2.3500|43.2130|hills|road,stone
narbo|Forum Iulii|尤利乌斯广场|6.7360|43.4330|plain|port,road,grain
narbo|Glanum|格拉努姆|4.8320|43.7740|hills|road,stone
hispaniaN|Tarraco|塔拉科|1.2450|41.1180|hills|port,road,grain
hispaniaN|Ilerda|伊莱尔达|.6200|41.6170|plain|river,road,grain
hispaniaN|Osca|奥斯卡|-.4080|42.1400|hills|road,grain
hispaniaN|Salduie|萨尔杜伊|-.8810|41.6500|plain|river,road,grain
hispaniaN|Saguntum|萨贡图姆|-.2730|39.6810|hills|port,road,stone
hispaniaN|Valentia|瓦伦提亚|-.3760|39.4700|plain|port,road,grain
hispaniaN|Carthago Nova|新迦太基|-.9860|37.6050|hills|port,road,metal
hispaniaN|Numantia|努曼提亚| -2.4480|41.8080|hills|road,stone
hispaniaN|Bilbilis|比尔比利斯| -1.6500|41.3530|hills|road,metal
hispaniaN|Emporiae|恩波里埃|3.1200|42.1340|plain|port,road,grain
hispaniaS|Corduba|科尔杜巴| -4.7800|37.8880|plain|river,road,grain
hispaniaS|Hispalis|希斯帕利斯| -5.9940|37.3890|plain|port,river,grain
hispaniaS|Gades|加德斯| -6.2900|36.5290|plain|port,road,grain
hispaniaS|Italica|伊塔利卡| -6.0440|37.4380|plain|road,grain
hispaniaS|Astigi|阿斯提吉| -5.0800|37.5410|plain|road,grain
hispaniaS|Malaca|马拉卡| -4.4210|36.7210|hills|port,road,grain
hispaniaS|Castulo|卡斯图洛| -3.6280|38.0470|hills|road,metal
hispaniaS|Munda|蒙达| -4.7600|37.2750|hills|road,stone
hispaniaS|Metellinum|梅特利努姆| -5.9630|38.9610|plain|road,grain
hispaniaS|Olisipo|奥利西波| -9.1400|38.7220|plain|port,road,grain
illyricum|Salona|萨洛纳|16.4900|43.5400|hills|port,road,stone
illyricum|Iader|伊阿德尔|15.2310|44.1190|hills|port,road,timber
illyricum|Narona|纳罗纳|17.6200|43.0400|hills|port,road,stone
illyricum|Scodra|斯科德拉|19.5100|42.0670|hills|river,road,timber
illyricum|Epidaurum|埃皮达鲁姆|18.2670|42.5810|hills|port,road,stone
epirus|Dyrrhachium|狄拉希乌姆|19.4520|41.3230|hills|port,road,stone
epirus|Apollonia|阿波罗尼亚|19.4700|40.7300|hills|port,road,grain
epirus|Buthrotum|布特林图姆|20.0200|39.7450|hills|port,road,timber
epirus|Ambracia|安布拉基亚|20.9870|39.1600|hills|river,road,grain
epirus|Phoenice|腓尼基|20.0600|39.9150|hills|road,timber
achaia|Athenae|雅典|23.7275|37.9838|urban|road,stone
achaia|Patrae|帕特雷|21.7340|38.2460|plain|port,road,grain
achaia|Delphi|德尔斐|22.5010|38.4820|hills|road,stone
achaia|Thebae|底比斯|23.3200|38.3250|plain|road,grain
achaia|Larissa|拉里萨|22.4190|39.6390|plain|road,grain
anatolia|Ephesus|以弗所|27.3410|37.9390|plain|port,road,grain
anatolia|Smyrna|士麦那|27.1420|38.4230|plain|port,road,grain
anatolia|Pergamum|帕加马|27.1840|39.1200|hills|road,stone
anatolia|Miletus|米利都|27.2780|37.5310|plain|port,road,grain
anatolia|Sardis|萨尔迪斯|28.0400|38.4880|plain|river,road,metal
anatolia|Halicarnassus|哈利卡纳苏斯|27.4300|37.0380|hills|port,road,stone
anatolia|Sinope|锡诺普|35.1540|42.0260|hills|port,road,timber
galatia|Gordion|戈尔迪翁|31.9900|39.6540|plain|road,grain
galatia|Ancyra|安基拉|32.8600|39.9330|hills|road,stone
galatia|Pessinus|佩西努斯|31.5010|39.3660|hills|road,stone
bosporus|Panticapaeum|潘提卡帕伊翁|36.4700|45.3500|plain|port,road,grain
bosporus|Phanagoria|法纳戈里亚|36.8300|45.1900|plain|port,grain
armenia|Artaxata|阿尔塔克萨塔|44.5800|39.8850|hills|road,stone
armenia|Tigranocerta|提格拉诺刻尔塔|41.0000|37.9200|hills|road,metal
armenia|Armavir|阿尔马维尔|44.0400|40.1500|plain|road,grain
africa|Utica|乌提卡|10.0630|37.0560|plain|port,road,grain
africa|Hadrumetum|哈德鲁梅图姆|10.6390|35.8260|plain|port,road,grain
africa|Thapsus|塔普苏斯|11.0400|35.6300|plain|port,road,grain
africa|Leptis Magna|大莱普提斯|14.2930|32.6380|plain|port,road,grain
numidia|Cirta|基尔塔|6.6140|36.3650|hills|road,grain
numidia|Zama|扎马|9.3240|36.0160|plain|road,grain
numidia|Theveste|特韦斯特|8.1230|35.4040|hills|road,stone
mauretania|Iol|伊奥尔|2.1900|36.6070|plain|port,road,grain
mauretania|Tingis|廷吉斯| -5.8040|35.7670|hills|port,road,grain
egypt|Alexandria|亚历山大里亚|29.9187|31.2001|urban|port,road,grain
egypt|Memphis|孟菲斯|31.2500|29.8500|plain|river,road,grain
egypt|Pelusium|佩卢西乌姆|32.5500|31.0300|plain|port,road,grain
syria|Antioch|安条克|36.1600|36.2000|urban|river,road,grain
syria|Laodicea|劳迪基亚|35.7800|35.5200|plain|port,road,grain
syria|Apamea|阿帕梅亚|36.4000|35.4200|plain|river,road,grain
syria|Damascus|大马士革|36.2900|33.5100|plain|road,grain
parthia|Seleucia|塞琉西亚|44.5200|33.1000|plain|river,road,grain
parthia|Ecbatana|埃克巴坦那|48.5100|34.8000|hills|road,metal
parthia|Arbela|阿尔贝拉|44.0100|36.1900|plain|road,grain
parthia|Susa|苏萨|48.2500|32.1900|plain|river,road,grain`;

const parsed=rows.split('\n').map((line,index)=>{const [macro,en,zh,lon,lat,terrain,tags]=line.split('|');return {id:index===0?macro:`t${String(index+1).padStart(3,'0')}`,macro,site:[en,zh],lon:Number(lon),lat:Number(lat),terrain,tags:tags.split(',')}});
// The first item in each group keeps the legacy identifier so characters,
// reports and objectives can be mapped without altering their meaning.
for(const macro of new Set(parsed.map(x=>x.macro))){const first=parsed.find(x=>x.macro===macro);first.id=macro}
export const GRAND_SITES=parsed;
export const GRAND_GROUPS=Object.fromEntries([...new Set(parsed.map(x=>x.macro))].map(id=>[id,parsed.filter(x=>x.macro===id)]));
const point=(lon,lat)=>({x:(lon+12)/62*1200,y:(55-lat)/31*650});
export function grandRegionsFrom(legacyRegions){
 const old=Object.fromEntries(legacyRegions.map(r=>[r.id,r]));
 return GRAND_SITES.map((site,index)=>{const base=old[site.macro],count=GRAND_GROUPS[site.macro].length,urban=site.terrain==='urban',tags=site.tags;
  return {...base,id:site.id,macro:site.macro,site:[...site.site],name:[...site.site],lon:site.lon,lat:site.lat,...point(site.lon,site.lat),terrain:site.terrain,
   food:Math.max(.15,base.food/count*(tags.includes('grain')?1.25:.7)),tax:Math.max(.15,base.tax/count*(urban?1.6:tags.includes('port')?1.18:.88)),
   population:Math.round((urban?85000:tags.includes('grain')?43000:24000)*(index%4===0?1.13:1)),resource:tags.includes('metal')?'metal':tags.includes('stone')?'stone':tags.includes('timber')?'timber':'grain',
   port:tags.includes('port'),river:tags.includes('river'),road:tags.includes('road'),mountainPass:site.terrain==='hills'&&index%5===0,
   culture:['egypt','parthia','armenia','bosporus','galatia'].includes(site.macro)?site.macro:['africa','numidia','mauretania'].includes(site.macro)?'north-african':['achaia','epirus','anatolia'].includes(site.macro)?'hellenic':'roman-local',
   religion:['egypt','parthia','armenia','bosporus','galatia'].includes(site.macro)?site.macro:'local-cults',integration:['caesar','senate'].includes(base.owner)&&!['egypt','parthia','armenia','bosporus','galatia'].includes(site.macro)?65:55,civicSatisfaction:base.loyalty,city:site.site[0],fort:site.id===site.macro?base.fort:urban?1:0,
   supply:Math.max(4,Math.round(base.supply/count*3)+(urban?3:0)+(tags.includes('port')?2:0)),loyalty:base.loyalty,owner:base.owner,buildings:site.id===site.macro?[...(base.buildings||[])]:[]};
 });
}
const km=(a,b)=>Math.hypot((a.lon-b.lon)*Math.cos((a.lat+b.lat)/2*Math.PI/180),a.lat-b.lat);
const edgeKey=(a,b)=>[a,b].sort().join(':');
export function grandRoutes(){
 const links=new Map(),add=(a,b,kind='land')=>{if(a===b)return;const key=edgeKey(a.id,b.id);if(!links.has(key))links.set(key,[a.id,b.id,kind==='sea'?'sea':undefined,{distance:Math.round(km(a,b)*111),river:a.tags.includes('river')&&b.tags.includes('river'),road:a.tags.includes('road')&&b.tags.includes('road'),mountain:a.terrain==='hills'&&b.terrain==='hills'}])};
 for(const sites of Object.values(GRAND_GROUPS)){
  const reached=[sites[0]],remaining=new Set(sites.slice(1));while(remaining.size){let best;for(const a of reached)for(const b of remaining)if(!best||km(a,b)<best.d)best={a,b,d:km(a,b)};add(best.a,best.b);reached.push(best.b);remaining.delete(best.b)}
  for(const a of sites)for(const b of sites.filter(x=>x!==a).sort((x,y)=>km(a,x)-km(a,y)).slice(0,2))add(a,b);
 }
 for(const [from,to,kind] of LEGACY_ROUTES){const left=GRAND_GROUPS[from],right=GRAND_GROUPS[to];if(!left||!right)continue;let candidates=left.flatMap(a=>right.filter(b=>kind!=='sea'||a.tags.includes('port')&&b.tags.includes('port')).map(b=>({a,b,d:km(a,b)})));if(!candidates.length)continue;candidates.sort((x,y)=>x.d-y.d);for(const {a,b} of candidates.slice(0,kind==='sea'?1:2))add(a,b,kind)}
 return [...links.values()];
}
export const GRAND_ROUTES=grandRoutes();
export const GRAND_COUNT=GRAND_SITES.length;
export const LEGACY_COUNT=LEGACY_REGIONS.length;
