import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=foreign-name-privacy-1';
import {createFictionalPerson,offerForeignMarriage,offerFamilyAccord,requestClaimantAsylum,advanceDynasties} from '../dynasties.js?v=infant-portraits-1';

function scenario(kind,seed){
 const s=newGame('caesar');let request,person;
 if(kind==='marriage'){
  person=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,sex:'male'});
  s.world.characters[person].loyalty=100;s.world.characters.cleopatra.loyalty=100;
  request=offerForeignMarriage(s,person,'cleopatra','egypt').offer;
 }else if(kind==='asylum'){
  person=createFictionalPerson(s,{name:['Claimant','竞争者'],faction:'egypt',birthYear:-75,location:'egypt'});
  s.world.claimants.egypt=[person];s.knowledge.caesar.egypt.reports.push({kind:'claimants',leaders:[person],year:s.year,month:s.month});
  request=requestClaimantAsylum(s,person,'egypt').request;
 }else{
  person=createFictionalPerson(s,{name:['Ward','受监护者'],faction:'caesar',birthYear:-57,location:'cisalpine'});
  request=offerFamilyAccord(s,kind,'cleopatra','egypt',kind==='wardship'?person:null).accord;
 }
 assert.ok(request);request.courierSeed=seed;return {s,request,person};
}
function advance(s,months){for(let i=0;i<months;i++){s.month++;s.world.dynasties.seed=0;advanceDynasties(s)}}

for(const [kind,seeds,months] of [['marriage',[15,4],3],['asylum',[5,9],3],['pledge',[0,7],4],['wardship',[0,7],4]]){
 test(`${kind}: lost outbound or return letter produces no agreement and no premature disclosure`,()=>{
  for(const seed of seeds){let {s,request,person}=scenario(kind,seed);const relation=s.relations['caesar:egypt']||0;
   advance(s,months-1);assert.equal(request.status,'pending');assert.equal(s.world.characters[person].spouse,null);assert.equal(s.world.characters[person].asylumHost,undefined);
   s=upgradeSave(structuredClone(s));advance(s,1);request=kind==='marriage'?s.world.dynasties.marriageOffers[0]:kind==='asylum'?s.world.dynasties.asylumRequests[0]:s.world.dynasties.familyAccords[0];
   assert.equal(request.status,'no_reply');assert.equal(s.world.characters[person].spouse,null);assert.equal(s.world.characters[person].asylumHost,undefined);assert.equal(s.world.characters[person].diplomaticGuardian,undefined);assert.equal(s.relations['caesar:egypt']||0,relation);assert.match(s.log[0].en,/lost/);
  }
 });
}
test('an old pending family agreement without a courier seed resolves consistently across saves',()=>{
 let {s,request}=scenario('pledge',1);delete request.courierSeed;const first=upgradeSave(structuredClone(s)),second=upgradeSave(structuredClone(s));advance(first,4);advance(second,4);assert.equal(first.world.dynasties.familyAccords[0].status,second.world.dynasties.familyAccords[0].status);
});
