import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,region} from '../engine.js?v=frontier-response-1';
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
