import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {startResearch,startConstruction} from '../inventions.js';
import {initializeCivilization,commissionCulturalEvent,fundEducation,knownForeignSpecialists,inviteForeignSpecialist,specialistRoles,aiCivilization} from '../civilization.js';

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
 advance(s,1);const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.civilization.recruitment[0].remaining,2);
 advance(saved,2);assert.equal(saved.civilization.recruitment[0].status,'travel');
 assert.equal(saved.world.characters.cicero.faction,'senate');
 advance(saved,2);assert.equal(saved.civilization.recruitment[0].status,'arrived');
 assert.equal(saved.world.characters.cicero.faction,'egypt');
 assert.equal(Object.keys(saved.world.characters).filter(id=>id==='cicero').length,1);
 assert.equal(startResearch(saved,'egypt','rhetorical_education').remaining,3);
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

test('36 months of completed monuments and AI patronage persist through a save',()=>{
 const s=newGame('egypt');s.factions.egypt.treasury=400;
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
