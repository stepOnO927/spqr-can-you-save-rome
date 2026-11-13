import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newDynastyScenario,upgradeSave,tick} from '../engine.js?v=court-portraits-1';
import {CHARACTER_CATALOG} from '../characters.js?v=separate-crowns-1';
import {assignSuccession,successionModel} from '../characters.js?v=separate-crowns-1';
import {deriveGovernment,advanceGovernments,secureRegency,reformRomanGovernment,appointCoEmperor,planSuccession,validSuccessionPlan} from '../governance.js?v=court-portraits-1';
import {initializeDynasties,createFictionalPerson,proposeMarriage,reportedDynasticContacts,offerForeignMarriage,offerFamilyAccord,requestClaimantAsylum,adoptHeir,makeWill,settleInheritance,resolveInheritanceDispute,nominateGuardian,requestFamilyResources,advanceDynasties,decideDisputedHeir,personAge} from '../dynasties.js?v=court-portraits-1';
import {canHoldOffice} from '../office-system.js?v=court-portraits-1';
import {renderGenealogy} from '../genealogy-ui.js?v=court-portraits-1';
import {finalizeCampaign} from '../legacy.js?v=court-portraits-1';
import {startDynasticWar} from '../civil-war.js?v=separate-crowns-1';
import {fictionalPortraitKey} from '../portrait-registry.js?v=court-portraits-1';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('historical relationships do not invent missing parents or spouses',()=>{
 const s=newGame();assert.equal(s.world.characters.cleopatra.familyId,s.world.characters.arsinoe.familyId);
 assert.deepEqual(s.world.characters.caesar.parents,[]);assert.equal(s.world.characters.pompey.spouse,null);
 assert.notEqual(s.world.characters.caesar.familyId,s.world.characters.pompey.familyId);
});

test('marriage, adoption and wills change legal relationships and private assets',()=>{
 const s=newGame('egypt'),a=createFictionalPerson(s,{name:['A','甲'],faction:'egypt',birthYear:-90,wealth:40,sex:'male'}),b=createFictionalPerson(s,{name:['B','乙'],faction:'egypt',birthYear:-78,sex:'female'}),child=createFictionalPerson(s,{name:['C','丙'],faction:'egypt',birthYear:-68});
 s.world.characters[a].loyalty=100;s.world.characters[b].loyalty=100;
 let marriage;for(let i=0;i<10;i++){marriage=proposeMarriage(s,a,b);if(marriage.ok)break}assert.equal(marriage.ok,true);
 assert.equal(s.world.characters[a].spouse,b);assert.equal(s.world.characters[b].spouse,a);
 assert.equal(adoptHeir(s,a,child).ok,true);assert.equal(s.world.characters[child].familyId,s.world.characters[a].familyId);
 assert.equal(s.world.leadership.egypt.includes(child),false);
 assert.equal(makeWill(s,a,child).ok,true);const treasury=s.factions.egypt.treasury;
 s.world.characters[a].alive=false;settleInheritance(s,a);
 assert.equal(s.world.characters[child].wealth,40);assert.equal(s.factions.egypt.treasury,treasury);
 assert.equal(s.world.dynasties.lives[child].some(e=>e.en.includes('Inherited')),true);
});

test('foreign marriage requires a reported contact, a paid envoy and a delayed answer',()=>{
 const s=newGame('caesar'),own=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,sex:'male'}),foreign=createFictionalPerson(s,{name:['Egyptian','埃及人'],faction:'egypt',birthYear:-75,sex:'female'});
 s.world.characters[own].loyalty=100;s.world.characters[foreign].loyalty=100;
 assert.equal(offerForeignMarriage(s,own,foreign,'egypt').reason,'unknown');
 assert.equal(reportedDynasticContacts(s).some(x=>x.id===foreign),false);
 s.knowledge.caesar.egypt.reportedLeaders.push(foreign);
 assert.equal(reportedDynasticContacts(s).some(x=>x.id===foreign),true);
 const treasury=s.factions.caesar.treasury,alliances=s.alliances.length;
 assert.equal(offerForeignMarriage(s,own,foreign,'egypt').ok,true);
 assert.equal(s.factions.caesar.treasury,treasury-4);assert.equal(s.world.characters[own].spouse,null);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));for(const month of [2,3,4]){loaded.month=month;if(month===4)loaded.world.dynasties.seed=0;advanceDynasties(loaded)}
 assert.equal(loaded.world.dynasties.marriageOffers[0].status,'accepted');
 assert.equal(loaded.world.characters[own].spouse,foreign);assert.equal(loaded.alliances.length,alliances);
});

test('a stale reported marriage target produces no hidden-state disclosure',()=>{
 const s=newGame('caesar'),own=createFictionalPerson(s,{name:['Roman','罗马人'],faction:'caesar',birthYear:-80,sex:'male'}),foreign=createFictionalPerson(s,{name:['Contact','联系人'],faction:'egypt',birthYear:-75,sex:'female'});
 s.knowledge.caesar.egypt.reportedLeaders.push(foreign);offerForeignMarriage(s,own,foreign,'egypt');s.world.characters[foreign].alive=false;
 for(const month of [2,3,4]){s.month=month;advanceDynasties(s)}
 assert.equal(s.world.dynasties.marriageOffers[0].status,'no_reply');
 assert.match(s.log[0].en,/may have been outdated/);assert.equal(s.world.characters[own].spouse,null);
});

