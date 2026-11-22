import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=focus-agreement-consent-1';
import {createFictionalPerson,advanceDynasties} from '../dynasties.js?v=focus-agreement-consent-1';
import {fictionalPortraitKey,observedFictionalPortrait} from '../portrait-registry.js?v=born-portrait-thirteen-1';

const child=(s,name,sex)=>createFictionalPerson(s,{name:[name,name],faction:'caesar',birthYear:s.year,parents:['caesar'],sex});
test('a natural birth through the family simulation reserves a portrait',()=>{
 let found=null;
 for(let seed=1;seed<80&&!found;seed++){
  const s=newGame('caesar');s.year=-48;s.month=1;s.world.dynasties.seed=seed;
  const mother=s.world.characters['fictional:2'],father=s.world.characters['fictional:1'];mother.spouse=father.id;father.spouse=mother.id;
  advanceDynasties(s);const id=mother.children.find(x=>s.world.characters[x]?.birthYear===s.year);
  if(id)found={s,id};
 }
 assert.ok(found,'a birth should occur for a suitable deterministic seed');found.s.year+=5;assert.match(fictionalPortraitKey(found.s,found.id),/^born-[mf][123456]-child$/);
});
test('campaign-born children receive unique, persistent images at the appropriate life stage',()=>{
 let s=newGame('caesar');const ids=Array.from({length:13},(_,i)=>[child(s,`Boy ${i}`,'male'),child(s,`Girl ${i}`,'female')]).flat(),extraBoy=child(s,'Extra boy','male'),extraGirl=child(s,'Extra girl','female');
 const infants=ids.map(id=>fictionalPortraitKey(s,id));assert.equal(new Set(infants).size,26);assert.ok(infants.every(x=>x.endsWith('-infant')));assert.equal(fictionalPortraitKey(s,extraBoy),null);assert.equal(fictionalPortraitKey(s,extraGirl),null);
 s.year+=5;const portraits=ids.map(id=>fictionalPortraitKey(s,id));assert.equal(new Set(portraits).size,26);assert.ok(portraits.every(x=>x.endsWith('-child')));
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(ids.map(id=>fictionalPortraitKey(s,id)),portraits);
 s.year+=13;for(let i=0;i<ids.length;i++)assert.equal(fictionalPortraitKey(s,ids[i]),portraits[i].replace('-child','-adult'));
 s.world.characters[ids[0]].alive=false;s.world.characters[ids[0]].deathYear=s.year;const extra=child(s,'Another boy','male');s.year+=5;assert.equal(fictionalPortraitKey(s,extra),null,'a dead person’s portrait is never reused');
});
test('older saves reserve the twelfth and thirteenth portraits without replacing earlier claims',()=>{
 let s=newGame('caesar');const ids=Array.from({length:13},(_,i)=>[child(s,'Legacy boy '+i,'male'),child(s,'Legacy girl '+i,'female')]).flat();for(const id of ids.slice(22))delete s.world.dynasties.bornPortraitClaims[id];s.world.dynasties.bornPortraitPoolVersion=7;const prior=structuredClone(s.world.dynasties.bornPortraitClaims);s=upgradeSave(structuredClone(s));advanceDynasties(s);assert.deepEqual(ids.slice(22).map(id=>fictionalPortraitKey(s,id)),['born-m12-infant','born-f12-infant','born-m13-infant','born-f13-infant']);for(const id of ids.slice(0,22))assert.deepEqual(s.world.dynasties.bornPortraitClaims[id],prior[id]);
});
test('older saves reserve the four new portraits without replacing existing identities',()=>{
 let s=newGame('caesar');const ids=Array.from({length:11},(_,i)=>[child(s,'Old boy '+i,'male'),child(s,'Old girl '+i,'female')]).flat();for(const id of ids.slice(18))delete s.world.dynasties.bornPortraitClaims[id];s.world.dynasties.bornPortraitPoolVersion=6;const prior=structuredClone(s.world.dynasties.bornPortraitClaims);s=upgradeSave(structuredClone(s));advanceDynasties(s);assert.deepEqual(ids.slice(18).map(id=>fictionalPortraitKey(s,id)),['born-m10-infant','born-f10-infant','born-m11-infant','born-f11-infant']);for(const id of ids.slice(0,18))assert.deepEqual(s.world.dynasties.bornPortraitClaims[id],prior[id]);
});
test('older saves reserve the ninth portraits without replacing prior identities',()=>{
 let s=newGame('caesar');const ids=Array.from({length:9},(_,i)=>[child(s,`Old boy ${i}`,'male'),child(s,`Old girl ${i}`,'female')]).flat();for(const id of ids.slice(16))delete s.world.dynasties.bornPortraitClaims[id];s.world.dynasties.bornPortraitPoolVersion=5;const prior=structuredClone(s.world.dynasties.bornPortraitClaims);s=upgradeSave(structuredClone(s));advanceDynasties(s);assert.deepEqual(ids.slice(16).map(id=>fictionalPortraitKey(s,id)),['born-m9-infant','born-f9-infant']);for(const id of ids.slice(0,16))assert.deepEqual(s.world.dynasties.bornPortraitClaims[id],prior[id]);
});
test('older saves reserve the seventh and eighth portraits without replacing existing identities',()=>{
 let s=newGame('caesar');const ids=Array.from({length:8},(_,i)=>[child(s,`Old boy ${i}`,'male'),child(s,`Old girl ${i}`,'female')]).flat();for(const id of ids.slice(12))delete s.world.dynasties.bornPortraitClaims[id];s.world.dynasties.bornPortraitPoolVersion=4;const prior=structuredClone(s.world.dynasties.bornPortraitClaims);s=upgradeSave(structuredClone(s));advanceDynasties(s);assert.deepEqual(ids.slice(12).map(id=>fictionalPortraitKey(s,id)),['born-m7-infant','born-f7-infant','born-m8-infant','born-f8-infant']);for(const id of ids.slice(0,12))assert.deepEqual(s.world.dynasties.bornPortraitClaims[id],prior[id]);
});
test('existing saves gain the fifth and sixth portraits without changing prior identities',()=>{
 let s=newGame('caesar');const ids=Array.from({length:6},(_,i)=>child(s,`Girl ${i}`,'female'));delete s.world.dynasties.bornPortraitClaims[ids[4]];delete s.world.dynasties.bornPortraitClaims[ids[5]];s.world.dynasties.bornPortraitPoolVersion=3;const prior=structuredClone(s.world.dynasties.bornPortraitClaims);s=upgradeSave(structuredClone(s));s.year+=5;s.month=2;advanceDynasties(s);assert.equal(fictionalPortraitKey(s,ids[4]),'born-f5-child');assert.equal(fictionalPortraitKey(s,ids[5]),'born-f6-child');for(const id of ids.slice(0,4))assert.deepEqual(s.world.dynasties.bornPortraitClaims[id],prior[id]);
});
test('existing saves acquire new portraits only for recorded births without changing prior claims',()=>{
 let s=newGame('caesar');const ids=[child(s,'First','female'),child(s,'Second','female'),child(s,'Third','female')];
 delete s.world.dynasties.bornPortraitClaims[ids[2]];delete s.world.dynasties.bornPortraitPoolVersion;
 const prior=JSON.stringify(s.world.dynasties.bornPortraitClaims);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.year+=5;s.month=2;advanceDynasties(s);
 assert.equal(fictionalPortraitKey(s,ids[2]),'born-f3-child');assert.deepEqual(Object.fromEntries(ids.slice(0,2).map(id=>[id,s.world.dynasties.bornPortraitClaims[id]])),JSON.parse(prior));
 const migrated=JSON.stringify(s.world.dynasties.bornPortraitClaims);advanceDynasties(s);assert.equal(JSON.stringify(s.world.dynasties.bornPortraitClaims),migrated);
});
test('the expanded portrait pool assigns a fourth image without changing older claims',()=>{
 let s=newGame('caesar');const ids=[child(s,'One','female'),child(s,'Two','female'),child(s,'Three','female'),child(s,'Four','female')];delete s.world.dynasties.bornPortraitClaims[ids[3]];s.world.dynasties.bornPortraitPoolVersion=2;
 const prior=structuredClone(s.world.dynasties.bornPortraitClaims);s=upgradeSave(structuredClone(s));s.year+=5;s.month=2;advanceDynasties(s);assert.equal(fictionalPortraitKey(s,ids[3]),'born-f4-child');for(const id of ids.slice(0,3))assert.deepEqual(s.world.dynasties.bornPortraitClaims[id],prior[id]);
 const childKey=fictionalPortraitKey(s,ids[3]);s.year+=13;assert.equal(fictionalPortraitKey(s,ids[3]),childKey.replace('-child','-adult'));
});
test('a reused ID with a different identity cannot take an old portrait',()=>{
 const s=newGame('caesar'),id=child(s,'Original','female');s.year+=5;assert.ok(fictionalPortraitKey(s,id));s.world.dynasties.catalog[id].name=['Different','不同的人'];assert.equal(fictionalPortraitKey(s,id),null);
});
test('old saves receive claims only for recorded, identifiable children with parents',()=>{
 let s=newGame('caesar');const id=child(s,'Old child','female');delete s.world.dynasties.bornPortraitClaims;s.year+=5;s.month=2;advanceDynasties(s);assert.match(fictionalPortraitKey(s,id),/-child$/);
 let other=newGame('caesar');const unknown=child(other,'Unrecorded','male');delete other.world.dynasties.bornPortraitClaims;delete other.world.dynasties.lives[unknown];other.year+=5;other.month=2;advanceDynasties(other);assert.equal(fictionalPortraitKey(other,unknown),null);
});
test('foreign portraits remain the dated meeting snapshot, not live aging',()=>{
 const s=newGame('caesar'),id=child(s,'Observed','male');s.year+=5;const seen=fictionalPortraitKey(s,id);s.world.characters[id].faction='senate';assert.equal(observedFictionalPortrait(s,id),null);s.meetings.push({actor:'caesar',target:id,status:'met',resolvedYear:s.year,resolvedMonth:s.month,portraitKey:seen});s.year+=13;assert.equal(observedFictionalPortrait(s,id),seen);assert.notEqual(fictionalPortraitKey(s,id),seen);
});
test('a meeting portrait of an infant remains a dated snapshot after the child grows up',()=>{
 let s=newGame('caesar');const id=child(s,'Observed infant','female'),seen=fictionalPortraitKey(s,id);assert.match(seen,/-infant$/);s.world.characters[id].faction='senate';assert.equal(observedFictionalPortrait(s,id),null);s.meetings.push({actor:'caesar',target:id,status:'met',resolvedYear:s.year,resolvedMonth:s.month,portraitKey:seen});s=upgradeSave(structuredClone(s));s.year+=20;assert.equal(observedFictionalPortrait(s,id),seen);assert.equal(fictionalPortraitKey(s,id),seen.replace('-infant','-adult'));
});

test('a missing person portrait does not expose an undisclosed death',()=>{const s=newGame('caesar'),id=child(s,'Missing','female');s.year+=20;s.world.characters[id].missing={year:s.year,month:s.month};const before=fictionalPortraitKey(s,id);s.world.characters[id].alive=false;s.world.characters[id].deathYear=s.year-15;assert.equal(fictionalPortraitKey(s,id),before)});
