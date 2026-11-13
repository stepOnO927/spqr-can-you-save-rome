import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=succession-ui-recovery-1';
import {configureStartingDifficulty} from '../difficulty.js?v=succession-ui-recovery-1';
import {newScenario} from '../scenarios.js?v=succession-ui-recovery-1';

test('difficulty does not secretly penalize the player economy',()=>{
 const states=['standard','hard','expert'].map(difficulty=>{const s=newGame('caesar');s.difficulty=difficulty;tick(s);return s});
 assert.equal(states[0].factions.caesar.treasury,states[1].factions.caesar.treasury);
 assert.equal(states[0].factions.caesar.treasury,states[2].factions.caesar.treasury);
 assert.equal(states[0].factions.caesar.food,states[2].factions.caesar.food);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(states[2]))).difficulty,'expert');
});
test('the separately selected economic handicap remains optional and survives saving',()=>{
 const normal=newGame('caesar'),handicap=newGame('caesar');
 normal.difficulty=handicap.difficulty='expert';handicap.economicHandicap=true;
 tick(normal);tick(handicap);
 assert.ok(normal.factions.caesar.treasury>handicap.factions.caesar.treasury||normal.factions.caesar.food>handicap.factions.caesar.food);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(handicap))).economicHandicap,true);
});
test('all scenario starts can select the same four difficulties and apply beginner aid only once',()=>{
 for(const kind of ['historical','ambitious_general','three_state_coalition','civic_movement','revolution'])for(const mode of ['beginner','standard','hard','expert']){
  const s=newScenario(kind,'caesar'),f=s.factions.caesar,starting={treasury:f.treasury,food:f.food,manpower:f.manpower,stability:f.stability};configureStartingDifficulty(s,mode,true);
  assert.equal(s.difficulty,mode);assert.equal(s.economicHandicap,true);assert.equal(f.treasury,starting.treasury+(mode==='beginner'?20:0));assert.equal(f.food,starting.food+(mode==='beginner'?15:0));assert.throws(()=>configureStartingDifficulty(s,mode,true));
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.difficulty,mode);assert.equal(restored.economicHandicap,true);
 }
});
