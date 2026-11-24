import {advanceMail} from '../epistulae.js?v=dossier-archive-1';
import {receiveTreatyNotice} from '../treaty-observation.js?v=treaty-observation-1';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,diplomacy} from '../engine.js?v=faces-name-disagreement-1';
import {proposeAgreement,terminateAgreement,advanceAgreements} from '../agreements.js?v=agreement-courier-1';
import {politicalMemoryAdjustment,personalMemoryAdjustment} from '../political-memory.js?v=grand-chessboard-2';
import {appointOffice,dismissOffice} from '../office-system.js?v=faces-name-disagreement-1';
import {plotFormationChance} from '../conspiracies.js?v=faces-name-disagreement-1';

test('a leader remembers a broken treaty, affecting negotiations but fading over time',()=>{
 let s;
 for(let seed=1;seed<=40;seed++){
  const candidate=newGame('egypt');candidate.seed=seed*1000003;candidate.relations['armenia:egypt']=60;
  const t=proposeAgreement(candidate,'egypt','armenia','trade').agreement;terminateAgreement(candidate,t.id,'egypt');
  assert.ok(politicalMemoryAdjustment(candidate,'armenia','egypt')>=0,'unreceived withdrawal does not create a private memory');
  for(let month=0;month<18;month++){if(++candidate.month>12){candidate.month=1;candidate.year++}advanceMail(candidate,{receiveTreatyNotice});if(candidate.mail.messages.some(m=>m.context?.kind==='treaty_notice'&&m.delivery==='received'))break}
  if(candidate.mail.messages.some(m=>m.context?.kind==='treaty_notice'&&m.delivery==='received')){s=candidate;break}
 }assert.ok(s,'a genuine courier must deliver before the recipient remembers');
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


