import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,advanceRomanDefeat} from '../engine.js';
import {canFinalizeCampaign,finalizeCampaign} from '../legacy.js';
import {captureCampaignState,recordCampaignTurn,formatChronicleEntry,governmentKindLabel} from '../chronicle.js';
import {unrecoveredOwnLosses} from '../map-lab/turn-report.js';

test('both Roman commands lose after three months without an army; a saved defeat freezes turns and can be archived',()=>{
 for(const player of ['caesar','senate']){
  let s=newGame(player);s.armies=s.armies.filter(a=>a.owner!==player);
  tick(s);assert.equal(s.defeat,undefined);assert.equal(s.world.romanDefeatNotice.remaining,2);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));
  tick(s);assert.equal(s.defeat,undefined);assert.equal(s.world.romanDefeatNotice.remaining,1);
  tick(s);assert.equal(s.defeat,true);assert.equal(s.defeatedBy,player==='caesar'?'senate':'caesar');
  assert.equal(canFinalizeCampaign(s),true);
  const month=s.month,year=s.year;tick(s);assert.equal(s.month,month);assert.equal(s.year,year);
  const archive=finalizeCampaign(s).archive;assert.equal(archive.defeat,true);assert.equal(archive.victory,false);
 }
});

test('raising a force or ending the war cancels the collapse warning',()=>{
 for(const recover of [s=>s.armies.push({id:'new-legion',owner:s.player,men:3000}),s=>s.wars=[]]){
  const s=newGame('caesar');s.armies=s.armies.filter(a=>a.owner!==s.player);
  advanceRomanDefeat(s);recover(s);advanceRomanDefeat(s);
  assert.equal(s.world.romanDefeatNotice,undefined);assert.equal(s.defeat,undefined);
 }
});

test('chronicle uses player-facing army and government names, including older saved entries',()=>{
 const s=newGame('senate'),before=captureCampaignState(s),army=s.armies.find(a=>a.owner==='senate');
 const battle={id:'battle:test',year:s.year,month:s.month,region:'roma',attacker:{id:army.id,name:[...army.name],owner:'senate',men:army.men},defender:{id:'enemy',owner:'caesar',men:3000},lossA:300,lossD:500,attackerWins:true};
 s.battles=[battle];s.world.governments.senate.kind='acting_command';recordCampaignTurn(s,before);
 const entry=s.chronicle.entries.find(e=>e.kind==='battle');
 assert.match(formatChronicleEntry(entry,'zh'),new RegExp(army.name[1]));
 assert.doesNotMatch(formatChronicleEntry(entry,'zh'),/levy\d+|battle:test/);
 const older={...entry,ownArmyName:undefined};assert.match(formatChronicleEntry(older,'en'),/friendly force/);
 assert.equal(governmentKindLabel('acting_command','zh'),'临时代行指挥');
 assert.doesNotMatch(formatChronicleEntry(s.chronicle.entries.find(e=>e.kind==='government'),'zh'),/acting_command/);
});

test('persistent loss alerts use own recorded losses and disappear on recapture',()=>{
 const s=newGame('caesar'),r=s.regions.find(x=>x.owner==='caesar'),before=captureCampaignState(s);
 r.owner='senate';recordCampaignTurn(s,before);
 assert.deepEqual(unrecoveredOwnLosses(s).map(e=>e.region),[r.id]);
 s.regions.find(x=>x.id==='parthia').owner='senate';assert.deepEqual(unrecoveredOwnLosses(s).map(e=>e.region),[r.id]);
 r.owner='caesar';assert.deepEqual(unrecoveredOwnLosses(s),[]);
});
