// Derive matching Mediterranean land and ocean masks from GSHHG 2.3.7 L1 polygons.
// Source service: https://services7.arcgis.com/WSiUmUhlFx4CtMBB/ArcGIS/rest/services/GSHHS_GlobalCoastlines_HighResolution/FeatureServer/0
// GSHHG is LGPL licensed; retain its attribution in map-lab/SOURCES.md.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';

const root=path.resolve(import.meta.dirname,'..');
const bounds=[-20,18,60,58];
const rectangle=[[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]],[bounds[0],bounds[1]]]];
// The checked-in source crop was fetched with the documented ArcGIS query and
// compressed without changing its coordinates. Builds need no network access.
const input=process.env.SPQR_GSHHG_INPUT||path.join(root,'map-lab/source/gshhg-mediterranean.geojson.gz');
const bytes=await readFile(input),source=JSON.parse(input.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8'));
if(source.type!=='FeatureCollection'||source.features.length!==1365)throw new Error('Unexpected GSHHG coastline source');
const polygons=[];
for(const feature of source.features){
 const parts=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 for(const part of parts){
  const clipped=polygonClipping.intersection(part,rectangle);
  for(const polygon of clipped)polygons.push(polygon);
 }
}
if(polygons.length<1000)throw new Error('GSHHG clipping discarded too many islands');
const ocean=polygonClipping.difference(rectangle,...polygons);
// GeoJSON tilers can triangulate the 85,000-vertex sea polygon across an
// interior land ring. Split the already-computed complement into small cells
// before MapLibre tiles it; land and sea still derive from the same shoreline.
const oceanCells=[];
const cellSize=4;
const oceanBounds=ocean.map(polygon=>polygon[0].reduce((box,[x,y])=>[Math.min(box[0],x),Math.min(box[1],y),Math.max(box[2],x),Math.max(box[3],y)],[Infinity,Infinity,-Infinity,-Infinity]));
for(let west=bounds[0];west<bounds[2];west+=cellSize)for(let south=bounds[1];south<bounds[3];south+=cellSize){
 const east=Math.min(bounds[2],west+cellSize),north=Math.min(bounds[3],south+cellSize);
 const cell=[[[west,south],[east,south],[east,north],[west,north],[west,south]]];
 for(let i=0;i<ocean.length;i++){
  const [minX,minY,maxX,maxY]=oceanBounds[i];
  if(maxX<west||minX>east||maxY<south||minY>north)continue;
  oceanCells.push(...polygonClipping.intersection(ocean[i],cell));
 }
}
const collection=parts=>({type:'FeatureCollection',features:parts.map((coordinates,id)=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates}}))});
for(const [name,parts] of [['land',polygons],['ocean',oceanCells]]){
 const target=path.join(root,`mediterranean-${name}.js`);
 await writeFile(target,`// GSHHG 2.3.7 high-resolution L1 shorelines, LGPL; cropped to the campaign region.\nexport default ${JSON.stringify(collection(parts))};\n`);
 console.log(name,parts.length,Math.round((await readFile(target)).length/1024)+' KiB');
}
