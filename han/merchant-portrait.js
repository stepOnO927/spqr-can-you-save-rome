// Original game portraits for named caravan merchants. The saved culture and
// appearance seed determine the artwork; rendering never changes identity.
const palette={skin:['#b78b68','#c49a75','#987155','#c9a783'],cloth:['#5c5a4a','#6c5143','#4f6260','#655d75'],hair:['#302b28','#44352b','#51443b']};
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n};

export function merchantPortraitSrc(person,state=null){
 if(!person||person.profession!=='merchant'||!['fictional','simulated'].includes(person.record))return null;
 const seed=Number.isSafeInteger(person.appearanceSeed)&&person.appearanceSeed>=0?person.appearanceSeed:hash(person.id);
 const culture=person.culture?.[0]||'';
 const style=/Han Chinese/.test(culture)?'han':/Xiongnu|Wusun|Kangju|Yuezhi|Steppe|Qiang/.test(culture)?'steppe':/Tarim oasis/.test(culture)?'oasis':'western';
 const skin=palette.skin[seed%palette.skin.length],cloth=palette.cloth[(seed>>>3)%palette.cloth.length];
 const age=state&&Number.isFinite(person.birth)?Math.max(0,(person.alive?state.year:person.death??state.year)-person.birth):35;
 const hair=age>=60?'#89877c':age>=50?'#67665f':palette.hair[(seed>>>9)%palette.hair.length];
 const headwear={
  han:'<path d="M22 27 L24 16 H56 L58 27 Q40 22 22 27" fill="#35342f" stroke="#ae956c" stroke-width="2"/>',
  steppe:'<path d="M18 30 Q21 13 40 11 Q59 13 62 30 L56 26 Q40 17 24 26 Z" fill="#65513b" stroke="#a69168" stroke-width="2"/>',
  oasis:'<path d="M19 27 Q40 13 61 27 L59 31 Q40 22 21 31 Z" fill="#948267" stroke="#c3ac80" stroke-width="2"/>',
  western:'<path d="M21 27 L27 16 Q40 13 53 16 L59 27 Q40 21 21 27 Z" fill="#615345" stroke="#b19a74" stroke-width="2"/>'
 }[style];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" data-culture-style="${style}" viewBox="0 0 80 80"><rect width="80" height="80" fill="#343b39"/><path d="M3 80 Q9 58 29 55 H51 Q71 58 77 80" fill="${cloth}"/><path d="M28 55 Q40 66 52 55" fill="${skin}"/><ellipse cx="40" cy="38" rx="${17+(seed>>>14)%5}" ry="21" fill="${skin}"/><path d="M21 34 Q19 18 40 17 Q61 18 59 34 L54 25 Q40 20 26 27 Z" fill="${hair}"/>${headwear}<path d="M28 38 h7 m10 0 h7 M39 42 l-2 8 h5 M34 54 q6 3 12 0" fill="none" stroke="#493a30" stroke-width="1.5"/><path d="M${27+(seed>>>20)%8} 76 l6 -9 m${10+(seed>>>25)%6} 9 l-6 -9" stroke="#c1aa80" stroke-width="2"/></svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
