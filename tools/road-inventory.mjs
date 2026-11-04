import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const url='https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/roads/roads.geojson';
const res=await fetch(url);if(!res.ok)throw Error('Road data HTTP '+res.status);
await writeFile('/tmp/awmc-roads.geojson',Buffer.from(await res.arrayBuffer()));
execFileSync('node',['tools/build-republican-roads.mjs','/tmp/awmc-roads.geojson','/tmp/republican-roads.js'],{stdio:'inherit'});
const output=await readFile('/tmp/republican-roads.js');console.log('ROAD_DATA:'+output.toString('base64'));
