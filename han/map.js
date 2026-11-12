// Strategic map of the Han theatre.
//
// Territories are real areas: a Voronoi partition of several anchor points per
// territory, clipped to the Natural Earth coastline. Borders between cells of
// different territories are drawn by level — territory, circuit (州部),
// theatre (战区) and state — so the map shows the administrative and military
// structure. A schematic terrain layer (plateau, ranges, deserts, steppe,
// marsh), lakes and rivers sits under the political colours.
// Map modes: political 政区 · circuits 州部 · theatres 战区 · terrain 地形.
import LAND from '../land.js?v=phase-x-1';
import {REGIONS,ROUTES,ZHOU,THEATERS} from './data.js?v=han-1';
import {REGION_GEO,OUTSIDE,TERRAIN,LAKES,RIVERS,FRONTIER} from './geography.js?v=han-1';

export const VIEW={lon0:27,lon1:127,lat0:55,lat1:23,W:1400,H:760};
export const project=([lon,lat])=>[Math.round((lon-VIEW.lon0)/(VIEW.lon1-VIEW.lon0)*VIEW.W*10)/10,Math.round((VIEW.lat0-lat)/(VIEW.lat0-VIEW.lat1)*VIEW.H*10)/10];
export const CAMERAS={all:{name:['Eurasia','欧亚全图'],box:[28,125,53.5,24.5]},central:{name:['Central Asia','中亚'],box:[58,91,47,29]},iran:{name:['Iranian World','伊朗世界'],box:[40,69,43,25]},caucasus:{name:['Caucasus','高加索'],box:[36,52,46,31]},core:{name:['Guanzhong & the Plain','关中与中原'],box:[101,123,41.5,26.5]},hexi:{name:['Hexi Corridor','河西走廊'],box:[90,110,44,33]},west:{name:['Western Regions','西域'],box:[65,96,47,34.5]},steppe:{name:['The Steppe','草原'],box:[82,120,55,38]}};
export function cameraScale(id){const c=CAMERAS[id]||CAMERAS.all;return (c.box[1]-c.box[0])/(VIEW.lon1-VIEW.lon0)}
export function cameraBox(id){const c=CAMERAS[id]||CAMERAS.all;const [a,b]=project([c.box[0],c.box[2]]),[x,y]=project([c.box[1],c.box[3]]);return `${a} ${b} ${x-a} ${y-b}`}
export const MODES={political:['Political','政区'],circuits:['Circuits','州部'],theaters:['Theatres','战区'],terrain:['Terrain','地形']};

// ---------- geometry (computed once) ----------
const pathOf=(pts,close=true)=>pts.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join('')+(close?'Z':'');
const lonlatPath=(pts,close=true)=>pathOf(pts.map(project),close);
function smooth(pts){ // Chaikin smoothing for rivers and terrain outlines
 let p=pts;for(let k=0;k<2;k++){const o=[p[0]];for(let i=0;i<p.length-1;i++){const [a,b]=[p[i],p[i+1]];o.push([a[0]*0.75+b[0]*0.25,a[1]*0.75+b[1]*0.25],[a[0]*0.25+b[0]*0.75,a[1]*0.25+b[1]*0.75])}o.push(p[p.length-1]);p=o}return p}
