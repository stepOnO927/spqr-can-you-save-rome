import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {configureStartingDifficulty} from '../difficulty.js';
import {playableLocalCities,startLocalCampaign,localCampaignCity,localRecruit,localTradeOffer,localTradePartners,localPeerCities,localPeerTradeOffer,peerTradeTrustNeeded,localProtectionOffer,localIndependenceOffer,advanceLocalCampaign} from '../local-campaign.js';
import {receivedMail} from '../epistulae.js';
import {armyExpeditionSupply} from '../expedition-supply.js';
import {validPlayableCampaign} from '../local-campaign-save.js';
import {importSaves} from '../save-transfer.js';
import {localCouncilHtml} from '../local-campaign-ui.js';
import {advanceLocalEntities,advanceLocalTrade} from '../local-polities.js';

const opening=(difficulty='standard')=>{const state=configureStartingDifficulty(newGame('caesar'),difficulty,false,{localSeed:273});const city=playableLocalCities(state).find(entity=>entity.procedural);assert.ok(city);const host=state.regions.find(region=>region.id===city.theater);const owner=host.owner;startLocalCampaign(state,city.id);return {state,city,host,owner}};

test('generated city is a playable site without transferring its host theater',()=>{
 const {state,city,host,owner}=opening(),f=state.factions[state.player];
 assert.equal(host.owner,owner);assert.notEqual(host.owner,state.player);
 assert.equal(f.treasury,city.treasury);assert.equal(f.food,city.food);
 assert.ok(state.armies.some(army=>army.owner===state.player&&army.region===city.theater));
 assert.equal(armyExpeditionSupply(state,state.armies.find(army=>army.owner===state.player)).status,'full');
 assert.equal(validPlayableCampaign(state),true);
 assert.match(localCouncilHtml(state),/CAMPAIGN COUNCIL/);
 assert.match(localCouncilHtml(state),/Steward/);
 assert.equal(localRecruit(state),true);
 assert.equal(city.population,localCampaignCity(state).population);
});

