import {IDENTITIES,factionMark} from './identity.js?v=xxii-final-4';
import land from './land.js?v=xxii-final-4';
import rivers from './rivers.js?v=xxii-final-4';
import historical from './historical-territories.js?v=xxii-final-4';
import {FACTIONS} from './data.js?v=xxii-final-4';
import {reportedArmies} from './character-system.js?v=asylum-heir-1';
import {reportedControl} from './control-intelligence.js?v=xxii-final-4';

// Anchors identify playable theaters within a historical polygon; they do not create borders.
const locations={gaul:[4.50,47.54],narbo:[3.00,43.18],cisalpine:[12.20,44.42],hispaniaN:[1.25,41.12],hispaniaS:[-4.78,37.88],italiaN:[12.57,44.06],roma:[12.50,41.89],italiaS:[17.95,40.64],sicilia:[15.29,37.08],africa:[10.05,37.05],illyricum:[16.49,43.54],epirus:[19.45,41.31],achaia:[23.73,37.98],anatolia:[27.34,37.94],syria:[36.16,36.20],egypt:[29.92,31.20],egyptUpper:[32.632,25.665],media:[48.518,34.804],numidia:[6.61,36.37],mauretania:[2.19,36.60],armenia:[44.55,39.95],parthia:[44.5,33.1],galatia:[32,39.7],bosporus:[36.5,45.3]};
const W=1200,H=650;
const project=([lon,lat])=>[(lon+12)/62*W,(55-lat)/31*H];
export const mapPoint=id=>project(locations[id]||[0,0]);

function rings(geometry){if(geometry.type==='Polygon')return geometry.coordinates;if(geometry.type==='MultiPolygon')return geometry.coordinates.flat();return []}
function landPath(){return land.features.flatMap(f=>rings(f.geometry)).map(r=>r.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join('')+'Z').join('')}
function riverPath(){return rivers.features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[]).map(line=>line.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join('')).join('')}
const LAND=landPath(),RIVERS=riverPath();
function geoPath(g){return rings(g).map(r=>r.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join('')+'Z').join('')}
const shapes=historical.features.map(f=>({...f,path:geoPath(f.geometry)}));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=Object.fromEntries(Object.entries(IDENTITIES).map(([id,kit])=>[id,kit.map]));
const terrain={plain:'#b8b292',hills:'#a59a7e',forest:'#879680',urban:'#c7bca1',desert:'#d4c29c'};

