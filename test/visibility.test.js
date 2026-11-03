import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveBattle,region,tick} from '../engine.js';
import {battleSideForPlayer,visibleLogText} from '../visibility.js';

test('battle projection hides opponent details while preserving actual simulation evidence',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),d=s.armies.find(x=>x.id==='italy');resolveBattle(s,a,d,region(s,'italiaN'));const b=s.battles[0],own=battleSideForPlayer(b,'caesar','attacker'),enemy=battleSideForPlayer(b,'caesar','defender');
 assert.equal(own.casualties,b.lossA);assert.deepEqual(enemy,{owner:'senate',unknown:true});assert.equal(typeof b.defender.men,'number');assert.match(s.log[0].en,/enemy unknown/);assert.doesNotMatch(s.log[0].en,/\d+ \/ \d+/);
});
test('legacy casualty logs do not reveal exact enemy numbers in either language',()=>{
 const event={en:'Caesar won. Casualties: 1,234 / 5,678.',zh:'凯撒获胜。伤亡：1,234 / 5,678。'};assert.equal(visibleLogText(event,'en'),'Caesar won. Casualties: details unverified.');assert.equal(visibleLogText(event,'zh'),'凯撒获胜。伤亡：详情未核实。');
});
test('foreign sieges in unseen theaters are not published to the player chronicle',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='egyptguard'),target=region(s,'syria');target.owner='parthia';target.fort=1;s.wars.push(['egypt','parthia']);a.move={to:'syria',remaining:1};tick(s);assert.ok(a.siege);assert.ok(!s.log.some(e=>e.en.includes('began a siege at Syria')));
});
