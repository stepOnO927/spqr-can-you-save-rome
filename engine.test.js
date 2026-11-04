import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,moveArmy,previewMarch,recruit,setTax,diplomacy,resolveBattle,region,army,adjacent,isWar,isAllied,relation,PLAYABLE,sendInquiry} from './engine.js';
import historical from './historical-territories.js';
import {REGIONS} from './data.js';
import {identity,factionMark} from './identity.js';

test('49 BCE opens with opposing Roman commands and independent Egypt',()=>{
  const s=newGame();
  assert.equal(s.year,-49);assert.equal(s.month,1);
  assert.equal(region(s,'cisalpine').owner,'caesar');assert.equal(region(s,'roma').owner,'senate');assert.equal(region(s,'egypt').owner,'egypt');
  assert.equal(army(s,'xiii').commander[0],'Julius Caesar');
  assert.equal(army(s,'pompey').region,'roma');
  assert.ok(isWar(s,'caesar','senate'));
});

test('major powers retain distinct, usable visual identities',()=>{
  const ids=['caesar','senate','egypt','parthia','armenia'];
  assert.equal(new Set(ids.map(id=>identity(id).map)).size,ids.length);
  assert.equal(new Set(ids.map(id=>identity(id).motif)).size,ids.length);
  for(const id of ids)for(const type of ['insignia','banner','standard']){
    assert.match(factionMark(id,type),/^<svg /);
    assert.ok(factionMark(id,type).includes(identity(id).primary));
  }
  assert.notEqual(identity('shared').primary,identity('caesar').primary);
});

test('historical polygons map known theaters and leave unmapped Illyricum explicit',()=>{
  const groups=historical.features.flatMap(f=>f.properties.regions);
  for(const r of REGIONS)assert.equal(groups.filter(x=>x===r.id).length,['illyricum','galatia','bosporus'].includes(r.id)?0:1,`${r.id} mapping must reflect available source coverage`);
  for(const id of ['egypt','numidia','mauretania','armenia','parthia']){const f=historical.features.find(x=>x.properties.id===id);assert.ok(f.properties.period[0]<=-49&&f.properties.period[1]>=-49);assert.ok(f.geometry.coordinates.length)}
  assert.ok(adjacent('italiaS').find(e=>e.to==='illyricum').sea);
});

test('movement uses connected routes, time, and sea transport cost',()=>{
  const s=newGame();
  assert.equal(moveArmy(s,'xiii','egypt').ok,false);
  assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
  assert.equal(army(s,'xiii').region,'cisalpine');
  tick(s);
  assert.equal(army(s,'xiii')?.region,'italiaN');
  const italy=s.armies.find(a=>a.id==='xiii');
  assert.ok(italy.men<7200);
  assert.ok(s.log.some(e=>e.en.includes('Casualties')));
  assert.ok(adjacent('italiaS').some(e=>e.to==='sicilia'&&e.sea));
});

test('march previews preserve state and match the eventual order',()=>{
  const s=newGame(), before=JSON.stringify(s);
  assert.equal(previewMarch(s,'xiii','egypt').ok,false);
  const plan=previewMarch(s,'xiii','italiaN');
  assert.equal(plan.ok,true);assert.equal(plan.hostile,true);
  assert.equal(JSON.stringify(s),before);
  assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
  assert.equal(army(s,'xiii').move.remaining,plan.months);
});

test('battle reports preserve pre-battle evidence and calculated losses',()=>{
  const s=newGame();moveArmy(s,'xiii','italiaN');tick(s);
  const report=s.battles[0];
  assert.equal(report.region,'italiaN');assert.equal(report.attacker.men,7200);
  assert.equal(report.defender.men,5200);assert.equal(report.attacker.commander[0],'Julius Caesar');
  assert.equal(army(s,'xiii').men,report.attacker.men-report.lossA);
  assert.ok(report.attacker.power>0&&report.defender.power>0);
  assert.deepEqual(JSON.parse(JSON.stringify(s)).battles,s.battles);
});

