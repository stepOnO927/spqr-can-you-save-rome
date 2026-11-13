import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,upgradeSave} from '../engine.js?v=succession-ui-recovery-1';
import {assignSuccession} from '../characters.js?v=succession-ui-recovery-1';
import {advanceGovernments} from '../governance.js?v=succession-ui-recovery-1';
import {advanceDynasties,createFictionalPerson} from '../dynasties.js?v=succession-ui-recovery-1';
import {fictionalPortraitKey,observedFictionalPortrait,assignCourtPortrait} from '../portrait-registry.js?v=court-portraits-1';
import {requestPersonalMeeting,advancePersonalDiplomacy} from '../personal-diplomacy.js?v=succession-ui-recovery-1';
import {addReport} from '../character-system.js?v=succession-ui-recovery-1';

const rulers={armenia:'artavasdes',numidia:'juba',galatia:'deiotarus',bosporus:'pharnaces'};
function nominee(faction){const s=newGame('caesar');s.world.characters[rulers[faction]].alive=false;s.world.characters[rulers[faction]].health='deceased';assignSuccession(s,faction);s.wars=[];s.factions[faction].treasury=100;s.factions[faction].stability=60;s.world.dynasties.seed=1;for(let i=0;i<7;i++){s.month++;advanceGovernments(s)}return [s,s.world.leadership[faction][0]]}

test('each regional nominee has a distinct image but foreign viewers need a meeting',()=>{
 const keys=[];
 for(const faction of Object.keys(rulers)){
  let [s,id]=nominee(faction);assert.ok(id);const key=fictionalPortraitKey(s,id);keys.push(key);assert.equal(key,`fictional-court-${faction}`);
  for(const suffix of ['master','128','64'])assert.ok(fs.existsSync(`assets/portraits/${key}-${suffix}.jpg`));
  assert.equal(observedFictionalPortrait(s,id),null);
  s.meetings.push({actor:'senate',target:id,status:'met',resolvedYear:s.year,resolvedMonth:s.month,portraitKey:key});assert.equal(observedFictionalPortrait(s,id),null);
  s.meetings.push({actor:'caesar',target:id,status:'met',resolvedYear:s.year,resolvedMonth:s.month,portraitKey:key});assert.equal(observedFictionalPortrait(s,id),key);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(fictionalPortraitKey(s,id),key);assert.equal(observedFictionalPortrait(s,id),key);
  s.world.dynasties.catalog[id].name[0]='Different identity';assert.equal(fictionalPortraitKey(s,id),null);
 }
 assert.equal(new Set(keys).size,4);
});

test('legacy migration requires documented origin, and artwork is never reused',()=>{
 let [s,id]=nominee('armenia'),original=fictionalPortraitKey(s,id);delete s.world.dynasties.courtPortraitClaims;delete s.world.dynasties.courtPortraitPoolVersion;
 s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceDynasties(s);assert.equal(fictionalPortraitKey(s,id),original);
 s.world.characters[id].alive=false;const saved=s.world.dynasties.catalog[id];const duplicate=createFictionalPerson(s,{name:[...saved.name],faction:'armenia',birthYear:s.year-35,origin:'court_nominee'});
 assert.equal(assignCourtPortrait(s,duplicate),null);assert.equal(fictionalPortraitKey(s,duplicate),null);
 let [other,unknown]=nominee('numidia');delete other.world.dynasties.courtPortraitClaims;delete other.world.dynasties.courtPortraitPoolVersion;delete other.world.dynasties.lives[unknown];advanceDynasties(other);assert.equal(fictionalPortraitKey(other,unknown),null);
});

test('a real accepted personal meeting records the portrait only after resolution',()=>{
 const [s,id]=nominee('armenia');addReport(s,'caesar','armenia',{kind:'leaders',leaders:[id],source:'spy',confidence:'unverified'});
 s.world.characters.caesar.location='armenia';s.world.intelSeed=1000;
 assert.equal(requestPersonalMeeting(s,'caesar',id,'armenia').ok,true);assert.equal(observedFictionalPortrait(s,id),null);
 advancePersonalDiplomacy(s);assert.equal(observedFictionalPortrait(s,id),null);advancePersonalDiplomacy(s);
 assert.equal(s.meetings[0].status,'met');assert.equal(observedFictionalPortrait(s,id),'fictional-court-armenia');
});