test('asylum uses reported claimant leads, a paid delay and survives save/load',()=>{
 const s=newGame('caesar'),claimant=createFictionalPerson(s,{name:['Claimant','竞争者'],faction:'egypt',birthYear:-75,location:'egyptUpper'});
 s.world.claimants.egypt=[claimant];s.world.disputes.egypt={months:0,support:{}};
 assert.equal(requestClaimantAsylum(s,claimant,'egypt').reason,'unknown');
 s.knowledge.caesar.egypt.reports.push({kind:'claimants',leaders:[claimant],year:s.year,month:s.month});
 const treasury=s.factions.caesar.treasury,alliances=s.alliances.length;
 assert.equal(requestClaimantAsylum(s,claimant,'egypt').ok,true);
 assert.equal(s.factions.caesar.treasury,treasury-6);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(const month of [2,3,4]){loaded.month=month;if(month===4)loaded.world.dynasties.seed=0;advanceDynasties(loaded)}
 assert.equal(loaded.world.dynasties.asylumRequests[0].status,'accepted');
 assert.equal(loaded.world.characters[claimant].asylumHost,'caesar');
 assert.equal(loaded.world.characters[claimant].faction,'egypt');
 loaded.world.leadership.egypt=[];assignSuccession(loaded,'egypt');
 assert.deepEqual(loaded.world.leadership.egypt,[]);
 assert.equal(loaded.alliances.length,alliances);
 assert.match(renderGenealogy(loaded,false),/FAMILY GENEALOGY/);
});

test('a sheltered child cannot inherit court authority through the family succession path',()=>{
 for(const includeLocal of [false,true]){
  let s=newGame('caesar');
  const abroad=createFictionalPerson(s,{name:['Exiled child','受庇护子女'],faction:'egypt',birthYear:-70,parents:['cleopatra'],location:'cisalpine'});
  s.world.characters[abroad].asylumHost='caesar';
  const local=includeLocal?createFictionalPerson(s,{name:['Local child','在廷子女'],faction:'egypt',birthYear:-68,parents:['cleopatra'],location:'egypt'}):null;
  s.world.leadership.egypt=['cleopatra'];s.world.characters.cleopatra.alive=false;s.world.characters.cleopatra.health='deceased';
  const prior=structuredClone(s.knowledge.caesar.egypt);s=upgradeSave(JSON.parse(JSON.stringify(s)));
  const leaders=assignSuccession(s,'egypt');
  assert.ok(!leaders.includes(abroad));assert.deepEqual(leaders,[local||'ptolemy']);
  assert.equal(s.world.characters[abroad].asylumHost,'caesar');assert.deepEqual(s.knowledge.caesar.egypt,prior);
 }
});

test('a sheltered imperial child cannot be nominated while a local child remains eligible',()=>{
 const s=newGame('caesar');s.world.romanRegimes={caesar:'roman_principate'};
 const abroad=createFictionalPerson(s,{name:['Sheltered child','受庇护子女'],faction:'caesar',birthYear:-60,parents:['caesar'],location:'egypt'});
 const local=createFictionalPerson(s,{name:['Local child','在廷子女'],faction:'caesar',birthYear:-58,parents:['caesar'],location:'cisalpine'});
 s.world.characters[abroad].asylumHost='egypt';s.world.successionPlans.caesar=abroad;
 assert.equal(validSuccessionPlan(s,'caesar'),null);assert.equal(planSuccession(s,abroad).reason,'unavailable');
 assert.equal(planSuccession(s,local).ok,true);assert.equal(validSuccessionPlan(s,'caesar'),local);
});

test('stale asylum lead gives a generic reply',()=>{
 const s=newGame('caesar'),claimant=createFictionalPerson(s,{name:['Claimant','竞争者'],faction:'egypt',birthYear:-75});
 s.knowledge.caesar.egypt.reports.push({kind:'claimants',leaders:[claimant]});requestClaimantAsylum(s,claimant,'egypt');
 for(const month of [2,3,4]){s.month=month;advanceDynasties(s)}
 assert.equal(s.world.dynasties.asylumRequests[0].status,'no_reply');
 assert.match(s.log[0].en,/may have been outdated/);
});

