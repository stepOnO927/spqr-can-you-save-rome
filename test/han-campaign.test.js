import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,forecastEconomy,upgradeSave,previewMarch,moveArmy} from '../engine.js?v=faces-empire-2';
import {assignSuccession,eligibleLiuImperial,CHARACTER_CATALOG} from '../characters.js?v=faces-empire-2';
import {createFictionalPerson} from '../dynasties.js?v=faces-empire-2';
import {officeCandidates,appointOffice,dismissOffice,advanceOffices} from '../office-system.js?v=faces-empire-2';

test('Han begins with a productive core, reserves and frontier defense that consume real upkeep',()=>{
 const s=newGame('han'),han=s.factions.han,egypt=s.factions.egypt;
 assert.equal(s.world.leadership.han[0],'han_xuan');
 assert.equal(s.world.characters.han_xuan.location,'hanGuanzhong');
 assert.equal(s.world.characters.han_yuan.location,'hanGuanzhong');
 assert.ok(s.regions.filter(r=>r.owner==='han').length>=4);
 assert.ok(s.armies.filter(a=>a.owner==='han').reduce((n,a)=>n+a.men,0)>20000);
 const commanders=s.armies.filter(a=>a.owner==='han').map(a=>a.characterId);
 assert.equal(new Set(commanders).size,3);
 for(const id of commanders){
  assert.equal(s.world.characters[id].faction,'han');
  assert.ok(s.world.characters[id].homeland);
  assert.deepEqual(s.world.dynasties.catalog[id].culture,['Han Chinese','汉']);
  assert.equal(s.world.dynasties.catalog[id].fictional,true);
 }
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

test('Han commanders keep their personal identities across save migration',()=>{
 const s=newGame('han'),before=s.armies.filter(a=>a.owner==='han').map(a=>[a.id,a.characterId,a.commander]);
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(restored.armies.filter(a=>a.owner==='han').map(a=>[a.id,a.characterId,a.commander]),before);
 for(const [,id] of before)assert.equal(restored.world.dynasties.catalog[id].fictional,true);
 const again=upgradeSave(structuredClone(restored));
 assert.deepEqual(again.armies.filter(a=>a.owner==='han').map(a=>[a.id,a.characterId,a.commander]),before);
});

test('named Han court appointments provide replaceable fiscal and supply capacity',()=>{
 const s=newGame('han'),posts=s.world.offices.han,ids=Object.values(posts);
 assert.deepEqual(Object.keys(posts).sort(),['administration','finance','supply']);
 assert.equal(new Set(ids).size,3);
 for(const id of ids){assert.equal(s.world.characters[id].faction,'han');assert.equal(s.world.dynasties.catalog[id].fictional,true);assert.deepEqual(s.world.dynasties.catalog[id].culture,['Han Chinese','汉'])}
 const base=forecastEconomy(s,'han'),former=posts.finance;
 assert.equal(dismissOffice(s,'finance').ok,true);
 assert.equal(forecastEconomy(s,'han').treasury,base.treasury-2);
 const replacement=Object.keys(s.world.characters).find(id=>CHARACTER_CATALOG[id]?.name[0]==='Wang Huan');
 assert.ok(officeCandidates(s,'han','finance').includes(replacement));
 const treasury=s.factions.han.treasury;
 assert.equal(appointOffice(s,'finance',replacement).ok,true);
 assert.equal(s.factions.han.treasury,treasury-5);
 assert.equal(forecastEconomy(s,'han').treasury,base.treasury);
 assert.notEqual(posts.finance,former);
 assert.equal(upgradeSave(structuredClone(s)).world.offices.han.finance,replacement);
});

test('Han AI replaces an unavailable minister without hidden resources',()=>{
 const s=newGame('han'),former=s.world.offices.han.finance,before=s.factions.han.treasury;
 s.world.characters[former].health='seriously_ill';s.month=7;
 advanceOffices(s,{autoplayPlayer:true});
 assert.notEqual(s.world.offices.han.finance,former);
 assert.equal(s.factions.han.treasury,before-5);
 assert.ok(s.world.characters[s.world.offices.han.finance].alive);
});

test('Shanshan remains independent and the frontier crossing pays real transport costs',()=>{
 const s=newGame('han'),oasis=s.regions.find(r=>r.id==='shanshanOasis'),court=s.world.leadership.shanshan;
 assert.equal(oasis.owner,'shanshan');
 assert.equal(s.regions.find(r=>r.id==='hanHexi').owner,'han');
 assert.equal(court.length,1);
 assert.equal(s.world.dynasties.catalog[court[0]].fictional,true);
 assert.equal(s.world.characters[court[0]].faction,'shanshan');
 assert.equal(s.world.characters[s.armies.find(a=>a.id==='shanshanGuard').characterId].faction,'shanshan');
 assert.equal(previewMarch(s,'hanHexiGarrison','shanshanOasis').reason,'peace');
 s.wars.push(['han','shanshan']);
 const plan=previewMarch(s,'hanHexiGarrison','shanshanOasis');
 assert.equal(plan.ok,true);assert.ok(plan.months>=4);
 assert.deepEqual(plan.frontierCost,{food:8,treasury:6});
 const before={food:s.factions.han.food,treasury:s.factions.han.treasury};
 assert.equal(moveArmy(s,'hanHexiGarrison','shanshanOasis').ok,true);
 assert.equal(s.factions.han.food,before.food-8);
 assert.equal(s.factions.han.treasury,before.treasury-6);
 assert.equal(s.armies.find(a=>a.id==='hanHexiGarrison').move.frontier,true);
 const starved=newGame('han');starved.wars.push(['han','shanshan']);starved.factions.han.food=7;
 assert.equal(previewMarch(starved,'hanHexiGarrison','shanshanOasis').reason,'supply');
 assert.equal(newGame('caesar').factions.shanshan,undefined);
});

test('autonomous Han keeps a capital reserve and the outmatched oasis court defends',()=>{
 const s=newGame('han');s.wars.push(['han','shanshan']);
 tick(s,{autoplayPlayer:true});
 const capital=s.armies.find(a=>a.id==='hanCapitalGuard'),oasis=s.armies.find(a=>a.id==='shanshanGuard');
 assert.equal(capital.region,'hanGuanzhong');assert.equal(capital.move,null);assert.equal(capital.order.kind,'guard');
 assert.equal(oasis.region,'shanshanOasis');assert.equal(oasis.move,null);assert.equal(oasis.order.kind,'guard');
 for(let month=0;month<3;month++)tick(s,{autoplayPlayer:true});
 assert.equal(capital.region,'hanGuanzhong');assert.equal(capital.move,null);
 assert.ok(s.armies.find(a=>a.id==='hanHexiGarrison').move?.frontier);
});

test('Han can win a favorable oasis campaign without bankrupting its long-term court',()=>{
 const s=newGame('han');s.wars.push(['han','shanshan']);
 for(let month=0;month<120;month++)tick(s,{autoplayPlayer:true});
 const victory=s.battles.find(b=>b.attacker.owner==='han'&&b.defender.owner==='shanshan'&&b.attackerWins);
 assert.ok(victory,'a recorded battlefield victory must precede occupation');
 assert.equal(s.regions.find(r=>r.id==='shanshanOasis').owner,'han');
 assert.equal(s.armies.find(a=>a.id==='hanCapitalGuard').region,'hanGuanzhong');
 assert.ok(s.factions.han.treasury>=100,'the AI keeps a real fiscal reserve');
 assert.equal(s.year,-39);assert.equal(s.month,1);
});

test('old Han saves gain the oasis court without rewriting their own campaign',()=>{
 const old=structuredClone(newGame('han'));
 const ruler=old.world.leadership.shanshan[0],guard=old.armies.find(a=>a.id==='shanshanGuard').characterId;
 delete old.factions.shanshan;old.regions=old.regions.filter(r=>r.id!=='shanshanOasis');old.armies=old.armies.filter(a=>a.id!=='shanshanGuard');
 delete old.world.leadership.shanshan;delete old.world.hanFrontierPeopleSeeded;
 for(const id of [ruler,guard]){delete old.world.characters[id];delete old.world.dynasties.catalog[id]}
 old.factions.han.treasury=137;const ownCommander=old.armies.find(a=>a.id==='hanHexiGarrison').characterId;
 const restored=upgradeSave(old);
 assert.equal(restored.factions.han.treasury,137);
 assert.equal(restored.armies.find(a=>a.id==='hanHexiGarrison').characterId,ownCommander);
 assert.equal(restored.regions.find(r=>r.id==='shanshanOasis').owner,'shanshan');
 assert.equal(restored.world.leadership.shanshan.length,1);
 assert.equal(upgradeSave(structuredClone(restored)).regions.filter(r=>r.id==='shanshanOasis').length,1);
});

test('older Han saves acquire court personnel once while preserving resources',()=>{
 const old=structuredClone(newGame('han')),ids=Object.values(old.world.offices.han);
 for(const id of ids){delete old.world.characters[id];delete old.world.dynasties.catalog[id]}
 delete old.world.offices.han;delete old.world.hanCourtSeeded;old.factions.han.food=123;
 const restored=upgradeSave(old),posts={...restored.world.offices.han};
 assert.equal(restored.factions.han.food,123);
 assert.equal(new Set(Object.values(posts)).size,3);
 for(const id of Object.values(posts))assert.equal(restored.world.characters[id].faction,'han');
 assert.deepEqual(upgradeSave(structuredClone(restored)).world.offices.han,posts);
});
