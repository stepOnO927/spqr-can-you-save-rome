import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {startResearch,startConstruction} from '../inventions.js';
import {initializeCivilization,commissionCulturalEvent,fundEducation,knownForeignSpecialists,inviteForeignSpecialist,specialistRoles,aiCivilization,advanceCivilization,settleRecruitmentTravel} from '../civilization.js';
import {advancePersonalDiplomacy} from '../personal-diplomacy.js?v=faces-name-disagreement-1';
import {createFictionalPerson} from '../dynasties.js?v=faces-name-disagreement-1';

const advance=(s,months)=>{for(let i=0;i<months;i++)tick(s)};

test('Cultural Prestige is earned and spent separately from research, treasury and Laurel Coins',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=300;
 const c=initializeCivilization(s),before=s.factions.egypt.treasury;
 assert.equal(c.prestige.egypt,0);
 assert.equal(commissionCulturalEvent(s,'egypt').ok,true);
 assert.equal(s.factions.egypt.treasury,before-16);
 assert.equal(c.prestige.egypt,4);
 assert.equal(commissionCulturalEvent(s,'egypt').reason,'cooldown');
 advance(s,6);assert.equal(commissionCulturalEvent(s,'egypt').ok,true);
 assert.equal(c.prestige.egypt,8);
 assert.equal(fundEducation(s,'egypt').ok,true);
 assert.equal(c.prestige.egypt,2);
 assert.equal(s.inventions.egypt.scholarVisits,1);
 assert.equal(startResearch(s,'egypt','water').remaining,3);
 assert.equal(s.inventions.egypt.scholarVisits,0);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.civilization.prestige.egypt,2);
 assert.equal(saved.civilization.patronage.egypt,c.patronage.egypt);
 assert.ok(s.log.some(x=>x.en.includes('Cultural Prestige')&&x.zh.includes('文化声望')));
});

test('documented foreign specialist needs a received lead, consent, travel and a saved identity',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=300;s.relations['egypt:senate']=80;
 const c=initializeCivilization(s);c.prestige.egypt=16;
 assert.deepEqual(knownForeignSpecialists(s,'egypt'),[]);
 assert.equal(inviteForeignSpecialist(s,'egypt','cicero').reason,'unknown');
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:'cicero',year:s.year,month:s.month,peopleNames:{cicero:['Marcus Tullius Cicero','马尔库斯·图利乌斯·西塞罗']}});
 assert.ok(knownForeignSpecialists(s,'egypt').some(x=>x.id==='cicero'));
 assert.deepEqual(specialistRoles(s,'cicero'),['statesman','scholar']);
 const old=s.factions.egypt.treasury;c.seed=0;
 assert.equal(inviteForeignSpecialist(s,'egypt','cicero').ok,true);
 assert.equal(c.prestige.egypt,8);
 assert.equal(s.factions.egypt.treasury,old-20);
 assert.equal(s.world.characters.cicero.faction,'senate');
 advance(s,1);let saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.civilization.recruitment[0].remaining,2);
 advance(saved,2);assert.equal(saved.civilization.recruitment[0].status,'travel');
 const journey=saved.civilization.recruitment[0],duration=journey.remaining;
 assert.ok(duration>2,'Rome-to-Egypt recruitment must use the long civilian route');
 assert.ok(saved.world.characters.cicero.travel.legs.some(leg=>leg.sea));
 assert.ok(journey.travelCost>3,'the receiving court pays extra for a sea passage');
 assert.equal(saved.world.characters.cicero.faction,'senate');
 advance(saved,2);assert.equal(saved.civilization.recruitment[0].status,'travel');
 saved=upgradeSave(JSON.parse(JSON.stringify(saved)));
 advance(saved,duration-2);assert.equal(saved.civilization.recruitment[0].status,'arrived');
 assert.equal(saved.world.characters.cicero.faction,'egypt');
 assert.equal(Object.keys(saved.world.characters).filter(id=>id==='cicero').length,1);
 assert.equal(startResearch(saved,'egypt','rhetorical_education').remaining,3);
});