test('a family guarantee costs treasury, waits for reply, and breaks on war',()=>{
 const s=newGame('caesar'),treasury=s.factions.caesar.treasury;
 assert.equal(offerFamilyAccord(s,'pledge','cleopatra','egypt').ok,true);
 assert.equal(s.factions.caesar.treasury,treasury-6);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(const month of [2,3,4,5]){restored.month=month;if(month===5)restored.world.dynasties.seed=0;advanceDynasties(restored)}
 assert.equal(restored.world.dynasties.familyAccords[0].status,'active');
 assert.equal(restored.alliances.length,0);
 const relation=restored.relations['caesar:egypt'],stability=restored.factions.caesar.stability;
 restored.wars.push(['caesar','egypt']);restored.month=6;advanceDynasties(restored);
 assert.equal(restored.world.dynasties.familyAccords[0].status,'broken');
 assert.equal(restored.relations['caesar:egypt'],relation-12);
 assert.equal(restored.factions.caesar.stability,stability-2);
 restored.victory=true;assert.equal(finalizeCampaign(restored).archive.familyAccords[0].status,'broken');
});

test('diplomatic wardship educates a minor without transferring custody or office',()=>{
 const s=newGame('caesar'),child=createFictionalPerson(s,{name:['Ward','受监护者'],faction:'caesar',birthYear:-57,location:'cisalpine'});
 assert.equal(offerFamilyAccord(s,'wardship','cleopatra','egypt',child).ok,true);
 for(const month of [2,3,4,5]){s.month=month;if(month===5)s.world.dynasties.seed=0;advanceDynasties(s)}
 assert.equal(s.world.dynasties.familyAccords[0].status,'active');
 assert.equal(s.world.characters[child].diplomaticGuardian,'cleopatra');
 assert.equal(s.world.characters[child].guardian,undefined);
 assert.equal(s.world.characters[child].faction,'caesar');
 assert.ok(s.world.characters[child].education>=8);
});

test('a foreign child may inherit private property through a negotiated court settlement',()=>{
 const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Parent','父母'],faction:'caesar',birthYear:-90,wealth:30}),domestic=createFictionalPerson(s,{name:['Domestic','本地子女'],faction:'caesar',birthYear:-65,parents:[parent]}),foreign=createFictionalPerson(s,{name:['Foreign','外国子女'],faction:'egypt',birthYear:-66,parents:[parent]});
 assert.equal(makeWill(s,parent,foreign).ok,true);
 s.world.characters[parent].alive=false;settleInheritance(s,parent);
 const caseFile=s.world.dynasties.inheritanceDisputes.at(-1),before=s.relations['caesar:egypt']||0;
 assert.ok(caseFile.heirs.includes(domestic));
 assert.equal(resolveInheritanceDispute(s,caseFile.id,'compromise').ok,true);
 assert.equal(s.world.characters[foreign].wealth,15);
 assert.equal(s.world.characters[domestic].wealth,15);
 assert.equal(s.relations['caesar:egypt'],before+2);
 assert.equal(s.world.leadership.egypt.includes(foreign),false);
});

test('a contested private will becomes a saved court case with real costs',()=>{
 const s=newGame('egypt');
 const parent=createFictionalPerson(s,{name:['Testator','立遗嘱者'],faction:'egypt',birthYear:-90,wealth:35});
 const child=createFictionalPerson(s,{name:['Child','子女'],faction:'egypt',birthYear:-66,parents:[parent],familyId:s.world.characters[parent].familyId});
 const outsider=createFictionalPerson(s,{name:['Outsider','外人'],faction:'egypt',birthYear:-70});
 assert.equal(makeWill(s,parent,outsider).ok,true);const treasury=s.factions.egypt.treasury;
 s.world.characters[parent].alive=false;settleInheritance(s,parent);
 assert.equal(s.world.characters[outsider].wealth,0);assert.equal(s.world.characters[child].wealth,0);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s))),caseFile=saved.world.dynasties.inheritanceDisputes[0];
 assert.equal(caseFile.estate,35);assert.match(renderGenealogy(saved,false),/CONTESTED PRIVATE ESTATE/);
 assert.match(renderGenealogy(saved,true),/待决私人遗产/);
 assert.equal(resolveInheritanceDispute(saved,caseFile.id,'compromise').ok,true);
 assert.equal(saved.factions.egypt.treasury,treasury-6);
 assert.equal(saved.world.characters[outsider].wealth+saved.world.characters[child].wealth+saved.world.dynasties.families[saved.world.characters[parent].familyId].wealth,35);
 assert.equal(resolveInheritanceDispute(saved,caseFile.id,'will').ok,false);
});

test('unresolved estates receive an automatic ruling after twelve months',()=>{
 const s=newGame('egypt'),parent=createFictionalPerson(s,{name:['P','甲'],faction:'egypt',birthYear:-90,wealth:20}),child=createFictionalPerson(s,{name:['C','乙'],faction:'egypt',birthYear:-69,parents:[parent]}),outsider=createFictionalPerson(s,{name:['O','丙'],faction:'egypt',birthYear:-70});
 makeWill(s,parent,outsider);s.world.characters[parent].alive=false;settleInheritance(s,parent);
 s.year+=1;advanceDynasties(s);
 assert.equal(s.world.dynasties.inheritanceDisputes[0].status,'resolved');
 assert.equal(s.world.characters[child].wealth+s.world.characters[outsider].wealth,20);
});

