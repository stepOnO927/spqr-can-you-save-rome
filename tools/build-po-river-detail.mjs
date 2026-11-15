// Rebuild the modern Po River close-view reference from the EEA EU-Hydro service.
// The public ArcGIS layers below are the Strahler 1–8 sublayers of River_Net_lines.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const service='https://image.discomap.eea.europa.eu/arcgis/rest/services/EUHydro/EUHydro_RiverNetworkDatabase/MapServer';
const bounds='7,44,13,46.5';
// Named reaches omit portions mapped as wide river polygons. RN_I_ID links
// those centerline reaches to the Po area polygons in this EU-Hydro release.
const layers=[5,6,7,8,9,10,11,12];
const common={geometry:bounds,geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',f:'geojson'};
// At the atlas's 9.2 maximum zoom, 25 m is well below a screen pixel. Keep
// every reach endpoint so neighboring EU-Hydro reaches still join exactly.
const round=point=>point.map(value=>Math.round(value*1e5)/1e5);
const simplify=line=>{
 if(line.length<=2)return line.map(round);
 const keep=new Uint8Array(line.length);keep[0]=keep[line.length-1]=1;
 const stack=[[0,line.length-1]];
 while(stack.length){
  const [start,end]=stack.pop(),a=line[start],b=line[end],dx=(b[0]-a[0])*78500,dy=(b[1]-a[1])*111000,denominator=dx*dx+dy*dy;
  let farthest=-1,best=625;
  for(let index=start+1;index<end;index++){
   const px=(line[index][0]-a[0])*78500,py=(line[index][1]-a[1])*111000,t=denominator?Math.max(0,Math.min(1,(px*dx+py*dy)/denominator)):0;
   const distance=(px-t*dx)**2+(py-t*dy)**2;
   if(distance>best){best=distance;farthest=index}
  }
  if(farthest!==-1){keep[farthest]=1;stack.push([start,farthest],[farthest,end])}
 }
 return line.filter((_,index)=>keep[index]).map(round);
};
const request=async(layer,where,extra)=>{
 const response=await fetch(`${service}/${layer}/query`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...common,where,...extra}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`EU-Hydro layer ${layer}: HTTP ${response.status}`);
 const body=await response.json();
 if(body.error)throw new Error(`EU-Hydro layer ${layer}: ${body.error.message}`);
 return body;
};
const features=[];
const poAreaIds=new Set();
for(const layer of layers){
 const named=await request(layer,"nameText = 'PO'",{outFields:'RN_I_ID',returnGeometry:'false',f:'json'});
 for(const feature of named.features||[])if(feature.attributes.RN_I_ID)poAreaIds.add(feature.attributes.RN_I_ID);
}
if(poAreaIds.size<4)throw new Error(`Expected Po area identifiers, found ${poAreaIds.size}`);
const where=`nameText = 'PO' OR RN_I_ID IN ('${[...poAreaIds].join("','")}')`;
for(const layer of layers){
 const [collection,count]=await Promise.all([
  request(layer,where,{outFields:'OBJECTID,RN_I_ID,nameText,STRAHLER',returnGeometry:'true'}),
  request(layer,where,{returnCountOnly:'true',f:'json'})
 ]);
 if(collection.type!=='FeatureCollection'||collection.features.length!==count.count||collection.exceededTransferLimit)throw new Error(`Incomplete EU-Hydro layer ${layer}: ${collection.features?.length}/${count.count}`);
 for(const feature of collection.features){
  if((feature.properties.nameText!=='PO'&&!poAreaIds.has(feature.properties.RN_I_ID))||!['LineString','MultiLineString'].includes(feature.geometry.type))throw new Error(`Unexpected Po feature in layer ${layer}`);
  const coordinateLines=feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  if(!coordinateLines.every(line=>line.length>=2&&line.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=6&&lon<=14&&lat>=43&&lat<=47)))throw new Error(`Out-of-area Po geometry ${feature.properties.RN_I_ID}`);
  features.push({type:'Feature',properties:{id:`${layer}:${feature.properties.OBJECTID}`,order:feature.properties.STRAHLER},geometry:{type:feature.geometry.type,coordinates:feature.geometry.type==='LineString'?simplify(feature.geometry.coordinates):feature.geometry.coordinates.map(simplify)}});
 }
}
if(features.length<150||new Set(features.map(feature=>feature.properties.id)).size!==features.length)throw new Error(`Unexpected or duplicate Po reaches: ${features.length}`);
features.sort((a,b)=>a.properties.id<b.properties.id?-1:a.properties.id>b.properties.id?1:0);
const target=fileURLToPath(new URL('../po-river-detail.js',import.meta.url));
await writeFile(target,`// EU-Hydro River Network Database v1.3, European Environment Agency; modern Po reaches.\n// European Union's Copernicus Land Monitoring Service information; https://doi.org/10.2909/393359a7-7ebd-4a52-80ac-1a18d5f3db9c .\n// Adapted to a named-river crop and simplified to 25 m on 2026-11-15; not a reconstruction of the ancient Padus.\nexport default ${JSON.stringify({type:'FeatureCollection',features})};\n`);
console.log(`Wrote ${features.length} Po reaches to ${target}`);
