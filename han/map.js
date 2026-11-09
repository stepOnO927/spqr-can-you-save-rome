// Strategic map of the Han vertical slice: Natural Earth land (shared with
// the Roman atlas), hand-simplified rivers, the Han frontier line, labelled
// ranges and deserts, and the clickable territory network. Everything
// clickable is a simulation region.
import LAND from '../land.js?v=phase-x-1';
import {REGIONS,ROUTES} from './data.js?v=han-1';

export const VIEW={lon0:58,lon1:126,lat0:54,lat1:24,W:1200,H:640};
export const project=([lon,lat],v=VIEW)=>[Math.round((lon-v.lon0)/(v.lon1-v.lon0)*v.W*10)/10,Math.round((v.lat0-lat)/(v.lat0-v.lat1)*v.H*10)/10];
const RIVERS={
 yellow:{name:['Yellow River','黄河'],pts:[[96,35],[100,36],[103.6,36.1],[105,37.5],[106.5,39.2],[107,40.6],[109,40.7],[111,40.3],[111.5,39],[110.5,37],[110.4,35],[111.5,34.8],[113.6,34.9],[115,35.8],[116,37],[117.5,38.4]]},
 yangtze:{name:['Yangtze','长江'],pts:[[91,33.5],[97,33],[99.5,28],[102,26.5],[104.6,28.8],[106.5,29.6],[108.4,30.8],[110.5,31],[112.2,30.3],[113.5,30.4],[114.3,30.6],[116,29.8],[117.6,30.9],[118.8,32],[121,31.7]]},
 wei:{name:['Wei River','渭水'],pts:[[104.6,34.8],[106.2,34.4],[107.5,34.3],[108.9,34.4],[110.2,34.6]]},
 han:{name:['Han River','汉水'],pts:[[106.5,33.1],[108.9,32.7],[110.8,32.6],[112.1,32.0],[112.6,31.0],[114.3,30.6]]},
 tarim:{name:['Tarim','塔里木河'],pts:[[76,39.5],[79,40.6],[81,40.9],[84,41.2],[86.5,40.8],[88,40.2],[90.3,40.4]]},
 ili:{name:['Ili','伊犁河'],pts:[[82.5,43.6],[81.3,43.9],[78,44],[76.5,44.5],[74.8,45.4]]},
 syr:{name:['Syr Darya','锡尔河'],pts:[[72.5,40.8],[71.6,40.9],[69.3,41],[68.5,42],[66,44.5],[61.5,46]]}
};
const FRONTIER=[[93.8,40.4],[95.5,40.3],[98.5,40],[100.5,39.4],[102.8,38.4],[104.5,38.2],[106.2,39.0],[107.5,41.0],[110,41.5],[112.5,41.3],[115,41.0],[118,40.5]];
const LABELS=[
 [['Qinling','秦岭'],108,33.7,'range'],[['Tianshan','天山'],84,43.3,'range'],[['Kunlun','昆仑'],85,36,'range'],[['Congling (Pamirs)','葱岭'],74.3,38.4,'range'],[['Qilian','祁连山'],98.6,38.3,'range'],[['Taihang','太行山'],113.3,37.6,'range'],
 [['Gobi','戈壁'],104,43.3,'desert'],[['Taklamakan','塔克拉玛干'],83,39,'desert'],[['Lop Nur','盐泽'],90.6,40.6,'desert'],
 [['Guanzhong','关中'],108.4,34.75,'basin'],[['North China Plain','华北平原'],115.6,36.8,'basin'],[['Hexi Corridor','河西走廊'],99.5,39.6,'basin'],[['Tarim Basin','塔里木盆地'],82,40.3,'basin']
];
const path=(pts)=>pts.map((p,i)=>(i?'L':'M')+project(p).join(',')).join('');
let landCache=null;
function landPaths(){
 if(landCache)return landCache;const v=VIEW,out=[];
 for(const f of LAND.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const poly of polys){const ring=poly[0];let minX=180,maxX=-180,minY=90,maxY=-90;for(const [x,y] of ring){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
   if(maxX<v.lon0-5||minX>v.lon1+5||maxY<v.lat1-5||minY>v.lat0+5)continue;
   const step=1;out.push(path(ring.filter((_,i)=>i%step===0))+'Z')}}
 return landCache=out;
}
// Camera presets: the theatre is navigable without rebuilding the data.
export const CAMERAS={all:{name:['Whole theatre','全图'],box:[58,126,54,24]},core:{name:['Guanzhong & the Plain','关中与中原'],box:[100,123,42,27]},hexi:{name:['Hexi Corridor','河西走廊'],box:[90,110,44,32]},west:{name:['Western Regions','西域'],box:[66,96,47,35]},steppe:{name:['The Steppe','草原'],box:[82,118,54,38]}};
export function cameraBox(id){const c=CAMERAS[id]||CAMERAS.all;const [a,b]=project([c.box[0],c.box[2]]),[x,y]=project([c.box[1],c.box[3]]);return `${a} ${b} ${x-a} ${y-b}`}
export function regionPoint(id){const r=REGIONS.find(x=>x.id===id);return project([r.lon,r.lat])}
// Voronoi-like territory discs are avoided: each territory is a seat marker with
// a control ring; routes show kind by stroke style.
export function drawMap(s,{lang=0,selected=null,selectedArmy=null,visibleArmy=()=>true,colors={},ordering=false,targets=new Set(),silkPath=null,camera='all'}={}){
 const L=i=>Array.isArray(i)?i[lang]:i;
 const routeStyle={road:'route-road',river:'route-river',pass:'route-pass',desert:'route-desert',steppe:'route-steppe',oasis:'route-oasis'};
 const silkSet=new Set();if(silkPath)for(let i=0;i<silkPath.length-1;i++)silkSet.add([silkPath[i],silkPath[i+1]].sort().join(':'));
 const routes=ROUTES.map(l=>{const [x1,y1]=regionPoint(l.a),[x2,y2]=regionPoint(l.b),k=[l.a,l.b].sort().join(':');return `<line class="route ${routeStyle[l.kind]} ${silkSet.has(k)?'silk-leg':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${L(l.name||[l.kind,{road:'道路',river:'水道',pass:'关隘',desert:'沙碛',steppe:'草原',oasis:'绿洲道'}[l.kind]])} · ${l.months}${lang?'月':' mo'}</title></line>`}).join('');
 const rivers=Object.values(RIVERS).map(r=>`<path class="river" d="${path(r.pts)}"><title>${L(r.name)}</title></path>`).join('');
 const labels=LABELS.map(([n,lon,lat,kind])=>{const [x,y]=project([lon,lat]);return `<text class="geo-label ${kind}" x="${x}" y="${y}">${L(n)}</text>`}).join('');
 const regions=s.regions.map(r=>{const [x,y]=regionPoint(r.id),c=colors[r.owner]||'#777',sel=selected===r.id,tgt=targets.has(r.id);
  const size=r.kind==='capital'?11:r.kind==='steppe'?9:7;
  const shape=r.kind==='steppe'?`<circle class="seat steppe" cx="${x}" cy="${y}" r="${size}" fill="${c}"/>`:r.kind==='oasis'||r.kind==='protectorate'?`<rect class="seat oasis" x="${x-size}" y="${y-size}" width="${size*2}" height="${size*2}" transform="rotate(45 ${x} ${y})" fill="${c}"/>`:`<rect class="seat" x="${x-size}" y="${y-size}" width="${size*2}" height="${size*2}" rx="2" fill="${c}"/>`;
  return `<g class="region ${sel?'selected':''} ${tgt?'target':''} ${r.siege?'besieged':''} ${r.disaster?'calamity':''}" data-region="${r.id}" tabindex="0" role="button" aria-label="${L(r.name)}">${tgt?`<circle class="target-ring" cx="${x}" cy="${y}" r="${size+7}"/>`:''}${shape}<text class="region-label" x="${x}" y="${y+size+13}">${L(r.name).split(/[（(]/)[0]}</text></g>`}).join('');
 const stacks={};for(const a of s.armies.filter(a=>a.men>0&&visibleArmy(a)))(stacks[a.region]||=[]).push(a);
 const armies=Object.entries(stacks).map(([rid,list])=>{const [x,y]=regionPoint(rid);return list.map((a,i)=>{const ax=x+14+i*13,ay=y-16;const sel=selectedArmy===a.id;
  return `<g class="army ${sel?'selected':''} ${a.move?'moving':''}" data-army="${a.id}" role="button" tabindex="0"><rect x="${ax-6}" y="${ay-8}" width="12" height="16" rx="1" fill="${colors[a.owner]||'#555'}"/><text x="${ax}" y="${ay+4}">${a.owner==='han'||a.owner==='han_loyalist'||a.owner==='rival_court'?'汉':a.owner==='zhizhi'||a.owner==='huhanye'?'匈':a.owner.startsWith('wusun')?'孙':'旗'}</text>${a.move?(()=>{const [tx,ty]=regionPoint(a.move.to);return `<line class="march" x1="${ax}" y1="${ay}" x2="${tx}" y2="${ty}"/>`})():''}</g>`}).join('')}).join('');
 const v=VIEW,box=cameraBox(camera);
 return `<svg class="han-map camera-${camera}" viewBox="${box}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${lang?'汉代战略地图':'Han strategic map'}"><defs><pattern id="silk" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#0000000d"/></pattern></defs><rect class="sea" width="${v.W}" height="${v.H}"/>${landPaths().map(d=>`<path class="land" d="${d}"/>`).join('')}<rect width="${v.W}" height="${v.H}" fill="url(#silk)" pointer-events="none"/>${labels}${rivers}<path class="frontier-wall" d="${path(FRONTIER)}"><title>${lang?'汉代边塞与烽燧（示意）':'Han frontier walls and beacons (schematic)'}</title></path>${routes}${regions}${armies}</svg>`;
}
