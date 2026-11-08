import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,diplomacy,isWar,upgradeSave,tick} from '../engine.js?v=grand-chessboard-1';
import {formCoalition,leaveCoalition,advanceCoalitions,coalitionInterest,coalitionMilitaryObjective,observeBalanceOfPower,perceivedBalance} from '../coalitions.js?v=grand-chessboard-1';
import {addReport} from '../character-system.js?v=grand-chessboard-1';

function setup(){const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;return s}
test('three states form a coalition from their own border intelligence, pay and coordinate defense',()=>{
 let s=setup();const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));
 const c=result.coalition;assert.equal(c.parties.length,3);assert.equal(s.factions.egypt.treasury,80);assert.equal(c.jointPlan.target,'senate');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const coalition=s.coalitions[0];s.month=3;const before=s.factions.caesar.treasury;advanceCoalitions(s);assert.ok(s.factions.caesar.treasury>before);assert.ok(coalition.contributions.egypt.paid>0);
 assert.ok(diplomacy(s,'senate','egypt','war'));assert.ok(isWar(s,'senate','numidia'));assert.ok(isWar(s,'senate','caesar'));
 assert.ok(leaveCoalition(s,coalition.id,'egypt').ok);assert.equal(coalition.status,'dissolved');assert.equal(s.diplomaticCredibility.egypt,85);assert.equal(s.relations['caesar:egypt'],25);
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
test('three AI states can independently form a coalition against a perceived common threat',()=>{
 const s=newGame('caesar');s.difficulty='expert';s.month=4;
 s.relations['egypt:numidia']=40;s.relations['egypt:galatia']=40;
 s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;s.relations['galatia:senate']=-30;
 tick(s);const c=s.coalitions?.find(x=>x.target==='senate'&&x.parties.includes('egypt')&&x.parties.includes('numidia')&&x.parties.includes('galatia'));
 assert.ok(c);assert.ok(!c.parties.includes(s.player));
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
