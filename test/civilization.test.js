import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,build,canBuild,setReligionPolicy,recruitFigure,patronizeCulture,culturalProject,region} from '../engine.js';
import {BUILDINGS,RELIGIONS,POLICIES,ROLE_NAMES,civilizationYield,advanceCivilization} from '../civilization.js';
import {CHARACTER_CATALOG} from '../characters.js';
import {canConstruct,startConstruction} from '../inventions.js';

test('civic buildings and researched projects share one local construction capacity',()=>{
 const s=newGame('caesar'),r=region(s,'narbo');
 s.inventions.caesar.knownMaterial.push('granaries');
 assert.equal(build(s,'caesar','narbo','granary').ok,true);
 assert.equal(canConstruct(s,'caesar','narbo','granaries'),'busy');
 r.buildQueue=null;
 assert.equal(startConstruction(s,'caesar','narbo','granaries').ok,true);
 assert.equal(canBuild(s,'caesar','narbo','granary').reason,'queue');
 r.owner='senate';advanceCivilization(s);
 assert.equal(r.buildQueue,null);
});

test('construction spends treasury, takes months, respects geography and changes supply',()=>{
 const s=newGame('caesar'),f=s.factions.caesar,r=region(s,'gaul'),before=f.treasury;
 assert.equal(canBuild(s,'caesar','gaul','mine').reason,'research');
 f.research=1;assert.equal(canBuild(s,'caesar','gaul','port').reason,'geography');
 assert.equal(canBuild(s,'caesar','roma','granary').reason,'ownership');
 assert.equal(build(s,'caesar','gaul','depot').ok,true);
 assert.equal(f.treasury,before-BUILDINGS.depot.cost);
 assert.equal(r.supply,10);assert.equal(r.buildQueue.remaining,3);
 advanceCivilization(s);advanceCivilization(s);assert.equal(r.supply,10);
 advanceCivilization(s);assert.ok(r.buildings.includes('depot'));assert.equal(r.supply,13);
 assert.ok(civilizationYield(s,r).maintenance>0);
});

test('religious demographics and policy affect local satisfaction, with no instant population deletion',()=>{
 const s=newGame('egypt'),r=region(s,'egypt'),population=r.population;
 assert.deepEqual(r.religions,{egyptian:70,greek:25,jewish:5});
 const before=civilizationYield(s,r).target;
 assert.equal(setReligionPolicy(s,'egypt','selected','greek').ok,true);
 const selected=civilizationYield(s,r).target;
 assert.notEqual(selected,before);assert.equal(r.population,population);
 assert.equal(setReligionPolicy(s,'egypt','accommodation').ok,true);
 assert.ok(civilizationYield(s,r).target>selected);
 assert.equal(region(newGame('caesar'),'roma').religions.christian,undefined);
 assert.equal(setReligionPolicy(s,'egypt','selected','christian').ok,false);
 s.factions.egypt.research=3;s.year=300;assert.equal(canBuild(s,'egypt','egypt','lateBasilica').reason,'chronology');
});

test('dissatisfied residents migrate gradually to a neighboring friendly theater',()=>{
 const s=newGame('caesar'),from=region(s,'gaul'),to=region(s,'narbo');
 from.satisfaction=20;to.satisfaction=80;to.population=600000;const a=from.population,b=to.population;
 advanceCivilization(s);
 assert.ok(from.population<a);assert.equal(a-from.population,to.population-b);
 assert.ok(a-from.population<=Math.floor(a*.002));
});

test('recruitment respects sovereigns, employment, relations, travel and persistent identity',()=>{
 const s=newGame('egypt');s.factions.egypt.culturalPrestige=40;s.relations['egypt:senate']=30;
 assert.equal(recruitFigure(s,'egypt','pompey','statesman','egypt').ok,false);
 const offered=recruitFigure(s,'egypt','varro','scholar','egypt');assert.equal(offered.ok,true);assert.ok(offered.remaining>1);
 assert.equal(recruitFigure(s,'egypt','varro','scholar','egypt').reason,'employed');
 for(let i=0;i<offered.remaining;i++)advanceCivilization(s);
 assert.equal(s.world.characters.varro.faction,'egypt');assert.equal(s.world.characters.varro.civilizationRole,'scholar');
 assert.equal(Object.values(s.world.characters).filter(c=>c.id==='varro').length,1);
});

test('prestige is earned and spent on distinct cultural actions',()=>{
 const s=newGame('caesar'),f=s.factions.caesar,r=region(s,'gaul'),initial=f.culturalPrestige;
 assert.equal(patronizeCulture(s,'caesar',r.id).ok,true);assert.equal(f.culturalPrestige,initial+4);
 assert.equal(culturalProject(s,'caesar',r.id,'education').ok,true);assert.equal(f.research,1);
 assert.equal(culturalProject(s,'caesar',r.id,'festival').ok,true);
 assert.equal(culturalProject(s,'caesar',r.id,'festival').ok,false);
});

test('historical specialists, building descriptions and policies are bilingual and sourced',()=>{
 for(const b of Object.values(BUILDINGS)){assert.equal(b.name.length,2);assert.equal(b.description.length,2);assert.match(b.source,/^https:\/\//);assert.ok(b.cost>0&&b.months>0)}
 for(const x of [...Object.values(RELIGIONS),...Object.values(ROLE_NAMES)])assert.equal(x.length,2);
 for(const p of Object.values(POLICIES))assert.equal(p.name.length,2);
 assert.match(CHARACTER_CATALOG.vitruvius.role[1],/不详/);
 assert.match(CHARACTER_CATALOG.varro.source,/^https:\/\//);
});

test('old saves migrate without changing territory control or existing characters',()=>{
 const old=newGame('senate'),before=old.regions.map(r=>r.owner);for(const r of old.regions)for(const key of ['population','satisfaction','religions','resources','buildings','buildQueue'])delete r[key];for(const f of Object.values(old.factions))delete f.culturalPrestige;
 const s=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(s.regions.map(r=>r.owner),before);assert.ok(region(s,'roma').population>0);assert.deepEqual(region(s,'roma').buildings,[]);
 assert.ok(s.world.characters.cicero);assert.equal(s.world.characters.varro,undefined);
});

test('36 months of civilization development include AI building and specialist effects',()=>{
 const s=newGame('senate'),r=region(s,'africa'),f=s.factions.senate;
 assert.equal(build(s,'senate',r.id,'granary').ok,true);
 assert.equal(recruitFigure(s,'senate','varro','scholar',r.id).ok,true);
 assert.equal(setReligionPolicy(s,'senate','accommodation').ok,true);
 const population=r.population;
 for(let i=0;i<36;i++)tick(s);
 assert.ok(r.buildings.includes('granary'));assert.ok(f.research>0);assert.ok(r.population!==population);
 assert.ok(s.regions.some(x=>x.owner!==s.player&&x.buildings.length>0));
 assert.ok(Object.values(s.world.characters).some(c=>c.faction!==s.player&&c.civilizationRole));
 assert.equal(s.factions.egypt.religionPolicy,'toleration');
 assert.ok(Object.values(s.factions).some(x=>x.religionPolicy==='accommodation'));
 assert.ok(s.civilizationHistory.some(x=>x.kind==='building'));
 assert.ok(s.log.some(x=>/completed|建成/.test(x.en+x.zh)));
});
