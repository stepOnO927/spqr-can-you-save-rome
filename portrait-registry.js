// These are fictional characters, not reconstructions of historical people.
// Match all fields against the active save: generated IDs can be reused in old saves.
const OPENING_PORTRAITS={
 'fictional:1':['Publius Varenus',-77,'fictional-varenus'],
 'fictional:2':['Livia Marcia',-74,'fictional-livia'],
 'fictional:3':['Aulus Cassianus',-79,'fictional-cassianus'],
 'fictional:4':['Marcia Valeria',-76,'fictional-valeria']
};
// Scenario IDs vary between saves. The scenario role, saved name and birth
// year must all match before an individual portrait can be assigned.
const SCENARIO_PORTRAITS={
 parent:['Nikon of Alexandria',-90,'fictional-nikon'],
 adopted:['Demetrios of Alexandria',-68,'fictional-demetrios'],
 son:['Leontios of Alexandria',-70,'fictional-leontios'],
 general:['Straton of Thebes',-78,'fictional-straton']
};
// Fixed opening institution members can receive different numeric IDs in old
// saves. Require the saved institution seat, name and opening birth year, not
// the reusable number alone. Later-seeded people remain silhouettes.
const INSTITUTION_PORTRAITS=[
 ['roman_college',0,'Aulus Fabius',-97,'fictional-fabius'],
 ['roman_college',1,'Claudia Flavia',-83,'fictional-flavia'],
 ['theban_temples',0,'Psenamun',-97,'fictional-psenamun'],
 ['theban_temples',1,'Taimhotep',-83,'fictional-taimhotep'],
 ['syrian_association',0,'Maron',-97,'fictional-maron'],
 ['syrian_association',1,'Helena of Antioch',-83,'fictional-helena'],
 ['scenario_civic',0,'Gaius Sennius',-85,'fictional-sennius'],
 ['scenario_civic',1,'Mara',-85,'fictional-mara']
];
// Limited individual artwork for campaign-born Roman people. A saved claim
// binds each pair of childhood/adult assets to one person and their parentage.
const BORN_PORTRAITS={male:['born-m1','born-m2'],female:['born-f1','born-f2']};
export function assignBornPortrait(state,id){
 const d=state.world?.dynasties,c=state.world?.characters?.[id],saved=d?.catalog?.[id];
 if(!d||!c||!saved?.fictional||!Array.isArray(saved.name)||!saved.name[0]||!['caesar','senate'].includes(state.player)||c.faction!==state.player||c.institutionalOnly||!BORN_PORTRAITS[c.sex]||!Number.isInteger(c.birthYear)||c.birthYear< -49||c.birthYear>state.year||!Array.isArray(c.parents)||!c.parents.length||!c.parents.every(parent=>state.world.characters[parent]))return null;
 d.bornPortraitClaims||={};if(d.bornPortraitClaims[id])return null;
 const used=new Set(Object.values(d.bornPortraitClaims).map(claim=>claim?.key));
 const key=BORN_PORTRAITS[c.sex].find(candidate=>!used.has(candidate));if(!key)return null;
 d.bornPortraitClaims[id]={key,name:[...saved.name],birthYear:c.birthYear,sex:c.sex,parents:[...c.parents]};return key;
}
function bornPortraitKey(state,id){
 const claim=state.world?.dynasties?.bornPortraitClaims?.[id],c=state.world?.characters?.[id],saved=state.world?.dynasties?.catalog?.[id];
 if(!claim||!c||!saved?.fictional||!BORN_PORTRAITS[claim.sex]?.includes(claim.key)||c.sex!==claim.sex||c.birthYear!==claim.birthYear||!Array.isArray(claim.name)||claim.name[0]!==saved.name?.[0]||claim.name[1]!==saved.name?.[1]||!Array.isArray(claim.parents)||!Array.isArray(c.parents)||JSON.stringify(claim.parents)!==JSON.stringify(c.parents))return null;
 const age=(c.alive?state.year:c.deathYear)-c.birthYear;if(!Number.isFinite(age)||age<5)return null;
 return claim.key+(age<18?'-child':'-adult');
}
export function portraitSeedFor(id,person,entry){
 const source=`${id}|${entry?.name?.[0]||''}|${entry?.birth?.[0]??person?.birthYear??''}|${person?.faction||''}|${person?.personalitySeed??''}`;
 let seed=2166136261;for(const character of source){seed^=character.codePointAt(0);seed=Math.imul(seed,16777619)}
 return seed>>>0;
}

