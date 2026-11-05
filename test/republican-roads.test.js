import test from 'node:test';
import assert from 'node:assert/strict';
import roads from '../republican-roads.js';

test('the sourced subset contains only the documented Republican-era road selections',()=>{
 assert.equal(roads.type,'FeatureCollection');
 assert.deepEqual(roads.features.map(f=>f.properties.id),[637,1467,1480,1550]);
 assert.deepEqual([...new Set(roads.features.map(f=>f.properties.name))].sort(),['Via Aemilia','Via Appia','Via Flaminia']);
 for(const f of roads.features){assert.equal(f.geometry.type,'MultiLineString');assert.ok(f.properties.source);for(const line of f.geometry.coordinates){assert.ok(line.length>=2);for(const [lon,lat] of line)assert.ok(lon>=9&&lon<=15&&lat>=40&&lat<=46)}}
});
test('named routes reach their documented approximate terminal areas',()=>{
 const points=name=>roads.features.filter(f=>f.properties.name===name).flatMap(f=>f.geometry.coordinates.flat());
 const near=(coordinates,lon,lat)=>coordinates.some(p=>Math.hypot(p[0]-lon,p[1]-lat)<.25);
 assert.ok(near(points('Via Flaminia'),12.4964,41.9028));assert.ok(near(points('Via Flaminia'),12.5683,44.0678));
 assert.ok(near(points('Via Aemilia'),12.5683,44.0678));assert.ok(near(points('Via Aemilia'),9.69,45.05));
 assert.ok(near(points('Via Appia'),12.4964,41.9028));assert.ok(near(points('Via Appia'),14.2,41.12));
});