test('historical Massilia starts a city campaign with explicitly simulated leadership and transferable saves',()=>{
 const make=(difficulty='standard',seed=273)=>configureStartingDifficulty(newGame('caesar'),difficulty,false,{localSeed:seed});
 const state=make(),city=playableLocalCities(state).find(entity=>entity.id==='massilia');
 assert.ok(city);assert.equal(city.historical,true);assert.equal(city.procedural,undefined);
 assert.equal(city.ruler.fictional,true);assert.deepEqual(city.ruler,playableLocalCities(make()).find(entity=>entity.id==='massilia').ruler);
 assert.notDeepEqual(city.ruler,playableLocalCities(make('standard',274)).find(entity=>entity.id==='massilia').ruler);
 assert.equal(state.world.localRulers[city.ruler.id].polityId,'massilia');
 const host=state.regions.find(region=>region.id===city.theater),owner=host.owner;
 startLocalCampaign(state,city.id);
 assert.equal(state.player,'massilia');assert.equal(host.owner,owner);assert.equal(city.controller,'massilia');
 assert.equal(validPlayableCampaign(state),true);
 assert.match(localCouncilHtml(state),/HISTORICAL CITY · SIMULATED LEADERSHIP/);
 assert.match(localCouncilHtml(state),/not verified historical identities or counts/);
 const storage=new Map(),wrapper={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 assert.deepEqual(importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':JSON.stringify(state)}},wrapper).imported,['spqr-save-1']);
 const restored=upgradeSave(JSON.parse(storage.get('spqr-save-1')));
 assert.equal(restored.player,'massilia');assert.equal(validPlayableCampaign(restored),true);
 assert.deepEqual(localCampaignCity(restored).ruler,city.ruler);
 assert.equal(restored.regions.find(region=>region.id===city.theater).owner,owner);
 const legacy=upgradeSave(JSON.parse(JSON.stringify(newGame('caesar'))));
 assert.equal(legacy.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='massilia').ruler,undefined);
});

test('every generated city-state at expert difficulty can start and save its own campaign',()=>{
 const seed=273,preview=configureStartingDifficulty(newGame('caesar'),'expert',false,{localSeed:seed});
 const choices=playableLocalCities(preview).filter(city=>city.procedural).map(city=>city.id);
 assert.ok(choices.length>=2,'expert should expose more than the first generated city');
 for(const id of choices){
  const state=configureStartingDifficulty(newGame('caesar'),'expert',false,{localSeed:seed});
  const city=playableLocalCities(state).find(item=>item.id===id),host=state.regions.find(region=>region.id===city.theater),owner=host.owner;
  startLocalCampaign(state,id);
  assert.equal(state.player,id);assert.equal(localCampaignCity(state)?.id,id);
  assert.equal(host.owner,owner);assert.equal(city.controller,id);
  assert.equal(validPlayableCampaign(state),true);
  assert.equal(validPlayableCampaign(upgradeSave(structuredClone(state))),true);
 }
});

test('an absent trade agreement is not mistaken for a future expiry in BCE',()=>{
 const {state}=opening();
 assert.match(localCouncilHtml(state),/No active trade compact/);
 assert.match(localCouncilHtml(state),/data-local-trade[^>]*>OFFER TRADE/);
 assert.equal(localTradeOffer(state),true);
 assert.match(localCouncilHtml(state),/data-local-trade[^>]*disabled/);
});

test('city trade moves actual goods and qualifies a surviving city for victory',()=>{
 const {state,city,host,owner}=opening(),before=state.factions[owner].food;
 assert.equal(localTradeOffer(state),true);
 for(let month=0;month<24;month++)tick(state);
 assert.equal(state.localCampaign.survived,24);
 assert.ok(state.localCampaign.tradeCompleted>0);
 assert.ok(state.factions[owner].food>before);
 assert.equal(state.victory,true);
 assert.equal(host.owner,owner);
});

test('a generated city can negotiate a funded trade compact with a reachable neighboring court',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'standard',false,{localSeed:6}),city=playableLocalCities(state).find(entity=>entity.procedural);
 assert.equal(city.theater,'anatolia');startLocalCampaign(state,city.id);
 assert.ok(localTradePartners(state).includes('armenia'));
 assert.match(localCouncilHtml(state),/data-local-trade-partner/);
 assert.equal(localTradeOffer(state,'parthia'),false,'a distant court is not an eligible route');
 const cash=state.factions[city.id].treasury;
 assert.equal(localTradeOffer(state,'armenia'),true);
 assert.equal(state.factions[city.id].treasury,cash-3);
 assert.equal(state.localCampaign.tradeOffer.host,'armenia');
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).localCampaign.tradeOffer.host,'armenia');
 tick(state);assert.equal(city.tradeRights?.armenia,undefined);
 tick(state);assert.ok(city.tradeRights.armenia>state.year*12+state.month);
 assert.match(localCouncilHtml(state),/A nearby trade compact is active/);
 for(let i=0;i<4;i++)tick(state);
 assert.equal(city.lastTrade.actor,'armenia');
 assert.equal(city.lastTrade.food,2);assert.equal(city.lastTrade.price,3);
 assert.ok(state.localCampaign.tradeCompleted>0);
 assert.ok(receivedMail(state).some(letter=>letter.context?.proposal==='trade'&&letter.context.host==='armenia'&&letter.context.accepted));
});

