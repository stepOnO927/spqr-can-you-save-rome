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
export function fictionalPortraitKey(state,id){
 const entry=OPENING_PORTRAITS[id],person=state.world?.characters?.[id],saved=state.world?.dynasties?.catalog?.[id];
 if(entry&&saved?.fictional&&saved.name?.[0]===entry[0]&&person?.birthYear===entry[1])return entry[2];
 const scenario=state.world?.dynasties?.scenario;if(!scenario||!saved?.fictional)return null;
 for(const [role,portrait] of Object.entries(SCENARIO_PORTRAITS))if(scenario[role]===id&&saved.name?.[0]===portrait[0]&&person?.birthYear===portrait[1])return portrait[2];
 return null;
}
// Foreign artwork becomes available only from this viewer's completed meeting
// snapshot. It must not be recomputed from the person's current hidden state.
export function observedFictionalPortrait(state,id){
 const allowed=new Set([...Object.values(OPENING_PORTRAITS),...Object.values(SCENARIO_PORTRAITS)].map(x=>x[2])),now=state.year*12+state.month;
 return (state.meetings||[]).filter(m=>m.actor===state.player&&m.target===id&&m.status==='met'&&allowed.has(m.portraitKey)&&Number.isFinite(m.resolvedYear??m.year)&&Number.isFinite(m.resolvedMonth??m.month)&&(m.resolvedYear??m.year)*12+(m.resolvedMonth??m.month)<=now).sort((a,b)=>((b.resolvedYear??b.year)*12+(b.resolvedMonth??b.month))-((a.resolvedYear??a.year)*12+(a.resolvedMonth??a.month)))[0]?.portraitKey||null;
}
