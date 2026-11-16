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
 const guide=mode==='han'?s.experience:s.experience?.guide,lessonCount=mode==='han'?(s.player==='han'?8:7):8;
 if(guide?.running||guide?.guided){
  if(!Number.isInteger(guide.step)||guide.step<0||guide.step>lessonCount)add('warning','invalid-tutorial-step','experience',String(guide.step));
  if(!s.regions.some(r=>r.owner===s.player))add('warning','tutorial-no-territory','regions','No owned territory is available for the first lesson');
  if(!s.armies.some(a=>a.owner===s.player&&a.men>0)&&guide.step<4)add('warning','tutorial-no-army','armies','A friendly army is unavailable for an early lesson');
  if(!s.experience?.actions||typeof s.experience.actions!=='object')add('warning','tutorial-actions-missing','experience.actions','Tutorial progress cannot be verified');
 }
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

// A read-only check for the active lesson. UI callers can pass the real DOM
// after rendering; cloud browser tests can then catch missing or hidden targets.
export function inspectTutorial({steps=[],index=0,document:doc=null,available=()=>true}={}){
 const findings=[],add=(code,path,detail)=>findings.push({severity:'warning',code,path,detail}),keys=new Set();
 if(!Array.isArray(steps)||!steps.length){add('tutorial-no-lessons','steps','No lessons defined');return findings}
 if(!Number.isInteger(index)||index<0||index>steps.length)add('tutorial-invalid-index','index',String(index));
 for(const [i,step] of steps.entries()){
  const key=step?.key??step?.[0],title=step?.title??[step?.[1],step?.[2]],target=step?.target??step?.[3];
  if(!key||keys.has(key))add('tutorial-duplicate-action',`steps[${i}]`,String(key));keys.add(key);
  if(!Array.isArray(title)||title.some(value=>typeof value!=='string'||!value.trim()))add('tutorial-missing-translation',`steps[${i}].title`,String(key));
  if(!target||typeof target!=='string')add('tutorial-missing-target',`steps[${i}].target`,String(key));
 }
 if(index<steps.length){const step=steps[index],target=step?.target??step?.[3],key=step?.key??step?.[0];
  if(!available(key))add('tutorial-action-unavailable',`steps[${index}]`,String(key));
  if(doc&&target?.startsWith('#')){let element;try{element=doc.querySelector(target)}catch{add('tutorial-invalid-selector',`steps[${index}].target`,target)}
   if(!element)add('tutorial-target-missing',`steps[${index}].target`,target);
   else if(element.hidden||element.closest?.('[hidden]')||element.getClientRects?.().length===0)add('tutorial-target-hidden',`steps[${index}].target`,target);
  }
 }
 return findings;
}
