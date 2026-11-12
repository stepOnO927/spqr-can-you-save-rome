import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {assignSuccession,eligibleLiuImperial,leadershipTitle} from '../characters.js?v=faces-empire-2';
import {createFictionalPerson} from '../dynasties.js?v=faces-empire-2';
import {renderGenealogy} from '../genealogy-ui.js?v=faces-empire-2';

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
