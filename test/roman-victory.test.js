import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,advanceRomanVictory,tick} from '../engine.js?v=civic-portraits-1';
const opponent=player=>player==='caesar'?'senate':'caesar';
function defeat(s){const enemy=opponent(s.player);for(const r of s.regions.filter(r=>r.owner===enemy))r.owner=s.player;s.armies=s.armies.filter(a=>a.owner!==enemy);return enemy}

test('both Roman commands require their rival to lose territory and surviving field forces',()=>{
 for(const player of ['caesar','senate']){const s=newGame(player),enemy=opponent(player);for(const r of s.regions.filter(r=>r.owner===enemy))r.owner=player;advanceRomanVictory(s);assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice,undefined);
 const noLandButArmy=s.armies.find(a=>a.owner===enemy);assert.ok(noLandButArmy.men>0);s.armies=s.armies.filter(a=>a.owner!==enemy);s.regions.find(r=>r.id==='roma').owner=enemy;advanceRomanVictory(s);assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice,undefined);
 }
});
test('victory dispatch is delayed for both sides, survives reload and is logged once',()=>{
 for(const player of ['caesar','senate']){let s=newGame(player);defeat(s);s.log=[];advanceRomanVictory(s);assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice.remaining,3);assert.equal(s.log.length,0);advanceRomanVictory(s);s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceRomanVictory(s);assert.equal(s.victory,false);advanceRomanVictory(s);assert.equal(s.victory,true);assert.equal(s.victor,player);assert.match(s.log[0].zh,/信使报告/);advanceRomanVictory(s);assert.equal(s.log.length,1)}
});
test('an interrupted collapse or peace cancels a pending victory report',()=>{
 for(const change of [s=>{s.regions.find(r=>r.id==='roma').owner=opponent(s.player)},s=>{s.armies.push({id:'new-survivor',owner:opponent(s.player),men:1})},s=>{s.wars=[]}]){const s=newGame('caesar');defeat(s);advanceRomanVictory(s);change(s);for(let i=0;i<5;i++)advanceRomanVictory(s);assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice,undefined)}
});
test('the regular monthly simulation starts and delivers a delayed victory dispatch',()=>{
 const s=newGame('senate');defeat(s);tick(s);assert.equal(s.victory,false);assert.equal(s.world.romanVictoryNotice.remaining,3);tick(s);tick(s);assert.equal(s.victory,false);tick(s);assert.equal(s.victory,true);assert.equal(s.victor,'senate');
});