function smoothClosed(pts){let p=pts;for(let k=0;k<2;k++){const o=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];o.push([a[0]*0.75+b[0]*0.25,a[1]*0.75+b[1]*0.25],[a[0]*0.25+b[0]*0.75,a[1]*0.25+b[1]*0.75])}p=o}return p}
// clip a convex polygon (vertices tagged with the site that created the edge
// leaving them) to the half-plane closer to site a than to site b.
function clip(poly,a,b,tag){
 const dx=b[0]-a[0],dy=b[1]-a[1],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,side=p=>(p.x-mx)*dx+(p.y-my)*dy;
 const out=[];
 for(let i=0;i<poly.length;i++){const P=poly[i],Q=poly[(i+1)%poly.length],sp=side(P),sq=side(Q);
  if(sp<=0)out.push(P);
  if((sp<=0)!==(sq<=0)){const t=sp/(sp-sq),I={x:P.x+(Q.x-P.x)*t,y:P.y+(Q.y-P.y)*t};I.tag=sp<=0?tag:P.tag;out.push(I)}}
 return out;
}
let GEO=null;
function geometry(){
 if(GEO)return GEO;
 const sites=[];
 for(const r of REGIONS)for(const a of (REGION_GEO[r.id]?.anchors||[[r.lon,r.lat]]))sites.push({region:r.id,p:project(a)});
 OUTSIDE.forEach((o,k)=>{for(const a of o.pts)sites.push({region:null,outside:k,p:project(a)})});
 const box=[{x:-40,y:-40,tag:-1},{x:VIEW.W+40,y:-40,tag:-1},{x:VIEW.W+40,y:VIEW.H+40,tag:-1},{x:-40,y:VIEW.H+40,tag:-1}];
 const cells=sites.map((s,i)=>{let poly=box.map(v=>({...v}));
  // nearest sites first keeps polygons small quickly
  const order=sites.map((o,j)=>[j,(o.p[0]-s.p[0])**2+(o.p[1]-s.p[1])**2]).filter(([j])=>j!==i).sort((x,y)=>x[1]-y[1]);
  for(const [j] of order){const o=sites[j];
   // a site further than twice the cell radius cannot cut the cell
   const rad=Math.max(...poly.map(v=>(v.x-s.p[0])**2+(v.y-s.p[1])**2));if((o.p[0]-s.p[0])**2+(o.p[1]-s.p[1])**2>4*rad)break;
   poly=clip(poly,s.p,o.p,j);if(poly.length<3)break}
  return poly});
 // territory shapes and border segments
 const regionCells={},segments=[];
 cells.forEach((poly,i)=>{const s=sites[i];const key=s.region||('outside:'+s.outside);(regionCells[key]||=[]).push(poly);
  for(let k=0;k<poly.length;k++){const P=poly[k],Q=poly[(k+1)%poly.length];if(P.tag<=i)continue; // each shared edge once (j>i)
   const o=sites[P.tag];if(!o)continue;const ka=s.region||('outside:'+s.outside),kb=o.region||('outside:'+o.outside);if(ka===kb)continue;
   segments.push({a:ka,b:kb,d:`M${P.x.toFixed(1)},${P.y.toFixed(1)}L${Q.x.toFixed(1)},${Q.y.toFixed(1)}`})}});
 const area=poly=>poly.reduce((a,p,i)=>{const q=poly[(i+1)%poly.length];return a+p.x*q.y-q.x*p.y},0)/2;
 const centroid=polys=>{let A=0,X=0,Y=0;for(const poly of polys){for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],c=p.x*q.y-q.x*p.y;X+=(p.x+q.x)*c;Y+=(p.y+q.y)*c;A+=c/2}}return A?[X/(6*A),Y/(6*A)]:[0,0]};
 const shapes={},centres={};
 for(const [k,polys] of Object.entries(regionCells)){shapes[k]=polys.map(poly=>'M'+poly.map(v=>v.x.toFixed(1)+','+v.y.toFixed(1)).join('L')+'Z').join('');centres[k]=centroid(polys)}
 // label anchors: prefer the seat for small territories
 for(const r of REGIONS){const seat=project([r.lon,r.lat]),c=centres[r.id];const d=Math.hypot(seat[0]-c[0],seat[1]-c[1]);centres[r.id]=d>60?[(seat[0]*2+c[0])/3,(seat[1]*2+c[1])/3]:c}
 const groupCentre=(field,id)=>{const list=REGIONS.filter(r=>r[field]===id);const xs=list.map(r=>centres[r.id]);return [xs.reduce((a,p)=>a+p[0],0)/xs.length,xs.reduce((a,p)=>a+p[1],0)/xs.length]};
 const land=[];for(const f of LAND.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const poly of polys){const ring=poly[0];if(!ring.some(([x,y])=>x>VIEW.lon0-10&&x<VIEW.lon1+10&&y>VIEW.lat1-10&&y<VIEW.lat0+10))continue;land.push(lonlatPath(ring))}}
 GEO={shapes,centres,segments,land:land.join(''),theaterCentre:Object.fromEntries(Object.keys(THEATERS).map(t=>[t,groupCentre('theater',t)])),zhouCentre:Object.fromEntries(Object.keys(ZHOU).filter(z=>z!=='waifan'&&REGIONS.some(r=>r.zhou===z)).map(z=>[z,groupCentre('zhou',z)])),
  terrain:TERRAIN.map(t=>({...t,d:pathOf(smoothClosed(t.pts.map(project)))})),lakes:LAKES.map(l=>({...l,d:pathOf(smoothClosed(l.pts.map(project)))})),
  rivers:Object.values(RIVERS).map(r=>({...r,d:pathOf(smooth(r.pts.map(project)),false)})),frontier:pathOf(FRONTIER.map(project),false)};
 return GEO;
}
export function regionPoint(id){const r=REGIONS.find(x=>x.id===id);return project([r.lon,r.lat])}
export const territoryGeometry=()=>geometry();

