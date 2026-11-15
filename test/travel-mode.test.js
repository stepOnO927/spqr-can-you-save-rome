import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,forecastEconomy,upgradeSave} from '../engine.js?v=frontier-response-1';
import {configureStartingDifficulty} from '../difficulty.js?v=portraits-hundred-days-1';
import {OFFICE_TYPES,canHoldOffice,localGovernor} from '../office-system.js?v=portraits-hundred-days-1';
import {featherAdvice} from '../feather.js?v=travel-1';

for(const faction of ['caesar','senate'])test(`Travel opens a staffed, well supplied ${faction} campaign and survives saving`,()=>{
 const s=newGame(faction),before=s.armies.filter(a=>a.owner===faction).length;
 configureStartingDifficulty(s,'travel');
 const f=s.factions[faction],owned=s.regions.filter(r=>r.owner===faction);
 assert.equal(s.difficulty,'travel');
 assert.ok(f.treasury>=400&&f.food>=320&&f.manpower>=60000&&f.stability>=90&&f.legitimacy>=80);
 assert.ok(owned.every(r=>r.loyalty>=90&&r.population.satisfaction>=90));
 assert.equal(s.armies.filter(a=>a.owner===faction).length,before+3);
 assert.equal(s.armies.filter(a=>a.owner===faction&&a.name[0]==='Travel legion').length,3);
 for(const office of OFFICE_TYPES){
  const id=s.world.offices[faction][office];
  assert.ok(id&&canHoldOffice(s,faction,id));
  assert.ok(s.world.characters[id].loyalty>=80&&s.world.characters[id].education>=60);
 }
 for(const r of owned)assert.ok(localGovernor(s,r.id),`missing governor in ${r.id}`);
 assert.throws(()=>configureStartingDifficulty(s,'travel'));
 const withoutAid=structuredClone(s);withoutAid.difficulty='standard';
 const aid=forecastEconomy(s),base=forecastEconomy(withoutAid);
 assert.deepEqual([aid.treasury-base.treasury,aid.food-base.food,aid.manpower-base.manpower],[20,20,600]);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.difficulty,'travel');
 assert.equal(restored.armies.filter(a=>a.owner===faction).length,before+3);
 for(const r of owned)assert.ok(localGovernor(restored,r.id));
});

test('Feather gives bilingual, state-based advice without foreign exact strengths',()=>{
 const s=configureStartingDifficulty(newGame('caesar'),'travel');
 s.factions.caesar.food=10;
 const zh=featherAdvice(s,'zh',forecastEconomy(s)).join(' ');
 const en=featherAdvice(s,'en',forecastEconomy(s)).join(' ');
 assert.match(zh,/粮食偏低/);
 assert.match(en,/Food is low/);
 assert.doesNotMatch(zh,/敌军确切兵力.*[0-9]/);
 assert.ok(featherAdvice(s,'zh').length>=1);
});