test('family wealth funds real loans and levies without becoming free treasury',()=>{
 const s=newGame('egypt'),person=createFictionalPerson(s,{name:['Patron','家主'],faction:'egypt',birthYear:-80,wealth:30});
 const family=s.world.characters[person].familyId,treasury=s.factions.egypt.treasury;
 assert.equal(requestFamilyResources(s,family,'loan').ok,true);
 assert.equal(s.factions.egypt.treasury,treasury+12);assert.equal(s.world.characters[person].wealth,18);
 assert.equal(requestFamilyResources(s,family,'loan').reason,'cooldown');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));advanceDynasties(restored);
 assert.equal(restored.factions.egypt.treasury,treasury+11);assert.equal(restored.world.dynasties.familyLoans[0].remaining,13);
 assert.equal(restored.world.dynasties.families[family].wealth,1);
 restored.month+=6;assert.equal(requestFamilyResources(restored,family,'levy').ok,true);
 assert.equal(restored.factions.egypt.stability,s.factions.egypt.stability-4);
 assert.ok(restored.world.characters[person].loyalty<s.world.characters[person].loyalty);
});

test('children mature over years and their identities survive loading',()=>{
 const s=newGame(),parent=createFictionalPerson(s,{name:['Parent','家长'],faction:'caesar',birthYear:-80}),child=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:-49,parents:[parent],familyId:s.world.characters[parent].familyId});
 assert.equal(personAge(s,child),0);assert.equal(s.world.characters[child].influence,20);
 for(let year=-48;year<=-31;year++){s.year=year;s.month=1;advanceDynasties(s)}
 assert.equal(personAge(s,child),18);assert.ok(s.world.dynasties.lives[child].some(e=>e.en.includes('adulthood')));
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.world.characters[child].parents,[parent]);assert.equal(CHARACTER_CATALOG[child].name[0],'Child');
});

test('fictional succession choice can escalate into actual territorial civil war',()=>{
 const s=newDynastyScenario(),c=s.world.dynasties.scenario;
 assert.equal(s.world.characters[c.adopted].wealth,48);assert.equal(s.world.characters[c.parent].alive,false);
 assert.equal(decideDisputedHeir(s,'appointed').ok,true);
 s.month=4;s.world.dynasties.seed=0;advanceDynasties(s);
 assert.equal(s.world.dynasties.scenario.stage,'war');assert.equal(s.regions.find(r=>r.id==='egyptUpper').owner,'egypt_claimant');
 assert.ok(s.armies.some(a=>a.owner==='egypt_claimant'&&a.men>=500));assert.ok(s.wars.some(w=>w.includes('egypt')&&w.includes('egypt_claimant')));
 assert.ok(s.armies.some(a=>a.owner==='egypt_claimant'&&a.characterId===c.general));
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.world.dynasties.scenario.stage,'war');
});

test('a peaceful compromise has real economic and political costs',()=>{
 const s=newDynastyScenario(),before=s.factions.egypt.treasury,stability=s.factions.egypt.stability;
 assert.equal(decideDisputedHeir(s,'compromise').ok,true);
 assert.equal(s.factions.egypt.treasury,before-18);assert.equal(s.factions.egypt.stability,stability+12);
 for(let i=0;i<2;i++)tick(s);assert.equal(s.world.dynasties.scenario.stage,'chosen');
});

test('deterministic generations grow gradually and young characters cannot hold office',()=>{
 const s=newGame('caesar'),a=createFictionalPerson(s,{name:['A','甲'],faction:'caesar',birthYear:-80,location:'cisalpine',sex:'male'}),b=createFictionalPerson(s,{name:['B','乙'],faction:'caesar',birthYear:-78,location:'cisalpine',sex:'female'});
 let outcome;for(let i=0;i<10;i++){outcome=proposeMarriage(s,a,b);if(outcome.ok)break}assert.equal(outcome.ok,true);
 for(let year=-48;year<=-30;year++){s.year=year;s.month=1;advanceDynasties(s)}
 const children=s.world.characters[a].children;assert.ok(children.length>0);
 const first=children[0];assert.equal(s.world.characters[first].parents.includes(a),true);
 assert.equal(canHoldOffice(s,'caesar',first),false);
 const save=JSON.stringify(s),restored=upgradeSave(JSON.parse(save));assert.deepEqual(restored.world.characters[a].children,children);
});

test('genealogy stays bilingual and procedural identity remains stable with age',()=>{
 const s=newGame(),id=createFictionalPerson(s,{name:['Aulus of Rome','罗马的奥卢斯'],faction:'caesar',birthYear:-85});
 const young=renderGenealogy(s,false),chinese=renderGenealogy(s,true);
 assert.match(young,/FAMILY GENEALOGY/);assert.match(chinese,/家族谱系/);
 assert.match(young,/Aulus of Rome/);assert.match(chinese,/罗马的奥卢斯/);
 const seed=s.world.characters[id].personalitySeed;s.year=-25;
 const older=renderGenealogy(s,false);assert.equal(s.world.characters[id].personalitySeed,seed);
 assert.match(older,/Aulus of Rome/);assert.match(older,/data:image\/svg\+xml/);
});

