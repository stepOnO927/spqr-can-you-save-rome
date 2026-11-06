import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,researchInnovation,adoptIdea,removeIdea,expandIdeaSlot,startConstruction,constructionCheck,knowledgeTrade,purchaseMaterials} from '../engine.js';
import {IDEA_CATEGORIES,IDEAS,MATERIALS,BUILDINGS,development,activeEffects} from '../development.js';
const months=(s,n)=>{for(let i=0;i<n;i++)tick(s)};

test('five categories begin with one independent inactive slot and research alone has no effect',()=>{
  const s=newGame();const d=development(s,'caesar');
  assert.equal(IDEA_CATEGORIES.length,5);assert.equal(IDEAS.length,25);assert.equal(MATERIALS.length,34);assert.equal(BUILDINGS.length,33);
  assert.deepEqual(Object.values(d.slots).map(x=>x.length),[1,1,1,1,1]);
  assert.equal(researchInnovation(s,'caesar','idea','legion-training').ok,true);
  assert.equal(activeEffects(s,'caesar').recruitMorale,undefined);
  months(s,3);assert.ok(d.knownIdeas.includes('legion-training'));
  assert.equal(activeEffects(s,'caesar').recruitMorale,undefined);
  assert.equal(adoptIdea(s,'caesar','legion-training',0).ok,true);
  months(s,2);assert.equal(d.slots.military[0],'legion-training');
  assert.equal(activeEffects(s,'caesar').recruitMorale,6);
  assert.equal(removeIdea(s,'caesar','military',0).ok,true);
  months(s,2);assert.equal(activeEffects(s,'caesar').recruitMorale,undefined);
  assert.ok(d.knownIdeas.includes('legion-training'));
});

test('ideas remain in their category, conflicting policies are rejected, expansion is category specific',()=>{
  const s=newGame();const d=development(s,'caesar');s.factions.caesar.treasury=500;
  d.knownIdeas.push('senatorial-consultation','central-administration','provincial-autonomy','legion-training');
  assert.equal(adoptIdea(s,'caesar','legion-training',1).ok,false);
  assert.equal(adoptIdea(s,'caesar','senatorial-consultation',0).ok,true);months(s,2);
  assert.equal(adoptIdea(s,'caesar','central-administration',0).reason,'conflict');
  assert.equal(expandIdeaSlot(s,'caesar','government').ok,true);months(s,6);
  assert.equal(d.slots.government.length,2);assert.equal(d.slots.military.length,1);
  assert.equal(adoptIdea(s,'caesar','provincial-autonomy',1).ok,true);months(s,3);
  assert.equal(d.slots.government[1],'provincial-autonomy');
});

test('material knowledge permits delayed construction with terrain, deposits, materials and upkeep',()=>{
  const s=newGame('egypt');const d=development(s,'egypt');s.factions.egypt.treasury=500;d.knownMaterial.push('roadmaking');
  assert.equal(constructionCheck(s,'egypt','egypt','road').ok,true);
  assert.equal(startConstruction(s,'egypt','egypt','road').ok,true);
  assert.ok(!s.regions.find(r=>r.id==='egypt').buildings.includes('road'));
  months(s,3);assert.ok(s.regions.find(r=>r.id==='egypt').buildings.includes('road'));
  assert.equal(constructionCheck(s,'egypt','egypt','barracks').reason,'technology');
  const s2=newGame();development(s2,'caesar').knownMaterial.push('metal-extraction');
  assert.equal(constructionCheck(s2,'caesar','narbo','mine').reason,'deposit');
  assert.equal(constructionCheck(s2,'caesar','gaul','mine').reason,'terrain');
  const old=s.factions.egypt.treasury;assert.equal(researchInnovation(s,'egypt','material','barracks-design').ok,true);assert.ok(s.factions.egypt.treasury<old);
  months(s,3);assert.ok(d.knownMaterial.includes('barracks-design'));
});