export function drawMap(s,{selectedRegion,selectedArmy,mode,lang,view,reachable=[]}){
 const patterns=[];
 const areas=shapes.map(f=>{const ids=f.properties.regions,regions=ids.map(id=>s.regions.find(r=>r.id===id)).filter(Boolean);if(!ids.length)return `<path d="${f.path}" fill="#b9ad8e" stroke="#766a58" stroke-width="1" fill-rule="evenodd"/>`;const owners=[...new Set(regions.map(r=>reportedControl(s,s.player,r.id)?.owner||'shared'))],pattern=`mix-${f.properties.id}`;if(owners.length>1){let segments=owners.map((owner,i)=>`<rect x="${i*10}" y="0" width="10" height="10" fill="${colors[owner]}"/>`).join('');patterns.push(`<pattern id="${pattern}" width="${owners.length*10}" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">${segments}</pattern>`)}const fill=mode==='terrain'?terrain[regions[0].terrain]:(owners.length>1?`url(#${pattern})`:colors[owners[0]]);return `<path data-map-group="${ids.join(',')}" class="map-area ${ids.includes(selectedRegion)?'selected':''} ${ids.some(id=>reachable.includes(id))?'reachable':''}" d="${f.path}" fill="${fill}" fill-rule="evenodd"><title>${escape(ids.map(id=>s.regions.find(r=>r.id===id)?.name[lang==='zh'?1:0]).filter(Boolean).join(' / '))}</title></path>`}).join('');
 const labels=s.regions.map(r=>{const [x,y]=mapPoint(r.id);return `<g class="map-label ${['italiaN','italiaS','illyricum','epirus','sicilia'].includes(r.id)?'dense':''}"><text x="${x}" y="${y-15}" class="province-label">${escape(r.name[lang==='zh'?1:0])}</text><circle cx="${x}" cy="${y}" r="2.8" class="city-dot"/><text x="${x+5}" y="${y+11}" class="city-name">${escape(r.city)}</text></g>`}).join('');
 // Evidence markers indicate places, not a reconstructed territorial line.
 const evidence=[{pos:[12.405,44.09],label:lang==='zh'?'卢比孔河地区（位置有争议）':'Rubicon area (location disputed)'},{pos:[-3.628,38.047],label:lang==='zh'?'卡斯图洛附近（行省分界参考点）':'Castulo area (boundary reference)'}].map(e=>{const [x,y]=project(e.pos);return `<g class="evidence-point" transform="translate(${x} ${y})"><path d="M0 -5L5 0L0 5L-5 0Z"/><title>${escape(e.label)}</title></g>`}).join('');
 const [ix,iy]=mapPoint('illyricum');
 const illyricumMarker=`<g data-map-group="illyricum" class="evidence-command ${selectedRegion==='illyricum'?'selected':''}" transform="translate(${ix} ${iy})" role="button" tabindex="0" aria-label="${lang==='zh'?'选择伊利里库姆战区，边界不确定':'Select Illyricum theater, boundary uncertain'}"><circle r="9"/><circle r="5"/><title>${lang==='zh'?'伊利里库姆：点击选择；实际管辖边界未确定':'Illyricum: click to select; historical boundary uncertain'}</title></g>`;
 const moves=s.armies.filter(a=>a.move&&a.owner===s.player).map(a=>{const [x,y]=mapPoint(a.region),[u,v]=mapPoint(a.move.to);return `<path d="M${x} ${y} L${u} ${v}" class="march-arrow" marker-end="url(#arrow)"/>`}).join('');
 const markerOffsets={cisalpine:[-38,-32],italiaN:[12,4],roma:[10,5],italiaS:[12,5]};
 const visibleArmies=[...s.armies.filter(a=>a.owner===s.player&&a.men>0),...reportedArmies(s,s.player)];const markers=visibleArmies.map(a=>{const [x,y]=mapPoint(a.region), peers=visibleArmies.filter(b=>b.region===a.region),idx=peers.findIndex(b=>b.id===a.id),[dx,dy]=markerOffsets[a.region]||[9,-7];return `<g data-army="${a.id}" data-region="${a.region}" class="unit ${selectedArmy===a.id?'selected':''}" transform="translate(${x+dx+idx*55} ${y+dy})"><rect width="52" height="22" rx="1" fill="${colors[a.owner]}"/><path d="M2 2h48v18H2z"/>${factionMark(a.owner,'insignia').replace('<svg ','<svg x="3" y="2" width="18" height="18" ')}<text x="36" y="15">${a.owner===s.player?Math.round(a.men/1000)+'k':'?'}</text><title>${escape(a.name[lang==='zh'?1:0])} · ${a.owner===s.player?escape(a.commander[lang==='zh'?1:0])+' · '+a.men:(lang==='zh'?'兵力未知；报告于 ':'strength unknown; reported ')+a.month+'/'+Math.abs(a.year)+' BCE'}</title></g>`}).join('');
 return `<svg id="map-svg" class="${view[2]>500?'overview':''}" viewBox="${view.join(' ')}" role="img" aria-label="${lang==='zh'?'约公元前49年历史政体地图':'Historical polity map around 49 BCE'}"><defs><clipPath id="landclip"><path d="${LAND}" fill-rule="evenodd"/></clipPath>${patterns.join('')}<pattern id="grain" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1l3 2M5 7l2 -1" stroke="#eee2bd" stroke-opacity=".13"/></pattern><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#f7e6ba"/></marker></defs><rect width="1200" height="650" fill="#485f69"/><path d="${LAND}" fill="#b3ad91" stroke="#323e3a" stroke-width="1.2" fill-rule="evenodd"/><g clip-path="url(#landclip)">${areas}<rect width="1200" height="650" fill="url(#grain)" pointer-events="none"/><path d="${RIVERS}" fill="none" stroke="#788e91" stroke-width="1" opacity=".75" pointer-events="none"/></g><text x="400" y="465" class="sea-name">MARE INTERNVM</text><g pointer-events="none">${labels}</g>${evidence}${illyricumMarker}${moves}${markers}</svg>`;
}
