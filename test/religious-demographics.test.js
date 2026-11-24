import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,region} from '../engine.js?v=faces-name-disagreement-1';
import {advanceReligion,religiousPolicy} from '../religion.js?v=faces-name-disagreement-1';
import {TRADITIONS,dominantTradition,startingTraditions} from '../religious-demographics.js';
import {renderTerritoryFacts} from '../map-lab/territory-facts.js?v=calendar-1';

test('all campaign theaters have plausible game tradition weights and keep them in saves',()=>{
 const state=newGame('caesar');
 assert.ok(state.regions.length>=24);
 for(const theater of state.regions){
  const shares=theater.population.traditions;
  assert.ok(shares, theater.id);
  assert.equal(Object.values(shares).reduce((sum,share)=>sum+share,0),100,theater.id);
  assert.ok(Object.keys(shares).every(id=>TRADITIONS[id]&&shares[id]>0),theater.id);
 }
 assert.deepEqual(startingTraditions('egypt'),{egyptian:45,greek:40,jewish:15});
 const egypt=region(state,'egypt');
 egypt.population.traditions={egyptian:60,greek:30,jewish:10};
 const reloaded=upgradeSave(structuredClone(state));
 assert.deepEqual(region(reloaded,'egypt').population.traditions,egypt.population.traditions);
 const legacy=structuredClone(state);
 delete region(legacy,'egyptUpper').population.traditions;
 assert.deepEqual(region(upgradeSave(legacy),'egyptUpper').population.traditions,startingTraditions('egyptUpper'));
});

test('migration changes destination traditions while keeping local estimates private',()=>{
 const state=newGame('caesar'),from=region(state,'gaul'),to=region(state,'narbo');
 from.population.satisfaction=10;to.population.satisfaction=90;state.factions.caesar.food=100;state.month=12;
 const before=to.population.traditions.gallic,combined=from.population.total+to.population.total;
 advanceReligion(state);
 assert.ok(to.population.traditions.gallic>before);
 assert.equal(from.population.total+to.population.total,Math.round((combined-to.population.baseline)*.998)+Math.round(to.population.baseline*1.002));
 assert.equal(dominantTradition([region(state,'egyptUpper')]),'egyptian');
 const own=renderTerritoryFacts({state,territory:to,language:'en'});
 assert.match(own,/Religious traditions \(game estimate\)<\/span><b>Gallic local traditions/);
 state.player='senate';
 const foreign=renderTerritoryFacts({state,territory:to,language:'zh'});
 assert.match(foreign,/宗教传统（游戏估算）<\/span><b>未知/);
 assert.doesNotMatch(foreign,/高卢地方传统/);
});

test('tolerance responds more to mixed communities without changing policy cost',()=>{
 const state=newGame('egypt'),temple=state.world.religiousInstitutions.find(item=>item.id==='theban_temples'),thebes=region(state,'egyptUpper');
 thebes.population.satisfaction=50;
 const firstCash=state.factions.egypt.treasury;
 assert.ok(religiousPolicy(state,'egypt',temple.id,'tolerance').ok);
 const homogeneousGain=thebes.population.satisfaction-50;
 assert.equal(state.factions.egypt.treasury,firstCash-6);
 thebes.population.traditions={egyptian:40,greek:40,jewish:20};
 thebes.population.satisfaction=50;
 assert.ok(religiousPolicy(state,'egypt',temple.id,'tolerance').ok);
 assert.ok(thebes.population.satisfaction-50>homogeneousGain);
});