test('opening fictional portraits stay distinct and are not assigned to a reused identity',()=>{
 const portrait=(html,id)=>html.match(new RegExp('data-gene-person="'+id+'"[^>]*><img src="([^"]+)"'))?.[1];
 for(const [side,expected] of [['caesar',['fictional-varenus','fictional-livia']],['senate',['fictional-cassianus','fictional-valeria']]]){
  const s=newGame(side),html=renderGenealogy(s,false),ids=side==='caesar'?['fictional:1','fictional:2']:['fictional:3','fictional:4'];
  assert.ok(portrait(html,ids[0]).includes(expected[0]));assert.ok(portrait(html,ids[1]).includes(expected[1]));assert.notEqual(portrait(html,ids[0]),portrait(html,ids[1]));assert.match(html,/childhood and adult images/);
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(portrait(renderGenealogy(restored,false),ids[0]),portrait(html,ids[0]));
  restored.world.dynasties.catalog[ids[0]].name=['A different person','另一人'];assert.match(portrait(renderGenealogy(restored,false),ids[0]),/^data:image\/svg\+xml/);
 }
});

test('stale legacy counters cannot reuse identities referenced by the campaign',()=>{
 let s=newGame('caesar');const before=JSON.parse(JSON.stringify(s.world.characters['fictional:1'])),catalog=JSON.parse(JSON.stringify(s.world.dynasties.catalog['fictional:1']));
 s.meetings.push({actor:'caesar',target:'fictional:11',status:'met',portraitKey:'fictional-cassianus',year:s.year,month:s.month});
 s.world.dynasties.memories.push({person:'fictional:12',familyId:'family:fictional:11',kind:'legacy'});
 delete s.world.dynasties.nextPerson;delete s.world.dynasties.nextFamily;s=upgradeSave(JSON.parse(JSON.stringify(s)));
 const id=createFictionalPerson(s,{name:['New person','新人物'],faction:'caesar',birthYear:-40,location:'roma'});
 assert.equal(id,'fictional:13');assert.equal(s.world.characters[id].familyId,'family:fictional:12');assert.deepEqual(s.world.characters['fictional:1'],before);assert.deepEqual(s.world.dynasties.catalog['fictional:1'],catalog);assert.equal(fictionalPortraitKey(s,'fictional:1'),'fictional-varenus');
 assert.equal(s.meetings[0].target,'fictional:11');assert.notEqual(id,s.meetings[0].target);
 s.world.dynasties.nextPerson=1;s.world.dynasties.nextFamily=1;
 const another=createFictionalPerson(s,{name:['Another person','另一人物'],faction:'caesar',birthYear:-40,parents:['fictional:14']});
 assert.equal(another,'fictional:15');assert.equal(s.world.characters[another].familyId,'family:fictional:13');assert.notEqual(another,s.world.characters[another].parents[0]);
});

test('a new campaign does not import fictional people from a previously loaded campaign',()=>{
 const first=newGame('caesar'),id=createFictionalPerson(first,{name:['Previous campaign','前次战役人物'],faction:'caesar',birthYear:-70});
 const second=newGame('senate');assert.equal(second.world.characters[id],undefined);assert.deepEqual(Object.keys(second.world.dynasties.catalog),Array.from({length:10},(_,i)=>`fictional:${i+1}`));
 assert.equal(second.world.dynasties.catalog['fictional:3'].name[0],'Aulus Cassianus');
 const restored=upgradeSave(JSON.parse(JSON.stringify(first)));assert.equal(restored.world.dynasties.catalog[id].name[0],'Previous campaign');assert.ok(restored.world.characters[id]);
});

test('a legacy person with missing identity never inherits another save’s name',()=>{
 const first=newGame('caesar'),id=createFictionalPerson(first,{name:['Other campaign person','另一战役人物'],faction:'caesar',birthYear:-70});
 const firstSave=JSON.parse(JSON.stringify(first));let legacy=newGame('caesar');legacy.world.characters[id]={id,faction:'caesar',alive:true,health:'healthy',birthYear:-80,location:'roma'};delete legacy.world.dynasties.catalog[id];
 legacy=upgradeSave(JSON.parse(JSON.stringify(legacy)));assert.equal(legacy.world.dynasties.catalog[id],undefined,'do not write invented details into the save');assert.deepEqual(CHARACTER_CATALOG[id].name,['Unknown simulated person','身份不明的模拟人物']);
 const view=renderGenealogy(legacy,true);assert.match(view,/身份不明的模拟人物/);assert.doesNotMatch(view,/另一战役人物/);assert.equal(fictionalPortraitKey(legacy,id),null);
 const again=upgradeSave(firstSave);assert.equal(CHARACTER_CATALOG[id].name[0],'Other campaign person');assert.match(renderGenealogy(again,true),/另一战役人物/);
 const malformed=JSON.parse(JSON.stringify(legacy));malformed.world.dynasties.catalog[id]={fictional:true,name:[null,'错误']};CHARACTER_CATALOG[id]={name:['Leaked','错误姓名'],fictional:false};upgradeSave(malformed);assert.deepEqual(CHARACTER_CATALOG[id].name,['Unknown simulated person','身份不明的模拟人物']);
});

