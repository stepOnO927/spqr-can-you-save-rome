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
 bands:'<path d="M10 13h20M10 20h20M10 27h20"/>'
};
export function identity(id){return IDENTITIES[id]||IDENTITIES.shared}
export function factionMark(id,variant='insignia'){
 const f=identity(id),art=motifs[f.motif],isBanner=variant==='banner',isStandard=variant==='standard';
 const shape=id==='parthia'?'M4 4h31l-6 13 6 17-15-3L4 37z':id==='egypt'?'M5 4h30v25L20 38 5 29z':id==='armenia'?'M5 4h30v31l-8-4-7 6-7-6-8 4z':'M4 4h32v29l-16 4L4 33z';
 const frame=isBanner||isStandard?`<path d="${shape}" fill="var(--identity-primary)" stroke="var(--identity-accent)" stroke-width="${isStandard?1.5:1.2}"/>`:'<circle cx="20" cy="20" r="18" fill="var(--identity-primary)" stroke="var(--identity-accent)" stroke-width="1.5"/>';
 return `<svg class="faction-mark faction-${variant}" viewBox="0 0 40 40" aria-hidden="true" style="--identity-primary:${f.primary};--identity-accent:${f.accent};color:${f.accent}">${frame}<g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>`;
}
