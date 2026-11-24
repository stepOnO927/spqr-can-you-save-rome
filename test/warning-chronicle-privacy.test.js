import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {advanceStrategicWarnings} from '../strategic-warnings.js?v=dossier-archive-1';
import {warningLedger} from '../warning-ledger.js?v=warning-privacy-1';

function setup(seed,player='caesar'){
 const s=newGame('caesar');s.player=player;s.seed=seed;s.month=2;
 // An already dispatched letter. Transport and recipient decisions remain real.
 s.warningLetters=[{id:'warning:privacy',from:'caesar',to:'egypt',threat:'parthia',near:'egypt',sighting:{armyId:'reported-army',name:['Reported army','报告中的军队'],region:'egypt',strengthBand:[4000,8000],year:s.year,month:1},sentYear:s.year,sentMonth:1,duration:1,remaining:1,status:'sent',history:[{status:'sent',year:s.year,month:1}]}];
 return s;
}
function advance(s){const logs=[];advanceStrategicWarnings(s,{log:(_,en,zh,meta)=>logs.push({en,zh,meta}),issueOrder:()=>({ok:true})});return logs}

test('a sender receives no Chronicle receipt for any private courier outcome',()=>{
 const initial=warningLedger(setup(0),'caesar'),seen=new Set();
 for(let seed=0;seed<160;seed++){
  const s=setup(seed),logs=advance(s),l=s.warningLetters.find(x=>x.id==='warning:privacy');seen.add(l.status);
  assert.deepEqual(warningLedger(s,'caesar'),initial,'outbound ledger must not reveal transport or response');
  assert.equal(logs.filter(x=>x.meta?.warning===l.id).length,0,'no message may bypass the sender knowledge projection');
 }
 assert.ok(seen.has('lost'),'real courier losses exercised');assert.ok(seen.has('delayed'),'real courier delays exercised');
 assert.ok(seen.has('responded')||seen.has('unresponded'),'real deliveries exercised');
});

test('the recipient still receives the actual delivered warning in both languages',()=>{
 let delivered=0,undelivered=0;
 for(let seed=0;seed<80;seed++){
  const s=setup(seed,'egypt'),logs=advance(s),l=s.warningLetters.find(x=>x.id==='warning:privacy'),notices=logs.filter(x=>x.meta?.warning===l.id);
  if(Number.isFinite(l.deliveredMonth)){
   delivered++;assert.equal(notices.length,1);assert.match(notices[0].en,/forwarded report/);assert.match(notices[0].zh,/转交的侦察报告/);assert.equal(l.decision.kind,'player_discretion');assert.equal(warningLedger(s,'egypt').length,1);
  }else{undelivered++;assert.equal(notices.length,0);assert.deepEqual(warningLedger(s,'egypt'),[])}
 }
 assert.ok(delivered>0&&undelivered>0);
});

test('save migration retains private warning state without turning it into sender knowledge',()=>{
 for(const status of ['lost','delayed','expired','responded']){
  const s=setup(1),initial=warningLedger(s,'caesar'),l=s.warningLetters[0];l.status=status;l.decision={kind:'heeded'};l.history.push({status,year:s.year,month:s.month});
  if(status==='responded'){l.deliveredYear=s.year;l.deliveredMonth=s.month}
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.warningLetters[0].status,status);assert.deepEqual(warningLedger(restored,'caesar'),initial);
 }
});

