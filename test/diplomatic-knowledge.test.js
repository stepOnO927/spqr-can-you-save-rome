import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=safe-save-1';
import {proposeAgreement,terminateAgreement} from '../agreements.js?v=grand-chessboard-2';
import {observeDiplomacy,reportedDiplomacy} from '../diplomatic-knowledge.js?v=multipolar-2';

test('only participants or nearby observers learn public agreements; secret terms stay private',()=>{
 const s=newGame('caesar');s.relations['armenia:parthia']=60;const pub=proposeAgreement(s,'armenia','parthia','trade'),secret=proposeAgreement(s,'armenia','parthia','intelligence',{secret:true});assert.ok(pub.ok&&secret.ok);
 observeDiplomacy(s);assert.ok(!reportedDiplomacy(s,'caesar').some(r=>r.id===pub.agreement.id));assert.ok(reportedDiplomacy(s,'armenia').some(r=>r.id===secret.agreement.id));
 s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);const known=reportedDiplomacy(s,'caesar');assert.ok(known.some(r=>r.id===pub.agreement.id));assert.ok(!known.some(r=>r.id===secret.agreement.id));
});
test('a remote observer retains an old report without learning that a treaty ended',()=>{
 let s=newGame('caesar');s.relations['armenia:parthia']=60;const t=proposeAgreement(s,'armenia','parthia','trade').agreement;s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);const old=reportedDiplomacy(s,'caesar').find(r=>r.id===t.id);
 s.regions.find(r=>r.id==='anatolia').owner='senate';terminateAgreement(s,t.id,'armenia');s.month++;observeDiplomacy(s);assert.deepEqual(reportedDiplomacy(s,'caesar').find(r=>r.id===t.id),old);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reportedDiplomacy(s,'caesar').find(r=>r.id===t.id),old);s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);assert.equal(reportedDiplomacy(s,'caesar').find(r=>r.id===t.id).status,'ended');
});
test('foreign coalition reports contain public membership rather than internal plans or cohesion',()=>{
 const s=newGame('caesar');s.coalitions=[{id:'coalition:1',status:'active',expiresAt:s.year*12+s.month+12,parties:['egypt','numidia','senate'],leader:'egypt',target:'parthia',cohesion:4,contributions:{egypt:{policy:'funding'}},jointPlan:{secret:'hidden'}}];observeDiplomacy(s);
 const r=reportedDiplomacy(s,'caesar').find(x=>x.id==='coalition:1');assert.ok(r);assert.equal(r.target,'parthia');assert.equal(r.cohesion,undefined);assert.equal(r.contributions,undefined);assert.equal(r.jointPlan,undefined);
});
test('a newly declared war ends a visible treaty report immediately',()=>{
 const s=newGame('caesar');s.relations['armenia:parthia']=60;const t=proposeAgreement(s,'armenia','parthia','trade').agreement;
 s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);s.wars.push(['armenia','parthia']);observeDiplomacy(s);
 assert.equal(reportedDiplomacy(s,'caesar').find(r=>r.id===t.id).status,'ended');
});
