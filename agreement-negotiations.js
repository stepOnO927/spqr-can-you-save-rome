import {AGREEMENT_TYPES,activeAgreement,checkAgreement,proposeAgreement} from './agreements.js?v=missing-health-1';

const COURIER_COST=2;
const proposalDefinition=type=>type==='full_alliance'?{cost:0}:AGREEMENT_TYPES[type];
function roll(letter,salt){let h=((letter.seed??0)^salt)>>>0;for(const c of `${letter.id}:${letter.sent.year}:${letter.sent.month}:${letter.actor}:${letter.target}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return (h>>>0)/4294967296}

// Sending a proposal cannot inspect the recipient's hidden decision. The
// courier fee is paid now; the treaty's own cost is paid only if concluded.
export function sendAgreementProposal(s,actor,target,type,{secret=false}={}){
 const def=proposalDefinition(type),f=s.factions?.[actor];if(!def||!f||!s.factions?.[target]||actor===target||actor==='rebels'||target==='rebels')return {ok:false,reason:'invalid'};
 if(!s.regions.some(r=>r.owner===actor)||s.wars.some(w=>w.includes(actor)&&w.includes(target)))return {ok:false,reason:'unavailable'};
 if(type==='full_alliance'?s.alliances.some(a=>a.includes(actor)&&a.includes(target)):activeAgreement(s,actor,target,type))return {ok:false,reason:'existing'};
 s.world.agreementLetters||=[];if(s.world.agreementLetters.some(x=>x.actor===actor&&x.target===target&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(f.treasury<COURIER_COST+def.cost)return {ok:false,reason:'treasury'};
 const id=s.world.nextAgreementLetter||1;s.world.nextAgreementLetter=id+1;f.treasury-=COURIER_COST;
 const letter={id,actor,target,type,secret:!!secret,status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},seed:(s.seed??0)>>>0};s.world.agreementLetters.push(letter);
 if(s.world.agreementLetters.length>100){const i=s.world.agreementLetters.findIndex(x=>x.status!=='pending');if(i>=0)s.world.agreementLetters.splice(i,1)}
 return {ok:true,id,cost:COURIER_COST,months:4};
}

// The recipient's evaluation is sealed while the answer returns. Both legs
// can fail; no private reason is exposed when a letter never arrives.
export function answerAgreementProposal(s,id,decision){
 const letter=(s.world?.agreementLetters||[]).find(x=>x.id===id&&x.status==='pending'&&x.phase==='awaiting_player'&&x.target===s.player);
 if(!letter||!['accept_agreement','refuse','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 const outcome=decision==='accept_agreement'?'accepted':decision==='refuse'?'refused':'no_reply';
 letter.playerDecision=outcome;letter.sealed={outcome,year:s.year,month:s.month};letter.phase='return';letter.remaining=2;return {ok:true};
}

export function advanceAgreementProposals(s,{checkAlliance=()=>false,concludeAlliance=()=>false,autoplayPlayer=false}={}){
 for(const letter of s.world?.agreementLetters||[]){
  if(letter.status==='pending'&&letter.phase==='awaiting_player'){
   if(--letter.remaining<=0){letter.playerDecision='no_reply';letter.sealed={outcome:'no_reply',year:s.year,month:s.month};letter.phase='return';letter.remaining=2}continue;
  }
  if(letter.status!=='pending'||--letter.remaining>0)continue;
  if(letter.phase==='outbound'){
   if(roll(letter,0x349a61f3)<.1){letter.sealed={outcome:'no_reply',year:s.year,month:s.month};letter.phase='return';letter.remaining=2;continue}
   if(!autoplayPlayer&&letter.target===s.player&&letter.actor!==s.player){letter.phase='awaiting_player';letter.remaining=6;continue}
   const result=letter.type==='full_alliance'?{ok:checkAlliance(s,letter.actor,letter.target),reason:'declined'}:checkAgreement(s,letter.actor,letter.target,letter.type);
   const outcome=!result.ok?(result.reason==='declined'?'refused':'unavailable'):roll(letter,0x92f03d41)<.15?'refused':'accepted';
   letter.sealed={outcome,year:s.year,month:s.month};letter.phase='return';letter.remaining=2;continue;
  }
  if(letter.phase==='confirmation'){
   if(roll(letter,0x2195b3c7)<.1){letter.status='no_reply';letter.phase='lost';continue}
   const result=letter.type==='full_alliance'?{ok:concludeAlliance(s,letter.actor,letter.target)}:proposeAgreement(s,letter.actor,letter.target,letter.type,{secret:letter.secret,priorConsent:true});
   letter.status=result.ok?'accepted':'lapsed';if(result.agreement)letter.agreement=result.agreement.id;letter.delivered={year:s.year,month:s.month};letter.phase='delivered';continue;
  }
  const outcome=roll(letter,0x8de729b5)<.1?'no_reply':letter.sealed?.outcome||'no_reply';
  if(letter.playerDecision==='accepted'&&outcome==='accepted'){letter.phase='confirmation';letter.remaining=2;letter.answered={year:letter.sealed.year,month:letter.sealed.month};delete letter.sealed;continue}
  if(outcome==='accepted'){const result=letter.type==='full_alliance'?{ok:concludeAlliance(s,letter.actor,letter.target)}:proposeAgreement(s,letter.actor,letter.target,letter.type,{secret:letter.secret,priorConsent:true});letter.status=result.ok?'accepted':'lapsed';if(result.agreement)letter.agreement=result.agreement.id}
  else letter.status=outcome==='refused'?'refused':'no_reply';
  letter.answered=letter.sealed?{year:letter.sealed.year,month:letter.sealed.month}:null;delete letter.sealed;letter.phase='delivered';letter.delivered={year:s.year,month:s.month};
  if(letter.actor===s.player){const texts={accepted:['A diplomatic agreement was concluded.','外交条约已达成。'],refused:['The other court declined the proposed agreement.','对方拒绝了条约提议。'],lapsed:['The proposed agreement could not be concluded under current conditions.','当前条件下无法最终达成条约。'],no_reply:['No agreement reply arrived; a letter may have been lost.','未收到条约回信；书信可能遗失。']};const [en,zh]=texts[letter.status];s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)}
 }
}
