import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=peace-sender-1';
import {proposeAgreement} from '../agreements.js?v=peace-sender-1';
import {setBorderPolicy} from '../border-access.js?v=peace-sender-1';
import {accessMapStatus,accessMapEntries,accessMapColor,ACCESS_MAP_COLORS} from '../map-lab/access-map.js?v=peace-sender-1';

test('access map distinguishes war, own control, commerce and closed borders',()=>{
 const s=newGame('caesar');
 const status=id=>accessMapEntries(s,'caesar').find(entry=>entry.theaterId===id);
 assert.equal(status('cisalpine').kind,'own');
 assert.equal(status('italiaN').kind,'war');
 assert.equal(status('egypt').kind,'commercial');
 assert.equal(setBorderPolicy(s,'egypt','commercial','closed').ok,true);
 assert.equal(status('egypt').kind,'closed');
 assert.equal(status('egypt').color,ACCESS_MAP_COLORS.closed);
});

test('limited and full treaty access apply only to their actual scope',()=>{
 const s=newGame('caesar');s.relations['caesar:egypt']=70;
 const access={permittedParty:'caesar',permittedTerritories:['egypt']};
 assert.equal(proposeAgreement(s,'caesar','egypt','military_access',{access}).ok,true);
 const status=id=>accessMapEntries(s,'caesar').find(entry=>entry.theaterId===id);
 assert.equal(status('egypt').kind,'limited');
 assert.equal(status('egyptUpper').kind,'commercial');
 assert.equal(accessMapColor(s,'caesar',['egypt','egyptUpper']),ACCESS_MAP_COLORS.mixed);
 assert.equal(accessMapStatus(s,'senate','egypt','egypt').kind,'commercial');
 const saved=upgradeSave(structuredClone(s));
 assert.equal(accessMapEntries(saved,'caesar').find(entry=>entry.theaterId==='egypt').kind,'limited');
 const full=newGame('caesar');full.relations['caesar:egypt']=70;
 assert.equal(proposeAgreement(full,'caesar','egypt','military_access').ok,true);
 assert.equal(accessMapEntries(full,'caesar').find(entry=>entry.theaterId==='egyptUpper').kind,'military');
});

test('unknown and stale reports cannot reveal actual foreign ownership or rights',()=>{
 const a=newGame('caesar'),b=newGame('caesar');
 delete a.controlKnowledge.caesar.parthia;delete b.controlKnowledge.caesar.parthia;
 b.regions.find(region=>region.id==='parthia').owner='egypt';
 assert.deepEqual(accessMapEntries(a,'caesar').find(entry=>entry.theaterId==='parthia'),accessMapEntries(b,'caesar').find(entry=>entry.theaterId==='parthia'));
 assert.equal(accessMapColor(b,'caesar',['parthia']),ACCESS_MAP_COLORS.unknown);
 a.regions.find(region=>region.id==='egypt').owner='parthia';
 assert.equal(accessMapEntries(a,'caesar').find(entry=>entry.theaterId==='egypt').owner,'egypt');
});
