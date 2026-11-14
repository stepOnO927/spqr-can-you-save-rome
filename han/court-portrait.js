// Original, historically inspired game artwork for fictional Han officials.
// Appearance is derived once from the saved identity; rendering never rolls.
const COLORS={skin:['#b58761','#c69b72','#a77758','#d0a77e'],robe:['#535d55','#555970','#74614b','#6a544b','#515b63'],hair:['#272625','#38302b','#46362d']};

export function ensureHanPortraitSeed(person){
 if(!person||person.portrait||!['fictional','simulated'].includes(person.record)||person.faction!=='han'||!['official','general','envoy','prince','princess','emperor','ruler'].includes(person.role))return null;
 if(Number.isSafeInteger(person.appearanceSeed)&&person.appearanceSeed>=0)return person.appearanceSeed;
 let hash=2166136261;
 for(const char of `${person.id}:${person.birth}:${person.name?.[0]||''}`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 person.appearanceSeed=hash;
 return hash;
}

export function ensureHanPortraitSeeds(s){
 for(const person of Object.values(s.persons||{}))ensureHanPortraitSeed(person);
 return s;
}

export function courtPortraitSrc(person,size=128){
 if(person?.portrait)return `../assets/portraits/${person.portrait}-${size}.jpg`;
 const seed=person?.appearanceSeed;
 if(!Number.isSafeInteger(seed)||seed<0||!['fictional','simulated'].includes(person.record))return null;
 const skin=COLORS.skin[seed%COLORS.skin.length],robe=COLORS.robe[(seed>>>4)%COLORS.robe.length],hair=COLORS.hair[(seed>>>9)%COLORS.hair.length];
 const face=17+(seed>>>13)%5,cap=(seed>>>18)%3;
 const hat=cap===0?'<path d="M18 30 L22 20 Q40 13 58 20 L62 30 Z" fill="#34332f" stroke="#b19b6f" stroke-width="2"/>':cap===1?'<path d="M19 29 Q40 12 61 29 L56 24 Q40 18 24 24 Z" fill="#38332d" stroke="#9e8765" stroke-width="2"/>':'<path d="M23 27 L27 18 H53 L57 27 Z" fill="#33322e" stroke="#a78e67" stroke-width="2"/>';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#353a35"/><path d="M3 80 Q11 57 30 55 H50 Q69 57 77 80" fill="${robe}"/><path d="M29 55 Q40 66 51 55" fill="${skin}"/><ellipse cx="40" cy="38" rx="${face}" ry="21" fill="${skin}"/><path d="M20 34 Q19 17 40 16 Q61 17 60 34 L55 24 Q40 20 25 27 Z" fill="${hair}"/>${hat}<path d="M29 38 h6 m10 0 h6 M39 42 l-2 8 h5 M34 55 q6 3 12 0" fill="none" stroke="#49382d" stroke-width="1.5"/><path d="M${28+(seed>>>22)%7} 75 l5 -8 m${11+(seed>>>26)%6} 8 l-5 -8" stroke="#baa37c" stroke-width="2"/></svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
