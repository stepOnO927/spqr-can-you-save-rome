import {FACTIONS} from './data.js?v=peace-outcome-1';

export function validPlayableCampaign(data){
 if(!data||!Array.isArray(data.regions)||!data.regions.length||!Array.isArray(data.armies)||!data.factions?.[data.player])return false;
 if(['caesar','senate'].includes(data.player))return true;
 if(data.localCampaign?.id!==data.player||data.scenario!=='local_city'||!data.regions.some(region=>region.localEntities?.some(entity=>entity.id===data.player&&entity.type==='city_state'&&(entity.procedural||entity.id==='massilia'&&entity.historical&&entity.ruler?.fictional))))return false;
 // A court can dissolve while an already-paid envoy is travelling. Its
 // historical recipient remains valid in the save even without a live court.
 const validOffer=(offer,max)=>offer==null||!Array.isArray(offer)&&typeof offer==='object'&&typeof offer.host==='string'&&offer.host!==data.player&&Object.hasOwn(FACTIONS,offer.host)&&Number.isInteger(offer.remaining)&&offer.remaining>=1&&offer.remaining<=max;
 const peerOffer=data.localCampaign.peerTradeOffer;
 const validPeer=peerOffer==null||!Array.isArray(peerOffer)&&typeof peerOffer==='object'&&typeof peerOffer.host==='string'&&peerOffer.host!==data.player&&data.regions.some(region=>region.localEntities?.some(entity=>entity.id===peerOffer.host&&entity.type==='city_state'))&&Number.isInteger(peerOffer.remaining)&&peerOffer.remaining>=1&&peerOffer.remaining<=2;
 const contacts=data.localCampaign.peerContacts;
 const validContacts=contacts==null||!Array.isArray(contacts)&&typeof contacts==='object'&&Object.entries(contacts).length<=30&&Object.entries(contacts).every(([id,record])=>{
  const peer=data.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id===id&&entity.type==='city_state');
  return peer&&record&&!Array.isArray(record)&&typeof record.rulerId==='string'&&data.world?.localRulers?.[record.rulerId]?.polityId===id&&Array.isArray(record.name)&&record.name.length===2&&record.name.every(value=>typeof value==='string'&&value.length>0&&value.length<=80)&&Number.isInteger(record.year)&&Number.isInteger(record.month)&&record.month>=1&&record.month<=12&&record.year*12+record.month<=data.year*12+data.month&&typeof record.accepted==='boolean';
 });
 const offers=[data.localCampaign.tradeOffer,peerOffer,data.localCampaign.protectionOffer,data.localCampaign.independenceOffer];
 return validOffer(offers[0],2)&&validPeer&&validContacts&&validOffer(offers[2],3)&&validOffer(offers[3],2)&&offers.filter(Boolean).length<=1;
}
