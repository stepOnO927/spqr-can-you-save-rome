import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,tick,nationalBudget,researchInnovation,adoptIdea,startConstruction,constructionCheck} from '../engine.js';
import {IDEAS,MATERIALS,BUILDINGS,researchTerms,activeEffects} from '../development.js';

// Follow paid, player-issued development decisions for three different courts.
// This is a 36-month integration audit, not an automatic winning strategy.
const plans={
 egypt:{ideas:['egyptian-multiscript-decrees','central-administration','diplomatic-accommodation','public-works','cultural-accommodation'],materials:['grain-processing','water-control'],buildings:['grain-mill','irrigation']},
 parthia:{ideas:['parthian-arrow-trains','central-administration','hardline-diplomacy','estate-organization','rhetorical-education'],materials:['craft-workshops','roadmaking'],buildings:['workshop','road']},
 parthiaWorkshopFirst:{owner:'parthia',materialsFirst:true,maxProjects:1,ideas:['parthian-arrow-trains'],materials:['craft-workshops'],buildings:['workshop']},
 bosporus:{ideas:['bosporan-grain-stewardship','central-administration','diplomatic-accommodation','public-works','rhetorical-education'],materials:['craft-workshops','roadmaking'],buildings:['workshop','road']}
};
for(const [route,plan] of Object.entries(plans)){
 const owner=plan.owner||route;
 let state=newGrandGame(owner),actions=[];
 for(let month=0;month<36;month++){
  if(month===18)state=upgradeSave(JSON.parse(JSON.stringify(state)));
  const d=state.development[owner],f=state.factions[owner];
  const waitingForConstruction=plan.materialsFirst&&plan.buildings.some(id=>{const building=BUILDINGS.find(item=>item.id===id);return building&&d.knownMaterial.includes(building.tech)&&!state.regions.some(r=>r.owner===owner&&(r.buildings.includes(id)||r.construction?.buildingId===id))});
  if(!d.research&&!waitingForConstruction){
   const ideaChoices=plan.ideas.map(id=>['idea',id]),materialChoices=plan.materials.map(id=>['material',id]);
   const choices=plan.materialsFirst?[...materialChoices,...ideaChoices]:[...ideaChoices,...materialChoices];
   const choice=choices.find(([branch,id])=>{
    const item=(branch==='idea'?IDEAS:MATERIALS).find(x=>x.id===id),known=d[branch==='idea'?'knownIdeas':'knownMaterial'];
    return item&&!known.includes(id)&&item.prerequisites.every(prerequisite=>known.includes(prerequisite))&&f.treasury>=researchTerms(state,owner,branch,id).cost+12;
   });
   if(choice&&researchInnovation(state,owner,...choice).ok)actions.push(`research ${choice[1]}`);
  }
  if(!d.adoption){
   const idea=plan.ideas.map(id=>IDEAS.find(x=>x.id===id)).find(item=>item&&d.knownIdeas.includes(item.id)&&!d.slots[item.category].includes(item.id)&&d.slots[item.category].includes(null)&&f.treasury>=item.adopt+12);
   if(idea&&adoptIdea(state,owner,idea.id,d.slots[idea.category].indexOf(null)).ok)actions.push(`adopt ${idea.id}`);
  }
  if(f.treasury>=35&&state.regions.filter(r=>r.owner===owner).reduce((count,r)=>count+r.buildings.filter(id=>plan.buildings.includes(id)).length+Number(!!r.construction&&plan.buildings.includes(r.construction.buildingId)),0)<(plan.maxProjects??2)){
   const project=plan.buildings.flatMap(id=>state.regions.filter(r=>r.owner===owner).map(r=>({id,region:r.id,check:constructionCheck(state,owner,r.id,id)}))).find(project=>project.check.ok&&f.treasury>=project.check.cost+12);
   if(project&&startConstruction(state,owner,project.region,project.id).ok)actions.push(`build ${project.id} at ${project.region}`);
  }
  tick(state);
  assert.ok(Number.isFinite(state.factions[owner].treasury));
  assert.ok(Number.isFinite(state.factions[owner].food));
 }
 const d=state.development[owner],f=state.factions[owner],budget=nationalBudget(state,owner);
 const active=Object.values(d.slots).flat().filter(Boolean),buildings=state.regions.filter(r=>r.owner===owner).flatMap(r=>r.buildings);
 if(route==='parthia'||route==='parthiaWorkshopFirst'){
  assert.ok(active.includes('parthian-arrow-trains'),'both Parthian paths must actually adopt the same doctrine');
  if(route==='parthia')assert.ok(f.treasury<0&&budget.projectedNet<0,'the military-first path should expose its sustained cost');
  else assert.ok(buildings.includes('workshop')&&f.treasury>=0&&budget.projectedNet>=0,'the workshop-first path should fund its doctrine');
 }
 console.log(JSON.stringify({route,owner,actions,knownMaterial:d.knownMaterial,knownIdeas:d.knownIdeas,active,buildings:buildings.filter(id=>plan.buildings.includes(id)),treasury:f.treasury,food:f.food,monthlyTreasury:budget.projectedNet,monthlyFood:budget.foodNet,effects:activeEffects(state,owner)}));
}
