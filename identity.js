import {EURASIAN_FACTIONS} from './han/eurasia-data.js?v=han-2';

// Original game UI interpretations, not reconstructions of ancient national flags.
export const IDENTITIES = Object.freeze({
 caesar:{primary:'#863d32',accent:'#e1c78a',map:'#a34b3e',abbr:'CAES',motif:'discs'},
 senate:{primary:'#4e626a',accent:'#e8ddbb',map:'#73868c',abbr:'SEN',motif:'fasces'},
 egypt:{primary:'#326e70',accent:'#dfca83',map:'#5e9b91',abbr:'AEG',motif:'horn'},
 parthia:{primary:'#68475f',accent:'#dfbe86',map:'#956b84',abbr:'ARS',motif:'bow'},
 egypt_claimant:{primary:'#8b6941',accent:'#f0dab0',map:'#bd985c',abbr:'AEG·R',motif:'horn'},
 parthia_claimant:{primary:'#854f49',accent:'#efd4ae',map:'#b77664',abbr:'ARS·R',motif:'bow'},
 armenia:{primary:'#805c40',accent:'#e8c691',map:'#b18b64',abbr:'ARM',motif:'tiara'},
 numidia:{primary:'#80703d',accent:'#e6d29a',map:'#a99654',abbr:'NVM',motif:'spear'},
 mauretania:{primary:'#58684a',accent:'#d8d2a0',map:'#829466',abbr:'MAV',motif:'palm'},
 galatia:{primary:'#5d6845',accent:'#e3d39b',map:'#8c9a65',abbr:'GAL',motif:'shield'},
 bosporus:{primary:'#654b5b',accent:'#e8cd9e',map:'#ad8290',abbr:'BOS',motif:'grain'},
 // Original game emblem inspired by Han administrative seals; not a historical flag.
 han:{primary:'#725139',accent:'#e5c790',map:'#a77c50',abbr:'HAN',motif:'seal'},
 // Original oasis-route emblem; no surviving 49 BCE Shanshan flag is claimed.
 shanshan:{primary:'#62634c',accent:'#e4d3a1',map:'#93966b',abbr:'SHA',motif:'oasis'},
 huhanye:{primary:'#77613d',accent:'#e6ce97',map:'#a38a56',abbr:'HUX',motif:'horse'},
 zhizhi:{primary:'#533e37',accent:'#d7b893',map:'#806353',abbr:'ZHX',motif:'horse'},
 wusun:{primary:'#3f6f6a',accent:'#e4d5a4',map:'#64918a',abbr:'WUS',motif:'knot'},
 wusun_lesser:{primary:'#5d7964',accent:'#ead6a2',map:'#85a281',abbr:'WUL',motif:'knot'},
 kangju:{primary:'#684f71',accent:'#dec797',map:'#9176a0',abbr:'KAN',motif:'horse'},
 dayuan:{primary:'#856b37',accent:'#e8d19f',map:'#ad9255',abbr:'DAY',motif:'horse'},
 jushi:{primary:'#805039',accent:'#e4cb9a',map:'#ab7557',abbr:'JUS',motif:'oasis'},
 yanqi:{primary:'#77704c',accent:'#e2d29f',map:'#a69a68',abbr:'YAN',motif:'oasis'},
 qiuci:{primary:'#a66b40',accent:'#f0d49b',map:'#c88b5b',abbr:'QIU',motif:'oasis'},
 yutian:{primary:'#5c794c',accent:'#e5dca8',map:'#83a16b',abbr:'YUT',motif:'grain'},
 shache:{primary:'#72774d',accent:'#e2d49b',map:'#999d6b',abbr:'SHC',motif:'oasis'},
 shule:{primary:'#8a7150',accent:'#e9d3a4',map:'#b2996b',abbr:'SHU',motif:'oasis'},
 wujie:{primary:'#696a54',accent:'#e4d3a1',map:'#8d8c69',abbr:'WUJ',motif:'knot'},
 jiankun:{primary:'#536777',accent:'#d9d0aa',map:'#76899b',abbr:'JIA',motif:'knot'},
 qiang:{primary:'#795a49',accent:'#e5cd9b',map:'#a77a60',abbr:'QIA',motif:'knot'},
 han_loyalist:{primary:'#944834',accent:'#ead1a0',map:'#b7654b',abbr:'HLC',motif:'seal'},
 rival_court:{primary:'#8b6141',accent:'#e5cd9a',map:'#b58a60',abbr:'HRC',motif:'seal'},
 rebels:{primary:'#615044',accent:'#d2b99a',map:'#887360',abbr:'REB',motif:'bands'},
 shared:{primary:'#807a67',accent:'#d7cdb3',map:'#aea184',abbr:'ROM',motif:'discs'}
});
const motifs={
 seal:'<rect x="10" y="10" width="20" height="20" rx="1"/><path d="M15 15h10v10H15zM20 15v10M15 20h10"/>',
 oasis:'<path d="M7 27c6-3 11-3 17 0 4 2 7 2 10 0M7 31c6-3 11-3 17 0 4 2 7 2 10 0M20 24V11m0 4c-5-3-9-3-12 1m12-1c5-3 9-3 12 1m-12-1c-1-5-4-8-8-9m8 9c1-5 4-8 8-9"/>',
 discs:'<path d="M20 6v28M15 9h10M14 31h12"/><circle cx="20" cy="13" r="3"/><circle cx="20" cy="21" r="3"/><circle cx="20" cy="29" r="3"/>',
 fasces:'<path d="M14 8v25M17 7v26M20 6v27M23 7v26M26 8v25M12 13h16M12 26h16M13 34h14"/>',
 horn:'<path d="M10 11c1 12 5 18 16 21-3-5-2-9 4-15M10 11c6 0 12 3 20 6M12 15c4 1 8 3 12 5M15 21l6 4"/><circle cx="26" cy="13" r="2"/><circle cx="21" cy="11" r="2"/>',
 bow:'<path d="M13 7c15 5 15 21 0 26M13 7v26M7 20h26M28 16l5 4-5 4"/>',
 tiara:'<path d="M10 29l2-17 4 4 4-9 4 9 4-4 2 17zM11 29h18M15 24h10"/><circle cx="20" cy="20" r="2"/>',
 spear:'<path d="M20 6v28M17 11l3-5 3 5-3 3zM13 23h14M13 27h14"/>',
 palm:'<path d="M20 33V14M20 20c-1-7-6-9-10-10 1 5 4 8 10 10zm0 0c1-7 6-9 10-10-1 5-4 8-10 10zM15 33h10"/>',
 shield:'<path d="M20 6l9 4v11c0 6-4 10-9 13-5-3-9-7-9-13V10zM20 12v16M15 20h10"/>',
 grain:'<path d="M20 33V12M20 18c-5-1-7-4-7-7 5 0 7 3 7 7zm0 5c5-1 7-4 7-7-5 0-7 3-7 7zM15 33h10"/>',
 bands:'<path d="M10 13h20M10 20h20M10 27h20"/>',
 horse:'<path d="M10 30l3-12 5-7 7-3 5 5-3 5 2 9-5 4h-5l-2-6-4 5zM21 14l5 2M14 31h16"/>',
 knot:'<path d="M20 6l10 13-10 15L10 19zM10 19h20M20 6v28M13 13l14 13M27 13L13 26"/>'
};
const breakawayPalette=['#714b40','#4c6670','#706044','#53694e','#70546b','#796443','#496767','#815747'];
const breakawayDetails=['<path d="M8 32l5-5m14 0 5 5"/>','<path d="M7 31h7m12 0h7"/>','<path d="M9 30l4 3m14 0 4-3"/>','<circle cx="20" cy="34" r="2"/>'];
const hashId=id=>{let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0};
const validSavedKit=f=>!!f&&typeof f==='object'&&[f.primary,f.accent,f.map].every(c=>typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c))&&typeof f.abbr==='string'&&/^[A-Z0-9]{2,10}$/.test(f.abbr)&&Object.hasOwn(motifs,f.motif)&&Number.isInteger(f.detail)&&f.detail>=0&&f.detail<breakawayDetails.length&&Number.isInteger(f.cut)&&f.cut>=0&&f.cut<=2;
// Saved game artwork: a breakaway state keeps its origin's motif and receives
// a distinct field and device. This does not claim an attested ancient flag.
export function ensureBreakawayIdentity(s,id,parent){
 s.world.factionIdentities||={};
 if(validSavedKit(s.world.factionIdentities[id]))return s.world.factionIdentities[id];
 const origin=identity(parent,s),number=Number(String(id).split(':').at(-1))||hashId(id),index=hashId(id),primary=breakawayPalette[index%breakawayPalette.length];
 const kit={primary,accent:origin.accent,map:primary,abbr:`${origin.abbr.slice(0,2)}${number.toString(36).toUpperCase()}`,motif:origin.motif,detail:index%breakawayDetails.length,cut:index%3,origin:parent,reconstruction:true};
 s.world.factionIdentities[id]=kit;return kit;
}
const easternMotif={parthian:'bow',yuezhi:'knot',saka:'horse',sogdian:'oasis',western:'tiara',oasis:'oasis'};
const easternKits=Object.fromEntries(Object.entries(EURASIAN_FACTIONS).filter(([id])=>!IDENTITIES[id]).map(([id,f])=>[id,{primary:f.color,accent:'#e5d1a3',map:f.color,abbr:(id.replace(/[^a-z0-9]/g,'').slice(0,3)+hashId(id).toString(36).slice(-1)).toUpperCase(),motif:easternMotif[f.culture]||'oasis'}]));
export function identity(id,s){const saved=s?.world?.factionIdentities?.[id];return validSavedKit(saved)?saved:IDENTITIES[id]||easternKits[id]||IDENTITIES.shared}
const inspirations={
 caesar:['Roman Republican vexilla and legion standards','罗马共和国军旗与军团军标'],
 senate:['Roman Republican civic and military insignia','罗马共和国公民与军队徽记'],
 egypt:['Ptolemaic court ornament','托勒密宫廷纹饰'],
 egypt_claimant:['Ptolemaic court ornament, altered for a rival court','托勒密宫廷纹饰，按竞争宫廷改绘'],
 parthia:['Arsacid horse-archer and bow imagery','阿尔沙克王朝骑射与弓的意象'],
 parthia_claimant:['Arsacid bow imagery, altered for a rival court','阿尔沙克王朝弓的意象，按竞争宫廷改绘'],
 armenia:['Armenian royal headgear','亚美尼亚王室头饰'],
 numidia:['North African spear imagery','北非长矛意象'],
 mauretania:['North African palm imagery','北非棕榈意象'],
 galatia:['Anatolian shield imagery','安纳托利亚盾牌意象'],
 bosporus:['Black Sea grain imagery','黑海谷物意象'],
 han:['Han administrative seal imagery','汉代官印意象'],
 shanshan:['Oasis-route imagery','绿洲商路意象'],
 huhanye:['Xiongnu horse imagery, original game reconstruction','匈奴马匹意象，原创游戏重建'],
 zhizhi:['Xiongnu horse imagery, altered for the rival court','匈奴马匹意象，按对立部族改绘'],
 wusun:['Wusun steppe textile geometry, original game reconstruction','乌孙草原织纹意象，原创游戏重建'],
 wusun_lesser:['Wusun steppe textile geometry, altered for the lesser Kunmi','乌孙草原织纹意象，按小昆弥改绘'],
 kangju:['Steppe horse imagery, original game reconstruction','草原马匹意象，原创游戏重建'],
 dayuan:['Ferghana horse imagery, original game reconstruction','费尔干纳马匹意象，原创游戏重建'],
 rebels:['An improvised uprising standard','起义军临时军标'],
 shared:['A neutral game-map marker','游戏地图中立标记']
};
export function identityStory(id,s,lang='en'){
 const zh=lang==='zh',kit=identity(id,s),base=kit.origin||s?.world?.movements?.find(m=>m.force===id)?.parent||id;
 const culture=EURASIAN_FACTIONS[base]?.culture||(['jushi','yanqi','qiuci','yutian','shache','shule'].includes(base)?'oasis':['wujie','jiankun','qiang'].includes(base)?'saka':null);
 const easternInspiration={parthian:['Arsacid bow imagery','阿尔沙克王朝弓的意象'],yuezhi:['Central Asian textile geometry','中亚织纹意象'],saka:['Steppe horse imagery','草原马匹意象'],sogdian:['Oasis-route imagery','绿洲商路意象'],western:['Western Asian royal headgear','西亚王室头饰意象'],oasis:['Oasis-route imagery','绿洲商路意象']};
 const inspiration=inspirations[base]||easternInspiration[culture]||inspirations.shared;
 const adopted=!!kit.politicalOrigin,breakaway=!!kit.origin;
 return {
  inspiration:inspiration[zh?1:0],
  originFaction:breakaway&&!adopted?base:null,
  origin:adopted?(zh?'新政府沿用获胜运动的旗帜。':'The new government retained the victorious movement’s emblem.'):breakaway?(zh?'从原政治势力分立；在旧纹样上加入新图案。':'A breakaway power adapting its former political motif.'):zh?'现有政治传统的游戏标识。':'Game identity of the current political tradition.',
  provenance:zh?'原创游戏重建图案；不代表有文献证实的古代国旗。':'Original game reconstruction; not a documented ancient national flag.'
 };
}
export function factionMark(id,variant='insignia',s){
 const f=identity(id,s),art=motifs[f.motif]||motifs.bands,isBanner=variant==='banner',isStandard=variant==='standard';
 const shape=f.cut===1?'M4 4h32v29l-8-3-8 7-8-7-8 3z':f.cut===2?'M4 4h32v31l-16-6-16 6z':id==='parthia'?'M4 4h31l-6 13 6 17-15-3L4 37z':id==='egypt'?'M5 4h30v25L20 38 5 29z':id==='armenia'?'M5 4h30v31l-8-4-7 6-7-6-8 4z':'M4 4h32v29l-16 4L4 33z';
 const frame=isBanner||isStandard?`<path d="${shape}" fill="var(--identity-primary)" stroke="var(--identity-accent)" stroke-width="${isStandard?1.5:1.2}"/>`:'<circle cx="20" cy="20" r="18" fill="var(--identity-primary)" stroke="var(--identity-accent)" stroke-width="1.5"/>';
 return `<svg class="faction-mark faction-${variant}" viewBox="0 0 40 40" aria-hidden="true" style="--identity-primary:${f.primary};--identity-accent:${f.accent};color:${f.accent}">${frame}<g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${art}${Number.isInteger(f.detail)?breakawayDetails[f.detail]:''}</g></svg>`;
}
