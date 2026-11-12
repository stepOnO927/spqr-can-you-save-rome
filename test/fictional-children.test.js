import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=newborn-age-1';
import {createFictionalPerson,advanceDynasties} from '../dynasties.js?v=newborn-age-1';
import {generateFictionalChildName} from '../fictional-names.js?v=faces-of-empire-1';

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