test('generated city can make a real finite-resource compact with another autonomous city',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:273});
 const city=playableLocalCities(state).find(item=>item.id==='generated:narbo');
 startLocalCampaign(state,city.id);
 const peer=localPeerCities(state).find(item=>item.id==='massilia');
 assert.ok(peer);assert.match(localCouncilHtml(state),/SEND CITY TRADE ENVOYS/);
 assert.equal(localPeerTradeOffer(state,'generated:africa'),false,'uncontacted distant city is not eligible');
 const cash=state.factions[city.id].treasury;
 assert.equal(localPeerTradeOffer(state,peer.id),true);
 assert.equal(state.factions[city.id].treasury,cash-3);
 assert.equal(localTradeOffer(state),false,'a second mission must wait');
 assert.equal(validPlayableCampaign(upgradeSave(structuredClone(state))),true);
 tick(state);assert.equal(city.peerTradeRights?.[peer.id],undefined);
 tick(state);assert.ok(city.peerTradeRights?.[peer.id]>state.year*12+state.month);
 assert.ok(receivedMail(state).some(letter=>letter.context?.kind==='local_peer_trade_result'&&letter.context.host===peer.id&&letter.context.accepted));
 const reply=receivedMail(state).find(letter=>letter.context?.kind==='local_peer_trade_result'&&letter.context.host===peer.id);
 assert.equal(reply.context.rulerId,peer.ruler.id);assert.deepEqual(reply.senderName,peer.ruler.name);
 assert.equal(state.localCampaign.peerContacts[peer.id].rulerId,peer.ruler.id);
 assert.match(localCouncilHtml(state),/CITY CORRESPONDENCE/);
 assert.match(localCouncilHtml(state),new RegExp(peer.ruler.name[0]));
 assert.equal(validPlayableCampaign(upgradeSave(structuredClone(state))),true);
 const before={cityFood:state.factions[city.id].food,cityCash:state.factions[city.id].treasury,peerFood:peer.food,peerCash:peer.treasury,trades:state.localCampaign.tradeCompleted};
 for(let i=0;i<4;i++)tick(state);
 assert.ok(state.localCampaign.tradeCompleted>before.trades);
 assert.ok(peer.food<before.peerFood+8,'peer food is a finite source');
 assert.ok(peer.treasury>=before.peerCash+3);
 assert.ok(state.factions[city.id].food>=before.cityFood);
});

test('a generated peer ruler personality changes a real trade decision at the same trust',()=>{
 const scenario=personality=>{
  const state=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:273});
  startLocalCampaign(state,'generated:narbo');
  const peer=localPeerCities(state).find(item=>item.id==='massilia');
  peer.ruler.personality=personality;
  state.relations[[state.player,peer.id].sort().join(':')]=-15;
  assert.equal(localPeerTradeOffer(state,peer.id),true);
  tick(state);tick(state);
  return {state,peer,reply:receivedMail(state).find(letter=>letter.context?.kind==='local_peer_trade_result'&&letter.context.host===peer.id)};
 };
 const cautious=scenario('cautious'),pragmatic=scenario('pragmatic');
 assert.ok(peerTradeTrustNeeded(cautious.peer)>-15);
 assert.ok(peerTradeTrustNeeded(pragmatic.peer)<=-15);
 assert.equal(cautious.reply.context.accepted,false);
 assert.equal(pragmatic.reply.context.accepted,true);
 assert.equal(cautious.state.localCampaign.peerContacts.massilia.accepted,false);
 assert.equal(pragmatic.state.localCampaign.peerContacts.massilia.accepted,true);
 const tampered=structuredClone(pragmatic.state);tampered.localCampaign.peerContacts.massilia.name=['<script>','x'];
 assert.equal(validPlayableCampaign(tampered),true,'a displayed name is escaped rather than rejected for punctuation');
 assert.doesNotMatch(localCouncilHtml(tampered),/<script>/);
 tampered.localCampaign.peerContacts.massilia.rulerId='forged';
 assert.equal(validPlayableCampaign(tampered),false);
});