test('fixed succession scenario portraits remain unique and tied to the saved role and identity',()=>{
 const s=newDynastyScenario(),scenario=s.world.dynasties.scenario,keys={parent:'fictional-nikon',adopted:'fictional-demetrios',son:'fictional-leontios',general:'fictional-straton'},hashes=new Set();
 for(const [role,key] of Object.entries(keys)){
  const id=scenario[role];assert.equal(fictionalPortraitKey(s,id),key);assert.match(renderGenealogy(s,false),new RegExp(key+'-128\\.jpg'));
  for(const size of ['master','128','64'])assert.ok(fs.existsSync(`assets/portraits/${key}-${size}.jpg`));
  hashes.add(createHash('sha256').update(fs.readFileSync(`assets/portraits/${key}-128.jpg`)).digest('hex'));
 }
 assert.equal(hashes.size,4);const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(const [role,key] of Object.entries(keys))assert.equal(fictionalPortraitKey(restored,restored.world.dynasties.scenario[role]),key);
 const id=restored.world.dynasties.scenario.son;restored.world.characters[id].birthYear++;assert.equal(fictionalPortraitKey(restored,id),null);restored.world.characters[id].birthYear--;
 restored.world.dynasties.catalog[id].name=['Different person','另一人'];assert.equal(fictionalPortraitKey(restored,id),null);restored.world.dynasties.catalog[id].name=['Leontios of Alexandria','亚历山大里亚的莱昂提奥斯'];delete restored.world.dynasties.scenario.son;assert.equal(fictionalPortraitKey(restored,id),null);
});

test('opening institution portraits match saved identity and seat, not the reusable numeric ID',()=>{
 const s=newGame('caesar'),cases=[['roman_college',0,'fictional-fabius'],['roman_college',1,'fictional-flavia'],['theban_temples',0,'fictional-psenamun'],['theban_temples',1,'fictional-taimhotep'],['syrian_association',0,'fictional-maron'],['syrian_association',1,'fictional-helena']],hashes=new Set();
 for(const [institution,seat,key] of cases){const id=s.world.religiousInstitutions.find(o=>o.id===institution).council[seat];assert.equal(fictionalPortraitKey(s,id),key);for(const size of ['master','128','64'])assert.ok(fs.existsSync(`assets/portraits/${key}-${size}.jpg`));hashes.add(createHash('sha256').update(fs.readFileSync(`assets/portraits/${key}-128.jpg`)).digest('hex'))}
 assert.equal(hashes.size,6);
 let restored=upgradeSave(JSON.parse(JSON.stringify(s)));const college=restored.world.religiousInstitutions.find(o=>o.id==='roman_college'),id=college.council[0],person=restored.world.characters[id],saved=restored.world.dynasties.catalog[id];assert.equal(fictionalPortraitKey(restored,id),'fictional-fabius');
 saved.name=['Other person','另一人'];assert.equal(fictionalPortraitKey(restored,id),null);saved.name=['Aulus Fabius','奥卢斯·法比乌斯'];person.birthYear++;assert.equal(fictionalPortraitKey(restored,id),null);person.birthYear--;college.council.reverse();assert.equal(fictionalPortraitKey(restored,id),null);college.council.reverse();
 const changed='fictional:900';restored.world.characters[changed]={...person,id:changed};restored.world.dynasties.catalog[changed]={...saved};college.council[0]=changed;delete restored.world.characters[id];delete restored.world.dynasties.catalog[id];assert.equal(fictionalPortraitKey(restored,changed),'fictional-fabius');
});

test('legacy achievements remain sealed until campaign finalization',()=>{
 const s=newDynastyScenario();assert.equal(s.world.dynasties.finalized,undefined);
 assert.deepEqual(finalizeCampaign(s),{ok:false,reason:'unfinished'});
 s.world.dynasties.scenario.stage='resolved';const result=finalizeCampaign(s);
 assert.equal(result.ok,true);assert.ok(result.archive.families.length>0);
 assert.ok(result.archive.rulers.some(r=>r.faction==='egypt'));
 assert.equal(s.world.dynasties.finalized.id,result.archive.id);
 assert.deepEqual(finalizeCampaign(s),{ok:false,reason:'already'});
});

test('final archive retains named marriage envoys and private family debts',()=>{
 const s=newGame('caesar'),person=createFictionalPerson(s,{name:['Aulus Patron','奥卢斯·家主'],faction:'caesar',birthYear:-80,wealth:20,sex:'male'});
 assert.equal(offerForeignMarriage(s,person,'cleopatra','egypt').ok,true);
 assert.equal(requestFamilyResources(s,s.world.characters[person].familyId,'loan').ok,true);
 assert.equal(s.world.dynasties.finalized,undefined);s.victory=true;
 const archive=finalizeCampaign(s).archive;
 assert.equal(archive.marriageOffers[0].ownName[0],'Aulus Patron');
 assert.equal(archive.familyLoans[0].principal,12);
 assert.equal(archive.familyLoans[0].remaining,14);
 assert.ok(Array.isArray(archive.inheritanceCases));assert.ok(Array.isArray(archive.memories));
});

