import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,estimatedStrength} from '../engine.js?v=world-kings-observed-1';
import {formCoalition} from '../coalitions.js?v=world-kings-observed-1';
import {proposeCoalitionMotion,voteCoalitionMotion,advanceCoalitionMotions,proposeCoalitionMotionsAI} from '../coalition-motions.js?v=world-kings-observed-1';
import {syncCoalitionMotionLetters,receivedMail,replyToLetter} from '../epistulae.js?v=world-kings-observed-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-observed-1';
import {advanceCoalitionAdmissions} from '../coalition-admissions.js?v=world-kings-observed-1';

function council(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));return {s,c:result.coalition};
}
const month=s=>{s.month++;if(s.month>12){s.month=1;s.year++}};

test('member leadership challenge requires majority, preserves sovereignty and persists in old saves',()=>{
 let {s,c}=council(),owners=s.regions.map(r=>r.owner);s.relations['egypt:numidia']=60;s.relations['caesar:numidia']=-20;
 const cash=s.factions.numidia.treasury,proposal=proposeCoalitionMotion(s,c.id,'numidia','leadership','numidia');assert.ok(proposal.ok);assert.equal(s.factions.numidia.treasury,cash-2);
 s=upgradeSave(structuredClone(s));c=s.coalitions[0];month(s);advanceCoalitionMotions(s);assert.equal(c.leader,'caesar');
 for(let i=0;i<3;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(s.world.coalitionMotions[0].status,'passed');assert.equal(c.leader,'numidia');assert.deepEqual(s.regions.map(r=>r.owner),owners);assert.equal(c.motions[0].yes,2);
});

test('human receives a ballot, casts explicit vote and silence counts as abstention',()=>{
 const {s,c}=council();s.relations['caesar:numidia']=-50;s.relations['egypt:numidia']=80;
 const proposal=proposeCoalitionMotion(s,c.id,'numidia','leadership','numidia');assert.ok(proposal.ok);month(s);advanceCoalitionMotions(s);syncCoalitionMotionLetters(s);
 const letter=receivedMail(s).find(m=>m.context?.kind==='coalition_motion');assert.ok(letter);assert.deepEqual(letter.options,['yes','no','abstain']);assert.equal(proposal.motion.votes.caesar,undefined);
 assert.equal(replyToLetter(s,letter.id,'no',{}).ok,true);assert.equal(proposal.motion.votes.caesar,'no');
 for(let i=0;i<3;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(proposal.motion.status,'passed');syncCoalitionMotionLetters(s);assert.ok(receivedMail(s).some(m=>m.context?.kind==='coalition_motion_result'));
 const next=c.motions[0];assert.equal(next.eligible,3);assert.equal(next.yes,2);
});

test('expulsion is barred below four members and removes only membership after a vote',()=>{
 const {s,c}=council();assert.equal(proposeCoalitionMotion(s,c.id,'caesar','expulsion','numidia').reason,'target');
 c.parties.push('armenia');c.contributions.armenia={policy:'diplomacy',paid:0,supplies:0};
 s.relations['caesar:numidia']=-60;s.relations['egypt:numidia']=-60;s.relations['armenia:numidia']=-60;
 const owners=s.regions.map(r=>r.owner),p=proposeCoalitionMotion(s,c.id,'caesar','expulsion','numidia');assert.ok(p.ok);for(let i=0;i<4;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(p.motion.status,'passed');assert.equal(c.parties.includes('numidia'),false);assert.equal(c.departures.at(-1).reason,'expelled');assert.deepEqual(s.regions.map(r=>r.owner),owners);
});

test('AI initiates a leadership challenge from its own low trust, while player is not auto-sponsored',()=>{
 const {s,c}=council();s.month=12;c.cohesion=40;s.relations['caesar:egypt']=-40;
 proposeCoalitionMotionsAI(s);assert.equal(s.world.coalitionMotions.length,1);assert.equal(s.world.coalitionMotions[0].sponsor,'egypt');
 const second=proposeCoalitionMotion(s,c.id,'numidia','leadership','numidia');assert.equal(second.reason,'pending');
});

test('Inspector reports an invalid council ballot without changing the save',()=>{
 const {s,c}=council(),p=proposeCoalitionMotion(s,c.id,'egypt','leadership','egypt');assert.ok(p.ok);
 p.motion.electorate.push('phantom');const before=structuredClone(s.world.coalitionMotions);
 assert.ok(inspectState(s).some(x=>x.code==='invalid-coalition-motion'&&x.path==='world.coalitionMotions[0]'));
 assert.deepEqual(s.world.coalitionMotions,before);
});

function contact(s,actor,target){
 s.world.diplomaticKnowledge[actor]||={};s.world.diplomaticKnowledge[actor][target]={id:`contact:${actor}:${target}`,kind:'agreement',status:'active',parties:[actor,target],year:s.year,month:s.month};
}

test('member nomination spends an escrowed courier fee and sends only after majority approval',()=>{
 let {s,c}=council();contact(s,'egypt','armenia');s.relations['armenia:egypt']=40;s.relations['armenia:caesar']=40;s.relations['armenia:numidia']=30;s.wars.push(['armenia','senate']);
 const owners=s.regions.map(r=>r.owner),cash=s.factions.egypt.treasury;
 const proposed=proposeCoalitionMotion(s,c.id,'egypt','admission','armenia');assert.ok(proposed.ok,JSON.stringify(proposed));assert.equal(s.factions.egypt.treasury,cash-5);assert.equal(s.world.coalitionAdmissions.length,0);
 s=upgradeSave(structuredClone(s));c=s.coalitions[0];for(let i=0;i<4;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(s.world.coalitionMotions[0].status,'passed');assert.equal(s.world.coalitionAdmissions.length,1);assert.equal(s.world.coalitionAdmissions[0].introducedBy,'egypt');assert.equal(s.factions.egypt.treasury,cash-5);assert.equal(c.parties.length,3);
 for(let i=0;i<4;i++)advanceCoalitionAdmissions(s,estimatedStrength,()=>.5);
 assert.equal(c.parties.includes('armenia'),true);assert.equal(c.admissions.at(-1).introducedBy,'egypt');assert.deepEqual(s.regions.map(r=>r.owner),owners);
});

test('rejected nomination refunds unused courier fee but not proposal cost',()=>{
 const {s,c}=council();contact(s,'egypt','armenia');s.relations['armenia:egypt']=40;
 const cash=s.factions.egypt.treasury,p=proposeCoalitionMotion(s,c.id,'egypt','admission','armenia');assert.ok(p.ok);
 for(let i=0;i<4;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(p.motion.status,'rejected');assert.equal(s.factions.egypt.treasury,cash-2);assert.equal(s.world.coalitionAdmissions.length,0);
});

test('members can renegotiate contribution policy by vote without changing the defensive obligation',()=>{
 const {s,c}=council(),p=proposeCoalitionMotion(s,c.id,'caesar','contribution','caesar',{policy:'diplomacy'});assert.ok(p.ok,JSON.stringify(p));
 assert.equal(c.contributions.caesar.policy,'military');for(let i=0;i<4;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(p.motion.status,'passed');assert.equal(c.contributions.caesar.policy,'diplomacy');assert.deepEqual(c.obligations,['defend_members']);
});

test('two-thirds council vote can dissolve a coalition without annexing members',()=>{
 const {s,c}=council(),owners=s.regions.map(r=>r.owner);c.cohesion=25;
 const p=proposeCoalitionMotion(s,c.id,'caesar','dissolution','caesar');assert.ok(p.ok);
 for(let i=0;i<4;i++){month(s);advanceCoalitionMotions(s)}
 assert.equal(p.motion.status,'passed');assert.equal(c.status,'dissolved');assert.equal(c.dissolution.reason,'council_vote');assert.deepEqual(s.regions.map(r=>r.owner),owners);
});

test('AI member nominates a known candidate without enrolling it or spending the player budget',()=>{
 const {s,c}=council();s.month=12;contact(s,'egypt','armenia');s.relations['armenia:egypt']=40;
 const playerCash=s.factions.caesar.treasury;proposeCoalitionMotionsAI(s);
 const motion=s.world.coalitionMotions[0];assert.ok(motion);assert.equal(motion.kind,'admission');assert.equal(motion.sponsor,'egypt');assert.equal(c.parties.includes('armenia'),false);assert.equal(s.factions.caesar.treasury,playerCash);
});
