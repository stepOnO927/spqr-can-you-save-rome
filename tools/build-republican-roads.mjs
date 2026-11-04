// Derive a small, auditable named-road subset from AWMC's ODbL GeoJSON.
// Usage: node tools/build-republican-roads.mjs roads.geojson republican-roads.js
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Expected source and output paths');
const bytes=await readFile(input),sha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
if(sha!=='e5b53dfb7aab621eb25d31d66457562240524ff2')throw Error('AWMC source differs from the documented blob; review before updating');
const data=JSON.parse(bytes),selected=new Map([[637,'Via Appia'],[1467,'Via Aemilia'],[1480,'Via Flaminia'],[1550,'Via Flaminia']]);
const round=coords=>Array.isArray(coords[0])?coords.map(round):coords.map(n=>Math.round(n*100000)/100000);
const features=data.features.filter(f=>selected.has(f.properties.OBJECTID)).map(f=>{
 const name=selected.get(f.properties.OBJECTID),sourceName=String(f.properties.Name||'').replaceAll('_',' ');
 if(sourceName!==name||!['LineString','MultiLineString'].includes(f.geometry.type))throw Error('Unexpected road identity or geometry');
 return {type:'Feature',properties:{id:f.properties.OBJECTID,name,source:f.properties.Source,sourcePeriod:f.properties.timeperiod},geometry:{type:f.geometry.type,coordinates:round(f.geometry.coordinates)}};
}).sort((a,b)=>a.properties.id-b.properties.id);
if(features.length!==selected.size)throw Error('Missing expected road features');
await writeFile(output,`// Derived from AWMC road data, ODbL 1.0; see map-lab/SOURCES.md.\nexport default ${JSON.stringify({type:'FeatureCollection',features})};\n`);

