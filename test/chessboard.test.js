import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=fort-intel-1';
import {buildChessboard} from '../chessboard.js?v=fort-intel-1';
import {addReport} from '../character-system.js?v=fort-intel-1';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=multipolar-2';
import {renderChessboard} from '../chessboard-ui.js?v=warning-privacy-1';

test('the board does not read hidden foreign plans, plots, armies, personal loyalties or secret treaties',()=>{
 const s=newGame('caesar'),before=buildChessboard(s);s.world.conspiracies={senate:{person:'cato',participants:['cato']}};s.world.strategicPlans={senate:{goal:'secret'}};s.world.doubleAgents=[{person:'antony',allegiance:'senate'}];
 s.world.leadership.senate=['cato'];s.world.characters.pompey.alive=false;s.world.characters.cato.ambition=100;s.factions.senate.treasury=99999;
 for(const a of s.armies.filter(a=>a.owner==='senate'))a.men=999999;
 s.relations['armenia:parthia']=60;assert.ok(proposeAgreement(s,'armenia','parthia','intelligence',{secret:true}).ok);s.coalitions=[{id:'hidden',status:'active',parties:['egypt','parthia','armenia'],target:'caesar',cohesion:1}];
 assert.deepEqual(buildChessboard(s),before);
});
test('a false accusation is shown as a dated rumor rather than as a confirmed hidden plot',()=>{
 const s=newGame('senate');addReport(s,'senate','senate',{kind:'conspiracy',character:'cato',value:'suspected',source:'spy',confidence:'unverified'});
 const board=buildChessboard(s);const edge=board.links.find(x=>x.kind==='suspicion'&&x.from==='p:cato');assert.ok(edge);assert.equal(edge.certainty,'rumor');assert.deepEqual(edge.observed,{year:-49,month:1});assert.ok(board.risks.some(x=>x.level==='rumor'));assert.equal(s.world.conspiracies?.senate,undefined);
});
test('a public treaty appears only as a dated frontier report; secret treaty never appears',()=>{
 const s=newGame('caesar');s.relations['armenia:parthia']=60;const t=proposeAgreement(s,'armenia','parthia','trade').agreement;proposeAgreement(s,'armenia','parthia','intelligence',{secret:true});
 s.regions.find(r=>r.id==='anatolia').owner='caesar';observeDiplomacy(s);const board=buildChessboard(s);assert.ok(board.links.some(x=>x.kind==='agreement'&&x.certainty==='reported'&&x.detail[0].includes('Trade')));assert.ok(!JSON.stringify(board).includes('Intelligence sharing'));assert.ok(board.links.some(x=>x.observed?.year===t.start.year));
});
test('council opinions and Feather use own records without exposing hidden scores',()=>{
 const s=newGame('caesar');s.difficulty='beginner';s.factions.caesar.food=5;s.world.characters.caesar.ambition=100;const board=buildChessboard(s);
 assert.ok(board.risks.some(x=>x.text[0].includes('Food is low')));assert.ok(board.advice.some(x=>x.role[0]==='Commander'));assert.ok(board.feather.length);assert.ok(!JSON.stringify(board).includes('ambition'));
 s.difficulty='expert';assert.equal(buildChessboard(s).feather.length,0);
});
test('a loyal but less capable adviser may offer questionable advice without revealing hidden scores',()=>{
 const s=newGame('senate');s.factions.senate.stability=30;for(const p of Object.values(s.world.characters).filter(p=>p.faction==='senate'&&p.id!=='pompey')){p.education=5;p.loyalty=90}
 const board=buildChessboard(s),adviser=board.advice.find(a=>a.role[0]==='Statesman');assert.match(adviser.text[0],/proclamation/);assert.doesNotMatch(JSON.stringify(adviser),/education|loyalty|incompetent/);
});
test('the bilingual interface exposes a keyboard-accessible network and an inspectable evidence roster',()=>{
 const s=newGame('caesar');s.difficulty='beginner';const en=renderChessboard(s,'en','f:egypt'),zh=renderChessboard(s,'zh','f:egypt');
 assert.match(en,/THE CHESSBOARD/);assert.match(en,/Evidence dossier/);assert.match(en,/data-board-node="f:egypt"/);assert.match(en,/tabindex="0"/);assert.match(en,/complete known roster/);assert.match(en,/FEATHER/);
 assert.match(zh,/棋盘/);assert.match(zh,/情报档案/);assert.match(zh,/战略会议/);assert.match(zh,/羽毛/);assert.doesNotMatch(en,/ambition|doubleAgents|strategicPlans/);
});
test('active military agreements are counted when assessing isolation',()=>{
 const s=newGame('caesar');s.relations['caesar:egypt']=60;
 assert.ok(buildChessboard(s).risks.some(r=>r.text[0].includes('Isolation')));
 assert.ok(proposeAgreement(s,'caesar','egypt','defensive').ok);
 assert.ok(!buildChessboard(s).risks.some(r=>r.text[0].includes('Isolation')));
 s.wars.push(['caesar','egypt']);assert.ok(buildChessboard(s).risks.some(r=>r.text[0].includes('Isolation')));
});
test('a possible coalition warning uses only own relations and frontier reports',()=>{
 const s=newGame('caesar');s.controlKnowledge.caesar.hispaniaN={owner:'egypt',year:-49,month:1};s.relations['caesar:egypt']=-30;
 const before=buildChessboard(s);assert.ok(before.risks.some(r=>r.text[0].includes('not evidence of a coalition')));
 s.factions.egypt.treasury=999999;s.world.strategicPlans={egypt:{secret:'attack'}};assert.deepEqual(buildChessboard(s),before);
});
test('the board distinguishes known family agreements and real treasury support from military alliances',()=>{
 const s=newGame('caesar'),family=s.world.characters.antony.familyId;
 s.world.dynasties.familyAccords.push({host:'caesar',target:'egypt',kind:'pledge',status:'active',year:-49,month:1});
 s.world.dynasties.familyAccords.push({host:'senate',target:'armenia',kind:'pledge',status:'active',year:-49,month:1});
 s.world.dynasties.familyLoans.push({familyId:family,faction:'caesar',remaining:12,year:-49,month:1});
 const board=buildChessboard(s);assert.ok(board.links.some(e=>e.kind==='familyAccord'&&e.to==='f:egypt'&&e.detail[0].includes('not a military alliance')));
 assert.ok(board.links.some(e=>e.kind==='patronage'&&e.from==='p:antony'));assert.ok(!board.links.some(e=>e.kind==='familyAccord'&&e.to==='f:armenia'));
});
