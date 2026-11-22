import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=archived-leads-1';
import {fundMissingSearch,advanceMissingCommanders} from '../character-system.js?v=archived-leads-1';
import {renderMissingSearch} from '../missing-search-ui.js?v=archived-leads-1';

function fixture(){const s=newGame('senate'),p=s.world.characters.pompey,a=s.armies.find(x=>x.characterId==='pompey');if(a){a.characterId=null;a.commander=['Unnamed officer','未具名军官']}p.location=null;p.missing={origin:'roma',remaining:3,year:s.year-1,month:12,searchSeed:1000};return s}
function month(s){if(++s.month>12){s.month=1;s.year++}advanceMissingCommanders(s)}

test('funded searches cost real treasury, survive saving, and do not depend on hidden survival',()=>{
 const original=fixture(),alive=upgradeSave(structuredClone(original)),dead=upgradeSave(structuredClone(original));dead.world.characters.pompey.alive=false;dead.world.characters.pompey.health='deceased';dead.world.characters.pompey.deathYear=dead.year;const cash=alive.factions.senate.treasury;
 assert.equal(renderMissingSearch(alive,'pompey',true),renderMissingSearch(dead,'pompey',true));assert.deepEqual(fundMissingSearch(alive,'pompey'),fundMissingSearch(dead,'pompey'));assert.equal(alive.factions.senate.treasury,cash-5);assert.equal(dead.factions.senate.treasury,cash-5);assert.equal(alive.world.characters.pompey.missing.remaining,2);assert.equal(fundMissingSearch(alive,'pompey').reason,'pending');
 let a=upgradeSave(structuredClone(alive)),b=upgradeSave(structuredClone(dead));assert.match(renderMissingSearch(a,'pompey',true),/已投入额外资源/);month(a);month(b);assert.ok(a.world.characters.pompey.missing);assert.ok(b.world.characters.pompey.missing);month(a);month(b);assert.ok(a.world.characters.pompey.missing);assert.ok(b.world.characters.pompey.missing);assert.equal(a.world.characters.pompey.missing.remaining,3);assert.equal(b.world.characters.pompey.missing.remaining,3);assert.equal(a.log[0].zh,b.log[0].zh);assert.equal(a.world.characters.pompey.missing.searchFunded,undefined);assert.ok(fundMissingSearch(a,'pompey').ok);
});

test('funding improves the next attempt but cannot guarantee discovery',()=>{
 const s=fixture(),ordinary=upgradeSave(structuredClone(s)),funded=upgradeSave(structuredClone(s));ordinary.world.characters.pompey.missing.searchSeed=200;funded.world.characters.pompey.missing.searchSeed=200;ordinary.world.characters.pompey.missing.remaining=1;assert.ok(fundMissingSearch(funded,'pompey').ok);funded.world.characters.pompey.missing.remaining=1;month(ordinary);month(funded);assert.ok(ordinary.world.characters.pompey.missing);assert.equal(funded.world.characters.pompey.missing,undefined);
});

test('funding validates resources and known territory without spending on failure',()=>{
 const s=fixture(),before=s.factions.senate.treasury;assert.equal(fundMissingSearch(s,'caesar').reason,'unavailable');s.factions.senate.treasury=4;assert.equal(fundMissingSearch(s,'pompey').reason,'treasury');assert.equal(s.factions.senate.treasury,4);s.factions.senate.treasury=before;for(const r of s.regions)if(r.owner==='senate')r.owner='caesar';assert.equal(fundMissingSearch(s,'pompey').reason,'territory');assert.equal(s.factions.senate.treasury,before);
});
