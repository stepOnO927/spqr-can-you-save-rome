import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,army,region,resolveBattle,moveArmy,diplomacy,isWar,tick,recruit,previewMarch,upgradeSave,aiTurn,nationalBudget} from '../engine.js';
import {recordMovement,eventText,recordEvent} from '../campaign-reports.js';
import {chronicleHtml,battleReportHtml,eventDate} from '../reports-ui.js';
import {requestReinforcements,probePositions,latestRecon,advanceRecon} from '../reconnaissance.js';

test('opposing marches meet without swapping theaters or taking a fort bonus',()=>{
 const s=newGame('senate'),caesar=army(s,'xiii'),levies=army(s,'italy');
 assert.equal(moveArmy(s,caesar.id,'italiaN').ok,true);
 assert.equal(moveArmy(s,levies.id,'cisalpine').ok,true);
 tick(s);
 const battle=s.battles?.[0];assert.ok(battle?.meeting);assert.equal(battle.fort,0);
 assert.ok(battle.lossA>0&&battle.lossD>0);
 assert.equal(caesar.region,'cisalpine');assert.equal(levies.region,'italiaN');
 assert.equal(region(s,'cisalpine').owner,'caesar');assert.equal(region(s,'italiaN').owner,'senate');
 assert.equal(latestRecon(s,'caesar','italiaN').source,'battle');
 assert.equal(latestRecon(s,'senate','cisalpine').source,'battle');
 assert.match(battleReportHtml(s,battle,'en'),/opposing marches/);
 assert.match(battleReportHtml(s,battle,'zh'),/反向行军/);
 assert.match(battleReportHtml(s,battle,'en'),/Meeting engagement/);
 assert.match(battleReportHtml(s,battle,'zh'),/行军遭遇战/);
 assert.ok(s.log.some(entry=>/Senate .*opposing marches/.test(entry.en)));
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).battles[0].meeting,true);
});

test('AI uses fresh opening-battle intelligence before repeating an attack',()=>{
 const s=newGame('egypt');
 assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
 assert.equal(moveArmy(s,'italy','cisalpine').ok,true);
 tick(s);
 assert.ok(s.battles[0]?.meeting);
 assert.equal(army(s,'italy').move,null);
 assert.equal(latestRecon(s,'senate','cisalpine').source,'battle');
});
test('outnumbered AI preserves famine and levy reserves before optional probes',()=>{
 const lean=newGrandGame('egypt');lean.year=-48;lean.month=3;lean.factions.caesar.treasury=4;lean.factions.caesar.food=10;
 aiTurn(lean,'caesar');
 assert.equal(lean.factions.caesar.food,10);
 assert.ok(!lean.armies.some(unit=>unit.owner==='caesar'&&unit.reconPending?.kind==='probe'));
 const stocked=newGrandGame('egypt');stocked.year=-48;stocked.month=3;stocked.factions.caesar.treasury=4;stocked.factions.caesar.food=50;
 aiTurn(stocked,'caesar');
 assert.ok(stocked.armies.some(unit=>unit.owner==='caesar'&&unit.reconPending?.kind==='probe'));
 assert.ok(stocked.factions.caesar.food<50);
});

test('an AI command with no field army raises an emergency force when resources allow',()=>{
 const s=newGame('egypt');s.armies=s.armies.filter(unit=>unit.owner!=='caesar');
 s.factions.caesar.treasury=50;s.factions.caesar.food=20;s.factions.caesar.manpower=4000;
 tick(s);
 const replacement=s.armies.filter(unit=>unit.owner==='caesar');
 assert.equal(replacement.length,1);assert.equal(replacement[0].men,3000);
 assert.equal(s.factions.caesar.manpower<4000,true);
});

test('an AI army consolidates a captured theater before advancing again',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'xiii'),defender=army(s,'italy');
 unit.men=10000;defender.men=1000;
 resolveBattle(s,unit,defender,region(s,'italiaN'));
 assert.equal(region(s,'italiaN').owner,'caesar');
 aiTurn(s,'caesar');
 assert.equal(unit.region,'italiaN');assert.equal(unit.move,null);assert.equal(unit.stance,'hold');
});

test('AI consolidates a captured city after a siege even when the player is elsewhere',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'xiii');
 s.armies=s.armies.filter(a=>a.id!=='pompey');
 unit.region='roma';unit.move=null;unit.siege={region:'roma',remaining:1};
 tick(s);
 assert.equal(region(s,'roma').owner,'caesar');
 assert.equal(unit.move,null);
 assert.equal(unit.stance,'hold');
 assert.deepEqual(unit.lastSiegeCapture,{regionId:'roma',year:s.year,month:s.month});
 assert.equal(s.campaignEvents.some(e=>e.type==='siege'&&e.regionId==='roma'),false,'foreign AI sieges must stay out of the player chronicle');
 assert.deepEqual(upgradeSave(JSON.parse(JSON.stringify(s))).armies.find(a=>a.id==='xiii').lastSiegeCapture,unit.lastSiegeCapture);
});

