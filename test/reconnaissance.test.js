import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,army,moveArmy,tick,upgradeSave} from '../engine.js';
import {assessment,sendScouts,probePositions,latestRecon} from '../reconnaissance.js';
import {intelligenceHtml,afterActionHtml} from '../recon-ui.js';

test('Senate can assess, scout, then attack without a scripted outcome or exact intelligence',()=>{
 const s=newGame('senate'),unit=army(s,'italy'),actual=army(s,'xiii').men;
 const initial=assessment(s,'italy','cisalpine');
 assert.equal(initial.friendly,5200);assert.equal(initial.report,null);
 assert.doesNotMatch(JSON.stringify(initial),new RegExp(`"men":${actual}`));
 assert.match(intelligenceHtml(initial,s.regions.find(r=>r.id==='cisalpine'),'en'),/Unknown/);
 assert.match(intelligenceHtml(initial,s.regions.find(r=>r.id==='cisalpine'),'zh'),/未知/);
 const treasury=s.factions.senate.treasury,food=s.factions.senate.food;
 assert.equal(sendScouts(s,'italy','cisalpine').ok,true);
 assert.equal(s.factions.senate.treasury,treasury-4);assert.equal(s.factions.senate.food,food-2);
 assert.equal(moveArmy(s,'italy','cisalpine').ok,false);
 tick(s);
 const report=latestRecon(s,'senate','cisalpine');assert.equal(report.source,'scouts');assert.equal(report.month,s.month);
 assert.ok(report.min===null||report.max>report.min);
 assert.equal(report.misinformationRisk,'high');
 assert.deepEqual(upgradeSave(JSON.parse(JSON.stringify(s))).militaryRecon[0],report);
 const order=moveArmy(s,'italy','cisalpine');assert.equal(order.ok,true);
 assert.ok(unit.attackIntel);assert.equal(unit.attackIntel.report?.source,'scouts');
 for(let i=0;i<3&&!s.battles?.length;i++)tick(s);
 assert.ok(s.battles?.length);
 const battle=s.battles[0];assert.equal(typeof battle.attackerWins,'boolean');
 for(const language of ['en','zh'])assert.match(afterActionHtml(battle,'senate',language),language==='zh'?/战后复盘/:/AFTER-ACTION REVIEW/);
});
test('probe has a real resource and readiness cost; delay lets AI advance',()=>{
 const s=newGame('senate'),food=s.factions.senate.food;
 const out=probePositions(s,'italy','cisalpine');assert.equal(out.ok,true);
 assert.equal(s.factions.senate.food,food-3);assert.ok(out.loss>=0);
 assert.equal(s.armies.find(a=>a.id==='italy').reconPending.kind,'probe');
 assert.equal(moveArmy(s,'italy','cisalpine').ok,false);
 const before=s.month;tick(s);assert.notEqual(s.month,before);
 assert.equal(s.armies.find(a=>a.id==='italy')?.reconPending,null);
 assert.equal(latestRecon(s,'senate','cisalpine').source,'probe');
});
