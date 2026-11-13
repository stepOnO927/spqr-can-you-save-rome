import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=succession-ui-recovery-1';
import {queueMission,advanceOperations} from '../character-system.js?v=succession-ui-recovery-1';
const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
const resolve=(s,op,seed)=>{op.remaining=1;s.world.intelSeed=seed;advanceOperations(s)};

test('failed missions inform only their sender without explaining hidden causes',()=>{
 for(const hidden of ['random','lost_court']){let s=newGame('senate');queueMission(s,'senate','egypt','spy','health');if(hidden==='lost_court')for(const r of s.regions.filter(r=>r.owner==='egypt'))r.owner='caesar';resolve(s,s.operations[0],seedFor(hidden==='random'?.05:.7,hidden==='random'?.1:.8));assert.equal(s.operations[0].status,'failed');assert.match(s.log[0].zh,/未收到报告；原因不明/);assert.equal(s.operations[0].resolvedMonth,s.month);assert.equal(s.operations[0].resolvedYear,s.year);assert.equal(s.knowledge.senate.egypt.reports.length,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.operations[0].resolvedYear,s.year)}
 const foreign=newGame('senate');queueMission(foreign,'caesar','egypt','spy','health');resolve(foreign,foreign.operations[0],seedFor(.05,.1));assert.equal(foreign.log.length,0);
});
test('refused audiences and unsuccessful allied exchanges notify sender without leaking private holdings',()=>{
 const s=newGame('senate');queueMission(s,'senate','egypt','envoy','leaders');resolve(s,s.operations[0],seedFor(.34,.36));assert.equal(s.operations[0].status,'declined');assert.match(s.log[0].zh,/拒绝/);assert.equal(s.knowledge.senate.egypt.reports.length,0);
 for(const loseAlliance of [false,true]){const t=newGame('senate');t.alliances.push(['senate','parthia']);queueMission(t,'senate','egypt','exchange','leaders','parthia');if(loseAlliance)t.alliances=[];resolve(t,t.operations[0],seedFor(.7,.8));assert.equal(t.operations[0].status,'failed');assert.match(t.log[0].zh,/未收到报告；原因不明/);assert.equal(t.knowledge.senate.egypt.reports.length,0)}
});
