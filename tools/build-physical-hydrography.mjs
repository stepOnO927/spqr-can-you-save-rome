// Modern physical reference only: Natural Earth 1:10m, public domain.
// Pin the source revision so the bundled map can be regenerated consistently.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const revision='ca96624a56bd078437bca8184e78163e5039ad19';
const source=name=>`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/${name}.geojson`;
const bounds=[-20,18,60,58];
const coordinates=geometry=>geometry.type==='LineString'?[geometry.coordinates]:geometry.type==='MultiLineString'?geometry.coordinates:geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat(1);
const intersects=geometry=>{
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const part of coordinates(geometry))for(const [lon,lat] of part){west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat)}
 return west<=bounds[2]&&east>=bounds[0]&&south<=bounds[3]&&north>=bounds[1];
};
const round=value=>typeof value[0]==='number'?value.map(n=>Math.round(n*1e5)/1e5):value.map(round);
async function build(name,output,include){
 const response=await fetch(source(name),{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
 const original=await response.json();
 const features=original.features.filter(feature=>include(feature)&&intersects(feature.geometry)).map(feature=>({type:'Feature',properties:{name:feature.properties.name||null,rank:feature.properties.scalerank,kind:feature.properties.featurecla},geometry:{type:feature.geometry.type,coordinates:round(feature.geometry.coordinates)}}));
 const target=fileURLToPath(new URL(`../${output}`,import.meta.url));
 await writeFile(target,`// Natural Earth 1:10m modern hydrography, public domain. Source revision ${revision}.\nexport default ${JSON.stringify({type:'FeatureCollection',features})};\n`);
 console.log(`${output}: ${features.length} features`);
}
await build('ne_10m_rivers_lake_centerlines_scale_rank','mediterranean-rivers.js',feature=>['River','Lake Centerline','River (Intermittent)'].includes(feature.properties.featurecla));
await build('ne_10m_lakes','mediterranean-lakes.js',feature=>['Lake','Alkaline Lake'].includes(feature.properties.featurecla));
