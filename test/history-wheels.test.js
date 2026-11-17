import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,forecastEconomy,setTax,tick} from '../engine.js';
import {receivedMail,replyToLetter} from '../epistulae.js';
import {AMBITIONS,availableAmbitions,chooseAmbition,ambitionStatus,advanceWheels,financeDecision,commanderDecision} from '../history-wheels.js';
import {newHanGame,tick as hanTick,serialize,loadHanSave} from '../han/engine.js';
import {available as hanAvailable,choose as hanChoose,status as hanStatus} from '../han/ambitions.js';
import {finalizeCampaign} from '../legacy.js';

test('national ambitions are selected, measurable and save compatible',()=>{
 for(const side of ['caesar','senate']){
  const s=newGame(side);
  assert.equal(availableAmbitions(s).includes('dynastic'),false);
  for(const id of availableAmbitions(s)){
   assert.ok(AMBITIONS[id].name[0]&&AMBITIONS[id].name[1]);
   assert.equal(chooseAmbition(s,id),true);
   const status=ambitionStatus(s);
   assert.ok(status.title[0]&&status.progress[1]);
   assert.equal(typeof status.done,'boolean');
  }
  chooseAmbition(s,'cultural');
  assert.match(ambitionStatus(s).progress[0],side==='senate'?/\/1 cultural/:/\/2 cultural/);
  chooseAmbition(s,'custom');
  const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(saved.historyWheels.ambition,'custom');
  assert.equal(saved.historyWheels.changes.length,availableAmbitions(s).length+2);
 }
 const old=newGame('caesar');delete old.historyWheels;old.factions.caesar.treasury=37;
 const migrated=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.equal(migrated.factions.caesar.treasury,37);
 assert.deepEqual(migrated.historyWheels.chains,[]);
});

test('financial strain creates one causal chain with a real policy choice and persistent outcome',()=>{
 const s=newGame('caesar');
 s.factions.caesar.treasury=-20;
 for(const a of s.armies.filter(a=>a.owner==='caesar'))a.men=30000;
 assert.ok(forecastEconomy(s).treasury<0);
 advanceWheels(s,{forecast:forecastEconomy});
 s.month++;
 advanceWheels(s,{forecast:forecastEconomy});
 const chain=s.historyWheels.chains[0];
 assert.ok(chain);
 assert.equal(chain.cause.treasury,-20);
 assert.equal(chain.cause.forecast,forecastEconomy(s).treasury);
 assert.ok(chain.letterId);
 assert.ok(s.world.characters[chain.senderId]?.alive);
 const letter=s.mail.messages.find(m=>m.id===chain.letterId);
 letter.delivery='received';letter.arrival=s.year*12+s.month;
 assert.equal(replyToLetter(s,letter.id,'finance_high_tax',{setTax,financeDecision}).ok,true);
 assert.equal(s.factions.caesar.tax,'high');
 assert.equal(chain.response,'finance_high_tax');
 assert.equal(chain.events[1].parentId,chain.events[0].id);
 assert.equal(receivedMail(s).find(m=>m.id===letter.id).responses.length,1);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.historyWheels.chains[0].id,chain.id);
 assert.equal(saved.historyWheels.chains[0].response,'finance_high_tax');
 tick(saved);
 assert.ok(saved.historyWheels.chains.length===1);
 assert.ok(saved.historyWheels.chains[0].events.length>=3);
});

test('long campaigns do not duplicate active financial chains',()=>{
 for(const side of ['caesar','senate']){
  const s=newGame(side);chooseAmbition(s,'economic');
  for(let i=0;i<120;i++)tick(s);
  const ids=s.historyWheels.chains.map(c=>c.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(s.historyWheels.chains.every(c=>c.status!=='active'||c.events.length>0));
  assert.ok(s.historyWheels.chains.length<=10);
 }
});

test('a battle-tested commander petitions through the real loyalty and treasury rules',()=>{
 const s=newGame('caesar');
 const unit=s.armies.find(a=>a.id==='viii');
 const officer=s.world.characters.antony;unit.characterId=officer.id;officer.location=unit.region;
 officer.battlesCommanded=2;officer.loyalty=35;
 s.month++;advanceWheels(s,{forecast:forecastEconomy});
 const chain=s.historyWheels.chains.find(c=>c.type==='commander_petition');
 assert.ok(chain);assert.equal(chain.cause.armyId,unit.id);assert.equal(chain.characterId,officer.id);
 const letter=s.mail.messages.find(m=>m.id===chain.letterId);
 assert.ok(letter);assert.equal(letter.senderId,officer.id);
 letter.delivery='received';letter.arrival=s.year*12+s.month;
 const treasury=s.factions[s.player].treasury;
 assert.equal(replyToLetter(s,letter.id,'commander_reassure',{commanderDecision}).ok,true);
 assert.equal(s.factions[s.player].treasury,treasury-8);
 assert.equal(officer.loyalty,50);
 assert.equal(chain.response,'commander_reassure');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.historyWheels.chains.find(c=>c.id===chain.id).characterId,officer.id);
 restored.month++;advanceWheels(restored,{forecast:forecastEconomy});
 assert.ok(restored.historyWheels.chains.find(c=>c.id===chain.id).reviewedAt);
 restored.victory=true;
 const archive=finalizeCampaign(restored).archive;
 assert.equal(archive.causalChains.find(c=>c.id===chain.id).characterName[1],'马尔库斯·安东尼');
 assert.ok(archive.causalChains.find(c=>c.id===chain.id).territoryName);
});

test('Han and a small western state use distinct ambitions and preserve them through 36 months',()=>{
 for(const side of ['han','shanshan']){
  const s=newHanGame(side,{seed:49});
  assert.equal(hanAvailable(s).includes('dynasty'),side==='han');
  assert.equal(hanChoose(s,side==='han'?'dynasty':'independence'),true);
  for(let i=0;i<36;i++)hanTick(s);
  const restored=loadHanSave(serialize(s));
  assert.equal(restored.nationalAmbition.id,side==='han'?'dynasty':'independence');
  assert.equal(typeof hanStatus(restored).done,'boolean');
  assert.ok(hanStatus(restored).title[1]);
 }
});

test('official Roman finalization archives ambition changes and observed causal links',()=>{
 const s=newGame('caesar');chooseAmbition(s,'economic');chooseAmbition(s,'diplomatic');
 s.victory=true;
 const result=finalizeCampaign(s);
 assert.equal(result.ok,true);
 assert.equal(result.archive.nationalAmbition.id,'diplomatic');
 assert.equal(result.archive.nationalAmbition.changes.length,2);
 assert.deepEqual(result.archive.causalChains,[]);
});