const TERRAIN_FILL={plateau:'url(#t-plateau)',mountain:'url(#t-mountain)',desert:'url(#t-desert)',steppe:'url(#t-steppe)',hills:'url(#t-hills)',marsh:'url(#t-marsh)'};
const TERRAIN_TINT={plateau:'#c9b9a0',mountain:'#b8a68a',desert:'#e8d39c',steppe:'#cdd2a0',hills:'#cbbd98',marsh:'#b9c6a8'};
const defsFor=k=>`<defs>
<clipPath id="land-clip"><path d="${''}"/></clipPath>
<pattern id="t-mountain" width="18" height="14" patternUnits="userSpaceOnUse" patternTransform="scale(${k})"><path d="M1 12 L6 4 L11 12 M8 12 L12 6 L16 12" fill="none" stroke="#6e5a3e" stroke-width="1.1" stroke-linejoin="round" opacity=".55"/></pattern>
<pattern id="t-plateau" width="22" height="16" patternUnits="userSpaceOnUse" patternTransform="scale(${k})"><path d="M2 13 L7 6 L12 13" fill="none" stroke="#7d6b55" stroke-width="1" opacity=".35"/><path d="M13 8h6" stroke="#7d6b55" opacity=".25"/></pattern>
<pattern id="t-desert" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="scale(${k})"><circle cx="2" cy="3" r=".9" fill="#a8823e" opacity=".55"/><circle cx="7" cy="8" r=".8" fill="#a8823e" opacity=".45"/><circle cx="8" cy="2" r=".5" fill="#a8823e" opacity=".4"/></pattern>
<pattern id="t-steppe" width="14" height="10" patternUnits="userSpaceOnUse" patternTransform="scale(${k})"><path d="M2 8 l1.5 -4 M4 8 l0 -4.5 M6 8 l-1.5 -4" stroke="#6f7a3e" stroke-width=".8" opacity=".45"/></pattern>
<pattern id="t-hills" width="16" height="10" patternUnits="userSpaceOnUse" patternTransform="scale(${k})"><path d="M1 8 q4 -6 8 0" fill="none" stroke="#7d6a48" stroke-width=".9" opacity=".45"/></pattern>
<pattern id="t-marsh" width="12" height="8" patternUnits="userSpaceOnUse" patternTransform="scale(${k})"><path d="M1 5h4M7 3h4" stroke="#4f7b8f" stroke-width=".9" opacity=".6"/></pattern>
<pattern id="protect-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="scale(${k}) rotate(45)"><rect width="3" height="8" fill="#a2311f" opacity=".42"/></pattern>
<pattern id="outside-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="scale(${k}) rotate(-35)"><path d="M0 0v7" stroke="#6d6250" stroke-width=".7" opacity=".35"/></pattern>
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .07"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
</defs>`;

