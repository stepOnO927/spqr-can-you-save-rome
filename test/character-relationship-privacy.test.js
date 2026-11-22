import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=portrait-fourteen-1';
import {visiblePersonalRelationships} from '../map-lab/character-ui.js?v=portrait-fourteen-1';

test('foreign dossier relationships are limited to completed meetings observed by the player',()=>{
 let s=newGame('caesar');s.world.personalRelations['caesar:cleopatra']={trust:87,meetings:42};
 assert.deepEqual(visiblePersonalRelationships(s,'cleopatra',false),[]);
 s.meetings.push({actor:'senate',targetFaction:'egypt',person:'pompey',target:'cleopatra',status:'met',year:s.year,month:s.month,contactCredit:9});
 s.meetings.push({actor:'caesar',targetFaction:'egypt',person:'caesar',target:'cleopatra',status:'met',year:s.year+1,month:s.month,contactCredit:8});
 assert.deepEqual(visiblePersonalRelationships(s,'cleopatra',false),[]);
 s.meetings.push({actor:'egypt',targetFaction:'caesar',person:'cleopatra',target:'caesar',status:'met',year:s.year,month:s.month,contactCredit:2});
 const before=visiblePersonalRelationships(s,'cleopatra',false);assert.deepEqual(before,[{other:'caesar',kind:'contact',credit:2,year:s.year,month:s.month}]);
 assert.deepEqual(visiblePersonalRelationships(s,'caesar',true).filter(x=>x.kind==='contact'),[{other:'cleopatra',kind:'contact',credit:2,year:s.year,month:s.month}]);
 s.world.personalRelations['caesar:cleopatra']={trust:-99,meetings:999};s=upgradeSave(structuredClone(s));assert.deepEqual(visiblePersonalRelationships(s,'cleopatra',false),before);
 s.year++;assert.equal(visiblePersonalRelationships(s,'cleopatra',false)[0].credit,8);
});

test('a missing friendly person does not expose live own-court trust',()=>{
 const s=newGame('caesar');s.world.personalRelations[['caesar','antony'].sort().join(':')]={trust:71,meetings:1};assert.ok(visiblePersonalRelationships(s,'caesar',true).some(x=>x.other==='antony'&&x.trust===71));
 s.world.characters.caesar.missing={year:s.year,month:s.month};assert.ok(!visiblePersonalRelationships(s,'caesar',true).some(x=>x.kind==='own'));
});
