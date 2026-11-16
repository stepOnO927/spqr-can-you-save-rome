import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,diplomacy,estimatedStrength,isWar} from '../engine.js?v=world-kings-expedition-1';
import {formCoalition,coalitionPeaceExemption} from '../coalitions.js?v=world-kings-expedition-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-expedition-1';
import {coalitionCouncilHtml} from '../coalition-council-ui.js?v=world-kings-expedition-1';

function atWarTogether(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));
 assert.equal(diplomacy(s,'senate','egypt','war'),true);
 assert.equal(isWar(s,'numidia','senate'),true);
 return {s,c:result.coalition};
}

test('a bilateral peace preserves allied wars and records a temporary coalition exemption',()=>{
 const {s,c}=atWarTogether(),owners=s.regions.map(r=>r.owner),egyptCash=s.factions.egypt.treasury;
 assert.equal(diplomacy(s,'egypt','senate','peace',{acceptedByPlayer:true}),true);
 assert.equal(isWar(s,'egypt','senate'),false);assert.equal(isWar(s,'caesar','senate'),true);assert.equal(isWar(s,'numidia','senate'),true);
 assert.deepEqual(s.regions.map(r=>r.owner),owners);assert.equal(s.factions.egypt.treasury,egyptCash);
 assert.equal(c.cohesion,58);assert.equal(c.separatePeaces.length,1);assert.deepEqual(c.separatePeaces[0].remainingBelligerents,['caesar','numidia']);
 assert.equal(coalitionPeaceExemption(s,c,'egypt','senate'),true);
 assert.equal(c.charter.separatePeace,'permitted_with_notice');
 assert.equal(diplomacy(s,'caesar','senate','peace',{acceptedByPlayer:true}),true);
 assert.match(coalitionCouncilHtml(s,'en',id=>id,x=>x,(month,year)=>`${month}/${year}`),/Your separate peace exempts coalition call to arms until/);
});

test('a new attack cannot automatically re-enlist a peacemaker during the charter interval',()=>{
 let {s,c}=atWarTogether();
 assert.equal(diplomacy(s,'egypt','senate','peace',{acceptedByPlayer:true}),true);
 assert.equal(diplomacy(s,'numidia','senate','peace',{acceptedByPlayer:true}),true);
 s=upgradeSave(structuredClone(s));c=s.coalitions[0];
 assert.equal(diplomacy(s,'senate','numidia','war'),true);
 assert.equal(isWar(s,'numidia','senate'),true);assert.equal(isWar(s,'egypt','senate'),false);
 assert.equal(coalitionPeaceExemption(s,c,'egypt','senate'),true);
 assert.equal(diplomacy(s,'numidia','senate','peace',{acceptedByPlayer:true}),true);
 s.year++;assert.equal(coalitionPeaceExemption(s,c,'egypt','senate'),false);
 assert.equal(diplomacy(s,'senate','numidia','war'),true);
 assert.equal(isWar(s,'egypt','senate'),true);
});

test('old saves gain charter rule, council explains it, and malformed records are reported',()=>{
 let {s,c}=atWarTogether();delete c.charter.separatePeace;delete c.separatePeaces;
 s=upgradeSave(structuredClone(s));c=s.coalitions[0];
 assert.equal(c.charter.separatePeace,'permitted_with_notice');assert.deepEqual(c.separatePeaces,[]);
 assert.match(coalitionCouncilHtml(s,'en',id=>id,x=>x,(month,year)=>`${month}/${year}`),/Separate peace is allowed/);
 c.separatePeaces.push({member:'phantom',target:'senate',year:s.year,month:s.month,until:s.year*12+s.month+12,remainingBelligerents:['caesar']});
 assert.ok(inspectState(s).some(x=>x.code==='invalid-coalition-separate-peace'));
});
