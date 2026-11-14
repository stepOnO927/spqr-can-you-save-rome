import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=strategic-player-offer-1';
import {observeControl,reportedFortification} from '../control-intelligence.js?v=fort-intel-1';
import {createPlan,assignRole,assessPlan} from '../battle-plans.js?v=succession-ui-recovery-1';

test('planning cannot reveal an unobserved change in enemy fortifications',()=>{
 const a=newGame('caesar'),b=upgradeSave(JSON.parse(JSON.stringify(a)));delete a.fortKnowledge.caesar.italiaN;delete b.fortKnowledge.caesar.italiaN;b.regions.find(r=>r.id==='italiaN').fort=5;
 for(const s of [a,b]){const p=createPlan(s,'caesar',{mode:'manual'}).plan;assert.equal(assignRole(s,'caesar',p.id,{armyId:'xiii',role:'siege',target:'italiaN'}).ok,true)}
 assert.deepEqual(assessPlan(a,'caesar','plan:1'),assessPlan(b,'caesar','plan:1'));
 assert.equal(assessPlan(a,'caesar','plan:1').siege[0].fort,null);
});
test('frontier reports are dated, coarse, private and survive saving',()=>{
 let s=newGame('caesar');s.regions.find(r=>r.id==='italiaN').fort=3;s.month=2;observeControl(s);
 const report=reportedFortification(s,'caesar','italiaN');assert.deepEqual(report.band,[3,5]);assert.equal(report.month,2);
 s.regions.find(r=>r.id==='italiaN').fort=0;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reportedFortification(s,'caesar','italiaN'),report);
 assert.equal(reportedFortification(s,'egypt','italiaN'),null);s.year+=3;assert.equal(reportedFortification(s,'caesar','italiaN').stale,true);
});
