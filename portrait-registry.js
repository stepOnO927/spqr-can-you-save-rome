// These are fictional opening characters, not reconstructions of historical people.
// Match all fields against the active save: generated IDs can be reused in old saves.
const OPENING_PORTRAITS={
 'fictional:1':['Publius Varenus',-77,'fictional-varenus'],
 'fictional:2':['Livia Marcia',-74,'fictional-livia'],
 'fictional:3':['Aulus Cassianus',-79,'fictional-cassianus'],
 'fictional:4':['Marcia Valeria',-76,'fictional-valeria']
};
export function fictionalPortraitKey(state,id){
 const entry=OPENING_PORTRAITS[id],person=state.world?.characters?.[id],saved=state.world?.dynasties?.catalog?.[id];
 return entry&&saved?.fictional&&saved.name?.[0]===entry[0]&&person?.birthYear===entry[1]?entry[2]:null;
}
