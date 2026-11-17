const date=s=>s.year*12+s.month;
const relation=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
export const COALITION_AID={treasury:8,food:6};

export function initializeCoalitionAssistance(s){s.world.coalitionAidRequests||=[];s.world.nextCoalitionAidRequest||=1;return s}

export function sendCoalitionAidRequest(s,coalitionId,requester,recipient){
 initializeCoalitionAssistance(s);
 const c=s.coalitions?.find(x=>x.id===coalitionId&&x.status==='active'&&date(s)<x.expiresAt);
 if(!c||!c.parties.includes(requester)||!c.parties.includes(recipient)||requester===recipient)return {ok:false,reason:'membership'};
 if((s.factions[requester]?.treasury??0)<2)return {ok:false,reason:'treasury'};
 const recent=s.world.coalitionAidRequests.some(x=>x.coalitionId===coalitionId&&x.requester===requester&&x.recipient===recipient&&date(s)-(x.sent.year*12+x.sent.month)<6);
 if(recent)return {ok:false,reason:'cooldown'};
 s.factions[requester].treasury-=2;
 const request={id:s.world.nextCoalitionAidRequest++,coalitionId,requester,recipient,status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},...(recipient===s.player?{humanRecipient:s.player}:{})};
 s.world.coalitionAidRequests.push(request);
 if(s.world.coalitionAidRequests.length>100){const old=s.world.coalitionAidRequests.findIndex(x=>x.status!=='pending');if(old>=0)s.world.coalitionAidRequests.splice(old,1)}
 return {ok:true,request,cost:2};
}

function canDonate(s,recipient){const f=s.factions[recipient];return !!f&&f.treasury>=COALITION_AID.treasury+15&&f.food>=COALITION_AID.food+20}

export function answerCoalitionAidRequest(s,id,choice){
 const x=s.world?.coalitionAidRequests?.find(y=>y.id===Number(id)&&y.status==='pending'&&y.phase==='awaiting_player'&&y.humanRecipient===s.player);
 if(!x||!['send_coalition_aid','refuse','ignore'].includes(choice))return {ok:false,reason:'unavailable'};
 if(choice==='send_coalition_aid'&&!canDonate(s,s.player))return {ok:false,reason:'resources'};
 if(choice==='send_coalition_aid'){s.factions[s.player].treasury-=COALITION_AID.treasury;s.factions[s.player].food-=COALITION_AID.food;x.sealedAid={...COALITION_AID}}
 x.decision=choice==='send_coalition_aid'?'accepted':choice==='refuse'?'refused':'no_reply';x.phase='return';x.remaining=2;return {ok:true};
}

function finish(s,x){
 x.phase='delivered';x.delivered={year:s.year,month:s.month};
 if(x.status==='accepted'){
  const f=s.factions[x.requester];if(f&&x.sealedAid){f.treasury+=x.sealedAid.treasury;f.food+=x.sealedAid.food;x.deliveredAid={...x.sealedAid}}else x.status='lapsed';
 }
 delete x.sealedAid;
 if(x.requester===s.player){const en=x.status==='accepted'?'Coalition aid reached our court.':x.status==='refused'?'Our coalition ally declined aid.':'Our coalition aid request brought no usable aid.';const zh=x.status==='accepted'?'联盟援助已抵达本朝。':x.status==='refused'?'盟友拒绝提供援助。':'本方联盟援助请求未带来可用物资。';s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)}
}

export function advanceCoalitionAidRequests(s,roll,{autoplayPlayer=false}={}){
 for(const x of s.world?.coalitionAidRequests||[]){
  if(x.status!=='pending')continue;
  if(x.phase==='awaiting_player'){
   if(--x.remaining<=0){x.decision='no_reply';x.phase='return';x.remaining=2}
   continue;
  }
  if(--x.remaining>0)continue;
  if(x.phase==='outbound'){
   const c=s.coalitions?.find(y=>y.id===x.coalitionId);
   if(!c||c.status!=='active'||!c.parties.includes(x.requester)||!c.parties.includes(x.recipient)){x.status='lapsed';finish(s,x);continue}
   if(roll(s,x.requester,x.id*29)<.1){x.status='no_reply';finish(s,x);continue}
   if(x.humanRecipient&&!autoplayPlayer){x.phase='awaiting_player';x.remaining=6;continue}
   const willing=canDonate(s,x.recipient)&&relation(s,x.recipient,x.requester)>=10&&c.cohesion>=25;
   x.decision=willing&&roll(s,x.recipient,x.id*29+1)<.8?'accepted':'refused';
   if(x.decision==='accepted'){s.factions[x.recipient].treasury-=COALITION_AID.treasury;s.factions[x.recipient].food-=COALITION_AID.food;x.sealedAid={...COALITION_AID}}
   x.phase='return';x.remaining=2;continue;
  }
  x.status=roll(s,x.recipient,x.id*29+2)<.1?'no_reply':x.decision||'no_reply';finish(s,x);
 }
}

export function proposeCoalitionAidAI(s,{autoplayPlayer=false}={}){
 if(s.month%6!==0)return;
 for(const c of s.coalitions||[]){
  if(c.status!=='active')continue;
  const requester=c.parties.find(id=>(autoplayPlayer||id!==s.player)&&s.factions[id]?.treasury>=2&&(s.factions[id].treasury<18||s.factions[id].food<18));
  if(!requester)continue;
  const recipient=c.parties.filter(id=>id!==requester).sort((a,b)=>relation(s,requester,b)-relation(s,requester,a)).find(id=>relation(s,requester,id)>=20);
  if(recipient)sendCoalitionAidRequest(s,c.id,requester,recipient);
 }
}