test('knowledge trade transfers knowledge after travel, never constructs or adopts it',()=>{
  const s=newGame();s.factions.caesar.treasury=200;s.relations['caesar:egypt']=20;
  const d=development(s,'caesar');assert.ok(!d.knownMaterial.includes('water-control'));
  const result=knowledgeTrade(s,'caesar','egypt','material','water-control');assert.equal(result.ok,true);
  assert.ok(!d.knownMaterial.includes('water-control'));
  months(s,2);assert.ok(d.knownMaterial.includes('water-control'));
  assert.equal(s.regions.find(r=>r.id==='cisalpine').buildings.length,0);
  development(s,'egypt').knownIdeas.push('cultural-accommodation');
  assert.equal(knowledgeTrade(s,'caesar','egypt','idea','cultural-accommodation').ok,true);
  months(s,2);assert.ok(d.knownIdeas.includes('cultural-accommodation'));
  assert.equal(activeEffects(s,'caesar').loyalty,undefined);
  assert.equal(adoptIdea(s,'caesar','cultural-accommodation',0).ok,true);
  months(s,2);assert.equal(activeEffects(s,'caesar').loyalty,undefined);
  months(s,2);assert.equal(activeEffects(s,'caesar').loyalty,2);
  s.relations['caesar:egypt']=-20;
  assert.equal(knowledgeTrade(s,'caesar','egypt','material','water-control').ok,false);
});

test('old saves gain development without losing territory, and AI participates through 36 months',()=>{
  const s=newGame();const owner=s.regions.find(r=>r.id==='roma').owner;delete s.development;
  const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.regions.find(r=>r.id==='roma').owner,owner);
  assert.equal(development(loaded,'egypt').slots.culture.length,1);
  for(const id of Object.keys(loaded.factions))loaded.factions[id].treasury+=300;
  months(loaded,36);
  assert.ok(loaded.development.senate.knownMaterial.length>2||loaded.development.senate.knownIdeas.length>0);
  assert.ok(loaded.development.egypt.knownMaterial.length>2||loaded.development.egypt.knownIdeas.length>0);
  assert.doesNotThrow(()=>JSON.stringify(loaded));
});

test('36-month campaigns remain playable for distinct starting civilizations',()=>{
  for(const player of ['caesar','senate','egypt','numidia']){
    const s=newGame(player);months(s,36);
    assert.ok(Number.isFinite(s.factions[player].treasury),player);
    assert.ok(s.development[player].knownMaterial.length>=2,player);
    assert.equal(Object.keys(s.development[player].slots).length,5,player);
    assert.doesNotThrow(()=>upgradeSave(JSON.parse(JSON.stringify(s))),player);
  }
});

test('expanded material catalog enforces source geography and real engineering prerequisites',()=>{
  const s=newGame('egypt'),d=development(s,'egypt');s.factions.egypt.treasury=500;
  assert.equal(researchInnovation(s,'egypt','material','shipyard-craft').reason,'prerequisite');
  d.knownMaterial.push('port-facilities','shipyard-craft');
  assert.equal(constructionCheck(s,'egypt','egypt','shipyard').reason,'port');
  assert.equal(constructionCheck(s,'egypt','egypt','port').ok,true);
  assert.equal(startConstruction(s,'egypt','egypt','port').ok,true);months(s,5);
  assert.ok(s.regions.find(r=>r.id==='egypt').buildings.includes('port'));
  assert.equal(purchaseMaterials(s,'egypt','stone').ok,true);
  assert.equal(constructionCheck(s,'egypt','egypt','shipyard').ok,true);
  assert.equal(constructionCheck(s,'egypt','egypt','dam').reason,'technology');
});

test('waterworks and libraries change real food losses and research spending',()=>{
  const base=newGame('senate');base.year=-47;base.month=6;base.factions.senate.food=200;
  const dry=structuredClone(base),protectedState=structuredClone(base);
  protectedState.regions.find(r=>r.id==='italiaN').buildings.push('dam');
  tick(dry);tick(protectedState);
  assert.ok(protectedState.factions.senate.food>dry.factions.senate.food);
  const plain=newGame('egypt'),learned=newGame('egypt');
  learned.regions.find(r=>r.id==='egypt').buildings.push('library');
  const beforePlain=plain.factions.egypt.treasury,beforeLearned=learned.factions.egypt.treasury;
  assert.equal(researchInnovation(plain,'egypt','idea','rhetorical-education').ok,true);
  assert.equal(researchInnovation(learned,'egypt','idea','rhetorical-education').ok,true);
  assert.equal(beforeLearned-learned.factions.egypt.treasury,(beforePlain-plain.factions.egypt.treasury)-3);
});
