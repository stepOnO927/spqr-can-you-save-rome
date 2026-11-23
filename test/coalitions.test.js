import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,diplomacy,isWar,upgradeSave,tick} from '../engine.js?v=archived-leads-1';
import {formCoalition,leaveCoalition,advanceCoalitions,coalitionInterest,coalitionMilitaryObjective,observeBalanceOfPower,perceivedBalance,answerCoalitionDefenseCall} from '../coalitions.js?v=archived-leads-1';
import {addReport} from '../character-system.js?v=archived-leads-1';
import {syncCoalitionDefenseLetters,receivedMail} from '../epistulae.js?v=archived-leads-1';
import {coalitionCouncilHtml} from '../coalition-council-ui.js?v=archived-leads-1';
import {inspectState} from '../inspector-diagnostics.js?v=archived-leads-1';

function setup(){const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;return s}
test('three states form a coalition from their own border intelligence, pay and coordinate defense',()=>{
 let s=setup();const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));
 const c=result.coalition;assert.equal(c.parties.length,3);assert.equal(s.factions.egypt.treasury,80);assert.equal(c.jointPlan.target,'senate');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const coalition=s.coalitions[0];s.month=3;const before=s.factions.caesar.treasury;advanceCoalitions(s);assert.ok(s.factions.caesar.treasury>before);assert.ok(coalition.contributions.egypt.paid>0);
 assert.ok(diplomacy(s,'senate','egypt','war'));assert.ok(!isWar(s,'senate','numidia'));assert.ok(isWar(s,'senate','caesar'));
 assert.equal(s.world.coalitionDefenseCalls[0].member,'numidia');
 s.month+=2;advanceCoalitions(s);assert.equal(s.world.coalitionDefenseCalls[0].status,'refused');assert.ok(!isWar(s,'senate','numidia'));
 assert.ok(leaveCoalition(s,coalition.id,'egypt').ok);assert.equal(coalition.status,'dissolved');assert.equal(s.diplomaticCredibility.egypt,85);assert.equal(s.relations['caesar:egypt'],25);
});
test('a dated defense request lets the player choose war or refusal without changing allied sovereignty',()=>{
 const make=()=>{const s=setup(),c=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength).coalition;assert.ok(c);s.wars=[];assert.ok(diplomacy(s,'senate','egypt','war'));const call=s.world.coalitionDefenseCalls.find(x=>x.member==='caesar');assert.ok(call);assert.ok(!isWar(s,'senate','caesar'));s.month+=2;advanceCoalitions(s);syncCoalitionDefenseLetters(s);assert.equal(call.status,'awaiting_player');assert.ok(receivedMail(s).some(m=>m.context?.kind==='coalition_defense_call'&&m.context.callId===call.id));return {s,c,call}};
 const refused=make(),before=refused.c.cohesion;
 assert.match(coalitionCouncilHtml(refused.s,'en',id=>id,x=>x,(_,year)=>String(year)),/JOIN DEFENSE/);
 assert.equal(answerCoalitionDefenseCall(refused.s,refused.call.id,'refuse').status,'refused');assert.ok(!isWar(refused.s,'senate','caesar'));assert.ok(refused.c.cohesion<before);
 const accepted=make(),egyptOwner=accepted.s.regions.find(r=>r.id==='egypt').owner,armyOwners=accepted.s.armies.map(a=>a.owner);
 const saved=upgradeSave(structuredClone(accepted.s));assert.equal(saved.world.coalitionDefenseCalls.find(x=>x.id===accepted.call.id).status,'awaiting_player');
 assert.equal(answerCoalitionDefenseCall(accepted.s,accepted.call.id,'accept').status,'accepted');assert.ok(isWar(accepted.s,'senate','caesar'));
 assert.equal(accepted.s.regions.find(r=>r.id==='egypt').owner,egyptOwner);assert.deepEqual(accepted.s.armies.map(a=>a.owner),armyOwners);
});
test('AI defense decisions depend on resources, relations and existing commitments',()=>{
 const make=(relation,treasury)=>{const s=setup();s.relations['egypt:numidia']=relation;s.factions.numidia.treasury=treasury;formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);diplomacy(s,'senate','egypt','war');s.month+=2;advanceCoalitions(s);return s};
 const willing=make(40,55);assert.equal(willing.world.coalitionDefenseCalls.find(x=>x.member==='numidia').status,'accepted');assert.ok(isWar(willing,'senate','numidia'));
 const poor=make(40,7);assert.equal(poor.world.coalitionDefenseCalls.find(x=>x.member==='numidia').status,'refused');assert.ok(!isWar(poor,'senate','numidia'));
});
test('defense requests are unique, expire without a player answer, and reject late acceptance',()=>{
 const s=setup();formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);s.wars=[];
 assert.ok(diplomacy(s,'senate','egypt','war'));
 const call=s.world.coalitionDefenseCalls.find(x=>x.member==='caesar');
 assert.equal(s.world.coalitionDefenseCalls.filter(x=>x.member==='caesar').length,1);
 s.month+=2;advanceCoalitions(s);assert.equal(call.status,'awaiting_player');
 s.month+=6;assert.equal(answerCoalitionDefenseCall(s,call.id,'accept').ok,false);
 advanceCoalitions(s);assert.equal(call.status,'refused');assert.ok(!isWar(s,'caesar','senate'));
 const bad=structuredClone(s);bad.world.coalitionDefenseCalls[0].arrivesAt=-1;
 assert.ok(inspectState(bad).some(x=>x.code==='invalid-coalition-defense-call'));
});
test('a defense request lapses when its coalition or original war ends',()=>{
 const s=setup(),c=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength).coalition;s.wars=[];
 assert.ok(diplomacy(s,'senate','egypt','war'));
 const call=s.world.coalitionDefenseCalls.find(x=>x.member==='caesar');
 c.status='dissolved';s.month+=2;advanceCoalitions(s);
 assert.equal(call.status,'lapsed');assert.equal(answerCoalitionDefenseCall(s,call.id,'accept').ok,false);
});
test('coalitions require distinct willing states and never enroll the player without a decision',()=>{
 const s=setup();assert.equal(formCoalition(s,'egypt',['numidia','caesar'],'senate',estimatedStrength).reason,'player_decision');
 assert.equal(formCoalition(s,'caesar',['egypt','egypt'],'senate',estimatedStrength).reason,'members');
 s.relations['caesar:egypt']=-30;assert.equal(formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength).reason,'relations');
});
test('a member with limited cash can contribute actual supplies instead of created resources',()=>{
 const s=setup();s.factions.numidia.treasury=45;const c=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength).coalition;assert.equal(c.contributions.numidia.policy,'supplies');
 const donor=s.factions.numidia.food,leader=s.factions.caesar.food;s.month=3;advanceCoalitions(s);assert.equal(s.factions.numidia.food,donor-2);assert.equal(s.factions.caesar.food,leader+2);assert.equal(c.contributions.numidia.supplies,2);
});
test('coalition threat evaluation is unaffected by unseen enemy troops',()=>{
 const s=setup(),before=coalitionInterest(s,'egypt','senate',estimatedStrength);
 for(const a of s.armies.filter(a=>a.owner==='senate'))a.men=900000;
 assert.deepEqual(coalitionInterest(s,'egypt','senate',estimatedStrength),before);
});
test('AI states exchange invitations and independently form or decline a coalition',()=>{
 const outcomes=[];
 for(let seed=1;seed<=20;seed++){const s=newGame('caesar');s.difficulty='expert';s.month=4;s.seed=seed;
  s.relations['egypt:numidia']=40;s.relations['egypt:galatia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;s.relations['galatia:senate']=-30;
  s.world.diplomaticKnowledge.egypt={numidia:{id:'numidia',kind:'agreement',status:'active',parties:['egypt','numidia'],year:s.year,month:s.month},galatia:{id:'galatia',kind:'agreement',status:'active',parties:['egypt','galatia'],year:s.year,month:s.month}};
  tick(s);const invitation=s.world.coalitionInvitations.find(x=>x.leader==='egypt');assert.ok(invitation);assert.equal(invitation.status,'pending');assert.ok(!s.coalitions?.length);
  for(let i=0;i<4;i++)tick(s);outcomes.push(invitation.status);if(invitation.status==='accepted')assert.ok(s.coalitions.some(x=>x.target==='senate'&&!x.parties.includes(s.player)));
 }
 assert.ok(outcomes.includes('accepted'));assert.ok(outcomes.some(x=>x!=='accepted'));
});
test('member trust follows relationships and military contributors prioritize the shared enemy only in war',()=>{
 const s=setup(),c=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength).coalition;
 assert.equal(c.trust['caesar:egypt'],70);c.contributions.egypt.policy='military';assert.equal(coalitionMilitaryObjective(s,'egypt'),null);
 assert.ok(diplomacy(s,'senate','egypt','war'));assert.equal(coalitionMilitaryObjective(s,'egypt'),'senate');
 c.contributions.egypt.policy='funding';assert.equal(coalitionMilitaryObjective(s,'egypt'),null);
 s.relations['caesar:egypt']=-40;advanceCoalitions(s);assert.equal(c.trust['caesar:egypt'],30);
});
test('balance assessment uses dated observations and reports, not hidden foreign economic or military truth',()=>{
 const s=newGame('caesar');observeBalanceOfPower(s);s.month=7;for(const id of ['gaul','narbo'])s.controlKnowledge.egypt[id]={owner:'senate',year:s.year,month:s.month};observeBalanceOfPower(s);
 addReport(s,'egypt','senate',{kind:'stability',value:'stable',source:'spy'});
 s.world.diplomaticKnowledge.egypt={reported:{id:'reported',kind:'agreement',type:'trade',status:'active',parties:['senate','parthia'],year:s.year,month:s.month}};
 const before=perceivedBalance(s,'egypt','senate',estimatedStrength);assert.equal(before.reportedGrowth,2);assert.equal(before.trade,1);assert.equal(before.stability,'stable');
 s.factions.senate.treasury=999999;s.factions.senate.stability=0;s.alliances.push(['senate','armenia']);for(const unit of s.armies.filter(a=>a.owner==='senate'))unit.men=999999;
 assert.deepEqual(perceivedBalance(s,'egypt','senate',estimatedStrength),before);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.world.balanceOfPower.egypt.senate.reportedGrowth,2);
});
