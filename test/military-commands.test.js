import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,issueMilitaryOrder,tick,region,resolveBattle} from '../engine.js?v=strategic-offers-2';

for(const side of ['caesar','senate'])test(`${side} commands survive a march, combat, and second order`,()=>{
 const s=newGame(side),unit=s.armies.find(a=>a.owner===side),enemy=side==='caesar'?'italiaN':'cisalpine';
 assert.equal(issueMilitaryOrder(s,unit.id,'defend').ok,true);
 assert.equal(unit.order.kind,'defend');
 assert.equal(issueMilitaryOrder(s,unit.id,'cancel').ok,true);
 assert.equal(issueMilitaryOrder(s,unit.id,'attack',enemy).ok,true);
 assert.equal(unit.move.to,enemy);
 for(let i=0;i<3&&unit.move;i++)tick(s);
 assert.ok(s.battles.some(b=>b.region===enemy&&[b.attacker,b.defender].some(x=>x.owner===side)));
 assert.ok(s.battles.some(b=>b.region===enemy&&b.lossA>0&&b.lossD>0));
 assert.ok(s.battles.some(b=>b.region===enemy&&b.ownerAfter===region(s,enemy).owner&&Number.isInteger(b.attackerRemaining)));
 assert.ok(s.regions.some(r=>r.owner===side));
 const survivor=s.armies.find(a=>a.owner===side&&!a.move&&!a.siege);
 assert.ok(survivor,'a command remains available after the battle');
 assert.equal(issueMilitaryOrder(s,survivor.id,'hold').ok,true);
 assert.equal(survivor.order.kind,'hold');
});

test('field orders spend resources and change battle strength without exposing enemy details',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii'),f=s.factions.caesar,initial={men:a.men,morale:a.morale,treasury:f.treasury};
 a.morale=55;
 assert.equal(issueMilitaryOrder(s,a.id,'rally').ok,true);assert.equal(a.morale,65);
 assert.equal(issueMilitaryOrder(s,a.id,'reinforce').ok,true);assert.equal(a.men,initial.men+1000);
 assert.ok(f.treasury<initial.treasury);
 assert.equal(issueMilitaryOrder(s,a.id,'guard').ok,true);
 const defender=s.armies.find(x=>x.owner==='senate');defender.region=a.region;
 const attacker={...defender,men:4500};
 resolveBattle(s,attacker,a,region(s,a.region));
 const report=s.battles[0];assert.equal(report.defender.stance,1.22);assert.ok(report.defender.command>0);assert.ok(report.defender.supply>0);
});

test('cancel and retreat really alter an active order',()=>{
 const s=newGame('caesar'),a=s.armies.find(x=>x.id==='xiii');
 assert.equal(issueMilitaryOrder(s,a.id,'move','narbo').ok,true);
 assert.equal(issueMilitaryOrder(s,a.id,'cancel').ok,true);assert.equal(a.move,null);
 const before=a.morale;
 assert.equal(issueMilitaryOrder(s,a.id,'retreat','narbo').ok,true);
 assert.equal(a.move.intent,'retreat');assert.equal(a.morale,before-3);
});