test('recruitment spends actual resources and creates an army',()=>{
  const s=newGame(),initial=s.armies.length;
  assert.equal(recruit(s,'cisalpine'),true);
  assert.equal(s.armies.length,initial+1);
  assert.equal(s.factions.caesar.treasury,66);
  assert.equal(s.factions.caesar.manpower,19000);
  assert.equal(recruit(s,'roma'),false);
});

test('battles inflict casualties and the victor controls the theater',()=>{
  const s=newGame(),a=army(s,'xiii'),d=army(s,'italy'),target=region(s,'italiaN');
  a.men=15000;d.men=1000;
  assert.equal(resolveBattle(s,a,d,target),true);
  assert.equal(target.owner,'caesar');
  assert.ok(a.men<15000);
  assert.ok(s.armies.every(x=>x.id!=='italy'||x.men<1000));
});

test('tax pressure causes an actual territorial rebellion',()=>{
  const s=newGame();s.factions.caesar.stability=40;
  region(s,'gaul').loyalty=25;
  setTax(s,'caesar','high');
  tick(s);
  assert.equal(region(s,'gaul').owner,'rebels');
  assert.ok(s.armies.some(a=>a.owner==='rebels'&&a.region==='gaul'));
  assert.ok(isWar(s,'caesar','rebels'));
});

test('AI issues real movement orders after a monthly update',()=>{
  const s=newGame();tick(s);
  assert.ok(s.armies.some(a=>a.owner==='senate'&&a.move));
});

test('complete state is JSON serializable for local save slots',()=>{
  const s=newGame();recruit(s,'gaul');tick(s);
  const restored=JSON.parse(JSON.stringify(s));
  assert.deepEqual(restored,s);
  assert.equal(restored.version,3);
});

test('each playable faction can be controlled and the former player becomes AI',()=>{
  for(const id of PLAYABLE){const s=newGame(id);assert.equal(s.player,id);assert.ok(s.regions.some(r=>r.owner===id));assert.ok(s.armies.some(a=>a.owner===id));tick(s)}
  const s=newGame('senate');tick(s);assert.ok(s.armies.some(a=>a.owner==='caesar'&&a.move));
});

test('pairwise diplomacy supports a kingdom player and defensive alliances',()=>{
  const s=newGame('egypt');
  assert.ok(diplomacy(s,'egypt','armenia','improve'));assert.ok(diplomacy(s,'egypt','armenia','improve'));
  assert.equal(relation(s,'armenia','egypt'),30);assert.ok(diplomacy(s,'egypt','armenia','alliance'));
  assert.ok(isAllied(s,'armenia','egypt'));assert.ok(diplomacy(s,'parthia','egypt','war'));
  assert.ok(isWar(s,'parthia','armenia'));assert.equal(isWar(s,'egypt','armenia'),false);
});

test('stronger powers can reject peace and diplomatic relations are pair-specific',()=>{
  const s=newGame('egypt');diplomacy(s,'egypt','senate','war');
  assert.equal(diplomacy(s,'egypt','senate','peace'),false);
  assert.ok(isWar(s,'egypt','senate'));assert.equal(relation(s,'egypt','senate'),-60);
  assert.equal(relation(s,'egypt','caesar'),0);
});

test('version 2 saves migrate relationships without resetting campaign',()=>{
  const s=newGame();s.version=2;s.relations={egypt:25};s.alliances=['egypt'];s.month=8;
  upgradeSave(s);assert.equal(s.version,3);assert.equal(s.month,8);assert.equal(relation(s,'caesar','egypt'),25);assert.ok(isAllied(s,'egypt','caesar'));
});

test('battle cannot capture a theater while another defender remains',()=>{
  const s=newGame(),a=army(s,'xiii'),d=army(s,'italy');a.men=20000;d.men=1000;
  army(s,'pompey').region='italiaN';resolveBattle(s,a,d,region(s,'italiaN'));
  assert.equal(region(s,'italiaN').owner,'senate');assert.equal(a.region,'cisalpine');
});

