import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region,resolveBattle,upgradeSave,isWar,tick,sendInquiry} from '../engine.js?v=safe-save-1';
import {contestLeadership,advanceDisputes,addReport,supportClaimant,advanceOperations,previewMission,queueMission} from '../character-system.js?v=safe-save-1';
import {knownDynasticFactions,resolveDynasticWars} from '../civil-war.js?v=safe-save-1';
import {reportedControl} from '../control-intelligence.js';

const seedFor=(min,max)=>Array.from({length:100000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=min&&q<max});
function outbreak(parent='egypt'){
 const s=newGame('caesar'),claimant=parent==='egypt'?'cleopatra':'pacorus';if(parent==='parthia')s.world.characters.pacorus.loyalty=20;
 assert.equal(contestLeadership(s,parent,claimant),true);s.factions[parent].stability=30;s.world.disputes[parent].months=5;s.world.disputes[parent].duration=11;s.world.intelSeed=seedFor(.7,.8);advanceDisputes(s);return s;
}
test('a prolonged unstable dispute can create independent claimant territory, army and war without informing a remote observer',()=>{
 for(const [parent,rival,place,claimant] of [['egypt','egypt_claimant','egyptUpper','cleopatra'],['parthia','parthia_claimant','media','pacorus']]){
  let s=outbreak(parent);assert.equal(region(s,place).owner,rival);assert.equal(isWar(s,parent,rival),true);
  assert.equal(s.world.characters[claimant].faction,rival);assert.deepEqual(s.world.leadership[rival],[claimant]);assert.ok(s.armies.some(a=>a.owner===rival&&a.characterId===claimant&&a.men>=500));
  assert.equal(reportedControl(s,'caesar',place).owner,parent);assert.equal(s.knowledge.caesar[rival].reportedLeaders.length,0);assert.equal(Object.keys(s.knowledge.caesar[rival].sightings).length,0);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(isWar(s,parent,rival),true);assert.equal(region(s,place).owner,rival);assert.ok(s.world.disputes[parent].war);
 }
});
test('a garrison in the potential breakaway theater prevents the territory from switching for free',()=>{
 const s=newGame();contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.disputes.egypt.duration=11;
 s.armies.find(a=>a.id==='egyptguard').region='egyptUpper';s.world.intelSeed=seedFor(.7,.8);advanceDisputes(s);
 assert.equal(region(s,'egyptUpper').owner,'egypt');assert.equal(s.factions.egypt_claimant,undefined);
});
test('a claimant who wins the actual field battle takes the realm without instantly updating foreign reports',()=>{
 const s=outbreak(),rival=s.armies.find(a=>a.owner==='egypt_claimant'),guard=s.armies.find(a=>a.owner==='egypt');rival.men=100000;s.wars.push(['egypt_claimant','senate']);
 assert.equal(resolveBattle(s,rival,guard,region(s,'egypt')),true);resolveDynasticWars(s);
 assert.equal(region(s,'egypt').owner,'egypt');assert.equal(region(s,'egyptUpper').owner,'egypt');assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.ok(s.world.claimants.egypt.includes('ptolemy'));
 assert.equal(s.factions.egypt_claimant,undefined);assert.equal(s.world.characters.cleopatra.faction,'egypt');assert.equal(isWar(s,'egypt','senate'),true);assert.equal(reportedControl(s,'caesar','egyptUpper').owner,'egypt');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('the incumbent prevails when the claimant loses its land and forces',()=>{
 const s=outbreak();region(s,'egyptUpper').owner='egypt';s.armies=s.armies.filter(a=>a.owner!=='egypt_claimant');resolveDynasticWars(s);
 assert.equal(s.factions.egypt_claimant,undefined);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.deepEqual(s.world.claimants.egypt,[]);assert.equal(s.world.characters.cleopatra.faction,'egypt');assert.equal(isWar(s,'egypt','egypt_claimant'),false);
});
test('a claimant death does not erase an army or its territory mid-war',()=>{
 const s=outbreak();s.world.characters.cleopatra.alive=false;s.world.characters.cleopatra.health='deceased';resolveDynasticWars(s);
 assert.ok(s.factions.egypt_claimant);assert.equal(region(s,'egyptUpper').owner,'egypt_claimant');assert.ok(s.armies.some(a=>a.owner==='egypt_claimant'));assert.ok(s.world.disputes.egypt.war);
});
test('an uncontested vacancy is filled if a deceased claimant’s army wins the civil war',()=>{
 let s=outbreak();for(const id of ['cleopatra','ptolemy']){s.world.characters[id].alive=false;s.world.characters[id].health='deceased'}
 for(const r of s.regions)if(r.owner==='egypt')r.owner='caesar';s.armies=s.armies.filter(a=>a.owner!=='egypt');s=upgradeSave(JSON.parse(JSON.stringify(s)));resolveDynasticWars(s);
 assert.deepEqual(s.world.leadership.egypt,['arsinoe']);assert.equal(s.world.disputes.egypt,undefined);assert.equal(s.world.characters.arsinoe.faction,'egypt');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('a surviving rival still contests the vacancy when a deceased claimant’s army wins',()=>{
 const s=outbreak();s.world.characters.cleopatra.alive=false;s.world.characters.cleopatra.health='deceased';for(const r of s.regions)if(r.owner==='egypt')r.owner='caesar';s.armies=s.armies.filter(a=>a.owner!=='egypt');resolveDynasticWars(s);
 assert.deepEqual(s.world.leadership.egypt,[]);assert.ok(s.world.claimants.egypt.includes('ptolemy'));assert.ok(s.world.disputes.egypt.vacancySince);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('accepted military aid can reinforce an actual claimant army after the delayed response',()=>{
 const s=outbreak();addReport(s,'caesar','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy',confidence:'unverified'});
 const unit=s.armies.find(a=>a.owner==='egypt_claimant'),before=unit.men;assert.equal(supportClaimant(s,'caesar','egypt','cleopatra',null,'military').ok,true);
 s.world.intelSeed=1000;for(let i=0;i<3;i++)advanceOperations(s);assert.equal(unit.men,before);advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(unit.men,before+1000);
});
test('war can progress through normal monthly AI movement and combat after saving',()=>{
 let s=outbreak();s=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(let i=0;i<24&&s.world.disputes.egypt?.war;i++)tick(s);
 assert.ok(!s.world.disputes.egypt?.war,'a side should win or lose through actual campaign combat');
 assert.ok(s.battles.some(b=>[b.attacker.owner,b.defender.owner].includes('egypt_claimant')));
});
test('an exiled army can continue fighting after its side loses its last theater',()=>{
 const s=outbreak(),guard=s.armies.find(a=>a.id==='egyptguard');region(s,'egypt').owner='egypt_claimant';guard.region='syria';
 tick(s);assert.ok(s.world.disputes.egypt.war);assert.equal(guard.move?.to,'egypt');
});
test('the rival is discoverable only from the observer’s records and a stale lead permits a delayed unanswered letter',()=>{
 const s=outbreak();assert.deepEqual(knownDynasticFactions(s,'caesar'),[]);assert.equal(sendInquiry(s,'caesar','egypt_claimant').reason,'unavailable');
 s.controlKnowledge.caesar.egyptUpper={owner:'egypt_claimant',year:-49,month:2,source:'travelers'};assert.deepEqual(knownDynasticFactions(s,'caesar'),['egypt_claimant']);
 region(s,'egyptUpper').owner='egypt';s.armies=s.armies.filter(a=>a.owner!=='egypt_claimant');resolveDynasticWars(s);
 assert.deepEqual(knownDynasticFactions(s,'caesar'),['egypt_claimant']);assert.equal(sendInquiry(s,'caesar','egypt_claimant').ok,true);
 const letter=s.inquiries[0];for(let i=0;i<letter.duration;i++)tick(s);assert.equal(letter.status,'no_reply');
});
test('a stale rival report permits the same mission preview and does not reveal a defeated faction',()=>{
 const a=outbreak();a.controlKnowledge.caesar.egyptUpper={owner:'egypt_claimant',year:-49,month:2,source:'travelers'};
 const b=upgradeSave(JSON.parse(JSON.stringify(a)));region(b,'egyptUpper').owner='egypt';b.armies=b.armies.filter(x=>x.owner!=='egypt_claimant');resolveDynasticWars(b);
 assert.deepEqual(previewMission(a,'caesar','egypt_claimant','spy','leaders'),previewMission(b,'caesar','egypt_claimant','spy','leaders'));
 assert.deepEqual(previewMission(a,'caesar','egypt_claimant','envoy','leaders'),previewMission(b,'caesar','egypt_claimant','envoy','leaders'));
 assert.equal(queueMission(b,'caesar','egypt_claimant','spy','leaders').ok,true);for(let i=0;i<4;i++)advanceOperations(b);
 assert.equal(b.operations[0].status,'failed');assert.equal(b.knowledge.caesar.egypt_claimant.reports.length,0);
});
test('aid accepted before a civil war becomes a force reserve without minting troops',()=>{
 const s=newGame();contestLeadership(s,'egypt','cleopatra');addReport(s,'caesar','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy'});
 const before=s.factions.caesar.manpower;supportClaimant(s,'caesar','egypt','cleopatra',null,'military');s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);
 assert.equal(s.factions.caesar.manpower,before-1000);assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,1000);
 const guard=s.armies.find(a=>a.id==='egyptguard'),total=guard.men+s.factions.egypt.manpower+1000,loss=Math.min(300,Math.ceil(guard.men*.05));
 s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.disputes.egypt.duration=11;s.world.intelSeed=seedFor(.7,.8);advanceDisputes(s);
 const unit=s.armies.find(a=>a.owner==='egypt_claimant');assert.equal(guard.men+unit.men+s.factions.egypt.manpower,total-loss-300);assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,undefined);
});
