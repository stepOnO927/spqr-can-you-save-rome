import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=ai-wartime-aid-1';
import {MATERIALS,IDEAS,CATEGORIES,activeModifiers,buildingModifiers,startResearch,startConstruction,equipIdea,removeIdea,expandSlot,requestKnowledge,offerKnowledge,inviteScholars,canEquip} from '../inventions.js?v=mission-discount-1';

const advance=(s,n)=>{for(let i=0;i<n;i++)tick(s)};
test('material research unlocks a local building, with separate construction and real income',()=>{
 const s=newGame('egypt');assert.equal(MATERIALS.length,15);assert.equal(new Set(MATERIALS.map(i=>i.image)).size,15);
 assert.equal(startConstruction(s,'egypt','egyptUpper','granaries').reason,'knowledge');
 assert.equal(startResearch(s,'egypt','granaries').ok,true);assert.deepEqual(s.regions.find(r=>r.id==='egyptUpper').buildings,[]);
 advance(s,4);assert.ok(s.inventions.egypt.knownMaterial.includes('granaries'));
 const r=s.regions.find(r=>r.id==='egyptUpper');assert.deepEqual(r.buildings,[]);s.factions.egypt.treasury=100;
 assert.equal(startConstruction(s,'egypt','egyptUpper','granaries').ok,true);assert.deepEqual(r.buildings,[]);
 advance(s,3);assert.ok(r.buildings.includes('granaries'));assert.equal(buildingModifiers(r).food,2);
 assert.ok(MATERIALS.every(i=>i.source.startsWith('https://')&&i.description[0]&&i.description[1]));
});
test('five category slots and delayed active policy effects, negative effects, conflicts and expansion',()=>{
 const s=newGame();s.wars=[];const x=s.inventions.caesar;assert.deepEqual(CATEGORIES.map(([id])=>x.slots[id]),[1,1,1,1,1]);
 assert.equal(IDEAS.length,25);assert.equal(startResearch(s,'caesar','tax_farming').ok,true);advance(s,4);
 assert.equal(activeModifiers(s,'caesar').tax||0,0);assert.equal(equipIdea(s,'caesar','tax_farming').ok,true);assert.equal(activeModifiers(s,'caesar').tax||0,0);advance(s,2);
 assert.equal(activeModifiers(s,'caesar').tax,.12);assert.equal(activeModifiers(s,'caesar').stability,-1);
 advance(s,3);assert.equal(removeIdea(s,'caesar','tax_farming').ok,true);advance(s,2);assert.equal(activeModifiers(s,'caesar').tax||0,0);
 x.knownIdeas.push('central_administration','provincial_autonomy','legal_reform');assert.equal(expandSlot(s,'caesar','government').ok,true);advance(s,4);assert.equal(x.slots.government,2);
 s.factions.caesar.treasury=100;s.factions.caesar.stability=60;assert.equal(expandSlot(s,'caesar','government').ok,true);advance(s,7);assert.equal(x.slots.government,3);
 x.active.government=['central_administration'];assert.equal(canEquip(s,'caesar','provincial_autonomy'),'conflict');
 assert.equal(canEquip(s,'caesar','provincial_autonomy','central_administration'),null);
});
test('foreign requests preserve private knowledge, adaptation, AI participation and saves',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=300;s.factions.parthia.treasury=300;
 s.inventions.parthia.knownIdeas.push('rhetorical_education');
 const before=JSON.stringify(s.inventions.egypt);const bad=requestKnowledge(s,'egypt','parthia','granaries');assert.equal(bad.ok,false);assert.equal(bad.reason,'contact');assert.equal(JSON.stringify(s.inventions.egypt),before);
 s.inventions.senate.knownIdeas.push('rhetorical_education');s.relations['egypt:senate']=30;
 const request=requestKnowledge(s,'egypt','senate','rhetorical_education');assert.equal(request.ok,true);assert.equal(s.inventions.egypt.knownIdeas.includes('rhetorical_education'),false);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.knowledgeTrades.length,1);advance(saved,3);assert.equal(saved.inventions.egypt.knownIdeas.includes('rhetorical_education'),false);assert.ok(saved.inventions.egypt.adapting);advance(saved,2);assert.ok(saved.inventions.egypt.knownIdeas.includes('rhetorical_education'));
 advance(saved,12);assert.ok(Object.values(saved.inventions).some((x)=>x.knownMaterial.length||x.knownIdeas.length||x.research));
});
test('scholar visits shorten later research; named military leaders help doctrine without instant unlock',()=>{
 const s=newGame('caesar');s.factions.caesar.treasury=200;
 assert.equal(inviteScholars(s,'caesar','senate').reason,'war');
 const military=startResearch(s,'caesar','legion_training');assert.equal(military.ok,true);assert.equal(military.remaining,3);assert.equal(s.inventions.caesar.knownIdeas.includes('legion_training'),false);
 const e=newGame('egypt');e.factions.egypt.treasury=200;e.relations['egypt:senate']=30;
 assert.equal(inviteScholars(e,'egypt','senate').ok,true);advance(e,3);
 assert.equal(e.inventions.egypt.scholarVisits,1);
 assert.equal(startResearch(e,'egypt','water').remaining,3);
});
test('offers transfer paid knowledge only after receipt, and AI develops over 36 months',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=400;s.factions.senate.treasury=400;s.relations['egypt:senate']=30;
 s.inventions.egypt.knownMaterial.push('granaries');
 assert.equal(offerKnowledge(s,'egypt','senate','granaries').ok,true);
 assert.equal(s.inventions.senate.knownMaterial.includes('granaries'),false);
 const oldSeller=s.factions.egypt.treasury;advance(s,3);
 assert.equal(s.inventions.senate.knownMaterial.includes('granaries'),true);
 assert.ok(s.factions.egypt.treasury!==oldSeller);
 advance(s,33);
 assert.ok(Object.entries(s.inventions).filter(([id])=>id!=='egypt').some(([,x])=>x.knownMaterial.length+x.knownIdeas.length>0));
 const reloaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(reloaded.inventions.egypt.knownMaterial,s.inventions.egypt.knownMaterial);
 assert.equal(reloaded.year,-46);
});
