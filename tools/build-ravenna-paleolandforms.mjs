// Extract the Roman-period (~100 CE) palaeolandform polygons near Ravenna.
// Source: Michele Abballe, PalaeoDEMs of the hinterland of Ravenna, CC0.
// These are beach and fluvial ridges, not a coastline or a 49 BCE land mask.
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'map-lab/source/ravenna-paleolandforms.gpkg');
const target=path.join(root,'map-lab/ravenna-paleolandforms.js');
const bytes=await readFile(source);
if(createHash('md5').update(bytes).digest('hex')!=='9cda7b41f19531f0b5fad36609746212')throw Error('Unexpected Ravenna source version');
const db=new DatabaseSync(source,{readOnly:true});
const reference=db.prepare("select srs_id,geometry_type_name from gpkg_geometry_columns where table_name='palaeoLandforms_Roman'").get();
if(reference?.srs_id!==25832||reference?.geometry_type_name!=='MULTIPOLYGON')throw Error('Unexpected Roman landform projection');

// EPSG:25832 is ETRS89 / UTM zone 32N. At this map scale its GRS80 datum is
// visually equivalent to WGS84; the conversion keeps the original geometry.
function toLonLat(easting,northing){
 const a=6378137,e2=.00669438002290,k0=.9996,ep2=e2/(1-e2),e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
 const x=easting-500000,m=northing/k0,mu=m/(a*(1-e2/4-3*e2**2/64-5*e2**3/256));
 const phi=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
 const sin=Math.sin(phi),cos=Math.cos(phi),tan=Math.tan(phi),n=a/Math.sqrt(1-e2*sin*sin),r=a*(1-e2)/(1-e2*sin*sin)**1.5,t=tan*tan,c=ep2*cos*cos,d=x/(n*k0);
 const latitude=phi-(n*tan/r)*(d*d/2-(5+3*t+10*c-4*c*c-9*ep2)*d**4/24+(61+90*t+298*c+45*t*t-252*ep2-3*c*c)*d**6/720);
 const longitude=9*Math.PI/180+(d-(1+2*t+c)*d**3/6+(5-2*c+28*t-3*c*c+8*ep2+24*t*t)*d**5/120)/cos;
 return [Number((longitude*180/Math.PI).toFixed(6)),Number((latitude*180/Math.PI).toFixed(6))];
}

function readGeometry(raw){
 const data=Buffer.from(raw),flags=data[3],envelope=(flags>>1)&7;
 if(data.toString('ascii',0,2)!=='GP'||data[2]!==0||!(flags&1)||envelope!==1)throw Error('Unsupported GeoPackage header');
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
 let at=8+32;
 const u32=()=>{const n=view.getUint32(at,true);at+=4;return n};
 const point=()=>{const x=view.getFloat64(at,true),y=view.getFloat64(at+8,true);at+=16;return toLonLat(x,y)};
 const header=kind=>{if(data[at++]!==1||u32()!==kind)throw Error(`Unexpected WKB geometry ${kind}`)};
 header(6);
 const polygons=[];
 for(let polygon=0,count=u32();polygon<count;polygon++){
  header(3);
  const rings=[];
  for(let ring=0,count=u32();ring<count;ring++){
   const coordinates=[];
   for(let i=0,count=u32();i<count;i++)coordinates.push(point());
   if(coordinates.length<4||coordinates[0][0]!==coordinates.at(-1)[0]||coordinates[0][1]!==coordinates.at(-1)[1])throw Error('Open or empty landform ring');
   rings.push(coordinates);
  }
  polygons.push(rings);
 }
 if(at!==data.length)throw Error('Unexpected trailing GeoPackage data');
 return polygons;
}

const records=db.prepare('select fid,nome,geom from palaeoLandforms_Roman order by fid').all();
if(records.length!==26)throw Error('Unexpected Roman landform count');
const features=records.map(({fid,nome,geom})=>({type:'Feature',properties:{id:fid,name:nome,kind:/beach ridge/i.test(nome)?'beach-ridge':'fluvial-ridge'},geometry:{type:'MultiPolygon',coordinates:readGeometry(geom)}}));
for(const feature of features)for(const polygon of feature.geometry.coordinates)for(const ring of polygon)for(const [lon,lat] of ring)if(lon<10.5||lon>13.5||lat<43.5||lat>45.5)throw Error('Landform outside Ravenna region');
await writeFile(target,`// Michele Abballe, PalaeoDEMs of the hinterland of Ravenna, Roman-period (~100 CE) palaeoLandforms; CC0.\n// https://doi.org/10.5281/zenodo.14534157 . Ridges are evidence, not a 49 BCE coastline.\nexport default ${JSON.stringify({type:'FeatureCollection',features})};\n`);
console.log(`Wrote ${features.length} Roman-period Ravenna landforms (${Math.round((await readFile(target)).length/1024)} KiB)`);
