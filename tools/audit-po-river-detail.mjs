// Inspect continuity of the bundled modern Po close-view linework.
import po from '../po-river-detail.js';
import assert from 'node:assert/strict';

const lines=po.features.flatMap(feature=>(feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates).map(coordinates=>({coordinates,id:feature.properties.id})));
const parent=lines.map((_,index)=>index);
const find=index=>parent[index]===index?index:parent[index]=find(parent[index]);
const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
const meters=(a,b)=>Math.hypot((a[0]-b[0])*78500,(a[1]-b[1])*111000);
for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
 const a=lines[i].coordinates,b=lines[j].coordinates;
 if(Math.min(meters(a[0],b[0]),meters(a[0],b.at(-1)),meters(a.at(-1),b[0]),meters(a.at(-1),b.at(-1)))<75)join(i,j);
}
const groups=new Map();
for(let i=0;i<lines.length;i++){
 const key=find(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(lines[i]);
}
const summary=[...groups.values()].map(group=>{
 const points=group.flatMap(line=>line.coordinates);
 return {reaches:group.length,minLon:Math.min(...points.map(point=>point[0])),maxLon:Math.max(...points.map(point=>point[0])),minLat:Math.min(...points.map(point=>point[1])),maxLat:Math.max(...points.map(point=>point[1]))};
}).sort((a,b)=>b.reaches-a.reaches);
assert.ok(lines.length>=900,'Local Po source must contain the selected EU-Hydro river reaches');
assert.ok(summary[0].reaches/lines.length>.95,'The close-view Po must have one dominant connected river network');
assert.ok(summary[0].minLon<7.1&&summary[0].maxLon>12.5,'The connected Po network must extend from the Alpine source area to the Adriatic mouth');
console.log(JSON.stringify({totalReaches:lines.length,connectedGroups:summary.length,largest:summary.slice(0,12)},null,2));