test('outnumbered AI pays for a city garrison and keeps it in the captured theater',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'xiii'),f=s.factions.caesar;
 s.armies=s.armies.filter(a=>a.id!=='pompey');
 unit.region='roma';unit.move=null;unit.siege={region:'roma',remaining:1};f.treasury=50;
 const cash=f.treasury,food=f.food,manpower=f.manpower,budget=nationalBudget(s,'caesar');
 tick(s);
 const garrison=s.armies.find(a=>a.owner==='caesar'&&a.aiGarrisonRegion==='roma');
 assert.ok(garrison);assert.equal(garrison.men,3000);assert.equal(garrison.move,null);
 assert.equal(f.treasury,cash+budget.projectedNet-24);
 assert.equal(f.food,food+budget.foodNet-6);
 assert.equal(f.manpower,manpower+budget.manpowerNet-3000);
 for(let i=0;i<3;i++)tick(s);
 assert.equal(garrison.region,'roma');assert.equal(garrison.move,null);
 assert.equal(s.armies.filter(a=>a.owner==='caesar'&&a.aiGarrisonRegion==='roma').length,1);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).armies.find(a=>a.id===garrison.id).aiGarrisonRegion,'roma');
});

test('cash-poor AI sends a nearby relief column to Rome without conjuring a levy',()=>{
 const s=newGrandGame('egypt'),main=army(s,'xiii'),relief=army(s,'viii');
 region(s,'roma').owner='caesar';region(s,'t014').owner='caesar';
 main.region='roma';main.move=null;relief.region='t014';relief.move=null;
 s.factions.caesar.treasury=0;
 aiTurn(s,'caesar');
 assert.equal(relief.move?.to,'roma');
 assert.equal(relief.aiGarrisonRegion,'roma');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(army(restored,'viii').aiGarrisonRegion,'roma');
});

test('a depleted AI army withdraws toward a safer friendly theater',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'viii');
 unit.region='t048';unit.men=800;region(s,'narbo').owner='senate';
 aiTurn(s,'caesar');
 assert.equal(unit.move?.to,'t041');
 assert.equal(region(s,unit.move.to).owner,'caesar');
});

