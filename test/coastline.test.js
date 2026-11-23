import test from 'node:test';
import assert from 'node:assert/strict';
import land from '../mediterranean-land.js';
import ocean from '../mediterranean-ocean.js';
import lakes from '../mediterranean-lakes.js';
import lazioLakes from '../map-lab/lazio-lakes.js';
import fucinoLake from '../map-lab/fucino-lake.js';
import {physicalStyle} from '../map-lab/physical-style.js';
import {physicalLabels} from '../map-lab/physical-labels.js';
import {readFileSync} from 'node:fs';

const prepared=collection=>collection.features.map(feature=>{
 const rings=feature.geometry.coordinates,outer=rings[0];let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const [lon,lat] of outer){west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat)}
 return {rings,west,east,south,north};
});
const landPolygons=prepared(land),oceanPolygons=prepared(ocean);
function inRing(ring,lon,lat){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
const contains=(polygons,lon,lat)=>polygons.some(p=>lon>=p.west&&lon<=p.east&&lat>=p.south&&lat<=p.north&&inRing(p.rings[0],lon,lat)&&!p.rings.slice(1).some(r=>inRing(r,lon,lat)));

test('GSHHG modern land and sea masks agree throughout the campaign and Nile Delta',()=>{
 assert.ok(land.features.length>1300);
 const points=[];
 for(let lon=-15;lon<=55;lon+=5)for(let lat=20;lat<=55;lat+=5)points.push([lon+.17,lat+.13]);
 for(let lon=28;lon<=33;lon+=.25)for(let lat=30;lat<=32.5;lat+=.25)points.push([lon+.031,lat+.037]);
 for(const [lon,lat] of points){
  const onLand=contains(landPolygons,lon,lat),atSea=contains(oceanPolygons,lon,lat);
  assert.notEqual(onLand,atSea,`The coast masks disagree at ${lon}, ${lat}`);
 }
 assert.equal(contains(landPolygons,29.9187,31.2),true,'Alexandria remains on land');
 assert.equal(contains(oceanPolygons,30,32.5),true,'the sea north of the Nile Delta remains water');
});

test('Lazio lake names and polygons match their real locations without changing the sea mask',()=>{
 const bolsena=lakes.features.find(feature=>feature.properties.name==='Lago di Bolsena');
 assert.ok(bolsena,'the Natural Earth feature near Bolsena must carry the corrected name');
 assert.equal(lakes.features.some(feature=>feature.properties.name==='Lago di Bracciano'),false);
 assert.equal(lazioLakes.features.length,5);
 const bracciano=lazioLakes.features.find(feature=>feature.properties.name==='Lago di Bracciano');
 assert.ok(bracciano);
 assert.equal(inRing(bolsena.geometry.coordinates[0],11.928056,42.593056),true,'Bolsena follows the EU Natura 2000 location');
 assert.equal(inRing(bracciano.geometry.coordinates[0],12.2314,42.1225),true,'Bracciano follows Regione Lazio coordinates');
 assert.equal(inRing(bracciano.geometry.coordinates[0],11.928056,42.593056),false);
 for(const [name,geometry] of [['bolsena',bolsena.geometry],['bracciano',bracciano.geometry]]){
  const label=physicalLabels.find(item=>item.id===name);
  assert.ok(label?.en&&label?.zh);
  assert.equal(inRing(geometry.coordinates[0],...label.point),true,`${name} label must sit inside its lake`);
 }
 for(const feature of lazioLakes.features){
  const outer=feature.geometry.coordinates[0];
  assert.ok(outer.length>=4&&outer[0][0]===outer.at(-1)[0]&&outer[0][1]===outer.at(-1)[1]);
  const point=outer[Math.floor(outer.length/3)];
  assert.equal(contains(landPolygons,...point),true,`${feature.properties.name} must be inland`);
  assert.equal(contains(oceanPolygons,...point),false,`${feature.properties.name} must not enter the sea`);
 }
 const mapLakes=physicalStyle.sources.lakes.data.features;
 assert.equal(mapLakes.length,lakes.features.length+lazioLakes.features.length,'the atlas actually receives the missing lake polygons');
 assert.match(physicalStyle.sources.lakes.attribution,/OpenStreetMap contributors, ODbL 1\.0/);
 const original=JSON.parse(readFileSync(new URL('../map-lab/source/osm-lazio-lakes.geojson',import.meta.url),'utf8'));
 const ringArea=ring=>Math.abs(ring.reduce((sum,point,i)=>{const next=ring[(i+1)%ring.length];return sum+point[0]*next[1]-next[0]*point[1]},0)/2);
 const area=feature=>ringArea(feature.geometry.coordinates[0])-feature.geometry.coordinates.slice(1).reduce((sum,ring)=>sum+ringArea(ring),0);
 for(const feature of lazioLakes.features){
  const source=original.features.find(item=>item.properties.osmId===feature.properties.osmId);
  assert.ok(source);
  assert.ok(Math.abs(area(feature)/area(source)-1)<.03,`${feature.properties.name} simplification changed lake area too much`);
 }
});

test('approximate Lacus Fucinus restores a historical inland lake without changing the modern coast',()=>{
 assert.equal(fucinoLake.features.length,1);
 const feature=fucinoLake.features[0],label=physicalLabels.find(item=>item.id==='fucinus');
 assert.equal(feature.properties.kind,'approximate historical lake');
 assert.equal(feature.properties.referenceLevelMeters,660);
 assert.ok(feature.properties.approximateAreaKm2>110&&feature.properties.approximateAreaKm2<150);
 assert.equal(inRing(feature.geometry.coordinates[0],13.547222,41.995),true);
 assert.ok(label?.en.includes('approx.')&&label?.zh.includes('约略'));
 assert.equal(inRing(feature.geometry.coordinates[0],...label.point),true);
 assert.equal(inRing(feature.geometry.coordinates[0],13.42,42.03),false,'Avezzano remains outside the illustrative lake');
 for(const ring of feature.geometry.coordinates){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1))}
 assert.equal(contains(landPolygons,...label.point),true);
 assert.equal(contains(oceanPolygons,...label.point),false);
 assert.deepEqual(physicalStyle.sources['fucino-lake'].data,fucinoLake);
 assert.ok(physicalStyle.layers.some(layer=>layer.id==='fucino-historical-fill'&&layer.source==='fucino-lake'));
 assert.ok(physicalStyle.layers.some(layer=>layer.id==='fucino-historical-shore'&&layer.paint['line-dasharray']));
});
