import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=fund-search-1';
import {createFictionalPerson,makeWill,revokeWill,settleInheritance,advanceEstateTransfers,reclaimEstateTransfer} from '../dynasties.js?v=fund-search-1';
import {addReport} from '../character-system.js?v=fund-search-1';
import {renderGenealogyDossier} from '../genealogy-ui.js?v=fund-search-1';

function foreignSpouses(){let s=newGame('caesar');const own=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,wealth:24}),foreign=createFictionalPerson(s,{name:['Reported','报告姓名'],faction:'egypt',birthYear:-78});s.world.characters[own].spouse=foreign;s.world.characters[foreign].spouse=own;addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'spy'});s.world.dynasties.catalog[foreign].name=['Secret','秘密姓名'];return {s:upgradeSave(structuredClone(s)),own,foreign}}

test('a will records the beneficiary name known at signing, not a hidden later name',()=>{
 let {s,own,foreign}=foreignSpouses();assert.ok(makeWill(s,own,foreign).ok);let event=s.world.dynasties.lives[own].at(-1);assert.match(event.zh,/报告姓名/);assert.doesNotMatch(event.zh,/秘密姓名/);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'envoy',peopleNames:{[foreign]:['Later','后续姓名']},observationYear:s.year,observationMonth:s.month});s=upgradeSave(structuredClone(s));event=s.world.dynasties.lives[own].at(-1);assert.match(event.zh,/报告姓名/);assert.doesNotMatch(event.zh,/秘密姓名|后续姓名/);
});

test('a saved will can be inspected and revoked without revealing a later foreign identity',()=>{
 let {s,own,foreign}=foreignSpouses();assert.equal(makeWill(s,own,foreign).ok,true);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'envoy',peopleNames:{[foreign]:['Later','后续姓名']},observationYear:s.year,observationMonth:s.month});
 s=upgradeSave(structuredClone(s));const dossier=renderGenealogyDossier(s,own,true);
 assert.match(dossier,/当前个人遗嘱/);assert.match(dossier,/报告姓名/);assert.doesNotMatch(dossier,/秘密姓名|后续姓名/);
 assert.equal(revokeWill(s,own).ok,true);assert.equal(s.world.characters[own].will,undefined);
 assert.match(s.world.dynasties.lives[own].at(-1).zh,/撤回了个人遗嘱/);assert.equal(revokeWill(s,own).reason,'unavailable');
 s=upgradeSave(structuredClone(s));assert.doesNotMatch(renderGenealogyDossier(s,own,true),/当前个人遗嘱/);
});

test('legacy wills do not invent a foreign fictional beneficiary name',()=>{
 const {s,own,foreign}=foreignSpouses();s.world.characters[own].will={beneficiary:foreign,share:1};
 const dossier=renderGenealogyDossier(s,own,true);assert.match(dossier,/姓名未记录/);assert.doesNotMatch(dossier,/秘密姓名|报告姓名/);
});

test('an unreported death abroad does not block a will or expose survival when the share is allocated',()=>{
 for(const living of [true,false]){
  let {s,own,foreign}=foreignSpouses();s.world.characters[foreign].alive=living;if(!living)s.world.characters[foreign].health='deceased';
  assert.ok(makeWill(s,own,foreign).ok);assert.equal(s.world.characters[own].will.beneficiary,foreign);
  assert.match(s.world.dynasties.lives[own].at(-1).zh,/报告姓名/);assert.doesNotMatch(s.world.dynasties.lives[own].at(-1).zh,/秘密姓名/);
  s=upgradeSave(structuredClone(s));const family=s.world.characters[own].familyId,before=s.world.dynasties.families[family].wealth;
  s.world.characters[own].alive=false;settleInheritance(s,own);
  const transfer=s.world.dynasties.estateTransfers[0];assert.equal(transfer.status,'pending');assert.equal(transfer.amount,24);assert.equal(s.world.characters[foreign].wealth,0);assert.equal(s.world.dynasties.families[family].wealth,before);
  if(!living){for(let i=0;i<4;i++){if(++s.month>12){s.month=1;s.year++}advanceEstateTransfers(s)}assert.equal(transfer.status,'no_reply');assert.equal(s.world.characters[foreign].wealth,0);assert.equal(reclaimEstateTransfer(s,transfer.id).ok,true);assert.equal(s.world.dynasties.families[family].wealth,before+24)}
 }
});
test('a death known within the testator’s own court still prevents naming the deceased',()=>{
 const s=newGame('caesar'),own=createFictionalPerson(s,{name:['Testator','立遗嘱者'],faction:'caesar',birthYear:-80}),heir=createFictionalPerson(s,{name:['Own heir','本方继承人'],faction:'caesar',birthYear:-60});
 s.world.characters[heir].alive=false;assert.equal(makeWill(s,own,heir).reason,'eligibility');
});

