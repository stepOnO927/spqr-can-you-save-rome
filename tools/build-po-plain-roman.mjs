// Convert Brandolini's CC0 Roman-period drainage traces into a compact map layer.
// The dataset spans the 2nd century BCE to the 5th century CE; these are not
// asserted 49 BCE canals, or an ancient land/sea mask.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import shapefile from 'shapefile';
import proj4 from 'proj4';

const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'map-lab/source/po-plain-roman');
const target=path.join(root,'map-lab/po-plain-roman.js');
const shp=path.join(dir,'roman_age_chs.shp'),dbf=path.join(dir,'roman_age_chs.dbf');
const expected={
 shp:'5258f8c44a7e5a7545dfea2bd8b5777100d7e139711b0ca7884c015afa73f5a0',
 dbf:'9c1dd3074da7c8bc84389990f61d98956df62446ec9be070fc7b575f899e38f4'
};
for(const [file,hash] of [[shp,expected.shp],[dbf,expected.dbf]]){
 const actual=createHash('sha256').update(await readFile(file)).digest('hex');
 if(actual!==hash)throw Error(`Unexpected Po source checksum: ${path.basename(file)}`);
}
if(!(await readFile(path.join(dir,'roman_age_chs.prj'),'utf8')).includes('WGS_1984_UTM_Zone_32N'))throw Error('Unexpected Po source projection');

const reader=await shapefile.open(shp,dbf),features=[];
for(;;){
 const {done,value}=await reader.read();
 if(done)break;
 if(value.geometry?.type!=='LineString'||!Number.isInteger(value.properties?.ID))throw Error('Unexpected Roman drainage feature');
 const coordinates=value.geometry.coordinates.map(point=>proj4('EPSG:32632','EPSG:4326',point).map(n=>Number(n.toFixed(5))));
 for(const [lon,lat] of coordinates)if(lon<10.3||lon>11.1||lat<44.55||lat>45.05)throw Error('Roman drainage feature outside the study area');
 features.push({type:'Feature',properties:{id:value.properties.ID},geometry:{type:'LineString',coordinates}});
}
if(features.length!==163)throw Error(`Expected 163 Roman drainage traces, found ${features.length}`);
const collection={type:'FeatureCollection',features};
await writeFile(target,`// Filippo Brandolini, Central Po Plain Roman-period drainage traces, CC0.\n// DOI 10.7910/DVN/JSYZ3H. Broadly dated 2nd c. BCE–5th c. CE; not a 49 BCE reconstruction.\nexport default ${JSON.stringify(collection)};\n`);
console.log(`Wrote ${features.length} Roman-period Po drainage traces`);
