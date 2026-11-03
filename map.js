import land from './land.js?v=4';
import rivers from './rivers.js?v=4';
import {FACTIONS} from './data.js?v=4';

// Anchors are approximate locations of the listed ancient cities or regional centers.
// Cells are nearest-anchor operational areas, not surveyed ancient provincial borders.
const locations={gaul:[4.50,47.54],narbo:[3.00,43.18],cisalpine:[12.20,44.42],hispaniaN:[1.25,41.12],hispaniaS:[-4.78,37.88],italiaN:[12.57,44.06],roma:[12.50,41.89],italiaS:[17.95,40.64],sicilia:[15.29,37.08],africa:[10.05,37.05],illyricum:[16.49,43.54],epirus:[19.45,41.31],achaia:[23.73,37.98],anatolia:[27.34,37.94],syria:[36.16,36.20],egypt:[29.92,31.20],numidia:[6.61,36.37],mauretania:[2.19,36.60],armenia:[44.55,39.95],parthia:[44.5,33.1]};
const neutral=[[-10,52],[-3,52],[5,53],[14,52],[23,52],[32,52],[44,52],[-11,29],[0,27],[10,26],[20,25],[36,25],[48,26],[52,40],[50,48]];
const W=1200,H=650;
const project=([lon,lat])=>[(lon+12)/62*W,(55-lat)/31*H];
export const mapPoint=id=>project(locations[id]||[0,0]);

function rings(geometry){if(geometry.type==='Polygon')return geometry.coordinates;if(geometry.type==='MultiPolygon')return geometry.coordinates.flat();return []}
function landPath(){return land.features.flatMap(f=>rings(f.geometry)).map(r=>r.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join('')+'Z').join('')}
function riverPath(){return rivers.features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[]).map(line=>line.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join('')).join('')}
const LAND=landPath(),RIVERS=riverPath();
function clip(poly,a,b,c){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;if(dp<=0)out.push(p);if((dp<0&&dq>0)||(dp>0&&dq<0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t])}}return out}
function cell(p,points){let poly=[[0,0],[W,0],[W,H],[0,H]];for(const q of points){if(q===p)continue;poly=clip(poly,2*(q[0]-p[0]),2*(q[1]-p[1]),q[0]**2+q[1]**2-p[0]**2-p[1]**2);if(!poly.length)break}return poly.map(x=>x.map(v=>v.toFixed(1)).join(',')).join(' ')}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={caesar:'#873c37',senate:'#c2a871',egypt:'#709e98',numidia:'#b29560',mauretania:'#92966d',armenia:'#9f9090',parthia:'#617a64',rebels:'#806b5a'};
const terrain={plain:'#b8b292',hills:'#a59a7e',forest:'#879680',urban:'#c7bca1',desert:'#d4c29c'};

export function drawMap(s,{selectedRegion,selectedArmy,mode,lang,view}){
 const pts=s.regions.map(r=>mapPoint(r.id)),all=[...pts,...neutral.map(project)];
 const areas=s.regions.map((r,i)=>{const [x,y]=pts[i];return `<g data-region="${r.id}" class="map-area ${selectedRegion===r.id?'selected':''} ${['italiaN','italiaS','illyricum','epirus','sicilia'].includes(r.id)?'dense':''}"><polygon points="${cell(pts[i],all)}" fill="${mode==='terrain'?terrain[r.terrain]:colors[r.owner]}"/><text x="${x}" y="${y-15}" class="province-label">${escape(r.name[lang==='zh'?1:0])}</text><circle cx="${x}" cy="${y}" r="2.8" class="city-dot"/><text x="${x+5}" y="${y+11}" class="city-name">${escape(r.city)}</text></g>`}).join('');
 const moves=s.armies.filter(a=>a.move).map(a=>{const [x,y]=mapPoint(a.region),[u,v]=mapPoint(a.move.to);return `<path d="M${x} ${y} L${u} ${v}" class="march-arrow" marker-end="url(#arrow)"/>`}).join('');
 const markers=s.armies.filter(a=>a.men>0).map(a=>{const [x,y]=mapPoint(a.region), peers=s.armies.filter(b=>b.region===a.region),idx=peers.findIndex(b=>b.id===a.id);return `<g data-army="${a.id}" class="unit ${selectedArmy===a.id?'selected':''}" transform="translate(${x+9+idx*36} ${y-7})"><rect width="34" height="22" rx="1" fill="${colors[a.owner]}"/><path d="M3 3h28v16H3z"/><text x="17" y="15">${Math.round(a.men/1000)}k</text><title>${escape(a.name[lang==='zh'?1:0])} · ${escape(a.commander[lang==='zh'?1:0])} · ${a.men}</title></g>`}).join('');
 return `<svg id="map-svg" class="${view[2]>800?'overview':''}" viewBox="${view.join(' ')}" role="img" aria-label="${lang==='zh'?'地理作战地图，边界为估算':'Geographical operational map, boundaries approximated'}"><defs><clipPath id="landclip"><path d="${LAND}" fill-rule="evenodd"/></clipPath><pattern id="grain" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1l3 2M5 7l2 -1" stroke="#eee2bd" stroke-opacity=".13"/></pattern><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#f7e6ba"/></marker></defs><rect width="1200" height="650" fill="#485f69"/><path d="${LAND}" fill="#b3ad91" stroke="#323e3a" stroke-width="1.2" fill-rule="evenodd"/><g clip-path="url(#landclip)">${areas}<rect width="1200" height="650" fill="url(#grain)" pointer-events="none"/><path d="${RIVERS}" fill="none" stroke="#788e91" stroke-width="1" opacity=".75" pointer-events="none"/></g><text x="400" y="465" class="sea-name">MARE INTERNVM</text>${moves}${markers}</svg>`;
}

