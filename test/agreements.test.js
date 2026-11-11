import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,diplomacy,isWar,moveArmy,previewMarch,tick} from '../engine.js?v=succession-feedback-1';
import {proposeAgreement,terminateAgreement,activeAgreement,advanceAgreements,visibleAgreements} from '../agreements.js?v=grand-chessboard-2';
import {addReport,queueMission,advanceOperations} from '../character-system.js?v=succession-feedback-1';

function friendly(s,a,b){s.relations[[a,b].sort().join(':')]=60}
test('treaties cost resources, expire, survive saves and breaches affect credibility',()=>{
 let s=newGame('egypt');friendly(s,'egypt','parthia');const cash=s.factions.egypt.treasury;
 const result=proposeAgreement(s,'egypt','parthia','non_aggression',{secret:true});assert.ok(result.ok);assert.equal(s.factions.egypt.treasury,cash-4);
 assert.equal(result.agreement.terms.kind,'non_aggression');assert.ok(result.agreement.obligations.length&&result.agreement.benefits.length);assert.ok(result.agreement.start&&result.agreement.duration&&result.agreement.termination&&result.agreement.breachPenalty);
 assert.equal(visibleAgreements(s,'caesar').length,0);assert.equal(diplomacy(s,'egypt','parthia','war'),false);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(activeAgreement(s,'parthia','egypt','non_aggression'));
 assert.ok(terminateAgreement(s,result.agreement.id,'egypt').ok);assert.equal(s.diplomaticCredibility.egypt,80);assert.equal(s.relations['egypt:parthia'],40);assert.ok(diplomacy(s,'egypt','parthia','war'));
 const t=newGame('egypt');friendly(t,'egypt','parthia');const trade=proposeAgreement(t,'egypt','parthia','trade').agreement;const before=t.factions.egypt.treasury;advanceAgreements(t);assert.equal(t.factions.egypt.treasury,before+1);t.year+=3;advanceAgreements(t);assert.equal(trade.status,'expired');assert.equal(t.factions.egypt.treasury,before+1);
});
test('older treaties receive structured terms on save migration without changing the deal',()=>{
 const s=newGame('egypt');friendly(s,'egypt','parthia');const t=proposeAgreement(s,'egypt','parthia','trade').agreement;delete t.terms;const restored=upgradeSave(JSON.parse(JSON.stringify(s))),saved=restored.agreements.find(x=>x.id===t.id);
 assert.equal(saved.terms.kind,'trade');assert.equal(saved.start.year,t.start.year);assert.equal(saved.expiresAt,t.expiresAt);assert.equal(saved.status,'active');
});
test('legacy full alliances gain terms without an invented start and breaking one damages credibility',()=>{
 const old=newGame('egypt');old.alliances.push(['egypt','armenia']);let s=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(s.alliances[0].slice(0,2),['egypt','armenia']);assert.equal(s.alliances[0][2].start,null);assert.equal(s.alliances[0][2].duration,null);
 assert.ok(diplomacy(s,'egypt','armenia','break'));assert.equal(s.diplomaticCredibility.egypt,80);assert.equal(s.world.allianceHistory[0].outcome,'breached');assert.ok(s.world.politicalMemories.some(m=>m.subject==='egypt'&&m.kind==='broken_treaty'));
 s.relations['armenia:egypt']=60;assert.ok(diplomacy(s,'egypt','armenia','alliance'));assert.deepEqual(s.alliances[0][2].start,{year:s.year,month:s.month});
});
test('military access moves through a friendly territory without capturing it and ends on breach',()=>{
 let s=newGame('numidia');friendly(s,'numidia','mauretania');assert.ok(proposeAgreement(s,'numidia','mauretania','military_access').ok);
 const unit=s.armies.find(a=>a.owner==='numidia');assert.equal(previewMarch(s,unit.id,'mauretania').hostile,false);assert.ok(moveArmy(s,unit.id,'mauretania').ok);
 for(let i=0;i<2&&unit.move;i++)tick(s);
 assert.equal(unit.region,'mauretania');assert.equal(s.regions.find(r=>r.id==='mauretania').owner,'mauretania');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const treaty=activeAgreement(s,'numidia','mauretania','military_access');terminateAgreement(s,treaty.id,'numidia');
 const a=s.armies.find(a=>a.owner==='numidia');a.region='numidia';a.move=null;assert.equal(previewMarch(s,a.id,'mauretania').ok,false);
});
test('defensive and offensive obligations join the appropriate side only',()=>{
 const defense=newGame('egypt');friendly(defense,'egypt','armenia');assert.ok(proposeAgreement(defense,'egypt','armenia','defensive').ok);
 assert.ok(diplomacy(defense,'parthia','egypt','war'));assert.ok(isWar(defense,'armenia','parthia'));
 const offense=newGame('egypt');friendly(offense,'egypt','armenia');assert.ok(proposeAgreement(offense,'egypt','armenia','offensive').ok);
 assert.ok(diplomacy(offense,'parthia','egypt','war'));assert.equal(isWar(offense,'armenia','parthia'),false);
 const attacked=newGame('egypt');friendly(attacked,'egypt','armenia');assert.ok(proposeAgreement(attacked,'egypt','armenia','offensive').ok);
 assert.ok(diplomacy(attacked,'egypt','parthia','war'));assert.ok(isWar(attacked,'armenia','parthia'));
});
test('intelligence agreement enables existing delayed exchange, preserving report source',()=>{
 const s=newGame('senate');friendly(s,'senate','parthia');assert.ok(proposeAgreement(s,'senate','parthia','intelligence').ok);
 addReport(s,'parthia','egypt',{kind:'strength',value:12000,source:'spy'});
 const op=queueMission(s,'senate','egypt','exchange','strength','parthia');assert.ok(op.ok);s.world.intelSeed=1000;
 for(let i=0;i<op.duration;i++)advanceOperations(s);
 assert.equal(s.knowledge.senate.egypt.reports[0].originSource,'spy');
});
test('hard AI can negotiate with another known neighbor without binding the player',()=>{
 const s=newGame('caesar');s.difficulty='hard';s.month=3;friendly(s,'senate','egypt');
 tick(s);
 assert.ok(s.agreements.some(t=>t.type==='trade'&&t.parties.includes('senate')&&t.parties.includes('egypt')));
 assert.ok(s.agreements.every(t=>!t.parties.includes('caesar')));
});
test('a hard AI at war can seek a temporary neutral frontier without binding the player',()=>{
 const s=newGame('caesar');s.difficulty='hard';s.month=9;s.factions.senate.treasury=150;tick(s);
 assert.ok(s.agreements.some(t=>t.type==='non_aggression'&&t.parties.includes('senate')&&!t.parties.includes('caesar')));
});

