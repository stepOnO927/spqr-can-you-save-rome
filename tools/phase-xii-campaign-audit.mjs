import assert from 'node:assert/strict';
import {newGrandGame,tick,adjacent,moveArmy,previewMarch,recruit,region} from '../engine.js';

for(const faction of ['caesar','senate'])for(const strategy of ['aggressive','defensive','low-recruitment']){
 const s=newGrandGame(faction);let attacks=0,recruits=0;
 for(let turn=0;turn<36&&!s.achievementState.finalized;turn++){
  if(strategy==='aggressive')for(const unit of s.armies.filter(a=>a.owner===faction&&!a.move&&!a.siege&&a.men>=600)){
   const target=adjacent(unit.region,s).map(link=>region(s,link.to)).find(r=>r?.owner!==faction&&s.wars.some(w=>w.includes(faction)&&w.includes(r.owner))&&previewMarch(s,unit.id,r.id).ok);
   if(target&&moveArmy(s,unit.id,target.id).ok)attacks++;
  }
  if((strategy==='aggressive'&&turn%6===0||strategy==='low-recruitment'&&turn%12===0)&&s.factions[faction].treasury>=24){const home=s.regions.find(r=>r.owner===faction);if(home&&recruit(s,home.id,faction))recruits++}
  tick(s);
  assert.equal(s.regions.length,120);assert.ok(s.armies.every(a=>Number.isFinite(a.men)&&a.men>=0));
  assert.ok(Object.values(s.factions).every(f=>Number.isFinite(f.treasury)&&Number.isFinite(f.food)&&Number.isFinite(f.manpower)));
  assert.ok(s.factions[faction].stability>=0&&s.factions[faction].stability<=100);
 }
 const own=s.regions.filter(r=>r.owner===faction).length;
 console.log(`${faction} ${strategy}: ${s.year}/${s.month}, territories ${own}, attacks ${attacks}, recruits ${recruits}, treasury ${s.factions[faction].treasury}, food ${s.factions[faction].food}, outcome ${s.achievementState.result||s.campaignOutcome?.kind||'ongoing'}`);
}
