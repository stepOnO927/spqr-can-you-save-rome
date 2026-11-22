// Names of Legend: campaign reputations are earned from dated, public actions.
// The historical catalog is never rewritten. All generated identities live in the save.
import {CHARACTER_CATALOG} from './characters.js?v=archived-leads-1';
import {fictionalPortraitKey} from './portrait-registry.js?v=archived-leads-1';

const roman={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,XII:12,XIII:13,XIV:14,XV:15};
const numerals=Object.fromEntries(Object.entries(roman).map(([key,value])=>[value,key]));
const month=(s)=>s.year*12+s.month;
const pair=(en,zh)=>[en,zh];
const own=(s,id)=>s.world?.characters?.[id]?.faction;
const entry=(s,id)=>s.world?.dynasties?.catalog?.[id]||CHARACTER_CATALOG[id];
const historical=id=>!String(id).startsWith('fictional:');
const sovereign=(s,faction)=>['egypt','parthia','armenia','numidia','galatia','bosporus','mauretania'].includes(faction)||(['caesar','senate'].includes(faction)&&['roman_principate','later_empire'].includes(s.world?.romanRegimes?.[faction]));
const courtNames={
 armenia:[{name:pair('Aram of Artaxata','阿尔塔克萨塔的阿拉姆'),base:pair('Aram','阿拉姆')},{name:pair('Vahan of Ararat','阿拉拉特的瓦汉'),base:pair('Vahan','瓦汉')}],
 numidia:[{name:pair('Iarbas of Cirta','奇尔塔的伊阿尔巴斯'),base:pair('Iarbas','伊阿尔巴斯')},{name:pair('Mattan of Cirta','奇尔塔的马坦'),base:pair('Mattan','马坦')}],
 galatia:[{name:pair('Brennos of Ancyra','安基拉的布伦诺斯'),base:pair('Brennos','布伦诺斯')},{name:pair('Deon of Ancyra','安基拉的德翁'),base:pair('Deon','德翁')}],
 bosporus:[{name:pair('Dynamis of Pantikapaion','潘提卡帕伊翁的狄娜米斯'),base:pair('Dynamis','狄娜米斯')},{name:pair('Dion of Pantikapaion','潘提卡帕伊翁的狄翁'),base:pair('Dion','狄翁')}]
};
// Cross-era references are explicitly fictional, rare, and confined to new court nominees.
const homages={
 armenia:[{name:pair('Baldwin of Artaxata','阿尔塔克萨塔的鲍德温'),base:pair('Baldwin','鲍德温'),reference:'Baldwin IV',era:'medieval'}],
 galatia:[{name:pair('Alexander of Ancyra','安基拉的亚历山大'),base:pair('Alexander','亚历山大'),reference:'Alexander the Great',era:'classical'}],
 numidia:[{name:pair('Richard of Cirta','奇尔塔的理查德'),base:pair('Richard','理查德'),reference:'Richard I',era:'medieval'}],
 bosporus:[{name:pair('Frederick of Pantikapaion','潘提卡帕伊翁的腓特烈'),base:pair('Frederick','腓特烈'),reference:'Frederick I Barbarossa',era:'medieval'}]
};
export function initializeLegend(s){
 s.world||={};const x=s.world.legend||={mode:'historical',frequency:.015,reigns:[],reputations:{},evidence:[],nextEvidence:1,seenBattles:[]};
 if(!['historical','homage'].includes(x.mode))x.mode='historical';
 if(!Number.isFinite(x.frequency)||x.frequency<0||x.frequency>1)x.frequency=.015;
 x.reigns||=[];x.reputations||={};x.evidence||=[];x.nextEvidence||=1;x.seenBattles||=[];
 return x;
}
export function setLegendMode(s,mode){if(!['historical','homage'].includes(mode))return false;initializeLegend(s).mode=mode;return true}
export function courtNomineeName(s,faction,serial,random){
 const x=initializeLegend(s),pool=courtNames[faction];if(!pool)return null;
 const homage=x.mode==='homage'&&homages[faction]?.length&&random()<x.frequency;
 const choices=homage?homages[faction]:pool,chosen=choices[(Math.max(1,serial)-1)%choices.length];
 const used=new Set(Object.values(s.world?.dynasties?.catalog||{}).map(c=>c.name?.[0]));
 const suffix=used.has(chosen.name[0])?` (${serial})`:'';
 return {name:pair(chosen.name[0]+suffix,chosen.name[1]+(suffix?`（${serial}）`:'')),regnalName:[...chosen.base],homage:homage?{fictional:true,reference:chosen.reference,crossEra:chosen.era==='medieval',origin:'optional_homage'}:null,appearance:faction==='bosporus'&&serial%4===2?{redBeard:true,verifiedPortrait:'fictional-legend-redbeard'}:null};
}
const jurisdiction=(s,faction,id)=>{
 if(!sovereign(s,faction))return null;
 if(faction==='mauretania')return Object.entries(s.world?.constituentSeats?.mauretania||{}).find(([,holder])=>holder===id)?.[0]?`mauretania:${Object.entries(s.world.constituentSeats.mauretania).find(([,holder])=>holder===id)[0]}`:null;
 return faction;
};
const regnalBase=(s,id)=>{
 const c=entry(s,id);if(c?.regnalName)return [...c.regnalName];
 if(!historical(id)||!c?.name?.[0])return null;
 const match=c.name[0].match(/^(.+?)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)$/);
 return match?pair(match[1],c.name[1].replace(/[一二三四五六七八九十]+世$/,'')):null;
};
const historicalNumber=(s,id)=>{const m=entry(s,id)?.name?.[0]?.match(/\s+(XIV|XIII|XII|XI|XV|IX|VIII|VII|VI|IV|III|II|I|X|V)$/);return m?roman[m[1]]||null:null};
export function advanceRegnalHistory(s){
 const x=initializeLegend(s),active=new Set();
 for(const [faction,ids] of Object.entries(s.world.leadership||{}))for(const id of ids){
  const c=s.world.characters[id],j=jurisdiction(s,faction,id);if(!c?.alive||c.faction!==faction||!j)continue;
  const key=`${j}:${id}`,existing=x.reigns.find(r=>r.key===key&&r.end==null);if(existing){active.add(key);continue}
  const base=regnalBase(s,id),prior=x.reigns.filter(r=>r.jurisdiction===j&&base&&r.regnalName?.[0]===base[0]);
  const n=historical(id)?historicalNumber(s,id):base?Math.max(0,...prior.map(r=>r.number||0))+1:null;
  const r={key,id,faction,jurisdiction:j,regnalName:base,number:n,title:pair(faction==='parthia'?'Arsacid king':faction==='egypt'?'Ptolemaic ruler':'Ruler',faction==='parthia'?'阿尔沙克国王':faction==='egypt'?'托勒密统治者':'统治者'),dynasty:c.familyId||null,start:{year:s.year,month:s.month},end:null,origin:historical(id)?'documented':'fictional',predecessors:prior.map(p=>p.id)};
  x.reigns.push(r);active.add(key);
 }
 for(const r of x.reigns)if(r.end==null&&!active.has(r.key))r.end={year:s.year,month:s.month};
 return x.reigns;
}
export const EPITHETS={
 saint:{name:pair('The Saint','圣人'),kinds:{mercy:3,patronage:1},rank:90},
 executioner:{name:pair('The Executioner','刽子手'),kinds:{execution:2},rank:88},
 ambitionist:{name:pair('The Ambitionist','野心家'),kinds:{power_bid:3},rank:74},
 wolf:{name:pair('The Wolf','狼'),kinds:{maneuver:3},rank:79},
 redbeard:{name:pair('The Redbeard','红胡子'),kinds:{appearance_redbeard:1},rank:55},
 mad:{name:pair('The Mad','疯子'),kinds:{public_erratic:3},rank:45,contested:true},
 great:{name:pair('The Great','伟大者'),kinds:{battle_victory:5},rank:86},
 conqueror:{name:pair('The Conqueror','征服者'),kinds:{battle_victory:3,conquest:2},rank:85},
 unconquered:{name:pair('The Unconquered','不败者'),kinds:{battle_victory:3},rank:70},
 defender:{name:pair('The Defender','守护者'),kinds:{defense_victory:2},rank:72},
 lion:{name:pair('The Lion','雄狮'),kinds:{battle_victory:3},rank:69},
 eagle:{name:pair('The Eagle','雄鹰'),kinds:{battle_victory:2},rank:60},
 unfortunate:{name:pair('The Unfortunate','不幸者'),kinds:{battle_defeat:3},rank:35},
 just:{name:pair('The Just','公正者'),kinds:{fair_ruling:2},rank:67},
 merciful:{name:pair('The Merciful','仁慈者'),kinds:{mercy:2},rank:68},
 tyrant:{name:pair('The Tyrant','暴君'),kinds:{severe_rule:3},rank:77},
 reformer:{name:pair('The Reformer','改革者'),kinds:{reform:2},rank:67},
 usurper:{name:pair('The Usurper','篡位者'),kinds:{usurpation:1},rank:78},
 cunning:{name:pair('The Cunning','智谋者'),kinds:{maneuver:2},rank:59},
 iron_handed:{name:pair('The Iron-Handed','铁腕者'),kinds:{forced_levy:2},rank:64},
 builder:{name:pair('The Builder','营造者'),kinds:{public_work:3},rank:65},
 scholar:{name:pair('The Scholar','学者'),kinds:{scholarship:3},rank:64},
 patron:{name:pair('The Patron','庇护者'),kinds:{patronage:2},rank:63},
 generous:{name:pair('The Generous','慷慨者'),kinds:{generosity:3},rank:62},
 miser:{name:pair('The Miser','吝啬者'),kinds:{stinginess:3},rank:48},
 roadmaker:{name:pair('The Roadmaker','修路者'),kinds:{road_work:2},rank:66},
 tall:{name:pair('The Tall','高个子'),kinds:{appearance_tall:1},rank:40},
 short:{name:pair('The Short','矮个子'),kinds:{appearance_short:1},rank:40},
 one_eyed:{name:pair('The One-Eyed','独眼者'),kinds:{appearance_one_eye:1},rank:43},
 silent:{name:pair('The Silent','寡言者'),kinds:{public_silence:3},rank:40},
 destroyer:{name:pair('The Destroyer','毁灭者'),kinds:{public_devastation:2},rank:80}
};
export function recordLegendEvidence(s,id,kind,{reference=null,audiences=null,publicEvent=true,detail=null}={}){
 if(!s.world?.characters?.[id]||!EPITHETS||typeof kind!=='string')return null;
 if(kind.startsWith('appearance_')&&(!entry(s,id)?.appearance?.verifiedPortrait||fictionalPortraitKey(s,id)!==entry(s,id).appearance.verifiedPortrait))return null;
 if(kind==='appearance_redbeard'&&entry(s,id)?.appearance?.redBeard!==true)return null;
 const x=initializeLegend(s),faction=own(s,id),knownBy=[...new Set((audiences||[faction]).filter(a=>a&&s.factions?.[a]))];
 const duplicate=x.evidence.find(e=>e.characterId===id&&e.kind===kind&&reference!=null&&e.reference===reference);if(duplicate)return duplicate;
 const e={id:x.nextEvidence++,characterId:id,kind,year:s.year,month:s.month,reference,knownBy,public:!!publicEvent,detail:detail&&Array.isArray(detail)?detail:null};x.evidence.push(e);return e;
}
const visibleEvidence=(s,id,audience)=>initializeLegend(s).evidence.filter(e=>e.characterId===id&&e.public&&e.knownBy.includes(audience));
function claim(s,id,audience,key,support){
 const x=initializeLegend(s),bucket=x.reputations[id]||={},names=bucket[audience]||=[];
 if(names.some(n=>n.key===key))return;
 const def=EPITHETS[key],person=entry(s,id)?.name||[id,id],origin=historical(id)?'alternate_campaign':'fictional_campaign';
 const report={key,audience,year:s.year,month:s.month,origin,posthumous:!s.world.characters[id].alive,contested:!!def.contested,support:support.map(e=>e.id)};
 names.push(report);
 if(audience===s.player&&own(s,id)===s.player){
  const en=`In this campaign, ${person[0]} became known as ${def.name[0]} after ${support.length} recorded public actions.`;
  const zh=`本局中，${person[1]}因${support.length}项有记录的公开行动而被称为“${def.name[1]}”。`;
  (s.world.dynasties.lives[id]||=[]).push({year:s.year,month:s.month,en,zh,simulated:true,legend:{audience,key,support:report.support,origin}});
 }
}
export function evaluateLegend(s){
 const x=initializeLegend(s),audiences=Object.keys(s.factions||{});
 for(const id of Object.keys(s.world.characters||{}))for(const audience of audiences){
  const known=visibleEvidence(s,id,audience);if(!known.length)continue;
  for(const [key,def] of Object.entries(EPITHETS)){
   const support=Object.entries(def.kinds).flatMap(([kind,count])=>known.filter(e=>e.kind===kind).slice(0,count));
   if(support.length===Object.values(def.kinds).reduce((a,b)=>a+b,0))claim(s,id,audience,key,support);
  }
 }
 return x.reputations;
}
export function advanceLegend(s){
 const x=initializeLegend(s);advanceRegnalHistory(s);
 for(const b of s.battles||[]){if(!b.id||x.seenBattles.includes(b.id))continue;x.seenBattles.push(b.id);
  for(const side of ['attacker','defender']){const army=b[side],id=army?.characterId;if(!id||!s.world.characters[id])continue;
   const won=side==='attacker'?b.attackerWins:!b.attackerWins,kind=won?'battle_victory':'battle_defeat';
   recordLegendEvidence(s,id,kind,{reference:`${b.id}:${side}`,audiences:[army.owner,b[side==='attacker'?'defender':'attacker']?.owner],detail:pair(`${won?'Won':'Lost'} the battle at ${b.region}.`,`在${b.region}${won?'获胜':'战败'}。`)});
   if(won&&side==='defender')recordLegendEvidence(s,id,'defense_victory',{reference:`${b.id}:defense`,audiences:[army.owner]});
   if(won&&side==='attacker'&&b.lossD>=1000)recordLegendEvidence(s,id,'conquest',{reference:`${b.id}:conquest`,audiences:[army.owner]});
   if(won&&b[side==='attacker'?'defender':'attacker']?.owner&&b[side==='attacker'?'defender':'attacker'].owner!==army.owner&&Math.max(b.lossA||0,b.lossD||0)>=1500)recordLegendEvidence(s,id,'public_devastation',{reference:`${b.id}:devastation`,audiences:[b[side==='attacker'?'defender':'attacker'].owner]});
  }
 }
 evaluateLegend(s);return x;
}
export function earnedEpithets(s,id,audience=s.player){const x=initializeLegend(s),claims=x.reputations[id]?.[audience]||[];return [...claims].sort((a,b)=>(EPITHETS[b.key]?.rank||0)-(EPITHETS[a.key]?.rank||0)||a.year-b.year||a.month-b.month)}
export function regnalRecord(s,id){return initializeLegend(s).reigns.findLast(r=>r.id===id)||null}
export function legendName(s,id,lang='en',audience=s.player,{formal=false}={}){
 const i=lang==='zh'?1:0,c=entry(s,id),base=c?.name?.[i]||id,r=regnalRecord(s,id);
 const numbered=r?.number&&!historical(id)&&r.regnalName?`${base}${lang==='zh'?`（${r.number}世）`:` ${numerals[r.number]||r.number}`}`:base;
 const epithet=formal?null:earnedEpithets(s,id,audience)[0];
 if(!epithet)return numbered;
 const title=EPITHETS[epithet.key]?.name?.[i];if(!title)return numbered;
 if(lang==='zh')return `${numbered}·${title}`;
 const culture=own(s,id),romanCulture=['caesar','senate'].includes(culture);
 return romanCulture?`${numbered} (${title})`:`${numbered}, ${title}`;
}
export function legendDossier(s,id,audience=s.player){
 const c=entry(s,id),r=regnalRecord(s,id),claims=earnedEpithets(s,id,audience),evidence=visibleEvidence(s,id,audience),honors=initializeLegend(s).honors?.filter(h=>h.characterId===id)||[];
 return {name:c?.name||[id,id],origin:c?.homage?'fictional_homage':historical(id)?'historical':'fictional',homage:c?.homage||null,regnal:r,principal:claims[0]||null,others:claims.slice(1),evidence:evidence.filter(e=>claims[0]?.support?.includes(e.id)),honors};
}
export function grantLegendHonor(s,id,kind){
 const c=s.world?.characters?.[id],x=initializeLegend(s);if(!c||c.faction!==s.player||!c.alive||c.missing)return {ok:false,reason:'authority'};
 if(!['military','commemorative'].includes(kind))return {ok:false,reason:'kind'};
 const evidence=visibleEvidence(s,id,s.player),required=kind==='military'?'battle_victory':null;
 if(required&&!evidence.some(e=>e.kind===required)||kind==='commemorative'&&evidence.length<2)return {ok:false,reason:'evidence'};
 if((s.factions[s.player]?.treasury||0)<5)return {ok:false,reason:'treasury'};
 x.honors||=[];if(x.honors.some(h=>h.characterId===id&&h.kind===kind))return {ok:false,reason:'already'};
 s.factions[s.player].treasury-=5;c.influence=Math.min(100,(c.influence||0)+2);c.loyalty=Math.min(100,(c.loyalty||0)+2);
 const h={characterId:id,kind,grantor:s.player,year:s.year,month:s.month,cost:5,evidence:evidence.slice(-3).map(e=>e.id)};x.honors.push(h);
 const en=kind==='military'?'Received a formal military honor for recorded campaign service.':'Received an official commemorative honor for recorded public service.';
 const zh=kind==='military'?'因有记录的战役服役获授正式军功荣誉。':'因有记录的公共服务获授正式纪念荣誉。';
 (s.world.dynasties.lives[id]||=[]).push({year:s.year,month:s.month,en,zh,simulated:true,legendHonor:h});return {ok:true,honor:h};
}

