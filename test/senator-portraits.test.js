import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {newGame,upgradeSave} from '../engine.js';
import {initializeCursus} from '../cursus-honorum.js';
import {fictionalPortraitKey,observedFictionalPortrait,assignSenatorPortraits} from '../portrait-registry.js';

test('opening senators have distinct original artwork and retain it through saves',()=>{
 let s=newGame('caesar');initializeCursus(s);const ids=s.world.cursus.senators.map(x=>x.id),keys=ids.map(id=>fictionalPortraitKey(s,id));
 assert.equal(ids.length,12);assert.equal(new Set(keys).size,12);const hashes=new Set();
 for(const key of keys){assert.match(key,/^fictional-senator-/);for(const size of ['master','128','64'])assert.ok(fs.existsSync(`assets/portraits/${key}-${size}.jpg`));hashes.add(createHash('sha256').update(fs.readFileSync(`assets/portraits/${key}-128.jpg`)).digest('hex'))}
 assert.equal(hashes.size,12);s=upgradeSave(JSON.parse(JSON.stringify(s)));initializeCursus(s);assert.deepEqual(ids.map(id=>fictionalPortraitKey(s,id)),keys);
});
test('legacy claims require a unique original identity and never attach to reused IDs',()=>{
 const s=newGame('caesar');initializeCursus(s);const original=s.world.cursus.senators[0],id=original.id,key=fictionalPortraitKey(s,id);
 delete s.world.dynasties.senatorPortraitClaims;assignSenatorPortraits(s);assert.equal(fictionalPortraitKey(s,id),key);
 s.world.dynasties.catalog[id].name=['Someone else','另一个人'];assert.equal(fictionalPortraitKey(s,id),null);
 s.world.dynasties.catalog[id].name=['Publius Lentulus','普布利乌斯·伦图卢斯'];s.world.characters[id].birthYear++;assert.equal(fictionalPortraitKey(s,id),null);
});
test('foreign portraits require an observed meeting and remain a dated snapshot',()=>{
 const s=newGame('caesar');initializeCursus(s);const id=s.world.cursus.senators.find(x=>x.faction==='senate').id,key=fictionalPortraitKey(s,id);
 assert.equal(observedFictionalPortrait(s,id),null);s.meetings.push({actor:'caesar',target:id,status:'met',portraitKey:key,resolvedYear:s.year,resolvedMonth:s.month});
 s.world.characters[id].alive=false;assert.equal(observedFictionalPortrait(s,id),key);s.player='senate';assert.equal(observedFictionalPortrait(s,id),null);
});