const generatedPortraits=new Map();
export function proceduralPortraitSvg(state,id,snapshot=null){
 const person=state.world?.characters?.[id],saved=state.world?.dynasties?.catalog?.[id];
 if(!person||!saved?.fictional||!Array.isArray(saved.name)||!saved.name[0]||!saved.name[1])return null;
 const seed=Number.isInteger(snapshot?.portraitSeed)?snapshot.portraitSeed:Number.isInteger(person.portraitSeed)?person.portraitSeed:portraitSeedFor(id,person,saved),faction=snapshot?.portraitFaction||person.faction;
 // A foreign portrait is the dated appearance actually observed at a meeting.
 // Do not change it using a later hidden death or unobserved appointment.
 const visibleYear=snapshot?(snapshot.resolvedYear??snapshot.year??state.year):person.deathYear??state.year;
 const age=Math.max(0,visibleYear-(person.birthYear??visibleYear)),ageBand=age>=65?3:age>=50?2:age>=35?1:0;
 const cacheKey=`${id}|${saved.name[0]}|${person.birthYear}|${faction}|${seed}|${ageBand}`;
 if(generatedPortraits.has(cacheKey))return generatedPortraits.get(cacheKey);
 const skin=['#bd9270','#a87958','#d0a77f','#976b51','#c59c76'][seed%5];
 const hair=ageBand>=3?'#938979':ageBand>=2&&((seed>>>3)&1)?'#80776b':['#241e1b','#473225','#5c4936','#302d2a','#6b5239'][(seed>>>3)%5];
 const robe={caesar:'#823d36',senate:'#664a49',egypt:'#41646b',parthia:'#66523f',armenia:'#4e634a',han:'#355e56',shanshan:'#806d4a',numidia:'#7b6345',mauretania:'#6b5845',galatia:'#5f6243',bosporus:'#4c6072'}[faction]||'#596054';
 const faceWidth=15+(seed>>>18)%5,faceHeight=20+(seed>>>21)%4;
 const eyeY=37+(seed>>>24)%3,leftEye=40-Math.round(faceWidth*.58),rightEye=40+Math.round(faceWidth*.58);
 const hairline=(seed>>>7)%3===0?'M24 31 Q27 13 40 14 Q55 12 57 31 L53 25 Q40 21 27 28 Z':(seed>>>7)%3===1?'M23 31 Q24 12 42 15 Q56 15 57 31 L51 23 Q39 19 29 27 Z':'M24 30 Q25 17 40 16 Q54 16 56 30 L50 25 Q40 18 30 25 Z';
 const beard=person.sex==='male'&&(seed>>>11)%3===0?`<path d="M29 47 Q31 63 40 65 Q50 62 51 47 Q46 56 40 57 Q34 55 29 47" fill="${hair}"/>`:'';
 const headwear=faction==='han'?`<path d="M26 22 L28 14 H52 L54 22 Q40 17 26 22" fill="${hair}" stroke="#a39370" stroke-width="1"/>`:(seed>>>15)%4===0?`<path d="M25 24 Q40 17 55 24" fill="none" stroke="#ad9569" stroke-width="2"/>`:'';
 const cheek=ageBand>=2?`<path d="M${leftEye-4} 45 q4 2 7 0 M${rightEye-3} 45 q4 2 7 0" fill="none" stroke="#765844" stroke-width=".7" opacity=".6"/>`:'';
 const eyebrows=(seed>>>26)%3===0?`<path d="M${leftEye-4} ${eyeY-4} q5 -2 9 0 M${rightEye-4} ${eyeY-4} q5 -2 9 0" fill="none" stroke="${hair}" stroke-width="1"/>`:'';
 const collar=(seed>>>28)%3===0?`<path d="M28 58 L40 66 L52 58" fill="none" stroke="#d4c4a0" stroke-width="3"/>`:`<path d="M28 57 L40 69 L52 57" fill="none" stroke="#b8a179" stroke-width="2"/>`;
 const svg=`<svg class="portrait-procedural" viewBox="0 0 80 80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="#253631"/><path d="M6 80 Q9 57 28 57 L52 57 Q71 57 74 80" fill="${robe}"/><path d="M32 53 L33 63 Q40 69 47 63 L48 53" fill="${skin}"/><ellipse cx="40" cy="37" rx="${faceWidth}" ry="${faceHeight}" fill="${skin}"/><path d="${hairline}" fill="${hair}"/>${headwear}${eyebrows}<path d="M${leftEye-3} ${eyeY} h6 M${rightEye-3} ${eyeY} h6" stroke="${hair}" stroke-width="1.5" stroke-linecap="round"/><path d="M40 ${eyeY+2} l-2 9 h4" fill="none" stroke="#6f4e3b" stroke-width="1"/><path d="M35 54 Q40 56 45 54" fill="none" stroke="#754e42" stroke-width="1"/>${cheek}${beard}${collar}<path d="M6 79 H74" stroke="#9f8962" stroke-width="2"/></svg>`;
 if(generatedPortraits.size>=512)generatedPortraits.delete(generatedPortraits.keys().next().value);
 generatedPortraits.set(cacheKey,svg);return svg;
}
export function observedProceduralPortrait(state,id){
 const now=state.year*12+state.month;
 return (state.meetings||[]).filter(m=>m.actor===state.player&&m.target===id&&m.status==='met'&&Number.isInteger(m.portraitSeed)&&typeof m.portraitFaction==='string'&&Number.isFinite(m.resolvedYear??m.year)&&Number.isFinite(m.resolvedMonth??m.month)&&(m.resolvedYear??m.year)*12+(m.resolvedMonth??m.month)<=now).sort((a,b)=>((b.resolvedYear??b.year)*12+(b.resolvedMonth??b.month))-((a.resolvedYear??a.year)*12+(a.resolvedMonth??a.month)))[0]||null;
}
export function fictionalPortraitKey(state,id){
 const entry=OPENING_PORTRAITS[id],person=state.world?.characters?.[id],saved=state.world?.dynasties?.catalog?.[id];
 const born=bornPortraitKey(state,id);if(born)return born;
 if(entry&&saved?.fictional&&saved.name?.[0]===entry[0]&&person?.birthYear===entry[1])return entry[2];
 if(state.scenario==='ambitious_general'&&state.scenarioGeneral===id&&saved?.fictional&&saved.name?.[0]==='Lucius Valerius Varus'&&person?.birthYear===-86)return 'fictional-varus';
 if(saved?.fictional&&person?.institutionalOnly){for(const [institution,seat,name,birth,key] of INSTITUTION_PORTRAITS){const office=state.world?.religiousInstitutions?.find(o=>o.id===institution);if(office?.council?.[seat]===id&&saved.name?.[0]===name&&person.birthYear===birth)return key}}
 const scenario=state.world?.dynasties?.scenario;if(!scenario||!saved?.fictional)return null;
 for(const [role,portrait] of Object.entries(SCENARIO_PORTRAITS))if(scenario[role]===id&&saved.name?.[0]===portrait[0]&&person?.birthYear===portrait[1])return portrait[2];
 return null;
}
// Foreign artwork becomes available only from this viewer's completed meeting
// snapshot. It must not be recomputed from the person's current hidden state.
export function observedFictionalPortrait(state,id){
 const allowed=new Set([...Object.values(OPENING_PORTRAITS).map(x=>x[2]),...Object.values(SCENARIO_PORTRAITS).map(x=>x[2]),...INSTITUTION_PORTRAITS.map(x=>x[4]),...Object.values(BORN_PORTRAITS).flatMap(keys=>keys.flatMap(key=>[key+'-child',key+'-adult'])),'fictional-varus']),now=state.year*12+state.month;
 return (state.meetings||[]).filter(m=>m.actor===state.player&&m.target===id&&m.status==='met'&&allowed.has(m.portraitKey)&&Number.isFinite(m.resolvedYear??m.year)&&Number.isFinite(m.resolvedMonth??m.month)&&(m.resolvedYear??m.year)*12+(m.resolvedMonth??m.month)<=now).sort((a,b)=>((b.resolvedYear??b.year)*12+(b.resolvedMonth??b.month))-((a.resolvedYear??a.year)*12+(a.resolvedMonth??a.month)))[0]?.portraitKey||null;
}
