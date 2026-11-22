// Place regional names near their geographic anchors after the SVG is drawn.
// Browser text metrics matter here: English and Chinese glyphs have different widths.
export function avoidGrandLabelCollisions(svg){
 const labels=[...svg.querySelectorAll('.grand-region-label')];
 if(!labels.length)return;
 const land=svg.querySelector('#landclip path');
 const canTestLand=land&&typeof land.isPointInFill==='function'&&typeof DOMPoint==='function';
 const units=[...svg.querySelectorAll('.unit')].map(el=>el.getBoundingClientRect());
 const bounds=svg.getBoundingClientRect(),placed=[];
 const candidates=[[0,0],[0,-23],[0,23],[-38,0],[38,0],[-38,-23],[38,-23],[-38,23],[38,23],[0,-43],[0,43],[-65,0],[65,0],[-65,-23],[65,-23],[-65,23],[65,23],[0,-65],[0,65],[-95,0],[95,0]];
 const intersection=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 const score=(rect,x,y,dx,dy)=>{
  const outside=Math.max(0,bounds.left-rect.left)+Math.max(0,rect.right-bounds.right)+Math.max(0,bounds.top-rect.top)+Math.max(0,rect.bottom-bounds.bottom);
  const collisions=[...units,...placed].reduce((total,other)=>{const area=intersection(rect,other);return total+(area?300+area:0)},0);
  const water=canTestLand&&!land.isPointInFill(new DOMPoint(x+dx,y+dy-4))?1500:0;
  return collisions+outside*100+water+Math.hypot(dx,dy)*.15;
 };
 for(const label of labels){
  const x=Number(label.getAttribute('x')),y=Number(label.getAttribute('y'));
  let best=null;
  for(const [dx,dy] of candidates){
   label.setAttribute('x',String(x+dx));label.setAttribute('y',String(y+dy));
   const rect=label.getBoundingClientRect(),value=score(rect,x,y,dx,dy);
   if(!best||value<best.value)best={dx,dy,value};
   if(value===0)break;
  }
  label.setAttribute('x',String(x+best.dx));label.setAttribute('y',String(y+best.dy));
  placed.push(label.getBoundingClientRect());
 }
}