test('peer compact stops when food reserve or city treasury cannot fund a shipment',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:273}),city=playableLocalCities(state).find(item=>item.id==='generated:narbo');
 startLocalCampaign(state,city.id);const peer=localPeerCities(state).find(item=>item.id==='massilia'),reserve=Math.max(4,Math.ceil((peer.population||3000)/3000));
 city.peerTradeRights={[peer.id]:state.year*12+20};state.month=3;peer.food=reserve+1;
 const before=state.localCampaign.tradeCompleted;advanceLocalCampaign(state);
 assert.equal(state.localCampaign.tradeCompleted,before);assert.equal(peer.food,reserve+1);
 state.month=6;peer.food=reserve+4;state.factions[city.id].treasury=city.treasury=2;advanceLocalCampaign(state);
 assert.equal(state.localCampaign.tradeCompleted,before);
 state.month=9;state.factions[city.id].treasury=city.treasury=3;const food=city.food,cash=peer.treasury;advanceLocalCampaign(state);
 assert.equal(state.localCampaign.tradeCompleted,before+1);assert.equal(city.food,food+2);assert.equal(peer.food,reserve+2);assert.equal(peer.treasury,cash+3);assert.equal(state.factions[city.id].treasury,0);
});

test('city trade envoy fails if peer loses autonomy or a crossing closes',()=>{
 const make=()=>{const state=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:273}),city=playableLocalCities(state).find(item=>item.id==='generated:narbo');startLocalCampaign(state,city.id);return {state,city,peer:localPeerCities(state).find(item=>item.id==='massilia')}};
 const fallen=make();assert.equal(localPeerTradeOffer(fallen.state,fallen.peer.id),true);fallen.peer.controller='senate';tick(fallen.state);tick(fallen.state);
 assert.equal(fallen.city.peerTradeRights?.[fallen.peer.id],undefined);
 assert.ok(receivedMail(fallen.state).some(letter=>letter.context?.kind==='local_peer_trade_result'&&!letter.context.accepted));
 const corrupt=make().state;corrupt.localCampaign.peerTradeOffer={host:'__proto__',remaining:1};assert.equal(validPlayableCampaign(corrupt),false);
});

test('adjacent city trade checks commercial borders at reply without exposing a hidden change at dispatch',()=>{
 const make=()=>{const state=configureStartingDifficulty(newGame('caesar'),'expert',false,{localSeed:5});startLocalCampaign(state,'generated:anatolia');const peer=localPeerCities(state).find(item=>item.id==='generated:bosporus');assert.ok(peer);return {state,peer}};
 const blocked=make();blocked.state.borderPolicies.bosporus.commercial='closed';assert.equal(localPeerTradeOffer(blocked.state,blocked.peer.id),true);
 tick(blocked.state);tick(blocked.state);assert.ok(receivedMail(blocked.state).some(letter=>letter.context?.kind==='local_peer_trade_result'&&!letter.context.accepted));
 const delayed=make();assert.equal(localPeerTradeOffer(delayed.state,delayed.peer.id),true);delayed.state.borderPolicies.bosporus.commercial='closed';tick(delayed.state);tick(delayed.state);
 assert.equal(delayed.state.regions.flatMap(region=>region.localEntities||[]).find(item=>item.id===delayed.state.player).peerTradeRights?.[delayed.peer.id],undefined);
 assert.ok(receivedMail(delayed.state).some(letter=>letter.context?.kind==='local_peer_trade_result'&&!letter.context.accepted));
});

test('stale neighboring control does not leak a new owner or create trade across a closed route',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'standard',false,{localSeed:6}),city=playableLocalCities(state).find(entity=>entity.procedural);
 startLocalCampaign(state,city.id);
 assert.equal(localTradeOffer(state,'armenia'),true);
 state.regions.find(region=>region.id==='armenia').owner='parthia';
 assert.ok(localTradePartners(state).includes('armenia'),'a dated contact remains until new evidence arrives');
 assert.ok(!localTradePartners(state).includes('parthia'),'the actual new owner is not silently disclosed');
 tick(state);tick(state);
 assert.equal(city.tradeRights?.armenia,undefined);
 assert.ok(receivedMail(state).some(letter=>letter.context?.proposal==='trade'&&letter.context.host==='armenia'&&!letter.context.accepted));
});

