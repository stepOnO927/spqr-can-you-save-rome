// Rebuild two modern river centerlines for the close atlas from EU-Hydro v1.3.
// The ancient Tiberis and Arnus are identified independently in Pleiades;
// these 2006–2012 geometries do not reconstruct their Republican courses.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const service='https://image.discomap.eea.europa.eu/arcgis/rest/services/EUHydro/EUHydro_RiverNetworkDatabase/MapServer';
const layers=[5,6,7,8,9,10,11,12],bounds='9.5,41,14,44.5';
const rivers=[{id:'tiber',named:"nameText LIKE 'TEVERE%' OR nameText LIKE 'FIUME TEVERE%'"},{id:'arno',named:"nameText LIKE 'FIUME ARNO%' OR nameText = 'ARNO'"}];
const common={geometry:bounds,geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects'};
const request=async(layer,where,extra={})=>{
 const response=await fetch(`${service}/${layer}/query`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...common,where,...extra}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`EU-Hydro layer ${layer}: HTTP ${response.status}`);
 const body=await response.json();if(body.error)throw Error(`EU-Hydro layer ${layer}: ${body.error.message}`);return body;
};
const round=point=>point.map(value=>Math.round(value*1e5)/1e5);
const simplify=line=>{
 if(line.length<=2)return line.map(round);
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
};
const features=[];
for(const river of rivers){
 const areaIds=new Set();
 for(const layer of layers){
  const named=await request(layer,`(${river.named})`,{outFields:'RN_I_ID',returnGeometry:'false',f:'json'});
  if(named.exceededTransferLimit)throw Error(`Incomplete named ${river.id} reaches in layer ${layer}`);
  for(const feature of named.features||[])if(feature.attributes.RN_I_ID)areaIds.add(feature.attributes.RN_I_ID);
 }
 if(areaIds.size<2)throw Error(`Expected several ${river.id} area identifiers, found ${areaIds.size}`);
 const where=`(${river.named}) OR RN_I_ID IN ('${[...areaIds].join("','")}')`;
 for(const layer of layers){
  const [collection,count]=await Promise.all([
   request(layer,where,{outFields:'OBJECTID,RN_I_ID,nameText,STRAHLER',returnGeometry:'true',f:'geojson'}),
   request(layer,where,{returnCountOnly:'true',f:'json'})
  ]);
  if(collection.type!=='FeatureCollection'||collection.exceededTransferLimit||collection.features.length!==count.count)throw Error(`Incomplete ${river.id} layer ${layer}: ${collection.features?.length}/${count.count}`);
  for(const feature of collection.features){
   if(!['LineString','MultiLineString'].includes(feature.geometry.type))throw Error(`Unexpected ${river.id} geometry`);
   const lines=feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates;
   if(!lines.every(line=>line.length>=2&&line.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=9&&lon<=14.5&&lat>=40.5&&lat<=45)))throw Error(`Out-of-area ${river.id} geometry`);
   features.push({type:'Feature',properties:{id:`${river.id}:${layer}:${feature.properties.OBJECTID}`,river:river.id,order:feature.properties.STRAHLER},geometry:{type:feature.geometry.type,coordinates:feature.geometry.type==='LineString'?simplify(feature.geometry.coordinates):feature.geometry.coordinates.map(simplify)}});
  }
 }
 if(features.filter(feature=>feature.properties.river===river.id).length<40)throw Error(`Too few ${river.id} reaches`);
}
if(new Set(features.map(feature=>feature.properties.id)).size!==features.length)throw Error('Duplicate EU-Hydro reach');
features.sort((a,b)=>a.properties.id.localeCompare(b.properties.id));
const target=fileURLToPath(new URL('../central-italy-rivers.js',import.meta.url));
await writeFile(target,`// EU-Hydro River Network Database v1.3, European Environment Agency; modern Tiber and Arno centerlines.\n// European Union's Copernicus Land Monitoring Service information; https://doi.org/10.2909/393359a7-7ebd-4a52-80ac-1a18d5f3db9c .\n// Adapted named-river crops, simplified to 25 m; not reconstructed ancient courses.\nexport default ${JSON.stringify({type:'FeatureCollection',features})};\n`);
console.log(`Wrote ${features.length} modern Tiber and Arno reaches to ${target}`);
