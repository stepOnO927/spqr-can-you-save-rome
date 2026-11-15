// Bundle the modern Garda shoreline from the EEA EU-Hydro InlandWater layer.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const service='https://image.discomap.eea.europa.eu/arcgis/rest/services/EUHydro/EUHydro_RiverNetworkDatabase/MapServer/3/query';
const params=new URLSearchParams({where:"NAM = 'LAGO DI GARDA'",geometry:'10.4,45.4,11,46.2',geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'OBJECTID,NAM,Shape_Area',returnGeometry:'true',f:'geojson'});
const response=await fetch(service,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params,signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`EU-Hydro Garda: HTTP ${response.status}`);
const body=await response.json();
if(body.error||body.type!=='FeatureCollection'||body.features?.length!==1)throw new Error(`Unexpected EU-Hydro Garda response: ${JSON.stringify(body.error||body.features?.length)}`);
const feature=body.features[0],rings=feature.geometry?.coordinates;
if(feature.geometry.type!=='Polygon'||rings.length<1||rings[0].length<1000||feature.properties.NAM!=='LAGO DI GARDA'||feature.properties.Shape_Area<700e6)throw new Error('Unexpected Garda geometry or attributes');
for(const ring of rings){
 if(ring.length<4||!ring.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=10.3&&lon<=11.1&&lat>=45.3&&lat<=46.3))throw new Error('Garda ring extends outside expected area');
}
const round=point=>point.map(value=>Math.round(value*1e5)/1e5);
const collection={type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Lago di Garda'},geometry:{type:'Polygon',coordinates:rings.map(ring=>ring.map(round))}}]};
const target=fileURLToPath(new URL('../garda-lake-detail.js',import.meta.url));
await writeFile(target,`// EU-Hydro River Network Database v1.3, European Environment Agency; modern Garda shoreline.\n// European Union's Copernicus Land Monitoring Service information; https://doi.org/10.2909/393359a7-7ebd-4a52-80ac-1a18d5f3db9c .\n// Adapted to one named lake on 2026-11-15; not a reconstruction of the ancient Benacus.\nexport default ${JSON.stringify(collection)};\n`);
console.log(`Wrote Garda shoreline: ${rings.length} rings, ${rings.reduce((sum,ring)=>sum+ring.length,0)} points`);