test('a save keeps a paid envoy after its recipient court dissolves',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'standard',false,{localSeed:6}),city=playableLocalCities(state).find(entity=>entity.procedural);
 startLocalCampaign(state,city.id);
 assert.equal(localTradeOffer(state,'armenia'),true);
 delete state.factions.armenia;
 assert.equal(validPlayableCampaign(state),true);
 const storage=new Map(),wrapper={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 assert.deepEqual(importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':JSON.stringify(state)}},wrapper).imported,['spqr-save-1']);
 const restored=upgradeSave(JSON.parse(storage.get('spqr-save-1')));
 assert.equal(restored.localCampaign.tradeOffer.host,'armenia');
 advanceLocalCampaign(restored);advanceLocalCampaign(restored);
 assert.equal(restored.localCampaign.tradeOffer,null);
 assert.equal(restored.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id===city.id).tradeRights?.armenia,undefined);
 assert.ok(restored.log.some(entry=>entry.en?.includes('no surviving court')));
});

test('two funded compacts count both actual shipments in one quarter',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'standard',false,{localSeed:6}),city=playableLocalCities(state).find(entity=>entity.procedural);
 startLocalCampaign(state,city.id);
 state.month=3;city.food=30;city.tradeRights={senate:state.year*12+15,armenia:state.year*12+15};
 const senateFood=state.factions.senate.food,armenianFood=state.factions.armenia.food;
 advanceLocalTrade(state);advanceLocalCampaign(state);
 assert.equal(city.lastTrade.count,2);
 assert.equal(state.localCampaign.tradeCompleted,2);
 assert.equal(state.factions.senate.food,senateFood+2);
 assert.equal(state.factions.armenia.food,armenianFood+2);
});

test('a city can seek delayed protection without surrendering self-government',()=>{
 const {state,city,host,owner}=opening(),treasury=state.factions[state.player].treasury;
 assert.match(localCouncilHtml(state),/REQUEST PROTECTION/);
 assert.equal(localProtectionOffer(state),true);
 assert.equal(state.factions[state.player].treasury,treasury-6);
 assert.equal(localTradeOffer(state),false,'only one diplomatic mission may be in transit');
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).localCampaign.protectionOffer.remaining,3);
 for(let month=0;month<3;month++)tick(state);
 assert.equal(city.overlord,owner);
 assert.equal(city.controller,city.id);
 assert.equal(host.owner,owner);
 assert.match(localCouncilHtml(state),/Protected by/);
 assert.ok(receivedMail(state).some(letter=>letter.context?.kind==='local_city_offer_result'&&letter.context.proposal==='protection'&&letter.context.accepted));
});

test('a foreign court may refuse protection or trade without creating rights',()=>{
 const protectedCity=opening();
 assert.equal(localProtectionOffer(protectedCity.state),true);
 protectedCity.state.relations[[protectedCity.city.id,protectedCity.owner].sort().join(':')]=-60;
 for(let month=0;month<3;month++)tick(protectedCity.state);
 assert.equal(protectedCity.city.overlord,null);
 assert.ok(receivedMail(protectedCity.state).some(letter=>letter.context?.proposal==='protection'&&!letter.context.accepted));
 const tradedCity=opening();
 assert.equal(localTradeOffer(tradedCity.state),true);
 tradedCity.state.relations[[tradedCity.city.id,tradedCity.owner].sort().join(':')]=-60;
 for(let month=0;month<3;month++)tick(tradedCity.state);
 assert.ok(!tradedCity.city.tradeRights?.[tradedCity.owner]);
 assert.equal(tradedCity.state.localCampaign.tradeCompleted,0);
 assert.ok(receivedMail(tradedCity.state).some(letter=>letter.context?.proposal==='trade'&&!letter.context.accepted));
});

