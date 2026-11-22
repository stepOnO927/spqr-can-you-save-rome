import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=office-age-verified-1';
import {createFictionalPerson,advanceDynasties} from '../dynasties.js?v=office-age-verified-1';
import {generateFictionalChildName} from '../fictional-names.js?v=faces-wheels-1';
import {proceduralPortraitSvg,observedProceduralPortrait} from '../portrait-registry.js?v=missing-fate-privacy-1';
import {appointOffice,dismissOffice} from '../office-system.js?v=office-age-verified-1';
import {addReport} from '../character-system.js?v=office-age-verified-1';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=office-age-verified-1';

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

test('children of breakaway courts keep their political origin in names and saves',()=>{
 let s=newGame('caesar');const romanForce='movement_force:99',egyptianForce='movement_force:100';
 s.world.movements.push({id:'movement:99',force:romanForce,parent:'caesar'},{id:'movement:100',force:egyptianForce,parent:'egypt'});
 s.factions[romanForce]={treasury:20,food:20,manpower:100,stability:50,legitimacy:50};
 const father=createFictionalPerson(s,{name:['Marcus Valerius','马库斯·瓦勒里乌斯'],faction:romanForce,birthYear:-80,sex:'male',location:'cisalpine',culture:['Roman','罗马']});
 const mother=createFictionalPerson(s,{name:['Livia Aemilia','莉维娅·埃米利娅'],faction:romanForce,birthYear:-75,sex:'female',location:'cisalpine',culture:['Roman','罗马']});
 s.world.characters[father].spouse=mother;s.world.characters[mother].spouse=father;
 for(let i=0;i<15&&!s.world.characters[mother].children.length;i++){s.year=-49+i;s.month=1;advanceDynasties(s)}
 const child=s.world.characters[mother].children[0];assert.ok(child,'the breakaway household should have an actual child');
 assert.equal(s.world.characters[child].faction,romanForce);assert.equal(s.world.characters[child].familyId,s.world.characters[father].familyId);
 const childName=s.world.dynasties.catalog[child].name;
 if(s.world.characters[child].sex==='female'){
  assert.match(childName[0],/^Valeria (Marcia|Livia)$/);
  assert.match(childName[1],/^瓦勒里娅·(玛尔基娅|莉维娅)$/);
 }else{
  assert.match(childName[0],/^(Aulus|Lucius) Valerius$/);
  assert.match(childName[1],/^(奥卢斯|卢基乌斯)·瓦勒里乌斯$/);
 }
 assert.deepEqual(s.world.dynasties.catalog[child].culture,['Roman','罗马']);
 const greek=generateFictionalChildName(s,{faction:egyptianForce,fatherId:father,sex:'female',location:'egypt'});
 assert.match(greek.name[0],/^(Kleio|Thaleia|Dione) of Alexandria/);assert.equal(greek.culture[0],'Ptolemaic Egyptian court (Greek-speaking)');
 s=upgradeSave(structuredClone(s));assert.equal(s.world.characters[child].faction,romanForce);
 assert.deepEqual(s.world.dynasties.catalog[child].culture,['Roman','罗马']);
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

test('a fictional face keeps its features through office and command changes',()=>{
 const s=newGame('caesar');
 const id=createFictionalPerson(s,{name:['Lucius Marcellus','卢修斯·马尔凯卢斯'],faction:'caesar',birthYear:-80,sex:'male',location:'cisalpine'});
 const civilian=proceduralPortraitSvg(s,id),face=/<ellipse cx="40" cy="37"[^>]+>/.exec(civilian)?.[0];
 assert.match(civilian,/data-station="civilian"/);
 assert.equal(appointOffice(s,'finance',id).ok,true);
 const official=proceduralPortraitSvg(s,id);assert.match(official,/data-station="official"/);assert.ok(official.includes(face));assert.notEqual(official,civilian);
 dismissOffice(s,'finance');assert.equal(proceduralPortraitSvg(s,id),civilian);
 const unit=s.armies.find(a=>a.owner==='caesar');unit.characterId=id;
 const commander=proceduralPortraitSvg(s,id);assert.match(commander,/data-station="commander"/);assert.ok(commander.includes(face));
 unit.characterId=null;s.world.leadership.caesar=[id];
 const ruler=proceduralPortraitSvg(s,id);assert.match(ruler,/data-station="ruler"/);assert.ok(ruler.includes(face));
 assert.equal(proceduralPortraitSvg(upgradeSave(structuredClone(s)),id),ruler);
 const observed={portraitSeed:s.world.characters[id].portraitSeed,portraitFaction:'caesar',resolvedYear:-49,year:-49};
 const seen=proceduralPortraitSvg(s,id,observed);assert.match(seen,/data-station="civilian"/);
 s.world.leadership.caesar=[];assert.equal(proceduralPortraitSvg(s,id,observed),seen);
});

test('a meeting records foreign ceremonial dress without revealing later changes',()=>{
 const s=newGame('senate');
 const id=createFictionalPerson(s,{name:['Theon of Alexandria','亚历山大里亚的提翁'],faction:'egypt',birthYear:-80,sex:'male',location:'egypt'});
 s.world.leadership.egypt=[id];s.world.characters.cicero.location='egypt';
 addReport(s,'senate','egypt',{kind:'leaders',leaders:[id],source:'spy',confidence:'rumor'});
 assert.equal(requestPersonalMeeting(s,'cicero',id,'egypt').ok,true);
 s.world.intelSeed=1000;advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);
 const observed=observedProceduralPortrait(s,id);assert.equal(observed.portraitStation,'ruler');
 const remembered=proceduralPortraitSvg(s,id,observed);assert.match(remembered,/data-station="ruler"/);
 s.world.leadership.egypt=[];s.year=-20;
 assert.equal(proceduralPortraitSvg(s,id,observed),remembered);
 assert.equal(proceduralPortraitSvg(upgradeSave(structuredClone(s)),id,observed),remembered);
});
