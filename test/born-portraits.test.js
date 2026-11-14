import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=multipolar-courier-review-1';
import {createFictionalPerson,advanceDynasties} from '../dynasties.js?v=portraits-hundred-days-1';
import {fictionalPortraitKey,observedFictionalPortrait} from '../portrait-registry.js?v=portraits-hundred-days-1';

const child=(s,name,sex)=>createFictionalPerson(s,{name:[name,name],faction:'caesar',birthYear:s.year,parents:['caesar'],sex});
test('a natural birth through the family simulation reserves a portrait',()=>{
 let found=null;
 for(let seed=1;seed<80&&!found;seed++){
  const s=newGame('caesar');s.year=-48;s.month=1;s.world.dynasties.seed=seed;
  const mother=s.world.characters['fictional:2'],father=s.world.characters['fictional:1'];mother.spouse=father.id;father.spouse=mother.id;
  advanceDynasties(s);const id=mother.children.find(x=>s.world.characters[x]?.birthYear===s.year);
  if(id)found={s,id};
 }
 assert.ok(found,'a birth should occur for a suitable deterministic seed');found.s.year+=5;assert.match(fictionalPortraitKey(found.s,found.id),/^born-[mf][123]-child$/);
});
test('campaign-born children receive unique, persistent images at the appropriate life stage',()=>{
 let s=newGame('caesar');const ids=[child(s,'Boy one','male'),child(s,'Boy two','male'),child(s,'Girl one','female'),child(s,'Girl two','female'),child(s,'Boy three','male'),child(s,'Girl three','female'),child(s,'Extra boy','male')];
 assert.ok(ids.every(id=>fictionalPortraitKey(s,id)===null));
 s.year+=5;const portraits=ids.map(id=>fictionalPortraitKey(s,id));assert.equal(new Set(portraits.slice(0,6)).size,6);assert.equal(portraits[6],null);assert.ok(portraits.slice(0,6).every(x=>x.endsWith('-child')));
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(ids.map(id=>fictionalPortraitKey(s,id)),portraits);
 s.year+=13;assert.equal(fictionalPortraitKey(s,ids[0]),portraits[0].replace('-child','-adult'));
 s.world.characters[ids[0]].alive=false;s.world.characters[ids[0]].deathYear=s.year;const extra=child(s,'Another boy','male');s.year+=5;assert.equal(fictionalPortraitKey(s,extra),null,'a dead person’s portrait is never reused');
});
test('existing saves acquire new portraits only for recorded births without changing prior claims',()=>{
 let s=newGame('caesar');const ids=[child(s,'First','female'),child(s,'Second','female'),child(s,'Third','female')];
 delete s.world.dynasties.bornPortraitClaims[ids[2]];delete s.world.dynasties.bornPortraitPoolVersion;
 const prior=JSON.stringify(s.world.dynasties.bornPortraitClaims);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.year+=5;s.month=2;advanceDynasties(s);
 assert.equal(fictionalPortraitKey(s,ids[2]),'born-f3-child');assert.deepEqual(Object.fromEntries(ids.slice(0,2).map(id=>[id,s.world.dynasties.bornPortraitClaims[id]])),JSON.parse(prior));
 const migrated=JSON.stringify(s.world.dynasties.bornPortraitClaims);advanceDynasties(s);assert.equal(JSON.stringify(s.world.dynasties.bornPortraitClaims),migrated);
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