test('reported fictional scholars can be recruited without exposing private skills or later names',()=>{
 const s=newGame('egypt');s.wars=[];s.relations['egypt:senate']=80;s.factions.egypt.treasury=300;s.civilization.prestige.egypt=16;s.civilization.seed=0;
 const id=createFictionalPerson(s,{name:['Private name','私下姓名'],faction:'senate',birthYear:-80,location:'roma',role:['Scholar','学者']});
 s.world.characters[id].education=70;
 assert.equal(knownForeignSpecialists(s,'egypt').some(x=>x.id===id),false);
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:id,year:s.year,month:s.month,peopleNames:{[id]:['Reported name','情报姓名']}});
 assert.deepEqual(knownForeignSpecialists(s,'egypt').find(x=>x.id===id).name,['Reported name','情报姓名']);
 assert.equal(inviteForeignSpecialist(s,'egypt',id).ok,true);
 const offer=s.civilization.recruitment[0];assert.deepEqual(offer.name,['Reported name','情报姓名']);
 s.world.dynasties.catalog[id].name=['Later private name','后来的私名'];
 advanceCivilization(s);advanceCivilization(s);advanceCivilization(s);
 assert.equal(offer.status,'travel');
 assert.ok(s.log.some(x=>x.en.includes('Reported name accepted')));
 assert.equal(s.log.some(x=>x.en.includes('Private name')),false);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(saved.civilization.recruitment[0].name,['Reported name','情报姓名']);
 assert.equal(saved.world.characters[id].faction,'senate');
 for(let i=0;i<30&&saved.civilization.recruitment[0].status==='travel';i++){advancePersonalDiplomacy(saved);settleRecruitmentTravel(saved)}
 assert.equal(saved.civilization.recruitment[0].status,'arrived');
 assert.equal(saved.world.characters[id].faction,'egypt');
 assert.equal(specialistRoles(saved,id).includes('scholar'),true);
});

test('a reported fictional contact without specialist skills receives a generic refusal',()=>{
 const s=newGame('egypt');s.wars=[];s.relations['egypt:senate']=80;s.factions.egypt.treasury=300;s.civilization.prestige.egypt=8;
 const id=createFictionalPerson(s,{name:['Hidden person','秘密人物'],faction:'senate',birthYear:-80,location:'roma'});
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:id,year:s.year,month:s.month,peopleNames:{[id]:['Observed person','已知人物']}});
 assert.ok(knownForeignSpecialists(s,'egypt').some(x=>x.id===id));
 assert.equal(inviteForeignSpecialist(s,'egypt',id).ok,true);
 advanceCivilization(s);advanceCivilization(s);advanceCivilization(s);
 assert.equal(s.civilization.recruitment[0].status,'refused');
 assert.ok(s.log.some(x=>x.en.includes('Observed person declined or could not travel')));
 assert.equal(s.log.some(x=>x.en.includes('Hidden person')),false);
});

test('rulers are excluded, while war and poor relations prevent recruitment without exposing hidden employment',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=300;s.civilization.prestige.egypt=20;
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:'cicero',year:s.year,month:s.month});
 assert.equal(inviteForeignSpecialist(s,'egypt','pompey').reason,'unknown');
 s.relations['egypt:senate']=-30;
 assert.equal(inviteForeignSpecialist(s,'egypt','cicero').reason,'relations');
 s.relations['egypt:senate']=30;s.wars.push(['egypt','senate']);
 assert.equal(inviteForeignSpecialist(s,'egypt','cicero').reason,'war');
 s.wars.pop();s.armies[0].characterId='cicero';
 assert.equal(inviteForeignSpecialist(s,'egypt','cicero').ok,true);
 advance(s,3);
 assert.equal(s.civilization.recruitment[0].status,'refused');
 assert.equal(s.world.characters.cicero.faction,'senate');
});

test('36 months of completed monuments and funded AI patronage persist through a save',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=400;s.factions.parthia.treasury=500;
 assert.equal(startResearch(s,'egypt','inscriptions').ok,true);
 advance(s,3);assert.ok(s.inventions.egypt.knownMaterial.includes('inscriptions'));
 assert.equal(startConstruction(s,'egypt','egyptUpper','inscriptions').ok,true);
 advance(s,2);assert.ok(s.regions.find(r=>r.id==='egyptUpper').buildings.includes('inscriptions'));
 const before=s.civilization.prestige.egypt;advance(s,36);
 assert.equal(s.civilization.prestige.egypt-before,12);
 assert.ok(Object.keys(s.civilization.patronage).some(id=>id!=='egypt'));
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.civilization.prestige.egypt,s.civilization.prestige.egypt);
 assert.ok(saved.regions.find(r=>r.id==='egyptUpper').buildings.includes('inscriptions'));
});

