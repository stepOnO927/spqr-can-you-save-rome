import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,estimatedStrength} from '../engine.js?v=world-kings-estate-village-1';
import {proposeAgreement} from '../agreements.js?v=world-kings-estate-village-1';
import {queueMission,advanceOperations,addReport,reportEvidence} from '../character-system.js?v=world-kings-estate-village-1';
import {buildChessboard} from '../chessboard.js?v=world-kings-estate-village-1';
import {assessOpportunities,opportunityEvidenceSignature} from '../multipolar.js?v=world-kings-estate-village-1';

const seedFor=(min,max)=>Array.from({length:100000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=min&&q<max});
function setup(){const s=newGame('caesar');s.relations['egypt:parthia']=60;assert.ok(proposeAgreement(s,'egypt','parthia','defensive',{secret:true}).ok);return s}
function advance(s,n){for(let i=0;i<n;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceOperations(s)}}
test('a spy can uncover a dated secret-agreement lead without exposing the terms or live changes',()=>{
 let s=setup();assert.ok(!buildChessboard(s).links.some(x=>x.kind==='secret_treaty'));
 const cash=s.factions.caesar.treasury;assert.ok(queueMission(s,'caesar','egypt','spy','secret_treaty').ok);assert.equal(s.factions.caesar.treasury,cash-12);
 s.world.intelSeed=seedFor(.7,.8);advance(s,3);assert.ok(!buildChessboard(s).links.some(x=>x.kind==='secret_treaty'));s=upgradeSave(structuredClone(s));advance(s,1);
 const r=s.knowledge.caesar.egypt.reports.find(x=>x.kind==='secret_treaty');assert.equal(r.value,'parthia');assert.equal(r.confidence,'unverified');
 const board=buildChessboard(s),link=board.links.find(x=>x.kind==='secret_treaty');assert.ok(link);assert.deepEqual(link.observed,{year:s.year,month:s.month});assert.doesNotMatch(JSON.stringify(link),/defensive|防御协议/);
 s.agreements.find(t=>t.secret).status='terminated';assert.deepEqual(buildChessboard(s),board);
});
test('no finding does not reveal whether a secret agreement exists',()=>{
 for(const hasAgreement of [true,false]){const s=setup();if(!hasAgreement)s.agreements=[];assert.ok(queueMission(s,'caesar','egypt','spy','secret_treaty').ok);s.world.intelSeed=seedFor(.48,.52);advance(s,4);assert.equal(s.knowledge.caesar.egypt.reports.find(x=>x.kind==='secret_treaty').value,'unknown');assert.ok(!buildChessboard(s).links.some(x=>x.kind==='secret_treaty'))}
});
test('reports of different secret partners can coexist without false contradiction',()=>{
 const s=setup();addReport(s,'caesar','egypt',{kind:'secret_treaty',value:'parthia',source:'spy'});addReport(s,'caesar','egypt',{kind:'secret_treaty',value:'armenia',source:'envoy'});
 const reports=s.knowledge.caesar.egypt.reports.filter(x=>x.kind==='secret_treaty');assert.ok(reports.every(r=>r.confidence!=='disputed'));assert.equal(reportEvidence(s,'caesar','egypt',reports[0]).compatible.length,1);
});
test('a partner forwards only its own existing report after the return journey',()=>{
 const s=setup();s.alliances.push(['caesar','numidia']);addReport(s,'numidia','egypt',{kind:'secret_treaty',value:'parthia',source:'spy'});
 assert.ok(queueMission(s,'caesar','egypt','exchange','secret_treaty','numidia').ok);s.world.intelSeed=seedFor(.7,.8);advance(s,2);
 assert.ok(!buildChessboard(s).links.some(x=>x.kind==='secret_treaty'));advance(s,1);
 const r=s.knowledge.caesar.egypt.reports.find(x=>x.kind==='secret_treaty');assert.equal(r.value,'parthia');assert.equal(r.originSource,'spy');assert.equal(r.fromFaction,'numidia');assert.ok(buildChessboard(s).links.some(x=>x.kind==='secret_treaty'));
});
test('AI courts send agreement proposals before any treaty can take effect',()=>{
 const s=newGame('caesar');s.difficulty='expert';s.wars=[];s.month=3;s.relations['armenia:parthia']=60;s.factions.parthia.treasury=200;s.factions.parthia.food=100;
 tick(s,{autoplayPlayer:true});const offer=s.world.agreementLetters.find(x=>x.actor==='parthia'&&x.target==='armenia');
 assert.ok(offer);assert.equal(offer.status,'pending');assert.equal(offer.remaining,2);assert.ok(!s.agreements.some(x=>x.parties.includes('parthia')&&x.parties.includes('armenia')&&x.type===offer.type&&x.status==='active'));
});
test('an AI weighs only its delivered secret-agreement leads',()=>{
 const s=newGame('caesar'),assessment=x=>assessOpportunities(x,'parthia',estimatedStrength).find(r=>r.target==='armenia'),before=assessment(s),sig=opportunityEvidenceSignature(s,'parthia'),other=structuredClone(s);
 other.agreements.push({id:'hidden',secret:true,status:'active',type:'defensive',parties:['armenia','egypt'],expiresAt:s.year*12+s.month+24});
 assert.deepEqual(assessment(other),before);assert.equal(opportunityEvidenceSignature(other,'parthia'),sig);
 addReport(other,'parthia','armenia',{kind:'secret_treaty',value:'egypt',source:'spy'});
 assert.equal(assessment(other).suspectedSupport,1);assert.ok(assessment(other).score<before.score);assert.notEqual(opportunityEvidenceSignature(other,'parthia'),sig);
 other.year+=3;assert.equal(assessment(other).suspectedSupport,0);
});