test('unobserved foreign inheritance disputes do not announce private deaths to the player',()=>{
 let s=newGame('caesar');const parent=createFictionalPerson(s,{name:['Hidden death','秘密死者'],faction:'egypt',birthYear:-90,wealth:30}),heir=createFictionalPerson(s,{name:['Child','子女'],faction:'egypt',birthYear:-65,parents:[parent]}),beneficiary=createFictionalPerson(s,{name:['Other','他人'],faction:'egypt',birthYear:-70});assert.ok(makeWill(s,parent,beneficiary).ok);const before=structuredClone(s.log);s.world.characters[parent].alive=false;settleInheritance(s,parent);assert.equal(s.world.dynasties.inheritanceDisputes.at(-1).deceased,parent);assert.deepEqual(s.log,before);s=upgradeSave(structuredClone(s));assert.doesNotMatch(JSON.stringify(s.log),/秘密死者|Hidden death/);assert.ok(heir);
});

test('an inheritance record uses the recipient court’s reported name of the deceased',()=>{
 let {s,own,foreign}=foreignSpouses();s.world.characters[foreign].wealth=12;assert.ok(makeWill(s,foreign,own).ok);s.world.characters[foreign].alive=false;settleInheritance(s,foreign);assert.equal(s.world.characters[own].wealth,24);let delivered;
 for(let seed=1;seed<100&&!delivered;seed++){const candidate=upgradeSave(structuredClone(s)),transfer=candidate.world.dynasties.estateTransfers[0];transfer.courierSeed=seed;for(let i=0;i<4;i++){if(++candidate.month>12){candidate.month=1;candidate.year++}advanceEstateTransfers(candidate)}if(transfer.status==='delivered')delivered=candidate}
 assert.ok(delivered);const event=delivered.world.dynasties.lives[own].at(-1);assert.match(event.zh,/报告姓名/);assert.doesNotMatch(event.zh,/秘密姓名/);assert.equal(delivered.world.characters[own].wealth,36);
});


test('final archive retains recorded estate information without revealing a foreign identity or courier secrets',async()=>{
 const {s,own,foreign}=foreignSpouses();assert.ok(makeWill(s,own,foreign).ok);
 createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:-60,parents:[own]});
 s.world.characters[own].alive=false;settleInheritance(s,own);
 const dispute=s.world.dynasties.inheritanceDisputes.at(-1);assert.ok(dispute);
 const {resolveInheritanceDispute}=await import('../dynasties.js?v=fund-search-1');assert.ok(resolveInheritanceDispute(s,dispute.id,'will').ok);
 s.world.dynasties.inheritanceDisputes.push({...dispute,id:'old-case',beneficiaryName:undefined});
 s.victory=true;const {finalizeCampaign}=await import('../legacy.js?v=fund-search-1');const archive=finalizeCampaign(s).archive;
 assert.deepEqual(archive.inheritanceCases[0].beneficiaryName,['Reported','报告姓名']);assert.deepEqual(archive.inheritanceCases[1].beneficiaryName,['Unrecorded name','姓名未记录']);
 assert.equal(archive.estateTransfers[0].status,'pending');assert.equal(archive.estateTransfers[0].amount,24);assert.deepEqual(archive.estateTransfers[0].recipientName,['Reported','报告姓名']);
 assert.equal('courierSeed' in archive.estateTransfers[0],false);assert.doesNotMatch(JSON.stringify([archive.inheritanceCases,archive.estateTransfers]),/秘密姓名/);
});


test('a contested will shows the recorded names instead of later foreign reports, including old saves',async()=>{
 let {s,own,foreign}=foreignSpouses();assert.ok(makeWill(s,own,foreign).ok);
 const child=createFictionalPerson(s,{name:['Foreign child','外国子女'],faction:'egypt',birthYear:-60,parents:[own]});
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[child],source:'spy'});s.world.characters[own].alive=false;settleInheritance(s,own);
 const dispute=s.world.dynasties.inheritanceDisputes.at(-1);assert.ok(dispute);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign,child],source:'envoy',peopleNames:{[foreign]:['Later heir','后续受益人'],[child]:['Later child','后续子女']},observationYear:s.year,observationMonth:s.month});
 s=upgradeSave(structuredClone(s));const {renderGenealogy}=await import('../genealogy-ui.js?v=fund-search-1');let html=renderGenealogy(s,true);
 assert.match(html,/报告姓名/);assert.match(html,/外国子女/);assert.doesNotMatch(html,/后续受益人|后续子女|秘密姓名/);
 const oldSave=upgradeSave(structuredClone(s));const saved=oldSave.world.dynasties.inheritanceDisputes.at(-1);delete saved.beneficiaryName;delete saved.heirNames;html=renderGenealogy(oldSave,true);assert.match(html,/姓名未记录/);assert.doesNotMatch(html,/后续受益人|后续子女|秘密姓名/);
 const {resolveInheritanceDispute}=await import('../dynasties.js?v=fund-search-1');assert.ok(resolveInheritanceDispute(s,dispute.id,'heirs').ok);assert.deepEqual(s.world.dynasties.estateTransfers.at(-1).recipientName,['Foreign child','外国子女']);
 assert.ok(resolveInheritanceDispute(oldSave,saved.id,'heirs').ok);assert.deepEqual(oldSave.world.dynasties.estateTransfers.at(-1).recipientName,['Unrecorded name','姓名未记录']);
});