// ---------- draw ----------
export function drawMap(s,{lang=0,selected=null,selectedArmy=null,visibleArmy=()=>true,colors={},targets=new Set(),silkPath=null,camera='all',mode='political',oasisStanding={}}={}){
 const g=geometry(),L=v=>Array.isArray(v)?v[lang]:v,k=cameraScale(camera),f=n=>(n*k).toFixed(2);
 const owner=Object.fromEntries(s.regions.map(r=>[r.id,r.owner]));
 const reg=Object.fromEntries(s.regions.map(r=>[r.id,r]));
 const fillFor=id=>{if(id.startsWith('outside'))return '#cfc3a6';const r=reg[id];
  if(mode==='political')return colors[r.owner]||'#9a9080';
  if(mode==='circuits')return ZHOU[r.zhou]?.color||'#8a785d';
  if(mode==='theaters'){const keys=Object.keys(THEATERS),i=keys.indexOf(r.theater);return `hsl(${(i*47)%360} 32% 55%)`}
  if(mode==='supply')return r.supply>=6?'#627751':r.supply>=3?'#b5a26b':'#9d614f';
  if(mode==='economy')return r.tax>=5?'#8b7150':r.tax>=3?'#aa916a':'#c3b495';
  if(mode==='military')return s.armies.some(a=>a.region===id&&a.owner===s.player&&a.men>0)?'#8d4f38':'#a99b7e';
  return 'transparent'};
 const op=mode==="terrain"?0:mode==="political"?0.5:0.6;
 const territories=Object.entries(g.shapes).map(([id,d])=>{
  if(id.startsWith('outside'))return `<path class="outside" d="${d}"><title>${L(OUTSIDE[+id.split(':')[1]].name)}</title></path>`;
  const r=reg[id],sel=selected===id,tgt=targets.has(id);
  return `<path class="territory ${sel?'selected':''} ${tgt?'target':''} ${r.siege?'besieged':''} ${r.disaster?'calamity':''}" data-region="${id}" d="${d}" fill="${fillFor(id)}" fill-opacity="${op}"><title>${L(r.name)} · ${L(ZHOU[r.zhou]?.name||['Regional polity','地方政体'])} · ${L(THEATERS[r.theater]?.name||['Eurasian corridor','欧亚通道'])}</title></path>${mode==='political'&&(oasisStanding[r.owner]||0)>=60?`<path class="protected" d="${d}" fill="url(#protect-stripes)" pointer-events="none"/>`:''}`}).join('');
 // borders by level
 const level=sg=>{if(sg.a.startsWith('outside')||sg.b.startsWith('outside'))return 'b-outside';const A=reg[sg.a],B=reg[sg.b];
  if(A.owner!==B.owner)return 'b-state';if(mode==='theaters'&&A.theater!==B.theater)return 'b-theater';if(mode==='circuits'&&A.zhou!==B.zhou)return 'b-circuit';
  if(A.theater!==B.theater)return 'b-theater-soft';if(A.zhou!==B.zhou)return 'b-circuit-soft';return 'b-territory'};
 const groups={};for(const sg of g.segments)(groups[level(sg)]||=[]).push(sg.d);
 const borders=['b-territory','b-circuit-soft','b-theater-soft','b-circuit','b-theater','b-outside','b-state'].filter(k=>groups[k]).map(k=>`<path class="border ${k}" d="${groups[k].join('')}"/>`).join('');
 const terrain=g.terrain.map(t=>`<path class="terrain t-${t.kind}" d="${t.d}" fill="${TERRAIN_TINT[t.kind]}" fill-opacity="${mode==='terrain'?0.75:0.45}"/><path d="${t.d}" fill="${TERRAIN_FILL[t.kind]}" pointer-events="none"/>`).join('');
 const terrainLabels=g.terrain.filter(t=>mode==='terrain'?['desert','mountain','plateau','marsh','steppe'].includes(t.kind):['desert','plateau'].includes(t.kind)).map(t=>{const c=t.pts.map(project).reduce((a,p)=>[a[0]+p[0]/t.pts.length,a[1]+p[1]/t.pts.length],[0,0]);return `<text class="geo-label ${t.kind}" x="${c[0].toFixed(0)}" y="${c[1].toFixed(0)}">${L(t.name)}</text>`}).join('');
 const lakes=g.lakes.map(l=>`<path class="lake" d="${l.d}"><title>${L(l.name)}</title></path>`).join('');
 const rivers=g.rivers.map(r=>`<path class="river ${r.major?'major':''}" d="${r.d}"><title>${L(r.name)}</title></path>`).join('');
 const silkSet=new Set();if(silkPath)for(let i=0;i<silkPath.length-1;i++)silkSet.add([silkPath[i],silkPath[i+1]].sort().join(':'));
 const routeName={road:['road','道路'],river:['river route','水道'],pass:['pass','关隘'],desert:['desert crossing','沙碛'],steppe:['steppe route','草原道'],oasis:['oasis road','绿洲道']};
 const routes=ROUTES.map(l=>{const [x1,y1]=regionPoint(l.a),[x2,y2]=regionPoint(l.b),k=[l.a,l.b].sort().join(':');return `<line class="route r-${l.kind} ${silkSet.has(k)?'silk-leg':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${L(l.name||routeName[l.kind])} · ${l.months}${lang?'月':' mo'}</title></line>`}).join('');
 const groupLabels=mode==='theaters'?Object.entries(g.theaterCentre).map(([t,[x,y]])=>`<text class="group-label theater" x="${x.toFixed(0)}" y="${(y-14*k).toFixed(1)}">${L(THEATERS[t].name)}</text>`).join('')
  :mode==='circuits'?Object.entries(g.zhouCentre).map(([z,[x,y]])=>`<text class="group-label circuit" x="${x.toFixed(0)}" y="${(y-14*k).toFixed(1)}">${L(ZHOU[z].name)}</text>`).join(''):'';
 const seats=s.regions.map(r=>{const [x,y]=regionPoint(r.id),[cx,cy]=g.centres[r.id];const cap=r.kind==='capital';
  const mark=cap?`<rect x="${x-5*k}" y="${y-5*k}" width="${f(10)}" height="${f(10)}" class="seat capital"/>`:`<circle cx="${x}" cy="${y}" r="${f(r.kind==='kingdom'?3.8:3.2)}" class="seat ${r.kind}"/>`;
  const label=L(r.name).split(/[（(]/)[0];
  return `<g class="seat-g" data-region="${r.id}">${mark}${targets.has(r.id)?`<circle class="target-ring" cx="${x}" cy="${y}" r="${f(11)}"/>`:''}<text class="region-label ${r.kind}" x="${cx.toFixed(1)}" y="${(cy+(Math.abs(cy-y)<8*k?14*k:0)).toFixed(1)}">${label}</text></g>`}).join('');
 const stacks={};for(const a of s.armies.filter(a=>a.men>0&&visibleArmy(a)))(stacks[a.region]||=[]).push(a);
 const glyph=o=>['han','han_loyalist','rival_court'].includes(o)?'汉':['zhizhi','huhanye'].includes(o)?'匈':o.startsWith('wusun')?'孙':o==='rebels'?'民':o==='qiang'?'羌':o==='kangju'?'康':o==='dayuan'?'宛':'国';
 const armies=Object.entries(stacks).map(([rid,list])=>{const [x,y]=regionPoint(rid);return list.map((a,i)=>{const ax=x+(10+i*26)*k,ay=y-22*k,sel=selectedArmy===a.id,n=a.men>=10000?(a.men/10000).toFixed(1).replace('.0','')+(lang?'万':'0k'):Math.round(a.men/1000)+'k';
  const label=lang&&a.men>=10000?(a.men/10000).toFixed(1).replace('.0','')+'万':Math.round(a.men/1000)+'k';
  return `<g class="army ${sel?'selected':''} ${a.move?'moving':''}" data-army="${a.id}" role="button" tabindex="0"><title>${a.men}</title>${a.move?(()=>{const [tx,ty]=regionPoint(a.move.to);return `<path class="march" d="M${ax},${ay+8*k}L${tx},${ty}" marker-end="url(#arrow)"/>`})():''}<g transform="translate(${ax} ${ay}) scale(${k})"><rect x="-11" y="-9" width="24" height="18" rx="2" fill="${colors[a.owner]||'#555'}"/><rect x="-11" y="-9" width="9" height="18" rx="2" fill="#0003"/><text class="glyph" x="-6.5" y="4">${glyph(a.owner)}</text><text class="count" x="6" y="4">${label}</text></g></g>`}).join('')}).join('');
 const box=cameraBox(camera);
 return `<svg class="han-map mode-${mode} camera-${camera}" viewBox="${box}" preserveAspectRatio="xMidYMid meet" style="font-size:${f(21)}px" role="img" aria-label="${lang?'汉代战略地图':'Han strategic map'}">${defsFor(k).replace(`<path d="${''}"/>`,`<path d="${g.land}"/>`)}<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff8e6"/></marker>
<rect class="sea" x="-100" y="-100" width="${VIEW.W+200}" height="${VIEW.H+200}"/>
<path class="land" d="${g.land}" filter="url(#paper)"/>
<g clip-path="url(#land-clip)">${terrain}${territories}${borders}${lakes}${rivers}</g>
<path class="coast" d="${g.land}"/>
<path class="frontier-wall" d="${g.frontier}"><title>${lang?'汉塞：长城、亭障与烽燧（示意）':'Han frontier: walls, forts and beacons (schematic)'}</title></path>
${terrainLabels}<g class="routes">${routes}</g>${groupLabels}${seats}${armies}</svg>`;
}
