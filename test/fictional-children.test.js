import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {createFictionalPerson,advanceDynasties} from '../dynasties.js?v=faces-empire-2';
import {generateFictionalChildName} from '../fictional-names.js?v=faces-of-empire-1';
import {proceduralPortraitSvg} from '../portrait-registry.js?v=faces-empire-2';

test('Han children keep a recorded family and use Han names across saves',()=>{
 const s=newGame('han');
 const father=createFictionalPerson(s,{name:['Liu Test','刘试'],faction:'han',birthYear:-80,sex:'male',location:'hanGuanzhong'});
 const mother=createFictionalPerson(s,{name:['Wang Test','王试'],faction:'han',birthYear:-74,sex:'female',location:'hanGuanzhong'});
 s.world.characters[father].spouse=mother;s.world.characters[mother].spouse=father;
 for(let i=0;i<15;i++){s.year=-49+i;s.month=1;advanceDynasties(s)}
 const child=s.world.characters[mother].children[0];assert.ok(child);
 assert.equal(s.world.characters[child].familyId,s.world.characters[mother].familyId);
 assert.deepEqual(s.world.characters[child].parents,[mother,father]);
 assert.match(s.world.dynasties.catalog[child].name[0],/^Liu /);
 assert.match(s.world.dynasties.catalog[child].name[1],/^刘/);
 assert.deepEqual(upgradeSave(structuredClone(s)).world.dynasties.catalog[child],s.world.dynasties.catalog[child]);
});

test('female Ptolemaic and other court children use faction naming pools',()=>{
 const s=newGame('egypt');
 const father=createFictionalPerson(s,{name:['Nikon of Alexandria','亚历山大里亚的尼孔'],faction:'egypt',birthYear:-80,sex:'male',location:'egypt'});
 const greek=generateFictionalChildName(s,{faction:'egypt',fatherId:father,sex:'female',location:'egypt'});
 const parthian=generateFictionalChildName(s,{faction:'parthia',fatherId:father,sex:'male',location:'parthia'});
 assert.match(greek.name[0],/^(Kleio|Thaleia|Dione) of Alexandria/);
 assert.equal(greek.culture[0],'Ptolemaic Egyptian court (Greek-speaking)');
 assert.match(parthian.name[0],/of Seleucia/);
 assert.notEqual(greek.name[0],parthian.name[0]);
});

test('a fictional face retains its identity while age changes its visible details',()=>{
 const s=newGame('caesar');
 const id=createFictionalPerson(s,{name:['Lucius Testus','卢修斯·泰斯图斯'],faction:'caesar',birthYear:-80,sex:'male',location:'cisalpine'});
 const seed=s.world.characters[id].portraitSeed,young=proceduralPortraitSvg(s,id);
 s.year=-14;const older=proceduralPortraitSvg(s,id);
 assert.notEqual(older,young);
 assert.match(older,/opacity=".6"/);
 assert.equal(s.world.characters[id].portraitSeed,seed);
 assert.equal(proceduralPortraitSvg(upgradeSave(structuredClone(s)),id),older);
});

test('a foreign meeting portrait does not reveal later hidden aging or death',()=>{
 const s=newGame('caesar');
 const id=createFictionalPerson(s,{name:['Theon of Alexandria','亚历山大里亚的提翁'],faction:'egypt',birthYear:-80,sex:'male',location:'egypt'});
 const observed={portraitSeed:s.world.characters[id].portraitSeed,portraitFaction:'egypt',resolvedYear:-49,year:-49};
 const first=proceduralPortraitSvg(s,id,observed);
 s.year=1;s.world.characters[id].deathYear=-20;s.world.characters[id].alive=false;
 assert.equal(proceduralPortraitSvg(s,id,observed),first);
});
