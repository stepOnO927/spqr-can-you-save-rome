// Read-only startup and deep state checks. Never migrates or mutates a save.
export function inspectState(s,{mode=s?.dlc?'han':'roman',isLiuClan}={}){
 const findings=[],add=(severity,code,path,detail)=>findings.push({severity,code,path,detail});
 if(!s||typeof s!=='object'){add('fatal','missing-state','$','No campaign state');return findings}
 if(!s.factions||typeof s.factions!=='object'||!Object.keys(s.factions).length)add('fatal','missing-factions','factions','No faction registry');
 if(!Array.isArray(s.regions)||!s.regions.length)add('fatal','missing-regions','regions','No playable territories');
 if(!Array.isArray(s.armies))add('fatal','missing-armies','armies','Army list is unavailable');
 if(findings.some(x=>x.severity==='fatal'))return findings;
 const factionIds=new Set(Object.keys(s.factions)),regionIds=new Set(),armyIds=new Set();
 if(s.player!=null&&!factionIds.has(s.player))add('fatal','invalid-player','player',String(s.player));
 for(const [i,r] of s.regions.entries()){
  if(!r?.id||regionIds.has(r.id))add('fatal','duplicate-region',`regions[${i}]`,String(r?.id));else regionIds.add(r.id);
  if(!(mode==='han'&&r.owner==null)&&!factionIds.has(r.owner))add('fatal','invalid-owner',`regions[${i}].owner`,String(r.owner));
 }
 for(const [i,a] of s.armies.entries()){
  if(!a?.id||armyIds.has(a.id))add('fatal','duplicate-army',`armies[${i}]`,String(a?.id));else armyIds.add(a.id);
  if(!factionIds.has(a.owner))add('fatal','invalid-army-owner',`armies[${i}].owner`,String(a.owner));
  if(!regionIds.has(a.region))add('warning','invalid-army-location',`armies[${i}].region`,String(a.region));
  if(!Number.isFinite(a.men)||a.men<0)add('fatal','invalid-troops',`armies[${i}].men`,String(a.men));
 }
 for(const [id,f] of Object.entries(s.factions))for(const key of ['treasury',mode==='han'?'grain':'food','manpower']){
  if(f[key]!==undefined&&!Number.isFinite(f[key]))add('fatal','invalid-resource',`factions.${id}.${key}`,String(f[key]));
  if(key==='manpower'&&f[key]<0)add('warning','negative-manpower',`factions.${id}.manpower`,String(f[key]));
 }
 for(const [i,war] of (s.wars||[]).entries())if(!Array.isArray(war)||war.some(id=>!factionIds.has(id)))add('warning','invalid-war',`wars[${i}]`,JSON.stringify(war));
 if(mode==='roman'){
  if(!s.world?.characters)add('fatal','missing-characters','world.characters','Roman character registry is missing');
  else{
   for(const [id,c] of Object.entries(s.world.characters))if(c?.id!==id)add('warning','unstable-character-id',`world.characters.${id}`,String(c?.id));
   for(const [i,a] of s.armies.entries())if(a.characterId&&!s.world.characters[a.characterId])add('warning','invalid-commander',`armies[${i}].characterId`,String(a.characterId));
  }
  for(const [i,entry] of (s.chronicle?.entries||[]).entries())if(entry.region&&!regionIds.has(entry.region))add('warning','invalid-chronicle-region',`chronicle.entries[${i}].region`,String(entry.region));
 }else{
  if(!s.persons||!s.throne)add('fatal','missing-han-court','throne','Han court state is missing');
  const ruler=s.throne?.orthodox;
  if(ruler&&(!s.persons?.[ruler]||!isLiuClan?.(s,ruler)))add('fatal','non-liu-orthodox','throne.orthodox',String(ruler));
  for(const [id,p] of Object.entries(s.persons||{}))if(p.id!==id)add('warning','unstable-person-id',`persons.${id}`,String(p.id));
 }
 // Han frontier territories can be unclaimed (owner === null).
 // Treasury and food/grain may be negative under the modeled debt and famine
 // rules. This is deliberate; no generic nonnegative assertion is applied.
 return findings;
}
export function startupDiagnostics(s,configuration){
 const findings=inspectState(s,configuration);
 return {fatal:findings.filter(x=>x.severity==='fatal'),warnings:findings.filter(x=>x.severity==='warning'),findings};
}
