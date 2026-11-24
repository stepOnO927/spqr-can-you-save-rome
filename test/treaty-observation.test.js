import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,diplomacy,estimatedStrength} from '../engine.js?v=dossier-archive-1';
import {proposeAgreement,terminateAgreement} from '../agreements.js?v=dossier-archive-1';
import {formCoalition,leaveCoalition} from '../coalitions.js?v=dossier-archive-1';
import {advanceMail} from '../epistulae.js?v=dossier-archive-1';
import {knownTreatyDocuments,knownAgreement,knownAlliance,knownRelation,receiveTreatyNotice,initializeTreatyObservations} from '../treaty-observation.js?v=treaty-observation-1';
import {observeDiplomacy,reportedDiplomacy} from '../diplomatic-knowledge.js?v=dossier-archive-1';
import {assessOpportunities,opportunityEvidenceSignature} from '../multipolar.js?v=dossier-archive-1';
import {buildChessboard} from '../chessboard.js?v=dossier-archive-1';

function setup(type='non_aggression',seed=1000003){
 const s=newGame('caesar');s.seed=seed;s.relations['caesar:egypt']=60;const result=proposeAgreement(s,'egypt','caesar',type);assert.ok(result.ok);observeDiplomacy(s);return {s,id:result.agreement.id};
}
function advance(s){if(++s.month>12){s.month=1;s.year++}advanceMail(s,{receiveTreatyNotice});observeDiplomacy(s)}
function notice(s,actor){return s.mail.messages.find(m=>m.context?.kind==='treaty_notice'&&m.senderFaction===actor)}
test('remote ending changes actual law but not the other court copy, opinion or plans before mail arrives',()=>{
 const {s,id}=setup(),before=structuredClone(s),signature=opportunityEvidenceSignature(s,'caesar'),opportunities=assessOpportunities(s,'caesar',estimatedStrength),relation=knownRelation(s,'caesar','egypt');
 assert.ok(terminateAgreement(s,id,'egypt').ok);assert.equal(s.agreements.find(t=>t.id===id).status,'breached');assert.ok(!knownAgreement(s,'egypt','caesar','non_aggression'));assert.ok(knownAgreement(s,'caesar','egypt','non_aggression'));
 observeDiplomacy(s);assert.equal(knownRelation(s,'caesar','egypt'),relation);assert.equal(opportunityEvidenceSignature(s,'caesar'),signature);assert.deepEqual(assessOpportunities(s,'caesar',estimatedStrength),opportunities);
 assert.deepEqual(buildChessboard(s,'caesar'),buildChessboard(before,'caesar'));assert.equal((s.world.politicalMemories||[]).filter(m=>m.observer==='caesar'&&m.kind==='broken_treaty').length,0);
});
test('a real institutional notice travels before the recipient learns the ending and private consequence',()=>{
 let result;
 for(let seed=1;seed<=40;seed++){const {s,id}=setup('non_aggression',seed*1000003),standing=knownRelation(s,'caesar','egypt');terminateAgreement(s,id,'egypt');
  for(let i=0;i<18&&!notice(s,'egypt')?.delivery?.match(/received|lost/);i++)advance(s);
  const m=notice(s,'egypt');if(m?.delivery!=='received')continue;
  assert.ok(m.arrival>(m.created.year*12+m.created.month));assert.match(m.body[1],/放弃.*互不侵犯/);assert.ok(!knownAgreement(s,'caesar','egypt','non_aggression'));assert.equal(knownRelation(s,'caesar','egypt'),standing-20);
  assert.ok(s.world.politicalMemories.some(x=>x.observer==='caesar'&&x.subject==='egypt'&&x.kind==='broken_treaty'));assert.ok(s.log.some(x=>x.zh.includes('变更通知')));assert.ok(receiveTreatyNotice(s,m));assert.equal(s.world.politicalMemories.filter(x=>x.observer==='caesar'&&x.kind==='broken_treaty').length,1);result=s;break;
 }
 assert.ok(result,'a seeded real courier must arrive');const restored=upgradeSave(structuredClone(result));assert.equal(knownAgreement(restored,'caesar','egypt','non_aggression'),undefined);
});
test('a lost notice leaves a stale copy and held opinion after save/load instead of giving a receipt',()=>{
 let found=false;
 for(let seed=1;seed<=80;seed++){let {s,id}=setup('non_aggression',seed*1000003);const standing=knownRelation(s,'caesar','egypt');terminateAgreement(s,id,'egypt');for(let i=0;i<18&&!notice(s,'egypt')?.delivery?.match(/received|lost/);i++)advance(s);
  if(notice(s,'egypt')?.delivery!=='lost')continue;s=upgradeSave(structuredClone(s));assert.ok(knownAgreement(s,'caesar','egypt','non_aggression'));assert.equal(knownRelation(s,'caesar','egypt'),standing);assert.ok(!s.log.some(x=>x.zh.includes('变更通知')));assert.ok(!JSON.stringify(reportedDiplomacy(s,'caesar')).includes('held'));found=true;break;
 }assert.ok(found,'seeded courier loss must remain possible');
});
test('an explicit local renunciation works against a stale copy without exposing the remote truth',()=>{
 const a=setup(),b=setup();terminateAgreement(a.s,a.id,'egypt');
 const beforeA=a.s.diplomaticCredibility.caesar??100,beforeB=b.s.diplomaticCredibility.caesar??100;
 assert.deepEqual(terminateAgreement(a.s,a.id,'caesar'),terminateAgreement(b.s,b.id,'caesar'));assert.equal(a.s.diplomaticCredibility.caesar,beforeA-20);assert.equal(b.s.diplomaticCredibility.caesar,beforeB-20);assert.equal(knownAgreement(a.s,'caesar','egypt','non_aggression'),undefined);assert.equal(knownAgreement(b.s,'caesar','egypt','non_aggression'),undefined);
});
test('full alliance break preserves the uninformed court copy and own planning until correspondence',()=>{
 const s=newGame('caesar');s.relations['caesar:egypt']=60;assert.ok(diplomacy(s,'egypt','caesar','alliance'));observeDiplomacy(s);const before=opportunityEvidenceSignature(s,'caesar'),standing=knownRelation(s,'caesar','egypt');
 assert.ok(diplomacy(s,'egypt','caesar','break'));assert.equal(s.alliances.length,0);assert.equal(knownAlliance(s,'egypt','caesar'),false);assert.equal(knownAlliance(s,'caesar','egypt'),true);assert.equal(knownRelation(s,'caesar','egypt'),standing);observeDiplomacy(s);assert.equal(opportunityEvidenceSignature(s,'caesar'),before);
});
test('known expiry and direct own hostilities end copies without remote status inspection',()=>{
 const {s,id}=setup();const t=s.agreements.find(t=>t.id===id);s.world.diplomaticKnowledge.caesar[id].expiresAt=s.year*12+s.month;assert.equal(knownAgreement(s,'caesar','egypt','non_aggression'),undefined);
 const other=setup();other.s.wars.push(['caesar','egypt']);observeDiplomacy(other.s);assert.equal(knownAgreement(other.s,'caesar','egypt','non_aggression'),undefined);other.s.wars=other.s.wars.filter(w=>!w.includes('egypt'));assert.equal(knownAgreement(other.s,'caesar','egypt','non_aggression'),undefined);
});
test('migration captures existing exposed copies once and never rebuilds them from hidden changes',()=>{
 const {s,id}=setup();delete s.world.treatyObservationVersion;for(const entries of Object.values(s.world.diplomaticKnowledge))for(const r of Object.values(entries))delete r.participantCopy;
 const old=upgradeSave(structuredClone(s));assert.ok(knownAgreement(old,'caesar','egypt','non_aggression'));old.agreements.find(t=>t.id===id).status='breached';initializeTreatyObservations(old);observeDiplomacy(old);assert.ok(knownAgreement(old,'caesar','egypt','non_aggression'));
});
test('coalition departure is announced to each member without disclosing the other deliveries',()=>{
 const s=newGame('caesar');for(const id of ['egypt','numidia','galatia']){s.relations[['caesar',id].sort().join(':')]=60;s.relations[[id,'senate'].sort().join(':')]=-30}
 const formed=formCoalition(s,'caesar',['egypt','numidia','galatia'],'senate',estimatedStrength);assert.ok(formed.ok);const id=formed.coalition.id,standing=knownRelation(s,'caesar','egypt');
 assert.ok(leaveCoalition(s,id,'egypt').ok);assert.equal(formed.coalition.parties.includes('egypt'),false);assert.ok(knownTreatyDocuments(s,'caesar','coalition').find(c=>c.id===id).parties.includes('egypt'));assert.equal(knownRelation(s,'caesar','egypt'),standing);assert.equal(knownTreatyDocuments(s,'egypt','coalition').length,0);
});

test('an old notice cannot end a renewed full alliance with the same parties and calendar date',()=>{
 let checked=false;
 for(let seed=1;seed<=40;seed++){const s=newGame('caesar');s.seed=seed*1000003;s.relations['caesar:egypt']=60;assert.ok(diplomacy(s,'egypt','caesar','alliance'));assert.ok(diplomacy(s,'egypt','caesar','break'));s.relations['caesar:egypt']=60;assert.ok(diplomacy(s,'egypt','caesar','alliance'));const reference=knownTreatyDocuments(s,'caesar','alliance')[0].reference;
  for(let i=0;i<18&&!notice(s,'egypt')?.delivery?.match(/received|lost/);i++)advance(s);
  if(notice(s,'egypt')?.delivery!=='received')continue;assert.ok(knownAlliance(s,'caesar','egypt'));assert.equal(knownTreatyDocuments(s,'caesar','alliance')[0].reference,reference);checked=true;break;
 }assert.ok(checked);
});
