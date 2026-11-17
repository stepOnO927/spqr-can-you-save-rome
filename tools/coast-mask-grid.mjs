import land from '../mediterranean-land.js';
import ocean from '../mediterranean-ocean.js';

const bounded=collection=>collection.features.flatMap(feature=>{
 const geometry=feature.geometry,polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 return polygons.map(rings=>({rings,box:rings[0].reduce((b,[x,y])=>[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)],[Infinity,Infinity,-Infinity,-Infinity])}));
});
const insideRing=(ring,x,y)=>{
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
};
const contains=(polygons,x,y)=>polygons.some(({rings,box})=>x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3]&&insideRing(rings[0],x,y)&&!rings.slice(1).some(r=>insideRing(r,x,y)));
const landPolygons=bounded(land),seaPolygons=bounded(ocean);

export function auditCoastGrid({west,south,east,north,step}){
 let samples=0,landSamples=0,overlaps=0,gaps=0;
 for(let x=west;x<east;x+=step)for(let y=south;y<north;y+=step){
  const onLand=contains(landPolygons,x,y),atSea=contains(seaPolygons,x,y);
  if(onLand)landSamples++;
  if(onLand&&atSea)overlaps++;
  if(!onLand&&!atSea)gaps++;
  samples++;
 }
 return {samples,landSamples,seaSamples:samples-landSamples,overlaps,gaps};
}