test('neighboring alliances join declared wars and remain independent factions',()=>{
  const s=newGame();
  assert.equal(diplomacy(s,'caesar','mauretania','improve'),true);
  assert.equal(diplomacy(s,'caesar','mauretania','alliance'),true);
  assert.equal(diplomacy(s,'caesar','numidia','war'),true);
  assert.ok(isWar(s,'mauretania','numidia'));
  tick(s);
  assert.ok(s.armies.some(a=>a.owner==='mauretania'&&a.move));
});

test('Egyptian diplomacy changes access and peace cancels only relevant hostile orders',()=>{
  const s=newGame();
  assert.equal(diplomacy(s,'caesar','egypt','war'),true);
  assert.ok(isWar(s,'caesar','egypt'));
  assert.equal(s.factions.caesar.legitimacy,44);
  army(s,'xiii').move={to:'italiaN',remaining:1};
  army(s,'egyptguard').move={to:'syria',remaining:1};
  assert.equal(diplomacy(s,'caesar','egypt','peace'),true);
  assert.equal(isWar(s,'caesar','egypt'),false);
  assert.ok(army(s,'xiii').move);
  assert.ok(army(s,'egyptguard').move);
});


test('defeat records the actual outcome and leaves the defending theater unchanged',()=>{
 const s=newGame(),a=army(s,'xiii'),d=army(s,'italy'),target=region(s,'italiaN');
 a.men=500;d.men=20000;const originalOwner=target.owner;
 assert.equal(resolveBattle(s,a,d,target),false);
 assert.equal(target.owner,originalOwner);assert.equal(s.battles[0].attackerWins,false);
 assert.equal(s.battles[0].attacker.men,500);assert.ok(s.battles[0].lossA>0);
});


test('official inquiries cost treasury and resolve only after months; saves retain pending letters',()=>{
 const s=newGame(),start=s.factions.caesar.treasury;const sent=sendInquiry(s,'caesar','egypt');
 assert.equal(sent.ok,true);assert.equal(sent.duration,4);assert.equal(s.factions.caesar.treasury,start-3);
 assert.equal(sendInquiry(s,'caesar','egypt').reason,'pending');
 tick(s);tick(s);tick(s);assert.equal(s.inquiries[0].status,'pending');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));tick(loaded);
 assert.ok(['answered','refused','no_reply'].includes(loaded.inquiries[0].status));
 if(loaded.inquiries[0].status==='answered'){assert.equal(loaded.inquiries[0].confidence,'unverified');assert.match(loaded.inquiries[0].claim[0],/Cleopatra/)}
});

test('official inquiries can produce unanswered, declined and unverified responses',()=>{
 const outcomes=new Set();for(let seed=1;seed<600&&outcomes.size<3;seed++){const s=newGame();s.seed=(seed*7000013)>>>0;sendInquiry(s,'caesar','egypt');s.inquiries[0].remaining=1;tick(s);outcomes.add(s.inquiries[0].status)}
 assert.deepEqual([...outcomes].sort(),['answered','no_reply','refused']);
});


