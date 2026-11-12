import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,diplomacy} from '../engine.js?v=born-portraits-1';
import {proposeAgreement,terminateAgreement,advanceAgreements} from '../agreements.js?v=grand-chessboard-2';
import {politicalMemoryAdjustment,personalMemoryAdjustment} from '../political-memory.js?v=grand-chessboard-2';
import {appointOffice,dismissOffice} from '../office-system.js?v=born-portraits-1';
import {plotFormationChance} from '../conspiracies.js?v=newborn-age-1';

test('a leader remembers a broken treaty, affecting negotiations but fading over time',()=>{
 let s=newGame('egypt');s.relations['armenia:egypt']=60;const t=proposeAgreement(s,'egypt','armenia','trade').agreement;terminateAgreement(s,t.id,'egypt');
 s.relations['armenia:egypt']=25;s.diplomaticCredibility.egypt=100;
 assert.ok(politicalMemoryAdjustment(s,'armenia','egypt')<0);assert.equal(proposeAgreement(s,'egypt','armenia','intelligence').reason,'declined');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(politicalMemoryAdjustment(s,'armenia','egypt')<0);
 s.year+=10;assert.equal(politicalMemoryAdjustment(s,'armenia','egypt'),0);assert.ok(proposeAgreement(s,'egypt','armenia','intelligence').ok);
});
test('an appointment and dismissal leave fading personal memories that modestly affect plot inclination',()=>{
 let s=newGame('senate');assert.ok(appointOffice(s,'finance','cicero').ok);const appointed=plotFormationChance(s,'cicero');assert.ok(dismissOffice(s,'finance').ok);
 assert.ok(personalMemoryAdjustment(s,'cicero','senate')<0);assert.ok(plotFormationChance(s,'cicero')>appointed);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(personalMemoryAdjustment(s,'cicero','senate')<0);s.year+=10;assert.equal(personalMemoryAdjustment(s,'cicero','senate'),0);
});
test('the recipient remembers genuine aid and a successor does not inherit a private memory',()=>{
 const s=newGame('egypt');s.relations['armenia:egypt']=60;proposeAgreement(s,'egypt','armenia','military_support');diplomacy(s,'parthia','armenia','war');s.month=3;advanceAgreements(s);
 assert.ok(s.world.politicalMemories.some(m=>m.observer==='armenia'&&m.subject==='egypt'&&m.kind==='military_aid'));
 const before=politicalMemoryAdjustment(s,'armenia','egypt');assert.ok(before>0);s.world.leadership.armenia=[];assert.equal(politicalMemoryAdjustment(s,'armenia','egypt'),0);
});