test('legacy ruler history preserves complete fictional identities and their families after loading',()=>{
 let s=newGame('caesar');s.world.dynasties.rulers.push({faction:'caesar',current:'caesar:fictional:1:fictional:2',year:s.year,month:s.month});
 s.world.characters['fictional:1'].faction='senate';s.world.characters['fictional:2'].faction='senate';
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.victory=true;
 const archive=finalizeCampaign(s).archive,entry=archive.rulers.find(r=>r.current==='caesar:fictional:1:fictional:2');
 assert.deepEqual(entry.names.map(name=>name[0]),['Gaius Julius Caesar','Publius Varenus','Livia Marcia']);
 assert.ok(archive.families.some(f=>f.members.some(m=>m.id==='fictional:1')));
 assert.ok(archive.families.some(f=>f.members.some(m=>m.id==='fictional:2')));
 assert.ok(Object.hasOwn(archive.lifeEvents,'fictional:1'));
});

test('a royal child can need a regent while a Roman command is not inherited',()=>{
 const egypt=newGame('egypt'),royal=createFictionalPerson(egypt,{name:['Royal parent','王室家长'],faction:'egypt',birthYear:-85}),child=createFictionalPerson(egypt,{name:['Young heir','幼年继承人'],faction:'egypt',birthYear:-55,parents:[royal],familyId:egypt.world.characters[royal].familyId});
 egypt.world.leadership.egypt=[royal];egypt.world.characters[royal].alive=false;assignSuccession(egypt,'egypt');
 assert.deepEqual(egypt.world.leadership.egypt,[child]);assert.equal(deriveGovernment(egypt,'egypt').kind,'regency');
 const rome=newGame('caesar'),father=createFictionalPerson(rome,{name:['Roman father','罗马父亲'],faction:'caesar',birthYear:-80}),son=createFictionalPerson(rome,{name:['Roman son','罗马儿子'],faction:'caesar',birthYear:-60,parents:[father]});
 rome.world.leadership.caesar=[father];rome.world.characters[father].alive=false;assignSuccession(rome,'caesar');assert.equal(rome.world.leadership.caesar.includes(son),false);
});

test('postwar Roman reform changes legal succession, supports a minor and a regent',()=>{
 const s=newGame('caesar');s.victory=true;s.factions.caesar.stability=70;s.factions.caesar.legitimacy=70;s.regions.find(r=>r.id==='roma').owner='caesar';
 assert.equal(reformRomanGovernment(s,'roman_principate').ok,true);
 assert.equal(successionModel('caesar',s),'roman_principate');
 const parent=s.world.leadership.caesar[0],child=createFictionalPerson(s,{name:['Young heir','年幼继承人'],faction:'caesar',birthYear:-56,parents:[parent],familyId:s.world.characters[parent].familyId});
 assert.equal(planSuccession(s,child).ok,true);
 s.world.characters[parent].alive=false;assignSuccession(s,'caesar');
 assert.deepEqual(s.world.leadership.caesar,[child]);
 assert.equal(deriveGovernment(s,'caesar').kind,'regency');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(successionModel('caesar',restored),'roman_principate');
 assert.equal(deriveGovernment(restored,'caesar').kind,'regency');
});

test('later imperial reform permits co-emperors and a rival court with real forces',()=>{
 const s=newGame('caesar');s.victory=true;s.year=235;s.factions.caesar.stability=75;s.factions.caesar.legitimacy=75;s.factions.caesar.treasury=160;s.regions.find(r=>r.id==='roma').owner='caesar';
 assert.equal(reformRomanGovernment(s,'roman_principate').ok,true);
 assert.equal(reformRomanGovernment(s,'later_empire').ok,true);
 const co=createFictionalPerson(s,{name:['Co-ruler','共治者'],faction:'caesar',birthYear:200,location:'roma'});
 assert.equal(appointCoEmperor(s,co).ok,true);
 assert.equal(s.world.leadership.caesar.includes(co),true);
 const rival=createFictionalPerson(s,{name:['Rival','竞争者'],faction:'caesar',birthYear:205,location:'roma'});
 s.world.claimants.caesar=[rival];s.world.disputes.caesar={months:12,support:{[rival]:30}};
 const home=s.regions.find(r=>r.owner==='caesar'&&r.id!=='roma'&&!s.armies.some(a=>a.region===r.id&&a.men>0));
 assert.ok(home);assert.equal(startDynasticWar(s,'caesar',rival),true);
 assert.equal(home.owner,'caesar_claimant');assert.ok(s.armies.some(a=>a.owner==='caesar_claimant'&&a.men>=500));
});