test('an independence guarantee binds its provider only when its recipient is attacked',()=>{
 const s=newGame('egypt');friendly(s,'egypt','armenia');const t=proposeAgreement(s,'egypt','armenia','guarantee').agreement;assert.deepEqual(t.terms,{provider:'egypt',recipient:'armenia'});
 assert.ok(diplomacy(s,'parthia','armenia','war'));assert.ok(isWar(s,'egypt','parthia'));
 const other=newGame('egypt');friendly(other,'egypt','armenia');proposeAgreement(other,'egypt','armenia','guarantee');assert.ok(diplomacy(other,'parthia','egypt','war'));assert.equal(isWar(other,'armenia','parthia'),false);
});

test('military aid transfers actual reserves and civic cooperation has a shared cost',()=>{
 let s=newGame('egypt');friendly(s,'egypt','armenia');const t=proposeAgreement(s,'egypt','armenia','military_support').agreement;s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.agreements.find(x=>x.id===t.id).terms,{provider:'egypt',recipient:'armenia'});
 diplomacy(s,'parthia','armenia','war');s.month=3;const a={cash:s.factions.egypt.treasury,food:s.factions.egypt.food},b={cash:s.factions.armenia.treasury,food:s.factions.armenia.food};advanceAgreements(s);
 assert.equal(s.factions.egypt.treasury,a.cash-2);assert.equal(s.factions.egypt.food,a.food-2);assert.equal(s.factions.armenia.treasury,b.cash+2);assert.equal(s.factions.armenia.food,b.food+2);
 const q=newGame('egypt');friendly(q,'egypt','armenia');assert.ok(proposeAgreement(q,'egypt','armenia','political').ok);q.month=6;const before=q.factions.egypt.stability,cash=q.factions.egypt.treasury;advanceAgreements(q);assert.equal(q.factions.egypt.stability,before+1);assert.equal(q.factions.egypt.treasury,cash-1);
});
