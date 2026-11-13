import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {assignSuccession,eligibleLiuImperial,leadershipTitle,successorFor,CHARACTER_CATALOG} from '../characters.js?v=faces-empire-2';
import {createFictionalPerson} from '../dynasties.js?v=faces-empire-2';
import {renderGenealogy} from '../genealogy-ui.js?v=faces-empire-2';
import {deriveGovernment} from '../governance.js?v=faces-empire-2';
import {proceduralPortraitSvg} from '../portrait-registry.js?v=faces-empire-2';

test('each Republican command can elevate an original adult political leader after historical successors are lost',()=>{
 for(const [faction,historical] of [['caesar',['caesar','antony','lepidus']],['senate',['pompey','cato','scipio','labienus','cicero']]]){
  let s=newGame(faction);
  const leader=createFictionalPerson(s,{name:[`Original ${faction} leader`,`原创${faction}领袖`],faction,birthYear:-80,sex:'male',location:faction==='caesar'?'cisalpine':'roma'});
  assert.equal(successorFor(s,faction).includes(leader),false,'an unbacked court member is not a command successor');
  s.world.characters[leader].influence=88;
  const agent=createFictionalPerson(s,{name:['Field courier','野战信使'],faction,birthYear:-80,sex:'male'});
  s.world.characters[agent].profession='courier';s.world.characters[agent].influence=99;
  for(const id of historical)if(s.world.characters[id])s.world.characters[id].alive=false;
  assert.equal(successorFor(s,faction).includes(agent),false);
  assert.deepEqual(assignSuccession(s,faction),[leader]);
  assert.equal(deriveGovernment(s,faction).kind,'normal');
  assert.deepEqual(leadershipTitle(faction,[leader],s),['Roman faction leadership','罗马派系领袖']);
  const image=proceduralPortraitSvg(s,leader);assert.match(image,/<svg/);
  const seed=s.world.characters[leader].portraitSeed;
  s=upgradeSave(structuredClone(s));
  assert.deepEqual(s.world.leadership[faction],[leader]);
  assert.equal(s.world.characters[leader].portraitSeed,seed);
  assert.equal(proceduralPortraitSvg(s,leader),image);
 }
});

test('a fictional Parthian court outsider founds a saved house with political cost',()=>{
 const s=newGame('parthia'),oldHouse=s.world.dynasties.rulingHouses.parthia;
 const founder=createFictionalPerson(s,{name:['Artaban of Seleucia','塞琉西亚的阿尔达班'],faction:'parthia',birthYear:-83,sex:'male',location:'parthia'});
 s.world.characters[founder].influence=95;s.world.characters.orodes.alive=false;
 assert.deepEqual(assignSuccession(s,'parthia'),[founder]);
 assert.equal(s.world.dynasties.houseTransitions.at(-1).founder,founder);
 assert.equal(s.world.dynasties.houseTransitions.at(-1).from,oldHouse);
 assert.equal(s.world.dynasties.rulingHouses.parthia,s.world.characters[founder].familyId);
 assert.equal(s.factions.parthia.legitimacy,55);
 assert.equal(leadershipTitle('parthia',[founder])[0],'Parthian king');
 assert.match(renderGenealogy(s,false),/RULING HOUSE \(SIMULATED\)/);
 assert.match(renderGenealogy(s,false),/New ruling house founded by Artaban of Seleucia/);
 assert.match(renderGenealogy(s,true),/新执政家族由塞琉西亚的阿尔达班/);
 const loaded=upgradeSave(structuredClone(s));
 assert.deepEqual(loaded.world.dynasties.houseTransitions,s.world.dynasties.houseTransitions);
 assert.equal(loaded.world.dynasties.rulingHouses.parthia,s.world.dynasties.rulingHouses.parthia);
});

test('a documented Liu descendant may inherit Han while an unrelated minister remains excluded',()=>{
 const s=newGame('han');
 const prince=createFictionalPerson(s,{name:['Liu Jin','刘进'],faction:'han',birthYear:-77,sex:'male',parents:['han_yuan'],location:'hanGuanzhong'});
 const minister=createFictionalPerson(s,{name:['Liu Impostor','刘僭称'],faction:'han',birthYear:-78,sex:'male',location:'hanGuanzhong'});
 s.world.characters[minister].influence=100;
 assert.equal(eligibleLiuImperial(s,prince),true);
 assert.equal(eligibleLiuImperial(s,minister),false);
 s.world.characters.han_yuan.alive=false;s.world.characters.han_xuan.alive=false;
 assert.deepEqual(assignSuccession(s,'han'),[prince]);
 assert.equal(s.world.dynasties.rulingHouses.han,'han-liu');
 assert.equal(s.world.dynasties.houseTransitions.length,0);
 assert.deepEqual(upgradeSave(structuredClone(s)).world.leadership.han,[prince]);
});

test('embedded Han succession requires a male Liu birth line and displayed Liu surname',()=>{
 let s=newGame('han');
 const father=createFictionalPerson(s,{name:['Liu Yuan','刘渊'],faction:'han',birthYear:-69,sex:'male',parents:['han_xuan']});
 const grandson=createFictionalPerson(s,{name:['Liu Jun','刘峻'],faction:'han',birthYear:-50,sex:'male',parents:[father]});
 const daughter=createFictionalPerson(s,{name:['Liu Lan','刘兰'],faction:'han',birthYear:-70,sex:'female',parents:['han_xuan']});
 const maternal=createFictionalPerson(s,{name:['Liu Ming','刘明'],faction:'han',birthYear:-52,sex:'male',parents:[daughter]});
 const wrongSurname=createFictionalPerson(s,{name:['Zhang Yi','张义'],faction:'han',birthYear:-70,sex:'male',parents:['han_xuan']});
 const adopted=createFictionalPerson(s,{name:['Liu Wei','刘威'],faction:'han',birthYear:-70,sex:'male',adoptiveParents:['han_xuan']});
 assert.equal(eligibleLiuImperial(s,father),true);
 assert.equal(eligibleLiuImperial(s,grandson),true);
 for(const id of [daughter,maternal,wrongSurname,adopted])assert.equal(eligibleLiuImperial(s,id),false,id);
 const priorName=[...CHARACTER_CATALOG[grandson].name];
 CHARACTER_CATALOG[grandson].name=['Zhang from another game','另一战役的张某'];
 try{
  assert.equal(eligibleLiuImperial(s,grandson),true,'the saved name takes precedence over a global catalog entry');
  assert.deepEqual(s.world.dynasties.catalog[grandson].name,priorName,'display catalog changes cannot rewrite the save');
 }finally{CHARACTER_CATALOG[grandson].name=priorName}
 s=upgradeSave(structuredClone(s));
 assert.equal(eligibleLiuImperial(s,grandson),true);
 for(const id of [daughter,maternal,wrongSurname,adopted])assert.equal(eligibleLiuImperial(s,id),false,id);
});
