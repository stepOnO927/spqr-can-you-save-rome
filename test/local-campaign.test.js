import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {configureStartingDifficulty} from '../difficulty.js';
import {playableLocalCities,startLocalCampaign,localCampaignCity,localRecruit,localTradeOffer,localProtectionOffer} from '../local-campaign.js';
import {receivedMail} from '../epistulae.js';
import {armyExpeditionSupply} from '../expedition-supply.js';
import {validPlayableCampaign} from '../local-campaign-save.js';
import {importSaves} from '../save-transfer.js';
import {localCouncilHtml} from '../local-campaign-ui.js';

const opening=()=>{const state=configureStartingDifficulty(newGame('caesar'),'standard',false,{localSeed:273});const city=playableLocalCities(state)[0];assert.ok(city);const host=state.regions.find(region=>region.id===city.theater);const owner=host.owner;startLocalCampaign(state,city.id);return {state,city,host,owner}};

test('generated city is a playable site without transferring its host theater',()=>{
 const {state,city,host,owner}=opening(),f=state.factions[state.player];
 assert.equal(host.owner,owner);assert.notEqual(host.owner,state.player);
 assert.equal(f.treasury,city.treasury);assert.equal(f.food,city.food);
 assert.ok(state.armies.some(army=>army.owner===state.player&&army.region===city.theater));
 assert.equal(armyExpeditionSupply(state,state.armies.find(army=>army.owner===state.player)).status,'full');
 assert.equal(validPlayableCampaign(state),true);
 assert.equal(localRecruit(state),true);
 assert.equal(city.population,localCampaignCity(state).population);
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
 const old=JSON.parse(JSON.stringify(state));delete old.localCampaign.protectionOffer;
 assert.equal(validPlayableCampaign(old),true);
 const corrupt=JSON.parse(JSON.stringify(state));corrupt.localCampaign.protectionOffer={host:'missing',remaining:-1};
 assert.equal(validPlayableCampaign(corrupt),false);
 const storage=new Map(),wrapper={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const result=importSaves({format:'spqr-save-transfer',version:1,saves:{'spqr-save-1':JSON.stringify(corrupt)}},wrapper);
 assert.deepEqual(result.imported,[]);
 assert.equal(storage.size,0);
});