test('a protected city can petition for independence with a delayed court decision',()=>{
 const {state,city,host,owner}=opening();
 assert.equal(localProtectionOffer(state),true);
 for(let month=0;month<3;month++)tick(state);
 assert.equal(city.overlord,owner);
 const key=[city.id,owner].sort().join(':');state.relations[key]=30;
 const cash=state.factions[city.id].treasury;
 assert.match(localCouncilHtml(state),/PETITION FOR INDEPENDENCE/);
 assert.equal(localIndependenceOffer(state),true);
 assert.equal(state.factions[city.id].treasury,cash-4);
 assert.equal(localTradeOffer(state),false);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(state))).localCampaign.independenceOffer.remaining,2);
 const storage=new Map(),wrapper={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 assert.deepEqual(importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':JSON.stringify(state)}},wrapper).imported,['spqr-save-1']);
 assert.equal(JSON.parse(storage.get('spqr-save-1')).localCampaign.independenceOffer.remaining,2);
 tick(state);assert.equal(city.overlord,owner,'the court has not yet decided');
 tick(state);
 assert.equal(city.overlord,null);
 assert.equal(city.controller,city.id);
 assert.equal(host.owner,owner);
 assert.ok(receivedMail(state).some(letter=>letter.context?.proposal==='independence'&&letter.context.accepted));
 assert.match(localCouncilHtml(state),/city remains independent/);
});

test('a host may refuse a weak independence petition without ending protection',()=>{
 const {state,city,owner}=opening();
 assert.equal(localProtectionOffer(state),true);
 for(let month=0;month<3;month++)tick(state);
 assert.equal(city.overlord,owner);
 const key=[city.id,owner].sort().join(':');state.relations[key]=-20;
 assert.equal(localIndependenceOffer(state),true);
 tick(state);tick(state);
 assert.equal(city.overlord,owner);
 assert.equal(state.relations[key],-23);
 assert.ok(receivedMail(state).some(letter=>letter.context?.proposal==='independence'&&!letter.context.accepted));
});

test('harder host courts require stronger relations before releasing a protected city',()=>{
 const {state,city,owner}=opening('hard');city.overlord=owner;
 state.relations[[city.id,owner].sort().join(':')]=30;
 assert.equal(localIndependenceOffer(state),true);
 tick(state);tick(state);
 assert.equal(city.overlord,owner);
});

test('a dissolved protector ends tribute and cancels an unanswered petition',()=>{
 const {state,city,owner}=opening();city.overlord=owner;
 state.localCampaign.independenceOffer={host:owner,remaining:1};
 delete state.factions[owner];
 advanceLocalEntities(state);
 assert.equal(city.overlord,null);
 assert.equal(state.localCampaign.independenceOffer,null);
 assert.equal(city.lastProtectorateEnd.reason,'protector_dissolved');
});

test('occupation defeats a city and save transfer retains its identity',()=>{
 const {state,city}=opening();
 const storage=new Map(),wrapper={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const result=importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':JSON.stringify(state)}},wrapper);
 assert.deepEqual(result.imported,['spqr-save-1']);
 assert.equal(upgradeSave(JSON.parse(storage.get('spqr-save-1'))).player,city.id);
 city.controller='senate';tick(state);assert.equal(state.defeat,true);
});

test('save transfer rejects an invalid city diplomatic mission without changing older saves',()=>{
 const {state}=opening();
 const old=JSON.parse(JSON.stringify(state));delete old.localCampaign.protectionOffer;delete old.localCampaign.independenceOffer;
 assert.equal(validPlayableCampaign(old),true);
 const corrupt=JSON.parse(JSON.stringify(state));corrupt.localCampaign.protectionOffer={host:'missing',remaining:-1};
 assert.equal(validPlayableCampaign(corrupt),false);
 corrupt.localCampaign.protectionOffer={host:'__proto__',remaining:1};
 assert.equal(validPlayableCampaign(corrupt),false);
 const storage=new Map(),wrapper={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const result=importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':JSON.stringify(corrupt)}},wrapper);
 assert.deepEqual(result.imported,[]);
 assert.equal(storage.size,0);
 const conflicting=JSON.parse(JSON.stringify(state));conflicting.localCampaign.protectionOffer={host:'senate',remaining:1};conflicting.localCampaign.independenceOffer={host:'senate',remaining:1};
 assert.equal(validPlayableCampaign(conflicting),false);
});
