import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region,tick,upgradeSave,previewMarch,moveArmy} from '../engine.js?v=letter-cost-1';
import {observeControl,reportedControl,requestControlReport,advanceControlScouts} from '../control-intelligence.js';
import {drawMap} from '../map.js';
import {advanceMovements} from '../movements.js?v=safe-save-1';

test('remote control changes do not automatically change a faction’s map or turn knowledge',()=>{
 let s=newGame('caesar');const before=reportedControl(s,'caesar','parthia');
 const options={selectedRegion:null,selectedArmy:null,mode:'political',lang:'en',view:[0,0,1200,650]};
 const oldMap=drawMap(s,options);region(s,'parthia').owner='egypt';s.month=2;observeControl(s);
 assert.deepEqual(reportedControl(s,'caesar','parthia'),before);
 assert.equal(drawMap(s,options),oldMap);
 assert.equal(reportedControl(s,'parthia','parthia').owner,'egypt');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reportedControl(s,'caesar','parthia'),before);
});
test('frontier observation updates independently and records when the information was obtained',()=>{
 const s=newGame('caesar');region(s,'italiaN').owner='rebels';s.month=2;observeControl(s);
 assert.deepEqual(reportedControl(s,'caesar','italiaN'),{owner:'rebels',year:-49,month:2});
 assert.equal(reportedControl(s,'egypt','italiaN').owner,'senate');
});
test('loss of the last own theater is reported without revealing distant changes',()=>{
 const s=newGame('caesar');for(const r of s.regions.filter(r=>r.owner==='caesar'))r.owner='senate';
 region(s,'parthia').owner='egypt';s.month=2;observeControl(s);
 assert.equal(reportedControl(s,'caesar','gaul').owner,'senate');
 assert.equal(reportedControl(s,'caesar','parthia').owner,'parthia');
});
test('old saves get opening assumptions rather than current hidden foreign control',()=>{
 const s=newGame('caesar');delete s.controlKnowledge;region(s,'parthia').owner='egypt';
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(reportedControl(loaded,'caesar','parthia'),{owner:'parthia',year:-49,month:1});
});
test('a remote uprising is not instantly published in the player chronicle',()=>{
 const s=newGame('caesar'),r=region(s,'parthia'),f=s.factions.parthia;s.armies=s.armies.filter(a=>a.owner!=='parthia');r.loyalty=1;r.population.satisfaction=10;f.stability=20;f.legitimacy=20;f.tax='high';f.treasury=-50;
 for(let i=0;i<80&&!s.world.movements.some(m=>m.region==='parthia'&&m.stage==='armed');i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceMovements(s)}
 const m=s.world.movements.find(x=>x.region==='parthia'&&x.stage==='armed');assert.ok(m);tick(s);assert.equal(r.owner,m.force);assert.equal(reportedControl(s,'caesar','parthia').owner,'parthia');
 assert.ok(!s.log.some(e=>e.en.includes('armed movement in Mesopotamian theater')));
});
test('a traveler report observes halfway through a round trip and arrives only for its sender',()=>{
 let s=newGame('caesar');region(s,'parthia').owner='egypt';const treasury=s.factions.caesar.treasury;
 assert.equal(requestControlReport(s,'parthia').ok,true);assert.equal(s.factions.caesar.treasury,treasury-5);assert.equal(requestControlReport(s,'parthia').reason,'pending');
 s.world.intelSeed=1000;s.month=2;advanceControlScouts(s);s.month=3;advanceControlScouts(s);
 assert.equal(reportedControl(s,'caesar','parthia').owner,'parthia');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));region(s,'parthia').owner='rebels';s.month=4;advanceControlScouts(s);s.month=5;advanceControlScouts(s);
 assert.deepEqual(reportedControl(s,'caesar','parthia'),{owner:'egypt',year:-49,month:3,source:'travelers'});
 assert.equal(reportedControl(s,'senate','parthia').owner,'parthia');
});
test('travelers may bring old or no information and a later frontier observation takes precedence',()=>{
 for(const [seed,status,owner] of [[0,'complete','parthia'],[1972,'no_reply','parthia']]){
  const s=newGame('caesar');region(s,'parthia').owner='egypt';requestControlReport(s,'parthia');s.world.intelSeed=seed;
  for(let m=2;m<=5;m++){s.month=m;advanceControlScouts(s)}
  assert.equal(s.controlScouts[0].status,status);assert.equal(reportedControl(s,'caesar','parthia').owner,owner);
 }
 const s=newGame('caesar');region(s,'parthia').owner='egypt';requestControlReport(s,'parthia');s.world.intelSeed=1000;
 s.month=2;advanceControlScouts(s);s.month=3;advanceControlScouts(s);s.month=4;
 s.controlKnowledge.caesar.parthia={owner:'rebels',year:-49,month:4};advanceControlScouts(s);s.month=5;advanceControlScouts(s);
 assert.equal(reportedControl(s,'caesar','parthia').owner,'rebels');
});
test('march previews and acceptance depend on the reported controller, not secret control',()=>{
 const a=newGame('caesar'),b=newGame('caesar');region(b,'italiaN').owner='egypt';
 assert.deepEqual(previewMarch(a,'xiii','italiaN'),previewMarch(b,'xiii','italiaN'));
 assert.equal(moveArmy(a,'xiii','italiaN').ok,true);assert.equal(moveArmy(b,'xiii','italiaN').ok,true);
 tick(b);assert.equal(b.armies.find(x=>x.id==='xiii').region,'cisalpine');
 assert.equal(b.armies.find(x=>x.id==='xiii').move,null);
 assert.equal(reportedControl(b,'caesar','italiaN').owner,'egypt');
 assert.match(b.log.find(e=>e.en.includes('stopped:')).en,/no longer permitted/);
});
test('an unknown controller does not disclose a secret border before arrival',()=>{
 const a=newGame('caesar'),b=newGame('caesar');delete a.controlKnowledge.caesar.italiaN;delete b.controlKnowledge.caesar.italiaN;region(b,'italiaN').owner='egypt';
 const pa=previewMarch(a,'xiii','italiaN'),pb=previewMarch(b,'xiii','italiaN');assert.deepEqual(pa,pb);assert.equal(pa.ok,true);assert.equal(pa.reportedOwner,null);
 assert.equal(moveArmy(b,'xiii','italiaN').ok,true);tick(b);assert.equal(reportedControl(b,'caesar','italiaN').owner,'egypt');
});
