import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=grand-chessboard-1';
import {adoptNationalIdea,hasNationalIdea} from '../national-ideas.js?v=grand-chessboard-1';
import {plotFormationChance} from '../conspiracies.js?v=grand-chessboard-1';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-1';
import {religiousPolicy} from '../religion.js?v=grand-chessboard-1';
import {newRevolutionScenario} from '../scenarios.js?v=grand-chessboard-1';
import {advanceMovements} from '../movements.js?v=grand-chessboard-1';

test('existing research is preserved, ideas cost real resources and choices survive loading',()=>{
 let s=newGame('senate');s.factions.senate.research=12;const treasury=s.factions.senate.treasury;assert.ok(adoptNationalIdea(s,'senate','oversight').ok);
 assert.equal(s.factions.senate.research,4);assert.equal(s.factions.senate.treasury,treasury-12);assert.equal(adoptNationalIdea(s,'senate','oversight').reason,'existing');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.factions.senate.research,4);assert.ok(hasNationalIdea(s,'senate','oversight'));s.month=2;tick(s);assert.equal(s.factions.senate.research,5);
});
test('ideas change actual political, diplomatic and religious decisions',()=>{
 const s=newGame('senate');s.factions.senate.research=32;const chance=plotFormationChance(s,'cato');assert.ok(adoptNationalIdea(s,'senate','oversight').ok);assert.ok(plotFormationChance(s,'cato')<chance);
 assert.ok(adoptNationalIdea(s,'senate','diplomacy').ok);s.relations['armenia:senate']=22;assert.ok(proposeAgreement(s,'senate','armenia','intelligence').ok);assert.equal(adoptNationalIdea(s,'senate','tolerance').reason,'limit');
 const a=newGame('senate'),b=newGame('senate');a.factions.senate.research=8;adoptNationalIdea(a,'senate','tolerance');const initial=a.world.religiousInstitutions.find(o=>o.id==='roman_college').relations.senate;religiousPolicy(a,'senate','roman_college','negotiate');religiousPolicy(b,'senate','roman_college','negotiate');assert.equal(a.world.religiousInstitutions.find(o=>o.id==='roman_college').relations.senate,initial+10);assert.equal(b.world.religiousInstitutions.find(o=>o.id==='roman_college').relations.senate,initial+8);
});
test('civic compromise slows support growth without erasing a genuine movement',()=>{
 const a=newRevolutionScenario('caesar');for(let i=0;i<3;i++){a.month++;advanceMovements(a)}const b=JSON.parse(JSON.stringify(a));b.world.nationalIdeas={caesar:['civic_compromise']};a.month++;b.month++;advanceMovements(a);advanceMovements(b);
 assert.ok(a.world.movements.length&&b.world.movements.length);assert.ok(b.world.movements[0].supporters<a.world.movements[0].supporters);
});
