// Rebuild two modern river centerlines used only as close-map geography.
// OpenStreetMap geometry is not a reconstruction of the rivers in 49 BCE.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sources=[
 {name:'Marecchia',file:'osm-marecchia.geojson',sha256:'45a52cf257c11e9530dc77f1ae7cebcba5ccf7691b1d80607d6e88da3828bfc1',minLength:1300},
 {name:'Savio',file:'osm-savio.geojson',sha256:'964fd38d9dee2d5f065a4e8110956ddf9cd6e8e0a6e57c334a7869e5648052e5',minLength:1700}
];
const round=point=>point.map(value=>Math.round(value*1e5)/1e5);
function simplify(line){
 const keep=new Uint8Array(line.length);keep[0]=keep[line.length-1]=1;
 const stack=[[0,line.length-1]];
 while(stack.length){
  const [start,end]=stack.pop(),a=line[start],b=line[end],dx=(b[0]-a[0])*80000,dy=(b[1]-a[1])*111000,denominator=dx*dx+dy*dy;
  let farthest=-1,best=625;
  for(let index=start+1;index<end;index++){
   const px=(line[index][0]-a[0])*80000,py=(line[index][1]-a[1])*111000,t=denominator?Math.max(0,Math.min(1,(px*dx+py*dy)/denominator)):0;
   const distance=(px-t*dx)**2+(py-t*dy)**2;
   if(distance>best){best=distance;farthest=index}
  }
  if(farthest!==-1){keep[farthest]=1;stack.push([start,farthest],[farthest,end])}
 }
 return line.filter((_,index)=>keep[index]).map(round);
}
const features=[];
for(const source of sources){
 const path=fileURLToPath(new URL(`../map-lab/source/${source.file}`,import.meta.url));
 const bytes=await readFile(path),digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==source.sha256)throw Error(`${source.name} source checksum changed`);
 const geometry=JSON.parse(bytes.toString('utf8'));
 if(geometry.type!=='MultiLineString'||!Array.isArray(geometry.coordinates))throw Error(`Unexpected ${source.name} geometry`);
 const main=geometry.coordinates.reduce((longest,line)=>line.length>longest.length?line:longest,[]);
 if(main.length<source.minLength||!main.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=11.5&&lon<=13&&lat>=43.5&&lat<=44.5))throw Error(`Unexpected ${source.name} main course`);
 features.push({type:'Feature',properties:{name:source.name,modern:true},geometry:{type:'LineString',coordinates:simplify(main)}});
}
const target=fileURLToPath(new URL('../ariminum-rivers.js',import.meta.url));
await writeFile(target,`// Modern Marecchia and Savio centerlines, adapted from OpenStreetMap contributors (ODbL 1.0).\n// Source snapshots and provenance: map-lab/source/README.md. Not surveyed 49 BCE courses.\nexport default ${JSON.stringify({type:'FeatureCollection',features})};\n`);
console.log(`Wrote ${features.map(feature=>`${feature.properties.name} ${feature.geometry.coordinates.length}`).join(', ')} points to ${target}`);
