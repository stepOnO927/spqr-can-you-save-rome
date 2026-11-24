import {knownAgreement,knownAlliance,rememberTreatyCopy,treatyDocument,receiveSignedTreatyCopy} from './treaty-observation.js?v=treaty-observation-1';
import {AGREEMENT_TYPES,fullAllianceTerms,neutralityOfferProblem,neutralityConflicts,agreementCredentials,checkAgreement,proposeAgreement} from './agreements.js?v=focus-agreement-consent-1';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';

const COURIER_COST=2;
const proposalDefinition=type=>type==='full_alliance'?{cost:0}:AGREEMENT_TYPES[type];
function roll(letter,salt){let h=((letter.seed??0)^salt)>>>0;for(const c of `${letter.id}:${letter.sent.year}:${letter.sent.month}:${letter.actor}:${letter.target}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return (h>>>0)/4294967296}

// Sending a proposal cannot inspect the recipient's hidden decision. The
// courier fee is paid now; the treaty's own cost is paid only if concluded.
export function sendAgreementProposal(s,actor,target,type,{secret=false,enemy=null}={}){
 const def=proposalDefinition(type),f=s.factions?.[actor];if(!def||!f||!s.factions?.[target]||actor===target||actor==='rebels'||target==='rebels')return {ok:false,reason:'invalid'};
 if(!s.regions.some(r=>r.owner===actor)||s.wars.some(w=>w.includes(actor)&&w.includes(target)))return {ok:false,reason:'unavailable'};
 if(type==='full_alliance'?knownAlliance(s,actor,target):knownAgreement(s,actor,target,type))return {ok:false,reason:'existing'};
 s.world.agreementLetters||=[];if(s.world.agreementLetters.some(x=>x.actor===actor&&x.target===target&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(f.treasury<COURIER_COST+def.cost)return {ok:false,reason:'treasury'};
 if(type==='neutrality'){const reason=neutralityOfferProblem(s,actor,target,enemy);if(reason)return {ok:false,reason}}
 if(neutralityConflicts(s,actor,target,type))return {ok:false,reason:'neutrality'};
 const id=s.world.nextAgreementLetter||1;s.world.nextAgreementLetter=id+1;f.treasury-=COURIER_COST;
 const letter={id,actor,target,type,secret:!!secret,...(type==='neutrality'?{enemy,warGeneration:s.world.warGenerations?.[[actor,enemy].sort().join(':')]||0}:{}),credentials:agreementCredentials(s,actor),status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},seed:(s.seed??0)>>>0};s.world.agreementLetters.push(letter);
 if(s.world.agreementLetters.length>100){const i=s.world.agreementLetters.findIndex(x=>x.status!=='pending');if(i>=0)s.world.agreementLetters.splice(i,1)}
 return {ok:true,id,cost:COURIER_COST,months:4};
}

// The recipient's evaluation is sealed while the answer returns. Both legs
// can fail; no private reason is exposed when a letter never arrives.
export function answerAgreementProposal(s,id,decision){
 const letter=(s.world?.agreementLetters||[]).find(x=>x.id===id&&x.status==='pending'&&x.phase==='awaiting_player'&&x.target===s.player);
 if(!letter||!['accept_agreement','refuse','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 if(decision==='accept_agreement'&&letter.type==='neutrality'&&neutralityOfferProblem(s,letter.actor,letter.target,letter.enemy,{recipientReview:true}))return {ok:false,reason:'neutrality_offer'};
 if(decision==='accept_agreement'&&neutralityConflicts(s,letter.target,letter.actor,letter.type,{provider:letter.actor}))return {ok:false,reason:'neutrality'};
 const outcome=decision==='accept_agreement'?'accepted':decision==='refuse'?'refused':'no_reply';
 letter.playerDecision=outcome;letter.sealed={outcome,year:s.year,month:s.month};letter.phase='return';letter.remaining=2;return {ok:true};
}

// Ratification is an action at the sender's own court, on receiving the
// dated acceptance. It cannot return a refusal derived from a foreign event.
function ratify(s,letter,checkAlliance){
 const {actor,target,type}=letter,def=proposalDefinition(type),f=s.factions[actor];
 if(!def)return false;
 if(!f||!s.regions.some(r=>r.owner===actor)||s.wars.some(w=>w.includes(actor)&&w.includes(target))||f.treasury<def.cost)return false;
 if(type==='full_alliance'?knownAlliance(s,actor,target):knownAgreement(s,actor,target,type))return false;
 if(neutralityConflicts(s,actor,target,type,{provider:actor}))return false;
 if(type==='neutrality'&&(neutralityOfferProblem(s,actor,target,letter.enemy)||(s.world.warGenerations?.[[actor,letter.enemy].sort().join(':')]||0)!==(letter.warGeneration||0)))return false;
 const reference='agreement-letter:'+letter.id;let document;
 if(type==='full_alliance'){
  const pact=[actor,target,{...fullAllianceTerms(s),reference}],legal=checkAlliance(s,actor,target,{priorConsent:true});
  document={...treatyDocument(pact,'alliance'),paperSequence:letter.id};
  if(legal)s.alliances.push(pact);
  rememberTreatyCopy(s,document,[actor],{source:'own_ratification'});
  rememberPoliticalEvent(s,actor,target,'negotiated_agreement',2);
 }else{
  const result=proposeAgreement(s,actor,target,type,{secret:letter.secret,priorConsent:true,enemy:letter.enemy,ratification:{reference,sequence:letter.id}});
  if(!result.ok)return false;document=result.agreement;
 }
 letter.agreement=document.id;letter.ratified={year:s.year,month:s.month};
 letter.signedCopy={document:structuredClone(document),remaining:2,status:'traveling',warGeneration:s.world.warGenerations?.[[actor,target].sort().join(':')]||0};
 return true;
}

function advanceSignedCopy(s,letter){
 const c=letter.signedCopy;if(c?.status!=='traveling'||--c.remaining>0)return;
 if(roll(letter,0x2195b3c7)<.1){c.status='lost';return}
 c.status='received';c.received={year:s.year,month:s.month};
 receiveSignedTreatyCopy(s,c.document,letter.target,{sender:letter.actor,warGeneration:c.warGeneration});
}

export function advanceAgreementProposals(s,{checkAlliance=()=>false,autoplayPlayer=false}={}){
 for(const letter of s.world?.agreementLetters||[]){
  // Old saves may have an acceptance already back at the sender but still
  // waiting for confirmation. Preserve that consent and the remaining leg;
  // do not invent an earlier payment or an already delivered signed copy.
  if(letter.status==='pending'&&letter.phase==='confirmation'){
   const remaining=Math.max(1,letter.remaining||1);
   letter.status=ratify(s,letter,checkAlliance)?'accepted':'lapsed';letter.phase='delivered';letter.delivered={year:s.year,month:s.month};
   if(letter.signedCopy)letter.signedCopy.remaining=remaining;
   continue;
  }
  if(letter.status!=='pending'){advanceSignedCopy(s,letter);continue}
  if(letter.status==='pending'&&letter.phase==='awaiting_player'){
   if(--letter.remaining<=0){letter.playerDecision='no_reply';letter.sealed={outcome:'no_reply',year:s.year,month:s.month};letter.phase='return';letter.remaining=2}continue;
  }
  if(letter.status!=='pending'||--letter.remaining>0)continue;
  if(letter.phase==='outbound'){
   if(roll(letter,0x349a61f3)<.1){letter.sealed={outcome:'no_reply',year:s.year,month:s.month};letter.phase='return';letter.remaining=2;continue}
   if(!autoplayPlayer&&letter.target===s.player&&letter.actor!==s.player){letter.phase='awaiting_player';letter.remaining=6;continue}
   const result=letter.type==='full_alliance'?{ok:checkAlliance(s,letter.actor,letter.target,{recipientReview:true}),reason:'declined'}:checkAgreement(s,letter.actor,letter.target,letter.type,{recipientReview:true,credentials:letter.credentials,enemy:letter.enemy});
   const outcome=!result.ok?(result.reason==='declined'?'refused':'unavailable'):roll(letter,0x92f03d41)<.15?'refused':'accepted';
   letter.sealed={outcome,year:s.year,month:s.month};letter.phase='return';letter.remaining=2;continue;
  }
  const outcome=roll(letter,0x8de729b5)<.1?'no_reply':letter.sealed?.outcome||'no_reply';
  if(outcome==='accepted')letter.status=ratify(s,letter,checkAlliance)?'accepted':'lapsed';
  else letter.status=outcome==='refused'?'refused':'no_reply';
  letter.answered=letter.sealed?{year:letter.sealed.year,month:letter.sealed.month}:null;delete letter.sealed;letter.phase='delivered';letter.delivered={year:s.year,month:s.month};
  if(letter.actor===s.player){const texts={accepted:['A diplomatic agreement was concluded.','外交条约已达成。'],refused:['The other court declined the proposed agreement.','对方拒绝了条约提议。'],lapsed:['The proposed agreement could not be concluded under current conditions.','当前条件下无法最终达成条约。'],no_reply:['No agreement reply arrived; a letter may have been lost.','未收到条约回信；书信可能遗失。']};const [en,zh]=texts[letter.status];s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)}
 }
}