test('letters are private to each sender and validate costs and active governments',()=>{
 const s=newGame();s.factions.caesar.treasury=2;assert.equal(sendInquiry(s,'caesar','egypt').reason,'treasury');
 s.factions.caesar.treasury=30;assert.equal(sendInquiry(s,'caesar','egypt').ok,true);
 assert.equal(sendInquiry(s,'senate','egypt').ok,true);
 assert.deepEqual(s.inquiries.map(x=>x.actor).sort(),['caesar','senate']);
 for(const r of s.regions.filter(r=>r.owner==='egypt'))r.owner='senate';
 assert.equal(sendInquiry(s,'caesar','egypt').reason,'unavailable');
 s.inquiries[0].remaining=1;tick(s);assert.equal(s.inquiries[0].status,'no_reply');
});
test('succession letters can disclose an unverified plan or answer evasively after a delay',()=>{
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.8&&q<.9});
 const friendly=newGame('caesar');friendly.world.successionPlans.parthia='pacorus';friendly.relations['caesar:parthia']=50;assert.equal(sendInquiry(friendly,'caesar','parthia','successor').ok,true);
 const saved=upgradeSave(JSON.parse(JSON.stringify(friendly)));for(let i=0;i<4;i++)tick(saved);assert.equal(saved.inquiries[0].status,'pending');for(const army of saved.armies){army.move=null;army.siege=null}saved.seed=seed;tick(saved);
 assert.equal(saved.inquiries[0].status,'answered');assert.match(saved.inquiries[0].claim[0],/Pacorus/);assert.equal(saved.knowledge.caesar.parthia.reports[0].value,'pacorus');assert.equal(saved.knowledge.caesar.parthia.reports[0].verified,false);
 const hostile=newGame('caesar');hostile.world.successionPlans.senate='cato';assert.equal(sendInquiry(hostile,'caesar','senate','successor').ok,true);hostile.inquiries[0].remaining=1;hostile.seed=seed;tick(hostile);
 assert.equal(hostile.inquiries[0].status,'answered');assert.match(hostile.inquiries[0].claim[0],/did not name/);assert.equal(hostile.knowledge.caesar.senate.reports[0].value,'unknown');assert.equal(hostile.world.successionPlans.senate,'cato');
});
test('another faction’s outgoing and resolved letters are not published in the player log',()=>{
 const s=newGame('caesar');assert.equal(sendInquiry(s,'senate','egypt','leaders').ok,true);assert.equal(s.log.length,0);s.inquiries[0].remaining=1;s.seed=2500;tick(s);
 assert.notEqual(s.inquiries[0].status,'pending');assert.ok(!s.log.some(e=>/letter|reply|response/i.test(e.en)));assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});


test('new neighboring courts have reported leaders, distinct identities, and delayed inquiries',()=>{
 const s=newGame('caesar');for(const [id,leader] of [['galatia','deiotarus'],['bosporus','pharnaces']]){assert.equal(region(s,id).owner,id);assert.deepEqual(s.world.leadership[id],[leader]);assert.deepEqual(s.knowledge.caesar[id].reportedLeaders,[leader]);assert.ok(identity(id).abbr);const inquiry=sendInquiry(s,'caesar',id,'leaders');assert.equal(inquiry.ok,true);assert.ok(inquiry.duration>=2);assert.equal(s.inquiries[0].status,'pending')}
 assert.equal(s.relations['galatia:senate'],25);assert.equal(isAllied(s,'galatia','senate'),false);
});
test('legacy campaigns acquire new courts without resetting people, reports, treasury or conquered territory',()=>{
 const s=newGame('caesar');s.year=-47;s.factions.caesar.treasury=17;s.world.characters.deiotarus.loyalty=37;s.world.characters.pharnaces.alive=false;s.knowledge.caesar.egypt.reports.push({kind:'health',value:'ill',source:'spy',year:-47,month:1});s.inquiries=[{actor:'caesar',target:'egypt',remaining:2,status:'pending'}];for(const id of ['galatia','bosporus']){delete s.factions[id];delete s.world.leadership[id];delete s.knowledge[id];for(const k of Object.values(s.knowledge))delete k[id];s.regions=s.regions.filter(x=>x.id!==id);s.armies=s.armies.filter(x=>x.owner!==id)}s.world.characters.deiotarus.faction=null;s.world.characters.pharnaces.faction=null;s.world.characters.deiotarus.location=null;s.world.characters.pharnaces.location=null;
 let t=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(t.factions.caesar.treasury,17);assert.equal(t.world.characters.deiotarus.loyalty,37);assert.equal(t.world.characters.deiotarus.faction,'galatia');assert.equal(t.world.characters.pharnaces.alive,false);assert.deepEqual(t.world.leadership.bosporus,[]);assert.equal(t.knowledge.caesar.egypt.reports.length,1);assert.equal(t.inquiries[0].remaining,2);assert.ok(t.knowledge.galatia.caesar);assert.ok(t.knowledge.caesar.galatia);
 t.regions.find(x=>x.id==='galatia').owner='senate';t=upgradeSave(JSON.parse(JSON.stringify(t)));assert.equal(t.regions.find(x=>x.id==='galatia').owner,'senate');assert.equal(t.regions.filter(x=>x.id==='galatia').length,1);
});
