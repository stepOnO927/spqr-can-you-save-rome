// Make a small, explicitly approximate ancient-world shore reference for the
// Po plain. It does not replace the modern physical land/sea mask.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const source=JSON.parse(await readFile(path.join(root,'map-lab/source/awmc-po-shore.geojson'),'utf8'));
const original=source.features?.[0];
if(source.features?.length!==1||original.properties?.sourceObjectId!==7879||original.properties?.approximate!==true||original.properties?.timePeriod!==null)throw Error('Unexpected AWMC Po shoreline crop');
const line=original.geometry?.coordinates;
if(original.geometry?.type!=='LineString'||line.length!==111)throw Error('Unexpected AWMC Po shoreline points');
const data={type:'FeatureCollection',features:[
 {type:'Feature',properties:{kind:'historical-shore',approximate:true,timePeriod:null},geometry:{type:'LineString',coordinates:line}}
]};
const target=path.join(root,'po-historic-coast.js');
await writeFile(target,`// Adapted from AWMC geodata shoreline, ODbL 1.0; source OBJECTID 7879.\n// The line is undated and approximate, not a surveyed 49 BCE coast.\nexport default ${JSON.stringify(data)};\n`);
console.log(`Wrote ${target}: ${line.length} historical-shore points`);
