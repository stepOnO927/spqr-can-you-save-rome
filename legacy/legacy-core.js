import {observeArmies} from '../character-system.js';
import {beginBriefing,updateObjectives} from '../campaign-reports.js?v=17';
import {achievementDefinition,campaignSummary} from '../achievement-system.js?v=5';
import {FACTIONS} from '../data.js?v=9';
import {ARTIFACTS} from './museum.js?v=14';
export const PROFILE_KEY='spqr-legacy-profile-v1';
export const BUILDINGS={curia:{name:['Curia','元老院'],price:0,position:[48,35],icon:'♜'},archive:{name:['Archive','档案馆'],price:0,position:[33,53],icon:'▤'},arch:{name:['Triumphal Arch','凯旋门'],price:0,position:[64,52],icon:'⌒'},camp:{name:['Military Camp','军营'],price:300,position:[16,31],icon:'⚑'},museum:{name:['Museum','博物馆'],price:350,position:[75,28],icon:'◈'},temple:{name:['Temple District','神庙区'],price:450,position:[31,16],icon:'♙'},circus:{name:['Circus of Mars','战车赛马场'],price:550,position:[78,71],icon:'◎',requires:'temple'},library:{name:['Library & Academy','图书馆与学院'],price:500,position:[48,68],icon:'▦'},harbor:{name:['Harbor Office','港务局'],price:450,position:[88,43],icon:'⚓'},court:{name:['Court','法庭'],price:400,position:[56,16],icon:'⚖'},intelligence:{name:['Intelligence Office','情报局'],price:500,position:[17,67],icon:'◉'},palace:{name:['State Residence','国政官邸'],price:1200,position:[50,7],icon:'♛'}};
export const GOODS={
 'banner-eagle':{category:'cosmetic',name:['Eagle standard','鹰旗纹样'],price:180},'theme-senate':{category:'cosmetic',name:['Senate parchment','元老院羊皮纸'],price:220},'race-blue':{category:'cosmetic',name:['Veneti racing blue','蓝队战车涂装'],price:240},'theme-harbor':{category:'cosmetic',name:['Foreign harbor awnings','异邦港口遮篷'],price:260,requires:'harbor'},
 'museum-figures':{category:'collection',name:['Great Figures gallery','伟人展厅'],price:250,requires:'museum'},'museum-ritual':{category:'collection',name:['Ritual gallery','祭仪展厅'],price:250,requires:'museum'},'museum-siege':{category:'collection',name:['Siege works collection','攻城工程馆藏'],price:270,requires:'museum'},
 'scenario-rubicon':{category:'scenario',name:['Rubicon under siege · alternate 49 BCE','卢比孔河危局 · 架空前49年'],price:900,requires:'archive'},
 'scenario-pharsalus':{category:'scenario',name:['Thessaly campaign · 48 BCE scenario','色萨利战役 · 前48年情景'],price:1100,requires:'palace'},
 'advisor-note':{category:'perk',name:['Opening scouting note','开局侦察提示'],price:280},'archive-capacity':{category:'perk',name:['Expanded archive index','扩充档案索引'],price:300},
 'curia-cases':{category:'minigame',name:['Curia: civic disputes','元老院：民事争议'],price:420,requires:'curia'},'race-festival':{category:'minigame',name:['Festival race day','节庆赛日'],price:650,requires:'circus'},'race-tight':{category:'minigame',name:['Narrow circuit','狭窄赛道'],price:600,requires:'circus'},'chronicle-gold':{category:'utility',name:['Gilded chronicle','镀金编年史'],price:240,requires:'archive'}
};
function normalizeCampDrill(value){
 if(!value||typeof value!=='object'||!['active','complete'].includes(value.status)||!Number.isInteger(value.stage)||value.stage<0||value.stage>3)return null;
 if(!Array.isArray(value.answers)||value.answers.length!==value.stage||value.answers.some(answer=>!Number.isInteger(answer)||answer<0||answer>2))return null;
 if(value.status==='active'&&value.stage===3||value.status==='complete'&&value.stage!==3)return null;
 const score=value.answers.reduce((total,answer)=>total+2-answer,0),grade=score>=5?'careful':score>=3?'mixed':'poor';
 return {...value,answers:[...value.answers],...(value.status==='complete'?{score,grade,coinsClaimed:value.coinsClaimed===50?50:0}:{})};
}
function normalizeTriumphs(profile){
 const records=[],seen=new Map();
 const add=(record,fallback=false)=>{
  if(!record||typeof record.id!=='string'||!record.id)return;
  if(!fallback&&!FACTIONS[record.faction])return;
  const clean={id:record.id,faction:FACTIONS[record.faction]?record.faction:'unknown',year:Number.isInteger(record.year)?record.year:null,month:Number.isInteger(record.month)&&record.month>=1&&record.month<=12?record.month:null,territories:Number.isInteger(record.territories)&&record.territories>=0?record.territories:null,method:['military','settlement'].includes(record.method)?record.method:null,scenario:typeof record.scenario==='string'?record.scenario:null};
  const index=seen.get(record.id);
  if(index!==undefined){if(records[index].faction==='unknown'&&clean.faction!=='unknown')records[index]=clean;return}
  seen.set(record.id,records.length);records.push(clean);
 };
 for(const record of Array.isArray(profile.triumphs)?profile.triumphs:[])add(record);
 for(const record of Array.isArray(profile.archive)?profile.archive:[])if(record?.result==='victory')add({...record,method:record.summary?.method});
 for(const award of Array.isArray(profile.achievements)?profile.achievements:[])if(award?.id==='victory'&&award.claimed&&typeof award.runId==='string')add({id:award.runId},true);
 return records;
}
const initial=()=>({version:2,coins:150,buildings:['curia','archive','arch'],purchases:[],rewards:['founder-grant'],achievements:[],collectibles:[],featuredArtifacts:[],archive:[],triumphs:[],titles:[],decisions:[],activities:[],campDrill:null,campDrillBest:0,campDrillRuns:0,templeFestival:null,intelligenceDossiers:[],legalCases:[],palaceCouncils:[],harborTradeReports:[],harborEvents:[],politics:{people:50,senate:50,aristocrats:50,corruption:20,reputation:50},race:{runs:0,wins:0,best:99,eliminated:[],champions:[]},theme:'default',banner:'classic',raceColor:'gold',scenario:null});
export function normalizeProfile(value){const base=initial(),p=value&&typeof value==='object'?value:{};return {...base,...p,version:2,coins:Math.max(0,Number(p.coins??base.coins)||0),buildings:[...new Set([...base.buildings,...(Array.isArray(p.buildings)?p.buildings:[])])].filter(x=>BUILDINGS[x]),purchases:[...new Set(Array.isArray(p.purchases)?p.purchases:[])].filter(x=>GOODS[x]),rewards:[...new Set([...base.rewards,...(Array.isArray(p.rewards)?p.rewards:[])])],achievements:Array.isArray(p.achievements)?p.achievements:[],collectibles:[...new Set(Array.isArray(p.collectibles)?p.collectibles:[])],featuredArtifacts:[...new Set(Array.isArray(p.featuredArtifacts)?p.featuredArtifacts:[])].filter(id=>Array.isArray(p.collectibles)&&p.collectibles.includes(id)&&ARTIFACTS.some(item=>item.id===id)).slice(0,3),archive:Array.isArray(p.archive)?p.archive:[],triumphs:normalizeTriumphs(p),titles:Array.isArray(p.titles)?p.titles:[],decisions:Array.isArray(p.decisions)?p.decisions:[],activities:Array.isArray(p.activities)?p.activities:[],campDrill:normalizeCampDrill(p.campDrill),campDrillBest:Number.isInteger(p.campDrillBest)?Math.max(0,Math.min(6,p.campDrillBest)):0,campDrillRuns:Number.isInteger(p.campDrillRuns)?Math.max(0,p.campDrillRuns):0,intelligenceDossiers:Array.isArray(p.intelligenceDossiers)?p.intelligenceDossiers:[],legalCases:Array.isArray(p.legalCases)?p.legalCases:[],palaceCouncils:Array.isArray(p.palaceCouncils)?p.palaceCouncils:[],harborTradeReports:Array.isArray(p.harborTradeReports)?p.harborTradeReports:[],harborEvents:Array.isArray(p.harborEvents)?p.harborEvents:[],banner:p.banner==='eagle'&&Array.isArray(p.purchases)&&p.purchases.includes('banner-eagle')?'eagle':'classic',raceColor:p.raceColor==='blue'&&Array.isArray(p.purchases)&&p.purchases.includes('race-blue')?'blue':'gold',politics:{...base.politics,...p.politics},race:{...base.race,...p.race,eliminated:Array.isArray(p.race?.eliminated)?p.race.eliminated:[],champions:Array.isArray(p.race?.champions)?p.race.champions:[]}}}
export function loadProfile(storage=globalThis.localStorage){try{return normalizeProfile(JSON.parse(storage.getItem(PROFILE_KEY)))}catch{return initial()}}
export function saveProfile(profile,storage=globalThis.localStorage){storage.setItem(PROFILE_KEY,JSON.stringify(normalizeProfile(profile)))}
export function exportProfile(profile){return JSON.stringify({kind:'spqr-legacy-profile',version:2,profile:normalizeProfile(profile)},null,2)}
export function importProfile(text){if(typeof text!=='string'||text.length>2_000_000)throw Error('invalid profile file');const file=JSON.parse(text);if(file?.kind!=='spqr-legacy-profile'||!file.profile||typeof file.profile!=='object'||Array.isArray(file.profile))throw Error('invalid profile file');return normalizeProfile(file.profile)}
export function claimReward(profile,key,amount){if(profile.rewards.includes(key))return false;profile.rewards.push(key);profile.coins+=amount;return true}
export function applyCosmetic(profile,id){if(id==='banner-classic'){profile.banner='classic';return true}if(id==='race-gold'){profile.raceColor='gold';return true}if(!profile.purchases.includes(id)||GOODS[id]?.category!=='cosmetic')return false;if(id==='theme-senate')profile.theme='senate';if(id==='theme-harbor')profile.theme='harbor';if(id==='banner-eagle')profile.banner='eagle';if(id==='race-blue')profile.raceColor='blue';return true}
export function purchase(profile,id){const item=BUILDINGS[id]||GOODS[id];if(!item)return {ok:false,reason:'unknown'};const collection=BUILDINGS[id]?'buildings':'purchases';if(profile[collection].includes(id))return {ok:false,reason:'owned'};if(item.requires&&!profile.buildings.includes(item.requires))return {ok:false,reason:'requires'};if(profile.coins<item.price)return {ok:false,reason:'coins'};profile.coins-=item.price;profile[collection].push(id);if(id==='museum')profile.collectibles.push('senate-tablet');if(id==='camp')profile.collectibles.push('legion-sword');if(id==='museum-figures')profile.collectibles.push('cato-bust');if(id==='museum-ritual')profile.collectibles.push('votive-lamp');if(id==='museum-siege')profile.collectibles.push('massilia-tower');applyCosmetic(profile,id);return {ok:true}}
export function recordCampaign(profile,state){
 if(!state?.achievementState?.finalized||!state.factions?.[state.player])return [];
 const id=state.legacyRunId||`legacy-${state.player}-${state.startYear??-49}-${state.startMonth??1}`;profile.achievements||=[];const done=[];
 for(const [achievementId,record] of Object.entries(state.achievementState.completed)){
  const definition=achievementDefinition(achievementId);if(!definition)continue;
  const key=`campaign:${id}:${achievementId}`,already=profile.achievements.some(a=>a.key===key);
  if(already)continue;
  const coins=achievementId==='victory'&&state.difficulty!=='standard'?350:definition.coins;
  const awarded=claimReward(profile,key,coins);
  profile.achievements.push({key,id:achievementId,runId:id,category:definition.category,year:record.year,month:record.month,turn:record.turn,evidence:record.evidence,coins:awarded?coins:0,claimed:profile.rewards.includes(key)});
  if(awarded)done.push(achievementId);
  if(definition.collectible)profile.collectibles.push(definition.collectible);
  if(achievementId==='victory'){profile.collectibles.push(state.player==='caesar'?'caesar-bust':'pompey-coin');profile.titles.push(state.player==='caesar'?'Caesarian Victor':'Senatorial Defender')}
  if(achievementId==='challenge')profile.titles.push(state.legacyScenario==='scenario-pharsalus'?'Thessaly Victor':'Rubicon Survivor');
 }
 const ownBattles=(state.battles||[]).filter(b=>b.attacker?.owner===state.player||b.defender?.owner===state.player);
 const battleHistory=ownBattles.slice(-80).map(b=>{
  const attacking=b.attacker?.owner===state.player;
  return {year:Number.isFinite(b.year)?b.year:null,month:Number.isFinite(b.month)?b.month:null,region:b.region??null,attacker:b.attacker?.owner??null,defender:b.defender?.owner??null,winner:(b.attackerWins?b.attacker?.owner:b.defender?.owner)??null,casualties:Math.max(0,Number(attacking?b.lossA:b.lossD)||0),commander:(attacking?b.attacker?.commander:b.defender?.commander)??null};
 });
 const savedSummary=state.achievementState.summary;
 const highlights=savedSummary&&(savedSummary.conquests===undefined||savedSummary.worstBattle===undefined)?campaignSummary(state):null;
 const summary=savedSummary?JSON.parse(JSON.stringify({...savedSummary,conquests:savedSummary.conquests??highlights?.conquests,worstBattle:savedSummary.worstBattle===undefined?highlights?.worstBattle:savedSummary.worstBattle})):null;
 const existing=profile.archive.find(a=>a.id===id);
 if(!existing){profile.archive.unshift({id,year:state.achievementState.endedAt.year,month:state.achievementState.endedAt.month,result:state.achievementState.result,faction:state.player,territories:state.regions.filter(r=>r.owner===state.player).length,battles:ownBattles.length,battleHistory,summary,notable:ownBattles.slice(-4).map(b=>({region:b.region,winner:b.attackerWins?b.attacker?.owner:b.defender?.owner}))});profile.archive=profile.archive.slice(0,profile.purchases.includes('archive-capacity')?100:50)}
 else if(summary&&(!['caesar','senate'].includes(state.player)||existing.summary?.conquests===undefined)){
  existing.summary=summary;
  existing.battles=ownBattles.length;
  existing.notable=ownBattles.slice(-4).map(b=>({region:b.region,winner:b.attackerWins?b.attacker?.owner:b.defender?.owner}));
 }
 if(existing&&(!Array.isArray(existing.battleHistory)||ownBattles.length>80&&existing.battleHistory.length===80&&JSON.stringify(existing.battleHistory)!==JSON.stringify(battleHistory)))existing.battleHistory=battleHistory;
 if(state.achievementState.result==='victory'){
  profile.triumphs ||= [];
  const record={id,faction:state.player,year:state.achievementState.endedAt.year,month:state.achievementState.endedAt.month,territories:state.regions.filter(r=>r.owner===state.player).length,method:summary?.method==='settlement'?'settlement':'military',scenario:state.legacyScenario||null};
  const old=profile.triumphs.findIndex(item=>item.id===id);
  if(old<0)profile.triumphs.unshift(record);
  else if(profile.triumphs[old].faction==='unknown')profile.triumphs[old]=record;
 }
 profile.collectibles=[...new Set(profile.collectibles)];profile.titles=[...new Set(profile.titles)];return done;
}
export function createScenario(id,createGrand){
 if(!['scenario-rubicon','scenario-pharsalus'].includes(id))return null;
 const s=createGrand(id==='scenario-pharsalus'?'caesar':'senate');
 s.legacyScenario=id;s.difficulty='standard';
 if(id==='scenario-rubicon'){
  s.scenarioLabel=['Rubicon under siege (alternate history)','卢比孔河危局（架空历史）'];
  s.factions.senate.treasury=Math.max(10,s.factions.senate.treasury-30);
  s.factions.senate.food=Math.max(10,s.factions.senate.food-12);
  // In this alternate opening Caesar already holds northern Italy. The Senate's
  // levies have withdrawn to Arretium, leaving a playable front before Rome.
  const northernItaly=s.regions.find(r=>r.id==='italiaN');
  const arretineLine=s.regions.find(r=>r.site?.[0]==='Arretium');
  if(northernItaly&&arretineLine){
   northernItaly.owner='caesar';
   const caesarian=s.armies.find(a=>a.id==='xiii'),levies=s.armies.find(a=>a.id==='italy');
   if(caesarian){caesarian.region=northernItaly.id;caesarian.move=null}
   if(levies){levies.region=arretineLine.id;levies.move=null}
  }
 }else{
  s.year=-48;s.month=6;s.startYear=-48;s.startMonth=6;
  s.scenarioLabel=['Thessaly campaign · historically inspired, alternate deployment','色萨利战役 · 历史背景启发的架空部署'];
  const landing=s.regions.find(r=>r.site?.[0]==='Apollonia'),field=s.regions.find(r=>r.site?.[0]==='Larissa');
  if(landing&&field){
   landing.owner='caesar';
   const caesarian=s.armies.find(a=>a.id==='xiii'),pompeian=s.armies.find(a=>a.id==='pompey');
   if(caesarian){caesarian.region=landing.id;caesarian.move=null}
   if(pompeian){pompeian.region=field.id;pompeian.move=null}
  }
 }
 for(const targets of Object.values(s.knowledge))for(const knowledge of Object.values(targets))knowledge.sightings={};
 observeArmies(s);
 updateObjectives(s,true);
 s.briefingBaseline=beginBriefing(s);
 return s;
}
