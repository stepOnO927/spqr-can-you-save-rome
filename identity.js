// Original game UI interpretations, not reconstructions of ancient national flags.
export const IDENTITIES = Object.freeze({
 caesar:{primary:'#863d32',accent:'#e1c78a',map:'#a34b3e',abbr:'CAES',motif:'discs'},
 senate:{primary:'#4e626a',accent:'#e8ddbb',map:'#73868c',abbr:'SEN',motif:'fasces'},
 egypt:{primary:'#326e70',accent:'#dfca83',map:'#5e9b91',abbr:'AEG',motif:'horn'},
 parthia:{primary:'#68475f',accent:'#dfbe86',map:'#956b84',abbr:'ARS',motif:'bow'},
 egypt_claimant:{primary:'#8b6941',accent:'#f0dab0',map:'#bd985c',abbr:'AEG·R',motif:'horn',origin:'egypt'},
 parthia_claimant:{primary:'#854f49',accent:'#efd4ae',map:'#b77664',abbr:'ARS·R',motif:'bow',origin:'parthia'},
 caesar_claimant:{primary:'#755347',accent:'#efd4ab',map:'#a97058',abbr:'CAES·R',motif:'discs',seal:'ring',origin:'caesar'},
 senate_claimant:{primary:'#64606b',accent:'#e6d4b2',map:'#877e8e',abbr:'SEN·R',motif:'fasces',seal:'split',origin:'senate'},
 armenia:{primary:'#805c40',accent:'#e8c691',map:'#b18b64',abbr:'ARM',motif:'tiara'},
 numidia:{primary:'#80703d',accent:'#e6d29a',map:'#a99654',abbr:'NVM',motif:'spear'},
 mauretania:{primary:'#58684a',accent:'#d8d2a0',map:'#829466',abbr:'MAV',motif:'palm'},
 galatia:{primary:'#5d6845',accent:'#e3d39b',map:'#8c9a65',abbr:'GAL',motif:'shield'},
 bosporus:{primary:'#654b5b',accent:'#e8cd9e',map:'#ad8290',abbr:'BOS',motif:'grain'},
 rebels:{primary:'#615044',accent:'#d2b99a',map:'#887360',abbr:'REB',motif:'bands'},
 shared:{primary:'#807a67',accent:'#d7cdb3',map:'#aea184',abbr:'ROM',motif:'discs'}
});
export const IDENTITY_STORIES=Object.freeze({
 caesar:['Roman legionary discs and vexilla inspire this original Caesarian command mark.','这款凯撒派原创标识借鉴罗马军团圆饰与军旗。'],
 senate:['Republican fasces inspire the Senate and Pompeian command mark.','元老院与庞培派标识借鉴共和国执政官束棒。'],
 egypt:['Ptolemaic coin imagery, including the cornucopia, inspires this original court emblem.','这款宫廷徽记借鉴托勒密钱币中的丰饶角等图像。'],
 parthia:['Arsacid archer and bow imagery inspires this original pennant.','这款原创三角旗借鉴安息王朝射手与弓的图像。'],
 armenia:['Royal tiara imagery on Armenian coinage inspires this original emblem.','这款原创徽记借鉴亚美尼亚钱币上的王冠图像。'],
 numidia:['A spear and North African field colors provide a general game identity; no specific Numidian flag is claimed.','长矛与北非色彩构成游戏标识，不代表已证实的努米底亚旗帜。'],
 mauretania:['A palm recalls North African landscapes; this is an original game emblem.','棕榈图案呼应北非景观；这是一款原创游戏徽记。'],
 galatia:['A geometric shield recalls the region’s martial traditions without copying a later coat of arms.','几何盾形呼应当地军事传统，没有沿用后世纹章。'],
 bosporus:['A grain stalk evokes Black Sea commerce in this original game emblem.','谷穗呼应黑海贸易，是原创游戏徽记。'],
 rebels:['Unmarked bands distinguish provincial rebels from a historical state.','无标识横带将行省叛军与历史政体区分。']
});
const motifs={
 discs:'<path d="M20 6v28M15 9h10M14 31h12"/><circle cx="20" cy="13" r="3"/><circle cx="20" cy="21" r="3"/><circle cx="20" cy="29" r="3"/>',
 fasces:'<path d="M14 8v25M17 7v26M20 6v27M23 7v26M26 8v25M12 13h16M12 26h16M13 34h14"/>',
 horn:'<path d="M10 11c1 12 5 18 16 21-3-5-2-9 4-15M10 11c6 0 12 3 20 6M12 15c4 1 8 3 12 5M15 21l6 4"/><circle cx="26" cy="13" r="2"/><circle cx="21" cy="11" r="2"/>',
 bow:'<path d="M13 7c15 5 15 21 0 26M13 7v26M7 20h26M28 16l5 4-5 4"/>',
 tiara:'<path d="M10 29l2-17 4 4 4-9 4 9 4-4 2 17zM11 29h18M15 24h10"/><circle cx="20" cy="20" r="2"/>',
 spear:'<path d="M20 6v28M17 11l3-5 3 5-3 3zM13 23h14M13 27h14"/>',
 palm:'<path d="M20 33V14M20 20c-1-7-6-9-10-10 1 5 4 8 10 10zm0 0c1-7 6-9 10-10-1 5-4 8-10 10zM15 33h10"/>',
 shield:'<path d="M20 6l9 4v11c0 6-4 10-9 13-5-3-9-7-9-13V10zM20 12v16M15 20h10"/>',
 grain:'<path d="M20 33V12M20 18c-5-1-7-4-7-7 5 0 7 3 7 7zm0 5c5-1 7-4 7-7-5 0-7 3-7 7zM15 33h10"/>',
 bands:'<path d="M10 13h20M10 20h20M10 27h20"/>'
};
const seals={ring:'<circle cx="31" cy="10" r="3"/>',split:'<path d="M28 8v5m5-5v5"/>',point:'<path d="M31 7l3 6h-6z"/>',cross:'<path d="M28 10h6m-3-3v6"/>'};
const colors=/^#[0-9a-fA-F]{6}$/;
function validKit(kit){return kit&&colors.test(kit.primary)&&colors.test(kit.accent)&&colors.test(kit.map)&&Object.hasOwn(motifs,kit.motif)&&(!kit.seal||Object.hasOwn(seals,kit.seal))&&typeof kit.abbr==='string'&&kit.abbr.length<=12&&/^[A-Za-z0-9·]+$/.test(kit.abbr)}
export function identity(id,state){const saved=state?.identityKits?.[id],kit=validKit(saved)?saved:IDENTITIES[id]||IDENTITIES.shared;return {...kit,secondary:kit.accent}}
// A breakaway court receives a deterministic variant of its origin's art.
// The saved kit remains stable even when the same public faction slot is reused.
export function breakawayIdentity(origin,claimant,generation=1){
 const parent=IDENTITIES[origin]||IDENTITIES.rebels,base=IDENTITIES[`${origin}_claimant`]||parent;
 const hash=[...String(claimant)].reduce((n,c)=>Math.imul(n,31)+c.codePointAt(0)|0,generation|0)>>>0;
 const variants=['ring','split','point','cross'],seal=variants[hash%variants.length];
 const palettes=origin==='caesar'||origin==='senate'?[['#755347','#efd4ab','#a97058'],['#66545e','#e9d5b6','#8f7482'],['#765e45','#ead0a2','#a68762'],['#53656b','#e2d4b5','#718b91']]:origin==='egypt'?[['#8b6941','#f0dab0','#bd985c'],['#6d7560','#edcf9d','#94a078'],['#77625c','#efd2ad','#aa8177'],['#5d7474','#e8d7ad','#80a19b']]:[['#854f49','#efd4ae','#b77664'],['#665a72','#e8cfaa','#917b9b'],['#6d6747','#e8d19d','#979167'],['#73535d','#edd1b2','#a37a86']];
 const [primary,accent,map]=palettes[hash%palettes.length];
 return {primary,accent,map,abbr:base.abbr,motif:parent.motif,seal,origin,claimant:String(claimant),generation:Math.max(1,generation|0)};
}
export function factionMark(id,variant='insignia',state){
 const f=identity(id,state),art=motifs[f.motif],isBanner=variant==='banner',isStandard=variant==='standard',origin=f.origin||id;
 const shape=origin==='parthia'?'M4 4h31l-6 13 6 17-15-3L4 37z':origin==='egypt'?'M5 4h30v25L20 38 5 29z':origin==='armenia'?'M5 4h30v31l-8-4-7 6-7-6-8 4z':origin==='numidia'?'M7 4h26v26L20 37 7 30z':origin==='mauretania'?'M5 4h30v32l-8-5-7 5-7-5-8 5z':origin==='galatia'?'M8 4h24v21L20 37 8 25z':origin==='bosporus'?'M5 4h30v31H5z':'M4 4h32v29l-16 4L4 33z';
 const frame=isBanner||isStandard?`<path d="${shape}" fill="var(--identity-primary)" stroke="var(--identity-accent)" stroke-width="${isStandard?1.5:1.2}"/>`:'<circle cx="20" cy="20" r="18" fill="var(--identity-primary)" stroke="var(--identity-accent)" stroke-width="1.5"/>';
 const serial=Number.isInteger(f.generation)&&f.generation>0?`<text x="31" y="34" text-anchor="middle" fill="currentColor" font-family="serif" font-size="6">${f.generation}</text>`:'';
 return `<svg class="faction-mark faction-${variant}" viewBox="0 0 40 40" aria-hidden="true" style="--identity-primary:${f.primary};--identity-accent:${f.accent};color:${f.accent}">${frame}<g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${art}${f.seal?seals[f.seal]:''}</g>${serial}</svg>`;
}
