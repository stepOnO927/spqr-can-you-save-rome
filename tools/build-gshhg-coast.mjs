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
const collection=parts=>({type:'FeatureCollection',features:parts.map((coordinates,id)=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates}}))});
for(const [name,parts] of [['land',polygons],['ocean',ocean]]){
 const target=path.join(root,`mediterranean-${name}.js`);
 await writeFile(target,`// GSHHG 2.3.7 high-resolution L1 shorelines, LGPL; cropped to the campaign region.\nexport default ${JSON.stringify(collection(parts))};\n`);
 console.log(name,parts.length,Math.round((await readFile(target)).length/1024)+' KiB');
}
