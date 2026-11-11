import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,forecastEconomy,upgradeSave} from '../engine.js';
import {assignSuccession,eligibleLiuImperial,CHARACTER_CATALOG} from '../characters.js?v=safe-save-1';
import {createFictionalPerson} from '../dynasties.js?v=safe-save-1';

test('Han begins with a productive core, reserves and frontier defense that consume real upkeep',()=>{
 const s=newGame('han'),han=s.factions.han,egypt=s.factions.egypt;
 assert.equal(s.world.leadership.han[0],'han_xuan');
 assert.ok(s.regions.filter(r=>r.owner==='han').length>=4);
 assert.ok(s.armies.filter(a=>a.owner==='han').reduce((n,a)=>n+a.men,0)>20000);
 assert.ok(han.treasury>egypt.treasury*2&&han.food>egypt.food&&han.manpower>egypt.manpower*3);
 const base=forecastEconomy(s,'han');assert.ok(base.food>0&&base.treasury>0);
 const before={treasury:han.treasury,food:han.food,manpower:han.manpower};tick(s);
 assert.equal(han.treasury,before.treasury+base.treasury);
 assert.equal(han.food,before.food+base.food);
 assert.equal(han.manpower,before.manpower+base.manpower);
 const extended=newGame('han');extended.armies.find(a=>a.id==='hanHexiGarrison').men+=12000;
 assert.ok(forecastEconomy(extended,'han').food<base.food);
 assert.ok(forecastEconomy(extended,'han').treasury<base.treasury);
});

test('orthodox Han succession requires documented or biological Liu imperial descent',()=>{
 const s=newGame('han');
 const unrelated=createFictionalPerson(s,{name:['Liu Qian','刘谦'],faction:'han',birthYear:-80,location:'hanGuanzhong'});
 const adopted=createFictionalPerson(s,{name:['Liu Wen','刘文'],faction:'han',birthYear:-80,location:'hanGuanzhong',adoptiveParents:['han_xuan']});
 const child=createFictionalPerson(s,{name:['Liu Min','刘敏'],faction:'han',birthYear:-80,location:'hanGuanzhong',parents:['han_xuan']});
 assert.equal(eligibleLiuImperial(s,unrelated),false);
 assert.equal(eligibleLiuImperial(s,adopted),false);
 assert.equal(eligibleLiuImperial(s,child),true);
 CHARACTER_CATALOG[unrelated].documentedLiuImperial=true;
 assert.equal(eligibleLiuImperial(s,unrelated),false);
 delete CHARACTER_CATALOG[unrelated].documentedLiuImperial;
 assert.deepEqual(s.world.characters.han_yuan.parents,['han_xuan']);
 s.world.characters.han_xuan.alive=false;
 s.world.successionPlans={han:unrelated};
 assert.deepEqual(assignSuccession(s,'han'),['han_yuan']);
 s.world.leadership.han=[unrelated];
 assert.deepEqual(assignSuccession(s,'han'),['han_yuan']);
 const corrupted=structuredClone(s);
 corrupted.world.leadership.han=[unrelated];
 corrupted.world.successionPlans.han=adopted;
 upgradeSave(corrupted);
 assert.deepEqual(corrupted.world.leadership.han,['han_yuan']);
 assert.equal(corrupted.world.successionPlans.han,undefined);
});

test('an older Mediterranean save without Han records still loads without resetting its people',()=>{
 const s=newGame('caesar'),old=structuredClone(s),original=old.world.characters.caesar;
 assert.equal(s.factions.han,undefined);
 assert.equal(s.world.characters.han_xuan,undefined);
 delete old.factions.han;old.regions=old.regions.filter(r=>r.owner!=='han');old.armies=old.armies.filter(a=>a.owner!=='han');
 delete old.world.characters.han_xuan;delete old.world.characters.han_yuan;delete old.world.leadership.han;
 assert.doesNotThrow(()=>upgradeSave(old));
 assert.equal(old.world.characters.caesar,original);
 assert.equal(old.factions.han,undefined);
});
