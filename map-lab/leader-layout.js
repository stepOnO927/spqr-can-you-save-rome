// Work in viewport pixels so labels can move a little without changing their
// geographic anchors. Prefer full labels, then short faction labels; if the
// screen is too crowded the faction directory remains available.
const overlaps=(a,b,pad=3)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
const rect=(x,y,width,height,dx,dy)=>({left:x-width/2+dx,right:x+width/2+dx,top:y-height+dy,bottom:y+dy});
const inside=(r,b)=>r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom;
const offsets=[[0,0],[0,-38],[0,38],[-45,0],[45,0],[-45,-38],[45,-38],[-45,38],[45,38],[0,-76],[0,76]];

export function placeLeaderLabels(labels,blockers,bounds,candidates=offsets){
 const occupied=[...blockers],placed=[];
 for(const label of labels){let choice=null;
  for(const compact of [false,true]){
   const size=compact?label.compact:label.full;
   if(!size||size.width<=0||size.height<=0)continue;
   for(const [dx,dy] of candidates){const box=rect(label.x,label.y,size.width,size.height,dx,dy);if(inside(box,bounds)&&!occupied.some(other=>overlaps(box,other))){choice={id:label.id,dx,dy,compact,hidden:false,box};break}}
   if(choice)break;
  }
  if(choice){occupied.push(choice.box);placed.push(choice)}else placed.push({id:label.id,dx:0,dy:0,compact:true,hidden:true,box:null});
 }
 return placed;
}
