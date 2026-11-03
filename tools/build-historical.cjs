const fs=require('fs');
const pc=require('polygon-clipping');
const all=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const awmc=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const names={'Ptolemaic Kingdom':'egypt','Kingdom of Numidia':'numidia','Mauretania':'mauretania','Kingdom of Armenia':'armenia','Parthian Empire':'parthia'};
const selected=all.features.filter(f=>f.properties.FromYear<=-49&&f.properties.ToYear>=-49&&(names[f.properties.Name]||f.properties.Name==='Roman Republic'));
const multi=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const roman=multi(selected.find(f=>f.properties.Name==='Roman Republic').geometry);
const groups={italy:[],narbo:[],greece:[],hispania:[],asia:[],syria:[],sicilia:[],africa:[]};
function group(f){const raw=JSON.stringify(f.geometry.coordinates).match(/-?\d+(?:\.\d+)?/g).map(Number);const xs=raw.filter((_,i)=>i%2===0),ys=raw.filter((_,i)=>i%2);let x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;const id=f.properties.OBJECTID;
  if([14,39,45].includes(id))return 'italy';if(id===18)return 'narbo';if(id===26)return 'greece';if([33,57].includes(id))return 'hispania';if([44,50].includes(id))return 'asia';if(id===122)return 'syria';if(id===77)return 'sicilia';if([79,90].includes(id))return 'africa';
  if(y<34&&x>12)return 'africa';if(x>34)return 'syria';if(x>25)return 'asia';if(x>18)return 'greece';if(x>7&&y<39)return y>37?'sicilia':'africa';if(x>7)return 'italy';if(y>42&&x>2)return 'narbo';return 'hispania';}
for(const f of awmc.features)groups[group(f)].push(multi(f.geometry));
const territory=[{id:'roman-extent',regions:[],geometry:{type:'MultiPolygon',coordinates:roman},source:'Cliopatria v0.2.1',period:[-49,-49],name:'Roman Republic'}];const definitions={italy:['cisalpine','italiaN','roma','italiaS'],narbo:['narbo'],greece:['epirus','achaia'],hispania:['hispaniaN','hispaniaS'],asia:['anatolia'],syria:['syria'],sicilia:['sicilia'],africa:['africa']};
let core=[];
for(const [id,polys] of Object.entries(groups)){const merged=pc.union(...polys);const clipped=pc.intersection(merged,roman);if(clipped.length){territory.push({id,regions:definitions[id],geometry:{type:'MultiPolygon',coordinates:clipped},source:'AWMC c.60 BCE intersected with Cliopatria 49 BCE'});core.push(clipped)}}
const remainder=pc.difference(roman,pc.union(...core));
// Only the northwestern components are assigned to Further Gaul. Other unmatched
// components remain neutral on the map rather than being given invented borders.
const gaul=remainder.filter(poly=>{let pts=poly[0],xs=pts.map(x=>x[0]),ys=pts.map(x=>x[1]);let cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;return cx<8&&cy>43});
if(gaul.length)territory.push({id:'gaul',regions:['gaul'],geometry:{type:'MultiPolygon',coordinates:gaul},source:'Cliopatria 49 BCE, excluding AWMC c.60 BCE Roman core'});
for(const f of selected.filter(f=>names[f.properties.Name]))territory.push({id:names[f.properties.Name],regions:[names[f.properties.Name]],geometry:f.geometry,source:'Cliopatria v0.2.1',period:[f.properties.FromYear,f.properties.ToYear],name:f.properties.Name});
const output={type:'FeatureCollection',features:territory.map(t=>({type:'Feature',properties:{id:t.id,regions:t.regions,source:t.source,period:t.period||null,name:t.name||null},geometry:t.geometry}))};
fs.writeFileSync(process.argv[4] || 'historical-territories.js','export default '+JSON.stringify(output,(k,v)=>typeof v==='number'?Number(v.toFixed(4)):v)+';');
console.log('Territories:',territory.map(t=>`${t.id}:${t.regions.join(',')}`).join(' | '));

