import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,upgradeSave} from '../engine.js?v=diplomatic-chronicle-1';
import {initializeCursus} from '../cursus-honorum.js?v=multipolar-courier-review-1';
import {createFictionalPerson} from '../dynasties.js?v=portraits-hundred-days-1';
import {assignCursusPortraits,fictionalPortraitKey,observedFictionalPortrait} from '../portrait-registry.js?v=portraits-hundred-days-1';
import {cursusPortraitHtml,cursusPersonLabel} from '../map-lab/cursus-ui.js?v=multipolar-courier-review-1';

const expected=[['senate','Lucius Varro','fictional-cursus-lucius-varro'],['senate','Publius Varro','fictional-cursus-publius-varro'],['senate','Aulus Varro','fictional-cursus-aulus-varro'],['senate','Gaius Varro','fictional-cursus-gaius-varro'],['caesar','Lucius Varenus','fictional-cursus-lucius-varenus'],['caesar','Publius Varenus','fictional-cursus-publius-varenus'],['caesar','Aulus Varenus','fictional-cursus-aulus-varenus'],['caesar','Gaius Varenus','fictional-cursus-gaius-varenus']];
const applicant=(s,faction,name)=>s.world.cursus.applicants.find(x=>x.faction===faction&&x.office==='consul'&&s.world.dynasties.catalog[x.id].name[0]===name);

test('opening Roman candidates receive separate original portraits which survive saves and faction changes',()=>{
 let s=newGame('caesar');initializeCursus(s);const keys=[];
 for(const [faction,name,key] of expected){const a=applicant(s,faction,name);assert.ok(a);assert.equal(fictionalPortraitKey(s,a.id),key);keys.push(key);for(const size of ['master','128','64'])assert.ok(fs.existsSync(`assets/portraits/${key}-${size}.jpg`));}
 assert.equal(new Set(keys).size,8);
 const id=applicant(s,'senate','Lucius Varro').id;s.world.characters[id].faction='caesar';s.world.characters[id].alive=false;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(fictionalPortraitKey(s,id),expected[0][2]);
});
test('old saves recover only an unambiguous opening identity, never a later namesake or reused ID',()=>{
 const s=newGame('caesar');initializeCursus(s);const original=applicant(s,'senate','Publius Varro'),catalog=s.world.dynasties.catalog[original.id],birth=s.world.characters[original.id].birthYear;
 delete s.world.dynasties.cursusPortraitClaims;assignCursusPortraits(s);assert.equal(fictionalPortraitKey(s,original.id),expected[1][2]);
 const later=createFictionalPerson(s,{name:[...catalog.name],faction:'senate',birthYear:birth+4,role:['Simulated political candidate','模拟政治候选人']});assert.equal(fictionalPortraitKey(s,later),null);
 s.world.dynasties.catalog[original.id].name=['Another person','另一人'];assert.equal(fictionalPortraitKey(s,original.id),null);assignCursusPortraits(s);assert.equal(fictionalPortraitKey(s,later),null);
});
test('ambiguous opening records do not silently assign a portrait',()=>{
 const s=newGame('caesar');initializeCursus(s);const original=applicant(s,'senate','Publius Varro'),saved=s.world.dynasties.catalog[original.id],birth=s.world.characters[original.id].birthYear;
 const other=createFictionalPerson(s,{name:[...saved.name],faction:'senate',birthYear:birth,role:['Simulated political candidate','模拟政治候选人']});s.world.cursus.applicants.push({...original,id:other});delete s.world.dynasties.cursusPortraitClaims[original.id];assignCursusPortraits(s);
 assert.equal(fictionalPortraitKey(s,original.id),null);assert.equal(fictionalPortraitKey(s,other),null);
});
test('a foreign fictional portrait requires an actual recorded meeting snapshot',()=>{
 const s=newGame('caesar');initializeCursus(s);const id=applicant(s,'senate','Lucius Varro').id,key=fictionalPortraitKey(s,id);assert.equal(observedFictionalPortrait(s,id),null);
 const before=cursusPortraitHtml(s,id,true);assert.doesNotMatch(before,new RegExp(key));s.world.characters[id].faction='caesar';assert.equal(cursusPortraitHtml(s,id,true),before);
 s.meetings.push({actor:'caesar',target:id,status:'met',portraitKey:key,resolvedYear:s.year,resolvedMonth:s.month});assert.equal(observedFictionalPortrait(s,id),key);
 assert.match(cursusPortraitHtml(s,id,true),new RegExp(key));
 s.world.characters[id].health='dying';assert.equal(observedFictionalPortrait(s,id),key);
});
test('political cards distinguish historical people from fictional candidates',()=>{
 const s=newGame('caesar');initializeCursus(s);const id=applicant(s,'senate','Lucius Varro').id;
 assert.match(cursusPersonLabel(s,'caesar',true),/历史人物/);assert.match(cursusPersonLabel(s,id,true),/模拟人物/);assert.match(cursusPersonLabel(s,'caesar',false),/Historical person/);assert.match(cursusPersonLabel(s,id,false),/Simulated person/);
});