test('AI courts pay the same recruitment costs and only use their received leads',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['egypt:senate']=80;
 s.factions.egypt.treasury=300;s.civilization.prestige.egypt=8;
 s.inventions.egypt.research={id:'water',remaining:2};
 const before=s.factions.egypt.treasury;
 aiCivilization(s,'egypt');assert.equal(s.civilization.recruitment.length,0);
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:'cicero',year:s.year,month:s.month});
 aiCivilization(s,'egypt');assert.equal(s.civilization.recruitment[0].id,'cicero');
 assert.equal(s.civilization.prestige.egypt,0);
 assert.equal(s.factions.egypt.treasury,before-20);
});

test('AI waits a year before paying to approach the same refused foreign contact again',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['egypt:senate']=80;s.factions.egypt.treasury=300;s.civilization.prestige.egypt=8;
 s.inventions.egypt.research={id:'water',remaining:2};
 const id=createFictionalPerson(s,{name:['Untrained contact','未受训的联系人'],faction:'senate',birthYear:-80,location:'roma'});
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:id,year:s.year,month:s.month,peopleNames:{[id]:['Known contact','已知联系人']}});
 aiCivilization(s,'egypt');assert.equal(s.civilization.recruitment.length,1);
 advanceCivilization(s);advanceCivilization(s);advanceCivilization(s);
 assert.equal(s.civilization.recruitment[0].status,'refused');
 s.civilization.prestige.egypt=8;const treasury=s.factions.egypt.treasury;
 aiCivilization(s,'egypt');assert.equal(s.civilization.recruitment.length,1);
 assert.equal(s.factions.egypt.treasury,treasury);
});

test('an AI court at war reserves its treasury and research for the campaign',()=>{
 const s=newGame('caesar'),senate=s.factions.senate;
 senate.treasury=100;s.civilization.prestige.senate=8;
 const before={treasury:senate.treasury,prestige:s.civilization.prestige.senate,visits:s.inventions.senate.scholarVisits||0};
 aiCivilization(s,'senate');
 assert.deepEqual({treasury:senate.treasury,prestige:s.civilization.prestige.senate,visits:s.inventions.senate.scholarVisits||0},before);
});

test('older campaign saves gain empty Prestige without changing treasury, people or research',()=>{
 const original=newGame('senate'),before={treasury:original.factions.senate.treasury,people:original.regions.find(r=>r.id==='roma').population.total,research:JSON.stringify(original.inventions.senate)};
 delete original.civilization;
 const restored=upgradeSave(JSON.parse(JSON.stringify(original)));
 assert.equal(restored.civilization.prestige.senate,0);
 assert.equal(restored.factions.senate.treasury,before.treasury);
 assert.equal(restored.regions.find(r=>r.id==='roma').population.total,before.people);
 assert.equal(JSON.stringify(restored.inventions.senate),before.research);
});

test('ordinary monthly AI turn initiates a specialist invitation from a known lead',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['egypt:senate']=80;
 s.factions.egypt.treasury=500;s.civilization.prestige.egypt=8;
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:'cicero',year:s.year,month:s.month});
 tick(s);
 assert.deepEqual(s.civilization.recruitment.map(x=>[x.owner,x.id,x.status]),[['egypt','cicero','pending']]);
 assert.equal(s.civilization.prestige.egypt,0);
});

test('a newly hostile theater interrupts a funded specialist journey without transferring the person',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=300;s.relations['egypt:senate']=80;s.civilization.prestige.egypt=8;s.civilization.seed=0;
 s.knowledge.egypt.senate.reports.push({kind:'office_finance',value:'cicero',year:s.year,month:s.month});
 assert.equal(inviteForeignSpecialist(s,'egypt','cicero').ok,true);
 advance(s,3);
 const offer=s.civilization.recruitment[0],first=s.world.characters.cicero.travel.legs[0];
 assert.equal(offer.status,'travel');
 s.regions.find(r=>r.id===first.to).owner='caesar';
 for(let i=0;i<=first.months;i++){advancePersonalDiplomacy(s);settleRecruitmentTravel(s)}
 assert.equal(offer.status,'lost');
 assert.equal(s.world.characters.cicero.faction,'senate');
 assert.notEqual(s.world.characters.cicero.location,offer.destination);
});
