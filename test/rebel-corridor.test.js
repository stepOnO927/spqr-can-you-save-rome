import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,aiTurn,diplomacy,isWar,region} from '../engine.js';

function cutCorridor(){
 const s=newGrandGame('caesar');
 for(const site of s.regions)site.owner='egypt';
 for(const [id,owner] of [['cisalpine','senate'],['italiaN','rebels'],['t011','rebels'],['t014','rebels'],['roma','caesar']])region(s,id).owner=owner;
 s.armies=s.armies.filter(a=>a.id==='italy');
 s.armies[0].region='cisalpine';s.armies[0].men=5000;
 s.factions.senate.food=100;s.factions.senate.treasury=100;
 return s;
}

test('a command may clear rebel-held land without dragging its allies into war',()=>{
 const s=cutCorridor(),legitimacy=s.factions.senate.legitimacy;
 s.alliances.push(['senate','numidia']);
 assert.equal(diplomacy(s,'senate','rebels','improve'),false);
 assert.equal(diplomacy(s,'senate','rebels','alliance'),false);
 assert.equal(diplomacy(s,'senate','rebels','war'),true);
 assert.equal(isWar(s,'senate','rebels'),true);
 assert.equal(isWar(s,'numidia','rebels'),false);
 assert.equal(s.factions.senate.legitimacy,legitimacy);
 assert.equal(diplomacy(s,'senate','rebels','war'),false);
});

test('AI clears a rebel corridor only when it blocks its existing land war',()=>{
 const blocked=cutCorridor();
 aiTurn(blocked,'senate');
 assert.equal(isWar(blocked,'senate','rebels'),true);
 assert.equal(blocked.armies.find(a=>a.id==='italy').move?.to,'italiaN');

 const open=cutCorridor();
 for(const id of ['italiaN','t011','t014'])region(open,id).owner='senate';
 region(open,'t005').owner='rebels';
 aiTurn(open,'senate');
 assert.equal(isWar(open,'senate','rebels'),false);
});
