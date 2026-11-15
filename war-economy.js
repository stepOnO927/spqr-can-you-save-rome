// Farming is disrupted in a theater under siege or hostile occupation.
// A war elsewhere does not reduce an unrelated province's harvest.
export function agriculturalDisruption(s,region){
 if(!region?.owner)return false;
 const hostile=owner=>owner&&owner!==region.owner&&(s.wars||[]).some(w=>w.includes(owner)&&w.includes(region.owner));
 return (s.armies||[]).some(army=>army.men>0&&hostile(army.owner)&&(
  army.siege?.region===region.id||army.region===region.id&&!army.move
 ));
}

export function agriculturalProduction(s,region,base){
 return agriculturalDisruption(s,region)?Math.floor(Math.max(0,base)/2):base;
}