test('Parthian noble selection can bypass a minor heir and preserve the claim',()=>{
 const s=newGame('parthia'),parent=createFictionalPerson(s,{name:['King','国王'],faction:'parthia',birthYear:-85}),child=createFictionalPerson(s,{name:['Prince','王子'],faction:'parthia',birthYear:-57,parents:[parent]});
 s.world.leadership.parthia=[parent];s.world.claimants.parthia=[];delete s.world.disputes.parthia;
 s.world.characters[parent].alive=false;assignSuccession(s,'parthia');
 assert.equal(successionModel('parthia'),'arsacid_nobility');
 assert.deepEqual(s.world.leadership.parthia,['pacorus']);
 assert.ok(s.world.claimants.parthia.includes(child));
 assert.equal(s.world.disputes.parthia.support[child],10);
 assert.equal(successionModel('egypt'),'ptolemaic_court');
 assert.equal(successionModel('caesar'),'republican_command');
});

test('a guardian nomination can guide a regency without granting inherited office',()=>{
 const s=newGame('egypt'),parent=createFictionalPerson(s,{name:['Parent','父母'],faction:'egypt',birthYear:-85,wealth:12}),child=createFictionalPerson(s,{name:['Minor','幼主'],faction:'egypt',birthYear:-57,parents:[parent],familyId:s.world.characters[parent].familyId}),guardian=createFictionalPerson(s,{name:['Guardian','监护人'],faction:'egypt',birthYear:-80,location:'egyptUpper'});
 assert.equal(nominateGuardian(s,parent,child,guardian).ok,true);
 s.world.leadership.egypt=[parent];s.world.characters[parent].alive=false;settleInheritance(s,parent);assignSuccession(s,'egypt');
 assert.equal(s.world.characters[child].guardian,guardian);
 const g=deriveGovernment(s,'egypt');assert.equal(g.kind,'regency');assert.deepEqual(g.acting,[guardian]);
 assert.match(renderGenealogy(s,true),/临时摄政/);assert.match(renderGenealogy(s,false),/Convene council/);
 const treasury=s.factions.egypt.treasury;assert.equal(secureRegency(s).ok,true);assert.equal(s.factions.egypt.treasury,treasury-8);
 advanceGovernments(s);const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.world.regencies.egypt.regent,guardian);
 s.year=-40;assert.equal(deriveGovernment(s,'egypt').kind,'normal');advanceGovernments(s);assert.equal(s.world.regencies.egypt.endedYear,-40);
});

test('an ambitious regent can create a real rival court under weak rule',()=>{
 const s=newGame('egypt'),parent=createFictionalPerson(s,{name:['Ruler','君主'],faction:'egypt',birthYear:-85}),child=createFictionalPerson(s,{name:['Ward','幼主'],faction:'egypt',birthYear:-58,parents:[parent]}),regent=createFictionalPerson(s,{name:['Regent','摄政'],faction:'egypt',birthYear:-80,location:'egyptUpper'});
 nominateGuardian(s,parent,child,regent);s.world.leadership.egypt=[parent];s.world.characters[parent].alive=false;settleInheritance(s,parent);assignSuccession(s,'egypt');
 s.world.characters[regent].ambition=100;s.factions.egypt.stability=20;s.armies=s.armies.filter(a=>a.region!=='egyptUpper');
 for(let month=1;month<=6;month++){s.month=month;if(month===6)s.world.dynasties.seed=2000;advanceGovernments(s)}
 assert.equal(s.world.regencies.egypt.usurpation,true);
 assert.equal(s.regions.find(r=>r.id==='egyptUpper').owner,'egypt_claimant');
 assert.ok(s.armies.some(a=>a.owner==='egypt_claimant'&&a.men>=500));
});

test('foreign recognition has uncertain acceptance and a real concession cost',()=>{
 const s=newDynastyScenario(),beforeEgypt=s.factions.egypt.treasury,beforeNumidia=s.factions.numidia.treasury;
 s.world.dynasties.seed=0;assert.equal(decideDisputedHeir(s,'foreign').ok,true);
 assert.equal(s.world.dynasties.scenario.concessionMonths,24);assert.equal(s.factions.egypt.treasury,beforeEgypt+2);assert.equal(s.factions.numidia.treasury,beforeNumidia-12);
 advanceDynasties(s);assert.equal(s.world.dynasties.scenario.concessionMonths,23);
});

test('AI families can marry and have children in an extended seeded campaign',()=>{
 // Isolate family AI from unrelated military conquest removing its partners.
 let s=newGame('caesar');s.wars=[];s.armies=[];s.world.dynasties.seed=1;for(let month=0;month<360;month++){tick(s);if(month%60===0)s=upgradeSave(JSON.parse(JSON.stringify(s)))}
 assert.equal(s.year,-19);assert.ok(s.world.dynasties.marriages.some(m=>s.world.characters[m.a].faction==='senate'));
 assert.ok(Object.values(s.world.characters).some(c=>c.parents.length>0));
});
