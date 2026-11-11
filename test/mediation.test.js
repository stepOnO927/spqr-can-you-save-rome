import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region,upgradeSave,isWar} from '../engine.js?v=institution-portraits-1';
import {contestLeadership,advanceDisputes,addReport} from '../character-system.js?v=trade-intelligence-1';
import {requestMediation,advanceMediations,resolveDynasticWars,settleDynasticWar} from '../civil-war.js?v=dynasty-id-3';

const rolls=seed=>{const out=[];for(let i=0;i<3;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;out.push(seed/4294967296)}return out};
const seedFor=fn=>Array.from({length:300000},(_,i)=>i).find(i=>fn(...rolls(i)));
function outbreak(parent='egypt'){
 const s=newGame('caesar'),id=parent==='egypt'?'cleopatra':'pacorus';if(parent==='parthia')s.world.characters.pacorus.loyalty=20;
 contestLeadership(s,parent,id);s.factions[parent].stability=30;s.world.disputes[parent].months=5;s.world.disputes[parent].duration=11;s.world.intelSeed=seedFor(a=>a>=.7&&a<.8);advanceDisputes(s);
 addReport(s,'caesar',parent,{kind:'clashes',value:'reported',source:'travelers',confidence:'rumor'});return s;
}
test('mediation waits for both sides and the return letter, and restores joint Egyptian rule',()=>{
 let s=outbreak(),cash=s.factions.caesar.treasury,army=s.armies.find(a=>a.owner==='egypt_claimant'),troops=army.men;
 assert.equal(requestMediation(s,'caesar','egypt').ok,true);assert.equal(s.factions.caesar.treasury,cash-12);assert.equal(requestMediation(s,'caesar','egypt').reason,'pending');
 s.world.intelSeed=seedFor((a,b,c)=>a>.6&&b>.6&&c>.2);advanceMediations(s);advanceMediations(s);assert.ok(s.world.disputes.egypt.war);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceMediations(s);assert.equal(s.mediations[0].status,'pending');assert.deepEqual(s.world.leadership.egypt,['ptolemy','cleopatra']);
 assert.equal(s.armies.find(a=>a.id===army.id).owner,'egypt');assert.equal(s.armies.find(a=>a.id===army.id).men,troops);assert.equal(region(s,'egyptUpper').owner,'egypt');assert.equal(isWar(s,'egypt','egypt_claimant'),false);
 assert.equal(s.knowledge.senate.egypt.reports.length,0);for(let i=0;i<3;i++)advanceMediations(s);assert.equal(s.mediations[0].status,'accepted');assert.equal(s.mediations[0].responseMonth,1);
});
test('Parthian peace retains the incumbent rather than inventing joint rule',()=>{
 const s=outbreak('parthia');assert.equal(settleDynasticWar(s,'parthia'),true);assert.deepEqual(s.world.leadership.parthia,['orodes']);assert.equal(s.world.characters.pacorus.faction,'parthia');assert.deepEqual(s.world.claimants.parthia,[]);
});
test('mediation can be refused, lost on the way, or lost on the return without exposing its sealed answer',()=>{
 for(const [fn,expected,peace] of [[(a,b,c)=>a>=.2&&a<.35&&b>.6&&c>.2,'refused',false],[(a)=>a<.18,'no_reply',false],[(a,b,c)=>a>.6&&b>.6&&c<.15,'no_reply',true]]){
  const s=outbreak();requestMediation(s,'caesar','egypt');s.world.intelSeed=seedFor(fn);for(let i=0;i<3;i++)advanceMediations(s);assert.equal(s.mediations[0].status,'pending');assert.equal(!!s.world.disputes.egypt?.war,!peace);for(let i=0;i<3;i++)advanceMediations(s);assert.equal(s.mediations[0].status,expected);assert.equal(s.mediations[0].sealed,undefined);
 }
});
test('stale or false fighting reports permit the same proposal without disclosing the true war at dispatch',()=>{
 const a=outbreak(),b=upgradeSave(JSON.parse(JSON.stringify(a)));region(b,'egyptUpper').owner='egypt';b.armies=b.armies.filter(x=>x.owner!=='egypt_claimant');resolveDynasticWars(b);
 assert.deepEqual(requestMediation(a,'caesar','egypt'),requestMediation(b,'caesar','egypt'));for(let i=0;i<6;i++)advanceMediations(b);assert.equal(b.mediations[0].status,'no_reply');
 const unknown=newGame();assert.equal(requestMediation(unknown,'caesar','egypt').reason,'unavailable');
});
test('settlement cancels internal orders and preserves external wars without attacking an ally',()=>{
 const s=outbreak(),a=s.armies.find(x=>x.owner==='egypt'),b=s.armies.find(x=>x.owner==='egypt_claimant');a.move={to:'egyptUpper',remaining:1};b.siege={region:'egypt',remaining:2};s.wars.push(['egypt_claimant','senate']);
 assert.equal(settleDynasticWar(s,'egypt'),true);assert.equal(a.move,null);assert.equal(b.siege,null);assert.equal(b.owner,'egypt');assert.equal(isWar(s,'egypt','senate'),true);
 const blocked=outbreak();blocked.wars.push(['egypt_claimant','senate']);blocked.alliances.push(['egypt','senate']);assert.equal(settleDynasticWar(blocked,'egypt'),false);assert.ok(blocked.world.disputes.egypt.war);
});
