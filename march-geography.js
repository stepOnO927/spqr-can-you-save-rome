import {REGIONS,ROUTES} from './data.js?v=phase-x-1';

// Strategic anchors are historical places, not claims about precise theater borders.
// ROUTES remains the authoritative connectivity graph. The map's decorative
// polygons and roads cannot create extra traversable edges.
export const MARCH_POINTS=Object.freeze({cisalpine:[11.6,44.75],narbo:[3.3,43.4],italiaN:[13.05,44],roma:[12.45,42.1],italiaS:[17.5,40.8],illyricum:[16.49,43.54],gaul:[4.5,47.54],hispaniaN:[1.25,41.12],sicilia:[15.29,37.08],epirus:[19.45,41.31],hispaniaS:[-4.78,37.88],africa:[10.05,37.05],achaia:[23.73,37.98],anatolia:[27.34,37.94],syria:[36.16,36.2],egypt:[29.92,31.2],egyptUpper:[32.632,25.665],media:[48.518,34.804],numidia:[6.61,36.37],mauretania:[2.19,36.6],armenia:[44.55,39.95],parthia:[44.5,33.1],galatia:[32,39.7],bosporus:[36.5,45.3]});
export const MARCH_CONFIG=Object.freeze({kmPerMonth:310,provisionPerThousand:0.7,provisionCapacityPerThousand:2.7,shortageLossRate:0.012,exposureLossRate:0.002,roadTime:0.72,roadFood:0.82,forcedTime:0.7,forcedFood:1.4,cautiousTime:1.28,cautiousRisk:0.65,terrainTime:{plain:1,farmland:.92,hills:1.22,forest:1.18,dense_forest:1.38,mountains:1.65,high_mountains:2.1,desert:1.38,marsh:1.55,river:1.2,coast:1,urban:.9,sea:1.4}});
// The extra terrain and edge features are documented gameplay abstractions.
// Only named Roman roads and the major crossings below receive road benefits.
const REGIONAL_TERRAIN={gaul:['forest','dense_forest','farmland'],narbo:['hills','coast'],cisalpine:['plain','farmland'],hispaniaN:['hills','mountains'],hispaniaS:['hills','farmland'],italiaN:['farmland','river'],roma:['urban','farmland','marsh'],italiaS:['hills','coast'],sicilia:['farmland','coast'],africa:['farmland','coast'],illyricum:['hills','mountains'],epirus:['hills','mountains'],achaia:['hills','coast'],anatolia:['hills','coast'],syria:['desert','coast'],egypt:['desert','river'],egyptUpper:['desert','river'],numidia:['plain','desert'],mauretania:['hills','coast'],armenia:['mountains','high_mountains'],parthia:['desert','river'],media:['mountains','high_mountains'],galatia:['hills','plain'],bosporus:['coast','plain']};
const FEATURES={
 'gaul:narbo':{terrain:'dense_forest'},
 'cisalpine:italiaN':{pass:'Apennine approaches',river:'Rubicon',bridge:true},
 'italiaN:roma':{road:'Via Flaminia',river:'Tiber',bridge:true},
 'italiaS:roma':{road:'Via Appia'},
 'cisalpine:narbo':{pass:'Alpine approaches'},
 'hispaniaN:narbo':{pass:'Pyrenean approaches'},
 'armenia:parthia':{pass:'Armenian highland route'},
 'armenia:galatia':{pass:'Anatolian highland route'},
 'africa:numidia':{terrain:'desert'},
 'egypt:egyptUpper':{river:'Nile',riverCorridor:true}
};
const key=(a,b)=>[a,b].sort().join(':');
const rad=x=>x*Math.PI/180;
export function distanceKm(a,b){const p=MARCH_POINTS[a],q=MARCH_POINTS[b];if(!p||!q)return null;const dLat=rad(q[1]-p[1]),dLon=rad(q[0]-p[0]),h=Math.sin(dLat/2)**2+Math.cos(rad(p[1]))*Math.cos(rad(q[1]))*Math.sin(dLon/2)**2;return Math.round(12742*Math.asin(Math.min(1,Math.sqrt(h))))}
export function terrainFor(id){return REGIONAL_TERRAIN[id]||[REGIONS.find(r=>r.id===id)?.terrain||'plain']}
export function marchEdge(from,to){const raw=ROUTES.find(r=>r[0]===from&&r[1]===to||r[1]===from&&r[0]===to);if(!raw||!MARCH_POINTS[from]||!MARCH_POINTS[to])return null;return {from,to,sea:raw[2]==='sea',km:distanceKm(from,to),...FEATURES[key(from,to)]};}
export function marchNeighbors(from){return ROUTES.filter(r=>r[0]===from||r[1]===from).map(r=>marchEdge(from,r[0]===from?r[1]:r[0])).filter(Boolean)}
export function marchSeason(month,to){const lat=MARCH_POINTS[to]?.[1]||35,terrains=terrainFor(to),winter=[12,1,2].includes(month),summer=[6,7,8].includes(month);if(winter&&lat>=39&&terrains.some(t=>['high_mountains','mountains'].includes(t)))return {time:1.35,food:1.2,risk:.018,warning:'snow'};if(winter&&lat>=40)return {time:1.12,food:1.08,risk:.002,warning:'mud'};if(summer&&lat<36&&terrains.includes('desert'))return {time:1.2,food:1.3,risk:.01,warning:'heat'};return {time:1,food:1,risk:0,warning:null}}
export function estimateMarchEdge(s,a,from,to,{pace='normal',roadBonus=0,doctrine=0,formation=0}={}){
 const edge=marchEdge(from,to);if(!edge)return null;const season=marchSeason(s.month,to),terrain=edge.sea?'sea':edge.terrain||terrainFor(to)[0],cfg=MARCH_CONFIG,road=!!edge.road,pass=!!edge.pass;
 const highPass=pass&&terrainFor(to).includes('high_mountains');if(highPass&&season.warning==='snow')return {...edge,blocked:'snow',terrain,season};
 const terrainFactor=cfg.terrainTime[terrain]||1,paceTime=pace==='forced'?cfg.forcedTime:pace==='cautious'?cfg.cautiousTime:1;
 const time=Math.max(1,Math.ceil(Math.max(1,edge.km)/cfg.kmPerMonth*terrainFactor*season.time*(road?cfg.roadTime:1)*paceTime-Math.max(0,roadBonus)-Math.max(0,doctrine)+formation));
 const food=Math.max(1,Math.ceil(a.men/1000*cfg.provisionPerThousand*time*season.food*(road?cfg.roadFood:1)*(pace==='forced'?cfg.forcedFood:1)));
 const harsh=['desert','high_mountains','marsh'].includes(terrain);
 const risk=Math.min(.12,(season.risk+(harsh ? .004 : 0)+(pace==='forced' ? .008 : 0))*(pace==='cautious'?cfg.cautiousRisk:1));
 return {...edge,terrain,season,months:time,food,risk,road,pass};
}
// A bounded Dijkstra search over the 24 validated theaters; no map polygon or
// arbitrary click position can become a movement node.
export function findMarchPath(s,a,start,goal,{priority='balanced',pace='normal',canEnter=()=>true,estimateOptions={}}={}){
 if(!MARCH_POINTS[start]||!MARCH_POINTS[goal])return {ok:false,reason:'unknown_terrain'};
 const score={fastest:e=>e.months,safest:e=>e.months+e.risk*300+e.food*.18,balanced:e=>e.months+e.risk*140+e.food*.09}[priority]||((e)=>e.months+e.risk*140+e.food*.09);
 const pending=new Set(Object.keys(MARCH_POINTS)),dist=new Map([[start,0]]),prev=new Map(),reason=new Map();
 while(pending.size){let current=null;for(const id of pending)if(dist.has(id)&&(current===null||dist.get(id)<dist.get(current)))current=id;if(current===null)break;if(current===goal)break;pending.delete(current);
  for(const edge of marchNeighbors(current)){if(!pending.has(edge.to))continue;const access=canEnter(edge.to,edge);if(access!==true){reason.set(edge.to,access||'access');continue}const modifiers=typeof estimateOptions==='function'?estimateOptions(current,edge):estimateOptions;const estimate=estimateMarchEdge(s,a,current,edge.to,{...modifiers,pace});if(!estimate||estimate.blocked){reason.set(edge.to,estimate?.blocked||'blocked');continue}const next=dist.get(current)+score(estimate);if(next<(dist.get(edge.to)??Infinity)){dist.set(edge.to,next);prev.set(edge.to,{from:current,estimate})}}
 }
 if(!dist.has(goal))return {ok:false,reason:reason.get(goal)||'no_route'};
 const segments=[];for(let id=goal;id!==start;){const step=prev.get(id);if(!step)return {ok:false,reason:'no_route'};segments.unshift(step.estimate);id=step.from}
 return {ok:true,nodes:[start,...segments.map(e=>e.to)],segments,months:segments.reduce((n,e)=>n+e.months,0),km:segments.reduce((n,e)=>n+e.km,0),food:segments.reduce((n,e)=>n+e.food,0),risk:Math.min(1,segments.reduce((n,e)=>n+e.risk,0))};
}
