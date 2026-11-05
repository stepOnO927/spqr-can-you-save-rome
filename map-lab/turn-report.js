// Chronicle projections contain only the player's own orders, never live enemy data.
export function captureOwnOrders(state){
 return state.armies.filter(a=>a.owner===state.player).map(a=>({id:a.id,name:[...a.name],region:a.region,move:a.move?{...a.move}:null,siege:a.siege?{...a.siege}:null}));
}
export function ownOrderUpdates(before,state){
 const places=new Map(state.regions.map(r=>[r.id,r.name]));
 const label=id=>places.get(id)||['Unknown theater','未知战区'];
 return before.flatMap(old=>{
  if(!old.move&&!old.siege)return [];
  const current=state.armies.find(a=>a.id===old.id&&a.owner===state.player);
  if(!current)return [{name:old.name,kind:'unavailable'}];
  if(current.move)return [{name:old.name,kind:'marching',place:label(current.move.to),remaining:current.move.remaining}];
  if(current.siege)return [{name:old.name,kind:'siege',place:label(current.siege.region),remaining:current.siege.remaining}];
  if(old.move&&current.region===old.move.to)return [{name:old.name,kind:'arrived',place:label(current.region)}];
  if(old.siege&&state.regions.some(r=>r.id===old.siege.region&&r.owner===state.player))return [{name:old.name,kind:'siege_complete',place:label(old.siege.region)}];
  return [{name:old.name,kind:'ended',place:label(current.region)}];
 });
}
export function formatOwnOrder(update,language){
 const zh=language==='zh',i=zh?1:0,name=update.name?.[i]||'',place=update.place?.[i]||'';
 switch(update.kind){
  case 'marching':return zh?`${name}正向${place}行军，剩余${update.remaining}个月。`:`${name} is marching to ${place}; ${update.remaining} month(s) remain.`;
  case 'siege':return zh?`${name}围攻${place}，剩余${update.remaining}个月。`:`${name} is besieging ${place}; ${update.remaining} month(s) remain.`;
  case 'arrived':return zh?`${name}抵达${place}。`:`${name} arrived in ${place}.`;
  case 'siege_complete':return zh?`${name}完成对${place}的围攻。`:`${name} completed the siege of ${place}.`;
  case 'ended':return zh?`${name}的命令已结束；目前位于${place}。`:`${name}'s order ended; it is now in ${place}.`;
  default:return zh?`${name}已不可用；请查看战报。`:`${name} is unavailable; check the chronicle.`;
 }
}
