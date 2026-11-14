import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=cursus-portraits-1';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {religiousPolicy} from '../religion.js?v=cursus-portraits-1';
import {finalizeCampaign} from '../legacy.js?v=cursus-portraits-1';

test('new distinctions are computed only on official finalization and have no repeatable reward',()=>{
 const s=newGame('senate');s.relations['armenia:senate']=60;assert.ok(proposeAgreement(s,'senate','armenia','trade').ok);
 assert.ok(religiousPolicy(s,'senate','roman_college','negotiate').ok);const cash=s.factions.senate.treasury;
 assert.equal(s.world.dynasties.finalized,undefined);assert.deepEqual(finalizeCampaign(s),{ok:false,reason:'unfinished'});assert.equal(s.world.dynasties.finalized,undefined);
 s.victory=true;const result=finalizeCampaign(s);assert.ok(result.ok);assert.deepEqual(result.archive.achievements.map(a=>a.id),['diplomatic_table','civic_dialogue']);
 assert.equal(s.factions.senate.treasury,cash);assert.deepEqual(finalizeCampaign(s),{ok:false,reason:'already'});assert.equal(s.factions.senate.treasury,cash);
});
