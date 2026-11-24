import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {proposeCommercialLeague,answerCommercialLeagueOffer,advanceCommercialLeagueOffers,advanceCommercialLeagues,leaveCommercialLeague,proposeCommercialLeaguesAI} from '../commercial-leagues.js?v=dossier-archive-1';
import {syncCommercialLeagueLetters,replyToLetter} from '../epistulae.js?v=dossier-archive-1';
import {knownOrganizations,organizationMapColor} from '../map-lab/organization-map.js';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=dossier-archive-1';

const roll=()=>.5;
function arrange(leader='caesar'){
 const s=newGame('caesar'),members=['caesar','egypt','numidia'].filter(id=>id!==leader);
 for(const [a,b] of [['caesar','egypt'],['caesar','numidia'],['egypt','numidia']])s.relations[[a,b].sort().join(':')]=35;
 s.world.diplomaticKnowledge[leader]||={};
 for(const id of members)s.world.diplomaticKnowledge[leader][`contact:${id}`]={id:`contact:${id}`,kind:'agreement',status:'active',parties:[leader,id],year:s.year,month:s.month};
 return {s,members};
}
function advance(s,n=1){for(let i=0;i<n;i++){s.month++;if(s.month>12){s.month=1;s.year++}advanceCommercialLeagueOffers(s,roll)}}

test('commercial league requires contact, separate consent and real dues',()=>{
 const {s,members}=arrange(),before=Object.fromEntries(['caesar',...members].map(id=>[id,s.factions[id].treasury]));
 assert.equal(proposeCommercialLeague(s,'caesar',['egypt','egypt']).ok,false);
 assert.equal(proposeCommercialLeague(s,'caesar',members,{name:123}).reason,'name');
 const result=proposeCommercialLeague(s,'caesar',members,{name:'League of Three Ports'});
 assert.ok(result.ok,JSON.stringify(result));
 assert.equal(s.factions.caesar.treasury,before.caesar-3);
 assert.equal(s.world.commercialLeagues.length,0);
 advance(s,4);
 const c=s.world.commercialLeagues[0];
 assert.equal(c.name,'League of Three Ports');
 assert.deepEqual(c.foundingMembers,['caesar','egypt','numidia']);
 assert.equal(c.charter.militaryObligations,'none');
 assert.equal(c.reserve,9);
 assert.equal(s.factions.caesar.treasury,before.caesar-6);
 assert.equal(s.factions.egypt.treasury,before.egypt-3);
 assert.equal(s.factions.numidia.treasury,before.numidia-3);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(knownOrganizations(restored,'caesar').find(x=>x.id===c.id)?.name,c.name);
 assert.equal(organizationMapColor(['egypt'],knownOrganizations(restored,'caesar').find(x=>x.id===c.id)),'#9673b6');
});

test('player invitation arrives as a letter and requires explicit reply and confirmation',()=>{
 const {s,members}=arrange('egypt'),before=s.factions.caesar.treasury;
 assert.ok(proposeCommercialLeague(s,'egypt',members).ok);
 advance(s,2);syncCommercialLeagueLetters(s);
 const letter=s.mail.messages.find(m=>m.context?.kind==='commercial_league_offer');
 assert.equal(letter?.delivery,'received');
 assert.ok(replyToLetter(s,letter.id,'accept_commercial_league',{answerCommercialLeagueOffer}).ok);
 assert.equal(s.factions.caesar.treasury,before);
 advance(s,2);
 assert.equal(s.world.commercialLeagues.length,0);
 advance(s,2);syncCommercialLeagueLetters(s);
 assert.equal(s.world.commercialLeagues[0]?.parties.includes('caesar'),true);
 assert.equal(s.factions.caesar.treasury,before-3);
 assert.ok(s.mail.messages.some(m=>m.context?.kind==='commercial_league_result'));
});

test('quarterly food trade conserves food and uses only member stocks and reserve',()=>{
 const {s,members}=arrange();assert.ok(proposeCommercialLeague(s,'caesar',members).ok);advance(s,4);
 const c=s.world.commercialLeagues[0];s.month=6;
 s.factions.caesar.food=40;s.factions.egypt.food=20;s.factions.numidia.food=28;
 const before={supplier:s.factions.caesar.treasury,buyer:s.factions.egypt.treasury,reserve:c.reserve};
 advanceCommercialLeagues(s);
 assert.equal(s.factions.caesar.food,37);assert.equal(s.factions.egypt.food,23);
 assert.equal(s.factions.caesar.treasury,before.supplier+2);
 assert.equal(s.factions.egypt.treasury,before.buyer-2);
 assert.equal(c.reserve,before.reserve-1);
 assert.equal(c.transfers.length,1);
 advanceCommercialLeagues({...s,month:7});assert.equal(c.transfers.length,1);
});

test('foreign league remains invisible until a dated report and withdrawal dissolves it',()=>{
 const {s,members}=arrange();assert.ok(proposeCommercialLeague(s,'caesar',members).ok);advance(s,4);
 const c=s.world.commercialLeagues[0];
 assert.equal(knownOrganizations(s,'armenia').find(x=>x.id===c.id),undefined);
 observeDiplomacy(s);
 const report=knownOrganizations(s,'armenia').find(x=>x.id===c.id);
 if(report){assert.equal(report.reserve,undefined);assert.equal(report.source,'frontier')}
 assert.ok(leaveCommercialLeague(s,c.id,'caesar').ok);
 assert.equal(c.status,'dissolved');
 assert.equal(knownOrganizations(s,'caesar').find(x=>x.id===c.id&&x.status==='active'),undefined);
});

test('AI courts can initiate a league but cannot enroll a human without consent',()=>{
 const {s,members}=arrange('egypt');s.difficulty='standard';s.month=7;
 proposeCommercialLeaguesAI(s,()=>0);
 const offer=s.world.commercialLeagueOffers.find(o=>o.leader==='egypt');
 assert.deepEqual(offer?.members,members);
 assert.equal(offer.humanRecipient,'caesar');
 advance(s,2);
 assert.equal(offer.phase,'awaiting_player');
 assert.ok(answerCommercialLeagueOffer(s,offer.id,'refuse').ok);
 advance(s,2);
 assert.equal(offer.status,'refused');
 assert.equal(s.world.commercialLeagues.some(c=>c.parties.includes('caesar')),false);
});