test('a defeated besieger cannot take a theater remotely',()=>{
 const s=newGame('caesar'),besieger=army(s,'xiii'),defender=army(s,'pompey'),rome=region(s,'roma');
 besieger.region='roma';besieger.siege={region:'roma',remaining:1};besieger.men=1000;defender.region='roma';defender.men=20000;
 resolveBattle(s,defender,besieger,rome);
 assert.equal(besieger.siege,null);tick(s);assert.equal(rome.owner,'senate');
});
test('a token force cannot occupy an undefended enemy theater',()=>{
 const s=newGame('caesar'),unit=army(s,'xiii');unit.men=1;s.armies=s.armies.filter(a=>a.id!=='italy');
 assert.equal(moveArmy(s,'xiii','italiaN').ok,true);tick(s);
 assert.equal(region(s,'italiaN').owner,'senate');assert.equal(unit.region,'cisalpine');
});
test('peace withdraws besieging units from the former enemy theater',()=>{
 const s=newGame('egypt'),unit=army(s,'egyptguard');
 assert.equal(diplomacy(s,'egypt','senate','war'),true);
 unit.region='roma';unit.siege={region:'roma',remaining:1};s.factions.senate.stability=20;
 assert.equal(diplomacy(s,'egypt','senate','peace'),true);
 assert.equal(region(s,unit.region).owner,'egypt');assert.equal(unit.siege,null);
 assert.equal(isWar(s,'egypt','senate'),false);
});
test('a formal military victory ends the civil war for an observing command',()=>{
 const s=newGrandGame('egypt');
 for(const theater of s.regions)if(theater.owner==='senate')theater.owner='caesar';
 s.armies=s.armies.filter(unit=>unit.owner!=='senate');
 s.factions.senate.treasury=0;s.factions.senate.manpower=0;
 tick(s);
 assert.equal(s.civilWarOutcome?.kind,'military');
 assert.equal(s.civilWarOutcome?.winner,'caesar');
 assert.equal(isWar(s,'caesar','senate'),false);
 assert.equal(upgradeSave(structuredClone(s)).wars.some(w=>w.includes('caesar')&&w.includes('senate')),false);
});
test('older military-victory saves close their stale civil-war flag on load',()=>{
 const s=newGrandGame('egypt');
 s.civilWarOutcome={kind:'military',winner:'senate',loser:'caesar',year:s.year,month:s.month};
 assert.equal(isWar(s,'caesar','senate'),true);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(restored.civilWarOutcome.winner,'senate');
 assert.equal(isWar(restored,'caesar','senate'),false);
});
test('alliance war reaching player is recorded and notified',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','numidia']);const before=s.notifications.length;
 assert.equal(diplomacy(s,'parthia','numidia','war'),true);
 assert.ok(s.notifications.length>before);assert.ok(s.campaignEvents.some(e=>e.type==='diplomacy'&&e.affectedFactionIds?.includes('caesar')&&e.affectedFactionIds?.includes('parthia')));
});
test('Senate victory and calendar crossing have valid outcomes',()=>{
 const s=newGame('senate');for(const r of s.regions)if(r.owner==='caesar')r.owner='senate';s.armies=s.armies.filter(a=>a.owner!=='caesar');tick(s);assert.equal(s.victory,true);
 s.year=-1;s.month=12;tick(s);assert.equal(s.year,1);assert.match(eventDate({year:s.year,month:s.month},'en'),/CE/);
});
test('objectives and monthly briefing include recruitment before the tick',()=>{
 const s=newGame('caesar');s.armies=s.armies.filter(a=>a.owner!=='caesar');s.objectiveProgress.field.status='lost';
 const before=s.factions.caesar.treasury;assert.equal(recruit(s,'cisalpine'),true);assert.equal(s.objectiveProgress.field.status,'completed');
 tick(s);assert.equal(s.briefings[0].delta.treasury,s.factions.caesar.treasury-before);assert.ok(s.briefings[0].eventIds.some(id=>s.campaignEvents.find(e=>e.id===id)?.type==='recruitment'));
});
test('chronicle includes intelligence target and snapshots historical army and battle labels',()=>{
 const s=newGame('caesar'),unit=army(s,'xiii');recordEvent(s,{type:'intelligence',category:'intelligence',factionId:'caesar',targetFactionId:'egypt'});
 assert.match(chronicleHtml(s,'en',{faction:'egypt'}),/Egypt/);
 unit.region='italiaN';const movement=recordMovement(s,unit,'cisalpine');const name=unit.name[0];s.armies=s.armies.filter(a=>a.id!=='xiii');assert.match(eventText(s,movement,'en').title,new RegExp(name));
 const t=newGame('caesar'),a=army(t,'xiii'),d=army(t,'italy');resolveBattle(t,a,d,region(t,'italiaN'));const battle=t.battles[0];delete battle.ownerAfter;region(t,'italiaN').owner='egypt';
 assert.match(battleReportHtml(t,battle,'en'),/Controller after battle: —/);
});
test('reinforcements join the selected army after a month and a detected probe changes AI posture',()=>{
 const s=newGame('senate'),unit=army(s,'italy'),men=unit.men;
 assert.equal(requestReinforcements(s,unit.id).ok,true);assert.equal(unit.men,men);assert.equal(moveArmy(s,unit.id,'cisalpine').ok,false);tick(s);assert.equal(unit.men,men+3000);
 const p=newGame('senate');let result;for(let seed=1;seed<100;seed++){p.seed=seed;result=probePositions(p,'italy','cisalpine');if(result.enemyDetected)break;p.armies.find(a=>a.id==='italy').reconPending=null}
 assert.equal(result.enemyDetected,true);assert.ok(result.report);const before=p.armies.filter(a=>a.owner==='caesar'&&a.region==='cisalpine').length;tick(p);
 assert.ok(p.armies.filter(a=>a.owner==='caesar'&&a.region==='cisalpine').length>before);
});

test('grand-campaign AI reinforces an existing border army before marching or raising another levy',()=>{
 const s=newGrandGame('caesar'),levies=army(s,'italy'),f=s.factions.senate;
 s.month=4;f.treasury=200;f.food=100;f.manpower=10000;
 s.militaryAlerts=[{owner:'senate',regionId:'italiaN',year:s.year,month:s.month}];
 const count=s.armies.length,men=levies.men,loyalty=region(s,'italiaN').loyalty;
 aiTurn(s,'senate');
 assert.equal(s.armies.length,count);
 assert.deepEqual(levies.reconPending,{kind:'reinforce',remaining:1,regionId:'italiaN'});
 assert.equal(levies.move,null);
 assert.equal(f.manpower,7000);
 assert.equal(f.food,94);
 assert.equal(region(s,'italiaN').loyalty,loyalty-3);
 advanceRecon(s);
 assert.equal(levies.men,men+3000);
 assert.equal(levies.reconPending?.kind,undefined);
});

test('AI does not stack another levy on an already assembled border force',()=>{
 const s=newGrandGame('caesar'),levies=army(s,'italy'),f=s.factions.senate;
 s.month=4;levies.men=8200;f.treasury=200;f.food=100;f.manpower=10000;
 s.militaryAlerts=[{owner:'senate',regionId:'italiaN',year:s.year,month:s.month}];
 const count=s.armies.length;
 aiTurn(s,'senate');
 assert.equal(s.armies.length,count);
 assert.equal(levies.reconPending?.kind,undefined);
 assert.equal(f.manpower,10000);
});
