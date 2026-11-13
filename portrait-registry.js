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
// Each pair is one fictional person at two life stages. Claims belong to a
// save, are never recycled after death, and do not consume simulation RNG.
const BORN_PORTRAITS={male:['born-m1','born-m2','born-m3'],female:['born-f1','born-f2','born-f3']};
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
