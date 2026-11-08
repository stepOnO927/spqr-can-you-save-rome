import test from 'node:test';
import assert from 'node:assert/strict';
import land from '../mediterranean-land.js';
import ocean from '../mediterranean-ocean.js';

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
