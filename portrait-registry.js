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
export function fictionalPortraitKey(state,id){
 const entry=OPENING_PORTRAITS[id],person=state.world?.characters?.[id],saved=state.world?.dynasties?.catalog?.[id];
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
 const allowed=new Set([...Object.values(OPENING_PORTRAITS).map(x=>x[2]),...Object.values(SCENARIO_PORTRAITS).map(x=>x[2]),...INSTITUTION_PORTRAITS.map(x=>x[4]),'fictional-varus']),now=state.year*12+state.month;
 return (state.meetings||[]).filter(m=>m.actor===state.player&&m.target===id&&m.status==='met'&&allowed.has(m.portraitKey)&&Number.isFinite(m.resolvedYear??m.year)&&Number.isFinite(m.resolvedMonth??m.month)&&(m.resolvedYear??m.year)*12+(m.resolvedMonth??m.month)<=now).sort((a,b)=>((b.resolvedYear??b.year)*12+(b.resolvedMonth??b.month))-((a.resolvedYear??a.year)*12+(a.resolvedMonth??a.month)))[0]?.portraitKey||null;
}
