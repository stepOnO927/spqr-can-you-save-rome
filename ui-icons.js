// IMPERIUM VISUAL — original line icons drawn for SPQR. Presentation only: no game state is read here.
// Every icon is a 24×24 stroke drawing that inherits currentColor, so one set serves every panel.
const P={
 // navigation rail
 map:'<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
 military:'<path d="M5 3l9.5 11M19 3L9.5 14"/><path d="M4 16.5l3.5 3.5M20 16.5L16.5 20M6.5 14l3.5 3.5M17.5 14L14 17.5"/>',
 focus:'<path d="M12 21c-5-1.5-8-5-8-10M12 21c5-1.5 8-5 8-10"/><path d="M4.5 8c1.8.3 3 1.5 3.2 3.2M5.5 13c1.8-.100 3.1.8 3.8 2.3M8 17.2c1.5-.500 2.9 0 3.9 1.2M19.5 8c-1.8.3-3 1.5-3.2 3.2M18.5 13c-1.8-.100-3.1.8-3.8 2.3M16 17.2c-1.5-.500-2.9 0-3.9 1.2"/>',
 legions:'<path d="M7 2.5V22M7 5h11v9l-2.75-1.5L12.5 14 9.75 12.5 7 14"/><circle cx="12.5" cy="8.6" r="1.6"/>',
 plans:'<path d="M4 19c2-7 6-10 13-11"/><path d="M13.5 4.5L18 8l-4 3.5"/><circle cx="4.5" cy="19" r="1.5"/><path d="M11 17h3M17 17h3" stroke-dasharray="1.5 2"/>',
 government:'<path d="M3 9l9-5.5L21 9zM4.5 20.5h15M6 9v9M10 9v9M14 9v9M18 9v9M4.5 18h15"/>',
 chessboard:'<circle cx="12" cy="12" r="2.3"/><circle cx="4.5" cy="6" r="1.7"/><circle cx="19.5" cy="6" r="1.7"/><circle cx="5" cy="19" r="1.7"/><circle cx="19" cy="19" r="1.7"/><path d="M6 7l4.2 3.6M18 7l-4.2 3.6M6.3 17.9l4-4.2M17.7 17.9l-4-4.2"/>',
 chronicle:'<path d="M6 4h11a2 2 0 012 2v12.5a1.5 1.5 0 01-3 0V6"/><path d="M6 4a2 2 0 00-2 2v2h2.5M6.5 8v10.5A1.5 1.5 0 008 20h9.5M9.5 9h4M9.5 12.5h4M9.5 16h3"/>',
 legacy:'<path d="M9 3h6M10 3c0 2-3.5 3.5-3.5 8 0 4 2.3 6.5 3.5 9h4c1.2-2.5 3.5-5 3.5-9 0-4.5-3.5-6-3.5-8"/><path d="M6.7 9.5C4.5 9 4 11.5 6.5 13M17.3 9.5c2.2-.500 2.7 2 .200 3.5M9 21h6"/>',
 sources:'<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.500 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5V19.5"/>',
 // resources
 treasury:'<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.65 3.15 3 7 3s7-1.35 7-3V7M5 12v5c0 1.65 3.15 3 7 3s7-1.35 7-3v-5"/>',
 food:'<path d="M12 22V8M12 8c0-2 .800-3.5 0-5.5C11.2 4.5 12 6 12 8zM12 12c-2.5 0-4-1.5-4.5-4 2.5 0 4 1.5 4.5 4zM12 12c2.5 0 4-1.5 4.5-4-2.5 0-4 1.5-4.5 4zM12 16.5c-2.5 0-4-1.5-4.5-4 2.5 0 4 1.5 4.5 4zM12 16.5c2.5 0 4-1.5 4.5-4-2.5 0-4 1.5-4.5 4z"/>',
 manpower:'<path d="M5 13a7 7 0 0114 0v2H5zM5 15v3h4.5v-3M19 15v5h-3v-5M12 6V3M9.5 3.5h5"/>',
 stability:'<path d="M5 4h14M6.5 4v2.5h11V4M8 6.5v11M12 6.5v11M16 6.5v11M6 17.5h12M4.5 20.5h15M6 17.5v3M18 17.5v3"/>',
 legitimacy:'<circle cx="12" cy="9.5" r="5.5"/><path d="M9.8 9.5l1.6 1.6 2.9-3.1M8.5 14l-1.5 7 5-2.5 5 2.5-1.5-7"/>',
 strength:'<path d="M12 2.5l2.2 3.5v8.5h-4.4V6zM8 14.5h8M12 14.5V20M10.5 20.5h3"/>',
 research:'<circle cx="12" cy="4.5" r="1.7"/><path d="M11.3 6.1L6 20.5M12.7 6.1L18 20.5M8.3 14.5c2.4 1.6 5 1.6 7.4 0"/>',
 diplomacy:'<path d="M5 4.5h11a2 2 0 012 2V15M5 4.5a2 2 0 00-2 2V8h2.5M5.5 8v9.5A2 2 0 007.5 19.5H12M8.5 9h6M8.5 12.5h4"/><circle cx="17" cy="17.5" r="3"/><path d="M15.4 20l-.9 2.5 2.5-1.2 2.5 1.2-.9-2.5"/>',
 // utility
 mail:'<path d="M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7"/>',
 laurel:'<path d="M12 21c-5-1.5-8-5-8-10M12 21c5-1.5 8-5 8-10"/><path d="M4.5 8c1.8.3 3 1.5 3.2 3.2M5.5 13c1.8-.100 3.1.8 3.8 2.3M8 17.2c1.5-.500 2.9 0 3.9 1.2M19.5 8c-1.8.3-3 1.5-3.2 3.2M18.5 13c-1.8-.100-3.1.8-3.8 2.3M16 17.2c-1.5-.500-2.9 0-3.9 1.2"/>'
};
// The eastern reports tab keeps its character, set as a small cinnabar seal rather than a pictogram.
const SEAL_EAST='<svg class="iv-icon iv-seal-east" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1.5" fill="currentColor" stroke="none"/><text x="12" y="16.8" text-anchor="middle" font-size="12.5" font-weight="700" fill="#f4e6c8" stroke="none" font-family="\'SPQR CJK\',\'Songti SC\',\'Noto Serif SC\',\'SimSun\',serif">東</text></svg>';
const STAT_ICON={treasury:'treasury',food:'food',manpower:'manpower',stability:'stability',legitimacy:'legitimacy',strength:'strength'};

export function uiIcon(name){
 if(name==='east')return SEAL_EAST;
 const d=P[name];
 return d?`<svg class="iv-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`:'';
}
export const statIcon=key=>uiIcon(STAT_ICON[key]||'');
export const hasUiIcon=name=>name==='east'||Object.hasOwn(P,name);
