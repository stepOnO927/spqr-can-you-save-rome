import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,PLAYABLE} from '../engine.js?v=dossier-archive-1';
import {knownDiplomaticTargets} from '../civil-war.js?v=dossier-archive-1';
test('diplomatic targets include discovered rival governments without reading hidden existence',()=>{
 const s=newGame('caesar'),base=knownDiplomaticTargets(s,'caesar',PLAYABLE);s.factions.egypt_claimant={...s.factions.egypt};assert.deepEqual(knownDiplomaticTargets(s,'caesar',PLAYABLE),base);
 s.knowledge.caesar.egypt_claimant={reportedLeaders:['arsinoe'],reports:[],sightings:{}};assert.ok(knownDiplomaticTargets(s,'caesar',PLAYABLE).includes('egypt_claimant'));assert.ok(!knownDiplomaticTargets(s,'senate',PLAYABLE).includes('egypt_claimant'));delete s.factions.egypt_claimant;assert.ok(knownDiplomaticTargets(s,'caesar',PLAYABLE).includes('egypt_claimant'));
});

