import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region} from '../engine.js?v=dossier-archive-1';
import {renderTerritoryFacts} from '../map-lab/territory-facts.js?v=calendar-1';

test('territory record uses the actual friendly garrison and local food potential', () => {
 const s = newGame('caesar'), r = region(s, 'cisalpine');
 const html = renderTerritoryFacts({state:s,territory:r,language:'en'});
 const men = s.armies.filter(a => a.owner === s.player && a.region === r.id).reduce((sum,a) => sum + a.men,0);
 assert.match(html,new RegExp(men.toLocaleString()));
 assert.match(html,new RegExp(`Food potential</span><b>${r.food}`));
 assert.match(html,new RegExp(`Simulated population</span><b>${r.population.total.toLocaleString()}`));
 assert.match(html,/Buildings and construction queue<\/span><b>None/);
});

test('foreign territory details hide actual resources and army strength', () => {
 const s = newGame('caesar'), r = region(s, 'roma');
 const html = renderTerritoryFacts({state:s,territory:r,language:'zh',sightings:[{region:r.id,name:['Reported force','报告军'],year:-49,month:1,men:9876}]});
 assert.match(html,/粮食潜力<\/span><b>未知/);
 assert.match(html,/报告军/);
 assert.match(html,/兵力未知/);
 assert.doesNotMatch(html,/9876/);
 assert.doesNotMatch(html,new RegExp(`粮食潜力</span><b>${r.food}`));
 assert.match(html,/估算人口<\/span><b>未知/);assert.doesNotMatch(html,new RegExp(r.population.total.toLocaleString()));
});
test('theater record shows dated local migration in both languages without leaking foreign movement',()=>{
 const s=newGame('caesar');s.world.populationMigrations=[{from:'gaul',to:'narbo',count:237,year:-49,month:12}];
 const origin=renderTerritoryFacts({state:s,territory:region(s,'gaul'),language:'en'});
 const destination=renderTerritoryFacts({state:s,territory:region(s,'narbo'),language:'zh'});
 assert.match(origin,/Recent migration<\/span><b>237 people · left for Narbonensis · 12\/49 BCE/);
 assert.match(destination,/最近迁徙<\/span><b>237人 · 来自远高卢 · 公元前49年12月/);
 s.player='senate';const foreign=renderTerritoryFacts({state:s,territory:region(s,'gaul'),language:'en'});
 assert.match(foreign,/Recent migration<\/span><b>Unknown/);assert.doesNotMatch(foreign,/237 people/);
});
